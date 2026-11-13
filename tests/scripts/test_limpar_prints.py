"""Testes do scripts/limpar_prints.py via main(argv): código de saída + efeito em disco."""

import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import limpar_prints  # noqa: E402

AGORA = datetime(2026, 11, 10, 12, 0, 0)
MATRIZ = {
    "larguras": [390],
    "temas": ["claro"],
    "cenarios": ["vazio", "tipico"],
    "axeLarguras": [390],
    "telas": [{"nome": "boas-vindas", "soVazio": True}, {"nome": "inicio"}, {"nome": "detalhe", "precisaDados": True}],
}


class LimparPrintsTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        # Acentos e ⟦⟧ no caminho: a limpeza não pode depender de nomes ASCII.
        self.base = Path(self._tmp.name) / "prints ção ⟦teste⟧"
        self.matriz = Path(self._tmp.name) / "matriz.json"
        self.matriz.write_text(json.dumps(MATRIZ), encoding="utf-8")

    def tearDown(self):
        self._tmp.cleanup()

    def arquivo(self, relativo: str, conteudo: bytes = b"png") -> Path:
        caminho = self.base / relativo
        caminho.parent.mkdir(parents=True, exist_ok=True)
        caminho.write_bytes(conteudo)
        return caminho

    def rodar(self, *extra: str) -> tuple[int, str]:
        saida = io.StringIO()
        with contextlib.redirect_stdout(saida):
            codigo = limpar_prints.main(["--pasta", str(self.base), "--matriz", str(self.matriz), *extra], agora=AGORA)
        return codigo, saida.getvalue()

    def test_apaga_falhas_antigas_e_orfas_e_mantem_referencias_em_uso(self):
        velha = self.arquivo("falhas/2026-11-01-10-00-00/layout-tipico/inicio-diff.png")
        recente = self.arquivo("falhas/2026-11-08-10-00-00/layout-tipico/inicio-diff.png")
        em_uso = [
            self.arquivo("referencia/vazio/390-claro/boas-vindas.png"),
            self.arquivo("referencia/vazio/390-claro/inicio.png"),
            self.arquivo("referencia/tipico/390-claro/inicio.png"),
            self.arquivo("referencia/tipico/390-claro/detalhe.png"),
        ]
        orfas = [
            self.arquivo("referencia/tipico/1440-claro/inicio.png"),  # largura que saiu da matriz
            self.arquivo("referencia/vazio/390-claro/detalhe.png"),  # vazio não tem detalhe
            self.arquivo("referencia/tipico/390-claro/boas-vindas.png"),  # só o vazio tem boas-vindas
        ]
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 0)
        self.assertFalse(velha.parent.parent.exists())
        self.assertTrue(recente.exists())
        for f in em_uso:
            self.assertTrue(f.exists(), f)
        for f in orfas:
            self.assertFalse(f.exists(), f)
        self.assertFalse((self.base / "referencia/tipico/1440-claro").exists(), "pasta vazia deve sair")
        self.assertIn("Apagadas 1 execução(ões) de falha com mais de 7 dias e 3 referência(s) órfã(s)", saida)

    def test_simular_nao_apaga_nada(self):
        velha = self.arquivo("falhas/2026-10-01-10-00-00/x.png")
        orfa = self.arquivo("referencia/tipico/1440-claro/inicio.png")
        codigo, saida = self.rodar("--simular")
        self.assertEqual(codigo, 0)
        self.assertTrue(velha.exists())
        self.assertTrue(orfa.exists())
        self.assertIn("Seriam apagadas 1 execução(ões)", saida)

    def test_dias_configuravel_e_data_pela_modificacao_quando_o_nome_nao_e_data(self):
        self.arquivo("falhas/2026-11-08-10-00-00/x.png")
        sem_data = self.arquivo("falhas/manual/x.png").parent
        antigo = AGORA.timestamp() - 30 * 86400
        os.utime(sem_data, (antigo, antigo))
        codigo, _ = self.rodar("--dias", "1")
        self.assertEqual(codigo, 0)
        self.assertFalse((self.base / "falhas/2026-11-08-10-00-00").exists())
        self.assertFalse(sem_data.exists())

    def test_matriz_ausente_ou_corrompida_nao_apaga_nada(self):
        orfa = self.arquivo("referencia/tipico/1440-claro/inicio.png")
        self.matriz.write_text("{ isto não é json", encoding="utf-8")
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 1)
        self.assertTrue(orfa.exists())
        self.assertIn("Nada foi apagado", saida)
        self.matriz.unlink()
        self.assertEqual(self.rodar()[0], 1)
        self.assertTrue(orfa.exists())

    def test_pasta_inexistente_e_nada_a_limpar(self):
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 0)
        self.assertIn("Nada a limpar", saida)

    def test_recusa_pasta_insegura(self):
        for pasta in (limpar_prints.RAIZ_REPO, limpar_prints.RAIZ_REPO / "e2e", Path(Path.cwd().anchor)):
            saida = io.StringIO()
            with contextlib.redirect_stdout(saida):
                codigo = limpar_prints.main(["--pasta", str(pasta), "--matriz", str(self.matriz)], agora=AGORA)
            self.assertEqual(codigo, 2, pasta)

    def test_matriz_real_do_projeto_e_lida(self):
        self.assertIsNotNone(limpar_prints.ler_matriz(limpar_prints.MATRIZ_PADRAO))


if __name__ == "__main__":
    unittest.main()
