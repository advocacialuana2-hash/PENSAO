import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = process.env.OFFICE_LA_DATA_DIR ?? path.resolve("data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "office-la.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin','advogado','administrativo')),
  oab TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tribunais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  sistema TEXT NOT NULL CHECK (sistema IN ('eproc','pje','projudi','outro')),
  adaptador TEXT NOT NULL DEFAULT 'manual',
  url_portal TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS certificados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titular TEXT NOT NULL,
  documento TEXT,
  serial TEXT NOT NULL,
  emissor TEXT,
  valido_de TEXT NOT NULL,
  valido_ate TEXT NOT NULL,
  pfx_cifrado TEXT NOT NULL,
  senha_cifrada TEXT NOT NULL,
  dono_id INTEGER NOT NULL REFERENCES usuarios(id),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificado_acessos (
  certificado_id INTEGER NOT NULL REFERENCES certificados(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  concedido_por INTEGER NOT NULL REFERENCES usuarios(id),
  concedido_em TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (certificado_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS lotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao TEXT NOT NULL,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS peticoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('inicial','intermediaria')),
  status TEXT NOT NULL CHECK (status IN (
    'rascunho','extraindo','revisao','na_fila','processando',
    'aguardando_protocolo_manual','concluido','erro','cancelado'
  )),
  tribunal_id INTEGER REFERENCES tribunais(id),
  certificado_id INTEGER REFERENCES certificados(id),
  lote_id INTEGER REFERENCES lotes(id),
  numero_processo TEXT,
  movimentacao TEXT,
  dados_json TEXT NOT NULL DEFAULT '{}',
  campos_ia_json TEXT NOT NULL DEFAULT '[]',
  extracao_json TEXT,
  protocolo_numero TEXT,
  protocolo_em TEXT,
  recibo_arquivo TEXT,
  erro_motivo TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  enviado_por INTEGER REFERENCES usuarios(id),
  enviado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_peticoes_status ON peticoes(status);

CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  peticao_id INTEGER NOT NULL REFERENCES peticoes(id) ON DELETE CASCADE,
  nome_original TEXT NOT NULL,
  arquivo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outro',
  tipo_origem TEXT NOT NULL DEFAULT 'usuario' CHECK (tipo_origem IN ('usuario','ia')),
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  em TEXT NOT NULL DEFAULT (datetime('now')),
  usuario_id INTEGER REFERENCES usuarios(id),
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id INTEGER,
  certificado_id INTEGER,
  detalhes_json TEXT,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_auditoria_em ON auditoria(em);
`);

const tribunaisSeed: Array<[string, string, string, string]> = [
  ["TJGO", "Tribunal de Justiça de Goiás", "projudi", "https://projudi.tjgo.jus.br"],
  ["TRT18", "Tribunal Regional do Trabalho da 18ª Região", "pje", "https://pje.trt18.jus.br"],
  ["TRF1", "Tribunal Regional Federal da 1ª Região", "pje", "https://pje1g.trf1.jus.br"],
  ["TRF4", "Tribunal Regional Federal da 4ª Região", "eproc", "https://eproc.trf4.jus.br"],
];
const countTribunais = db.prepare("SELECT COUNT(*) AS n FROM tribunais").get() as { n: number };
if (countTribunais.n === 0) {
  const ins = db.prepare(
    "INSERT INTO tribunais (sigla, nome, sistema, url_portal) VALUES (?, ?, ?, ?)",
  );
  for (const t of tribunaisSeed) ins.run(...t);
}

export type Row = Record<string, unknown>;

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
