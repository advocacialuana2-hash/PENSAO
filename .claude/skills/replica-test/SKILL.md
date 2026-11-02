---
name: replica-test
description: Sexta etapa da sequência replica. Percorre todos os fluxos da versão própria no navegador automatizado, procura bugs, falhas de permissão, problemas de acessibilidade e de layout mobile, e corrige o que encontrar. Use quando o usuário pedir para "testar tudo", "procurar bugs", "clicar em todos os fluxos", ou rodar /replica-test.
---

# /replica-test — varredura de fluxos e correção de bugs

Objetivo: encontrar e corrigir defeitos antes do lançamento, com evidência reprodutível de cada um.

## Preparação

1. Suba o app localmente com dados de teste (banco separado, modo simulação para integrações externas). Nunca teste contra pagamento, envio ou serviço real de produção.
2. Crie um usuário de cada perfil.
3. Liste os fluxos a partir de `replica/01-recon.md` (seção Fluxos) e `replica/02-architecture.md` (rotas e estados).

## Roteiro de testes (Playwright, `require('playwright')`)

Para cada fluxo:

1. **Caminho feliz** completo, com screenshot de cada etapa.
2. **Entradas inválidas**: campos vazios, formatos errados, valores-limite, arquivos errados ou grandes demais, textos com acentos e caracteres especiais.
3. **Permissões**: tentar a ação com cada perfil e sem login (pela interface e chamando a API diretamente).
4. **Estados**: voltar, recarregar no meio, clicar duas vezes em enviar, abrir em duas abas.
5. **Falhas externas**: integração fora do ar ou lenta; o app deve informar o erro e não perder dados.
6. **Mobile** (390×844): nada cortado, sem rolagem horizontal, botões alcançáveis.
7. **Acessibilidade**: rótulos, foco visível, ordem de tabulação, contraste.
8. **Console e rede**: nenhum erro de JavaScript nem requisição falhando sem tratamento.

## Para cada defeito

Registre: fluxo, passos para reproduzir, resultado esperado, resultado obtido, gravidade (bloqueante / alta / média / baixa), screenshot. Corrija, escreva um teste que cobriria o defeito quando fizer sentido, e rode de novo para confirmar.

## Saída

- `replica/06-test.md`: tabela de fluxos testados (ok / falhou), defeitos encontrados e status de cada um, saída real dos testes automatizados.
- Screenshots em `replica/screenshots/test/`.
- Correções commitadas.

Relate com fidelidade: se algo não pôde ser testado (ex.: integração sem credencial), diga isso. Sugira o próximo passo: `/replica-diff`.
