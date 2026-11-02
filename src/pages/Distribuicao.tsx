import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { api, type Peticao, type Tribunal } from "../api.ts";
import { Erro, SoltarArquivos, Titulo, tamanho } from "../components/ui.tsx";
import { useEu } from "../App.tsx";

export default function Distribuicao() {
  const eu = useEu();
  const navigate = useNavigate();
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [tribunalId, setTribunalId] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get<{ tribunais: Tribunal[] }>("/tribunais").then((r) => setTribunais(r.tribunais.filter((t) => t.ativo)));
  }, []);

  const mover = (i: number, d: number) => {
    const n = [...arquivos];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setArquivos(n);
  };

  const criar = async () => {
    setErro(null);
    setEnviando(true);
    const fd = new FormData();
    if (tribunalId) fd.append("tribunal_id", tribunalId);
    arquivos.forEach((f) => fd.append("arquivos", f));
    try {
      const p = await api.form<Peticao>("/peticoes/distribuicao", fd);
      navigate(`/peticoes/${p.id}${eu.ia ? "?extrair=1" : ""}`);
    } catch (e) {
      setErro((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <>
      <Titulo sub="Petição inicial: envie a peça e os anexos. A IA preenche o cadastro e você confere antes do envio.">Distribuição</Titulo>
      <div className="card max-w-3xl space-y-5">
        <Erro msg={erro} />
        <div className="space-y-1">
          <label htmlFor="tribunal">Tribunal</label>
          <select id="tribunal" className="input" value={tribunalId} onChange={(e) => setTribunalId(e.target.value)}>
            <option value="">Selecione…</option>
            {tribunais.map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.nome} ({t.sistema.toUpperCase()})</option>)}
          </select>
        </div>
        <SoltarArquivos texto="PDFs da petição inicial e dos anexos" onArquivos={(f) => setArquivos((a) => [...a, ...f])} />
        {arquivos.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-slate-500">O primeiro arquivo é tratado como a petição inicial. Ajuste a ordem se precisar.</p>
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {arquivos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="w-6 text-slate-400">{i + 1}.</span>
                  <span className="flex-1 truncate">{f.name}{i === 0 && <b className="ml-2 text-xs text-marca-600">INICIAL</b>}</span>
                  <span className="text-xs text-slate-400">{tamanho(f.size)}</span>
                  <button aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button aria-label="Descer" disabled={i === arquivos.length - 1} onClick={() => mover(i, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button aria-label="Remover" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="p-1 text-red-600"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end">
          <button className="btn-primario" disabled={!arquivos.length || enviando} onClick={criar}>
            {enviando ? "Enviando…" : eu.ia ? "Enviar e preencher com IA" : "Enviar e preencher manualmente"}
          </button>
        </div>
        {!eu.ia && <p className="text-xs text-amber-700">A extração por IA está desligada (ANTHROPIC_API_KEY não configurada).</p>}
      </div>
    </>
  );
}
