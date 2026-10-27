#!/bin/bash
# Instalação no Mac: dê dois cliques neste arquivo (na primeira vez, botão direito > Abrir).
cd "$(dirname "$0")" || exit 1
echo "Instalando o Protocolo Automático..."
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 não encontrado. Instale em https://www.python.org/downloads/macos/ e rode de novo."
  read -r -p "Pressione Enter para fechar." _; exit 1
fi
python3 -m venv .venv || { read -r -p "Falhou ao criar o ambiente. Enter para fechar." _; exit 1; }
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt || { read -r -p "Falhou ao instalar. Enter para fechar." _; exit 1; }
[ -f config.yaml ] || cp config.example.yaml config.yaml
mkdir -p "$HOME/Documents/Protocolar"
chmod +x iniciar.command gravar.command
echo
echo "Instalação concluída. Revise o config.yaml e depois abra iniciar.command."
read -r -p "Pressione Enter para fechar." _
