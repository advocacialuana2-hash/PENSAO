<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b3b58858-b6dd-4034-92ef-d57b69bf4923

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Funil de captação

Todos os botões da página abrem um quiz de qualificação. Leads qualificados seguem para o WhatsApp do escritório com o resumo do caso; os demais recebem orientação e não geram contato.

- Perguntas: `src/funnel/questions.ts`
- Regras de qualificação, pontuação e mensagem: `src/funnel/qualify.ts`
- UTMs, Pixel e webhook: `src/funnel/tracking.ts`
- Roteiro de atendimento e fechamento on-line: `docs/PLAYBOOK_CAPTACAO_WHATSAPP.md`

Configure `VITE_WHATSAPP_NUMBER`, `VITE_LEAD_WEBHOOK_URL` e `VITE_META_PIXEL_ID` em `.env.local`. Testes da lógica: `npm test`.
