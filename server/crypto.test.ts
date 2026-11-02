import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
process.env.OFFICE_LA_MASTER_KEY = crypto.randomBytes(32).toString("base64");
const { cifrar, decifrar, hashSenha, conferirSenha } = await import("./crypto.ts");

test("cifra e decifra preservando o conteúdo", () => {
  const dado = crypto.randomBytes(2048);
  assert.deepEqual(decifrar(cifrar(dado)), dado);
});

test("detecta adulteração do conteúdo cifrado", () => {
  const pacote = cifrar("segredo").split(":");
  const enc = Buffer.from(pacote[3], "base64");
  enc[0] ^= 1;
  pacote[3] = enc.toString("base64");
  assert.throws(() => decifrar(pacote.join(":")));
});

test("hash de senha confere só com a senha correta", () => {
  const h = hashSenha("senha-muito-forte");
  assert.equal(conferirSenha("senha-muito-forte", h), true);
  assert.equal(conferirSenha("outra", h), false);
});
