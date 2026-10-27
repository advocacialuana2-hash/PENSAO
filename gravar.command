#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo "Gravação de roteiro"
echo
read -r -p "Endereço (URL) da página de login do sistema: " URL
read -r -p "Nome do roteiro (ex.: tjms-esaj, trt24-pje, inss-exigencia, inss-consulta): " NOME
.venv/bin/python -m app gravar "$URL" "$NOME"
read -r -p "Pressione Enter para fechar." _
