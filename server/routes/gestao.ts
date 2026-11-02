import { Router } from "express";
import multer from "multer";
import { db } from "../db.ts";
import { auditar } from "../audit.ts";
import { exigirPapel, ipDe } from "../auth.ts";
import { hashSenha } from "../crypto.ts";
import { importarCertificado } from "../vault.ts";
import { adaptadores } from "../adapters/index.ts";

export const gestaoRouter = Router();

/* ---------- Dashboard ---------- */

const PERIODOS: Record<string, string> = {
  hoje: "date(p.atualizado_em) = date('now')",
  "7d": "p.atualizado_em >= datetime('now', '-7 days')",
  mes: "strftime('%Y-%m', p.atualizado_em) = strftime('%Y-%m', 'now')",
  todo: "1 = 1",
};

gestaoRouter.get("/dashboard", (req, res) => {
  const periodo = PERIODOS[String(req.query.periodo ?? "mes")] ?? PERIODOS.mes;
  const usuario = Number(req.query.usuario) || null;
  const filtroUsuario = usuario ? "AND p.enviado_por = ?" : "";
  const args = usuario ? [usuario] : [];
  const porStatus = db
    .prepare(`SELECT p.status, COUNT(*) AS n FROM peticoes p WHERE ${periodo} ${filtroUsuario} GROUP BY p.status`)
    .all(...args);
  const porTribunal = db
    .prepare(`SELECT t.sigla, COUNT(*) AS n FROM peticoes p JOIN tribunais t ON t.id = p.tribunal_id WHERE p.status = 'concluido' AND ${periodo} ${filtroUsuario} GROUP BY t.sigla ORDER BY n DESC`)
    .all(...args);
  const porUsuario = db
    .prepare(`SELECT u.nome, COUNT(*) AS n FROM peticoes p JOIN usuarios u ON u.id = p.enviado_por WHERE p.status = 'concluido' AND ${periodo} GROUP BY u.nome ORDER BY n DESC`)
    .all();
  const ultimos = db
    .prepare(
      `SELECT p.id, p.tipo, p.status, p.numero_processo, p.protocolo_em, t.sigla AS tribunal_sigla,
              json_extract(p.dados_json, '$.polo_ativo[0].nome') AS autor
       FROM peticoes p LEFT JOIN tribunais t ON t.id = p.tribunal_id
       WHERE p.status = 'concluido' ${filtroUsuario} ORDER BY p.protocolo_em DESC LIMIT 10`,
    )
    .all(...args);
  const certificadosVencendo = db
    .prepare("SELECT id, titular, valido_ate FROM certificados WHERE ativo = 1 AND valido_ate <= datetime('now', '+30 days') ORDER BY valido_ate")
    .all();
  res.json({ porStatus, porTribunal, porUsuario, ultimos, certificadosVencendo });
});

/* ---------- Tribunais ---------- */

gestaoRouter.get("/tribunais", (_req, res) => {
  res.json({
    tribunais: db.prepare("SELECT * FROM tribunais ORDER BY sigla").all(),
    adaptadores: adaptadores().map((a) => ({ chave: a.chave, descricao: a.descricao, sistemas: a.sistemas })),
  });
});

gestaoRouter.post("/tribunais", exigirPapel("admin"), (req, res) => {
  const { id, sigla, nome, sistema, adaptador, url_portal, ativo } = req.body as Record<string, string | number | null>;
  if (!sigla || !nome || !sistema) return res.status(400).json({ erro: "Informe sigla, nome e sistema." });
  if (adaptador && !adaptadores().some((a) => a.chave === adaptador)) return res.status(400).json({ erro: "Adaptador indisponível." });
  if (id) {
    db.prepare("UPDATE tribunais SET sigla = ?, nome = ?, sistema = ?, adaptador = ?, url_portal = ?, ativo = ? WHERE id = ?")
      .run(String(sigla).toUpperCase(), nome, sistema, adaptador ?? "manual", url_portal ?? null, ativo === 0 ? 0 : 1, Number(id));
  } else {
    db.prepare("INSERT INTO tribunais (sigla, nome, sistema, adaptador, url_portal) VALUES (?, ?, ?, ?, ?)")
      .run(String(sigla).toUpperCase(), nome, sistema, adaptador ?? "manual", url_portal ?? null);
  }
  auditar({ usuarioId: req.usuario!.id, acao: "tribunal.salvo", entidade: "tribunal", detalhes: { sigla, adaptador }, ip: ipDe(req) });
  res.json(db.prepare("SELECT * FROM tribunais ORDER BY sigla").all());
});

/* ---------- Certificados (cofre) ---------- */

const uploadPfx = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024, files: 1 } });

gestaoRouter.get("/certificados", (req, res) => {
  const lista = db
    .prepare(
      `SELECT c.id, c.titular, c.documento, c.serial, c.emissor, c.valido_de, c.valido_ate, c.ativo, c.criado_em,
              u.nome AS dono_nome, c.dono_id,
              EXISTS(SELECT 1 FROM certificado_acessos a WHERE a.certificado_id = c.id AND a.usuario_id = ?) AS posso_usar
       FROM certificados c JOIN usuarios u ON u.id = c.dono_id ORDER BY c.ativo DESC, c.titular`,
    )
    .all(req.usuario!.id) as Array<Record<string, unknown>>;
  const acessos = db
    .prepare("SELECT a.certificado_id, a.usuario_id, u.nome, a.concedido_em FROM certificado_acessos a JOIN usuarios u ON u.id = a.usuario_id")
    .all() as Array<{ certificado_id: number }>;
  res.json(lista.map((c) => ({ ...c, acessos: acessos.filter((a) => a.certificado_id === c.id) })));
});

gestaoRouter.post("/certificados", exigirPapel("admin", "advogado"), uploadPfx.single("pfx"), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie o arquivo .pfx/.p12." });
  const senha = String(req.body.senha ?? "");
  try {
    const id = importarCertificado(req.file.buffer, senha, req.usuario!, ipDe(req));
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ erro: (e as Error).message });
  }
});

function podeGerir(certId: number, usuarioId: number, papel: string): boolean {
  if (papel === "admin") return true;
  const c = db.prepare("SELECT dono_id FROM certificados WHERE id = ?").get(certId) as { dono_id: number } | undefined;
  return c?.dono_id === usuarioId;
}

gestaoRouter.post("/certificados/:id/acessos", (req, res) => {
  const certId = Number(req.params.id);
  if (!podeGerir(certId, req.usuario!.id, req.usuario!.papel)) return res.status(403).json({ erro: "Só o titular ou um administrador delega o certificado." });
  const usuarioId = Number(req.body.usuario_id);
  db.prepare("INSERT OR IGNORE INTO certificado_acessos (certificado_id, usuario_id, concedido_por) VALUES (?, ?, ?)").run(certId, usuarioId, req.usuario!.id);
  auditar({ usuarioId: req.usuario!.id, acao: "certificado.delegado", entidade: "certificado", entidadeId: certId, certificadoId: certId, detalhes: { para: usuarioId }, ip: ipDe(req) });
  res.json({ ok: true });
});

gestaoRouter.delete("/certificados/:id/acessos/:usuarioId", (req, res) => {
  const certId = Number(req.params.id);
  if (!podeGerir(certId, req.usuario!.id, req.usuario!.papel)) return res.status(403).json({ erro: "Só o titular ou um administrador revoga o acesso." });
  const usuarioId = Number(req.params.usuarioId);
  db.prepare("DELETE FROM certificado_acessos WHERE certificado_id = ? AND usuario_id = ?").run(certId, usuarioId);
  auditar({ usuarioId: req.usuario!.id, acao: "certificado.acesso_revogado", entidade: "certificado", entidadeId: certId, certificadoId: certId, detalhes: { de: usuarioId }, ip: ipDe(req) });
  res.json({ ok: true });
});

gestaoRouter.post("/certificados/:id/desativar", (req, res) => {
  const certId = Number(req.params.id);
  if (!podeGerir(certId, req.usuario!.id, req.usuario!.papel)) return res.status(403).json({ erro: "Sem permissão." });
  // Apaga o material cifrado: desativar é definitivo.
  db.prepare("UPDATE certificados SET ativo = 0, pfx_cifrado = '', senha_cifrada = '' WHERE id = ?").run(certId);
  auditar({ usuarioId: req.usuario!.id, acao: "certificado.desativado", entidade: "certificado", entidadeId: certId, certificadoId: certId, ip: ipDe(req) });
  res.json({ ok: true });
});

/* ---------- Usuários ---------- */

gestaoRouter.get("/usuarios", (_req, res) => {
  res.json(db.prepare("SELECT id, nome, email, papel, oab, ativo, criado_em FROM usuarios ORDER BY nome").all());
});

gestaoRouter.post("/usuarios", exigirPapel("admin"), (req, res) => {
  const { id, nome, email, papel, oab, senha, ativo } = req.body as Record<string, string | number | undefined>;
  if (!nome || !email || !papel) return res.status(400).json({ erro: "Informe nome, e-mail e perfil." });
  if (!["admin", "advogado", "administrativo"].includes(String(papel))) return res.status(400).json({ erro: "Perfil inválido." });
  if (senha && String(senha).length < 10) return res.status(400).json({ erro: "A senha deve ter ao menos 10 caracteres." });
  try {
    if (id) {
      if (Number(id) === req.usuario!.id && (ativo === 0 || papel !== "admin")) {
        return res.status(400).json({ erro: "Você não pode remover o próprio acesso de administrador." });
      }
      db.prepare("UPDATE usuarios SET nome = ?, email = ?, papel = ?, oab = ?, ativo = ? WHERE id = ?")
        .run(nome, String(email).toLowerCase(), papel, oab ?? null, ativo === 0 ? 0 : 1, Number(id));
      if (senha) db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(hashSenha(String(senha)), Number(id));
      if (ativo === 0) db.prepare("DELETE FROM certificado_acessos WHERE usuario_id = ?").run(Number(id));
    } else {
      if (!senha) return res.status(400).json({ erro: "Defina a senha inicial." });
      db.prepare("INSERT INTO usuarios (nome, email, senha_hash, papel, oab) VALUES (?, ?, ?, ?, ?)")
        .run(nome, String(email).toLowerCase(), hashSenha(String(senha)), papel, oab ?? null);
    }
  } catch (e) {
    if (String((e as Error).message).includes("UNIQUE")) return res.status(400).json({ erro: "E-mail já cadastrado." });
    throw e;
  }
  auditar({ usuarioId: req.usuario!.id, acao: id ? "usuario.alterado" : "usuario.criado", entidade: "usuario", entidadeId: id ? Number(id) : null, detalhes: { email, papel, ativo }, ip: ipDe(req) });
  res.json(db.prepare("SELECT id, nome, email, papel, oab, ativo, criado_em FROM usuarios ORDER BY nome").all());
});

/* ---------- Auditoria ---------- */

gestaoRouter.get("/auditoria", exigirPapel("admin", "advogado"), (req, res) => {
  const { acao, usuario, de, ate } = req.query as Record<string, string | undefined>;
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (acao) { where.push("a.acao LIKE ?"); args.push(`${acao}%`); }
  if (usuario) { where.push("a.usuario_id = ?"); args.push(Number(usuario)); }
  if (de) { where.push("a.em >= ?"); args.push(de); }
  if (ate) { where.push("a.em < date(?, '+1 day')"); args.push(ate); }
  const rows = db
    .prepare(
      `SELECT a.*, u.nome AS usuario_nome, c.titular AS certificado_titular
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id LEFT JOIN certificados c ON c.id = a.certificado_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.id DESC LIMIT 1000`,
    )
    .all(...args);
  res.json(rows);
});
