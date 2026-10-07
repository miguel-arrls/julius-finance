export type ResultadoArquivo = 'compartilhado' | 'baixado' | 'cancelado';

/** No iPhone abre a folha de compartilhar (Arquivos, AirDrop, iCloud Drive); sem ela, baixa. */
export async function compartilharOuBaixar(nome: string, conteudo: string, tipo: string): Promise<ResultadoArquivo> {
  const arquivo = new File([conteudo], nome, { type: tipo });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo] });
      return 'compartilhado';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado';
      // Outro erro de compartilhamento: cai para o download.
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'baixado';
}

export function lerArquivoTexto(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsText(arquivo, 'utf-8');
  });
}
