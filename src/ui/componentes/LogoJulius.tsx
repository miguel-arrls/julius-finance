/** Ícone do app (o mesmo de public/favicon.svg): quadrado azul com o J branco dentro de um anel. Decorativo. */
export function LogoJulius({ tamanho = 32 }: { tamanho?: number }) {
  return (
    <svg class="logo-julius" width={tamanho} height={tamanho} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#1f6feb" />
      <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="36" />
      <path d="M286 170v120c0 40-26 62-62 62-22 0-40-8-52-22" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" />
    </svg>
  );
}
