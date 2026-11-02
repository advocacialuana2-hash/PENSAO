import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.ts";
import { hashSenha } from "./crypto.ts";

export type Papel = "admin" | "advogado" | "administrativo";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  oab: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

const COOKIE = "officela_sessao";
const DURACAO_MS = 12 * 60 * 60 * 1000;

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres");
  return s;
}

function assinar(payload: string): string {
  return crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
}

export function criarSessao(res: Response, usuarioId: number): void {
  const payload = Buffer.from(JSON.stringify({ uid: usuarioId, exp: Date.now() + DURACAO_MS })).toString("base64url");
  const token = `${payload}.${assinar(payload)}`;
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACAO_MS,
    path: "/",
  });
}

export function encerrarSessao(res: Response): void {
  res.clearCookie(COOKIE, { path: "/" });
}

function lerCookie(req: Request, nome: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

const buscarUsuario = db.prepare(
  "SELECT id, nome, email, papel, oab FROM usuarios WHERE id = ? AND ativo = 1",
);

export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const token = lerCookie(req, COOKIE);
  if (token) {
    const [payload, assinatura] = token.split(".");
    const esperado = payload ? assinar(payload) : "";
    if (
      assinatura &&
      assinatura.length === esperado.length &&
      crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))
    ) {
      const dados = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: number; exp: number };
      if (dados.exp > Date.now()) {
        const u = buscarUsuario.get(dados.uid) as Usuario | undefined;
        if (u) req.usuario = u;
      }
    }
  }
  next();
}

export function exigirLogin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
    return;
  }
  next();
}

export function exigirPapel(...papeis: Papel[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      res.status(403).json({ erro: "Seu perfil não tem permissão para esta ação." });
      return;
    }
    next();
  };
}

/** Cria o primeiro administrador a partir das variáveis de ambiente, se não houver usuários. */
export function semearAdministrador(): void {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM usuarios").get() as { n: number };
  if (n > 0) return;
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) {
    console.warn("[office-la] Nenhum usuário cadastrado. Defina ADMIN_EMAIL e ADMIN_PASSWORD e reinicie.");
    return;
  }
  if (senha.length < 10) throw new Error("ADMIN_PASSWORD deve ter ao menos 10 caracteres");
  db.prepare("INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, 'admin')").run(
    process.env.ADMIN_NAME ?? "Administrador",
    email.toLowerCase(),
    hashSenha(senha),
  );
  console.log(`[office-la] Administrador ${email} criado.`);
}

export function ipDe(req: Request): string | null {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? null;
}
