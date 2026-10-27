import { LEAD_WEBHOOK_URL, META_PIXEL_ID } from './config';

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'fbclid',
  'gclid',
] as const;

const STORAGE_KEY = 'pa_attribution';

type Attribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number] | 'landing_url', string>>;

let memoryAttribution: Attribution = {};

// Guarda a origem do clique na primeira visita da sessão, para não perder as UTMs ao navegar.
export function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value) fromUrl[key] = value;
  }
  const stored = readStored();
  memoryAttribution = Object.keys(fromUrl).length
    ? { ...fromUrl, landing_url: window.location.href }
    : stored ?? { landing_url: window.location.href };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryAttribution));
  } catch {
    // Armazenamento indisponível: mantém só em memória.
  }
}

function readStored(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

export const getAttribution = (): Attribution => memoryAttribution;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: Fbq;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export function initPixel() {
  if (!META_PIXEL_ID || window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  } as Fbq;
  // Mesma estrutura do snippet oficial da Meta: os eventos ficam na fila até o script carregar.
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
}

export function trackEvent(name: string, params: Record<string, unknown> = {}, custom = false) {
  window.fbq?.(custom ? 'trackCustom' : 'track', name, params);
}

// Envio como formulário simples: dispensa preflight CORS e o Make/Zapier separa os campos sozinho.
export function sendLead(fields: Record<string, string | number | boolean>) {
  if (!LEAD_WEBHOOK_URL) return;
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.append(key, String(value));
  fetch(LEAD_WEBHOOK_URL, { method: 'POST', mode: 'no-cors', keepalive: true, body }).catch(() => {
    // Falha de rede não pode impedir a cliente de chegar ao WhatsApp.
  });
}
