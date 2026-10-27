from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path

STATUS = {
    "pendente": "Aguardando aprovação",
    "aprovado": "Na fila para protocolo",
    "ensaio": "Na fila para ensaio",
    "executando": "Executando",
    "aguardando_voce": "Aguardando você",
    "protocolado": "Protocolado",
    "ensaio_ok": "Ensaio concluído",
    "conferir": "Conferir no tribunal",
    "erro": "Erro",
    "falta_roteiro": "Falta gravar o roteiro",
    "rejeitado": "Rejeitado",
}

ESQUEMA = """
CREATE TABLE IF NOT EXISTS envios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    origem TEXT NOT NULL,
    nome_original TEXT NOT NULL,
    arquivo TEXT NOT NULL,
    hash TEXT NOT NULL,
    paginas INTEGER,
    tamanho INTEGER,
    cnj TEXT,
    tribunal TEXT,
    roteiro TEXT,
    tipo TEXT,
    observacao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    mensagem TEXT,
    protocolo TEXT,
    comprovante TEXT,
    alertas TEXT NOT NULL DEFAULT '[]',
    aprovado_em TEXT,
    id_externo TEXT,
    destino TEXT NOT NULL DEFAULT 'judicial',
    identificador TEXT,
    aprovado_por TEXT
);
CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    envio_id INTEGER NOT NULL REFERENCES envios(id),
    momento TEXT NOT NULL,
    descricao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tribunal_roteiro (
    tribunal TEXT PRIMARY KEY,
    roteiro TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    id_externo TEXT,
    roteiro TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'na_fila',
    mensagem TEXT,
    resultado TEXT
);
CREATE TABLE IF NOT EXISTS vistos (
    caminho TEXT PRIMARY KEY,
    assinatura TEXT NOT NULL
);
"""

CAMPOS_EDITAVEIS = {"cnj", "tribunal", "roteiro", "tipo", "observacao", "status", "mensagem",
                    "protocolo", "comprovante", "alertas", "aprovado_em", "id_externo", "destino",
                    "identificador", "aprovado_por"}
# Colunas acrescentadas depois da primeira versão: bancos já criados recebem as colunas na abertura.
COLUNAS_NOVAS = {"id_externo": "TEXT", "destino": "TEXT NOT NULL DEFAULT 'judicial'",
                 "identificador": "TEXT", "aprovado_por": "TEXT"}


def agora() -> str:
    return datetime.now().isoformat(timespec="seconds")


class Banco:
    def __init__(self, caminho: Path):
        self._con = sqlite3.connect(caminho, check_same_thread=False)
        self._con.row_factory = sqlite3.Row
        self._trava = threading.Lock()
        with self._trava:
            self._con.executescript(ESQUEMA)
            existentes = {r[1] for r in self._con.execute("PRAGMA table_info(envios)")}
            for coluna, tipo in COLUNAS_NOVAS.items():
                if coluna not in existentes:
                    self._con.execute(f"ALTER TABLE envios ADD COLUMN {coluna} {tipo}")
            self._con.commit()

    def _exec(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._trava:
            cur = self._con.execute(sql, params)
            self._con.commit()
            return cur

    @staticmethod
    def _linha(row: sqlite3.Row | None) -> dict | None:
        if row is None:
            return None
        d = dict(row)
        d["alertas"] = json.loads(d["alertas"] or "[]")
        return d

    def inserir_envio(self, **dados) -> int:
        dados.setdefault("alertas", [])
        dados["alertas"] = json.dumps(dados["alertas"], ensure_ascii=False)
        dados["criado_em"] = dados["atualizado_em"] = agora()
        colunas = ", ".join(dados)
        marcas = ", ".join("?" for _ in dados)
        cur = self._exec(f"INSERT INTO envios ({colunas}) VALUES ({marcas})", tuple(dados.values()))
        envio_id = cur.lastrowid
        self.registrar(envio_id, f"Peça recebida ({dados['origem']}): {dados['nome_original']}")
        return envio_id

    def atualizar(self, envio_id: int, **dados) -> None:
        invalidos = set(dados) - CAMPOS_EDITAVEIS
        if invalidos:
            raise ValueError(f"Campos não editáveis: {invalidos}")
        if "alertas" in dados:
            dados["alertas"] = json.dumps(dados["alertas"], ensure_ascii=False)
        dados["atualizado_em"] = agora()
        sets = ", ".join(f"{c} = ?" for c in dados)
        self._exec(f"UPDATE envios SET {sets} WHERE id = ?", (*dados.values(), envio_id))

    def mudar_status(self, envio_id: int, status: str, mensagem: str | None = None, **extra) -> None:
        if status not in STATUS:
            raise ValueError(f"Status desconhecido: {status}")
        self.atualizar(envio_id, status=status, mensagem=mensagem, **extra)
        self.registrar(envio_id, f"{STATUS[status]}" + (f": {mensagem}" if mensagem else ""))

    def envio(self, envio_id: int) -> dict | None:
        return self._linha(self._exec("SELECT * FROM envios WHERE id = ?", (envio_id,)).fetchone())

    def listar(self, status: str | None = None) -> list[dict]:
        if status:
            rows = self._exec("SELECT * FROM envios WHERE status = ? ORDER BY id DESC", (status,))
        else:
            rows = self._exec("SELECT * FROM envios ORDER BY id DESC")
        return [self._linha(r) for r in rows.fetchall()]

    def contagem_por_status(self) -> dict[str, int]:
        rows = self._exec("SELECT status, COUNT(*) AS n FROM envios GROUP BY status").fetchall()
        return {r["status"]: r["n"] for r in rows}

    def por_id_externo(self, id_externo: str) -> dict | None:
        row = self._exec("SELECT * FROM envios WHERE id_externo = ? ORDER BY id DESC LIMIT 1",
                         (id_externo,)).fetchone()
        return self._linha(row)

    def com_hash(self, hash_: str, exceto: int | None = None) -> list[dict]:
        rows = self._exec("SELECT * FROM envios WHERE hash = ? AND id != ?", (hash_, exceto or -1))
        return [self._linha(r) for r in rows.fetchall()]

    def registrar(self, envio_id: int, descricao: str) -> None:
        self._exec("INSERT INTO eventos (envio_id, momento, descricao) VALUES (?, ?, ?)",
                   (envio_id, agora(), descricao))

    def eventos(self, envio_id: int) -> list[dict]:
        rows = self._exec("SELECT * FROM eventos WHERE envio_id = ? ORDER BY id", (envio_id,))
        return [dict(r) for r in rows.fetchall()]

    def roteiro_do_tribunal(self, tribunal: str | None) -> str | None:
        if not tribunal:
            return None
        row = self._exec("SELECT roteiro FROM tribunal_roteiro WHERE tribunal = ?", (tribunal,)).fetchone()
        return row["roteiro"] if row else None

    def lembrar_roteiro(self, tribunal: str, roteiro: str) -> None:
        self._exec("INSERT INTO tribunal_roteiro (tribunal, roteiro) VALUES (?, ?) "
                   "ON CONFLICT(tribunal) DO UPDATE SET roteiro = excluded.roteiro", (tribunal, roteiro))

    def mapa_roteiros(self) -> dict[str, str]:
        rows = self._exec("SELECT tribunal, roteiro FROM tribunal_roteiro ORDER BY tribunal").fetchall()
        return {r["tribunal"]: r["roteiro"] for r in rows}

    def ja_visto(self, caminho: str, assinatura: str) -> bool:
        row = self._exec("SELECT assinatura FROM vistos WHERE caminho = ?", (caminho,)).fetchone()
        return row is not None and row["assinatura"] == assinatura

    def marcar_visto(self, caminho: str, assinatura: str) -> None:
        self._exec("INSERT INTO vistos (caminho, assinatura) VALUES (?, ?) "
                   "ON CONFLICT(caminho) DO UPDATE SET assinatura = excluded.assinatura",
                   (caminho, assinatura))

    # ----------------------------------------------------------- consultas
    def inserir_consulta(self, roteiro: str, id_externo: str | None) -> int:
        momento = agora()
        cur = self._exec("INSERT INTO consultas (criado_em, atualizado_em, id_externo, roteiro) "
                         "VALUES (?, ?, ?, ?)", (momento, momento, id_externo, roteiro))
        return cur.lastrowid

    def atualizar_consulta(self, consulta_id: int, status: str, mensagem: str | None = None,
                           resultado: dict | None = None) -> None:
        self._exec("UPDATE consultas SET status = ?, mensagem = ?, resultado = COALESCE(?, resultado), "
                   "atualizado_em = ? WHERE id = ?",
                   (status, mensagem, json.dumps(resultado, ensure_ascii=False) if resultado is not None
                    else None, agora(), consulta_id))

    def consulta(self, consulta_id: int) -> dict | None:
        row = self._exec("SELECT * FROM consultas WHERE id = ?", (consulta_id,)).fetchone()
        if row is None:
            return None
        d = dict(row)
        d["resultado"] = json.loads(d["resultado"]) if d["resultado"] else None
        return d

    def consulta_por_id_externo(self, id_externo: str) -> dict | None:
        row = self._exec("SELECT id FROM consultas WHERE id_externo = ? ORDER BY id DESC LIMIT 1",
                         (id_externo,)).fetchone()
        return self.consulta(row["id"]) if row else None
