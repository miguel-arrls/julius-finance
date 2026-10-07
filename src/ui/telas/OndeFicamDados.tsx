export function OndeFicamDados() {
  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Onde ficam meus dados</h1>
      <p>
        Tudo fica guardado <strong>só neste aparelho</strong>, no armazenamento do navegador (IndexedDB). Nada é enviado para a internet: o app nem
        tem permissão para isso.
      </p>
      <h2>Cuidados no iPhone</h2>
      <ul>
        <li>Use sempre o ícone da tela de início. O app instalado e o Safari guardam dados separados.</li>
        <li>
          Apagar o ícone do app ou limpar os dados de sites no Safari <strong>apaga suas despesas</strong>.
        </li>
        <li>Se o endereço do app mudar, ele abre vazio. Restaure pelo backup.</li>
      </ul>
      <h2>Computador e iPhone</h2>
      <p>Os aparelhos não sincronizam sozinhos. Para levar os dados de um para o outro, exporte um backup em um e importe no outro.</p>
      <h2>Backup</h2>
      <p>Exporte um backup pelo menos uma vez por mês e guarde em Arquivos ou no iCloud Drive. O app lembra você depois de 30 dias.</p>
      <a class="botao botao-primario" href="#/backup">
        Ir para backup
      </a>
    </>
  );
}
