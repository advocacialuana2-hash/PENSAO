import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { db, tx, UPLOAD_DIR } from "../db.ts";
import { auditar } from "../audit.ts";
import { exigirPapel, ipDe } from "../auth.ts";
import { sha256 } from "../crypto.ts";
import { validarCnj } from "../cnj.ts";
import { extrairDados, TIPOS_DOCUMENTO, type Extracao } from "../ai.ts";
import { usuarioPodeUsar } from "../vault.ts";
import { acordarFila } from "../queue.ts";

export const peticoesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") cb(new Error(`"${file.originalname}" não é PDF.`));
    else cb(null, true);
  },
});

const LIMITE_LOTE = 50;

function nomeUtf8(nome: string): string {
  // multer entrega o nome em latin1
  return Buffer.from(nome, "latin1").toString("utf8");
}

function salvarArquivos(peticaoId: number, arquivos: Express.Multer.File[], tipos: string[] = [], ordemInicial = 0): void {
  const ins = db.prepare(
    "INSERT INTO documentos (peticao_id, nome_original, arquivo, tamanho, sha256, tipo, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  arquivos.forEach((f, i) => {
    if (f.buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error(`"${nomeUtf8(f.originalname)}" não é um PDF válido.`);
    const nome = `${crypto.randomUUID()}.pdf`;
    fs.writeFileSync(path.join(UPLOAD_DIR, nome), f.buffer);
    const tipo = (TIPOS_DOCUMENTO as readonly string[]).includes(tipos[i]) ? tipos[i] : "outro";
    ins.run(peticaoId, nomeUtf8(f.originalname), nome, f.size, sha256(f.buffer), tipo, ordemInicial + i);
  });
}

type PeticaoCarregada = Record<string, unknown> & {
  dados: Record<string, unknown>;
  campos_ia: string[];
  extracao: unknown;
  documentos: Array<Record<string, unknown>>;
};

function carregar(id: number): PeticaoCarregada | undefined {
  const p = db
    .prepare(
      `SELECT p.*, t.sigla AS tribunal_sigla, t.sistema AS tribunal_sistema, t.adaptador AS tribunal_adaptador,
              c.titular AS certificado_titular, uc.nome AS criado_por_nome, ue.nome AS enviado_por_nome
       FROM peticoes p
       LEFT JOIN tribunais t ON t.id = p.tribunal_id
       LEFT JOIN certificados c ON c.id = p.certificado_id
       LEFT JOIN usuarios uc ON uc.id = p.criado_por
       LEFT JOIN usuarios ue ON ue.id = p.enviado_por
       WHERE p.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!p) return undefined;
  const documentos = db
    .prepare("SELECT id, nome_original, tamanho, tipo, tipo_origem, ordem FROM documentos WHERE peticao_id = ? ORDER BY ordem")
    .all(id);
  return {
    ...p,
    dados: JSON.parse(p.dados_json as string),
    campos_ia: JSON.parse(p.campos_ia_json as string),
    extracao: p.extracao_json ? JSON.parse(p.extracao_json as string) : null,
    dados_json: undefined, campos_ia_json: undefined, extracao_json: undefined,
    documentos,
  };
}

function erro(res: Response, status: number, msg: string) {
  res.status(status).json({ erro: msg });
}

/* ---------- Listagem / detalhe ---------- */

peticoesRouter.get("/", (req, res) => {
  const { status, tipo, q } = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (status) { where.push("p.status = ?"); args.push(status); }
  if (tipo) { where.push("p.tipo = ?"); args.push(tipo); }
  if (q) { where.push("(p.numero_processo LIKE ? OR p.dados_json LIKE ?)"); args.push(`%${q}%`, `%${q}%`); }
  const rows = db
    .prepare(
      `SELECT p.id, p.tipo, p.status, p.numero_processo, p.movimentacao, p.protocolo_numero, p.erro_motivo, p.lote_id,
              p.criado_em, p.atualizado_em, p.enviado_em, t.sigla AS tribunal_sigla, t.sistema AS tribunal_sistema,
              u.nome AS criado_por_nome, json_extract(p.dados_json, '$.polo_ativo[0].nome') AS autor,
              json_extract(p.dados_json, '$.polo_passivo[0].nome') AS reu
       FROM peticoes p LEFT JOIN tribunais t ON t.id = p.tribunal_id LEFT JOIN usuarios u ON u.id = p.criado_por
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY p.atualizado_em DESC LIMIT 500`,
    )
    .all(...args);
  res.json(rows);
});

peticoesRouter.get("/:id", (req, res) => {
  const p = carregar(Number(req.params.id));
  if (!p) return erro(res, 404, "Petição não encontrada.");
  res.json(p);
});

peticoesRouter.get("/:id/documentos/:docId", (req, res) => {
  const d = db
    .prepare("SELECT nome_original, arquivo FROM documentos WHERE id = ? AND peticao_id = ?")
    .get(Number(req.params.docId), Number(req.params.id)) as { nome_original: string; arquivo: string } | undefined;
  if (!d) return erro(res, 404, "Documento não encontrado.");
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(d.nome_original)}`);
  res.sendFile(path.join(UPLOAD_DIR, d.arquivo));
});

peticoesRouter.get("/:id/recibo", (req, res) => {
  const p = db.prepare("SELECT recibo_arquivo FROM peticoes WHERE id = ?").get(Number(req.params.id)) as { recibo_arquivo: string | null } | undefined;
  if (!p?.recibo_arquivo) return erro(res, 404, "Recibo não disponível.");
  res.sendFile(path.join(UPLOAD_DIR, p.recibo_arquivo));
});

/* ---------- Distribuição (petição inicial) ---------- */

peticoesRouter.post("/distribuicao", upload.array("arquivos"), (req: Request, res: Response) => {
  const arquivos = (req.files as Express.Multer.File[]) ?? [];
  if (arquivos.length === 0) return erro(res, 400, "Envie ao menos a petição inicial em PDF.");
  const tribunalId = Number(req.body.tribunal_id) || null;
  try {
    const id = tx(() => {
      const r = db
        .prepare("INSERT INTO peticoes (tipo, status, tribunal_id, criado_por) VALUES ('inicial', 'rascunho', ?, ?)")
        .run(tribunalId, req.usuario!.id);
      const pid = Number(r.lastInsertRowid);
      salvarArquivos(pid, arquivos, ["peticao_inicial"]);
      return pid;
    });
    auditar({ usuarioId: req.usuario!.id, acao: "peticao.criada", entidade: "peticao", entidadeId: id, detalhes: { tipo: "inicial", arquivos: arquivos.length }, ip: ipDe(req) });
    res.status(201).json(carregar(id));
  } catch (e) {
    erro(res, 400, (e as Error).message);
  }
});

peticoesRouter.post("/:id/documentos", upload.array("arquivos"), (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status FROM peticoes WHERE id = ?").get(id) as { status: string } | undefined;
  if (!p) return erro(res, 404, "Petição não encontrada.");
  if (!["rascunho", "revisao", "erro"].includes(p.status)) return erro(res, 409, "A petição não pode mais ser alterada.");
  const { n } = db.prepare("SELECT COALESCE(MAX(ordem) + 1, 0) AS n FROM documentos WHERE peticao_id = ?").get(id) as { n: number };
  try {
    salvarArquivos(id, (req.files as Express.Multer.File[]) ?? [], [], n);
    auditar({ usuarioId: req.usuario!.id, acao: "peticao.documentos_adicionados", entidade: "peticao", entidadeId: id, ip: ipDe(req) });
    res.json(carregar(id));
  } catch (e) {
    erro(res, 400, (e as Error).message);
  }
});

peticoesRouter.delete("/:id/documentos/:docId", (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status FROM peticoes WHERE id = ?").get(id) as { status: string } | undefined;
  if (!p || !["rascunho", "revisao", "erro"].includes(p.status)) return erro(res, 409, "A petição não pode mais ser alterada.");
  db.prepare("DELETE FROM documentos WHERE id = ? AND peticao_id = ?").run(Number(req.params.docId), id);
  res.json(carregar(id));
});

function aplicarExtracao(e: Extracao) {
  const dados: Record<string, unknown> = {};
  const camposIa: string[] = [];
  const simples = ["comarca", "uf", "juizo", "area", "classe", "assunto", "valor_causa", "gratuidade", "prioridade", "segredo_justica", "pedido_liminar"] as const;
  for (const k of simples) {
    const v = e[k].valor;
    dados[k] = v;
    if (v !== null) camposIa.push(k);
  }
  dados.polo_ativo = e.polo_ativo;
  dados.polo_passivo = e.polo_passivo;
  if (e.polo_ativo.length) camposIa.push("polo_ativo");
  if (e.polo_passivo.length) camposIa.push("polo_passivo");
  return { dados, camposIa };
}

peticoesRouter.post("/:id/extrair", async (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status, tipo FROM peticoes WHERE id = ?").get(id) as { status: string; tipo: string } | undefined;
  if (!p) return erro(res, 404, "Petição não encontrada.");
  if (p.tipo !== "inicial") return erro(res, 400, "A extração por IA se aplica à petição inicial.");
  if (!["rascunho", "revisao", "erro"].includes(p.status)) return erro(res, 409, "A petição já foi enviada.");
  const docs = db
    .prepare("SELECT id, arquivo, nome_original FROM documentos WHERE peticao_id = ? ORDER BY ordem")
    .all(id) as Array<{ id: number; arquivo: string; nome_original: string }>;
  db.prepare("UPDATE peticoes SET status = 'extraindo', atualizado_em = datetime('now') WHERE id = ?").run(id);
  try {
    const ext = await extrairDados(docs.map((d) => ({ arquivo: d.arquivo, nomeOriginal: d.nome_original })));
    const { dados, camposIa } = aplicarExtracao(ext);
    tx(() => {
      db.prepare("UPDATE peticoes SET status = 'revisao', dados_json = ?, campos_ia_json = ?, extracao_json = ?, atualizado_em = datetime('now') WHERE id = ?")
        .run(JSON.stringify(dados), JSON.stringify(camposIa), JSON.stringify(ext), id);
      const upd = db.prepare("UPDATE documentos SET tipo = ?, tipo_origem = 'ia' WHERE id = ?");
      for (const c of ext.documentos) if (docs[c.indice]) upd.run(c.tipo, docs[c.indice].id);
    });
    auditar({ usuarioId: req.usuario!.id, acao: "peticao.extracao_ia", entidade: "peticao", entidadeId: id, detalhes: { campos: camposIa.length, alertas: ext.alertas.length }, ip: ipDe(req) });
    res.json(carregar(id));
  } catch (e) {
    db.prepare("UPDATE peticoes SET status = 'rascunho', atualizado_em = datetime('now') WHERE id = ?").run(id);
    erro(res, 502, (e as Error).message);
  }
});

/* ---------- Revisão ---------- */

peticoesRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status, tipo FROM peticoes WHERE id = ?").get(id) as { status: string; tipo: string } | undefined;
  if (!p) return erro(res, 404, "Petição não encontrada.");
  if (!["rascunho", "revisao", "erro"].includes(p.status)) return erro(res, 409, "A petição já foi enviada e não pode ser alterada.");
  const { dados, campos_ia, tribunal_id, certificado_id, numero_processo, movimentacao, documentos } = req.body as {
    dados?: Record<string, unknown>; campos_ia?: string[]; tribunal_id?: number | null; certificado_id?: number | null;
    numero_processo?: string | null; movimentacao?: string | null; documentos?: Array<{ id: number; tipo: string; ordem: number }>;
  };
  let numeroFmt: string | null = null;
  if (numero_processo) {
    const v = validarCnj(numero_processo);
    if (!v.valido) return erro(res, 400, `Número do processo: ${v.motivo}`);
    numeroFmt = v.numero.formatado;
  }
  if (certificado_id && !usuarioPodeUsar(certificado_id, req.usuario!.id)) {
    return erro(res, 403, "Você não tem delegação para este certificado.");
  }
  tx(() => {
    db.prepare(
      `UPDATE peticoes SET
        dados_json = COALESCE(?, dados_json), campos_ia_json = COALESCE(?, campos_ia_json),
        tribunal_id = COALESCE(?, tribunal_id), certificado_id = COALESCE(?, certificado_id),
        numero_processo = COALESCE(?, numero_processo), movimentacao = COALESCE(?, movimentacao),
        status = CASE WHEN status = 'rascunho' THEN 'revisao' ELSE status END,
        atualizado_em = datetime('now') WHERE id = ?`,
    ).run(
      dados ? JSON.stringify(dados) : null, campos_ia ? JSON.stringify(campos_ia) : null,
      tribunal_id ?? null, certificado_id ?? null,
      numeroFmt,
      movimentacao ?? null, id,
    );
    if (documentos) {
      const upd = db.prepare("UPDATE documentos SET tipo = ?, ordem = ?, tipo_origem = CASE WHEN tipo = ? THEN tipo_origem ELSE 'usuario' END WHERE id = ? AND peticao_id = ?");
      for (const d of documentos) {
        if (!(TIPOS_DOCUMENTO as readonly string[]).includes(d.tipo)) continue;
        upd.run(d.tipo, d.ordem, d.tipo, d.id, id);
      }
    }
  });
  auditar({ usuarioId: req.usuario!.id, acao: "peticao.revisada", entidade: "peticao", entidadeId: id, ip: ipDe(req) });
  res.json(carregar(id));
});

/* ---------- Envio para a fila (decisão humana) ---------- */

function pendencias(id: number): string[] {
  const p = carregar(id)!;
  const faltas: string[] = [];
  if (!p.tribunal_id) faltas.push("Selecione o tribunal.");
  const docs = p.documentos as Array<{ tipo: string }>;
  if (docs.length === 0) faltas.push("Anexe ao menos um PDF.");
  if (p.tipo === "inicial") {
    const d = p.dados as Record<string, unknown>;
    for (const [k, rotulo] of [["comarca", "comarca"], ["classe", "classe"], ["assunto", "assunto"]] as const) {
      if (!d[k]) faltas.push(`Preencha ${rotulo}.`);
    }
    if (typeof d.valor_causa !== "number") faltas.push("Informe o valor da causa.");
    if (!Array.isArray(d.polo_ativo) || d.polo_ativo.length === 0) faltas.push("Cadastre o polo ativo.");
    if (!Array.isArray(d.polo_passivo) || d.polo_passivo.length === 0) faltas.push("Cadastre o polo passivo.");
    if (!docs.some((x) => x.tipo === "peticao_inicial")) faltas.push("Indique qual PDF é a petição inicial.");
  } else {
    if (!p.numero_processo) faltas.push("Informe o número do processo.");
    if (!p.movimentacao) faltas.push("Informe o tipo de movimentação.");
  }
  return faltas;
}

peticoesRouter.post("/:id/enviar", exigirPapel("admin", "advogado"), (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status, certificado_id FROM peticoes WHERE id = ?").get(id) as { status: string; certificado_id: number | null } | undefined;
  if (!p) return erro(res, 404, "Petição não encontrada.");
  if (!["revisao", "erro"].includes(p.status)) return erro(res, 409, `Não é possível enviar uma petição com status "${p.status}".`);
  if (req.body?.confirmo !== true) return erro(res, 400, "Confirme que conferiu os dados e os documentos.");
  const faltas = pendencias(id);
  if (faltas.length) return res.status(422).json({ erro: "Há pendências antes do envio.", pendencias: faltas });
  if (p.certificado_id && !usuarioPodeUsar(p.certificado_id, req.usuario!.id)) {
    return erro(res, 403, "Você não tem delegação para o certificado selecionado.");
  }
  db.prepare("UPDATE peticoes SET status = 'na_fila', enviado_por = ?, enviado_em = datetime('now'), erro_motivo = NULL, atualizado_em = datetime('now') WHERE id = ?")
    .run(req.usuario!.id, id);
  auditar({ usuarioId: req.usuario!.id, acao: "peticao.enviada_fila", entidade: "peticao", entidadeId: id, certificadoId: p.certificado_id, ip: ipDe(req) });
  acordarFila();
  res.json(carregar(id));
});

peticoesRouter.post("/:id/cancelar", (req, res) => {
  const id = Number(req.params.id);
  const r = db
    .prepare("UPDATE peticoes SET status = 'cancelado', atualizado_em = datetime('now') WHERE id = ? AND status IN ('rascunho','revisao','na_fila','erro','aguardando_protocolo_manual')")
    .run(id);
  if (r.changes === 0) return erro(res, 409, "Esta petição não pode ser cancelada no status atual.");
  auditar({ usuarioId: req.usuario!.id, acao: "peticao.cancelada", entidade: "peticao", entidadeId: id, ip: ipDe(req) });
  res.json(carregar(id));
});

/* ---------- Registro do protocolo feito no portal ---------- */

const uploadRecibo = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

peticoesRouter.post("/:id/registrar-protocolo", exigirPapel("admin", "advogado", "administrativo"), uploadRecibo.single("recibo"), (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT status, tipo FROM peticoes WHERE id = ?").get(id) as { status: string; tipo: string } | undefined;
  if (!p) return erro(res, 404, "Petição não encontrada.");
  if (!["aguardando_protocolo_manual", "erro"].includes(p.status)) return erro(res, 409, "A petição não está aguardando registro de protocolo.");
  const { numero_processo, protocolo } = req.body as { numero_processo?: string; protocolo?: string };
  if (!protocolo?.trim()) return erro(res, 400, "Informe o número do protocolo/evento gerado pelo tribunal.");
  let numeroFmt: string | null = null;
  if (numero_processo?.trim()) {
    const v = validarCnj(numero_processo);
    if (!v.valido) return erro(res, 400, `Número do processo: ${v.motivo}`);
    numeroFmt = v.numero.formatado;
  } else if (p.tipo === "inicial") {
    return erro(res, 400, "Informe o número do processo distribuído.");
  }
  let recibo: string | null = null;
  if (req.file) {
    recibo = `${crypto.randomUUID()}.pdf`;
    fs.writeFileSync(path.join(UPLOAD_DIR, recibo), req.file.buffer);
  }
  db.prepare(
    `UPDATE peticoes SET status = 'concluido', numero_processo = COALESCE(?, numero_processo), protocolo_numero = ?,
     protocolo_em = datetime('now'), recibo_arquivo = COALESCE(?, recibo_arquivo), erro_motivo = NULL, atualizado_em = datetime('now') WHERE id = ?`,
  ).run(numeroFmt, protocolo.trim(), recibo, id);
  auditar({ usuarioId: req.usuario!.id, acao: "protocolo.registrado_manual", entidade: "peticao", entidadeId: id, detalhes: { numero: numeroFmt, protocolo }, ip: ipDe(req) });
  res.json(carregar(id));
});

/* ---------- Manifestação (individual ou em massa) ---------- */

peticoesRouter.post("/manifestacao", upload.array("arquivos"), (req, res) => {
  const arquivos = (req.files as Express.Multer.File[]) ?? [];
  const { numeros, tribunal_id, movimentacao, certificado_id, tipos } = req.body as Record<string, string>;
  const lista = String(numeros ?? "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lista.length === 0) return erro(res, 400, "Informe ao menos um número de processo.");
  if (lista.length > LIMITE_LOTE) return erro(res, 400, `Máximo de ${LIMITE_LOTE} processos por lote.`);
  const invalidos = lista.map((n) => ({ n, v: validarCnj(n) })).filter((x) => !x.v.valido);
  if (invalidos.length) {
    return res.status(422).json({
      erro: "Há números de processo inválidos.",
      pendencias: invalidos.map((x) => `${x.n}: ${(x.v as { motivo: string }).motivo}`),
    });
  }
  const unicos = [...new Set(lista.map((n) => (validarCnj(n) as { numero: { formatado: string } }).numero.formatado))];
  if (arquivos.length === 0) return erro(res, 400, "Anexe o PDF da petição.");
  if (!movimentacao?.trim()) return erro(res, 400, "Informe o tipo de movimentação.");
  const certId = Number(certificado_id) || null;
  if (certId && !usuarioPodeUsar(certId, req.usuario!.id)) return erro(res, 403, "Você não tem delegação para este certificado.");
  const tiposArr = tipos ? (JSON.parse(tipos) as string[]) : ["peticao_intermediaria"];

  try {
    const { loteId, ids } = tx(() => {
      let loteId: number | null = null;
      if (unicos.length > 1) {
        loteId = Number(
          db.prepare("INSERT INTO lotes (descricao, criado_por) VALUES (?, ?)").run(`${movimentacao} — ${unicos.length} processos`, req.usuario!.id).lastInsertRowid,
        );
      }
      const ids: number[] = [];
      for (const numero of unicos) {
        const r = db
          .prepare("INSERT INTO peticoes (tipo, status, tribunal_id, certificado_id, lote_id, numero_processo, movimentacao, criado_por) VALUES ('intermediaria', 'revisao', ?, ?, ?, ?, ?, ?)")
          .run(Number(tribunal_id) || null, certId, loteId, numero, movimentacao.trim(), req.usuario!.id);
        const pid = Number(r.lastInsertRowid);
        salvarArquivos(pid, arquivos, tiposArr);
        ids.push(pid);
      }
      return { loteId, ids };
    });
    auditar({ usuarioId: req.usuario!.id, acao: "manifestacao.criada", entidade: loteId ? "lote" : "peticao", entidadeId: loteId ?? ids[0], detalhes: { processos: unicos.length, movimentacao }, ip: ipDe(req) });
    res.status(201).json({ lote_id: loteId, ids, duplicados_ignorados: lista.length - unicos.length });
  } catch (e) {
    erro(res, 400, (e as Error).message);
  }
});

peticoesRouter.post("/lotes/:loteId/enviar", exigirPapel("admin", "advogado"), (req, res) => {
  const loteId = Number(req.params.loteId);
  if (req.body?.confirmo !== true) return erro(res, 400, "Confirme que conferiu o lote.");
  const ids = (db.prepare("SELECT id FROM peticoes WHERE lote_id = ? AND status IN ('revisao','erro')").all(loteId) as Array<{ id: number }>).map((r) => r.id);
  if (ids.length === 0) return erro(res, 409, "Nenhuma petição do lote está pronta para envio.");
  const problemas = ids.flatMap((id) => pendencias(id).map((f) => `#${id}: ${f}`));
  if (problemas.length) return res.status(422).json({ erro: "Há pendências no lote.", pendencias: problemas });
  const upd = db.prepare("UPDATE peticoes SET status = 'na_fila', enviado_por = ?, enviado_em = datetime('now'), erro_motivo = NULL, atualizado_em = datetime('now') WHERE id = ?");
  tx(() => ids.forEach((id) => upd.run(req.usuario!.id, id)));
  auditar({ usuarioId: req.usuario!.id, acao: "lote.enviado_fila", entidade: "lote", entidadeId: loteId, detalhes: { peticoes: ids.length }, ip: ipDe(req) });
  acordarFila();
  res.json({ enviados: ids.length });
});
