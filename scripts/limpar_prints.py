"""Limpa a pasta de prints da matriz de layout (fora do repositório).

Mantém os prints aprovados (referencia/) que a matriz ainda usa e apaga:
  * execuções de falha (falhas/<execução>/) com mais de N dias (padrão 7);
  * referências órfãs: prints de cenário, largura, tema ou tela que saíram de e2e/layout/matriz.json.

Uso (rotina manual):
  npm run limpar-prints                 limpa
  npm run limpar-prints -- --simular    só lista o que seria apagado
  py -3 scripts/limpar_prints.py --dias 14 --pasta C:\\outra\\pasta

Código de saída: 0 ok (inclusive "nada a limpar"); 1 matriz ausente ou inválida (nada é apagado);
2 pasta de prints insegura (raiz do disco ou dentro do repositório).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timedelta
from pathlib import Path

RAIZ_REPO = Path(__file__).resolve().parent.parent
PASTA_PADRAO = Path(os.environ.get("JULIUS_PRINTS") or RAIZ_REPO.parent / "julius-finance-prints")
MATRIZ_PADRAO = RAIZ_REPO / "e2e" / "layout" / "matriz.json"
FORMATO_EXECUCAO = "%Y-%m-%d-%H-%M-%S"


def referencias_esperadas(matriz: dict) -> set[str]:
    """Caminhos relativos (com /) de todos os prints que a matriz gera hoje."""
    esperadas: set[str] = set()
    for cenario in matriz["cenarios"]:
        telas = [
            t["nome"]
            for t in matriz["telas"]
            if (not t.get("precisaDados") if cenario == "vazio" else not t.get("soVazio"))
        ]
        for largura in matriz["larguras"]:
            for tema in matriz["temas"]:
                for tela in telas:
                    esperadas.add(f"{cenario}/{largura}-{tema}/{tela}.png")
    return esperadas


def ler_matriz(caminho: Path) -> dict | None:
    try:
        matriz = json.loads(caminho.read_text(encoding="utf-8"))
        referencias_esperadas(matriz)  # valida a estrutura
        return matriz
    except (OSError, ValueError, KeyError, TypeError):
        return None


def data_da_execucao(pasta: Path) -> datetime:
    """Data pelo nome da pasta (gerado pelo playwright.config.ts); se não bater, pela modificação."""
    try:
        return datetime.strptime(pasta.name, FORMATO_EXECUCAO)
    except ValueError:
        return datetime.fromtimestamp(pasta.stat().st_mtime)


def tamanho(caminho: Path) -> int:
    if caminho.is_file():
        return caminho.stat().st_size
    return sum(f.stat().st_size for f in caminho.rglob("*") if f.is_file())


def pasta_insegura(pasta: Path) -> bool:
    resolvida = pasta.resolve()
    return resolvida == Path(resolvida.anchor) or resolvida == RAIZ_REPO or RAIZ_REPO in resolvida.parents


def remover_pastas_vazias(raiz: Path) -> None:
    for pasta in sorted((p for p in raiz.rglob("*") if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
        if not any(pasta.iterdir()):
            pasta.rmdir()


def formatar_mb(bytes_: int) -> str:
    return f"{bytes_ / 1_048_576:.1f}".replace(".", ",") + " MB"


def main(argv: list[str], agora: datetime | None = None) -> int:
    parser = argparse.ArgumentParser(prog="limpar_prints", description="Limpa a pasta de prints da matriz de layout.")
    parser.add_argument("--pasta", type=Path, default=PASTA_PADRAO, help="pasta de prints (padrão: %(default)s)")
    parser.add_argument("--matriz", type=Path, default=MATRIZ_PADRAO, help="matriz.json usada para achar órfãs")
    parser.add_argument("--dias", type=int, default=7, help="idade mínima, em dias, das falhas apagadas (padrão: 7)")
    parser.add_argument("--simular", action="store_true", help="só lista o que seria apagado")
    args = parser.parse_args(argv)
    agora = agora or datetime.now()

    if pasta_insegura(args.pasta):
        print(f"Pasta de prints recusada por segurança: {args.pasta}. Use uma pasta só para os prints.")
        return 2
    matriz = ler_matriz(args.matriz)
    if matriz is None:
        print(f"Não foi possível ler a matriz em {args.matriz}. Nada foi apagado.")
        return 1
    if not args.pasta.is_dir():
        print(f"Nada a limpar: a pasta {args.pasta} não existe.")
        return 0

    apagar: list[Path] = []
    falhas = args.pasta / "falhas"
    if falhas.is_dir():
        limite = agora - timedelta(days=args.dias)
        apagar += [p for p in sorted(falhas.iterdir()) if p.is_dir() and data_da_execucao(p) < limite]

    referencia = args.pasta / "referencia"
    orfas: list[Path] = []
    if referencia.is_dir():
        esperadas = referencias_esperadas(matriz)
        orfas = [f for f in sorted(referencia.rglob("*.png")) if f.relative_to(referencia).as_posix() not in esperadas]
    apagar += orfas

    total = sum(tamanho(p) for p in apagar)
    execucoes = len(apagar) - len(orfas)
    verbo = "Seriam apagadas" if args.simular else "Apagadas"
    for p in apagar:
        print(f"  {'(simulação) ' if args.simular else ''}{p.relative_to(args.pasta).as_posix()}")
        if not args.simular:
            shutil.rmtree(p) if p.is_dir() else p.unlink()
    if not args.simular and referencia.is_dir():
        remover_pastas_vazias(referencia)
    print(f"{verbo} {execucoes} execução(ões) de falha com mais de {args.dias} dias e {len(orfas)} referência(s) órfã(s): {formatar_mb(total)}.")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
