---
name: replica-architect
description: Segunda etapa da sequência replica. Planeja stack, modelo de dados, API, segurança e hospedagem da versão própria a partir do mapa funcional (replica/01-recon.md). Use quando o usuário pedir para "planejar a arquitetura", "definir a stack", "modelar o banco" de um app a ser construído, ou rodar /replica-architect.
---

# /replica-architect — arquitetura da versão própria

Objetivo: transformar `replica/01-recon.md` em um plano técnico executável, adequado ao porte e ao orçamento do usuário. Não reproduza a arquitetura do concorrente por reflexo: escolha o que atende os requisitos.

## Antes de começar

Leia `replica/01-recon.md`. Se não existir, peça para rodar `/replica-recon` ou peça a especificação ao usuário.

Pergunte apenas o que muda a arquitetura e não estiver no recon:
- volume esperado (usuários, registros/mês)
- onde vai hospedar e orçamento mensal de infraestrutura
- dados sensíveis envolvidos (saúde, menores, financeiro, processos judiciais → LGPD reforçada)
- web, mobile ou ambos
- integrações obrigatórias (pagamento, WhatsApp, e-mail, ERP, tribunais)

## Decisões a registrar

1. **Escopo do MVP**: o menor conjunto de funcionalidades que entrega o valor central. Liste o que fica para depois.
2. **Stack**: front-end, back-end, banco, fila, armazenamento de arquivos, autenticação. Justifique cada escolha em uma linha. Prefira tecnologias que o usuário já usa ou consegue manter.
3. **Modelo de dados**: tabelas/coleções com campos, tipos, chaves, índices e relacionamentos. Use SQL DDL ou diagrama Mermaid `erDiagram`.
4. **API**: rotas (método, caminho, entrada, saída, permissão). Marque quais exigem autenticação e qual perfil.
5. **Máquinas de estado** dos objetos principais (ex.: pedido, petição, assinatura), com transições permitidas.
6. **Segurança**: autenticação, perfis e permissões, segredos (variáveis de ambiente, nunca no código), cifragem de dados sensíveis, trilha de auditoria, limite de tentativas de login.
7. **LGPD**: dados pessoais tratados, base legal provável, retenção, quem acessa. Marque como "a validar com o jurídico".
8. **Uso de IA** (se houver): em qual etapa, entrada, saída estruturada, revisão humana, custo estimado por operação. Para Claude, carregue a skill `claude-api` antes de especificar o código.
9. **Riscos técnicos** e como mitigá-los.
10. **Plano de etapas**: ordem de construção, cada etapa com critério de pronto verificável.

## Saída: `replica/02-architecture.md`

Contém as dez seções acima, em linguagem direta. Termine com a lista de decisões que dependem do usuário, se houver, e sugira o próximo passo: `/replica-design`.
