// ═══════════════════════════════════════════════════════════════════════════════
//  I CONTI E LE CAUSALI — tariffe/motore/contabilita.js  (19/09/2026, brief #02 M1)
//
//  Le prove che, se saltano, producono una contabilità credibile e sbagliata:
//  un utile che conta i soldi dei clienti, un premio incassato sul conto di
//  casa, un saldo che non torna con i suoi movimenti, un IBAN che non esiste.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const C = require('../../tariffe/motore/contabilita.js');
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Un'agenzia con i due conti che il brief dà per scontati. */
const PREMI = { id: 'k1', nome: 'Conto premi', tipologia: 'banca', natura: 'premi', saldo_iniziale: 1000, attivo: true, iban: 'IT60X0542811101000000123456' };
const AZIEN = { id: 'k2', nome: 'Conto agenzia', tipologia: 'banca', natura: 'aziendale', saldo_iniziale: 500, attivo: true };
const CASSA = { id: 'k3', nome: 'Cassa contanti', tipologia: 'cassa', natura: 'premi', saldo_iniziale: 0, attivo: true };
const CONTI = [PREMI, AZIEN, CASSA];

/* Le causali come le scrive il database: id e codice. */
const CAU = C.CAUSALI_INIZIALI.map((c, i) => Object.assign({ id: 'c' + i, attiva: true, di_sistema: true }, c));
const byCod = (k) => CAU.find(c => c.codice === k);

prova('l\'elenco delle causali del motore e quello della migrazione dicono la stessa cosa', () => {
  const sql = readFileSync(join(RADICE, 'supabase/migrations/20260919_b02_m1_conti_e_causali.sql'), 'utf8');
  /* Si legge la RIGA del seed, non «il codice compare da qualche parte»: un
     codice citato in un commento farebbe passare la prova senza che la riga
     esista (la trappola dei commenti, §10 e §12). */
  deve(C.CAUSALI_INIZIALI.length === 10, 'le causali di partenza non sono dieci: ' + C.CAUSALI_INIZIALI.length);
  for (const c of C.CAUSALI_INIZIALI) {
    const r = new RegExp("^\\s*\\('" + c.codice + "',\\s*'([^']*)',\\s*'(entrata|uscita)',\\s*(true|false),\\s*(null|'premi'|'aziendale')", 'm');
    const m = sql.match(r);
    deve(m, 'la migrazione non ha la riga di seed di «' + c.codice + '»');
    deve(m[1] === c.nome, c.codice + ': nome diverso — SQL «' + m[1] + '», motore «' + c.nome + '»');
    deve(m[2] === c.segno, c.codice + ': segno diverso — SQL ' + m[2] + ', motore ' + c.segno);
    deve((m[3] === 'true') === c.incide_su_utile, c.codice + ': incide_su_utile diverso — SQL ' + m[3]);
    const natSql = m[4] === 'null' ? null : m[4].replace(/'/g, '');
    deve(natSql === c.natura, c.codice + ': natura diversa — SQL ' + natSql + ', motore ' + c.natura);
  }
  return '10 causali, identiche riga per riga fra SQL e motore';
});

prova('le due causali del denaro in transito NON incidono sull\'utile', () => {
  deve(byCod('incasso_premi').incide_su_utile === false, 'incasso premi conta come ricavo');
  deve(byCod('rimesse_compagnia').incide_su_utile === false, 'la rimessa conta come costo');
  deve(byCod('provvigioni_entrata').incide_su_utile === true, 'le provvigioni in entrata non contano come ricavo');
  deve(byCod('affitti').incide_su_utile === true, 'l\'affitto non conta come costo');
  return 'incasso e rimessa fuori dall\'utile, provvigioni e affitto dentro';
});

prova('art. 117: una causale premi non si registra su un conto aziendale, e viceversa', () => {
  deve(C.compatibile(PREMI, byCod('incasso_premi')).ok, 'incasso premi rifiutato sul conto premi');
  const no = C.compatibile(AZIEN, byCod('incasso_premi'));
  deve(!no.ok && /117/.test(no.motivo), 'incasso premi ACCETTATO sul conto aziendale: ' + JSON.stringify(no));
  const no2 = C.compatibile(PREMI, byCod('stipendi'));
  deve(!no2.ok && /aziendale/.test(no2.motivo), 'gli stipendi si pagano col conto premi: ' + JSON.stringify(no2));
  /* Natura NULL = su tutti i conti: il bollo lo addebita anche la banca del
     conto premi, e vietarlo vorrebbe dire non poter registrare un fatto. */
  deve(C.compatibile(PREMI, byCod('spese_bancarie')).ok && C.compatibile(AZIEN, byCod('spese_bancarie')).ok, 'le spese bancarie non passano su tutti i conti');
  /* La tendina e il rifiuto passano dalla stessa regola: se divergono, la
     schermata propone quello che il salvataggio rifiuta. */
  const perPremi = C.causaliPerConto(CAU, PREMI).map(c => c.codice);
  deve(!perPremi.includes('stipendi') && perPremi.includes('incasso_premi') && perPremi.includes('spese_bancarie'), 'la tendina del conto premi: ' + perPremi.join(','));
  const perAz = C.causaliPerConto(CAU, AZIEN).map(c => c.codice);
  deve(!perAz.includes('incasso_premi') && perAz.includes('stipendi'), 'la tendina del conto aziendale: ' + perAz.join(','));
  return 'due cancelli, un\'unica regola';
});

/* Movimenti: importo SEMPRE positivo, il verso lo dà la causale. */
const M = (o) => Object.assign({ id: 'm', conto_id: 'k1', data: '2026-09-10' }, o);
const MOV = [
  M({ id: 'm1', importo: 390, causale_id: byCod('incasso_premi').id }),
  M({ id: 'm2', importo: 200, causale_id: byCod('incasso_premi').id, data: '2026-09-12' }),
  M({ id: 'm3', importo: 500, causale_id: byCod('rimesse_compagnia').id, data: '2026-09-15' }),
  M({ id: 'm4', conto_id: 'k2', importo: 41.21, causale_id: byCod('provvigioni_entrata').id, data: '2026-09-11' }),
  M({ id: 'm5', conto_id: 'k2', importo: 800, causale_id: byCod('affitti').id, data: '2026-09-05' }),
  M({ id: 'm6', conto_id: 'k2', importo: 12.5, causale_id: byCod('spese_bancarie').id, data: '2026-09-30' })
];

prova('il saldo si CALCOLA dai movimenti, e non esiste una colonna che lo dica', () => {
  const s = C.saldo(PREMI, MOV, { causali: CAU });
  /* 1.000 + 390 + 200 - 500 = 1.090 */
  deve(s.saldo === 1090, 'saldo del conto premi: ' + s.saldo);
  deve(s.iniziale === 1000 && s.movimenti === 3, 'iniziale/movimenti: ' + JSON.stringify(s));
  const a = C.saldo(AZIEN, MOV, { causali: CAU });
  /* 500 + 41,21 - 800 - 12,50 = -271,29 — e un conto in rosso si dice, non si azzera */
  deve(a.saldo === -271.29, 'saldo del conto agenzia: ' + a.saldo);
  /* Al 12/09 la rimessa non è ancora partita. */
  deve(C.saldo(PREMI, MOV, { causali: CAU, al: '2026-09-12' }).saldo === 1590, 'saldo a data');
  /* Nessuna colonna «saldo» scritta: il motore non la legge nemmeno se c'è. */
  const bugiardo = Object.assign({}, PREMI, { saldo: 999999 });
  deve(C.saldo(bugiardo, MOV, { causali: CAU }).saldo === 1090, 'il motore si è fidato di una colonna saldo scritta a mano');
  return '1.090 sui premi, -271,29 sull\'agenzia, 1.590 al 12/09';
});

prova('il saldo progressivo è ordinato e i totali tornano riga per riga', () => {
  const p = C.progressivo(PREMI, MOV, { causali: CAU });
  deve(p.length === 3, 'righe: ' + p.length);
  deve(p.map(r => r.movimento.id).join(',') === 'm1,m2,m3', 'ordine: ' + p.map(r => r.movimento.id).join(','));
  deve(p[0].saldo === 1390 && p[1].saldo === 1590 && p[2].saldo === 1090, 'progressivo: ' + p.map(r => r.saldo).join(' '));
  deve(p[2].verso === -1 && p[2].delta === -500, 'la rimessa non è un\'uscita: ' + JSON.stringify(p[2]));
  /* L'ultimo progressivo è il saldo del conto: se i due si scostano, uno dei
     due conti è sbagliato e non si sa quale. */
  deve(p[2].saldo === C.saldo(PREMI, MOV, { causali: CAU }).saldo, 'il progressivo non finisce sul saldo');
  return 'tre righe, 1.390 → 1.590 → 1.090';
});

prova('il conto economico conta i ricavi e i costi VERI, e tiene da parte il transito', () => {
  const ce = C.contoEconomico(MOV, CAU);
  deve(ce.ricavi === 41.21, 'ricavi: ' + ce.ricavi + ' (solo le provvigioni in entrata)');
  deve(ce.costi === 812.5, 'costi: ' + ce.costi + ' (affitto + spese bancarie)');
  deve(ce.utile === -771.29, 'utile: ' + ce.utile);
  deve(ce.transito_entrate === 590 && ce.transito_uscite === 500 && ce.in_transito === 90, 'transito: ' + JSON.stringify(ce));
  /* LA PROVA CHE CONTA: i 590 € di premi incassati NON sono nei ricavi. Se un
     giorno ci finiscono, l'agenzia si legge un utile fatto coi soldi dei
     clienti — grande, credibile e falso. */
  deve(ce.ricavi < 590, 'i premi incassati sono finiti nei ricavi: ' + ce.ricavi);
  /* Le due nature non si sommano in un totale unico. */
  const n = C.perNatura(CONTI, MOV, { causali: CAU });
  deve(n.premi === 1090 && n.aziendale === -271.29, 'per natura: ' + JSON.stringify(n));
  return 'ricavi 41,21 · costi 812,50 · in transito 90,00';
});

prova('l\'IBAN si controlla davvero, e vuoto non è sbagliato', () => {
  deve(C.ibanValido('IT60X0542811101000000123456'), 'IBAN valido rifiutato');
  deve(C.ibanValido('it60 x054 2811 1010 0000 0123 456'), 'spazi e minuscole rifiutati');
  deve(!C.ibanValido('IT60X0542811101000000123457'), 'IBAN con l\'ultima cifra cambiata ACCETTATO');
  deve(!C.ibanValido('IT60X05428111010000001234'), 'IBAN italiano troppo corto accettato');
  deve(!C.ibanValido('XX00NONSONOUNIBAN'), 'stringa qualunque accettata');
  deve(C.ibanBello('IT60X0542811101000000123456').startsWith('IT60 X054'), 'formato a gruppi: ' + C.ibanBello('IT60X0542811101000000123456'));
  /* Una cassa contanti non ha un IBAN, e va benissimo così. */
  const v = C.validaConto({ nome: 'Cassa', tipologia: 'cassa', natura: 'premi' });
  deve(v.ok, 'una cassa senza IBAN rifiutata: ' + v.errori.join(' | '));
  const w = C.validaConto({ nome: 'Banca', tipologia: 'banca', natura: 'premi', iban: 'IT60X0542811101000000123457' });
  deve(!w.ok && /IBAN/.test(w.errori.join(' ')), 'un IBAN sbagliato passa il salvataggio');
  return 'mod 97 + lunghezza per paese';
});

prova('la validazione dice TUTTO quello che manca, non il primo errore', () => {
  const v = C.validaConto({});
  deve(!v.ok && v.errori.length >= 3, 'errori su un conto vuoto: ' + v.errori.length + ' — ' + v.errori.join(' | '));
  deve(/natura/i.test(v.errori.join(' ')), 'non chiede la natura: ' + v.errori.join(' | '));
  /* Il nome doppio: due voci identiche nella tendina vogliono dire metà
     registrazioni sul conto sbagliato, e non si vede mai. */
  const d = C.validaConto({ nome: '  conto   PREMI ', tipologia: 'banca', natura: 'premi' }, CONTI);
  deve(!d.ok && /già un conto/.test(d.errori.join(' ')), 'due conti con lo stesso nome accettati: ' + JSON.stringify(d));
  /* Lo stesso conto che si risalva non litiga con se stesso. */
  deve(C.validaConto(PREMI, CONTI).ok, 'un conto non si può risalvare: ' + JSON.stringify(C.validaConto(PREMI, CONTI)));
  /* `incide_su_utile` senza default: un booleano comodo è un booleano che
     nessuno guarda, e qui separa un utile dai soldi di un cliente. */
  const c1 = C.validaCausale({ nome: 'Bolli', segno: 'uscita' });
  deve(!c1.ok && /utile/.test(c1.errori.join(' ')), 'una causale senza incide_su_utile è passata');
  deve(C.validaCausale({ nome: 'Bolli', segno: 'uscita', incide_su_utile: true }).ok, 'causale valida rifiutata');
  /* Avviso ≠ errore: una cassa con IBAN si salva, ma lo dice. */
  const a = C.validaConto({ nome: 'Cassa 2', tipologia: 'cassa', natura: 'premi', iban: 'IT60X0542811101000000123456' });
  deve(a.ok && a.avvisi.length === 1, 'l\'avviso sulla cassa con IBAN: ' + JSON.stringify(a));
  return 'errori tutti insieme, avvisi separati';
});

prova('quello che ha dei movimenti non si cancella: si spegne', () => {
  const e = C.eliminabile(PREMI, MOV);
  deve(!e.ok && /Spegnilo/.test(e.motivo), 'un conto con movimenti si cancella: ' + JSON.stringify(e));
  deve(C.eliminabile({ id: 'nuovo' }, MOV).ok, 'un conto senza movimenti non si cancella');
  const s = C.causaleEliminabile(byCod('incasso_premi'), []);
  deve(!s.ok && /di partenza/.test(s.motivo), 'una causale di sistema si cancella: ' + JSON.stringify(s));
  const u = C.causaleEliminabile({ id: byCod('affitti').id, di_sistema: false }, MOV);
  deve(!u.ok && /usata/.test(u.motivo), 'una causale usata si cancella: ' + JSON.stringify(u));
  deve(C.causaleEliminabile({ id: 'zzz', di_sistema: false }, MOV).ok, 'una causale mai usata non si cancella');
  return 'conto con movimenti, causale di sistema, causale usata';
});

prova('il codice della causale si ricava una volta sola e non si ripete', () => {
  deve(C.codiceDa('Spese di rappresentanza') === 'spese_di_rappresentanza', C.codiceDa('Spese di rappresentanza'));
  deve(C.codiceDa('Pagamento più utenze') === 'pagamento_piu_utenze', C.codiceDa('Pagamento più utenze'));
  deve(C.codiceDa('Affitti', CAU) === 'affitti_2', 'il codice si è ripetuto: ' + C.codiceDa('Affitti', CAU));
  deve(/^[a-z0-9_]+$/.test(C.codiceDa('!!! ???')), 'codice non pulito: ' + C.codiceDa('!!! ???'));
  return 'slug senza accenti, senza collisioni';
});

prova('gli importi si leggono nelle due forme, e un verso sconosciuto non si indovina', () => {
  deve(C.numero('1.234,56') === 1234.56, 'forma italiana: ' + C.numero('1.234,56'));
  deve(C.numero('1234.56') === 1234.56, 'forma con il punto: ' + C.numero('1234.56'));
  deve(C.numero('€ 1.000,00') === 1000, 'con il simbolo: ' + C.numero('€ 1.000,00'));
  deve(C.numero('') === null && C.numero('ciao') === null, 'testo qualunque diventa un numero');
  /* Un movimento la cui causale non si trova NON entra nel saldo: un verso
     indovinato è un totale che non torna, e non si vede da dove. */
  const orfano = [M({ id: 'x', importo: 100, causale_id: 'sconosciuta' })];
  const s = C.saldo(PREMI, orfano, { causali: CAU });
  deve(s.saldo === 1000 && s.movimenti === 0, 'un movimento senza causale è entrato nel saldo: ' + JSON.stringify(s));
  const p = C.progressivo(PREMI, orfano, { causali: CAU });
  deve(p[0].incerto === true, 'il progressivo non segnala la riga incerta');
  /* L'arrotondamento dei negativi è simmetrico: su un'uscita quel centesimo
     andrebbe dalla parte sbagliata. */
  deve(C.cent(-0.005) === -0.01 && C.cent(0.005) === 0.01, 'cent non simmetrico: ' + C.cent(-0.005));
  return 'due forme di importo, verso mai indovinato';
});

console.log('\n══ CONTI E CAUSALI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCONTI E CAUSALI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
