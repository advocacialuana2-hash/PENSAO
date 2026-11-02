import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, UPLOAD_DIR } from "./db.ts";
import { auditar } from "./audit.ts";
import { notificar } from "./notify.ts";
import { obterParaUso } from "./vault.ts";
import { adaptador } from "./adapters/index.ts";
import { ErroProtocolo, type DocumentoCfg, type TribunalCfg } from "./adapters/types.ts";

interface PeticaoRow {
  id: number;
  tipo: "inicial" | "intermediaria";
  tribunal_id: number;
  certificado_id: number | null;
  numero_processo: string | null;
  movimentacao: string | null;
  dados_json: string;
  enviado_por: number;
  tentativas: number;
}

let rodando = false;
let timer: NodeJS.Timeout | null = null;

function resumoPartes(dados: Record<string, unknown>): string | undefined {
  const nomes = (k: string) =>
    Array.isArray(dados[k]) ? (dados[k] as Array<{ nome?: string }>).map((p) => p.nome).filter(Boolean).join(", ") : "";
  const a = nomes("polo_ativo");
  const p = nomes("polo_passivo");
  return a || p ? `${a || "?"} x ${p || "?"}` : undefined;
}

async function processar(p: PeticaoRow): Promise<void> {
  const tribunal = db.prepare("SELECT * FROM tribunais WHERE id = ?").get(p.tribunal_id) as unknown as TribunalCfg;
  const documentos = db
    .prepare("SELECT id, nome_original, arquivo, tipo, ordem FROM documentos WHERE peticao_id = ? ORDER BY ordem")
    .all(p.id) as unknown as DocumentoCfg[];
  const enviadoPor = (db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(p.enviado_por) as { nome: string }).nome;
  const dados = JSON.parse(p.dados_json) as Record<string, unknown>;
  const base = {
    peticaoId: p.id, tipo: p.tipo, tribunal: tribunal.sigla, sistema: tribunal.sistema,
    partes: resumoPartes(dados), enviadoPor,
  };

  const ad = adaptador(tribunal.adaptador);
  try {
    if (!ad) throw new ErroProtocolo(`Adaptador "${tribunal.adaptador}" indisponível para ${tribunal.sigla}.`, false);
    const resultado = await ad.protocolar({
      peticao: { id: p.id, tipo: p.tipo, numero_processo: p.numero_processo, movimentacao: p.movimentacao, dados, certificado_id: p.certificado_id, enviado_por: p.enviado_por },
      tribunal,
      documentos,
      obterCertificado: () => {
        if (!p.certificado_id) throw new ErroProtocolo("Nenhum certificado selecionado.", false);
        return obterParaUso(p.certificado_id, p.enviado_por, `protocolo da petição #${p.id}`);
      },
    });

    if (resultado.tipo === "manual") {
      db.prepare("UPDATE peticoes SET status = 'aguardando_protocolo_manual', erro_motivo = NULL, atualizado_em = datetime('now'), dados_json = json_set(dados_json, '$._instrucoes', json(?)) WHERE id = ?")
        .run(JSON.stringify(resultado.instrucoes), p.id);
      auditar({ usuarioId: p.enviado_por, acao: "protocolo.aguardando_manual", entidade: "peticao", entidadeId: p.id });
      await notificar({ ...base, evento: "protocolo.aguardando_manual", numeroProcesso: p.numero_processo, em: new Date().toISOString() });
      return;
    }

    let recibo: string | null = null;
    if (resultado.reciboPdf) {
      recibo = `${crypto.randomUUID()}.pdf`;
      fs.writeFileSync(path.join(UPLOAD_DIR, recibo), resultado.reciboPdf);
    }
    db.prepare(
      `UPDATE peticoes SET status = 'concluido', numero_processo = COALESCE(?, numero_processo), protocolo_numero = ?,
       protocolo_em = datetime('now'), recibo_arquivo = ?, erro_motivo = NULL, atualizado_em = datetime('now') WHERE id = ?`,
    ).run(resultado.numeroProcesso, resultado.protocolo, recibo, p.id);
    auditar({ usuarioId: p.enviado_por, acao: "protocolo.concluido", entidade: "peticao", entidadeId: p.id, certificadoId: p.certificado_id, detalhes: { numero: resultado.numeroProcesso, protocolo: resultado.protocolo, adaptador: ad.chave } });
    await notificar({ ...base, evento: "protocolo.concluido", numeroProcesso: resultado.numeroProcesso, protocolo: resultado.protocolo, em: new Date().toISOString() });
  } catch (e) {
    const motivo = e instanceof ErroProtocolo ? e.motivo : `Falha inesperada: ${(e as Error).message}`;
    db.prepare("UPDATE peticoes SET status = 'erro', erro_motivo = ?, atualizado_em = datetime('now') WHERE id = ?").run(motivo, p.id);
    auditar({ usuarioId: p.enviado_por, acao: "protocolo.erro", entidade: "peticao", entidadeId: p.id, certificadoId: p.certificado_id, detalhes: { motivo } });
    await notificar({ ...base, evento: "protocolo.erro", numeroProcesso: p.numero_processo, motivo, em: new Date().toISOString() });
  }
}

async function ciclo(): Promise<void> {
  if (rodando) return;
  rodando = true;
  try {
    for (;;) {
      const p = db
        .prepare("SELECT * FROM peticoes WHERE status = 'na_fila' ORDER BY enviado_em, id LIMIT 1")
        .get() as unknown as PeticaoRow | undefined;
      if (!p) break;
      const claimed = db
        .prepare("UPDATE peticoes SET status = 'processando', tentativas = tentativas + 1, atualizado_em = datetime('now') WHERE id = ? AND status = 'na_fila'")
        .run(p.id);
      if (claimed.changes === 0) continue;
      await processar(p);
    }
  } finally {
    rodando = false;
  }
}

export function iniciarFila(intervaloMs = 3000): void {
  // Petições que estavam "processando" quando o servidor parou podem ter sido
  // protocoladas ou não. Nunca reenviar automaticamente: marcar para conferência.
  const presas = db
    .prepare("UPDATE peticoes SET status = 'erro', erro_motivo = 'Envio interrompido por reinício do servidor. Confira no portal do tribunal antes de reenviar, para evitar protocolo em duplicidade.' WHERE status = 'processando'")
    .run();
  if (presas.changes) console.warn(`[fila] ${presas.changes} petição(ões) interrompida(s) marcadas para conferência.`);
  timer = setInterval(() => void ciclo(), intervaloMs);
  void ciclo();
}

export function pararFila(): void {
  if (timer) clearInterval(timer);
}

export function acordarFila(): void {
  void ciclo();
}
