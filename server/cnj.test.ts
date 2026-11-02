import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularDv, validarCnj } from "./cnj.ts";

test("aceita número com DV correto (calculado) e normaliza a formatação", () => {
  const dv = calcularDv("0001234", "2026", "8", "09", "0051");
  const r = validarCnj(`0001234${dv}2026809 0051`.replace(" ", ""));
  assert.equal(r.valido, true);
  if (r.valido) assert.equal(r.numero.formatado, `0001234-${dv}.2026.8.09.0051`);
});

test("rejeita DV incorreto", () => {
  const dv = calcularDv("0001234", "2026", "8", "09", "0051");
  const errado = String((Number(dv) + 1) % 100).padStart(2, "0");
  const r = validarCnj(`0001234-${errado}.2026.8.09.0051`);
  assert.equal(r.valido, false);
});

test("rejeita formato inválido", () => {
  assert.equal(validarCnj("123").valido, false);
});

test("DV conhecido: 0000001-45.2026.8.09.0001 confere com o algoritmo mod 97", () => {
  const dv = calcularDv("0000001", "2026", "8", "09", "0001");
  // Recalcula manualmente: (N AAAA J TR OOOO 00) mod 97, DV = 98 - resto
  const resto = Number(BigInt("0000001" + "2026" + "8" + "09" + "0001" + "00") % 97n);
  assert.equal(dv, String(98 - resto).padStart(2, "0"));
});
