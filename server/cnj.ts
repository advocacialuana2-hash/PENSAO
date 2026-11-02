/**
 * Numeração única de processos — Resolução CNJ nº 65/2008.
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO
 * Dígito verificador: módulo 97 base 10 (ISO 7064), calculado sobre
 * NNNNNNN AAAA J TR OOOO seguido de "00"; DD = 98 - (resto).
 */

const CNJ_REGEX = /^(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})$/;

export interface NumeroCnj {
  sequencial: string;
  dv: string;
  ano: string;
  segmento: string;
  tribunal: string;
  origem: string;
  formatado: string;
}

function mod97(digits: string): number {
  let resto = 0;
  for (const ch of digits) resto = (resto * 10 + Number(ch)) % 97;
  return resto;
}

export function calcularDv(sequencial: string, ano: string, segmento: string, tribunal: string, origem: string): string {
  const resto = mod97(`${sequencial}${ano}${segmento}${tribunal}${origem}00`);
  return String(98 - resto).padStart(2, "0");
}

export function parseCnj(entrada: string): NumeroCnj | null {
  const limpo = entrada.trim().replace(/\s+/g, "");
  const so = limpo.replace(/\D/g, "");
  const m = CNJ_REGEX.exec(limpo) ?? (so.length === 20 ? CNJ_REGEX.exec(so) : null);
  if (!m) return null;
  const [, sequencial, dv, ano, segmento, tribunal, origem] = m;
  return {
    sequencial, dv, ano, segmento, tribunal, origem,
    formatado: `${sequencial}-${dv}.${ano}.${segmento}.${tribunal}.${origem}`,
  };
}

export function validarCnj(entrada: string): { valido: true; numero: NumeroCnj } | { valido: false; motivo: string } {
  const n = parseCnj(entrada);
  if (!n) return { valido: false, motivo: "Formato inválido (esperado NNNNNNN-DD.AAAA.J.TR.OOOO)" };
  const esperado = calcularDv(n.sequencial, n.ano, n.segmento, n.tribunal, n.origem);
  if (esperado !== n.dv) return { valido: false, motivo: `Dígito verificador não confere (esperado ${esperado})` };
  return { valido: true, numero: n };
}
