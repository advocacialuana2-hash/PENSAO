---
name: replica-diff
description: Sétima etapa da sequência replica. Compara funcionalmente a versão própria com o produto de referência e gera um relatório de paridade (o que existe, o que falta, o que é melhor ou pior), além de verificar se nada foi copiado indevidamente. Use quando o usuário pedir "relatório de paridade", "comparar com o original", "o que falta para igualar", ou rodar /replica-diff.
---

# /replica-diff — relatório de paridade

Objetivo: medir o quanto a versão própria cobre o valor do produto de referência e onde ela se diferencia, para orientar as próximas entregas.

## Entradas

- `replica/01-recon.md` (funcionalidades do referência) e seus screenshots
- O app próprio rodando localmente
- `replica/06-test.md`

## Procedimento

1. Monte a lista de funcionalidades do referência a partir do recon, preservando a marcação `[O]` observado / `[I]` inferido. Funcionalidade inferida não pode ser declarada "igualada" sem ressalva.
2. Para cada funcionalidade, avalie a versão própria:
   - **Status**: igual, melhor, parcial, ausente, fora do escopo (decisão do MVP).
   - **Evidência**: tela, rota ou teste que comprova.
   - **Observação**: diferença relevante para o usuário final.
3. Compare também: número de passos para concluir os fluxos principais, tempo de carregamento das telas principais, experiência mobile, acessibilidade.
4. **Verificação de originalidade** (obrigatória):
   - nenhum texto de interface, termo de uso, política ou material de marketing idêntico ao do referência;
   - nenhum logotipo, ilustração, ícone customizado ou imagem do referência;
   - nome e identidade visual distintos (se ainda não, aponte para `/replica-brand`);
   - nenhum trecho de código do referência no repositório.
   Liste qualquer achado como bloqueante para o lançamento.

## Saída: `replica/07-diff.md`

1. Índice de paridade: funcionalidades iguais ou melhores / total do escopo (com a fórmula usada).
2. Tabela funcionalidade × status × evidência.
3. Lacunas priorizadas por impacto para o cliente e esforço.
4. Diferenciais da versão própria.
5. Resultado da verificação de originalidade.

Sugira o próximo passo: `/replica-entrepreneur` para encontrar o ângulo de mercado.
