"""Uso:
    python -m app                  inicia o painel em http://localhost:8765
    python -m app gravar URL NOME  grava um protocolo real para criar o roteiro NOME
"""
from __future__ import annotations

import subprocess
import sys
import webbrowser
from pathlib import Path

from . import config as config_mod


def iniciar() -> None:
    import uvicorn

    from .db import Banco
    from .executor import Executor
    from .web import criar_app

    cfg = config_mod.carregar()
    cfg.preparar_pastas()
    banco = Banco(cfg.banco)
    app = criar_app(cfg, banco, Executor(cfg, banco))
    endereco = f"http://localhost:{cfg.porta}"
    print(f"Painel em {endereco}  (feche esta janela para encerrar)")
    webbrowser.open(endereco)
    # Só aceita conexões deste computador: o painel controla protocolos com o seu certificado.
    uvicorn.run(app, host="127.0.0.1", port=cfg.porta, log_level="warning")


def gravar(url: str, nome: str) -> None:
    cfg = config_mod.carregar()
    cfg.preparar_pastas()
    pasta = cfg.pasta_dados / "gravacoes"
    pasta.mkdir(exist_ok=True)
    saida = pasta / f"{nome}.py"
    comando = [sys.executable, "-m", "playwright", "codegen", "--target", "python",
               "--user-data-dir", str(cfg.perfil_navegador), "-o", str(saida)]
    if cfg.canal_navegador:
        comando += ["--channel", cfg.canal_navegador]
    print("Faça um protocolo completo no navegador que vai abrir.")
    print("Ao terminar, feche o navegador. A gravação fica em:", saida)
    subprocess.run([*comando, url], check=False)
    if saida.exists():
        print(f"\nGravação salva em {saida}. Envie esse arquivo para conversão em roteiro.")


def main(argv: list[str]) -> None:
    if len(argv) >= 1 and argv[0] == "gravar":
        if len(argv) != 3:
            sys.exit("Uso: python -m app gravar URL NOME   (ex.: gravar https://... tjsp-esaj)")
        gravar(argv[1], argv[2])
    else:
        iniciar()


if __name__ == "__main__":
    main(sys.argv[1:])
