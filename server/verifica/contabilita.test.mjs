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

/* ═══════════════════════════════════════════════════════════════════════════
   LA PRIMA NOTA E LA QUADRATURA — brief #02 · M3 (20/09/2026)
   ═══════════════════════════════════════════════════════════════════════════ */

const inc = byCod('incasso_premi').id;      // entrata, premi, non incide sull'utile
const aff = byCod('affitti').id;            // uscita,  aziendale, incide sull'utile
const ban = byCod('spese_bancarie').id;     // uscita,  natura null: vale su tutti

prova('un movimento ANNULLATO esce da ogni totale, e resta a vedersi', () => {
  /* La regola 5. Se un solo posto che somma si dimentica di escluderlo, il
     saldo comincia a non tornare e nessuno sa dire da dove. */
  const righe = [
    M({ id: 'a', causale_id: inc, importo: 300 }),
    M({ id: 'b', causale_id: inc, importo: 200, annullato_il: '2026-09-11T10:00:00Z', annullato_perche: 'doppione' })
  ];
  const s = C.saldo(PREMI, righe, { causali: CAU });
  deve(s.saldo === 1300, 'il saldo conta un movimento annullato: ' + s.saldo);
  deve(s.movimenti === 1, 'il conteggio dei movimenti include l\'annullato: ' + s.movimenti);

  const p = C.progressivo(PREMI, righe, { causali: CAU });
  deve(p.length === 1, 'il progressivo mostra la riga annullata: ' + p.length);

  const ce = C.contoEconomico(righe, CAU);
  deve(ce.transito_entrate === 300, 'il conto economico conta l\'annullato: ' + ce.transito_entrate);

  const r = C.riepilogo(righe, { causali: CAU });
  deve(r.entrate === 300 && r.righe === 1, 'il riepilogo conta l\'annullato: ' + JSON.stringify(r));
  /* E lo dice: «12 movimenti» quando tre sono annullati è un numero che non
     torna con l'elenco che si sta guardando. */
  deve(r.annullati === 1, 'il riepilogo non dice quanti sono annullati');

  const pc = C.perCausale(righe, CAU);
  deve(pc.length === 1 && pc[0].totale === 300, 'il riepilogo per causale conta l\'annullato');
  return 'fuori da saldo, progressivo, conto economico, riepilogo e per-causale';
});

prova('l\'importo si scrive positivo: il verso lo dice la causale', () => {
  /* La regola 6. Un «-50» su «Incasso premi» è un'uscita travestita da
     entrata: dentro un totale non si vede più. */
  const e = C.validaMovimento({ data: '2026-09-10', conto_id: 'k1', causale_id: inc, importo: -50 },
                              { conti: CONTI, causali: CAU });
  deve(e.length === 1 && /sempre positivo/.test(e[0]), 'un importo negativo è passato: ' + JSON.stringify(e));
  deve(C.validaMovimento({ data: '2026-09-10', conto_id: 'k1', causale_id: inc, importo: 0 },
                         { conti: CONTI, causali: CAU }).length === 1, 'lo zero è passato come movimento');
  /* E il verso non si può scrivere a mano contro la causale: il motore lo
     prende dalla causale, che è l'unica fonte. */
  deve(C.versoDi({ causale_id: inc }, C.vivi ? Object.fromEntries(CAU.map(c => [c.id, c])) : null) === 1,
    'il verso di un incasso non è un\'entrata');
  return 'negativo e zero rifiutati, verso dalla causale';
});

prova('art. 117 anche in prima nota: la schermata lo dice PRIMA del salvataggio', () => {
  /* L'affitto sul conto premi è esattamente la confusione che la norma vieta.
     Il controllo vero è nel trigger; questo serve a dirlo con parole umane
     invece di far fallire un insert. */
  const e = C.validaMovimento({ data: '2026-09-10', conto_id: 'k1', causale_id: aff, importo: 500 },
                              { conti: CONTI, causali: CAU });
  deve(e.length === 1, 'l\'affitto è passato sul conto premi: ' + JSON.stringify(e));
  /* La spesa bancaria invece passa su tutti e due: il bollo lo addebita anche
     la banca del conto premi, e vietarlo vorrebbe dire non poter registrare
     un fatto accaduto. */
  deve(C.validaMovimento({ data: '2026-09-10', conto_id: 'k1', causale_id: ban, importo: 2 },
                         { conti: CONTI, causali: CAU }).length === 0, 'la spesa bancaria rifiutata sul conto premi');
  deve(C.validaMovimento({ data: '2026-09-10', conto_id: 'k2', causale_id: ban, importo: 2 },
                         { conti: CONTI, causali: CAU }).length === 0, 'la spesa bancaria rifiutata sul conto aziendale');
  /* E su un conto spento non si registra più niente. */
  const spento = CONTI.map(c => c.id === 'k2' ? Object.assign({}, c, { attivo: false }) : c);
  const e2 = C.validaMovimento({ data: '2026-09-10', conto_id: 'k2', causale_id: aff, importo: 500 },
                               { conti: spento, causali: CAU });
  deve(e2.some(x => /spento/.test(x)), 'si registra su un conto spento: ' + JSON.stringify(e2));
  return 'natura, conto spento, e la spesa bancaria che vale su tutti';
});

prova('annullare senza dire perché non si può', () => {
  const e = C.validaMovimento({ data: '2026-09-10', conto_id: 'k1', causale_id: inc, importo: 100,
                                annullato_il: '2026-09-11T09:00:00Z' }, { conti: CONTI, causali: CAU });
  deve(e.some(x => /motivo/.test(x)), 'annullato senza motivo è passato: ' + JSON.stringify(e));
  return 'il motivo è obbligatorio, ed è l\'unica cosa che spiega quel buco fra sei mesi';
});

prova('QUADRATURA: «non è mai stata fatta» non è «quadra»', () => {
  /* La regola 7, e il motivo per cui `quadra` ha tre valori. Un conto mai
     verificato che si mostra come quadrato è la bugia più comoda che un
     sistema di contabilità possa raccontare. */
  const righe = [M({ id: 'a', causale_id: inc, importo: 300 })];
  const q = C.quadratura(PREMI, righe, [], { causali: CAU, al: '2026-09-20' });
  deve(q.quadra === null, 'senza dichiarazione dice che quadra: ' + q.quadra);
  deve(q.dichiarato === null && q.differenza === null, 'inventa un saldo dichiarato');
  deve(/mai stata fatta|Nessun saldo dichiarato/.test(q.motivo || ''), 'non spiega perché');
  deve(q.ricostruito === 1300, 'il ricostruito è sbagliato: ' + q.ricostruito);
  return 'quadra: null, e il motivo scritto';
});

prova('QUADRATURA: il confronto si fa alla data dell\'estratto conto, non a oggi', () => {
  /* Un estratto conto del 31/08 non sa niente dei movimenti di settembre:
     confrontarlo col saldo di oggi produrrebbe una differenza inventata, e
     qualcuno andrebbe a cercare un errore che non c'è. */
  const righe = [
    M({ id: 'a', causale_id: inc, importo: 300, data: '2026-08-10' }),
    M({ id: 'b', causale_id: inc, importo: 999, data: '2026-09-05' })   // dopo l'estratto conto
  ];
  const dich = [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1300 }];
  const q = C.quadratura(PREMI, righe, dich, { causali: CAU, al: '2026-09-20' });
  deve(q.al === '2026-08-31', 'il confronto non è alla data dichiarata: ' + q.al);
  deve(q.ricostruito === 1300 && q.differenza === 0 && q.quadra === true,
    'il conto non quadra pur essendo giusto: ' + JSON.stringify(q));
  /* E il saldo di oggi resta leggibile: serve a sapere quanti soldi ci sono. */
  deve(q.saldo_oggi === 2299, 'il saldo di oggi non c\'è o è sbagliato: ' + q.saldo_oggi);
  /* Una dichiarazione nel futuro rispetto alla data guardata non si usa. */
  const q2 = C.quadratura(PREMI, righe, dich, { causali: CAU, al: '2026-08-15' });
  deve(q2.quadra === null, 'ha usato una dichiarazione più recente della data guardata');
  return 'confronto alla data dichiarata, saldo di oggi a parte';
});

prova('QUADRATURA: la differenza dice da che parte sta, e la tolleranza è un centesimo', () => {
  const righe = [M({ id: 'a', causale_id: inc, importo: 300, data: '2026-08-10' })];
  /* Il sistema ha di più: un movimento registrato due volte, o uno mai uscito. */
  const q1 = C.quadratura(PREMI, righe, [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1250 }], { causali: CAU });
  deve(q1.quadra === false && q1.differenza === 50 && /in più della banca/.test(q1.motivo),
    'non riconosce il verso della differenza: ' + JSON.stringify(q1));
  /* La banca ha di più: c'è un movimento che non è stato registrato. */
  const q2 = C.quadratura(PREMI, righe, [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1350 }], { causali: CAU });
  deve(q2.quadra === false && q2.differenza === -50 && /banca ha/.test(q2.motivo), 'verso opposto sbagliato');
  /* Un centesimo passa (è un arrotondamento), due no. */
  deve(C.quadratura(PREMI, righe, [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1299.99 }], { causali: CAU }).quadra === true,
    'un centesimo di arrotondamento fa fallire la quadratura');
  deve(C.quadratura(PREMI, righe, [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1299.98 }], { causali: CAU }).quadra === false,
    'due centesimi passano: la tolleranza è diventata una scusa');
  return 'verso della differenza + tolleranza di 0,01';
});

prova('QUADRATURA: un movimento annullato sposta il saldo ricostruito', () => {
  /* Le due regole insieme, ed è il caso vero: si annulla un doppione e il
     conto torna a quadrare. Se l'annullato restasse nei totali, si andrebbe a
     cercare l'errore in banca. */
  const doppione = { id: 'b', conto_id: 'k1', data: '2026-08-10', causale_id: inc, importo: 300 };
  const righe = [M({ id: 'a', causale_id: inc, importo: 300, data: '2026-08-10' }), doppione];
  const dich = [{ conto_id: 'k1', data: '2026-08-31', saldo_dichiarato: 1300 }];
  deve(C.quadratura(PREMI, righe, dich, { causali: CAU }).quadra === false, 'col doppione quadrava già');
  doppione.annullato_il = '2026-09-01T08:00:00Z';
  doppione.annullato_perche = 'registrato due volte';
  deve(C.quadratura(PREMI, righe, dich, { causali: CAU }).quadra === true, 'annullato il doppione non quadra');
  return 'annulla il doppione e il conto torna';
});

prova('il riepilogo per causale non nasconde quello che non conosce', () => {
  const righe = [
    M({ id: 'a', causale_id: inc, importo: 300 }),
    M({ id: 'b', causale_id: aff, importo: 800, conto_id: 'k2' }),
    M({ id: 'c', causale_id: 'sparita', importo: 50 })
  ];
  const pc = C.perCausale(righe, CAU);
  deve(pc.length === 3, 'ha perso una causale per strada: ' + pc.length);
  deve(pc[0].totale === 800, 'non è ordinato per importo: la prima riga è quella che interessa');
  const ign = pc.find(r => r.ignota);
  deve(ign && ign.totale === 50, 'una causale sconosciuta è sparita in silenzio');
  /* Sparire in silenzio vorrebbe dire che un refuso toglie dei soldi da un
     riepilogo e non se ne accorge nessuno. */
  deve(ign.nome === 'Causale sconosciuta', 'la riga ignota non si dichiara');
  return '3 righe, ordinate, e l\'ignota che si vede';
});

prova('le tabelle della M3 esistono nella migrazione, con i divieti nel DATABASE', () => {
  const sql = readFileSync(join(RADICE, 'supabase/migrations/20260920_b02_m3_prima_nota.sql'), 'utf8');
  deve(/create table if not exists public\.iam_movimenti/.test(sql), 'manca iam_movimenti');
  deve(/create table if not exists public\.iam_quadrature/.test(sql), 'manca iam_quadrature');
  /* Regola 6 nel database, non solo in pagina. */
  deve(/importo\s+numeric\(14,2\) not null check \(importo > 0\)/.test(sql), 'l\'importo può essere negativo o zero');
  /* Regola 5: il divieto di cancellare è un trigger, perché la schermata è una
     delle strade e non l'unica. */
  deve(/create trigger iam_movimenti_no_delete_trg/.test(sql), 'manca il trigger che vieta la cancellazione');
  deve(/annullato_il is null or coalesce\(btrim\(annullato_perche\), ''\) <> ''/.test(sql), 'si può annullare senza motivo');
  /* Regola 2 nel database. */
  deve(/n_causale <> n_conto then[\s\S]{0,200}raise exception/.test(sql), 'la natura non è controllata dal database');
  /* Regola 4 della M1, adesso col vincolo vero. */
  deve(/references public\.iam_conti\(id\)\s+on delete restrict/.test(sql), 'un conto con movimenti si può cancellare');
  /* Una rata genera un movimento solo, e lo dice Postgres. */
  deve(/create unique index if not exists iam_movimenti_titolo_uno[\s\S]{0,160}annullato_il is null/.test(sql),
    'una rata può generare due movimenti');
  /* Chi scrive è l'admin: qui si dice dove sono finiti dei soldi. */
  deve(/create policy movimenti_write[\s\S]{0,160}iam_is_admin\(\)/.test(sql), 'la prima nota non è chiusa all\'admin');
  deve(/create policy movimenti_select[\s\S]{0,120}iam_is_staff\(\)/.test(sql), 'la prima nota non si legge nemmeno allo staff');
  /* E niente seed: inventare movimenti vorrebbe dire scrivere nella
     contabilità dell'agenzia dei fatti che non sono successi. */
  deve(!/insert into public\.iam_movimenti/.test(sql), 'la migrazione inventa dei movimenti');
  return 'due tabelle, tre trigger/vincoli, RLS, zero seed';
});

/* ═══════════════════════════════════════════════════════════════════════════
   GLI INCASSI DA ACCREDITARE — brief #02 · M4 (20/09/2026)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Due conti che dichiarano che cosa ricevono: e' la configurazione che la M4
   chiede, e che sul database vero non c'e' ancora. */
const CASSA_C = { id: 'kc', nome: 'Cassa', natura: 'premi', attivo: true, mezzi: ['contanti'] };
const BANCA_C = { id: 'kb', nome: 'Banca premi', natura: 'premi', attivo: true, mezzi: ['pos', 'bonifico', 'carta_credito'] };
const CONTI_M4 = [CASSA_C, BANCA_C];

prova('i CONTANTI entrano in cassa, tutto il resto e\' denaro per strada', () => {
  /* Regola 8. E' la distinzione su cui poggia tutta la M4: se cade, il saldo
     del conto dice di avere dei soldi che arriveranno fra tre giorni. */
  const c = C.destinoIncasso({ mezzo_pagamento: 'contanti', importo_lordo: 100, incassato_il: '2026-09-20' }, CONTI_M4);
  deve(c.tipo === 'cassa', 'i contanti non entrano in cassa: ' + c.tipo);
  deve(c.conto.id === 'kc', 'i contanti non vanno sulla cassa');
  deve(c.giorni_attesi === 0, 'i contanti hanno un tempo di attesa');
  for (const m of ['pos', 'bonifico', 'assegno', 'carta_credito', 'paypal', 'rid']) {
    const r = C.destinoIncasso({ mezzo_pagamento: m, importo_lordo: 100 }, [CASSA_C, BANCA_C, { id: 'kx', nome: 'Altro', attivo: true, mezzi: ['assegno', 'paypal', 'rid'] }]);
    deve(r.tipo === 'sospeso', m + ' non produce un incasso da accreditare: ' + r.tipo);
  }
  /* E il vocabolario dice solo dei CONTANTI che sono immediati. */
  deve(C.MEZZI.filter(m => m.immediato).length === 1, 'piu\u2019 di un mezzo e\u2019 dichiarato immediato');
  return 'contanti in cassa, sei mezzi per strada';
});

prova('«non si sa» e\' una risposta, e non si sceglie un conto a caso', () => {
  /* Regola 10, ed e' il caso di NOVE rate su quindici sul database vero. */
  const senza = C.destinoIncasso({ importo_lordo: 100 }, CONTI_M4);
  deve(senza.tipo === 'non-si-sa', 'un incasso senza mezzo e\u2019 stato collocato lo stesso: ' + senza.tipo);
  deve(!senza.conto, 'ha scelto un conto pur non sapendo il mezzo');
  deve(/con che mezzo/.test(senza.motivo), 'non dice perche\u2019');

  /* Regola 9: nessun conto lo riceve. */
  const nessuno = C.destinoIncasso({ mezzo_pagamento: 'assegno', importo_lordo: 100 }, CONTI_M4);
  deve(nessuno.tipo === 'non-si-sa' && /Nessun conto/.test(nessuno.motivo), 'un assegno che nessun conto riceve e\u2019 stato collocato');

  /* Due conti che ricevono lo stesso mezzo: e\u2019 un\u2019ambiguita\u2019 vera, non si
     prende il primo. */
  const due = C.destinoIncasso({ mezzo_pagamento: 'pos', importo_lordo: 100 },
    [BANCA_C, { id: 'kb2', nome: 'Altra banca', attivo: true, mezzi: ['pos'] }]);
  deve(due.tipo === 'non-si-sa' && due.ambiguo && due.ambiguo.length === 2, 'con due conti sullo stesso mezzo ne ha scelto uno');

  /* Un mezzo fuori vocabolario non si indovina. */
  const ignoto = C.destinoIncasso({ mezzo_pagamento: 'criptovaluta', importo_lordo: 100 }, CONTI_M4);
  deve(ignoto.tipo === 'non-si-sa', 'un mezzo sconosciuto e\u2019 stato collocato');
  /* E un conto SPENTO non riceve piu\u2019 niente. */
  const spento = C.destinoIncasso({ mezzo_pagamento: 'contanti', importo_lordo: 100 },
    [Object.assign({}, CASSA_C, { attivo: false })]);
  deve(spento.tipo === 'non-si-sa', 'un conto spento riceve ancora incassi');
  return 'mezzo assente, conto assente, due conti, mezzo ignoto, conto spento';
});

prova('il ritardo si misura sul mezzo, e su quello che non dichiara un\'attesa non si inventa', () => {
  /* Un POS fermo da tre giorni e\u2019 un problema; un «altro» fermo da tre giorni
     non si sa, perche\u2019 nessuno ha detto quanto dovrebbe metterci. */
  const pos = { stato: 'aperto', mezzo: 'pos', data_incasso: '2026-09-10', importo: 100 };
  deve(C.inRitardo(pos, '2026-09-20') === true, 'un POS di dieci giorni non risulta in ritardo');
  deve(C.inRitardo(pos, '2026-09-11') === false, 'un POS di un giorno risulta gia\u2019 in ritardo');
  const altro = { stato: 'aperto', mezzo: 'altro', data_incasso: '2026-01-01', importo: 100 };
  deve(C.inRitardo(altro, '2026-09-20') === false, 'su «altro» si e\u2019 inventata una soglia');
  /* E quello gia\u2019 accreditato non e\u2019 in ritardo per definizione. */
  deve(C.inRitardo({ stato: 'accreditato', mezzo: 'pos', data_incasso: '2026-01-01' }, '2026-09-20') === false,
    'un incasso gia\u2019 accreditato risulta in ritardo');
  deve(C.giorniDa('2026-09-10', '2026-09-20') === 10, 'il conto dei giorni non torna');
  return 'soglia per mezzo, nessuna soglia inventata';
});

prova('il riepilogo dice quanto e\' per strada, da quanto, e quanto non ha un conto', () => {
  const righe = [
    { stato: 'aperto', mezzo: 'pos', data_incasso: '2026-09-18', importo: 100, conto_id: 'kb' },
    { stato: 'aperto', mezzo: 'pos', data_incasso: '2026-08-01', importo: 250, conto_id: 'kb' },   // vecchio
    { stato: 'aperto', mezzo: 'bonifico', data_incasso: '2026-09-19', importo: 500, conto_id: null }, // senza conto
    { stato: 'accreditato', mezzo: 'pos', data_incasso: '2026-09-01', importo: 999, conto_id: 'kb' },
    { stato: 'annullato', mezzo: 'pos', data_incasso: '2026-09-01', importo: 888, conto_id: 'kb' }
  ];
  const r = C.riepilogoSospesi(righe, { oggi: '2026-09-20' });
  deve(r.righe === 3, 'conta anche gli accreditati o gli annullati: ' + r.righe);
  deve(r.totale === 850, 'il totale per strada e\u2019 sbagliato: ' + r.totale);
  deve(r.in_ritardo === 1 && r.totale_ritardo === 250, 'il ritardo non e\u2019 misurato: ' + JSON.stringify(r));
  deve(r.giorni_max === 50 && r.piu_vecchio.importo === 250, 'il piu\u2019 vecchio non e\u2019 quello giusto');
  /* Quante righe nessuno sa dove faranno arrivare il denaro: e\u2019 la voce che
     dice a chi configura che c\u2019e\u2019 un buco. */
  deve(r.senza_conto === 1, 'non conta le righe senza conto');
  deve(r.per_mezzo[0].mezzo === 'bonifico' && r.per_mezzo[0].totale === 500, 'il per-mezzo non e\u2019 ordinato per importo');
  return '850 per strada, 1 in ritardo, 1 senza conto';
});

prova('l\'accredito non puo\' venire PRIMA dell\'incasso', () => {
  /* Sarebbe il conto che si muove prima che il cliente paghi: da li\u2019 in poi la
     quadratura racconterebbe una storia sbagliata, e nessuno saprebbe da dove
     comincia. */
  const s = { stato: 'aperto', mezzo: 'pos', importo: 100, data_incasso: '2026-09-18', conto_id: 'kb' };
  const e = C.validaAccredito(s, { accreditato_il: '2026-09-10' }, { conti: CONTI_M4 });
  deve(e.some(x => /precedente all/.test(x)), 'un accredito precedente all\u2019incasso e\u2019 passato: ' + JSON.stringify(e));
  deve(C.validaAccredito(s, { accreditato_il: '2026-09-20' }, { conti: CONTI_M4 }).length === 0, 'un accredito valido e\u2019 stato rifiutato');
  /* Senza data e senza conto non si accredita. */
  deve(C.validaAccredito({ stato: 'aperto', importo: 100, data_incasso: '2026-09-18' }, {}, { conti: CONTI_M4 }).length === 2,
    'si accredita senza data e senza conto');
  /* E quello gia\u2019 chiuso non si riapre da qui. */
  deve(C.validaAccredito(Object.assign({}, s, { stato: 'accreditato' }), { accreditato_il: '2026-09-20' }, { conti: CONTI_M4 }).length > 0,
    'un incasso gia\u2019 accreditato si accredita una seconda volta');
  deve(C.validaAccredito(Object.assign({}, s, { stato: 'annullato' }), { accreditato_il: '2026-09-20' }, { conti: CONTI_M4 }).length > 0,
    'un incasso annullato si accredita');
  return 'data obbligatoria, mai prima dell\u2019incasso, e niente doppio accredito';
});

prova('la tabella della M4 esiste, e i divieti stanno nel DATABASE', () => {
  const sql = readFileSync(join(RADICE, 'supabase/migrations/20260920_b02_m4_sospesi.sql'), 'utf8');
  deve(/create table if not exists public\.iam_sospesi/.test(sql), 'manca iam_sospesi');
  /* Il sospeso PUNTA alla rata e non la ricopia: una rata, un sospeso vivo. */
  deve(/create unique index if not exists iam_sospesi_titolo_uno[\s\S]{0,160}stato <> 'annullato'/.test(sql),
    'una rata puo\u2019 generare due incassi da accreditare');
  /* Un accredito registrato due volte e\u2019 denaro che nel sistema c\u2019e\u2019 e in
     banca no. */
  deve(/create unique index if not exists iam_movimenti_sospeso_uno/.test(sql), 'un sospeso puo\u2019 generare due movimenti');
  deve(/origine in \('manuale', 'titolo', 'flusso', 'sospeso'\)/.test(sql), 'il movimento non sa di venire da un accredito');
  /* Accreditato senza dire quando e senza il suo movimento e\u2019 uno stato che
     mente: esce dagli aperti e il conto non si e\u2019 mosso. */
  deve(/stato <> 'accreditato' or \(accreditato_il is not null and movimento_id is not null\)/.test(sql),
    'si puo\u2019 marcare accreditato senza movimento');
  deve(/create trigger iam_sospesi_no_delete_trg/.test(sql), 'un incasso da accreditare si puo\u2019 cancellare');
  deve(/alter table public\.iam_conti add column if not exists mezzi text\[\]/.test(sql), 'i conti non dichiarano che mezzi ricevono');
  deve(/create policy sospesi_write[\s\S]{0,160}iam_is_admin\(\)/.test(sql), 'la scrittura non e\u2019 chiusa all\u2019admin');
  /* Niente backfill inventato sulle rate gia\u2019 incassate. */
  deve(!/insert into public\.iam_sospesi/.test(sql), 'la migrazione inventa degli incassi da accreditare');
  return 'tabella, due indici unici, due trigger, RLS, zero seed';
});

/* ═══════════════════════════════════════════════════════════════════════════
   LA GIORNATA RICOSTRUITA, IL FONDO CASSA E LE ANOMALIE — M5 (20/09/2026)
   ═══════════════════════════════════════════════════════════════════════════ */

const CASSA_M5 = { id: 'kx', nome: 'Cassa', tipologia: 'cassa', natura: 'premi', saldo_iniziale: 100, attivo: true, mezzi: ['contanti'] };
const BANCA_M5 = { id: 'ky', nome: 'Banca', tipologia: 'banca', natura: 'premi', saldo_iniziale: 0, attivo: true, mezzi: ['pos'] };
const G = [
  M({ id: 'g1', data: '2026-09-20', conto_id: 'kx', causale_id: inc, importo: 250 }),
  M({ id: 'g2', data: '2026-09-20', conto_id: 'ky', causale_id: aff, importo: 80 }),
  M({ id: 'g3', data: '2026-09-19', conto_id: 'kx', causale_id: inc, importo: 999 })
];

prova('la giornata si RICOSTRUISCE dai movimenti, conto per conto', () => {
  const g = C.giornata('2026-09-20', G, [CASSA_M5, BANCA_M5], { causali: CAU });
  deve(g.righe === 2, 'ha preso anche i movimenti di un altro giorno: ' + g.righe);
  deve(g.entrate === 250 && g.uscite === 80 && g.saldo === 170, 'i totali del giorno: ' + JSON.stringify(g));
  deve(g.per_conto.length === 2, 'non separa i conti');
  const cassa = g.per_conto.find(c => c.conto_id === 'kx');
  /* Il saldo A FINE GIORNATA, non solo il movimento del giorno: e' quello che
     si confronta con la cassa contata. 100 iniziali + 999 (il 19) + 250. */
  deve(cassa.saldo === 250 && cassa.saldo_fine === 1349, 'saldo del giorno vs saldo a fine giornata: ' + JSON.stringify(cassa));
  /* Un movimento annullato non fa parte della giornata. */
  const conAnn = G.concat([M({ id: 'g4', data: '2026-09-20', conto_id: 'kx', causale_id: inc, importo: 500, annullato_il: 'x', annullato_perche: 'y' })]);
  deve(C.giornata('2026-09-20', conAnn, [CASSA_M5, BANCA_M5], { causali: CAU }).entrate === 250, 'un annullato entra nella giornata');
  return '250 in, 80 out, due conti, saldo a fine giornata 1.349';
});

prova('IL SEMAFORO HA TRE LUCI, e il grigio non e\' un verde prudente', () => {
  /* La regola: «non si puo' dire» e' una risposta, e va data. Un grigio
     mostrato come verde direbbe che la giornata quadra quando non c'e' niente
     con cui confrontarla — la stessa bugia della quadratura mai fatta. */
  const g = C.giornata('2026-09-20', G, [CASSA_M5, BANCA_M5], { causali: CAU });
  deve(C.semaforoGiornata(g, 170).stato === 'verde', 'una giornata che quadra non e\u2019 verde');
  const r = C.semaforoGiornata(g, 200);
  deve(r.stato === 'rosso' && r.differenza === -30, 'una giornata che non quadra: ' + JSON.stringify(r));
  deve(/dichiarato .* in piu/.test(r.motivo), 'non dice da che parte sta la differenza: ' + r.motivo);
  const r2 = C.semaforoGiornata(g, 140);
  deve(r2.differenza === 30 && /movimenti dicono/.test(r2.motivo), 'verso opposto sbagliato');
  /* Grigio nei due casi in cui manca un lato del confronto. */
  deve(C.semaforoGiornata(g, null).stato === 'grigio', 'senza dichiarato non e\u2019 grigio');
  const vuota = C.giornata('2026-01-01', G, [CASSA_M5], { causali: CAU });
  deve(C.semaforoGiornata(vuota, 500).stato === 'grigio', 'senza movimenti non e\u2019 grigio');
  /* E un centesimo di arrotondamento non fa rosso. */
  deve(C.semaforoGiornata(g, 169.99).stato === 'verde', 'un centesimo fa diventare rossa la giornata');
  return 'verde, rosso col verso, grigio nei due casi in cui manca un lato';
});

prova('il fondo cassa sono le CASSE, non tutto quello che ha un saldo', () => {
  /* Un conto corrente non e' fondo cassa: sommarlo darebbe un numero che
     nessuno puo' contare aprendo il cassetto. */
  const f = C.fondoCassa([CASSA_M5, BANCA_M5], G, { causali: CAU });
  deve(f.quante === 1 && f.casse.length === 1, 'ha contato anche la banca come cassa');
  deve(f.totale === 1349, 'il fondo cassa: ' + f.totale);
  /* A una data, per il giorno prima. */
  deve(C.fondoCassa([CASSA_M5, BANCA_M5], G, { causali: CAU, al: '2026-09-19' }).totale === 1099, 'il fondo cassa a data');
  /* Una cassa spenta non conta piu'. */
  deve(C.fondoCassa([Object.assign({}, CASSA_M5, { attivo: false })], G, { causali: CAU }).quante === 0, 'una cassa spenta conta ancora');
  return '1.349 nelle casse, la banca fuori';
});

prova('le ANOMALIE dicono che cosa fare, e non si inventano quando non sanno', () => {
  const sosp = [
    { id: 's1', stato: 'aperto', mezzo: 'pos', importo: 300, data_incasso: '2026-08-01', conto_id: 'ky' }, // in ritardo
    { id: 's2', stato: 'aperto', mezzo: 'pos', importo: 100, data_incasso: '2026-09-20', conto_id: 'ky' }
  ];
  const tit = [{ id: 't1', importo_lordo: 500 }, { id: 't2', importo_lordo: 200 }];
  const movConTitolo = G.concat([M({ id: 'g9', data: '2026-09-20', conto_id: 'kx', causale_id: inc, importo: 500, titolo_id: 't1' })]);
  const a = C.anomalie({ conti: [CASSA_M5, BANCA_M5], movimenti: movConTitolo, sospesi: sosp,
                         titoli: tit, causali: CAU, oggi: '2026-09-20' });
  const t = (k) => a.find(x => new RegExp(k, 'i').test(x.titolo));
  deve(t('non arrivano'), 'non segnala gli incassi fermi');
  deve(t('non arrivano').quanti === 1 && t('non arrivano').importo === 300, 'conta male gli incassi fermi');
  /* La rata gia' portata dentro NON e' un'anomalia: t1 ha il suo movimento. */
  const fuori = t('il conto non sa');
  deve(fuori && fuori.quanti === 1 && fuori.importo === 200, 'conta anche le rate gia\u2019 entrate: ' + JSON.stringify(fuori));
  /* Ogni riga dice il verbo: un elenco di problemi senza «che cosa fare» e'
     un elenco che nessuno guarda due volte. */
  deve(a.every(x => x.dafare && x.dafare.length > 20), 'una riga non dice che cosa fare');
  /* Il rosso viene prima del giallo. */
  deve(a[0].gravita === 'rosso', 'i rossi non stanno in cima: ' + a.map(x => x.gravita).join(','));
  return a.length + ' anomalie, ordinate, ognuna col suo verbo';
});

prova('le anomalie della configurazione: conti muti e nessuna cassa', () => {
  /* Senza i mezzi dichiarati ogni incasso legge «non si sa» (M4): e\u2019 una
     configurazione mancante, non un errore — giallo, non rosso. */
  const muto = { id: 'kz', nome: 'Conto', tipologia: 'banca', attivo: true, mezzi: [] };
  const a = C.anomalie({ conti: [muto], movimenti: [], causali: CAU, oggi: '2026-09-20' });
  deve(a.some(x => /che cosa ricevono/.test(x.titolo)), 'un conto senza mezzi non viene segnalato');
  deve(a.some(x => /cassa contanti/.test(x.titolo)), 'la cassa contanti mancante non viene segnalata');
  deve(a.every(x => x.gravita === 'giallo'), 'una configurazione mancante e\u2019 segnata come errore');
  /* Con la cassa e i mezzi a posto, quelle due spariscono. */
  const b = C.anomalie({ conti: [CASSA_M5, BANCA_M5], movimenti: [], causali: CAU, oggi: '2026-09-20' });
  deve(!b.some(x => /che cosa ricevono|cassa contanti/.test(x.titolo)), 'restano segnalate anche a posto');
  return 'due anomalie di configurazione, e spariscono quando si configura';
});

prova('un movimento la cui causale non esiste piu\' e\' un ROSSO', () => {
  /* Senza causale non ha un verso, quindi NON entra nei saldi (si e' gia'
     provato sopra): un saldo a cui manca una riga non torna, e non si vede da
     dove. */
  const orf = [M({ id: 'o1', data: '2026-09-20', conto_id: 'kx', causale_id: 'sparita', importo: 400 })];
  const a = C.anomalie({ conti: [CASSA_M5], movimenti: orf, causali: CAU, oggi: '2026-09-20' });
  const r = a.find(x => /senza causale/.test(x.titolo));
  deve(r && r.gravita === 'rosso' && r.importo === 400, 'un movimento orfano non e\u2019 un rosso: ' + JSON.stringify(r));
  return 'rosso, con l\u2019importo che resta fuori dai saldi';
});

prova('le anomalie dei conti mai verificati arrivano dalla quadratura, non da un\'altra regola', () => {
  /* Due regole sulla stessa cosa divergono: qui si riusa `quadrature` (M3). */
  const a = C.anomalie({ conti: [CASSA_M5], movimenti: G, causali: CAU, quadrature: [], oggi: '2026-09-20' });
  deve(a.some(x => /mai verificati/.test(x.titolo)), 'un conto mai verificato non viene segnalato');
  const b = C.anomalie({ conti: [CASSA_M5], movimenti: G, causali: CAU,
    quadrature: [{ conto_id: 'kx', data: '2026-09-20', saldo_dichiarato: 1349 }], oggi: '2026-09-20' });
  deve(!b.some(x => /mai verificati|non quadrano/.test(x.titolo)), 'un conto che quadra viene segnalato lo stesso');
  const c = C.anomalie({ conti: [CASSA_M5], movimenti: G, causali: CAU,
    quadrature: [{ conto_id: 'kx', data: '2026-09-20', saldo_dichiarato: 1000 }], oggi: '2026-09-20' });
  const q = c.find(x => /non quadrano/.test(x.titolo));
  deve(q && q.gravita === 'rosso' && q.importo === 349, 'un conto che non quadra: ' + JSON.stringify(q));
  /* Senza le quadrature NON si dice niente: «non e' stato verificato» e «non
     ho i dati per dirlo» sono due cose diverse. */
  deve(!C.anomalie({ conti: [CASSA_M5], movimenti: G, causali: CAU, oggi: '2026-09-20' })
        .some(x => /mai verificati|non quadrano/.test(x.titolo)),
    'senza le quadrature si pronuncia lo stesso');
  return 'una regola sola, e il silenzio quando i dati non ci sono';
});

/* ═══ M6 — LE COORDINATE DELLE RIMESSE (20/09/2026) ═════════════════════════ */

prova('le coordinate su cui si versa le dice il CONTO, e quando non ci sono si dice perché', () => {
  /* Il giorno in cui l'agenzia cambia banca si cambia una riga in una
     schermata: un IBAN scritto dentro un programma resta quello vecchio, e
     l'estratto conto del mese dopo manda dei bonifici a un conto chiuso. */
  const buono = { nome: 'RIMESSE', attivo: true, rimesse: true, iban: 'IT60 X054 2811 1010 0000 0123 456', intestatario: 'Agenzia' };
  const ok = C.coordinateRimesse([{ nome: 'AZIENDALE', attivo: true }, buono]);
  deve(ok.ok && ok.intestatario === 'Agenzia', 'il conto delle rimesse non si trova: ' + JSON.stringify(ok));
  deve(/^IT60 X054 /.test(ok.iban), 'l\'IBAN non esce a gruppi di quattro, come lo stampano le banche: ' + ok.iban);
  /* Quattro modi di non averle, e ognuno dice una cosa diversa da fare. */
  const senza = C.coordinateRimesse([{ nome: 'A', attivo: true }]);
  deve(!senza.ok && /spunta/.test(senza.motivo), 'nessun conto segnato: ' + JSON.stringify(senza));
  const vuoto = C.coordinateRimesse([{ nome: 'A', attivo: true, rimesse: true }]);
  deve(!vuoto.ok && /IBAN/.test(vuoto.motivo), 'conto segnato senza IBAN: ' + JSON.stringify(vuoto));
  /* Vuoto si vede, sbagliato no: un IBAN col refuso manda una persona a fare
     un bonifico che non arriva, e non se ne accorge nessuno finché non lo
     cerca. Il controllo è quello dello standard, e c'era già. */
  const storto = C.coordinateRimesse([{ nome: 'A', attivo: true, rimesse: true, iban: 'IT60X0542811101000000123457' }]);
  deve(!storto.ok && /refuso/.test(storto.motivo), 'un IBAN col refuso passa: ' + JSON.stringify(storto));
  deve(!storto.iban || storto.iban.indexOf('IT60') === 0, 'l\'IBAN sbagliato non si mostra nemmeno per correggerlo');
  /* Due conti che dicono «i soldi vengono a me» non si scelgono a caso: il
     database lo impedisce con un indice unico, ma il motore legge dei dati
     che non ha scritto lui. */
  const due = C.coordinateRimesse([buono, { nome: 'B', attivo: true, rimesse: true, iban: 'DE89370400440532013000' }]);
  deve(!due.ok && /uno solo/.test(due.motivo), 'con due conti ne sceglie uno: ' + JSON.stringify(due));
  /* E un conto SPENTO non decide più dove vanno i soldi. */
  deve(!C.coordinateRimesse([{ nome: 'A', attivo: false, rimesse: true, iban: 'DE89370400440532013000' }]).ok,
    'un conto spento detta ancora le coordinate');
  return 'uno buono, e quattro modi di non averle, ognuno col suo motivo';
});

prova('il controllo dell\'IBAN è UNO, e sta qui', () => {
  /* La regola non si riscrive nel motore dell'estratto conto: due controlli
     dello stesso IBAN sono due regole, e quella che sbaglia è quella che
     nessuno guarda. Questa prova lo misura sul SORGENTE dell'altro motore. */
  const altro = readFileSync(join(RADICE, 'tariffe', 'motore', 'estratto-conto.js'), 'utf8');
  const codice = altro.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
  deve(!/function ibanValido/.test(codice), 'il controllo dell\'IBAN è tornato in due posti');
  deve(!/% 97/.test(codice), 'l\'aritmetica del controllo IBAN è stata ricopiata nell\'altro motore');
  /* E il controllo vero fa il suo mestiere. */
  deve(C.ibanValido('IT60X0542811101000000123456') && C.ibanValido('DE89370400440532013000'), 'un IBAN valido viene rifiutato');
  deve(!C.ibanValido('IT60X0542811101000000123457'), 'una cifra cambiata passa il controllo');
  deve(!C.ibanValido('IT60X05428111010000001234'), 'un IBAN italiano troncato passa il controllo');
  return 'una regola sola, e fa il suo mestiere';
});



/* ═══ IL DETTAGLIO DI UN CONTO (Blocco 3 · punto 7, 20/09/2026) ═════════════

   L'elenco dei conti dice un saldo per riga; queste prove sorvegliano la
   schermata che risponde a «perché è quello», e le due cose che, sbagliate,
   producono un conto credibile e falso: un progressivo che riparte da metà
   strada, e uno storico di quadrature che nasconde una scrittura retroattiva.
   ═══════════════════════════════════════════════════════════════════════════ */
const D_CONTO = { id: 'd1', nome: 'Conto di prova', tipologia: 'banca', natura: 'aziendale', saldo_iniziale: 1000 };
const D_INC = byCod('provvigioni_entrata').id;   /* entrata, incide sull'utile */
const D_USC = byCod('affitti').id;               /* uscita */
const D_MOV = [
  { id: 'd-a', conto_id: 'd1', data: '2026-01-10', importo: 100, causale_id: D_INC },
  { id: 'd-b', conto_id: 'd1', data: '2026-02-10', importo: 40,  causale_id: D_USC },
  { id: 'd-c', conto_id: 'd1', data: '2026-03-10', importo: 200, causale_id: D_INC },
  /* di un altro conto: non deve entrare da nessuna parte */
  { id: 'd-x', conto_id: 'd9', data: '2026-02-11', importo: 5000, causale_id: D_INC }
];

prova('il dettaglio somma solo i movimenti DI QUEL conto', () => {
  const d = C.dettaglioConto(D_CONTO, D_MOV, [], { causali: CAU });
  deve(d.saldo === 1260, 'il saldo del conto non è 1000+100-40+200: ' + d.saldo);
  deve(d.totali === 3, 'sono entrate righe di un altro conto: ' + d.totali);
  deve(!d.righe.some(r => r.movimento.id === 'd-x'), 'il movimento di un altro conto è finito nel dettaglio');
  return '1.260 €, tre righe';
});

prova('il progressivo parte SEMPRE dall\'inizio, anche guardando un periodo', () => {
  /* La regola che rende onesta la finestra: un saldo progressivo che riparte
     dal saldo iniziale in mezzo a un periodo è un numero falso, e falso in un
     modo che nessuno controlla — sembra un saldo. */
  const d = C.dettaglioConto(D_CONTO, D_MOV, [], { causali: CAU, dal: '2026-02-01', al: '2026-12-31' });
  deve(d.mostrate === 2, 'la finestra non mostra due righe: ' + d.mostrate);
  deve(d.totali === 3, 'la finestra ha cambiato il conteggio totale');
  /* Il saldo di apertura del periodo è quello che il conto aveva PRIMA. */
  deve(d.apertura === 1100, 'il saldo di apertura del periodo non è 1.100: ' + d.apertura);
  /* E la prima riga mostrata porta il progressivo VERO, non uno che riparte. */
  deve(d.righe[0].saldo === 1060, 'il progressivo è ripartito da capo: ' + d.righe[0].saldo);
  deve(d.saldo === 1260, 'il saldo del conto è stato tagliato dal periodo: ' + d.saldo);
  return 'apertura 1.100, prima riga 1.060, saldo 1.260';
});

prova('quello che resta fuori dal saldo si CONTA e si dichiara', () => {
  /* Un movimento la cui causale non esiste più non ha verso e non entra nel
     saldo — ed è giusto, non si indovina. Ma un saldo che ignora delle righe
     in silenzio è un saldo di cui nessuno può fidarsi. */
  const conFuori = D_MOV.concat([{ id: 'd-orfano', conto_id: 'd1', data: '2026-04-01', importo: 77, causale_id: 'sparita' }]);
  const d = C.dettaglioConto(D_CONTO, conFuori, [], { causali: CAU });
  deve(d.saldo === 1260, 'un movimento senza verso è entrato nel saldo: ' + d.saldo);
  deve(d.fuori_dal_saldo.righe === 1, 'la riga fuori dal saldo non viene contata');
  deve(d.fuori_dal_saldo.importo === 77, 'il peso di quello che resta fuori non si legge: ' + d.fuori_dal_saldo.importo);
  /* Senza segno, perché il verso è proprio la cosa che non si sa. */
  deve(d.righe.some(r => r.incerto && r.delta === 0), 'la riga incerta non è marcata, o le è stato dato un verso');
  return '1 riga, 77 € senza verso';
});

prova('un movimento annullato non è un movimento, e si dice quanti sono', () => {
  const conAnn = D_MOV.concat([{ id: 'd-ann', conto_id: 'd1', data: '2026-05-01', importo: 500, causale_id: D_INC, annullato_il: '2026-05-02' }]);
  const d = C.dettaglioConto(D_CONTO, conAnn, [], { causali: CAU });
  deve(d.saldo === 1260, 'un movimento annullato è entrato nel saldo: ' + d.saldo);
  deve(d.annullati === 1, 'gli annullati non si contano');
  return 'fuori dal saldo, dentro al conteggio';
});

prova('lo storico confronta OGNI dichiarazione alla SUA data', () => {
  /* Oggi l'elenco confronta solo la più recente: una quadratura di gennaio
     che non tornava restava invisibile per sempre. */
  const dich = [
    { conto_id: 'd1', data: '2026-01-31', saldo_dichiarato: 1100 },   /* giusto */
    { conto_id: 'd1', data: '2026-02-28', saldo_dichiarato: 1000 },   /* sbagliato di 60 */
    { conto_id: 'd9', data: '2026-02-28', saldo_dichiarato: 1 }       /* di un altro conto */
  ];
  const st = C.storicoQuadrature(D_CONTO, D_MOV, dich, { causali: CAU });
  deve(st.length === 2, 'lo storico non ha due righe (o ha preso quella di un altro conto): ' + st.length);
  deve(st[0].data === '2026-02-28', 'lo storico non parte dalla più recente');
  deve(st[0].quadra === false && st[0].differenza === 60, 'febbraio non risulta sbagliato di 60: ' + st[0].differenza);
  deve(st[1].quadra === true, 'gennaio non risulta quadrato');
  return 'gennaio quadra, febbraio no';
});

prova('una scrittura RETROATTIVA fa smettere di quadrare un giorno che quadrava', () => {
  /* La decisione che distingue questo storico da un fascicolo congelato
     (CLAUDE.md §11 regola 4): la dichiarazione è un fatto della banca e non
     cambia, la ricostruzione è quello che il sistema dice OGGI per quella
     data. Congelando la differenza, la scrittura con la data vecchia
     sparirebbe dalla vista — cioè si nasconderebbe proprio il caso per cui la
     quadratura esiste. */
  const dich = [{ conto_id: 'd1', data: '2026-01-31', saldo_dichiarato: 1100 }];
  deve(C.storicoQuadrature(D_CONTO, D_MOV, dich, { causali: CAU })[0].quadra === true,
    'la premessa è sbagliata: gennaio non quadrava già prima');
  const conRetro = D_MOV.concat([{ id: 'd-retro', conto_id: 'd1', data: '2026-01-05', importo: 300, causale_id: D_INC }]);
  const dopo = C.storicoQuadrature(D_CONTO, conRetro, dich, { causali: CAU })[0];
  deve(dopo.quadra === false, 'un movimento scritto con una data vecchia non fa saltare la quadratura di gennaio');
  deve(dopo.differenza === 300, 'la differenza non è quella del movimento retroattivo: ' + dopo.differenza);
  deve(/in più della dichiarazione/.test(dopo.motivo || ''), 'non dice da che parte sta la differenza');
  return 'gennaio quadrava, adesso no: +300';
});

prova('«mai dichiarato» resta una riga vuota, non una riga verde', () => {
  const d = C.dettaglioConto(D_CONTO, D_MOV, [], { causali: CAU });
  deve(d.quadrature.length === 0, 'senza dichiarazioni lo storico inventa una riga');
  /* E il riepilogo per causale segue la finestra che si sta guardando. */
  const p = C.dettaglioConto(D_CONTO, D_MOV, [], { causali: CAU, dal: '2026-03-01' });
  deve(p.per_causale.length === 1 && p.per_causale[0].totale === 200,
    'il riepilogo per causale non segue il periodo');
  return 'nessuna riga inventata';
});

console.log('\n══ CONTI E CAUSALI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCONTI E CAUSALI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
