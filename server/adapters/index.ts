import { adaptadorManual } from "./manual.ts";
import { adaptadorSimulado } from "./simulado.ts";
import type { Adaptador } from "./types.ts";

/**
 * Registro de adaptadores de protocolo.
 * Para integrar um tribunal (via MNI/SOAP ou automação do portal), crie um
 * arquivo que implemente `Adaptador`, registre-o aqui e selecione-o no
 * cadastro do tribunal em Configurações.
 */
const registro: Adaptador[] = [adaptadorManual, adaptadorSimulado];

export function adaptadores(): Adaptador[] {
  return registro.filter((a) => a.disponivel());
}

export function adaptador(chave: string): Adaptador | undefined {
  return adaptadores().find((a) => a.chave === chave);
}
