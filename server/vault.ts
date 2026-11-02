import forge from "node-forge";
import { db } from "./db.ts";
import { cifrar, decifrar } from "./crypto.ts";
import { auditar } from "./audit.ts";
import type { Usuario } from "./auth.ts";

export interface InfoCertificado {
  titular: string;
  documento: string | null;
  serial: string;
  emissor: string | null;
  validoDe: string;
  validoAte: string;
}

/** OID ICP-Brasil para dados de pessoa física (contém o CPF nas posições 9-19). */
const OID_PF = "2.16.76.1.3.1";

function extrairCpfIcp(cert: forge.pki.Certificate): string | null {
  const ext = cert.getExtension("subjectAltName") as { altNames?: Array<{ type: number; value: unknown }> } | null;
  for (const alt of ext?.altNames ?? []) {
    // otherName (type 0): forge expõe o valor bruto em ASN.1
    if (alt.type === 0 && typeof alt.value === "object" && alt.value) {
      try {
        const asn1 = alt.value as forge.asn1.Asn1;
        const [oidNode, valorNode] = asn1.value as forge.asn1.Asn1[];
        if (forge.asn1.derToOid(oidNode.value as string) === OID_PF) {
          const inner = (valorNode.value as forge.asn1.Asn1[])[0];
          const texto = String(inner.value);
          const cpf = texto.substring(8, 19);
          if (/^\d{11}$/.test(cpf)) return cpf;
        }
      } catch {
        /* estrutura fora do padrão: segue para o CN */
      }
    }
  }
  return null;
}

/** Lê e valida um arquivo PFX/P12 (certificado A1) com a senha informada. */
export function lerPfx(pfx: Buffer, senha: string): InfoCertificado {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
  } catch {
    throw new Error("Não foi possível abrir o certificado. Confira o arquivo .pfx e a senha.");
  }
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  if (keyBags.length === 0) throw new Error("O arquivo não contém chave privada (é necessário certificado A1 completo).");
  // O certificado do titular é o que não é emissor de nenhum outro do pacote
  const certs = certBags.map((b) => b.cert).filter((c): c is forge.pki.Certificate => !!c);
  if (certs.length === 0) throw new Error("O arquivo não contém certificado.");
  const titularCert =
    certs.find((c) => !certs.some((o) => o !== c && o.issuer.hash === c.subject.hash)) ?? certs[0];

  const cn = String(titularCert.subject.getField("CN")?.value ?? "");
  const [nomeCn, docCn] = cn.split(":");
  const documento = extrairCpfIcp(titularCert) ?? (docCn && /^\d{11,14}$/.test(docCn) ? docCn : null);

  return {
    titular: (nomeCn || cn).trim(),
    documento,
    serial: titularCert.serialNumber,
    emissor: (titularCert.issuer.getField("CN")?.value as string | undefined) ?? null,
    validoDe: titularCert.validity.notBefore.toISOString(),
    validoAte: titularCert.validity.notAfter.toISOString(),
  };
}

export function importarCertificado(pfx: Buffer, senha: string, dono: Usuario, ip: string | null): number {
  const info = lerPfx(pfx, senha);
  if (new Date(info.validoAte) < new Date()) throw new Error(`Certificado vencido em ${info.validoAte.slice(0, 10)}.`);
  const r = db
    .prepare(
      `INSERT INTO certificados (titular, documento, serial, emissor, valido_de, valido_ate, pfx_cifrado, senha_cifrada, dono_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      info.titular, info.documento, info.serial, info.emissor, info.validoDe, info.validoAte,
      cifrar(pfx), cifrar(senha), dono.id,
    );
  const id = Number(r.lastInsertRowid);
  db.prepare("INSERT INTO certificado_acessos (certificado_id, usuario_id, concedido_por) VALUES (?, ?, ?)").run(
    id, dono.id, dono.id,
  );
  auditar({ usuarioId: dono.id, acao: "certificado.importado", entidade: "certificado", entidadeId: id, certificadoId: id, detalhes: { titular: info.titular, serial: info.serial, validoAte: info.validoAte }, ip });
  return id;
}

export function usuarioPodeUsar(certificadoId: number, usuarioId: number): boolean {
  const r = db
    .prepare(
      `SELECT 1 FROM certificado_acessos a JOIN certificados c ON c.id = a.certificado_id
       WHERE a.certificado_id = ? AND a.usuario_id = ? AND c.ativo = 1`,
    )
    .get(certificadoId, usuarioId);
  return !!r;
}

/**
 * Entrega o PFX decifrado para uso imediato por um adaptador.
 * Cada chamada é registrada na auditoria. O material nunca é devolvido pela API.
 */
export function obterParaUso(certificadoId: number, usuarioId: number, finalidade: string): { pfx: Buffer; senha: string } {
  const c = db
    .prepare("SELECT pfx_cifrado, senha_cifrada, valido_ate, ativo FROM certificados WHERE id = ?")
    .get(certificadoId) as { pfx_cifrado: string; senha_cifrada: string; valido_ate: string; ativo: number } | undefined;
  if (!c || !c.ativo) throw new Error("Certificado inexistente ou desativado.");
  if (!usuarioPodeUsar(certificadoId, usuarioId)) throw new Error("O usuário que enviou não tem delegação para este certificado.");
  if (new Date(c.valido_ate) < new Date()) throw new Error("Certificado vencido.");
  auditar({ usuarioId, acao: "certificado.uso", entidade: "certificado", entidadeId: certificadoId, certificadoId, detalhes: { finalidade } });
  return { pfx: decifrar(c.pfx_cifrado), senha: decifrar(c.senha_cifrada).toString() };
}
