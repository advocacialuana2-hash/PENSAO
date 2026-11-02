---
name: replica-build
description: Quarta etapa da sequência replica. Constrói o front-end da versão própria tela por tela, a partir do recon, da arquitetura e do design system. Use quando o usuário pedir para "construir as telas", "montar o app", "implementar o front" de um projeto replica, ou rodar /replica-build [tela].
---

# /replica-build — construção tela a tela

Objetivo: implementar as telas do MVP com código original, seguindo `replica/02-architecture.md` e `replica/03-design.md`, com cada tela funcionando antes de passar à próxima.

## Entradas obrigatórias

`replica/01-recon.md`, `replica/02-architecture.md`, `replica/03-design.md`. Se faltar alguma, rode a skill correspondente ou peça ao usuário.

## Limites

- Todo código é escrito do zero para este projeto. Não cole HTML, CSS, JS ou textos extraídos do produto de referência.
- Textos de interface (rótulos, mensagens, ajuda) são redigidos para o público do usuário, em português claro.
- Sem placeholders do tipo "Lorem ipsum", "TODO" ou "insira aqui" em telas entregues. Se faltar conteúdo real, pergunte.

## Procedimento

1. **Prepare o projeto** se ainda não existir: estrutura de pastas, dependências, lint/verificação de tipos, roteamento, tokens do design system.
2. **Ordem**: autenticação → layout/navegação → telas do fluxo principal na sequência do usuário → telas de gestão/configuração.
3. **Para cada tela**, registre em `replica/04-build.md`:
   - objetivo da tela e fluxo de origem no recon;
   - componentes usados;
   - estados cobertos: carregando, vazio, erro, sucesso, sem permissão;
   - dados consumidos (rota da API ou mock tipado provisório, claramente identificado como mock).
4. **Verifique** cada tela antes de seguir: compilação e tipos sem erro; screenshot com Playwright em desktop e mobile; navegação por teclado no formulário principal.
5. **Validações no cliente** espelham as do servidor, mas nunca as substituem.
6. Faça commits pequenos por tela, com mensagem descritiva.

## Saída

- Código das telas no repositório.
- `replica/04-build.md`: checklist de telas (feita / pendente), mocks ainda existentes e o que depende do back-end.

Sugira o próximo passo: `/replica-backend` (ou volte a `/replica-build <tela>` para as pendentes).
