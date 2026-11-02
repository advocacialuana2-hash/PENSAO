import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ErroApi, type PeticaoResumo } from "../api.ts";
import { Erro, StatusBadge, Titulo } from "../components/ui.tsx";
import { useEu } from "../App.tsx";

export default function Lote() {
  const { id } = useParams();
  const eu = useEu();
  const [itens, setItens] = useState<PeticaoResumo[]>([]);
  const [confirmo, setConfirmo] = useState(false);
  const [erro, setErro] = useState<{ msg: string; itens?: string[] } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(
    () => api.get<PeticaoResumo[]>("/peticoes").then((r) => setItens(r.filter((x) => String(x.lote_id) === id))),
    [id],
  );
  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 4000);
    return () => clearInterval(t);
  }, [carregar]);

  const enviar = async () => {
    setErro(null);
    try {
      const r = await api.post<{ enviados: number }>(`/peticoes/lotes/${id}/enviar`, { confirmo: true });
      setAviso(`${r.enviados} petição(ões) enviadas para a fila.`);
      void carregar();
    } catch (e) {
      setErro({ msg: (e as Error).message, itens: e instanceof ErroApi ? e.pendencias : undefined });
    }
  };

  const prontas = itens.filter((i) => ["revisao", "erro"].includes(i.status)).length;
  const concluidas = itens.filter((i) => i.status === "concluido").length;

  return (
    <>
      <Titulo sub={`${itens[0]?.movimentacao ?? ""} · ${itens.length} processos · ${concluidas} concluídos`}>Lote #{id}</Titulo>
      <Erro msg={erro?.msg ?? null} itens={erro?.itens} />
      {aviso && <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</div>}
      <div className="card overflow-x-auto">
        <table className="tabela">
          <thead><tr><th>#</th><th>Processo</th><th>Tribunal</th><th>Status</th><th>Protocolo / motivo</th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td><Link className="text-marca-600 hover:underline" to={`/peticoes/${i.id}`}>{i.id}</Link></td>
                <td className="font-mono">{i.numero_processo}</td>
                <td>{i.tribunal_sigla ?? "—"}</td>
                <td><StatusBadge status={i.status} /></td>
                <td className="text-xs">{i.protocolo_numero ?? i.erro_motivo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {prontas > 0 && eu.papel !== "administrativo" && (
        <div className="card mt-4 max-w-xl space-y-3">
          <label className="flex items-start gap-2 text-sm font-normal">
            <input type="checkbox" className="mt-1" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
            Conferi a lista de processos, a peça e os anexos. Autorizo o envio das {prontas} petições pendentes.
          </label>
          <button className="btn-primario" disabled={!confirmo} onClick={enviar}>Enviar lote para a fila</button>
        </div>
      )}
    </>
  );
}
