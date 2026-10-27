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

test('execução com atraso longo e pai CLT é lead quente', () => {
  const r = qualify({
    situacao: 'execucao', titulo: 'judicial', atraso: 'mais3', idade: 'menor',
    renda: 'clt', advogado: 'nao', honorarios: 'sim',
  });
  assert.equal(r.qualified, true);
  assert.equal(r.caseType, 'execucao');
  assert.equal(r.tier, 'quente');
  assert.match(buildProtocol(r, () => 0), /^PA-EXA-AAAA$/);
});

test('acordo informal vira ação de alimentos, não execução', () => {
  const r = qualify({ situacao: 'execucao', titulo: 'informal', atraso: '1a3', advogado: 'nao', honorarios: 'sim' });
  assert.equal(r.caseType, 'fixacao');
  assert.ok(r.flags.some((f) => f.includes('sem homologação')));
});

test('quem já tem advogado e quer continuar é desqualificado', () => {
  assert.equal(disqualification({ advogado: 'sim' }), 'representado');
  assert.equal(qualify({ situacao: 'fixacao', advogado: 'sim' }).qualified, false);
});

test('sem condição de pagar honorários é encaminhado à Defensoria', () => {
  assert.equal(disqualification({ advogado: 'nao', honorarios: 'nao' }), 'gratuidade');
});

test('gestante pula a pergunta de idade e responde no máximo 6 perguntas', () => {
  const g = visibleQuestions({ situacao: 'gravidez' }).map((q) => q.id);
  assert.ok(g.includes('gestacao') && g.includes('indicios') && !g.includes('idade'));
  assert.ok(g.length <= 6);
  assert.ok(visibleQuestions({ situacao: 'fixacao' }).length <= 5);
});

test('gestante no fim da gravidez é urgente e quente', () => {
  const r = qualify({ situacao: 'gravidez', gestacao: '7mais', indicios: 'sim', renda: 'clt', advogado: 'nao', honorarios: 'sim' });
  assert.equal(r.tier, 'quente');
  assert.ok(r.flags.some((f) => f.startsWith('URGENTE')));
});

test('caso fraco fica frio, mas continua qualificado', () => {
  const r = qualify({ situacao: 'revisao', idade: 'maior', renda: 'desempregado', advogado: 'nao', honorarios: 'valores' });
  assert.equal(r.qualified, true);
  assert.equal(r.tier, 'frio');
});

test('mensagem do WhatsApp traz protocolo e respostas, sem pontuação interna', () => {
  const answers = { situacao: 'execucao', titulo: 'judicial', atraso: 'mais3', idade: 'menor', renda: 'clt', advogado: 'nao', honorarios: 'sim' };
  const msg = buildWhatsAppMessage({ nome: 'Maria Silva', whatsapp: '11912345678', cidade: 'Campinas', uf: 'SP' }, answers, 'PA-EXA-K7Q2');
  assert.match(msg, /Protocolo: PA-EXA-K7Q2/);
  assert.match(msg, /• Atraso: Mais de 3 meses/);
  assert.doesNotMatch(msg, /Já tem advogado|Atendimento particular/);
  assert.match(msg, /Campinas\/SP/);
  assert.doesNotMatch(msg, /quente|pontua/i);
});

test('valida celular brasileiro', () => {
  assert.equal(normalizeWhatsApp('(11) 91234-5678'), '11912345678');
  assert.equal(normalizeWhatsApp('+55 21 99876-5432'), '21998765432');
  assert.equal(normalizeWhatsApp('(11) 3123-4567'), null);
  assert.equal(normalizeWhatsApp('(05) 91234-5678'), null);
});
