import { db } from "./db.ts";

export interface EventoAuditoria {
  usuarioId?: number | null;
  acao: string;
  entidade?: string;
  entidadeId?: number | bigint | null;
  certificadoId?: number | null;
  detalhes?: unknown;
  ip?: string | null;
}

const ins = db.prepare(`
  INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, certificado_id, detalhes_json, ip)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function auditar(e: EventoAuditoria): void {
  ins.run(
    e.usuarioId ?? null,
    e.acao,
    e.entidade ?? null,
    e.entidadeId != null ? Number(e.entidadeId) : null,
    e.certificadoId ?? null,
    e.detalhes !== undefined ? JSON.stringify(e.detalhes) : null,
    e.ip ?? null,
  );
}
