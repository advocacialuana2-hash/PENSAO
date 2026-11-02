import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api, ErroApi, type Certificado, type Tribunal } from "../api.ts";
import { Erro, SoltarArquivos, Titulo, tamanho } from "../components/ui.tsx";
import { MOVIMENTACOES, TIPOS_DOC } from "../rotulos.ts";

const LIMITE = 50;

export default function Manifestacao() {
  const navigate = useNavigate();
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [modo, setModo] = useState<"individual" | "massa">("individual");
  const [tribunalId, setTribunalId] = useState("");
  const [certId, setCertId] = useState("");
  const [numeros, setNumeros] = useState("");
  const [movimentacao, setMovimentacao] = useState("");
  const [arquivos, setArquivos] = useState<Array<{ f: File; tipo: string }>>([]);
  const [erro, setErro] = useState<{ msg: string; itens?: string[] } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get<{ tribunais: Tribunal[] }>("/tribunais").then((r) => setTribunais(r.tribunais.filter((t) => t.ativo)));
    api.get<Certificado[]>("/certificados").then((r) => setCerts(r.filter((c) => c.ativo && c.posso_usar)));
  }, []);

  const lista = useMemo(() => numeros.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean), [numeros]);

  const criar = async () => {
    setErro(null);
    setEnviando(true);
    const fd = new FormData();
    fd.append("numeros", lista.join("\n"));
    fd.append("tribunal_id", tribunalId);
    fd.append("movimentacao", movimentacao);
    if (certId) fd.append("certificado_id", certId);
    fd.append("tipos", JSON.stringify(arquivos.map((a) => a.tipo)));
    arquivos.forEach((a) => fd.append("arquivos", a.f));
    try {
      const r = await api.form<{ lote_id: number | null; ids: number[] }>("/peticoes/manifestacao", fd);
      navigate(r.lote_id ? `/lotes/${r.lote_id}` : `/peticoes/${r.ids[0]}`);
    } catch (e) {
      setErro({ msg: (e as Error).message, itens: e instanceof ErroApi ? e.pendencias : undefined });
      setEnviando(false);
    }
  };

  return (
    <>
      <Titulo sub="Petição intermediária em um processo ou a mesma peça em até 50 processos.">Manifestação</Titulo>
      <div className="card max-w-3xl space-y-5">
        <Erro msg={erro?.msg ?? null} itens={erro?.itens} />
        <div className="flex rounded-md border border-slate-300 p-0.5 text-sm sm:w-fit">
          {(["individual", "massa"] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)} className={`flex-1 rounded px-4 py-1.5 ${modo === m ? "bg-marca-600 text-white" : "text-slate-600"}`}>
              {m === "individual" ? "Individual" : `Em massa (até ${LIMITE})`}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="trib">Tribunal</label>
            <select id="trib" className="input" value={tribunalId} onChange={(e) => setTribunalId(e.target.value)}>
              <option value="">Selecione…</option>
              {tribunais.map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.sistema.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="cert">Certificado</label>
            <select id="cert" className="input" value={certId} onChange={(e) => setCertId(e.target.value)}>
              <option value="">Nenhum (protocolo manual)</option>
              {certs.map((c) => <option key={c.id} value={c.id}>{c.titular}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="nums">{modo === "individual" ? "Número do processo (CNJ)" : "Números dos processos — um por linha"}</label>
          {modo === "individual" ? (
            <input id="nums" className="input font-mono" placeholder="0000000-00.0000.0.00.0000" value={numeros} onChange={(e) => setNumeros(e.target.value)} />
          ) : (
            <>
              <textarea id="nums" className="input h-40 font-mono" value={numeros} onChange={(e) => setNumeros(e.target.value)} />
              <p className={`text-xs ${lista.length > LIMITE ? "text-red-600" : "text-slate-500"}`}>{lista.length} de {LIMITE} processos. Cada um vira uma petição com recibo próprio.</p>
            </>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="mov">Movimentação</label>
          <input id="mov" className="input" list="movs" value={movimentacao} onChange={(e) => setMovimentacao(e.target.value)} />
          <datalist id="movs">{MOVIMENTACOES.map((m) => <option key={m} value={m} />)}</datalist>
        </div>
        <SoltarArquivos texto="PDF da petição e anexos" onArquivos={(fs) => setArquivos((a) => [...a, ...fs.map((f, i) => ({ f, tipo: a.length === 0 && i === 0 ? "peticao_intermediaria" : "outro" }))])} />
        {arquivos.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {arquivos.map((a, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1 truncate">{a.f.name}</span>
                <select className="input w-52 py-1 text-xs" value={a.tipo} onChange={(e) => setArquivos(arquivos.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))}>
                  {Object.entries(TIPOS_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <span className="text-xs text-slate-400">{tamanho(a.f.size)}</span>
                <button aria-label="Remover" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="p-1 text-red-600"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button className="btn-primario" disabled={enviando || !lista.length || !arquivos.length || !movimentacao || lista.length > LIMITE} onClick={criar}>
            {enviando ? "Preparando…" : "Preparar para revisão"}
          </button>
        </div>
      </div>
    </>
  );
}
