export interface EventoFila {
  evento: "protocolo.concluido" | "protocolo.erro" | "protocolo.aguardando_manual";
  peticaoId: number;
  tipo: "inicial" | "intermediaria";
  tribunal: string;
  sistema: string;
  numeroProcesso: string | null;
  protocolo?: string | null;
  partes?: string;
  motivo?: string;
  enviadoPor: string;
  em: string;
}

/**
 * Envia o evento ao webhook configurado (ex.: cenário do Make que dispara
 * WhatsApp). Falhas de notificação não interrompem a fila.
 */
export async function notificar(evento: EventoFila): Promise<void> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(evento),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[notify] webhook respondeu ${res.status}`);
  } catch (e) {
    console.error("[notify] falha ao enviar:", (e as Error).message);
  }
}
