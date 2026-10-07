import { useState } from 'preact/hooks';
import { estadoRecorrencia, type EstadoRecorrencia } from '../../dominio/recorrencias';
import type { Lancamento, TipoDespesa } from '../../dominio/tipos';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { caminho } from '../rota';
import { ROTULO_A_CONFIRMAR, ROTULO_ESTADO, resumoDespesa } from '../textos';

const ABAS: { tipo: TipoDespesa; rotulo: string; vazio: { titulo: string; texto: string; acao: string } }[] = [
  {
    tipo: 'recorrente',
    rotulo: 'Recorrentes',
    vazio: { titulo: 'Nenhuma despesa fixa ainda', texto: 'Cadastre aluguel, internet, assinaturas e outras contas que se repetem.', acao: 'Cadastrar despesa fixa' },
  },
  {
    tipo: 'parcelada',
    rotulo: 'Parceladas',
    vazio: { titulo: 'Nenhuma compra parcelada', texto: 'Cadastre uma compra e as parcelas são geradas sozinhas.', acao: 'Cadastrar compra parcelada' },
  },
  {
    tipo: 'avulsa',
    rotulo: 'Avulsas',
    vazio: { titulo: 'Nenhuma despesa avulsa', texto: 'Contas que acontecem uma vez só aparecem aqui.', acao: 'Cadastrar despesa' },
  },
];

export function PilulaEstado({ estado }: { estado: EstadoRecorrencia }) {
  return <span class={`pilula${estado === 'ativa' ? ' pilula-paga' : ''}`}>{ROTULO_ESTADO[estado]}</span>;
}

export function Despesas({ estado }: { estado: Estado }) {
  const hoje = usarHoje();
  const [aba, setAba] = useState<TipoDespesa>('recorrente');
  const atual = ABAS.find((a) => a.tipo === aba)!;
  const lista = estado.despesas.filter((d) => d.tipo === aba).sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
  const pendentes = estado.despesas.filter((d) => d.aConfirmar.length > 0);
  const marcas = new Map(estado.marcas.map((m) => [m.id, m]));
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const porDespesa = new Map<string, Lancamento[]>();
  for (const l of estado.lancamentos) porDespesa.set(l.despesaId, [...(porDespesa.get(l.despesaId) ?? []), l]);

  return (
    <>
      <h1>Despesas</h1>
      {pendentes.length > 0 && (
        <section class="cartao" aria-labelledby="titulo-a-confirmar">
          <h2 id="titulo-a-confirmar">A confirmar</h2>
          <ul>
            {pendentes.map((d) => (
              <li key={d.id}>
                <a href={caminho({ tela: 'despesa', id: d.id })}>{d.descricao}</a>: {d.aConfirmar.map((c) => ROTULO_A_CONFIRMAR[c]).join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="segmentado" role="tablist" aria-label="Tipo de despesa">
        {ABAS.map((a) => (
          <button key={a.tipo} type="button" role="tab" aria-selected={aba === a.tipo} onClick={() => setAba(a.tipo)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <EstadoVazio titulo={atual.vazio.titulo} texto={atual.vazio.texto} acao={{ rotulo: atual.vazio.acao, href: '#/nova' }} />
      ) : (
        <ul class="lista">
          {lista.map((d) => (
            <li class="linha" key={d.id}>
              <a class="linha-principal" href={caminho({ tela: 'despesa', id: d.id })}>
                <Logo marca={marcas.get(d.marcaId ?? '')} categoria={categorias.get(d.categoriaId)} rotulo={d.descricao} />
                <span class="linha-textos">
                  <span class="linha-titulo">{d.descricao}</span>
                  <span class="linha-sub">{resumoDespesa(d, porDespesa.get(d.id) ?? [])}</span>
                </span>
                <span class="linha-valores">
                  {d.tipo === 'recorrente' && <PilulaEstado estado={estadoRecorrencia(d, hoje)} />}
                  {d.aConfirmar.length > 0 && <span class="pilula pilula-sem-vencimento">a confirmar</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
