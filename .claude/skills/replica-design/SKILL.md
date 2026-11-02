---
name: replica-design
description: Terceira etapa da sequência replica. Cria um design system próprio — cores, tipografia, espaçamento, componentes e ícones — inspirado na usabilidade do produto de referência, mas com identidade e assets do usuário. Use quando o usuário pedir para "refazer o design", "criar o design system", "definir cores e fontes" de um app a ser construído, ou rodar /replica-design.
---

# /replica-design — design system próprio

Objetivo: entregar tokens e componentes prontos para implementação, com a mesma clareza de uso do produto de referência e aparência própria.

## Limites

- Não copie logotipo, ilustrações, fotos, ícones customizados, textos ou a combinação distintiva de cores e formas que identifica o concorrente (trade dress). Padrões genéricos de interface (barra lateral, cards, tabelas, botões) são livres.
- Use apenas fontes com licença de uso (Google Fonts ou fontes licenciadas pelo usuário) e bibliotecas de ícones abertas (ex.: Lucide, Heroicons).
- Imagens: assets do próprio usuário, gerados para ele ou de banco com licença.

## Entradas

- `replica/01-recon.md` e screenshots em `replica/screenshots/` (para entender hierarquia e fluxos, não para copiar estilo)
- `replica/02-architecture.md` (stack de front-end)
- Identidade do usuário: logo, cores, site, manual de marca. Se não houver, pergunte o tom desejado (sóbrio, moderno, acolhedor etc.) ou aguarde `/replica-brand`.

## Procedimento

1. **Análise de usabilidade do referência**: o que funciona bem (densidade de informação, navegação, feedback de estado) e o que é fraco. Registre só princípios, sem medidas copiadas.
2. **Tokens**:
   - cores: primária, secundária, neutros (50–900), sucesso, alerta, erro, informação; versão clara e escura; contraste mínimo WCAG AA (4,5:1 texto normal);
   - tipografia: família de títulos e de texto, escala (12/14/16/20/24/32), pesos, altura de linha;
   - espaçamento (escala de 4 px), raios, sombras, breakpoints.
3. **Componentes**: botão (primário, secundário, perigo, desabilitado, carregando), campo de texto, select, checkbox, upload, tabela, card, badge de status, alerta, modal, navegação lateral e mobile, estado vazio, estado de erro.
4. **Telas-chave**: wireframe textual ou HTML estático das 3–5 telas principais aplicando os tokens.
5. **Acessibilidade**: foco visível, rótulos em todos os campos, navegação por teclado, áreas de toque ≥ 44 px.

## Saída

- `replica/03-design.md`: tokens, componentes e regras de uso.
- Arquivo de tokens na stack escolhida (ex.: bloco `@theme` do Tailwind v4, `tokens.css` com variáveis, ou `theme.ts`).
- Se útil para aprovação, uma página HTML de amostra publicada como Artifact (carregue a skill `artifact-design` antes).

Sugira o próximo passo: `/replica-build`.
