import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Sparkles, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api, ErroApi, type Certificado, type CampoExtraido, type Parte, type Peticao, type Tribunal } from "../api.ts";
import { Campo, Erro, SoltarArquivos, StatusBadge, Titulo, tamanho, SeloIa } from "../components/ui.tsx";
import { AREAS, MOVIMENTACOES, PRIORIDADES, TIPOS_DOC, dataHora } from "../rotulos.ts";
import { useEu } from "../App.tsx";

const EDITAVEL = ["rascunho", "revisao", "erro"];
const PARTE_VAZIA: Parte = { nome: "", tipo_pessoa: "fisica", documento: null, endereco: null, representado_por: null };

export default function PeticaoDetalhe() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const eu = useEu();
  const [p, setP] = useState<Peticao | null>(null);
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [erro, setErro] = useState<{ msg: string; itens?: string[] } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmo, setConfirmo] = useState(false);
  const [sujo, setSujo] = useState(false);
  const extraiu = useRef(false);

  const carregar = useCallback(() => api.get<Peticao>(`/peticoes/${id}`).then((x) => { setP(x); setSujo(false); }), [id]);

  useEffect(() => {
    void carregar();
    api.get<{ tribunais: Tribunal[] }>("/tribunais").then((r) => setTribunais(r.tribunais));
    api.get<Certificado[]>("/certificados").then((r) => setCerts(r.filter((c) => c.ativo && c.posso_usar)));
  }, [carregar]);

  // Atualiza automaticamente enquanto a petição está na fila
  useEffect(() => {
    if (!p || !["na_fila", "processando", "extraindo"].includes(p.status)) return;
    const t = setInterval(() => void carregar(), 3000);
    return () => clearInterval(t);
  }, [p, carregar]);

  const acao = async (nome: string, fn: () => Promise<Peticao | unknown>) => {
    setErro(null);
    setOcupado(nome);
    try {
      const r = await fn();
      if (r && typeof r === "object" && "id" in r && "status" in r) { setP(r as Peticao); setSujo(false); }
    } catch (e) {
      setErro({ msg: (e as Error).message, itens: e instanceof ErroApi ? e.pendencias : undefined });
    } finally {
      setOcupado(null);
    }
  };

  const extrair = useCallback(() => acao("extrair", () => api.post<Peticao>(`/peticoes/${id}/extrair`)), [id]);

  useEffect(() => {
    if (params.get("extrair") === "1" && p && !extraiu.current && EDITAVEL.includes(p.status)) {
      extraiu.current = true;
      setParams({}, { replace: true });
      void extrair();
    }
  }, [params, p, extrair, setParams]);

  if (!p) return <div className="text-slate-500">Carregando…</div>;

  const editavel = EDITAVEL.includes(p.status) && ocupado === null;
  const d = p.dados;
  const ia = (k: string) => p.campos_ia.includes(k);
  const trecho = (k: string) => ((p.extracao?.[k] as CampoExtraido | undefined)?.trecho ?? null);

  const setCampo = (k: string, v: unknown) => {
    setP({ ...p, dados: { ...d, [k]: v }, campos_ia: p.campos_ia.filter((c) => c !== k) });
    setSujo(true);
  };
  const setTopo = (patch: Partial<Peticao>) => { setP({ ...p, ...patch }); setSujo(true); };

  const salvar = () =>
    acao("salvar", () =>
      api.put<Peticao>(`/peticoes/${id}`, {
        dados: Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("_"))),
        campos_ia: p.campos_ia,
        tribunal_id: p.tribunal_id,
        certificado_id: p.certificado_id,
        numero_processo: p.numero_processo,
        movimentacao: p.movimentacao,
        documentos: p.documentos.map((doc, i) => ({ id: doc.id, tipo: doc.tipo, ordem: i })),
      }),
    );

  const enviar = async () => {
    if (sujo) await salvar();
    await acao("enviar", () => api.post<Peticao>(`/peticoes/${id}/enviar`, { confirmo: true }));
  };

  const moverDoc = (i: number, dlt: number) => {
    const docs = [...p.documentos];
    [docs[i], docs[i + dlt]] = [docs[i + dlt], docs[i]];
    setTopo({ documentos: docs });
  };

  const alertas = (p.extracao?.alertas as string[] | undefined) ?? [];
  const podeEnviar = eu.papel !== "administrativo";

  return (
    <>
      <Titulo
        sub={<>Criada por {p.criado_por_nome} em {dataHora(p.criado_em)}{p.enviado_por_nome && <> · enviada por {p.enviado_por_nome} em {dataHora(p.enviado_em)}</>}</>}
        acoes={<StatusBadge status={p.status} />}
      >
        {p.tipo === "inicial" ? "Petição inicial" : "Petição intermediária"} #{p.id}
        {p.lote_id && <Link to={`/lotes/${p.lote_id}`} className="ml-3 text-sm font-normal text-marca-600 hover:underline">lote #{p.lote_id}</Link>}
      </Titulo>

      <Erro msg={erro?.msg ?? null} itens={erro?.itens} />

      {ocupado === "extrair" || p.status === "extraindo" ? (
        <div className="card mb-4 flex items-center gap-3 border-violet-200 bg-violet-50 text-violet-800">
          <Loader2 className="h-5 w-5 animate-spin" /> Lendo a petição e classificando os anexos com IA… isso leva de 20 segundos a 2 minutos.
        </div>
      ) : null}

      {p.status === "erro" && p.erro_motivo && (
        <div className="card mb-4 border-red-200 bg-red-50 text-sm text-red-800">
          <b>Falha no envio (tentativa {p.tentativas}):</b> {p.erro_motivo}
          <p className="mt-1 text-xs">Corrija o que for preciso e envie novamente, ou registre o protocolo abaixo se ele foi feito no portal.</p>
        </div>
      )}

      {p.status === "concluido" && (
        <div className="card mb-4 flex flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-6 w-6" />
          <div className="flex-1 text-sm">
            <div><b>Processo:</b> <span className="font-mono">{p.numero_processo ?? "—"}</span></div>
            <div><b>Protocolo:</b> {p.protocolo_numero} · {dataHora(p.protocolo_em)}</div>
          </div>
          {p.recibo_arquivo && <a className="btn-secundario" href={`/api/peticoes/${p.id}/recibo`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Recibo</a>}
        </div>
      )}

      {(p.status === "aguardando_protocolo_manual" || p.status === "erro") && <RegistroProtocolo p={p} onFeito={setP} />}

      {alertas.length > 0 && EDITAVEL.includes(p.status) && (
        <div className="card mb-4 border-amber-300 bg-amber-50 text-sm text-amber-900">
          <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Pontos para conferir (apontados pela IA)</div>
          <ul className="ml-6 list-disc">{alertas.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Tribunal">
              <select className="input" disabled={!editavel} value={p.tribunal_id ?? ""} onChange={(e) => setTopo({ tribunal_id: Number(e.target.value) || null })}>
                <option value="">Selecione…</option>
                {tribunais.filter((t) => t.ativo || t.id === p.tribunal_id).map((t) => <option key={t.id} value={t.id}>{t.sigla} — {t.sistema.toUpperCase()} ({t.adaptador})</option>)}
              </select>
            </Campo>
            <Campo rotulo="Certificado para assinatura">
              <select className="input" disabled={!editavel} value={p.certificado_id ?? ""} onChange={(e) => setTopo({ certificado_id: Number(e.target.value) || null })}>
                <option value="">{p.certificado_titular ?? "Nenhum (protocolo manual)"}</option>
                {certs.map((c) => <option key={c.id} value={c.id}>{c.titular} — válido até {new Date(c.valido_ate).toLocaleDateString("pt-BR")}</option>)}
              </select>
            </Campo>

            {p.tipo === "intermediaria" ? (
              <>
                <Campo rotulo="Número do processo (CNJ)">
                  <input className="input font-mono" disabled={!editavel} value={p.numero_processo ?? ""} onChange={(e) => setTopo({ numero_processo: e.target.value })} />
                </Campo>
                <Campo rotulo="Movimentação">
                  <input className="input" list="movs" disabled={!editavel} value={p.movimentacao ?? ""} onChange={(e) => setTopo({ movimentacao: e.target.value })} />
                  <datalist id="movs">{MOVIMENTACOES.map((m) => <option key={m} value={m} />)}</datalist>
                </Campo>
              </>
            ) : (
              <>
                <Campo rotulo="Comarca" ia={ia("comarca")} trecho={trecho("comarca")}>
                  <input className="input" disabled={!editavel} value={(d.comarca as string) ?? ""} onChange={(e) => setCampo("comarca", e.target.value || null)} />
                </Campo>
                <Campo rotulo="UF" ia={ia("uf")} trecho={trecho("uf")}>
                  <input className="input" maxLength={2} disabled={!editavel} value={(d.uf as string) ?? ""} onChange={(e) => setCampo("uf", e.target.value.toUpperCase() || null)} />
                </Campo>
                <Campo rotulo="Juízo / vara" ia={ia("juizo")} trecho={trecho("juizo")}>
                  <input className="input" disabled={!editavel} value={(d.juizo as string) ?? ""} onChange={(e) => setCampo("juizo", e.target.value || null)} />
                </Campo>
                <Campo rotulo="Área" ia={ia("area")} trecho={trecho("area")}>
                  <select className="input" disabled={!editavel} value={(d.area as string) ?? ""} onChange={(e) => setCampo("area", e.target.value || null)}>
                    <option value="">Selecione…</option>
                    {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Classe processual" ia={ia("classe")} trecho={trecho("classe")}>
                  <input className="input" disabled={!editavel} value={(d.classe as string) ?? ""} onChange={(e) => setCampo("classe", e.target.value || null)} />
                </Campo>
                <Campo rotulo="Assunto" ia={ia("assunto")} trecho={trecho("assunto")}>
                  <input className="input" disabled={!editavel} value={(d.assunto as string) ?? ""} onChange={(e) => setCampo("assunto", e.target.value || null)} />
                </Campo>
                <Campo rotulo="Valor da causa (R$)" ia={ia("valor_causa")} trecho={trecho("valor_causa")}>
                  <input className="input" type="number" step="0.01" min="0" disabled={!editavel} value={(d.valor_causa as number | null) ?? ""} onChange={(e) => setCampo("valor_causa", e.target.value === "" ? null : Number(e.target.value))} />
                </Campo>
                <Campo rotulo="Prioridade" ia={ia("prioridade")} trecho={trecho("prioridade")}>
                  <select className="input" disabled={!editavel} value={(d.prioridade as string) ?? "nenhuma"} onChange={(e) => setCampo("prioridade", e.target.value)}>
                    {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Campo>
                <div className="flex flex-wrap gap-5 sm:col-span-2">
                  {([["gratuidade", "Gratuidade da justiça"], ["segredo_justica", "Segredo de justiça"], ["pedido_liminar", "Pedido liminar"]] as const).map(([k, r]) => (
                    <label key={k} className="flex items-center gap-2">
                      <input type="checkbox" disabled={!editavel} checked={d[k] === true} onChange={(e) => setCampo(k, e.target.checked)} />
                      {r} {ia(k) && <SeloIa titulo={trecho(k) ?? undefined} />}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {p.tipo === "inicial" && (
            <>
              <Polo titulo="Polo ativo" chave="polo_ativo" partes={d.polo_ativo ?? []} ia={ia("polo_ativo")} editavel={editavel} onChange={(v) => setCampo("polo_ativo", v)} />
              <Polo titulo="Polo passivo" chave="polo_passivo" partes={d.polo_passivo ?? []} ia={ia("polo_passivo")} editavel={editavel} onChange={(v) => setCampo("polo_passivo", v)} />
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-semibold text-marca-900">Documentos</h2>
            <ul className="space-y-2">
              {p.documentos.map((doc, i) => (
                <li key={doc.id} className="rounded-md border border-slate-200 p-2 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-5 text-slate-400">{i + 1}.</span>
                    <a href={`/api/peticoes/${p.id}/documentos/${doc.id}`} target="_blank" rel="noreferrer" className="flex-1 truncate text-marca-600 hover:underline" title={doc.nome_original}>{doc.nome_original}</a>
                    {editavel && (
                      <>
                        <button aria-label="Subir" disabled={i === 0} onClick={() => moverDoc(i, -1)} className="p-0.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button aria-label="Descer" disabled={i === p.documentos.length - 1} onClick={() => moverDoc(i, 1)} className="p-0.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button aria-label="Excluir" onClick={() => acao("doc", () => api.del<Peticao>(`/peticoes/${p.id}/documentos/${doc.id}`))} className="p-0.5 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-6">
                    <select className="input py-1 text-xs" disabled={!editavel} value={doc.tipo} onChange={(e) => setTopo({ documentos: p.documentos.map((x) => (x.id === doc.id ? { ...x, tipo: e.target.value, tipo_origem: "usuario" } : x)) })}>
                      {Object.entries(TIPOS_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {doc.tipo_origem === "ia" && <SeloIa />}
                    <span className="whitespace-nowrap text-xs text-slate-400">{tamanho(doc.tamanho)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {editavel && (
              <div className="mt-3">
                <SoltarArquivos texto="Adicionar PDFs" onArquivos={(fs) => {
                  const fd = new FormData();
                  fs.forEach((f) => fd.append("arquivos", f));
                  void acao("doc", () => api.form<Peticao>(`/peticoes/${p.id}/documentos`, fd));
                }} />
              </div>
            )}
          </div>

          {EDITAVEL.includes(p.status) && (
            <div className="card space-y-3">
              {p.tipo === "inicial" && eu.ia && (
                <button className="btn-secundario w-full" disabled={!editavel} onClick={extrair}>
                  <Sparkles className="h-4 w-4" /> {p.extracao ? "Extrair novamente com IA" : "Preencher com IA"}
                </button>
              )}
              <button className="btn-secundario w-full" disabled={!editavel || !sujo} onClick={salvar}>{ocupado === "salvar" ? "Salvando…" : "Salvar alterações"}</button>
              {podeEnviar ? (
                <>
                  <label className="flex items-start gap-2 text-xs font-normal">
                    <input type="checkbox" className="mt-0.5" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
                    Conferi os dados, as partes, os documentos e a ordem dos anexos. Assumo a responsabilidade pelo envio.
                  </label>
                  <button className="btn-primario w-full" disabled={!editavel || !confirmo} onClick={enviar}>
                    {ocupado === "enviar" ? "Enviando…" : p.status === "erro" ? "Reenviar para a fila" : "Enviar para a fila"}
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-500">O envio para a fila é feito por um advogado. Salve a revisão e avise o responsável.</p>
              )}
              <button className="btn-perigo w-full" disabled={!editavel} onClick={() => confirm("Cancelar esta petição?") && acao("cancelar", () => api.post<Peticao>(`/peticoes/${p.id}/cancelar`))}>Cancelar petição</button>
            </div>
          )}
          {p.status === "na_fila" && (
            <button className="btn-perigo w-full" onClick={() => confirm("Retirar da fila e cancelar?") && acao("cancelar", () => api.post<Peticao>(`/peticoes/${p.id}/cancelar`))}>Retirar da fila</button>
          )}
          <button className="btn-secundario w-full" onClick={() => navigate("/fila")}>Voltar para a fila</button>
        </div>
      </div>
    </>
  );
}

function Polo({ titulo, partes, ia, editavel, onChange }: { titulo: string; chave: string; partes: Parte[]; ia: boolean; editavel: boolean; onChange: (p: Parte[]) => void }) {
  const set = (i: number, patch: Partial<Parte>) => onChange(partes.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-marca-900">{titulo}</h2>
        {ia && <SeloIa />}
        {editavel && <button className="ml-auto text-sm text-marca-600 hover:underline" onClick={() => onChange([...partes, { ...PARTE_VAZIA }])}><Plus className="inline h-4 w-4" /> Adicionar parte</button>}
      </div>
      {partes.length === 0 && <p className="text-sm text-slate-500">Nenhuma parte cadastrada.</p>}
      <div className="space-y-3">
        {partes.map((pt, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-6">
            <input className="input sm:col-span-3" placeholder="Nome completo" disabled={!editavel} value={pt.nome} onChange={(e) => set(i, { nome: e.target.value })} />
            <select className="input sm:col-span-1" disabled={!editavel} value={pt.tipo_pessoa} onChange={(e) => set(i, { tipo_pessoa: e.target.value as Parte["tipo_pessoa"] })}>
              <option value="fisica">PF</option><option value="juridica">PJ</option><option value="nao_identificado">?</option>
            </select>
            <input className="input font-mono sm:col-span-2" placeholder="CPF/CNPJ (só números)" disabled={!editavel} value={pt.documento ?? ""} onChange={(e) => set(i, { documento: e.target.value.replace(/\D/g, "") || null })} />
            <input className="input sm:col-span-4" placeholder="Endereço" disabled={!editavel} value={pt.endereco ?? ""} onChange={(e) => set(i, { endereco: e.target.value || null })} />
            <input className="input sm:col-span-2" placeholder="Representado por" disabled={!editavel} value={pt.representado_por ?? ""} onChange={(e) => set(i, { representado_por: e.target.value || null })} />
            {editavel && <button className="text-left text-xs text-red-600 hover:underline sm:col-span-6" onClick={() => onChange(partes.filter((_, j) => j !== i))}>Remover parte</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistroProtocolo({ p, onFeito }: { p: Peticao; onFeito: (p: Peticao) => void }) {
  const [numero, setNumero] = useState(p.numero_processo ?? "");
  const [protocolo, setProtocolo] = useState("");
  const [recibo, setRecibo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const instrucoes = p.dados._instrucoes ?? [];

  const registrar = async () => {
    setErro(null);
    const fd = new FormData();
    fd.append("numero_processo", numero);
    fd.append("protocolo", protocolo);
    if (recibo) fd.append("recibo", recibo);
    try {
      onFeito(await api.form<Peticao>(`/peticoes/${p.id}/registrar-protocolo`, fd));
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  return (
    <div className="card mb-4 border-orange-200">
      {p.status === "aguardando_protocolo_manual" && instrucoes.length > 0 && (
        <>
          <h2 className="mb-2 font-semibold text-marca-900">Roteiro para protocolo no portal</h2>
          <ol className="mb-4 ml-5 list-decimal space-y-1 text-sm">{instrucoes.map((i, k) => <li key={k}>{i}</li>)}</ol>
        </>
      )}
      <h3 className="mb-2 text-sm font-semibold text-marca-900">Registrar protocolo realizado</h3>
      <Erro msg={erro} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="input font-mono" placeholder="Nº do processo (CNJ)" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <input className="input" placeholder="Nº do protocolo / evento" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} />
        <input className="input text-xs" type="file" accept="application/pdf" onChange={(e) => setRecibo(e.target.files?.[0] ?? null)} />
      </div>
      <button className="btn-primario mt-3" disabled={!protocolo.trim()} onClick={registrar}>Registrar e concluir</button>
    </div>
  );
}
