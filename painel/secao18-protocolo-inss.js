/* ---------- 18. Protocolo pelo robô no Mac · Protocoladas · INSS (27/10/2026; não altera as outras telas) ----------
   A Dra. Luana aprova aqui (coleção "protocolos_auto"). A ponte (Claude no Mac) entrega ao robô, que protocola com o
   token A3, e devolve o andamento real. Esta tela nunca marca "protocolado" sem a resposta do robô com o número. */
let PAUTO = [], INSS_NOT = [], INSS_PED = [], PONTE = null;
PEND.inss = [];
estado.paOk = {};
ICO.robot = "M5 9h14v10H5zM12 5v4M9 13h.01M15 13h.01M9 16h6";
ICO.inss = "M3 10l9-6 9 6M5 10v9h14v-9M10 19v-5h4v5";
NAV_ITENS.splice(NAV_ITENS.findIndex(i=>i.k==="protocolo")+1, 0, {k:"protocoladas", l:"Protocoladas", ic:"robot"}, {k:"inss", l:"INSS", ic:"inss"});
MAIS_ITENS.unshift("protocoladas"); MAIS_ITENS.push("inss");
document.head.insertAdjacentHTML("beforeend", `<style>
.pa-box{grid-column:2/-1;margin-top:10px}
div.pa-box{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.pa-frm{padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.pa-frm label{display:flex;flex-direction:column;gap:4px}
.pa-frm label.chk{flex-direction:row;align-items:center;gap:8px}
</style>`);
const PA_ST = {aprovado:["warn","Aprovado · aguardando o robô"], na_fila:["info","Na fila do robô"], executando:["info","Robô protocolando"], aguardando_voce:["urg","Robô aguardando você"], protocolado:["ok","Protocolado"], conferir:["crit","Conferir no sistema"], erro:["crit","Não enviado · erro"], falta_roteiro:["warn","Falta gravar o roteiro"], cancelado:["grey","Cancelado"]};
const PA_ANDAMENTO = ["aprovado","na_fila","executando","aguardando_voce"], PA_ATENCAO = ["aguardando_voce","conferir","erro","falta_roteiro"];
const paDe = k => PAUTO.find(p=>p.id===k);
const paHist = (p, o) => ((p&&p.historico)||[]).concat([{em:new Date().toISOString(), o_que:o, por:"Dra. Luana"}]);
/* Número CNJ (Res. CNJ 65/2008): dígito verificador por módulo 97 */
function cnjValido(s){
  const d = String(s||"").replace(/\D/g,""); if (d.length!==20) return null;
  const calc = 98 - Number(BigInt(d.slice(0,7)+d.slice(9)+"00") % 97n);
  if (String(calc).padStart(2,"0")!==d.slice(7,9)) return null;
  return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16)}`;
}
function acionarPonte(){
  if (!MCP || !PONTE || !PONTE.trigger_id) return;
  MCP.callTool("Claude Code Remote","fire_trigger",{trigger_id:PONTE.trigger_id, text:"Novos protocolos aprovados no painel. Rode a ponte de protocolo."}).catch(()=>{});
}

/* Prontos p/ protocolo: bloco "Protocolar pelo robô" em cada peça */
function blocoAuto(it){
  const r = paDe(it.k), k = esc(it.k);
  if (r && r.status!=="cancelado"){ const st = PA_ST[r.status]||["grey",r.status];
    return `<div class="pa-box"><span class="tag ${st[0]}">🤖 ${esc(st[1])}</span>${r.numero?`<span class="mono">nº ${esc(r.numero)}</span>`:""}${r.mensagem?`<span class="s" style="font-size:12.5px;color:var(--muted)">${esc(r.mensagem)}</span>`:""}<button class="btn sec2" type="button" data-v="protocoladas">Ver em Protocoladas</button></div>`; }
  if (it.grupo!=="pendentes") return "";
  const d = it.d, pdf = d && d.pdf_asset;
  return `<details class="fold pa-box" id="pa-f-${k}"><summary>🤖 Protocolar pelo robô</summary><div class="pa-frm">
    ${pdf?"":'<div class="s" style="color:var(--crit);font-size:13px">Esta peça não tem PDF no painel. Peça ao Claude o PDF antes de aprovar para o robô.</div>'}
    <label class="s">Número do processo (CNJ)<input class="campo" id="pa-cnj-${k}" value="${esc(cnjValido(it.processo)||it.processo||"")}" placeholder="0000000-00.0000.0.00.0000"></label>
    <label class="s">Tipo de petição, exatamente como aparece no sistema do tribunal<input class="campo" id="pa-tipo-${k}" value="${esc((d&&(d.tipo_peticao||d.tipo))||"")}" placeholder="Ex.: Manifestação, Contrarrazões"></label>
    <label class="s chk"><input type="checkbox" data-paok="${k}" ${estado.paOk[it.k]?"checked":""}> Conferi a peça, o número do processo e o prazo</label>
    <div class="prio-sel"><button class="btn" type="button" data-pa="aprovar:${k}" ${pdf?"":"disabled"}>Aprovar e enviar ao robô</button></div>
    <div class="s" style="font-size:12.5px;color:var(--muted)">O robô protocola no seu Mac com o token A3. Se o sistema pedir o PIN, ele espera você e avisa aqui em Protocoladas.</div></div></details>`;
}
const _cardProtoBase = cardProto;
cardProto = function(it){ const html = _cardProtoBase(it), extra = blocoAuto(it); if (!extra) return html; const i = html.lastIndexOf("</article>"); return html.slice(0,i)+extra+html.slice(i); };
const _viewProtocoloBase = viewProtocolo;
viewProtocolo = function(){ return _viewProtocoloBase().replace("O protocolo no tribunal é sempre feito por você.", "Você pode protocolar por conta própria ou aprovar para o robô protocolar no seu Mac (🤖 em cada peça). Nada é enviado sem a sua aprovação."); };

/* Protocoladas */
function cardPA(p){
  const st = PA_ST[p.status]||["grey",p.status||"—"], k = esc(p.id);
  const comp = p.comprovante_url || (p.comprovante_asset ? "/_blob/"+p.comprovante_asset : "");
  const hist = (p.historico||[]).slice(-5).reverse(), cor = {ok:"ok",crit:"crit",urg:"urg",warn:"att"}[st[0]]||"blue";
  const acoes = [];
  if (p.status==="aguardando_voce") acoes.push('<span class="s" style="font-size:12.5px;color:var(--muted)">Vá ao Mac e faça o que o robô pediu; ele continua sozinho.</span>');
  if (["erro","falta_roteiro"].includes(p.status)) acoes.push(`<button class="btn" type="button" data-pa="reenviar:${k}">Tentar de novo</button>`);
  if (p.status==="conferir") acoes.push(`<input class="campo" id="pa-num-${k}" placeholder="Nº do protocolo, se entrou"><button class="btn" type="button" data-pa="entrou:${k}">Entrou</button><button class="btn warnb" type="button" data-pa="naoentrou:${k}">Não entrou: reenviar</button>`);
  if (p.status==="aprovado") acoes.push(`<button class="btn warnb" type="button" data-pa="cancelar:${k}">Cancelar envio</button>`);
  return `<article class="pr-card" style="border-left-color:var(--${cor})">
    <div class="pr-h"><div><h3>${esc(p.cliente||"—")}</h3><div class="pr-meta"><span class="tag ${p.destino==="inss"?"purple":"info"}">${p.destino==="inss"?"INSS":"Judicial"}</span>${p.processo?`<span class="mono">${esc(p.processo)}</span>`:""}${p.identificador?`<span class="mono">Req. ${esc(p.identificador)}</span>`:""}<span>${esc(p.titulo||"")}</span>${p.tipo_peticao?`<span>${esc(p.tipo_peticao)}</span>`:""}</div></div>
      <span class="tag ${st[0]}">${esc(st[1])}</span></div>
    ${p.numero?`<div class="cc-t">Protocolo nº <span class="mono">${esc(p.numero)}</span>${p.protocolado_em?` <span class="s" style="font-size:13px;color:var(--muted)">· ${quando(p.protocolado_em)}</span>`:""}</div>`:""}
    ${p.mensagem?`<div class="pr-obs">${esc(p.mensagem)}</div>`:""}
    <div class="pr-meta"><span>Aprovado ${p.aprovado_em?quando(p.aprovado_em):"—"}</span>${p.prazo?`<span>Prazo ${ddmm(p.prazo)}</span>`:""}${p.atualizado_em?`<span>Atualizado ${quando(p.atualizado_em)}</span>`:""}</div>
    ${hist.length?`<ul class="hist">${hist.map(h=>`<li><span class="mono">${quando(h.em)}</span><span>${esc(h.o_que||"")}${h.por?` <span class="s">· ${esc(h.por)}</span>`:""}</span></li>`).join("")}</ul>`:""}
    <div class="cc-a">${comp?`<a class="btn sec2" href="${esc(comp)}" target="_blank" rel="noopener">Ver comprovante</a>`:""}${p.pdf_asset?`<a class="btn sec2" href="/_blob/${esc(p.pdf_asset)}" target="_blank" rel="noopener">Ver peça</a>`:""}${p.documento_id&&DOCUMENTOS.some(d=>d.id===p.documento_id)?`<button class="btn sec2" type="button" data-opendoc="${esc(p.documento_id)}">Abrir documento</button>`:""}${p.evento_id&&byId(p.evento_id)?`<button class="btn sec2" type="button" data-open="${esc(p.evento_id)}">Tarefa</button>`:""}${acoes.join("")}</div>
  </article>`;
}
function linhaPonte(){
  if (!PONTE) return '<div class="okline">Robô no Mac: ainda não conectado. As aprovações ficam guardadas aqui e seguem para o robô assim que a ponte for instalada no Mac.</div>';
  const ok = PONTE.status==="ok";
  return `<div class="okline">Robô no Mac: <b>${ok?"conectado":PONTE.status==="robo_fechado"?"robô fechado (abra iniciar.command no Mac)":esc(PONTE.status||"—")}</b> · última verificação ${PONTE.ultima_verificacao?quando(PONTE.ultima_verificacao):"—"}</div>`;
}
const PA_GRUPOS = {andamento:p=>PA_ANDAMENTO.includes(p.status), atencao:p=>PA_ATENCAO.includes(p.status), protocoladas:p=>p.status==="protocolado", todas:()=>true};
function viewProtocoladas(){
  if (!carregado) return vazio();
  const f = estado.f_pa || "andamento";
  const l = PAUTO.filter(PA_GRUPOS[f]||PA_GRUPOS.andamento).sort((a,b)=>(b.atualizado_em||b.aprovado_em||"").localeCompare(a.atualizado_em||a.aprovado_em||""));
  const n = g => PAUTO.filter(PA_GRUPOS[g]).length;
  return cabecalho("Protocoladas","Tudo o que você aprovou para o robô: na fila, em andamento, protocolado (com número e comprovante) ou com pendência. Só aparece como protocolado o que o robô confirmou com o número do protocolo.")
  + linhaPonte()
  + `<div class="chipsbar">${[["andamento","Em andamento"],["atencao","Precisa de você"],["protocoladas","Protocoladas"],["todas","Todas"]].map(([g,t])=>`<button class="fchip${f===g?" on":""}" data-paf="${g}">${t}<span class="n">${n(g)}</span></button>`).join("")}</div>`
  + (l.length ? `<div class="aclist">${l.map(cardPA).join("")}</div>` : '<div class="empty">Nada neste filtro. Aprove peças em Prontos p/ protocolo (botão 🤖) ou na aba INSS.</div>');
}
async function marcarProtocoladoManual(p, num){
  const agora = new Date().toISOString(), txt = "Protocolado (conferido pela Dra. Luana)"+(num?" nº "+num:"");
  try { await DB.collection("protocolo").doc(p.id).set({chave:p.id, documento_id:p.documento_id||null, evento_id:p.evento_id||null, cliente:p.cliente||"", processo:p.processo||p.identificador||"", titulo:p.titulo||"", status:"protocolado", numero:num||null, em:agora, por:AUTOR||"Dra. Luana", historico:[{em:agora, o_que:txt, por:"Dra. Luana"}]}); } catch(_){}
  const d = p.documento_id && DOCUMENTOS.find(x=>x.id===p.documento_id);
  if (d && d.status!=="protocolado"){ try { await DB.collection("documentos").doc(d.id).update({status:"protocolado", protocolado_em:agora, historico:(d.historico||[]).concat([{em:agora, o_que:txt, por:"Dra. Luana"}])}); } catch(_){} }
  const e = p.evento_id && byId(p.evento_id); if (e && !e._feito) alternarFeito(e, txt+" em "+ddmm(fmtISO(hojeMS())));
}
async function paAcao(a, k, btn){
  if (!DB) return toast("Sem conexão com o banco."); if (SOMENTE_LEITURA) return toast("Seu acesso a este painel é só de leitura.");
  const agora = new Date().toISOString(), p = paDe(k), ref = DB.collection("protocolos_auto").doc(k);
  if (a==="aprovar"){
    const it = itensProtocolo().find(x=>x.k===k); if (!it) return;
    if (p && !["erro","falta_roteiro","cancelado"].includes(p.status)) return toast("Esta peça já foi enviada ao robô.");
    const g = id => (document.getElementById(id+"-"+k)?.value||"").trim();
    const cnj = cnjValido(g("pa-cnj")); if (!cnj) return toast("Número do processo inválido: confira os 20 dígitos (o dígito verificador não confere).");
    const tipo = g("pa-tipo"); if (!tipo) return toast("Informe o tipo de petição como aparece no sistema do tribunal.");
    if (!estado.paOk[k]) return toast("Marque que conferiu a peça, o número do processo e o prazo.");
    const d = it.d; if (!d || !d.pdf_asset) return toast("Esta peça não tem PDF no painel.");
    const doc = {chave:k, destino:"judicial", documento_id:d.id, evento_id:it.e?it.e.id:null, cliente:it.cliente||"", cliente_id:d.cliente_id||"", processo:cnj, tipo_peticao:tipo, titulo:it.titulo||"", prazo:it.prazo||null, pdf_asset:d.pdf_asset, status:"aprovado", confirmar_duplicado:false, reenvio_confirmado:false, mensagem:null, aprovado_em:agora, aprovado_por:AUTOR||"Dra. Luana", atualizado_em:agora, historico:paHist(p, "Aprovado para protocolo pelo robô ("+tipo+")")};
    const ok = await acao("Aprovar para o robô", "pa:"+k, ()=>ref.set(doc));
    if (ok){ delete estado.paOk[k]; toast("Aprovado. O robô no Mac protocola na próxima verificação; acompanhe em Protocoladas."); acionarPonte(); }
    return; }
  if (!p) return;
  if (a==="reenviar" && ["erro","falta_roteiro"].includes(p.status)){
    const ok = await acao("Reenviar ao robô", "par:"+k, ()=>ref.update({status:"aprovado", mensagem:null, atualizado_em:agora, historico:paHist(p, "Reenviado ao robô")}));
    if (ok){ toast("Reenviado ao robô."); acionarPonte(); } return; }
  if (a==="cancelar" && p.status==="aprovado"){
    const ok = await acao("Cancelar envio", "pac:"+k, ()=>ref.update({status:"cancelado", atualizado_em:agora, historico:paHist(p, "Envio cancelado antes de chegar ao robô")}));
    if (ok) toast("Envio cancelado."); return; }
  if (a==="entrou" && p.status==="conferir"){
    const num = (document.getElementById("pa-num-"+k)?.value||"").trim();
    const ok = await acao("Registrar protocolo conferido", "pae:"+k, ()=>ref.update({status:"protocolado", numero:num||p.numero||null, protocolado_em:agora, conferido_manual:true, atualizado_em:agora, historico:paHist(p, "Conferido: a peça entrou"+(num?" (nº "+num+")":""))}));
    if (ok){ await marcarProtocoladoManual(p, num||p.numero||""); toast("Registrado como protocolado."); } return; }
  if (a==="naoentrou" && p.status==="conferir"){
    if (!btn.dataset.conf){ btn.dataset.conf = "1"; btn.textContent = "Confirmo: NÃO entrou, reenviar"; setTimeout(()=>{ if (btn.isConnected){ delete btn.dataset.conf; btn.textContent = "Não entrou: reenviar"; } },6000); return; }
    const ok = await acao("Reenviar após conferência", "pan:"+k, ()=>ref.update({status:"aprovado", reenvio_confirmado:true, mensagem:null, atualizado_em:agora, historico:paHist(p, "Conferido: a peça NÃO entrou. Reenviada ao robô")}));
    if (ok){ toast("Reenviado ao robô."); acionarPonte(); } return; }
}

/* INSS: exigências e notificações (lidas pelo robô no Meu INSS) e protocolos */
function cardInss(n){
  const k = esc(n.id), dc = n.prazo ? diasCorridos(n.prazo) : null, hot = dc!==null && dc<=5;
  return `<article class="pr-card" style="border-left-color:var(--${n.lida?"grey":hot?"crit":"purple"})">
    <div class="pr-h"><div><h3>${esc(n.servico||"Requerimento")}</h3><div class="pr-meta">${n.requerimento?`<span class="mono">Req. ${esc(n.requerimento)}</span>`:""}${n.cliente?`<span>${esc(n.cliente)}</span>`:""}${n.situacao?`<span>${esc(n.situacao)}</span>`:""}<span>${esc(n.origem||"Meu INSS")}${n.capturado_em?" · "+quando(n.capturado_em):""}</span></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${n.prazo||n.prazo_txt?`<span class="tag ${hot?"crit":"warn"}">Prazo ${n.prazo?ddmm(n.prazo):esc(n.prazo_txt)}</span>`:""}${n.lida?'<span class="tag grey">lida</span>':'<span class="tag purple">nova</span>'}</div></div>
    ${n.exigencia?`<div class="pr-obs"><b>Exigência:</b> ${esc(n.exigencia)}</div>`:""}
    <div class="cc-a"><button class="btn" type="button" data-inss="preparar:${k}">Preparar cumprimento com o Claude</button><button class="btn sec2" type="button" data-inss="protocolar:${k}">Protocolar documento</button>${n.lida?"":`<button class="btn sec2" type="button" data-inss="lida:${k}">Marcar como lida</button>`}</div></article>`;
}
function viewInss(){
  if (!carregado) return vazio();
  const porPrazo = (a,b)=>(a.prazo||"9999").localeCompare(b.prazo||"9999") || (b.capturado_em||"").localeCompare(a.capturado_em||"");
  const novas = INSS_NOT.filter(n=>!n.lida).sort(porPrazo), lidas = INSS_NOT.filter(n=>n.lida).sort(porPrazo);
  const ped = INSS_PED.slice().sort((a,b)=>(b.criado_em||"").localeCompare(a.criado_em||""))[0];
  const emCurso = ped && ["pendente","executando","aguardando_voce"].includes(ped.status);
  const PED_ST = {pendente:"pedida, aguardando o robô", executando:"robô consultando", aguardando_voce:"robô aguardando você", concluida:"concluída", erro:"falhou"};
  const protos = PAUTO.filter(p=>p.destino==="inss").sort((a,b)=>(b.atualizado_em||"").localeCompare(a.atualizado_em||""));
  const pre = estado.inssPre || {};
  return cabecalho("INSS","Exigências, comunicados e andamentos dos requerimentos, lidos pelo robô no Meu INSS com o seu login gov.br, e os protocolos que você aprovar para o INSS. Nada é enviado ao INSS sem a sua aprovação.")
  + linhaPonte()
  + `<div class="okline" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span>Última consulta: <b>${ped?esc(PED_ST[ped.status]||ped.status):"nenhuma ainda"}</b>${ped&&ped.criado_em?" · "+quando(ped.criado_em):""}${ped&&ped.mensagem?" · "+esc(ped.mensagem):""}${ped&&ped.status==="concluida"&&ped.total!=null?" · "+esc(ped.total)+" item(ns)":""}</span><button class="btn" type="button" data-inss="consultar:-" ${emCurso?"disabled":""} style="margin-left:auto">${emCurso?"Consulta em andamento…":"Consultar o INSS agora"}</button></div>`
  + `<section class="sec"><div class="sec-h"><h2>1. Exigências e notificações</h2><span class="c">${novas.length}</span><span class="note">ordem de prazo</span></div>${novas.length?`<div class="aclist">${novas.map(cardInss).join("")}</div>`:'<div class="okline">Nenhuma exigência ou notificação nova.</div>'}
    ${lidas.length?`<details class="fold" id="inss-lidas"><summary>Já lidas<span class="c">${lidas.length}</span></summary><div class="aclist" style="padding:12px">${lidas.map(cardInss).join("")}</div></details>`:""}</section>`
  + `<section class="sec" id="inss-protocolar"><div class="sec-h"><h2>2. Protocolar no INSS pelo robô</h2></div>
    <form class="frm" id="inss-form"><h3>Documento para o INSS</h3>
      <label for="inss-cli" style="position:absolute;left:-9999px">Cliente</label><input id="inss-cli" list="dl-cli3" placeholder="Cliente" value="${esc(pre.cliente||"")}">
      <label for="inss-req" style="position:absolute;left:-9999px">Requerimento</label><input id="inss-req" placeholder="Nº do requerimento ou protocolo no INSS" value="${esc(pre.requerimento||"")}">
      <label for="inss-tipo" style="position:absolute;left:-9999px">Tipo</label><select id="inss-tipo">${["Cumprimento de exigência","Juntada de documento"].map(x=>`<option ${x===(pre.tipo||"")?"selected":""}>${x}</option>`).join("")}</select>
      <div class="full"><input type="file" id="file-inss" data-file="inss" accept=".pdf,application/pdf"><div class="chips" id="chips-inss">${chipsHTML("inss")}</div></div>
      <label class="full s" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="inss-ok"> Conferi o documento, o cliente e o número do requerimento</label>
      <div class="full" style="display:flex;justify-content:flex-end"><button class="btn" type="submit">Aprovar e enviar ao robô</button></div></form>
    <datalist id="dl-cli3">${CLIENTES.map(c=>`<option value="${esc(c.nome)}">`).join("")}</datalist></section>`
  + `<section class="sec"><div class="sec-h"><h2>3. Protocolos no INSS</h2><span class="c">${protos.length}</span><button class="ghost" data-v="protocoladas" style="margin-left:auto">Abrir Protocoladas</button></div>${protos.length?`<div class="aclist">${protos.slice(0,10).map(cardPA).join("")}</div>`:'<div class="okline">Nenhum protocolo no INSS ainda.</div>'}</section>`
  + `<details class="fold" id="inss-como"><summary>Como funciona e o que falta configurar</summary><div style="padding:12px 16px;font-size:13.5px;display:flex;flex-direction:column;gap:6px">
      <div>O robô roda no seu Mac e entra no INSS com o seu próprio login gov.br, no mesmo navegador em que você já acessa. Se o gov.br pedir confirmação no celular ou captcha, ele espera você (o aviso aparece aqui).</div>
      <div><b>Antes do primeiro uso:</b> gravar dois roteiros no Mac com o gravador do robô, fazendo uma vez o caminho real: <span class="mono">inss-consulta</span> (abrir a lista de pedidos com exigência) e <span class="mono">inss-exigencia</span> (anexar o documento e enviar).</div>
      <div>Os dados do INSS ficam só neste painel, que exige acesso de editora ou dona para ser lido.</div></div></details>`;
}
async function inssAcao(a, k){
  if (!DB) return toast("Sem conexão com o banco."); if (SOMENTE_LEITURA) return toast("Seu acesso a este painel é só de leitura.");
  const agora = new Date().toISOString(), n = INSS_NOT.find(x=>x.id===k);
  if (a==="consultar"){
    if (INSS_PED.some(p=>["pendente","executando","aguardando_voce"].includes(p.status))) return toast("Já há uma consulta em andamento.");
    const id = "ped-"+Date.now().toString(36);
    const ok = await acao("Pedir consulta ao INSS", "inssc", ()=>DB.collection("inss_pedidos").doc(id).set({tipo:"consulta", status:"pendente", criado_em:agora, por:AUTOR||"Dra. Luana"}));
    if (ok){ toast("Consulta pedida. O robô no Mac consulta o INSS na próxima verificação."); acionarPonte(); } return; }
  if (!n) return;
  if (a==="lida"){ const ok = await acao("Marcar como lida", "inssl:"+k, ()=>DB.collection("inss_notificacoes").doc(k).update({lida:true, lida_em:agora})); if (ok) toast("Marcada como lida."); return; }
  if (a==="protocolar"){ estado.inssPre = {cliente:n.cliente||"", requerimento:n.requerimento||"", tipo:"Cumprimento de exigência"}; render(); document.getElementById("inss-protocolar")?.scrollIntoView({behavior:"smooth", block:"start"}); return; }
  if (a==="preparar"){
    criarOrdem("livre", `Preparar o cumprimento da exigência do INSS (requerimento ${n.requerimento||"não informado"}, ${n.servico||""}): "${n.exigencia||""}", prazo ${n.prazo?ddmm(n.prazo):(n.prazo_txt||"não informado")}. Identificar o cliente pelo requerimento no cadastro (se não houver vínculo, perguntar à Dra. Luana), listar os documentos necessários, redigir a mensagem pronta ao cliente pedindo o que faltar (campo msg, sem enviar) e, quando couber, preparar o requerimento ou petição no timbrado com para_protocolo:true. Não enviar nem protocolar.`, null, [], {cliente:n.cliente||"", inss_notificacao_id:k});
  }
}
async function inssProtocolar(form){
  if (!DB) return toast("Sem conexão com o banco."); if (SOMENTE_LEITURA) return toast("Seu acesso a este painel é só de leitura.");
  const g = id => (document.getElementById(id)?.value||"").trim();
  const req = g("inss-req").replace(/\s/g,""), cli = g("inss-cli"), tipo = g("inss-tipo");
  if (!req) return toast("Informe o número do requerimento ou protocolo do INSS.");
  const pdfs = PEND.inss.filter(f=>tipoDe(f)==="application/pdf");
  if (pdfs.length!==1 || PEND.inss.length!==1) return toast("Escolha um único arquivo PDF.");
  if (!document.getElementById("inss-ok")?.checked) return toast("Marque que conferiu o documento, o cliente e o requerimento.");
  const b = form.querySelector("button[type=submit]"); b.disabled = true;
  const nome = pdfs[0].name; const anx = await enviarArquivos("inss"); if (!anx || !anx.length){ b.disabled = false; return; }
  const c = CLIENTES.find(x=>x.nome.toLowerCase()===cli.toLowerCase()), agora = new Date().toISOString(), id = "inss-"+Date.now().toString(36);
  const doc = {chave:id, destino:"inss", identificador:req, tipo_peticao:tipo, cliente:c?c.nome:cli, cliente_id:c?c.id:"", titulo:nome.replace(/\.pdf$/i,""), pdf_asset:anx[0].id, status:"aprovado", confirmar_duplicado:false, reenvio_confirmado:false, aprovado_em:agora, aprovado_por:AUTOR||"Dra. Luana", atualizado_em:agora, historico:[{em:agora, o_que:"Aprovado para protocolo no INSS ("+tipo+")", por:"Dra. Luana"}]};
  const ok = await acao("Aprovar protocolo no INSS", "inssp:"+id, ()=>DB.collection("protocolos_auto").doc(id).set(doc));
  b.disabled = false;
  if (ok){ form.reset(); estado.inssPre = null; toast("Aprovado. O robô no Mac protocola no INSS na próxima verificação."); acionarPonte(); render(); }
}
const _contNavPA = contNav;
contNav = function(T){ const c = _contNavPA(T);
  try { c.protocoladas = PAUTO.filter(p=>PA_ATENCAO.includes(p.status)).length; } catch(_){ c.protocoladas = 0; }
  try { c.inss = INSS_NOT.filter(n=>!n.lida).length; } catch(_){ c.inss = 0; }
  return c; };
document.addEventListener("click", ev => {
  const t = ev.target; if (!t.closest) return;
  const pf = t.closest("[data-paf]"); if (pf){ estado.f_pa = pf.dataset.paf; render(); return; }
  const b = t.closest("[data-pa]"); if (b){ const v = b.dataset.pa, i = v.indexOf(":"); b.disabled = true; paAcao(v.slice(0,i), v.slice(i+1), b).finally(()=>{ if (b.isConnected) b.disabled = false; }); return; }
  const n = t.closest("[data-inss]"); if (n){ const v = n.dataset.inss, i = v.indexOf(":"); n.disabled = true; inssAcao(v.slice(0,i), v.slice(i+1)).finally(()=>{ if (n.isConnected) n.disabled = false; }); return; }
});
document.addEventListener("change", ev => { const k = ev.target.dataset && ev.target.dataset.paok; if (k) estado.paOk[k] = ev.target.checked; });
document.addEventListener("submit", ev => { if (ev.target.id==="inss-form"){ ev.preventDefault(); inssProtocolar(ev.target); } });

