// ═══════════════════════════════════════════════════════════════════════════════
//  LE TRATTATIVE — tariffe/motore/trattative.js  (08/10/2026)
//
//  Le prove che, se saltano, producono un grafico che conta come
//  zero un valore mai scritto, o un prospect con un codice fiscale sbagliato.
//
//  Codici fiscali e partite IVA costruiti qui col carattere di controllo
//  calcolato: nessuna persona vera (§8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const T = require('../../tariffe/motore/trattative.js');
const A = require('../../tariffe/motore/anagrafica.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const cf = q => q + A.controllo(q);
/* Una partita IVA valida: dieci cifre e la cifra di controllo calcolata. */
function piva(dieci) {
  let s = 0;
  for (let i = 0; i < 10; i++) { let d = +dieci[i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } s += d; }
  return dieci + ((10 - s % 10) % 10);
}

prova('la pipeline ha le sue tappe, nell’ordine, e una tappa vuota resta al suo posto', () => {
  const f = T.fasiCorso([
    { status: 'trattativa', importo: 300 },
    { status: 'prospect', premio_lordo: 100 },
    { status: 'prospect', importo: 0 },
    { status: 'chiusa', importo: 999 },
    { status: 'persa', importo: 999 }
  ]);
  deve(f.map(x => x.stato).join() === 'prospect,preventivo,trattativa', 'tappe: ' + f.map(x => x.stato).join());
  deve(f[0].valore === 100 && f[0].n === 2 && f[0].senzaValore === 1, 'prospect: ' + JSON.stringify(f[0]));
  deve(f[1].n === 0 && f[1].valore === 0, 'il preventivo vuoto è sparito');
  deve(f.reduce((a, x) => a + x.valore, 0) === 400, 'le decise sono entrate nella pipeline');
  /* `aperta` è il valore di partenza della colonna: compare solo se c'è. */
  deve(T.fasiCorso([{ status: 'aperta', importo: 5 }]).some(x => x.stato === 'aperta'), 'una «aperta» è sparita');
  return 'prospect 100 (1 senza premio), preventivo 0, trattativa 300';
});

prova('il richiamo si dice in giorni, contati sulle date e non sull’orologio', () => {
  const r = s => T.richiamoStato({ status: 'prospect', recall: s }, '2026-10-08');
  deve(r('2026-10-08').oggi && r('2026-10-08').etichetta === 'oggi', 'oggi');
  deve(r('2026-10-09').etichetta === 'domani', 'domani');
  deve(r('2026-10-15').etichetta === 'tra 7 giorni', r('2026-10-15').etichetta);
  deve(r('2026-10-06').scaduto && r('2026-10-06').etichetta === 'scaduto da 2 giorni', 'scaduto');
  /* Il cambio dell'ora legale (25/10/2026) non sposta un giorno. */
  deve(T.giorniA('2026-10-26', '2026-10-24') === 2, 'ora legale: ' + T.giorniA('2026-10-26', '2026-10-24'));
  deve(T.richiamoStato({ status: 'chiusa', recall: '2026-09-01' }, '2026-10-08') === null, 'una vinta si richiama');
  deve(T.richiamoStato({ status: 'prospect', recall: 'domani' }, '2026-10-08') === null, 'una data inventata');
  return 'oggi, domani, tra 7, scaduto da 2';
});

prova('il riepilogo separa in corso, vinte e perse, e non conta lo zero', () => {
  const r = T.riepilogo([
    { status: 'prospect', prodotto: 'RC Auto', premio_lordo: 500, prob: 50 },
    { status: 'trattativa', prodotto: 'RC Auto', importo: 300, prob: 100 },
    { status: 'aperta', prodotto: 'Casa', importo: 0 },
    { status: 'chiusa', prodotto: 'Casa', premio_lordo: 400 },
    { status: 'persa', prodotto: 'Vita', importo: 1000 }
  ]);
  deve(r.corso.valore === 800 && r.corso.n === 3 && r.corso.senzaValore === 1, 'in corso: ' + JSON.stringify(r.corso));
  deve(r.corso.ponderato === 550, 'ponderato ' + r.corso.ponderato);
  deve(r.vinte.valore === 400 && r.perse.valore === 1000, 'vinte/perse mescolate');
  deve(r.corso.perStato && r.corso.perStato.map(x => x.stato).join() === 'prospect,preventivo,trattativa,aperta', 'il riepilogo non porta le tappe');
  deve(r.corso.perProdotto[0].nome === 'RC Auto' && r.corso.perProdotto[0].valore === 800, 'per prodotto');
  const casa = r.corso.perProdotto.find(g => g.nome === 'Casa');
  deve(casa && casa.valore === 0 && casa.senzaValore === 1, 'la casa senza valore non si dichiara');
  deve(r.tassoChiusura === 50, 'tasso ' + r.tassoChiusura);
  return '800 in corso (550 ponderato), 400 vinte, 1000 perse';
});

prova('da zero trattative decise non si fa una percentuale', () => {
  deve(T.riepilogo([{ status: 'prospect', importo: 10 }]).tassoChiusura === null, 'percentuale da zero');
});

prova('oltre sei prodotti, il resto diventa «Altri» e torna col totale', () => {
  const l = Array.from({ length: 10 }, (_, i) => ({ status: 'prospect', prodotto: 'P' + i, importo: 100 + i }));
  const g = T.perProdotto(l, 6);
  deve(g.length === 6 && g[5].altri && /Altri 5/.test(g[5].nome), JSON.stringify(g.map(x => x.nome)));
  const tot = g.reduce((a, x) => a + x.valore, 0);
  deve(Math.abs(tot - l.reduce((a, t) => a + t.importo, 0)) < 1e-9, 'i gruppi non tornano col totale');
});

prova('il prodotto si raggruppa senza badare alle maiuscole', () => {
  const g = T.perProdotto([{ prodotto: 'rc auto', importo: 1 }, { prodotto: 'RC Auto', importo: 2 }]);
  deve(g.length === 1 && g[0].valore === 3, JSON.stringify(g));
});

prova('il prospect fast: CF valido o niente', () => {
  const ok = T.prospettoFast({ tipo: 'fisica', nome: 'Mario', cognome: 'Prova', codice_fiscale: cf('PRVMRA80A01H501') }, 'u1');
  deve(ok.ok && ok.riga.lead === true && ok.riga.nominativo === 'PROVA MARIO' && ok.riga.creato_da === 'u1', JSON.stringify(ok));
  const no = T.prospettoFast({ tipo: 'fisica', nome: 'Mario', cognome: 'Prova', codice_fiscale: 'PRVMRA80A01H501A' });
  deve(!no.ok && /codice fiscale/.test(no.errori.join(' ')), 'un CF con il carattere sbagliato è passato');
  return 'controllo sul carattere finale';
});

prova('il prospect fast: società con partita IVA valida', () => {
  const p = piva('0123456789');
  deve(T.pivaValida(p), 'la mia partita IVA di prova non è valida');
  const ok = T.prospettoFast({ tipo: 'giuridica', ragione_sociale: 'Prova srl', partita_iva: p });
  deve(ok.ok && ok.riga.tipo === 'giuridica' && ok.riga.partita_iva === p, JSON.stringify(ok));
  const sbagliata = p.slice(0, 10) + ((+p[10] + 1) % 10);
  deve(!T.prospettoFast({ tipo: 'giuridica', ragione_sociale: 'X', partita_iva: sbagliata }).ok, 'P.IVA sbagliata accettata');
});

prova('una trattativa che aspetta l’autorizzazione non si chiude vinta', () => {
  deve(!T.chiudibile({ status: 'chiusa', richiede_autorizzazione: true, autorizzazione_stato: 'in_attesa' }).ok, 'in attesa chiusa');
  deve(!T.chiudibile({ status: 'chiusa', richiede_autorizzazione: true, autorizzazione_stato: 'negata' }).ok, 'negata chiusa');
  deve(T.chiudibile({ status: 'chiusa', richiede_autorizzazione: true, autorizzazione_stato: 'concessa' }).ok, 'concessa rifiutata');
  deve(T.chiudibile({ status: 'persa', richiede_autorizzazione: true, autorizzazione_stato: 'in_attesa' }).ok, 'una persa non si può segnare');
});

prova('il richiamo in agenda ha un id stabile e la data della trattativa', () => {
  const r = T.richiamo({ id: 42, cliente: 'Prova', prodotto: 'Casa', recall: '2026-10-20', recall_ora: '10:30' });
  deve(r.id === 'tratt-42' && r.data === '2026-10-20' && r.ora === '10:30' && /Prova/.test(r.titolo), JSON.stringify(r));
  deve(T.richiamo({ id: 1 }) === null && T.richiamo({ id: 1, recall: 'domani' }) === null, 'richiamo inventato');
});

let ok = 0;
for (const e of esiti) {
  try { const r = e.fn(); ok++; console.log('✅ ' + e.nome + (r ? ' — ' + r : '')); }
  catch (err) { console.log('❌ ' + e.nome + ' — ' + err.message); }
}
console.log(`\n${ok}/${esiti.length} superate`);
if (ok !== esiti.length) process.exit(1);
