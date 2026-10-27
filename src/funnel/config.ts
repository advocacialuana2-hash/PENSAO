// Valores definidos por variáveis de ambiente (ver .env.example).
// Fora do Vite (ex.: testes com tsx) import.meta.env não existe.
const env: Partial<ImportMetaEnv> = import.meta.env ?? {};

export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '5511999999999').replace(/\D/g, '');
export const LEAD_WEBHOOK_URL = env.VITE_LEAD_WEBHOOK_URL || '';
export const META_PIXEL_ID = env.VITE_META_PIXEL_ID || '';

// Segundos até o redirecionamento automático para o WhatsApp após a qualificação.
export const REDIRECT_DELAY_SECONDS = 4;

// Nome e inscrição na OAB devem constar da publicidade (Código de Ética da OAB, art. 44). Vazio = linha omitida.
export const BRAND_NAME = env.VITE_BRAND_NAME || '';
export const OAB_INFO = env.VITE_OAB_INFO || '';

// Piso do benefício: 120 dias (4 meses) × salário mínimo (CF, art. 201, § 2º). Atualizar a cada novo salário mínimo.
export const SALARIO_MINIMO = 1621;
export const SALARIO_MINIMO_ANO = 2026;
export const VALOR_MINIMO_BENEFICIO = SALARIO_MINIMO * 4;

export const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
