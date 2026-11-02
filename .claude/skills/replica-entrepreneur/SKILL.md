---
name: replica-entrepreneur
description: Oitava etapa da sequência replica. Lê avaliações públicas reais do produto de referência e de concorrentes (lojas de apps, Reclame Aqui, G2, Capterra, redes sociais) para descobrir o que os usuários odeiam e propor o ângulo de diferenciação da versão própria. Use quando o usuário pedir "o que os clientes reclamam", "ângulo de mercado", "como me diferenciar", ou rodar /replica-entrepreneur.
---

# /replica-entrepreneur — dores reais e ângulo de mercado

Objetivo: transformar reclamações verificáveis de usuários em decisões de produto, posicionamento e preço.

## Fontes

Use somente avaliações públicas: App Store, Google Play, Reclame Aqui, G2, Capterra, Trustpilot, comunidades e redes sociais públicas, comentários em vídeos. Use WebSearch (modo `standard`; `extended` se os resultados vierem rasos) e o agente `web-fetch` para ler as páginas.

## Regras de rigor

1. **Cite a fonte** de cada dor (link e data). Não invente nem "parafraseie para melhor" uma reclamação inexistente.
2. **Quantifique** com honestidade: "12 de 80 avaliações lidas mencionam lentidão". Informe o tamanho da amostra e o período.
3. Separe **dor frequente** de **caso isolado**.
4. Não exponha dados pessoais dos avaliadores no relatório (use só o conteúdo da reclamação).
5. Se uma fonte bloquear acesso automatizado, use outra; não contorne o bloqueio.

## Procedimento

1. Colete entre 50 e 200 avaliações recentes (últimos 12–24 meses), priorizando as de 1–3 estrelas, sem descartar as positivas (mostram o que não pode piorar).
2. Agrupe por tema: preço, suporte, bugs, desempenho, usabilidade, funcionalidade ausente, contrato/cancelamento, segurança.
3. Para cada tema: frequência, gravidade percebida, citações curtas literais com fonte.
4. Cruze com `replica/07-diff.md`: quais dores a versão própria já resolve, quais pode resolver barato.
5. Proponha **o ângulo**: para quem é a versão própria (nicho), qual dor principal ela elimina, qual promessa verificável faz.
6. Esboce hipóteses de preço com base nos preços públicos dos concorrentes (cite a fonte e a data de cada preço).

## Saída: `replica/08-entrepreneur.md`

Mapa de dores com evidência, oportunidades priorizadas, ângulo recomendado em uma frase, hipóteses de preço, riscos (ex.: concorrente pode copiar rápido) e três experimentos baratos para validar o ângulo antes de investir mais.

Sugira o próximo passo: `/replica-brand`.
