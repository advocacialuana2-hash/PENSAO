import crypto from "node:crypto";

/** Cifragem AES-256-GCM com a chave mestra do cofre (OFFICE_LA_MASTER_KEY). */

function chaveMestra(): Buffer {
  const b64 = process.env.OFFICE_LA_MASTER_KEY;
  if (!b64) throw new Error("OFFICE_LA_MASTER_KEY não configurada");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("OFFICE_LA_MASTER_KEY deve ter 32 bytes em base64");
  return key;
}

export function cifrar(dados: Buffer | string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveMestra(), iv);
  const enc = Buffer.concat([cipher.update(dados), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decifrar(pacote: string): Buffer {
  const [versao, ivB64, tagB64, encB64] = pacote.split(":");
  if (versao !== "v1") throw new Error("Formato de cifra desconhecido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", chaveMestra(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]);
}

/** Hash de senha com scrypt (N=16384, r=8, p=1). */
export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha, salt, 64);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function conferirSenha(senha: string, armazenado: string): boolean {
  const [alg, saltB64, hashB64] = armazenado.split(":");
  if (alg !== "scrypt") return false;
  const esperado = Buffer.from(hashB64, "base64");
  const obtido = crypto.scryptSync(senha, Buffer.from(saltB64, "base64"), esperado.length);
  return crypto.timingSafeEqual(esperado, obtido);
}

export function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
