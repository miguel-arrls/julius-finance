import { IconCategory, IconChevronRight, IconCreditCard, IconDownload, IconLock, IconPhoto } from '@tabler/icons-preact';

const ITENS = [
  { href: '#/categorias', rotulo: 'Categorias', Icone: IconCategory },
  { href: '#/marcas', rotulo: 'Marcas e logos', Icone: IconPhoto },
  { href: '#/meios', rotulo: 'Meios de pagamento', Icone: IconCreditCard },
  { href: '#/backup', rotulo: 'Backup e importação', Icone: IconDownload },
  { href: '#/dados', rotulo: 'Onde ficam meus dados', Icone: IconLock },
];

export function Ajustes() {
  return (
    <>
      <h1>Ajustes</h1>
      <ul class="lista">
        {ITENS.map(({ href, rotulo, Icone }) => (
          <li class="linha" key={href}>
            <a class="linha-principal" href={href}>
              <Icone aria-hidden="true" />
              <span class="linha-textos">
                <span class="linha-titulo">{rotulo}</span>
              </span>
              <IconChevronRight aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
