/**
 * Regras de layout que valem para QUALQUER tela, dado e largura. Um bug novo de layout deve cair numa
 * destas regras; se não cair, a regra que faltou entra aqui (não um teste para o caso).
 *
 * Exceções são declaradas no HTML, nunca no teste:
 *   data-layout="preencher"  faixa cujo conteúdo deve ocupar a largura (sem sobra de um lado só)
 *   data-layout="livre"      elemento decorativo que pode sair da caixa do pai (ex.: selo sobre o logo)
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export interface Violacao {
  regra: string;
  elemento: string;
  detalhe: string;
}

export const REGRAS = {
  rolagem: 'sem rolagem lateral da página',
  caixa: 'conteúdo dentro da caixa que o contém',
  respiro: 'texto com respiro da lateral da caixa que o contém',
  sobreposicao: 'interativos não se sobrepõem',
  alvo: 'alvo de toque com pelo menos 44 px',
  rotulo: 'campo com rótulo visível',
  preencher: 'faixa "preencher" sem sobra de um lado só',
  erro: 'sem erro de JavaScript',
  axe: 'acessibilidade (axe-core, WCAG 2.1 A/AA)',
} as const;

/** Roda no navegador: precisa ser autocontida (sem imports nem closures). */
function verificarNaPagina(regras: typeof REGRAS): Violacao[] {
  const v: Violacao[] = [];
  const TOL = 1;
  const doc = document.documentElement;

  const descrever = (e: Element) => {
    const r = e.getBoundingClientRect();
    const classes = [...e.classList].slice(0, 3).join('.');
    const texto = (e.getAttribute('aria-label') ?? e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${e.tagName.toLowerCase()}${classes ? '.' + classes : ''} "${texto}" [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}]`;
  };
  const estilo = (e: Element) => getComputedStyle(e);
  const ocultoParaLeitor = (e: Element) => e.closest('.visualmente-oculto') !== null;
  const visivel = (e: Element) => {
    if (ocultoParaLeitor(e)) return false;
    // Conteúdo de <details> fechado mantém caixa no WebKit, mas não é desenhado.
    const fechado = e.closest('details:not([open])');
    if (fechado && !e.closest('summary') && e !== fechado) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let a: Element | null = e; a; a = a.parentElement) {
      const s = estilo(a);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    return true;
  };
  /** Flutuantes (barra de navegação, botão +, avisos) ficam por cima do conteúdo de propósito. */
  const flutuante = (e: Element) => {
    for (let a: Element | null = e; a; a = a.parentElement) {
      const p = estilo(a).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };
  const rolavelX = (e: Element) => ['auto', 'scroll'].includes(estilo(e).overflowX);
  const recorta = (e: Element) => estilo(e).overflowX !== 'visible' || estilo(e).overflowY !== 'visible';
  /**
   * Parte alcançável do elemento: desconta o que uma caixa que recorta esconde de vez, mas não o que uma
   * faixa rolável esconde (deslizando, aquilo aparece; foi assim o bug do "Novo cartão").
   */
  const parteVisivel = (e: Element) => {
    const r = e.getBoundingClientRect();
    let [l, t, d, b] = [r.left, r.top, r.right, r.bottom];
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      if (!recorta(a) || rolavelX(a) || ['auto', 'scroll'].includes(estilo(a).overflowY)) continue;
      const c = a.getBoundingClientRect();
      [l, t, d, b] = [Math.max(l, c.left), Math.max(t, c.top), Math.min(d, c.right), Math.min(b, c.bottom)];
    }
    return { l, t, d, b, w: d - l, h: b - t };
  };
  const desenhaCaixa = (e: Element) => {
    const s = estilo(e);
    const fundo = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
    const borda = ['Top', 'Right', 'Bottom', 'Left'].some((l) => parseFloat(s.getPropertyValue(`border-${l.toLowerCase()}-width`)) > 0);
    return fundo || borda || s.boxShadow !== 'none';
  };
  const todos = [...document.body.querySelectorAll('*')].filter((e) => !(e instanceof SVGElement && !(e instanceof SVGSVGElement)));

  // 1. Rolagem lateral da página.
  if (doc.scrollWidth > doc.clientWidth + TOL) {
    const largura = doc.clientWidth;
    const dentroDeFaixa = (e: Element) => {
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (rolavelX(a)) return true;
      return false;
    };
    const culpados = todos.filter((e) => visivel(e) && !flutuante(e) && !dentroDeFaixa(e) && e.getBoundingClientRect().right > largura + TOL);
    const maisFundo = culpados.filter((e) => !culpados.some((o) => o !== e && e.contains(o)));
    v.push({ regra: regras.rolagem, elemento: maisFundo.slice(0, 3).map(descrever).join(' | ') || 'página', detalhe: `conteúdo com ${doc.scrollWidth}px numa tela de ${largura}px` });
  }

  // 2. Conteúdo dentro da caixa desenhada que o contém (cartão, botão, linha...).
  for (const e of todos) {
    if (!visivel(e) || flutuante(e) || e.closest('[data-layout="livre"]')) continue;
    if (['absolute', 'fixed'].includes(estilo(e).position)) continue;
    let caixa: Element | null = null;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      if (rolavelX(a)) break; // dentro de faixa rolável, sair da área visível é o esperado
      if (desenhaCaixa(a)) {
        caixa = a;
        break;
      }
    }
    if (!caixa) continue;
    const r = e.getBoundingClientRect();
    const c = caixa.getBoundingClientRect();
    const fora = Math.max(c.left - r.left, r.right - c.right, c.top - r.top, r.bottom - c.bottom);
    if (fora > TOL) v.push({ regra: regras.caixa, elemento: descrever(e), detalhe: `passa ${Math.round(fora)}px de ${descrever(caixa)}` });
  }
  // 2b. Texto que sai do bloco que o contém (a caixa cabe, o texto não). Mede o retângulo do próprio
  // texto; bloco que recorta (reticências) é corte intencional e não conta.
  const textos = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const blocosVazados = new Map<Element, number>();
  for (let n = textos.nextNode(); n; n = textos.nextNode()) {
    const pai = n.parentElement;
    if (!pai || !(n.textContent ?? '').trim() || !visivel(pai) || flutuante(pai) || pai.closest('[data-layout="livre"]')) continue;
    let bloco: Element = pai;
    while (['inline', 'contents'].includes(estilo(bloco).display) && bloco.parentElement) bloco = bloco.parentElement;
    if (recorta(bloco)) continue;
    const intervalo = document.createRange();
    intervalo.selectNodeContents(n);
    const t = intervalo.getBoundingClientRect();
    const b = bloco.getBoundingClientRect();
    const fora = Math.max(b.left - t.left, t.right - b.right);
    if (fora > TOL) blocosVazados.set(bloco, Math.max(fora, blocosVazados.get(bloco) ?? 0));
  }
  for (const [bloco, fora] of blocosVazados) v.push({ regra: regras.caixa, elemento: descrever(bloco), detalhe: `o texto passa ${Math.round(fora)}px da caixa` });

  // 2c. Respiro: texto não encosta na lateral da caixa desenhada (cartão, lista, botão) que o contém.
  // Pega o `padding: 0` herdado por engano, que a regra 2 não vê porque o conteúdo ainda cabe na caixa.
  // Só conta caixa fechada (fundo, sombra ou bordas dos dois lados): linha com borda só embaixo é separador.
  // O limite é "encostado" (< 4 px), a classe do bug; apertado mas com padding próprio não é o alvo.
  const RESPIRO = 4;
  const caixaFechada = (e: Element) => {
    const s = estilo(e);
    const fundo = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
    const laterais = parseFloat(s.borderLeftWidth) > 0 && parseFloat(s.borderRightWidth) > 0;
    return fundo || laterais || s.boxShadow !== 'none';
  };
  const encostados = new Map<Element, { caixa: Element; folga: number }>();
  const textos2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = textos2.nextNode(); n; n = textos2.nextNode()) {
    const pai = n.parentElement;
    if (!pai || !(n.textContent ?? '').trim() || !visivel(pai) || flutuante(pai) || pai.closest('[data-layout="livre"]')) continue;
    let caixa: Element | null = null;
    for (let a: Element | null = pai; a && a !== document.body; a = a.parentElement) {
      if (rolavelX(a)) break;
      if (caixaFechada(a)) {
        caixa = a;
        break;
      }
    }
    if (!caixa) continue;
    // Texto cortado com reticências: o retângulo medido é o do texto inteiro, não o que aparece.
    let bloco: Element = pai;
    while (['inline', 'contents'].includes(estilo(bloco).display) && bloco.parentElement) bloco = bloco.parentElement;
    if (recorta(bloco)) continue;
    const intervalo = document.createRange();
    intervalo.selectNodeContents(n);
    const t = intervalo.getBoundingClientRect();
    const c = caixa.getBoundingClientRect();
    const folga = Math.min(t.left - c.left, c.right - t.right);
    if (folga >= 0 && folga < RESPIRO && folga < (encostados.get(caixa)?.folga ?? Infinity)) encostados.set(caixa, { caixa, folga });
  }
  for (const { caixa, folga } of encostados.values()) {
    v.push({ regra: regras.respiro, elemento: descrever(caixa), detalhe: `texto a ${Math.round(folga)}px da lateral (mínimo ${RESPIRO}px)` });
  }

  // 3 e 4. Interativos: sobreposição e tamanho do alvo.
  const interativos = todos.filter(
    (e) =>
      e.matches('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="tab"], [role="checkbox"], [role="switch"]') &&
      visivel(e) &&
      !flutuante(e),
  );
  const partes = new Map(interativos.map((e) => [e, parteVisivel(e)]));
  for (let i = 0; i < interativos.length; i++) {
    for (let j = i + 1; j < interativos.length; j++) {
      const a = interativos[i]!;
      const b = interativos[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const pa = partes.get(a)!;
      const pb = partes.get(b)!;
      const w = Math.min(pa.d, pb.d) - Math.max(pa.l, pb.l);
      const h = Math.min(pa.b, pb.b) - Math.max(pa.t, pb.t);
      if (w > 2 && h > 2) v.push({ regra: regras.sobreposicao, elemento: `${descrever(a)} × ${descrever(b)}`, detalhe: `${Math.round(w)}×${Math.round(h)}px em comum` });
    }
  }
  for (const e of interativos) {
    const p = partes.get(e)!;
    if (p.w < 1 || p.h < 1) continue; // fora da área visível de uma faixa rolável
    // Exceções da WCAG 2.5.8: link no meio do texto; campo cujo rótulo envolvente é o alvo.
    if (e.matches('a') && estilo(e).display === 'inline') continue;
    const alvo = e.closest('label') ?? e;
    const r = alvo.getBoundingClientRect();
    if (r.width + TOL < 44 || r.height + TOL < 44) {
      v.push({ regra: regras.alvo, elemento: descrever(alvo), detalhe: `${Math.round(r.width)}×${Math.round(r.height)}px` });
    }
  }

  // 5. Todo campo com rótulo visível (placeholder e aria-label não contam).
  for (const e of todos.filter((x) => x.matches('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea'))) {
    if (!visivel(e)) continue;
    const campo = e as HTMLInputElement;
    const rotulos = [...(campo.labels ?? [])];
    const porId = (e.getAttribute('aria-labelledby') ?? '').split(/\s+/).map((id) => (id ? document.getElementById(id) : null));
    const ok = [...rotulos, ...porId].some((r) => r && (r.textContent ?? '').trim() !== '' && [...r.querySelectorAll('*'), r].some((n) => visivel(n) && (n.textContent ?? '').trim() !== ''));
    if (!ok) v.push({ regra: regras.rotulo, elemento: descrever(e), detalhe: 'sem <label> visível' });
  }

  // 6. Faixas que devem preencher a largura: sem sobra de um lado só quando não rolam.
  for (const f of document.querySelectorAll('[data-layout="preencher"]')) {
    if (!visivel(f) || f.scrollWidth > f.clientWidth + TOL) continue;
    const filhos = [...f.children].filter(visivel);
    if (filhos.length === 0) continue;
    const s = estilo(f);
    const r = f.getBoundingClientRect();
    const esquerda = r.left + parseFloat(s.paddingLeft);
    const direita = r.right - parseFloat(s.paddingRight);
    const uniao = filhos.map((x) => x.getBoundingClientRect());
    const sobraE = Math.min(...uniao.map((x) => x.left)) - esquerda;
    const sobraD = direita - Math.max(...uniao.map((x) => x.right));
    if (Math.abs(sobraE - sobraD) > 8) {
      v.push({ regra: regras.preencher, elemento: descrever(f), detalhe: `sobra ${Math.round(sobraE)}px à esquerda e ${Math.round(sobraD)}px à direita` });
    }
  }

  return v;
}

export async function verificarLayout(page: Page): Promise<Violacao[]> {
  return page.evaluate(verificarNaPagina, REGRAS);
}

export async function verificarAcessibilidade(page: Page): Promise<Violacao[]> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.flatMap((x) =>
    x.nodes.map((n) => ({ regra: `${REGRAS.axe}: ${x.id}`, elemento: n.target.join(' '), detalhe: x.help })),
  );
}

/** Junta erros de JavaScript e console.error desde a chamada. */
export function coletarErros(page: Page): () => Violacao[] {
  const erros: Violacao[] = [];
  page.on('pageerror', (e) => erros.push({ regra: REGRAS.erro, elemento: 'página', detalhe: e.message }));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push({ regra: REGRAS.erro, elemento: 'console', detalhe: m.text().slice(0, 200) });
  });
  return () => erros.splice(0);
}
