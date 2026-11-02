---
name: replica-recon
description: Primeira etapa da sequência replica. Faz a engenharia reversa funcional de um app ou site — telas, fluxos, campos, regras, integrações e stack — a partir de páginas públicas, screenshots, vídeos, fichas de loja de apps e de uma conta própria do usuário. Use quando o usuário pedir para "fazer engenharia reversa", "mapear", "descobrir como funciona" ou "replicar" um sistema, ou rodar /replica-recon <url ou material>.
---

# /replica-recon — mapa funcional do produto de referência

Objetivo: produzir uma especificação funcional fiel do produto de referência, suficiente para as próximas etapas construírem uma versão **própria**. Estudamos o que o produto faz; não copiamos código, textos, imagens nem marca.

## Entradas aceitas

- URL pública (site, landing, demo, documentação, central de ajuda)
- Screenshots, gravações de tela ou vídeos enviados pelo usuário
- Ficha na App Store / Google Play (descrição, screenshots, notas de versão)
- Conta própria do usuário no produto (ele navega e compartilha prints, ou fornece acesso que ele mesmo controla)

## Limites (obrigatórios)

1. Só acesse o que é público ou o que o usuário acessa legitimamente com a própria conta. Não contorne login, paywall, captcha, limite de requisições ou bloqueio de robôs. Não use credenciais de terceiros.
2. Respeite `robots.txt` e os termos de uso. Se os termos proibirem automação, faça a análise só com o material que o usuário fornecer.
3. Não baixe nem guarde código-fonte proprietário para reaproveitar. Ler o JavaScript público para entender comportamento é permitido; copiar trechos para o projeto não é.
4. Não conclua formulários que gerem efeito real (compra, agendamento, cadastro, envio). Pare antes e registre até onde foi.
5. Use dados fictícios em qualquer campo preenchido.

## Procedimento

1. **Pergunte o alvo e o escopo** se não estiverem claros: qual produto, quais módulos interessam, quem é o usuário final.
2. **Teste o acesso** (`curl -sS -A "Mozilla/5.0" -o /dev/null -w "%{http_code}"`). Se a rede bloquear o domínio, leia a documentação do ambiente (`read_documentation`, tópico `environment.network`), informe o domínio bloqueado e peça liberação ou material alternativo. Não invente conteúdo.
3. **Colete** com Playwright (pré-instalado: `require('playwright')`, `chromium.launch()`):
   - percorra todas as telas, abas, menus e botões alcançáveis;
   - capture screenshots em desktop (1280×900) e mobile (390×844) em `replica/screenshots/`;
   - registre as requisições de rede (`page.on('request')`) para identificar APIs, serviços de terceiros, analytics, pagamentos;
   - extraia os campos de formulário (`name`, `type`, `required`, opções, máscaras, mensagens de validação).
4. **Classifique cada afirmação** como `[O]` observado (visto em tela, código ou rede) ou `[I]` inferido (depende de confirmação). Nunca apresente inferência como fato.
5. **Identifique o que é ilustração**: landing pages costumam simular o produto com animações e dados fixos. Diga explicitamente quando o "sistema" visto é marketing e quando é o app real.

## Saída: `replica/01-recon.md`

Estrutura obrigatória:

1. Achado principal (o que foi possível acessar e o que não foi)
2. O que é o produto e para quem
3. Telas (lista com screenshot correspondente)
4. Fluxos passo a passo
5. Campos (nome, tipo, obrigatoriedade, opções, validações)
6. Regras de negócio e cálculos
7. Saídas geradas (documentos, mensagens, notificações)
8. Integrações e endpoints observados
9. Stack técnica
10. Uso de IA (onde, como, prompts visíveis)
11. Especificação mínima para versão própria
12. O que não foi acessado e por quê

Ao final, informe ao usuário o resumo em até 10 linhas e sugira o próximo passo: `/replica-architect`.
