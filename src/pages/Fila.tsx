import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type PeticaoResumo } from "../api.ts";
import { StatusBadge, Titulo } from "../components/ui.tsx";
import { STATUS, dataHora } from "../rotulos.ts";

const ABAS = ["", "revisao", "na_fila", "processando", "aguardando_protocolo_manual", "erro", "concluido", "cancelado"];

export default function Fila() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const [q, setQ] = useState("");
  const [itens, setItens] = useState<PeticaoResumo[]>([]);

  const carregar = useCallback(() => {
    const s = new URLSearchParams();
    if (status) s.set("status", status);
    if (q) s.set("q", q);
    return api.get<PeticaoResumo[]>(`/peticoes?${s}`).then(setItens);
  }, [status, q]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 5000);
    return () => clearInterval(t);
  }, [carregar]);

  return (
    <>
      <Titulo sub="Atualiza a cada 5 segundos" acoes={<input className="input w-64" placeholder="Buscar processo ou parte" value={q} onChange={(e) => setQ(e.target.value)} />}>Fila</Titulo>
      <div className="mb-4 flex flex-wrap gap-1">
        {ABAS.map((a) => (
          <button key={a} onClick={() => setParams(a ? { status: a } : {})} className={`rounded-full px-3 py-1 text-sm ${status === a ? "bg-marca-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {a ? STATUS[a].rotulo : "Todas"}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>#</th><th>Tipo</th><th>Processo / partes</th><th>Tribunal</th><th>Status</th><th>Atualizado</th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td><Link className="font-semibold text-marca-600 hover:underline" to={`/peticoes/${i.id}`}>{i.id}</Link></td>
                <td>{i.tipo === "inicial" ? "Inicial" : i.movimentacao ?? "Intermediária"}{i.lote_id && <div className="text-xs text-slate-400">lote #{i.lote_id}</div>}</td>
                <td>
                  <div className="font-mono text-xs">{i.numero_processo ?? "—"}</div>
                  {(i.autor || i.reu) && <div className="text-xs text-slate-500">{i.autor ?? "?"} x {i.reu ?? "?"}</div>}
                  {i.status === "erro" && i.erro_motivo && <div className="text-xs text-red-600">{i.erro_motivo}</div>}
                </td>
                <td>{i.tribunal_sigla ?? "—"}</td>
                <td><StatusBadge status={i.status} /></td>
                <td className="whitespace-nowrap text-xs">{dataHora(i.atualizado_em)}<div className="text-slate-400">{i.criado_por_nome}</div></td>
              </tr>
            ))}
            {itens.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nada por aqui.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
