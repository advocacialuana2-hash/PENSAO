---
name: replica-launch
description: Décima etapa da sequência replica. Prepara o lançamento da versão própria — landing page, planos e preços, ficha da App Store/Google Play, termos de uso e política de privacidade — com textos originais. Use quando o usuário pedir "landing page", "página de vendas", "tabela de preços", "ficha da loja de apps", ou rodar /replica-launch.
---

# /replica-launch — landing, preços e loja de apps

Objetivo: materiais de lançamento prontos para publicar, coerentes com marca (`replica/09-brand.md`) e ângulo (`replica/08-entrepreneur.md`).

## Limites

- Todo texto é original. Não reaproveite títulos, argumentos, depoimentos ou estrutura de copy do referência.
- Nada de depoimentos, números de clientes, selos, prêmios ou comparativos que não sejam verdadeiros e comprováveis. Comparação com concorrente nomeado só com dados públicos, citados e atuais.
- Respeite o Código de Defesa do Consumidor: preço total claro, condições de cancelamento e reembolso visíveis, direito de arrependimento em contratação a distância quando aplicável.
- Produto para advocacia: siga as regras de publicidade da OAB (skill `la-advogados:etica-oab-publicidade`).

## Entregas

1. **Landing page**: hero com a promessa do ângulo, problema, como funciona (3 passos), funcionalidades com benefício, prova verificável, planos, perguntas frequentes, chamada para ação. Mobile primeiro, carregamento rápido, SEO básico (title, description, Open Graph, dados estruturados) e acessibilidade. Implemente na stack do projeto ou como página estática.
2. **Planos e preços**: 2–3 planos com o que cada um inclui, limites, preço mensal/anual, período de teste se houver. Explique a lógica a partir das hipóteses de `replica/08-entrepreneur.md`.
3. **Ficha de loja** (se app mobile): nome (≤ 30 caracteres), subtítulo, descrição curta e longa, palavras-chave, roteiro dos screenshots, categoria, classificação etária, URL de suporte e de privacidade.
4. **Documentos legais**: minutas de termos de uso e política de privacidade adequadas à LGPD, com controlador, dados coletados, finalidades, bases legais, compartilhamento, retenção, direitos do titular e canal do encarregado. Marque como minuta a revisar pelo jurídico. Se faltar dado do controlador (razão social, CNPJ, endereço, e-mail do encarregado), pergunte antes de redigir.
5. **Medição**: eventos de conversão a rastrear e configuração de consentimento de cookies.

## Saída

- Código da landing e dos documentos no repositório.
- `replica/10-launch.md`: textos finais, planos, ficha de loja, checklist de publicação.

Sugira o próximo passo: `/replica-deploy`.
