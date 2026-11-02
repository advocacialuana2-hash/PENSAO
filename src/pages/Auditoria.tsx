import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.ts";
import { Titulo } from "../components/ui.tsx";
import { dataHora } from "../rotulos.ts";

interface Evento {
  id: number; em: string; acao: string; entidade: string | null; entidade_id: number | null; usuario_nome: string | null;
  certificado_titular: string | null; detalhes_json: string | null; ip: string | null;
}

const ACOES = ["", "login", "peticao", "protocolo", "certificado", "manifestacao", "lote", "usuario", "tribunal"];

export default function Auditoria() {
  const [acao, setAcao] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [itens, setItens] = useState<Evento[]>([]);

  useEffect(() => {
    const s = new URLSearchParams();
    if (acao) s.set("acao", acao);
    if (de) s.set("de", de);
    if (ate) s.set("ate", ate);
    api.get<Evento[]>(`/auditoria?${s}`).then(setItens);
  }, [acao, de, ate]);

  return (
    <>
      <Titulo sub="Quem fez o quê, quando e com qual certificado. Registro somente leitura.">Auditoria</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <select className="input w-48" value={acao} onChange={(e) => setAcao(e.target.value)}>
          {ACOES.map((a) => <option key={a} value={a}>{a || "Todas as ações"}</option>)}
        </select>
        <input className="input w-44" type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-label="De" />
        <input className="input w-44" type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Objeto</th><th>Certificado</th><th>Detalhes</th></tr></thead>
          <tbody>
            {itens.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs">{dataHora(e.em)}</td>
                <td>{e.usuario_nome ?? "—"}<div className="text-xs text-slate-400">{e.ip}</div></td>
                <td className="font-mono text-xs">{e.acao}</td>
                <td className="text-xs">{e.entidade === "peticao" && e.entidade_id ? <Link className="text-marca-600 hover:underline" to={`/peticoes/${e.entidade_id}`}>petição #{e.entidade_id}</Link> : e.entidade ? `${e.entidade} #${e.entidade_id ?? ""}` : "—"}</td>
                <td className="text-xs">{e.certificado_titular ?? "—"}</td>
                <td className="max-w-xs truncate font-mono text-[11px] text-slate-500" title={e.detalhes_json ?? ""}>{e.detalhes_json ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
