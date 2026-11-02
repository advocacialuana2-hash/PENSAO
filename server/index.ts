import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { db } from "./db.ts";
import { auditar } from "./audit.ts";
import { autenticar, criarSessao, encerrarSessao, exigirLogin, ipDe, semearAdministrador } from "./auth.ts";
import { conferirSenha } from "./crypto.ts";
import { peticoesRouter } from "./routes/peticoes.ts";
import { gestaoRouter } from "./routes/gestao.ts";
import { iniciarFila } from "./queue.ts";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(autenticar);

/* ---------- Login (com limite de tentativas por IP) ---------- */

const tentativas = new Map<string, { n: number; ate: number }>();

app.post("/api/login", (req, res) => {
  const ip = ipDe(req) ?? "?";
  const t = tentativas.get(ip);
  if (t && t.n >= 5 && t.ate > Date.now()) {
    return res.status(429).json({ erro: "Muitas tentativas. Aguarde 15 minutos." });
  }
  const { email, senha } = req.body as { email?: string; senha?: string };
  const u = db
    .prepare("SELECT id, senha_hash FROM usuarios WHERE email = ? AND ativo = 1")
    .get(String(email ?? "").toLowerCase()) as { id: number; senha_hash: string } | undefined;
  if (!u || !conferirSenha(String(senha ?? ""), u.senha_hash)) {
    tentativas.set(ip, { n: (t && t.ate > Date.now() ? t.n : 0) + 1, ate: Date.now() + 15 * 60_000 });
    auditar({ acao: "login.falhou", detalhes: { email }, ip });
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }
  tentativas.delete(ip);
  criarSessao(res, u.id);
  auditar({ usuarioId: u.id, acao: "login", ip });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  if (req.usuario) auditar({ usuarioId: req.usuario.id, acao: "logout", ip: ipDe(req) });
  encerrarSessao(res);
  res.json({ ok: true });
});

app.get("/api/eu", exigirLogin, (req, res) => {
  res.json({ ...req.usuario, simulacao: process.env.SIMULACAO === "1", ia: !!process.env.ANTHROPIC_API_KEY });
});

app.use("/api/peticoes", exigirLogin, peticoesRouter);
app.use("/api", exigirLogin, gestaoRouter);

app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(400).json({ erro: err.message || "Erro inesperado." });
});

/* ---------- Front-end compilado (produção) ---------- */

const dist = path.resolve("dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

for (const v of ["OFFICE_LA_MASTER_KEY", "SESSION_SECRET"]) {
  if (!process.env[v]) {
    console.error(`[office-la] Variável ${v} não configurada. Veja .env.example.`);
    process.exit(1);
  }
}
semearAdministrador();
iniciarFila();

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`[office-la] API em http://localhost:${port}`));
