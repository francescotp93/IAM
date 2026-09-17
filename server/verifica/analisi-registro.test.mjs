// ═══════════════════════════════════════════════════════════════════════════════
//  IL REGISTRO DELLE ANALISI PREVIDENZIALI — preparaRiga, la parte pura
//
//  Il server accetta una riga solo se porta la versione delle regole, il
//  risultato, i parametri usati e — dal 17/09/2026 — il cliente dell'anagrafica.
//  Chi salva e' sempre chi ha il token, mai chi lo scrive nel corpo.
// ═══════════════════════════════════════════════════════════════════════════════
import { preparaRiga, LIMITE_BYTE } from '../analisiPrevidenziali.js';

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const UTENTE = { id: '00000000-0000-4000-8000-000000000001', email: 'x@y.it' };
const ANAG = '11111111-1111-4111-8111-111111111111';
const buona = () => ({ riga: { anagrafica_id: ANAG, titolo: 'Pensione · Mario Rossi', versione_motore: 'pensione-2026-09-17',
  risultato: { gap: 1 }, parametri_usati: { legge: {} }, dati: {}, creato_da: 'ffffffff-ffff-4fff-8fff-ffffffffffff' } });

prova('una riga completa passa, e chi salva e\' chi ha il token, non chi lo scrive nel corpo', () => {
  const r = preparaRiga(buona(), UTENTE);
  deve(r.ok, r.errore);
  deve(r.riga.creato_da === UTENTE.id, 'creato_da preso dal corpo: ' + r.riga.creato_da);
  deve(r.riga.anagrafica_id === ANAG, 'anagrafica persa');
  return 'creato_da = token, anagrafica conservata';
});
prova('senza il cliente dell\'anagrafica la riga si rifiuta, e dice cosa fare', () => {
  for (const v of [undefined, null, '', 'Mario Rossi', 'a1']) {
    const c = buona(); c.riga.anagrafica_id = v;
    const r = preparaRiga(c, UTENTE);
    deve(!r.ok && /anagrafica/i.test(r.errore), 'anagrafica_id=' + JSON.stringify(v) + ' e\' passato');
  }
  return 'cinque valori non validi, cinque rifiuti motivati';
});
prova('senza versione del motore, risultato o parametri usati non si archivia', () => {
  for (const campo of ['versione_motore', 'risultato', 'parametri_usati']) {
    const c = buona(); delete c.riga[campo];
    deve(!preparaRiga(c, UTENTE).ok, 'manca ' + campo + ' e passa');
  }
  deve(!preparaRiga({}, UTENTE).ok && !preparaRiga(buona(), { id: 'x' }).ok, 'corpo vuoto o utente senza uuid passano');
  return 'tre campi obbligatori, piu\' corpo e utente';
});
prova('una riga troppo grande non si archivia', () => {
  const c = buona(); c.riga.dati = { zavorra: 'x'.repeat(LIMITE_BYTE + 10) };
  const r = preparaRiga(c, UTENTE);
  deve(!r.ok && /grande/i.test(r.errore), 'la zavorra e\' passata');
  return 'oltre ' + Math.round(LIMITE_BYTE / 1024) + ' KB si rifiuta';
});

console.log('\n══ REGISTRO ANALISI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nREGISTRO ANALISI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
