import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { api } from "../api.ts";
import { Titulo } from "../components/ui.tsx";
import { STATUS, data, dataHora } from "../rotulos.ts";

interface Dados {
  porStatus: Array<{ status: string; n: number }>;
  porTribunal: Array<{ sigla: string; n: number }>;
  porUsuario: Array<{ nome: string; n: number }>;
  ultimos: Array<{ id: number; tipo: string; numero_processo: string | null; protocolo_em: string; tribunal_sigla: string; autor: string | null }>;
  certificadosVencendo: Array<{ id: number; titular: string; valido_ate: string }>;
}

const PERIODOS = [["hoje", "Hoje"], ["7d", "7 dias"], ["mes", "Este mês"], ["todo", "Todo o período"]] as const;
const KPIS = ["revisao", "na_fila", "aguardando_protocolo_manual", "concluido", "erro"];

export default function Dashboard() {
  const [periodo, setPeriodo] = useState("mes");
  const [d, setD] = useState<Dados | null>(null);

  useEffect(() => {
    api.get<Dados>(`/dashboard?periodo=${periodo}`).then(setD);
  }, [periodo]);

  const n = (s: string) => d?.porStatus.find((x) => x.status === s)?.n ?? 0;

  return (
    <>
      <Titulo
        sub="Visão geral dos peticionamentos"
        acoes={
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5">
            {PERIODOS.map(([k, r]) => (
              <button key={k} onClick={() => setPeriodo(k)} className={`rounded px-3 py-1 text-sm ${periodo === k ? "bg-marca-600 text-white" : "text-slate-600"}`}>{r}</button>
            ))}
          </div>
        }
      >
        Painel
      </Titulo>

      {d && d.certificadosVencendo.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Certificados vencendo em até 30 dias:{" "}
            {d.certificadosVencendo.map((c) => `${c.titular} (${data(c.valido_ate)})`).join("; ")}.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {KPIS.map((s) => (
          <Link key={s} to={`/fila?status=${s}`} className="card hover:border-marca-500">
            <div className="text-xs font-semibold uppercase text-slate-500">{STATUS[s].rotulo}</div>
            <div className="mt-1 text-3xl font-bold text-marca-900">{n(s)}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-3 font-semibold text-marca-900">Últimos protocolos concluídos</h2>
          {d?.ultimos.length ? (
            <table className="tabela">
              <thead><tr><th>Processo</th><th>Tribunal</th><th>Parte</th><th>Quando</th></tr></thead>
              <tbody>
                {d.ultimos.map((u) => (
                  <tr key={u.id}>
                    <td><Link className="font-mono text-marca-600 hover:underline" to={`/peticoes/${u.id}`}>{u.numero_processo ?? `#${u.id}`}</Link></td>
                    <td>{u.tribunal_sigla}</td>
                    <td>{u.autor ?? "—"}</td>
                    <td className="whitespace-nowrap">{dataHora(u.protocolo_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-500">Nenhum protocolo concluído ainda.</p>}
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-semibold text-marca-900">Concluídos por tribunal</h2>
            {d?.porTribunal.length ? d.porTribunal.map((t) => (
              <div key={t.sigla} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{t.sigla}</span><b>{t.n}</b></div>
            )) : <p className="text-sm text-slate-500">Sem dados no período.</p>}
          </div>
          <div className="card">
            <h2 className="mb-3 font-semibold text-marca-900">Concluídos por responsável</h2>
            {d?.porUsuario.length ? d.porUsuario.map((u) => (
              <div key={u.nome} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{u.nome}</span><b>{u.n}</b></div>
            )) : <p className="text-sm text-slate-500">Sem dados no período.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
