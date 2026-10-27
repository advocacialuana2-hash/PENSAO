// Valores definidos por variáveis de ambiente (ver .env.example).
// Fora do Vite (ex.: testes com tsx) import.meta.env não existe.
const env: Partial<ImportMetaEnv> = import.meta.env ?? {};

// Único destino do lead: o escritório é quem entra em contato. Sem webhook, o lead se perde.
export const LEAD_WEBHOOK_URL = env.VITE_LEAD_WEBHOOK_URL || '';
export const META_PIXEL_ID = env.VITE_META_PIXEL_ID || '';

// Nome exibido no site e usado na primeira mensagem para a cliente.
export const BRAND_NAME = env.VITE_BRAND_NAME || 'G1 Auxílios Previdenciários';

// Piso do benefício: 120 dias (4 meses) × salário mínimo (CF, art. 201, § 2º). Atualizar a cada novo salário mínimo.
export const SALARIO_MINIMO = 1621;
export const SALARIO_MINIMO_ANO = 2026;
export const VALOR_MINIMO_BENEFICIO = SALARIO_MINIMO * 4;

export const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
