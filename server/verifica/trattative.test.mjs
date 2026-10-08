// ═══════════════════════════════════════════════════════════════════════════════
//  LE TRATTATIVE — tariffe/motore/trattative.js  (08/10/2026)
//
//  Le prove che, se saltano, producono un imponibile credibile e falso (una
//  media a occhio su un ramo che mescola imposte), un grafico che conta come
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

prova('l’imponibile si ricava dividendo, e le imposte sono la differenza', () => {
  const r = T.netto(122.25, { ramo: 'rcprof' });
  deve(r.netto === 100 && r.imposte === 22.25 && r.aliquota === 22.25, JSON.stringify(r));
  /* Netto + imposte torna SEMPRE col lordo: su cento lordi a caso. */
  for (let i = 1; i <= 100; i++) {
    const l = Math.round(i * 37.13 * 100) / 100;
    const x = T.netto(l, { ramo: 'tutela' });
    deve(Math.abs(x.netto + x.imposte - l) < 1e-9, l + ': ' + x.netto + ' + ' + x.imposte);
  }
  return '122,25 → 100 + 22,25';
});

prova('un ramo che mescola imposte NON ha un’aliquota: non si stima', () => {
  for (const ramo of ['beni', 'persona', 'impresa', 'animali', 'viaggio']) {
    const r = T.netto(500, { ramo });
    deve(r.netto === null && /dichiara/.test(r.motivo), ramo + ' ha prodotto un imponibile: ' + JSON.stringify(r));
  }
  return 'beni, persona, impresa, animali, viaggio';
});

prova('l’aliquota dichiarata sul prodotto vale sul ramo, quella scritta a mano su tutte', () => {
  deve(T.netto(110, { ramo: 'beni', prodotto: 10 }).netto === 100, 'il prodotto non vale');
  const m = T.netto(110, { ramo: 'rcprof', prodotto: 22.25, manuale: '10' });
  deve(m.netto === 100 && m.fonte === 'manuale', 'la mano non vince: ' + JSON.stringify(m));
  /* Zero e' un'aliquota vera (vita), non un vuoto. */
  deve(T.netto(100, { ramo: 'beni', prodotto: 0 }).netto === 100, 'zero dichiarato trattato come vuoto');
  deve(T.netto(100, { ramo: 'beni', manuale: '' }).netto === null, 'un campo vuoto diventato aliquota');
  return 'mano > prodotto > ramo';
});

prova('RC auto: senza imposta provinciale non si calcola, con quella aggiunge il 10,5% SSN', () => {
  deve(T.netto(1000, { ramo: 'rca' }).netto === null, 'RCA calcolata senza provincia');
  const r = T.netto(1265, { ramo: 'rca', provinciale: 16 });
  deve(r.aliquota === 26.5 && r.netto === 1000 && r.avviso, JSON.stringify(r));
  return '16 + 10,5 = 26,5';
});

prova('vita è esente: il netto è il lordo', () => {
  const r = T.netto(1200, { ramo: 'vita' });
  deve(r.netto === 1200 && r.imposte === 0, JSON.stringify(r));
});

prova('senza premio lordo non c’è imponibile, e lo dice', () => {
  deve(/premio lordo/.test(T.netto(null, { ramo: 'vita' }).motivo), 'nessun motivo');
  deve(T.netto(0, { ramo: 'vita' }).netto === null, 'zero diventato un premio');
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
