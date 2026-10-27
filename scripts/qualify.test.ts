import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProtocol,
  buildLeadReport,
  buildOfficeOpener,
  caseSummary,
  disqualification,
  normalizeWhatsApp,
  qualify,
  visibleQuestions,
} from '../src/funnel/qualify';
import { QUIZ_LENGTH } from '../src/funnel/questions';

test('ex-empregada há menos de 1 ano, bebê nascido e sem pedido é lead quente', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'clt', semContribuir: 'menos1', pedidoInss: 'naoPediu' });
  assert.equal(r.qualified, true);
  assert.equal(r.caseType, 'desempregada');
  assert.equal(r.tier, 'quente');
  assert.match(buildProtocol(r, () => 0), /^SM-DEA-AAAA$/);
});

test('barra cada caso inviável antes de pedir dados pessoais', () => {
  assert.equal(disqualification({ momento: 'mais5' }), 'prazo');
  assert.equal(disqualification({ momento: 'nasceu', vinculo: 'nenhum' }), 'semVinculo');
  assert.equal(disqualification({ momento: 'gravida', vinculo: 'cltAtiva' }), 'empregada');
  assert.equal(disqualification({ momento: 'nasceu', vinculo: 'clt', semContribuir: 'mais3' }), 'semQualidade');
  assert.equal(disqualification({ pedidoInss: 'recebeu' }), 'jaRecebeu');
});

test('todo caminho que chega ao formulário tem exatamente QUIZ_LENGTH perguntas', () => {
  assert.equal(QUIZ_LENGTH, 4);
  const ids = (a: Parameters<typeof visibleQuestions>[0]) => visibleQuestions(a).map((q) => q.id);
  assert.deepEqual(ids({ vinculo: 'clt' }), ['momento', 'vinculo', 'semContribuir', 'pedidoInss']);
  assert.deepEqual(ids({ vinculo: 'contribuinte' }), ['momento', 'vinculo', 'semContribuir', 'pedidoInss']);
  assert.deepEqual(ids({ vinculo: 'rural' }), ['momento', 'vinculo', 'provasRurais', 'pedidoInss']);
});

test('indeferimento, período de graça e carência geram alertas para a equipe', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'clt', semContribuir: '1a2', pedidoInss: 'negado' });
  assert.ok(r.flags.some((f) => f.includes('indeferimento')));
  assert.ok(r.flags.some((f) => /período de graça/i.test(f)));
  const ci = qualify({ momento: 'gravida', vinculo: 'contribuinte', semContribuir: 'contribuindo', pedidoInss: 'naoPediu' });
  assert.ok(ci.flags.some((f) => f.includes('carência')));
});

test('rural sem documentos continua qualificada, com prioridade menor', () => {
  const r = qualify({ momento: 'nasceu', vinculo: 'rural', provasRurais: 'nao', pedidoInss: 'naoPediu' });
  assert.equal(r.qualified, true);
  assert.equal(r.caseType, 'rural');
  assert.notEqual(r.tier, 'quente');
});

test('resumo vai para a equipe e a primeira mensagem é do escritório, sem dados internos', () => {
  const contact = { nome: 'Maria Silva', whatsapp: '11912345678', cidade: 'Campinas', uf: 'SP' };
  const answers = { momento: 'gravida', vinculo: 'contribuinte', semContribuir: 'contribuindo', pedidoInss: 'naoPediu' };
  const resumo = caseSummary(contact, answers);
  assert.match(resumo, /• Trabalho: Pagava o INSS por conta própria/);
  assert.match(resumo, /Campinas\/SP/);
  const opener = buildOfficeOpener(contact, 'SM-CIA-K7Q2');
  assert.match(opener, /^Olá, Maria! Aqui é da G1 Auxílios Previdenciários\./);
  assert.match(opener, /protocolo SM-CIA-K7Q2/);
  assert.doesNotMatch(opener + resumo, /quente|pontua|alerta/i);
});

test('relatório traz cliente, prioridade, alertas e documentos do perfil', () => {
  const contact = { nome: 'Joana Lima', whatsapp: '31991234567', cidade: 'Belo Horizonte', uf: 'MG' };
  const answers = { momento: 'nasceu', vinculo: 'rural', provasRurais: 'algumas', pedidoInss: 'negado' };
  const result = qualify(answers);
  const report = buildLeadReport({ contact, answers, result, protocol: 'SM-RUA-TEST', createdAt: new Date('2026-10-27T15:00:00Z'), origin: 'MetaADS' });
  assert.match(report, /RELATÓRIO DE TRIAGEM — SM-RUA-TEST/);
  assert.match(report, /WhatsApp: \(31\) 99123-4567/);
  assert.match(report, /Perfil: .*rural/);
  assert.match(report, /Prioridade: A/);
  assert.match(report, /Autodeclaração rural/);
  assert.match(report, /Carta de indeferimento/);
  assert.match(report, /Origem do clique: MetaADS/);
});

test('valida celular brasileiro', () => {
  assert.equal(normalizeWhatsApp('(11) 91234-5678'), '11912345678');
  assert.equal(normalizeWhatsApp('+55 21 99876-5432'), '21998765432');
  assert.equal(normalizeWhatsApp('(11) 3123-4567'), null);
  assert.equal(normalizeWhatsApp('(05) 91234-5678'), null);
});
