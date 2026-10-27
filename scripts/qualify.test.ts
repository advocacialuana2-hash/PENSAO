import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProtocol,
  buildWhatsAppMessage,
  disqualification,
  normalizeWhatsApp,
  qualify,
  visibleQuestions,
} from '../src/funnel/qualify';

test('ex-empregada há menos de 1 ano, bebê nascido e sem pedido é lead quente', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'clt', empregoAtual: 'saiu', semContribuir: 'menos1', pedidoInss: 'naoPediu', advogado: 'nao' });
  assert.equal(r.qualified, true);
  assert.equal(r.caseType, 'desempregada');
  assert.equal(r.tier, 'quente');
  assert.match(buildProtocol(r, () => 0), /^SM-DEA-AAAA$/);
});

test('barra cada caso inviável antes de pedir dados pessoais', () => {
  assert.equal(disqualification({ momento: 'mais5' }), 'prazo');
  assert.equal(disqualification({ momento: 'nasceu', vinculo: 'nenhum' }), 'semVinculo');
  assert.equal(disqualification({ momento: 'gravida', vinculo: 'clt', empregoAtual: 'sim' }), 'empregada');
  assert.equal(disqualification({ momento: 'nasceu', vinculo: 'clt', empregoAtual: 'saiu', semContribuir: 'mais3' }), 'semQualidade');
  assert.equal(disqualification({ pedidoInss: 'recebeu' }), 'jaRecebeu');
  assert.equal(disqualification({ advogado: 'sim' }), 'representado');
});

test('cada perfil vê só as perguntas que importam, no máximo 6', () => {
  const ids = (a: Parameters<typeof visibleQuestions>[0]) => visibleQuestions(a).map((q) => q.id);
  const clt = ids({ vinculo: 'clt', empregoAtual: 'saiu' });
  assert.ok(clt.includes('semContribuir') && !clt.includes('contribuicoes') && !clt.includes('provasRurais'));
  const ci = ids({ vinculo: 'contribuinte' });
  assert.ok(ci.includes('contribuicoes') && ci.includes('semContribuir') && !ci.includes('empregoAtual'));
  const rural = ids({ vinculo: 'rural' });
  assert.ok(rural.includes('provasRurais') && !rural.includes('semContribuir'));
  for (const list of [clt, ci, rural]) assert.ok(list.length <= 6);
});

test('indeferimento e prorrogação do período de graça geram alertas para a equipe', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'clt', empregoAtual: 'demitidaGravida', semContribuir: '1a2', pedidoInss: 'negado', advogado: 'nao' });
  assert.ok(r.flags.some((f) => f.includes('indeferimento')));
  assert.ok(r.flags.some((f) => /período de graça/i.test(f)));
  assert.ok(r.flags.some((f) => f.includes('estabilidade')));
});

test('rural sem documentos continua qualificada, com prioridade menor', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'rural', provasRurais: 'nao', pedidoInss: 'naoPediu', advogado: 'nao' });
  assert.equal(r.qualified, true);
  assert.equal(r.caseType, 'rural');
  assert.notEqual(r.tier, 'quente');
});

test('mensagem do WhatsApp traz protocolo e respostas, sem dados internos', () => {
  const answers = { momento: 'gravida', vinculo: 'contribuinte', semContribuir: 'contribuindo', contribuicoes: '10mais', pedidoInss: 'naoPediu', advogado: 'nao' };
  const msg = buildWhatsAppMessage({ nome: 'Maria Silva', whatsapp: '11912345678', cidade: 'Campinas', uf: 'SP' }, answers, 'SM-CIA-K7Q2');
  assert.match(msg, /Protocolo: SM-CIA-K7Q2/);
  assert.match(msg, /• Meses pagos ao INSS: 10 meses ou mais/);
  assert.match(msg, /Campinas\/SP/);
  assert.doesNotMatch(msg, /advogado|quente|pontua/i);
});

test('valida celular brasileiro', () => {
  assert.equal(normalizeWhatsApp('(11) 91234-5678'), '11912345678');
  assert.equal(normalizeWhatsApp('+55 21 99876-5432'), '21998765432');
  assert.equal(normalizeWhatsApp('(11) 3123-4567'), null);
  assert.equal(normalizeWhatsApp('(05) 91234-5678'), null);
});
