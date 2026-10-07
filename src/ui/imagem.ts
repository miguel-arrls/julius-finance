/** Reduz uma imagem a um quadrado de `tamanho` px, centralizada sobre fundo branco. Fica no aparelho. */
export async function redimensionarImagem(arquivo: File, tamanho = 128): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tamanho, tamanho);
  const escala = Math.min(tamanho / bitmap.width, tamanho / bitmap.height);
  const largura = bitmap.width * escala;
  const altura = bitmap.height * escala;
  ctx.drawImage(bitmap, (tamanho - largura) / 2, (tamanho - altura) / 2, largura, altura);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
