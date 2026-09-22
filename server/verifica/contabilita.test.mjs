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
/* La chiave è quella che il vincolo del database ammette, e non è una scelta
   di questo banco: fino al 21/09/2026 qui ne stava un'altra, e il banco era
   verde mentre in produzione nessun incasso in contanti trovava la sua cassa.
   Un banco che si scrive un vocabolario suo misura un mondo che non esiste. */
const CASSA_C = { id: 'kc', nome: 'Cassa', natura: 'premi', attivo: true, mezzi: ['contante'] };
const BANCA_C = { id: 'kb', nome: 'Banca premi', natura: 'premi', attivo: true, mezzi: ['pos', 'bonifico', 'carta_credito'] };
const CONTI_M4 = [CASSA_C, BANCA_C];

prova('i CONTANTI entrano in cassa, tutto il resto e\' denaro per strada', () => {
  /* Regola 8. E' la distinzione su cui poggia tutta la M4: se cade, il saldo
     del conto dice di avere dei soldi che arriveranno fra tre giorni. */
  const c = C.destinoIncasso({ mezzo_pagamento: 'contante', importo_lordo: 100, incassato_il: '2026-09-20' }, CONTI_M4);
  deve(c.tipo === 'cassa', 'i contanti non entrano in cassa: ' + c.tipo);
  deve(c.conto.id === 'kc', 'i contanti non vanno sulla cassa');
  deve(c.giorni_attesi === 0, 'i contanti hanno un tempo di attesa');
  for (const m of ['pos', 'bonifico', 'assegno', 'carta_credito', 'paypal', 'domiciliazione']) {
    const r = C.destinoIncasso({ mezzo_pagamento: m, importo_lordo: 100 }, [CASSA_C, BANCA_C, { id: 'kx', nome: 'Altro', attivo: true, mezzi: ['assegno', 'paypal', 'domiciliazione'] }]);
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

/* ═══ IL VOCABOLARIO DEI MEZZI DI PAGAMENTO È UNO SOLO (21/09/2026) ═══════
   Il guardiano che mancava, e la sua mancanza è costata un guasto muto: due
   elenchi della stessa cosa, scritti a due giorni di distanza, con due chiavi
   diverse su nove — e una delle due era quella dei contanti.

   Le chiavi si leggono dagli OGGETTI, non dal sorgente: un commento che
   nomina una chiave vecchia per spiegare perché è stata tolta farebbe
   diventare rossa questa prova su un codice giusto (§10, §12, §18, §26, §29,
   §31, §33, §34, §37, §41, §42). Il solo posto che va letto come testo è la
   migrazione, e lì si tolgono le righe di commento. */
prova('il vocabolario dei mezzi di pagamento è uno solo, e comanda il database', () => {
  const sql = readFileSync(join(RADICE, 'supabase', 'migrations', '20260918_mezzo_pagamento_e_collaboratori.sql'), 'utf8')
    .split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
  const blocco = sql.match(/quote_titoli_mezzo_pagamento_check[\s\S]{0,400}?\)\s*;/);
  deve(blocco, 'non trovo il vincolo dei mezzi nella migrazione');
  const dalDb = [...blocco[0].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
  deve(dalDb.length >= 8, 'il vincolo letto dalla migrazione ha solo ' + dalDb.length + ' voci');

  const dalMotore = C.MEZZI.map(m => m.k).sort();
  deve(JSON.stringify(dalMotore) === JSON.stringify(dalDb),
    'contabilita.js non dice le stesse chiavi del database.\n      database: ' + dalDb.join(', ') +
    '\n      motore:   ' + dalMotore.join(', '));

  /* Il lettore dei flussi riempie la stessa colonna: se scrivesse altre
     chiavi, il vincolo le rifiuterebbe una per una all'importazione. */
  const F = require('../../tariffe/motore/flusso-ssf.js');
  const dalFlusso = (F.MEZZI || []).map(m => m.id).sort();
  deve(JSON.stringify(dalFlusso) === JSON.stringify(dalDb),
    'flusso-ssf.js non dice le stesse chiavi del database.\n      flusso: ' + dalFlusso.join(', '));

  /* E la tendina con cui si corregge a mano, in QUOTO. Qui si legge il
     sorgente perché è un monolite: si ritaglia il solo oggetto. */
  const html = readFileSync(join(RADICE, 'index.html'), 'utf8');
  const tit = html.match(/const TIT_MEZZI = \{[\s\S]*?\};/);
  deve(tit, 'non trovo TIT_MEZZI in index.html');
  const dallaTendina = [...tit[0].matchAll(/([a-z_]+):\s*'/g)].map(m => m[1]).sort();
  deve(JSON.stringify(dallaTendina) === JSON.stringify(dalDb),
    'la tendina dei Titoli non dice le stesse chiavi del database.\n      tendina: ' + dallaTendina.join(', '));

  /* E il quinto posto, che il 21/09/2026 era il più rotto di tutti: la
     tendina «Come paga» di «Nuova polizza» era scritta a mano e portava TRE
     chiavi che il vincolo non ammette. Chi le sceglieva non otteneva un campo
     sbagliato: otteneva una polizza che non si salvava. Adesso quella tendina
     si costruisce dal vocabolario, e questa prova pretende che resti così. */
  const pnu = html.match(/<label>Come paga<\/label><select id="pnu-mezzo">[\s\S]{0,400}?<\/select>/);
  deve(pnu, 'non trovo la tendina «Come paga» di Nuova polizza');
  const scritte = [...pnu[0].matchAll(/<option value="([a-z_]+)"/g)].map(m => m[1]);
  const fuori = scritte.filter(k => !dalDb.includes(k));
  deve(!fuori.length, 'la tendina di Nuova polizza scrive a mano chiavi che il database rifiuta: ' + fuori.join(', '));
  deve(/pnuOpzioniMezzo\(\)/.test(pnu[0]), 'la tendina di Nuova polizza non si costruisce dal vocabolario');
  return dalDb.length + ' chiavi identiche in cinque posti';
});

/* Il guasto vero, rifatto in laboratorio: una rata incassata in contanti deve
   trovare la sua cassa. Prima del 21/09/2026 non la trovava mai — e non per
   una configurazione sbagliata, ma perché le due parole non erano la stessa. */
prova('una rata incassata in contanti trova la cassa e si registra oggi', () => {
  const cassa = Object.assign({}, CASSA, { mezzi: ['contante'] });
  const r = C.destinoIncasso({ mezzo_pagamento: 'contante', importo_lordo: 45, incassato_il: '2026-09-16' }, [cassa]);
  deve(r.tipo === 'cassa', 'un incasso in contanti risulta «' + r.tipo + '»: ' + (r.motivo || ''));
  deve(r.conto && r.conto.id === cassa.id, 'non ha trovato la cassa');
  /* E la controprova dell'altro verso: una chiave che il database non ammette
     non si fa passare per somiglianza. */
  const storto = C.destinoIncasso({ mezzo_pagamento: 'contanti', importo_lordo: 45 }, [cassa]);
  deve(storto.tipo === 'non-si-sa', 'una chiave fuori vocabolario è stata accettata: ' + storto.tipo);
  return 'contanti in cassa lo stesso giorno, e niente somiglianze';
});

/* ═══ LE TRE ANOMALIE CHE MANCAVANO (21/09/2026) ═════════════════════════ */
prova('due conti che dichiarano lo stesso mezzo si dicono, prima che arrivi una rata', () => {
  const a = { id: 'x1', nome: 'Cassa', tipologia: 'cassa', natura: 'premi', attivo: true, mezzi: ['contante'] };
  const b = { id: 'x2', nome: 'Conto HDI', tipologia: 'banca', natura: 'premi', attivo: true, mezzi: ['contante', 'pos'] };
  const conf = C.mezziInConflitto([a, b]);
  deve(conf.length === 1, 'conflitti trovati: ' + conf.length + ' invece di 1');
  deve(conf[0].mezzo === 'contante' && conf[0].conti.length === 2, 'il conflitto non nomina i due conti');
  /* Un conto spento non litiga con nessuno: è uscito dalle tendine. */
  deve(!C.mezziInConflitto([a, Object.assign({}, b, { attivo: false })]).length, 'un conto spento conta come conflitto');
  /* E un mezzo su un conto solo non è una notizia. */
  deve(!C.mezziInConflitto([a]).length, 'un mezzo su un conto solo risulta in conflitto');

  const an = C.anomalie({ conti: [a, b], oggi: '2026-09-21' });
  const v = an.find(x => /stesso mezzo/i.test(x.titolo));
  deve(v, 'l\'anomalia dei mezzi doppi non compare: ' + an.map(x => x.titolo).join(' | '));
  deve(/Cassa/.test(v.dafare) && /Conto HDI/.test(v.dafare), 'non dice QUALI conti: ' + v.dafare);
  return 'il conflitto si vede quando si configura, non quando si incassa';
});

prova('i contanti su un conto che non è una cassa si dicono: il fondo cassa non lo conta', () => {
  const finto = { id: 'y1', nome: 'CASSA CONTANTI', tipologia: 'altro', natura: 'premi', attivo: true, mezzi: ['contante'] };
  const an = C.anomalie({ conti: [finto], oggi: '2026-09-21' });
  const v = an.find(x => /non e.* una cassa/i.test(x.titolo));
  deve(v, 'non lo dice: ' + an.map(x => x.titolo).join(' | '));
  deve(/CASSA CONTANTI/.test(v.dafare), 'non nomina il conto: ' + v.dafare);
  /* Il nome non basta e non deve bastare: è la TIPOLOGIA che il fondo cassa
     somma. Con quella giusta l'anomalia sparisce. */
  const ok = C.anomalie({ conti: [Object.assign({}, finto, { tipologia: 'cassa' })], oggi: '2026-09-21' });
  deve(!ok.find(x => /non e.* una cassa/i.test(x.titolo)), 'con la tipologia giusta lo dice lo stesso');
  deve(C.fondoCassa([finto], []).quante === 0, 'il fondo cassa conta un conto che non è una cassa');
  return 'il nome non conta, la tipologia sì';
});

prova('le polizze senza nemmeno una rata sono un\'anomalia rossa, col verbo', () => {
  const an = C.anomalie({ conti: CONTI, oggi: '2026-09-21', portafoglio: { senza_rate: 1700, premio: 412345.67 } });
  const v = an.find(x => /senza nemmeno una rata/i.test(x.titolo));
  deve(v, 'non compare: ' + an.map(x => x.titolo).join(' | '));
  deve(v.gravita === 'rosso', 'non è rossa ma «' + v.gravita + '»');
  deve(v.quanti === 1700, 'quante: ' + v.quanti);
  deve(/ricaricando lo stesso file/i.test(v.dafare), 'non dice che cosa fare: ' + v.dafare);
  /* Zero polizze senza rate non è una notizia, e nemmeno un conteggio che non
     si è potuto fare: «non lo so» non è «ce ne sono» (§12, §18). */
  deve(!C.anomalie({ conti: CONTI, portafoglio: { senza_rate: 0 } }).find(x => /senza nemmeno una rata/i.test(x.titolo)),
    'con zero polizze la mostra lo stesso');
  deve(!C.anomalie({ conti: CONTI }).find(x => /senza nemmeno una rata/i.test(x.titolo)),
    'senza il conteggio se lo inventa');
  return '1.700 righe con il premio e il verbo';
});

/* ═══════════════════════════════════════════════════════════════════════════
   FASE 1 — LE FONDAMENTA A PARTITA DOPPIA (21/09/2026)

   Le prove che, saltando, producono una contabilità che sembra giusta:
   un movimento che non quadra e nessuno lo sa, uno storno fatto due volte che
   rovescia il saldo dalla parte sbagliata, un movimento vecchio a cui il
   sistema inventa la contropartita.
   ═══════════════════════════════════════════════════════════════════════════ */

const MIGR1 = join(RADICE, 'supabase/migrations/20260922_contab_partita_doppia.sql');

/* Le righe di CODICE della migrazione, senza i commenti che cominciano a
   inizio riga. Il blocco del ROLLBACK è tutto commentato e nomina ogni cosa
   che la migrazione crea: cercare lì dentro vorrebbe dire trovare sempre
   quello che si cerca — è la trappola dei commenti (§10, §12, §29, §41), e
   qui sarebbe particolarmente comoda perché il rollback è la fotografia
   esatta della migrazione. Mai una regex globale (§12). */
function soloCodice(testo) {
  return testo.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
}

prova('Dare e Avere devono pareggiare, e la differenza si dice col suo verso', () => {
  const b = C.bilanciato([{ dare: 400 }, { avere: 400 }]);
  deve(b.ok, 'un movimento che quadra risulta sbilanciato: ' + b.motivo);
  deve(b.dare === 400 && b.avere === 400 && b.differenza === 0, 'i totali non tornano');

  const ko = C.bilanciato([{ dare: 400 }, { avere: 390 }]);
  deve(!ko.ok, 'un movimento sbilanciato passa');
  deve(ko.differenza === 10, 'la differenza è ' + ko.differenza);
  /* Il verso della differenza non è cortesia: «mancano 10 in Avere» e
     «mancano 10 in Dare» mandano a correggere due righe diverse. */
  deve(/in Avere/.test(ko.motivo), 'non dice da che parte manca: ' + ko.motivo);
  const ko2 = C.bilanciato([{ dare: 390 }, { avere: 400 }]);
  deve(/in Dare/.test(ko2.motivo), 'il verso opposto non si distingue: ' + ko2.motivo);

  /* Il centesimo non si perde per strada: tre terzi di 100 fanno 100. */
  deve(C.bilanciato([{ dare: 33.33 }, { dare: 33.33 }, { dare: 33.34 }, { avere: 100 }]).ok,
    '33,33 + 33,33 + 33,34 non fa 100');
  return 'quadra a 400, e la differenza dice da che parte manca';
});

prova('una riga sola non è partita doppia, e un movimento senza righe nemmeno', () => {
  const una = C.bilanciato([{ dare: 100 }]);
  deve(!una.ok, 'una riga sola passa');
  deve(/almeno due/.test(una.motivo), 'il motivo non lo spiega: ' + una.motivo);
  const zero = C.bilanciato([]);
  deve(!zero.ok && /non ha righe/.test(zero.motivo), 'zero righe: ' + zero.motivo);
  /* E non basta che i totali coincidano: due righe a zero pareggiano e non
     muovono niente. Lo prende `validaRighe`, riga per riga. */
  const e = C.validaRighe([{ conto_id: 'k1', dare: 0 }, { conto_id: 'k2', avere: 0 }], { conti: CONTI });
  deve(e.length >= 2, 'due righe a zero passano: ' + e.join(' | '));
  return 'una riga sola, zero righe e due righe a zero: tre no diversi';
});

prova('una riga con Dare E Avere non è una riga: sono due fatti', () => {
  const e = C.validaRighe([{ conto_id: 'k1', dare: 100, avere: 100 }, { conto_id: 'k2', avere: 100 }], { conti: CONTI });
  deve(e.some(x => /Dare sia in Avere/.test(x)), 'la riga a due colonne passa: ' + e.join(' | '));
  /* Il motivo del divieto, in una riga: quella scrittura si legge come zero,
     quindi due righe DIVERSE darebbero lo stesso saldo. */
  const finta = C.bilanciato([{ dare: 100, avere: 100 }, { dare: 50 }, { avere: 50 }]);
  deve(finta.dare === 150 && finta.avere === 150, 'i totali non sono quelli attesi');
  deve(finta.ok, 'per i soli totali quadra — ed è proprio il problema che la regola 11 chiude');
  return 'i totali quadrano lo stesso: è per questo che la riga è vietata';
});

prova('un importo negativo non è un verso: il verso è la colonna', () => {
  const e = C.validaRighe([{ conto_id: 'k1', dare: -100 }, { conto_id: 'k2', avere: -100 }], { conti: CONTI });
  deve(e.some(x => /negativo/.test(x)), 'i negativi passano: ' + e.join(' | '));
  /* E un conto spento non riceve più niente. */
  const spento = C.validaRighe(
    [{ conto_id: 'k9', dare: 10 }, { conto_id: 'k2', avere: 10 }],
    { conti: CONTI.concat([{ id: 'k9', nome: 'Vecchia cassa', tipologia: 'cassa', natura: 'premi', attivo: false }]) });
  deve(spento.some(x => /spento/.test(x)), 'si registra su un conto spento: ' + spento.join(' | '));
  return 'meno cento è un errore, non un’uscita';
});

prova('i divieti stanno nel DATABASE, non nella schermata', () => {
  const sql = soloCodice(readFileSync(MIGR1, 'utf8'));

  /* Regola 11, e sta in un CHECK perché è l'unico posto che nessuna strada
     aggira: c'è la console, c'è PostgREST, ci sarà QUOTO. */
  deve(/check\s*\(\s*\(dare > 0 and avere = 0\) or \(avere > 0 and dare = 0\)\s*\)/.test(sql),
    'il vincolo «Dare oppure Avere» non c\'è');

  /* Il bilancio si controlla a fine transazione: le righe arrivano una alla
     volta e dopo la prima il movimento è per forza sbilanciato. Un trigger
     immediato vorrebbe dire non poterne scrivere nessuna. */
  deve(/create constraint trigger iam_mov_righe_bilancio_trg/.test(sql), 'manca il trigger del bilancio');
  deve(/deferrable initially deferred/.test(sql), 'il trigger del bilancio non è differito a fine transazione');

  /* Regola 13, nei due versi: non si riscrive e non si cancella. */
  deve(/create trigger iam_mov_immutabile_trg before update on public\.iam_movimenti/.test(sql), 'manca il divieto di riscrittura');
  deve(/create trigger iam_mov_no_delete_trg before delete on public\.iam_movimenti/.test(sql), 'manca il divieto di cancellazione');
  /* E la porta di servizio: la testata bloccata con le righe libere sarebbe
     una porta chiusa con la finestra aperta. */
  deve(/create trigger iam_mov_righe_bloccate_trg/.test(sql), 'le righe di un movimento registrato non sono difese');

  /* Idempotenza: doppio clic e retry non fanno due movimenti. */
  deve(/create unique index if not exists iam_movimenti_idem_uq[\s\S]{0,200}where chiave_idempotenza is not null/.test(sql),
    'la chiave di idempotenza non è unica, o non è parziale');

  /* Chi vede e chi scrive. */
  deve(/enable row level security/.test(sql), 'le righe non hanno RLS');
  deve(/create policy righe_select[\s\S]{0,120}iam_is_staff\(\)/.test(sql), 'la lettura non è dello staff');
  deve(/create policy righe_write[\s\S]{0,160}iam_is_admin\(\)/.test(sql), 'la scrittura non è dell\'admin');
  return 'check, quattro trigger, indice unico parziale e due politiche';
});

prova('testata e righe si scrivono in una transazione sola, e non dalla pagina', () => {
  const sql = soloCodice(readFileSync(MIGR1, 'utf8'));
  /* Due richieste dalla pagina vorrebbero dire che, cadendo la seconda, resta
     una testata SENZA righe: un movimento che c'è, che si legge, che sembra a
     posto, e che non dice da dove viene il denaro. È il tutto-o-niente
     dell'importazione (§47) applicato alla contabilità. */
  deve(/create or replace function public\.iam_movimento_registra/.test(sql), 'la funzione di scrittura non c\'è');
  /* `security invoker`: le politiche valgono per CHI CHIAMA. Una funzione che
     scavalcasse la RLS sarebbe una seconda regola su chi scrive in
     contabilità, e quella che sbaglia sarebbe quella che nessuno guarda. */
  deve(/security invoker/.test(sql), 'la funzione scavalca le politiche di chi chiama');
  deve(!/security definer/.test(sql), 'la funzione gira con i permessi di chi l\'ha scritta');
  /* Idempotenza: il secondo giro non è un errore e non è un secondo
     movimento. È lo stesso movimento, e si restituisce il suo id. */
  deve(/if v_chiave is not null then[\s\S]{0,200}if v_id is not null then return v_id/.test(sql),
    'la chiave di idempotenza non corto-circuita il secondo giro');
  /* Uno storno marca l'originale NELLO STESSO COLPO: con due richieste, se
     cade la seconda, resta uno storno che non storna nulla. */
  deve(/update public\.iam_movimenti[\s\S]{0,200}set stato = 'stornato'/.test(sql),
    'lo storno non marca l\'originale nella stessa transazione');
  /* E `origine` ammette lo storno: senza, il primo storno sarebbe morto
     contro un vincolo dopo che la schermata aveva detto «sì, si può». */
  deve(/check \(origine in \([^)]*'storno'[^)]*\)\)/.test(sql), 'lo storno non è un\'origine ammessa');
  return 'una funzione, una transazione, e la RLS di chi chiama';
});

prova('nessun saldo memorizzato, e nessun conto seminato', () => {
  const sql = soloCodice(readFileSync(MIGR1, 'utf8'));
  /* Regola 1. Una colonna `saldo` si aggiorna da un'altra parte, e il giorno
     in cui si scosta dalla somma delle righe nessuno sa quale sia quello vero. */
  deve(!/add column if not exists saldo\b/.test(sql), 'la migrazione aggiunge una colonna saldo');

  /* I dodici conti minimi sono una PROPOSTA, non un seed: un conto è un posto
     dove stanno dei soldi e ha un saldo, e dodici saldi a zero che nessuno ha
     deciso diventano un dato dopo due settimane (§8.1). */
  deve(!/insert\s+into\s+public\.iam_conti/i.test(sql), 'la migrazione crea dei conti');
  deve(C.CONTI_MINIMI.length === 12, 'i conti minimi non sono dodici: ' + C.CONTI_MINIMI.length);
  return 'zero conti creati, dodici proposti';
});

prova('i dodici conti minimi si spiegano da soli, e i crediti non si quadrano', () => {
  const chiavi = C.TIPOLOGIE.map(t => t.k);
  for (const c of C.CONTI_MINIMI) {
    deve(c.nome && c.nome.length > 2, 'un conto minimo senza nome');
    deve(chiavi.indexOf(c.tipologia) >= 0, c.nome + ': tipologia «' + c.tipologia + '» non è nel vocabolario');
    deve(c.natura === 'premi' || c.natura === 'aziendale', c.nome + ': natura non valida');
    /* Ogni voce dice a che serve: una proposta senza il perché si accetta
       senza leggerla, ed è il modo di ritrovarsi dodici conti che nessuno sa
       a che cosa servono. */
    deve(c.note && c.note.length > 30, c.nome + ': non dice a che serve');
    /* Regola 9: quale mezzo arriva su quale conto lo decide l'agenzia. */
    deve(!c.mezzi || !c.mezzi.length, c.nome + ': la proposta decide già i mezzi di pagamento');
    /* Regola 12. */
    if (c.e_conto_sospeso) deve(c.e_quadrabile === false, c.nome + ': è un conto di crediti e si propone quadrabile');
  }
  /* Le otto tipologie del vocabolario sono le otto ammesse dal database. */
  const sql = soloCodice(readFileSync(MIGR1, 'utf8'));
  const m = sql.match(/check \(tipologia in \(([^)]*)\)\)/);
  deve(m, 'il vincolo delle tipologie non si trova');
  const nelSql = m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean).sort();
  deve(nelSql.join('|') === chiavi.slice().sort().join('|'),
    'il vocabolario delle tipologie non coincide col vincolo: SQL ' + nelSql.join(',') + ' — motore ' + chiavi.join(','));
  return '12 conti coerenti, 8 tipologie identiche in due posti';
});

prova('il genere di una causale dice da quale flusso nasce, e il vocabolario è uno', () => {
  const chiavi = C.GENERI.map(g => g.k);
  deve(chiavi.length === 6, 'i generi non sono sei: ' + chiavi.length);
  const sql = soloCodice(readFileSync(MIGR1, 'utf8'));
  const m = sql.match(/check \(genere in \(([\s\S]*?)\)\)/);
  deve(m, 'il vincolo del genere non si trova');
  const nelSql = m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean).sort();
  deve(nelSql.join('|') === chiavi.slice().sort().join('|'),
    'i generi non coincidono col vincolo: SQL ' + nelSql.join(',') + ' — motore ' + chiavi.join(','));

  /* La schermata propone quello che il salvataggio accetta: una sola regola. */
  deve(C.validaCausale({ nome: 'Prova', segno: 'uscita', incide_su_utile: true, genere: 'giroconto' }).ok,
    'un genere valido viene rifiutato');
  deve(!C.validaCausale({ nome: 'Prova', segno: 'uscita', incide_su_utile: true, genere: 'inventato' }).ok,
    'un genere inventato passa');
  /* Assente vuol dire «il default del database», non «errore». */
  deve(C.validaCausale({ nome: 'Prova', segno: 'uscita', incide_su_utile: true }).ok,
    'una causale senza genere viene rifiutata');
  return '6 generi identici in due posti, e l’assente vale il default';
});

prova('i tre flag di un conto, e il conto che non ha due padroni', () => {
  const base = { nome: 'Sospesi clienti', tipologia: 'credito', natura: 'premi' };

  /* Un conto è di UNA compagnia o di UN collaboratore: con tutti e due lo
     stesso saldo comparirebbe in due estratti conto diversi. */
  const due = C.validaConto(Object.assign({}, base, { compagnia_id: 'c1', collaboratore_id: 'p1' }), []);
  deve(!due.ok, 'un conto intestato a compagnia E collaboratore passa');
  deve(C.validaConto(Object.assign({}, base, { compagnia_id: 'c1' }), []).ok, 'un conto di una compagnia viene rifiutato');

  /* Il guasto muto del 21/09 in forma di avviso: la spunta «modo di pagare»
     senza nessun mezzo dichiarato non intercetta niente. */
  const muto = C.validaConto(Object.assign({}, base, { e_mezzo_pagamento: true, mezzi: [] }), []);
  deve(muto.avvisi.some(a => /nessun incasso ci arriver/i.test(a)), 'il conto muto non si segnala: ' + muto.avvisi.join(' | '));
  const dritto = C.validaConto(Object.assign({}, base, { e_mezzo_pagamento: true, mezzi: ['contante'] }), []);
  deve(!dritto.avvisi.some(a => /nessun incasso ci arriver/i.test(a)), 'con i mezzi dichiarati avvisa lo stesso');

  /* Regola 12, detta mentre si configura. */
  const cred = C.validaConto(Object.assign({}, base, { e_conto_sospeso: true, e_quadrabile: true }), []);
  deve(cred.avvisi.some(a => /scadenzario/i.test(a)), 'un conto di crediti quadrabile non avvisa: ' + cred.avvisi.join(' | '));
  deve(cred.ok, 'ed è un avviso, non un errore: bloccare qualcosa di possibile insegna a ignorare gli avvisi');
  return 'due padroni no, conto muto e credito quadrabile avvisano';
});

prova('un movimento scritto prima della partita doppia si legge com’è, non si completa', () => {
  const vecchio = { id: 'v1', numero: 1, stato: 'registrato', conto_id: 'k3', causale_id: byCod('incasso_premi').id, importo: 120 };
  const r = C.righeDi(vecchio, [], { causali: CAU });
  deve(r.derivate, 'non si accorge che le righe non ci sono');
  deve(r.righe.length === 1 && r.righe[0].dare === 120, 'la riga ricavata non è quella attesa');
  deve(r.quadra === false, 'un movimento a conto singolo risulta quadrato');
  /* E la nota lo dice in faccia: la contropartita non è persa, non è mai
     stata scritta. Inventarla vorrebbe dire scrivere in contabilità una cosa
     che nessuno ha deciso, e fra sei mesi nessuno saprebbe che l'ha scritta
     un programma (§8.1). */
  deve(/non è mai stata registrata|non si indovina/i.test(r.nota || ''), 'non dichiara la contropartita mancante: ' + r.nota);
  deve(r.righe.length === 1, 'ha aggiunto una riga che nessuno ha scritto');

  /* Con le righe vere, invece, si leggono quelle e si ordinano. */
  const vere = [
    { movimento_id: 'v2', conto_id: 'k2', avere: 120, ordine: 1 },
    { movimento_id: 'v2', conto_id: 'k3', dare: 120, ordine: 0 },
    { movimento_id: 'ALTRO', conto_id: 'k1', dare: 999, ordine: 0 }
  ];
  const r2 = C.righeDi({ id: 'v2', stato: 'registrato' }, vere);
  deve(!r2.derivate && r2.quadra, 'un movimento con due righe che quadrano non risulta a posto');
  deve(r2.righe.length === 2, 'legge le righe di un altro movimento: ' + r2.righe.length);
  deve(r2.righe[0].conto_id === 'k3', 'le righe non sono in ordine');
  return 'una riga sola e dichiarata, oppure due righe ordinate e quadrate';
});

prova('due conti e un importo diventano due righe che quadrano', () => {
  /* Chi lavora non compila una griglia Dare/Avere: dice quale conto si muove
     e qual è la contropartita. Le due righe le fa il motore, e il verso lo
     dice la causale (regola 6). */
  const entrata = C.righeSemplici(
    { conto_id: 'k3', contropartita_id: 'k1', importo: 400, causale_id: byCod('incasso_premi').id },
    { causali: CAU });
  deve(entrata.ok, 'un incasso non produce righe: ' + entrata.motivo);
  deve(entrata.righe[0].conto_id === 'k3' && entrata.righe[0].dare === 400, 'il denaro che entra non è in Dare sul conto');
  deve(entrata.righe[1].conto_id === 'k1' && entrata.righe[1].avere === 400, 'la contropartita non è in Avere');
  deve(C.bilanciato(entrata.righe).ok, 'le due righe non quadrano');

  /* L'uscita è lo stesso movimento rovesciato. */
  const uscita = C.righeSemplici(
    { conto_id: 'k2', contropartita_id: 'k1', importo: 120, causale_id: byCod('affitti').id },
    { causali: CAU });
  deve(uscita.ok && uscita.righe[0].avere === 120 && uscita.righe[1].dare === 120, 'un’uscita non si rovescia');

  /* I tre no, ognuno col suo motivo. */
  deve(!C.righeSemplici({ conto_id: 'k3', importo: 400, causale_id: byCod('incasso_premi').id }, { causali: CAU }).ok,
    'senza contropartita scrive lo stesso');
  const stesso = C.righeSemplici({ conto_id: 'k3', contropartita_id: 'k3', importo: 400, causale_id: byCod('incasso_premi').id }, { causali: CAU });
  deve(!stesso.ok && /se stesso/.test(stesso.motivo), 'un conto verso se stesso passa: ' + stesso.motivo);
  /* Senza verso non si indovina da che parte scrivere: sarebbe un importo
     messo a caso in una delle due colonne, e il saldo finirebbe al contrario
     la metà delle volte. */
  const muta = C.righeSemplici({ conto_id: 'k3', contropartita_id: 'k1', importo: 400, causale_id: 'inesistente' }, { causali: CAU });
  deve(!muta.ok && /entrata o un.uscita/i.test(muta.motivo), 'senza verso scrive lo stesso: ' + muta.motivo);

  /* E la contropartita si RITROVA riaprendo il movimento: una finestra che si
     riapre vuota fa credere che il dato non sia stato salvato. */
  const righe = entrata.righe.map(r => Object.assign({ movimento_id: 'm7' }, r));
  deve(C.contropartitaDi({ id: 'm7', conto_id: 'k3' }, righe) === 'k1', 'la contropartita non si ritrova');
  deve(C.contropartitaDi({ id: 'v1', conto_id: 'k3' }, []) === null, 'se la inventa su un movimento senza righe');
  return 'entrata, uscita, tre rifiuti e la contropartita che si ritrova';
});

prova('lo storno rovescia le righe e punta all’originale', () => {
  const m = { id: 'm1', numero: 7, stato: 'registrato', conto_id: 'k3', causale_id: byCod('incasso_premi').id, importo: 400, polizza_id: 'p9' };
  const righe = [
    { movimento_id: 'm1', conto_id: 'k3', dare: 400, ordine: 0, cliente_id: 'a1' },
    { movimento_id: 'm1', conto_id: 'k1', avere: 400, ordine: 1, compagnia_id: 'g1' }
  ];
  const s = C.storno(m, righe, { oggi: '2026-09-25', perche: 'importo sbagliato', utente: 'u1', adesso: '2026-09-25T10:00:00Z' });
  deve(s.ok, 'uno storno legittimo viene rifiutato: ' + s.motivo);

  /* Le righe rovesciate, e il saldo che torna quello di prima. */
  deve(s.righe.length === 2, 'righe dello storno: ' + s.righe.length);
  deve(s.righe[0].avere === 400 && s.righe[0].dare === 0, 'la prima riga non è rovesciata');
  deve(s.righe[1].dare === 400 && s.righe[1].avere === 0, 'la seconda riga non è rovesciata');
  deve(C.bilanciato(s.righe).ok, 'lo storno non quadra');
  /* Le dimensioni seguono la riga: uno storno che perde il cliente e la
     compagnia toglie il movimento dal saldo e lo lascia negli estratti conto. */
  deve(s.righe[0].cliente_id === 'a1' && s.righe[1].compagnia_id === 'g1', 'lo storno perde le dimensioni della riga');

  /* È un movimento NUOVO, non una riscrittura: punta all'originale e porta la
     data di chi corregge, non quella del fatto corretto. */
  deve(s.movimento.storno_di_movimento_id === 'm1', 'lo storno non punta all\'originale');
  deve(s.movimento.data === '2026-09-25', 'lo storno prende la data dell\'originale');
  deve(/n\. 7/.test(s.movimento.descrizione) && /importo sbagliato/.test(s.movimento.descrizione),
    'la descrizione non dice quale movimento e perché: ' + s.movimento.descrizione);
  /* E sull'originale si scrivono SOLO le colonne dello storno: tutto il resto
     è storia, e i trigger lo difendono comunque. */
  deve(Object.keys(s.aggiorna).sort().join(',') === 'stato,stornato_da,stornato_il,storno_perche',
    'lo storno riscrive altre colonne: ' + Object.keys(s.aggiorna).join(','));
  deve(s.aggiorna.stato === 'stornato', 'l\'originale non risulta stornato');
  return 'due righe rovesciate, la data di oggi e il puntatore all’originale';
});

prova('uno storno non si fa due volte, e la garanzia non è nel codice', () => {
  const m = { id: 'm1', numero: 7, stato: 'registrato', conto_id: 'k3', causale_id: 'c5', importo: 400 };
  const righe = [{ movimento_id: 'm1', conto_id: 'k3', dare: 400 }, { movimento_id: 'm1', conto_id: 'k1', avere: 400 }];
  const s = C.storno(m, righe, { oggi: '2026-09-25', perche: 'sbagliato' });
  /* La chiave è STABILE: due clic producono la stessa chiave, e il secondo
     insert lo rifiuta Postgres. Uno storno duplicato rovescerebbe il
     movimento due volte, e il saldo finirebbe dalla parte opposta. */
  deve(s.movimento.chiave_idempotenza === 'storno:m1', 'la chiave non è quella attesa: ' + s.movimento.chiave_idempotenza);
  const s2 = C.storno(m, righe, { oggi: '2026-09-30', perche: 'un altro motivo' });
  deve(s2.movimento.chiave_idempotenza === s.movimento.chiave_idempotenza, 'la chiave cambia fra due tentativi');

  /* E il movimento già stornato lo dice prima di provarci. */
  const gia = C.stornabile(Object.assign({}, m, { stato: 'stornato' }), righe);
  deve(!gia.ok && /già stato stornato/.test(gia.motivo), 'un movimento già stornato si storna di nuovo: ' + gia.motivo);
  /* Una bozza non si storna: si corregge. Un annullato nemmeno: è già fuori. */
  deve(!C.stornabile(Object.assign({}, m, { stato: 'bozza' }), righe).ok, 'una bozza si storna');
  deve(!C.stornabile(Object.assign({}, m, { annullato_il: '2026-09-22T09:00:00Z' }), righe).ok, 'un annullato si storna');
  return 'chiave stabile, e tre stati che non si stornano';
});

prova('senza la data e senza il motivo non si storna — e il motore non guarda l’orologio', () => {
  const m = { id: 'm1', numero: 7, stato: 'registrato', conto_id: 'k3', causale_id: 'c5', importo: 400 };
  const righe = [{ movimento_id: 'm1', conto_id: 'k3', dare: 400 }, { movimento_id: 'm1', conto_id: 'k1', avere: 400 }];

  /* La data la passa chi chiama. Una funzione che chiede l'ora al computer di
     chi guarda dà risposte diverse a due persone sullo stesso dato: è il
     difetto già pagato con le date delle polizze e col monitor. */
  const senzaData = C.storno(m, righe, { perche: 'sbagliato' });
  deve(!senzaData.ok && /data/i.test(senzaData.motivo), 'storna senza data: ' + senzaData.motivo);
  deve(!C.storno(m, righe, { oggi: '25/09/2026', perche: 'x' }).ok, 'accetta una data scritta all\'italiana');

  const senzaPerche = C.storno(m, righe, { oggi: '2026-09-25' });
  deve(!senzaPerche.ok && /motivo/i.test(senzaPerche.motivo), 'storna senza motivo: ' + senzaPerche.motivo);

  /* E dentro il blocco della partita doppia non c'è nessuna chiamata
     all'orologio. Si ritaglia il blocco con la CHIAMATA e non con la parola
     (§10, §12): il nome di una funzione compare anche nei commenti che la
     spiegano, e una fetta sbagliata è una prova che misura un altro file.
     Altrove nel motore il ripiego a «oggi» c'è ancora, in tre punti nati con
     la M4 e la M5: è annotato in DECISIONI.md, e non si tocca da qui. */
  const src = readFileSync(join(RADICE, 'tariffe/motore/contabilita.js'), 'utf8');
  const da = src.indexOf('function bilanciato(');
  const a = src.indexOf('function riepilogo(');
  deve(da > 0 && a > da, 'il blocco della partita doppia non si ritaglia');
  const blocco = src.slice(da, a).split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
  deve(!/new Date\(/.test(blocco), 'la partita doppia chiede l\'ora al computer di chi guarda');
  return 'data e motivo obbligatori, e nessun orologio nel blocco';
});

prova('un movimento senza righe non si storna: si annulla', () => {
  const vecchio = { id: 'v1', numero: 1, stato: 'registrato', conto_id: 'k3', causale_id: byCod('incasso_premi').id, importo: 120 };
  const puo = C.stornabile(vecchio, []);
  deve(!puo.ok, 'un movimento a conto singolo si storna');
  deve(/si annulla/i.test(puo.motivo), 'non dice che cosa fare invece: ' + puo.motivo);
  /* Non si rovescia quello che non c'è: uno storno «ricavato» inventerebbe la
     contropartita che il movimento non ha mai avuto. */
  deve(!C.storno(vecchio, [], { oggi: '2026-09-25', perche: 'x' }).ok, 'lo storna lo stesso');

  /* E un movimento che NON quadra non si storna: sposterebbe la differenza
     invece di toglierla. */
  const storto = C.stornabile({ id: 's1', numero: 2, stato: 'registrato' },
    [{ movimento_id: 's1', conto_id: 'k1', dare: 100 }, { movimento_id: 's1', conto_id: 'k2', avere: 90 }]);
  deve(!storto.ok && /non quadra/i.test(storto.motivo), 'storna un movimento sbilanciato: ' + storto.motivo);
  return 'si annulla col motivo, e resta a registro';
});

/* ═══════════ FASE 2 — L'INCASSO DI UNA O PIÙ RATE ═══════════════════════ */

const F2_CONTI = [
  { id: 'cassa', nome: 'Cassa contanti', tipologia: 'cassa', natura: 'premi', attivo: true,
    e_mezzo_pagamento: true, e_conto_sospeso: false, mezzi: ['contante'] },
  { id: 'banca', nome: 'Banca assicurativa', tipologia: 'conto_assicurativo', natura: 'premi', attivo: true,
    e_mezzo_pagamento: true, e_conto_sospeso: false, mezzi: ['bonifico'] },
  { id: 'azien', nome: 'Conto aziendale', tipologia: 'banca', natura: 'aziendale', attivo: true,
    e_mezzo_pagamento: true, e_conto_sospeso: false },
  { id: 'sosp', nome: 'Sospesi clienti', tipologia: 'credito', natura: 'premi', attivo: true,
    e_mezzo_pagamento: true, e_conto_sospeso: true },
  { id: 'dPRI', nome: 'Conto compagnia PRIMA', tipologia: 'debito', natura: 'premi', attivo: true,
    e_mezzo_pagamento: false, compagnia_id: 'cPRI' },
  { id: 'dGEN', nome: 'Conto compagnia', tipologia: 'debito', natura: 'premi', attivo: true,
    e_mezzo_pagamento: false }
];
const F2_COMP = [
  { id: 'cPRI', nome: 'PRIMA', alias: ['Prima Assicurazioni'] },
  { id: 'cHDI', nome: 'HDI', alias: ['HDI Assicurazioni'] }
];
const F2_CAU = { id: 'cau', codice: 'incasso_premi', nome: 'Incasso premi', segno: 'entrata', natura: 'premi' };
const f2opz = { conti: F2_CONTI, compagnie: F2_COMP, causale: F2_CAU };

prova('Fase 2 · le righe: un Dare per modalità, un Avere per compagnia', () => {
  const r = C.righeIncasso({
    cliente_id: 'cl1',
    rate: [{ titolo_id: 't1', importo: 200, compagnia: 'Prima Assicurazioni' },
           { titolo_id: 't2', importo: 100, compagnia: 'HDI Assicurazioni' }],
    pagamenti: [{ conto_id: 'cassa', importo: 120, mezzo: 'contante' },
                { conto_id: 'banca', importo: 180, mezzo: 'bonifico' }]
  }, f2opz);
  deve(r.ok, 'non ha prodotto le righe: ' + r.motivo);
  deve(r.righe.length === 4, 'righe attese 4 (2 Dare + 2 Avere), trovate ' + r.righe.length);
  const dare = r.righe.filter(x => x.dare > 0), avere = r.righe.filter(x => x.avere > 0);
  deve(dare.length === 2 && avere.length === 2, 'non c\'è un Dare per pagamento e un Avere per compagnia');
  deve(C.bilanciato(r.righe).ok, 'le righe non quadrano');
  /* L'Avere di PRIMA va sul SUO conto, quello di HDI sul generico — e la riga
     porta lo stesso l'identificativo della compagnia, altrimenti il partitario
     non si potrebbe ricostruire. */
  const aPri = avere.find(x => x.conto_id === 'dPRI');
  const aHdi = avere.find(x => x.conto_id === 'dGEN');
  deve(aPri && aPri.avere === 200, 'l\'Avere di PRIMA non è 200 sul suo conto');
  deve(aHdi && aHdi.avere === 100 && aHdi.compagnia_id === 'cHDI',
    'l\'Avere di HDI non porta la compagnia: il debito diventa illeggibile');
  return '2 Dare, 2 Avere, alias risolti, partitario ricostruibile';
});

prova('Fase 2 · gli alias: «Prima Assicurazioni» trova il conto di «PRIMA»', () => {
  /* È la trappola di §11 e §28: senza gli alias quel conto non si trova mai,
     senza errore, e il debito finisce sul generico. */
  const con = C.contoCompagnia(F2_CONTI, { nome: 'Prima Assicurazioni' }, { compagnie: F2_COMP });
  deve(con.conto && con.conto.id === 'dPRI', 'non ha risolto l\'alias: ' + (con.motivo || ''));
  deve(con.compagnia_id === 'cPRI', 'non ha risolto l\'identificativo della compagnia');
  /* Una compagnia che l'anagrafica non conosce non si aggancia al generico:
     il debito non si saprebbe verso chi nasce. */
  const ign = C.contoCompagnia(F2_CONTI, { nome: 'Sconosciuta Spa' }, { compagnie: F2_COMP });
  deve(!ign.conto && /non è in anagrafica/i.test(ign.motivo), 'aggancia una compagnia sconosciuta: ' + JSON.stringify(ign));
  return 'alias risolto, compagnia ignota rifiutata col motivo';
});

prova('Fase 2 · senza il conto della compagnia non si scrive niente, e si dice quale manca', () => {
  const soloMezzi = F2_CONTI.filter(c => c.tipologia !== 'debito');
  const r = C.righeIncasso({
    rate: [{ titolo_id: 't1', importo: 50, compagnia: 'PRIMA' }],
    pagamenti: [{ conto_id: 'cassa', importo: 50, mezzo: 'contante' }]
  }, { conti: soloMezzi, compagnie: F2_COMP, causale: F2_CAU });
  deve(!r.ok && !r.righe.length, 'ha scritto le righe senza il conto della compagnia');
  deve(/PRIMA/.test(r.motivo) && /Conti e causali/i.test(r.motivo),
    'non dice quale compagnia manca né dove si crea: ' + r.motivo);
  return 'rifiutato, con il nome della compagnia e la strada';
});

prova('Fase 2 · la differenza si dichiara, e non si chiude da sola', () => {
  const s = C.contoIncasso([{ importo: 200 }], [{ importo: 199.5 }]);
  deve(!s.quadra && s.differenza === -0.5, 'la differenza non è misurata: ' + JSON.stringify(s));
  deve(/Abbuoni/i.test(s.motivo), 'non dice dove si mette la differenza: ' + s.motivo);
  const su = C.contoIncasso([{ importo: 200 }], [{ importo: 200.5 }]);
  deve(su.differenza === 0.5 && /Eccedenze/i.test(su.motivo), 'il di più non è indirizzato: ' + su.motivo);
  /* E con la differenza le righe NON nascono. */
  const r = C.righeIncasso({
    rate: [{ titolo_id: 't1', importo: 200, compagnia: 'PRIMA' }],
    pagamenti: [{ conto_id: 'cassa', importo: 199.5, mezzo: 'contante' }]
  }, f2opz);
  deve(!r.ok && !r.righe.length, 'ha registrato un incasso che non quadra');
  return 'differenza misurata, indirizzata, e niente righe';
});

prova('Fase 2 · un premio non finisce su un conto aziendale, e un conto sospesi non è un modo di pagare', () => {
  /* §26, art. 117 CAP: le due nature del denaro non si mescolano. `compatibile`
     esisteva dalla M1 e non veniva chiamata qui — la scrittura principale del
     sistema passava senza controllo. */
  const az = C.righeIncasso({
    rate: [{ titolo_id: 't1', importo: 50, compagnia: 'PRIMA' }],
    pagamenti: [{ conto_id: 'azien', importo: 50 }]
  }, f2opz);
  deve(!az.ok && /117|aziendale|premi/i.test(az.motivo), 'un premio è finito su un conto aziendale: ' + az.motivo);

  /* Mettere una rata a copertura senza il denaro è un SOSPESO, e i sospesi
     sono la Fase 3: scriverne solo la scrittura contabile lascerebbe un
     credito che non compare nell'elenco di chi deve pagare. */
  const so = C.righeIncasso({
    rate: [{ titolo_id: 't1', importo: 50, compagnia: 'PRIMA' }],
    pagamenti: [{ conto_id: 'sosp', importo: 50 }]
  }, f2opz);
  deve(!so.ok && /sospesi/i.test(so.motivo), 'un conto di sospesi è passato come modo di pagare: ' + so.motivo);
  return 'conto aziendale rifiutato, conto sospesi rifiutato';
});

prova('Fase 2 · una rata già incassata, annullata o negativa si rifiuta COL MOTIVO', () => {
  deve(C.incassabile({ id: 't', stato: 'aperto', importo_lordo: 10 }).si, 'una rata aperta non è incassabile');
  const gia = C.incassabile({ id: 't', stato: 'incassato', importo_lordo: 10, incassato_il: '2026-09-01' });
  deve(!gia.si && /01\/09\/2026/.test(gia.motivo), 'non dice quando è stata incassata: ' + gia.motivo);
  deve(!C.incassabile({ id: 't', stato: 'stornato', importo_lordo: 10 }).si, 'una rata stornata si incassa');
  const neg = C.incassabile({ id: 't', stato: 'aperto', importo_lordo: -120 });
  deve(!neg.si && /rimborso|riduzione/i.test(neg.motivo),
    'una rata negativa non viene spiegata: sparirebbe dalla ricerca senza dire perché — ' + neg.motivo);
  return 'aperta sì; incassata, stornata e negativa no, ognuna col suo motivo';
});

prova('Fase 2 · il mezzo si scrive sulla rata solo se è UNO', () => {
  deve(C.mezzoIncasso([{ mezzo: 'contante' }, { mezzo: 'contante' }]) === 'contante', 'due volte lo stesso mezzo non si scrive');
  deve(C.mezzoIncasso([{ mezzo: 'contante' }, { mezzo: 'bonifico' }]) === null,
    'con due mezzi diversi ne ha scelto uno: sarebbe metà della verità');
  deve(C.mezzoIncasso([{ mezzo: 'inventato' }]) === null, 'ha accettato un mezzo fuori vocabolario');
  return 'uno solo si scrive, due no, uno inventato no';
});

prova('Fase 2 · il saldo di un conto legge le RIGHE, non la testata', () => {
  /* È il difetto che rendeva la Fase 2 impossibile: un incasso su due conti
     ha una testata sola, e leggendo quella il saldo di uno dei due sarebbe
     stato falso — credibile e falso, in silenzio. */
  const conti = [{ id: 'cassa', saldo_iniziale: 0 }, { id: 'banca', saldo_iniziale: 0 }, { id: 'dPRI', saldo_iniziale: 0 }];
  const mov = [{ id: 'm1', data: '2026-09-22', conto_id: 'cassa', causale_id: 'cau', importo: 300 }];
  const righe = [
    { movimento_id: 'm1', conto_id: 'cassa', dare: 120, avere: 0, ordine: 0 },
    { movimento_id: 'm1', conto_id: 'banca', dare: 180, avere: 0, ordine: 1 },
    { movimento_id: 'm1', conto_id: 'dPRI', dare: 0, avere: 300, ordine: 2 }
  ];
  const opz = { causali: [F2_CAU], righe: righe };
  deve(C.saldo(conti[0], mov, opz).saldo === 120, 'la cassa non prende i suoi 120: ' + C.saldo(conti[0], mov, opz).saldo);
  deve(C.saldo(conti[1], mov, opz).saldo === 180, 'la banca non prende i suoi 180: ' + C.saldo(conti[1], mov, opz).saldo);
  deve(C.saldo(conti[2], mov, opz).saldo === -300, 'il debito verso la compagnia non si muove: ' + C.saldo(conti[2], mov, opz).saldo);
  /* E senza righe si legge la testata, come prima: i movimenti scritti prima
     della partita doppia non si inventano una contropartita. */
  deve(C.saldo(conti[0], mov, { causali: [F2_CAU] }).saldo === 300,
    'un movimento senza righe non si legge più dalla testata');
  return 'cassa 120, banca 180, compagnia −300; senza righe si legge la testata';
});

/* ═══════════ FASE 3 — I SOSPESI ════════════════════════════════════════ */

const F3_CONTI = F2_CONTI.concat([
  { id: 'sosp2', nome: 'Sospesi clienti', tipologia: 'credito', natura: 'premi', attivo: true,
    e_conto_sospeso: true, e_mezzo_pagamento: true }
]);
const F3_CRED = { id: 'k1', titolo_id: 't1', cliente_id: 'cl1', polizza_id: 'p1',
                  conto_sospeso_id: 'sosp2', importo_originale: 500, aperto_il: '2026-09-01',
                  previsto_il: '2026-09-15', compagnia: 'Prima Assicurazioni', attivo: true };

prova('Fase 3 · l\'apertura: Dare sui sospesi, Avere sulla compagnia', () => {
  const r = C.righeApertura({ titolo_id: 't1', importo: 500, conto_sospeso_id: 'sosp2',
    compagnia: 'Prima Assicurazioni', cliente_id: 'cl1' },
    { conti: F3_CONTI, compagnie: F2_COMP });
  deve(r.ok, 'non ha prodotto le righe: ' + r.motivo);
  deve(r.righe.length === 2, 'un\'apertura ha due righe, non ' + r.righe.length);
  deve(r.righe[0].conto_id === 'sosp2' && r.righe[0].dare === 500, 'il credito non nasce sul conto dei sospesi');
  deve(r.righe[1].conto_id === 'dPRI' && r.righe[1].avere === 500, 'il debito non nasce sul conto della compagnia');
  deve(C.bilanciato(r.righe).ok, 'le righe non quadrano');
  /* Un credito su un conto di denaro direbbe che quei soldi ci sono. */
  const su = C.righeApertura({ titolo_id: 't1', importo: 500, conto_sospeso_id: 'cassa',
    compagnia: 'PRIMA' }, { conti: F3_CONTI, compagnie: F2_COMP });
  deve(!su.ok && /non è un conto di sospesi/i.test(su.motivo),
    'un credito è finito su un conto di denaro: ' + su.motivo);
  return 'Dare sospesi 500, Avere compagnia 500; conto di denaro rifiutato';
});

prova('Fase 3 · il residuo si CALCOLA, e lo stato si deriva', () => {
  deve(C.residuoCredito(F3_CRED, []).residuo === 500, 'senza recuperi il residuo non è l\'originale');
  deve(C.statoCredito(F3_CRED, []) === 'aperto', 'senza recuperi non è aperto');
  const uno = [{ credito_id: 'k1', importo: 200, attivo: true }];
  deve(C.residuoCredito(F3_CRED, uno).residuo === 300, 'il residuo non scende');
  deve(C.statoCredito(F3_CRED, uno) === 'parziale', 'con un recupero parziale non è «parziale»');
  const tutti = uno.concat([{ credito_id: 'k1', importo: 300, attivo: true }]);
  deve(C.statoCredito(F3_CRED, tutti) === 'chiuso', 'recuperato tutto non è «chiuso»');
  /* Un recupero spento dallo storno non conta: se contasse, un credito
     stornato risulterebbe chiuso e sparirebbe dallo scadenzario. */
  const spento = [{ credito_id: 'k1', importo: 500, attivo: false }];
  deve(C.residuoCredito(F3_CRED, spento).residuo === 500, 'un recupero spento riduce ancora il residuo');
  /* E i recuperi di un ALTRO credito non riducono questo. */
  deve(C.residuoCredito(F3_CRED, [{ credito_id: 'altro', importo: 500, attivo: true }]).residuo === 500,
    'il recupero di un altro sospeso riduce questo');
  deve(C.statoCredito(Object.assign({}, F3_CRED, { stornato_il: 'x' }), []) === 'stornato', 'lo storno non si vede');
  return '500 → 300 → chiuso; spenti e altrui non contano';
});

prova('Fase 3 · il recupero riduce i SOSPESI, non ricrea il debito verso la compagnia', () => {
  const r = C.righeRecupero(F3_CRED, { conto_id: 'cassa', importo: 200 },
    { conti: F3_CONTI, recuperi: [], causale: F2_CAU });
  deve(r.ok, 'non ha prodotto le righe: ' + r.motivo);
  deve(r.righe[0].conto_id === 'cassa' && r.righe[0].dare === 200, 'il denaro non entra sul conto scelto');
  deve(r.righe[1].conto_id === 'sosp2' && r.righe[1].avere === 200, 'l\'Avere non riduce il conto dei sospesi');
  /* Se l'Avere andasse sulla compagnia, il debito nascerebbe due volte. */
  deve(!r.righe.some(x => x.conto_id === 'dPRI'),
    'il recupero tocca il conto della compagnia: il debito verso di lei nascerebbe due volte');
  deve(!r.chiude, 'un recupero parziale dichiara di chiudere');
  const fine = C.righeRecupero(F3_CRED, { conto_id: 'cassa', importo: 300 },
    { conti: F3_CONTI, recuperi: [{ credito_id: 'k1', importo: 200, attivo: true }], causale: F2_CAU });
  deve(fine.ok && fine.chiude && fine.residuo_dopo === 0, 'l\'ultimo recupero non dichiara di chiudere');
  return 'Dare cassa, Avere sospesi, niente compagnia; chiude solo l\'ultimo';
});

prova('Fase 3 · più del residuo non si recupera, e un credito non si recupera con un altro credito', () => {
  const troppo = C.recuperabile(F3_CRED, [{ credito_id: 'k1', importo: 200, attivo: true }], 400);
  deve(!troppo.si && /residuo/i.test(troppo.motivo) && /eccedenza/i.test(troppo.motivo),
    'accetta più del residuo, o non dice dove va il di più: ' + troppo.motivo);
  deve(!C.recuperabile(Object.assign({}, F3_CRED, { stornato_il: 'x' }), [], 10).si, 'si recupera un sospeso stornato');
  deve(!C.recuperabile(F3_CRED, [{ credito_id: 'k1', importo: 500, attivo: true }], 10).si, 'si recupera un sospeso chiuso');
  const cc = C.righeRecupero(F3_CRED, { conto_id: 'sosp2', importo: 100 },
    { conti: F3_CONTI, recuperi: [], causale: F2_CAU });
  deve(!cc.ok && /credito/i.test(cc.motivo), 'un credito si recupera con un altro credito: ' + cc.motivo);
  return 'oltre il residuo no, stornato no, chiuso no, credito-su-credito no';
});

prova('Fase 3 · lo scadenzario somma solo i vivi, e il ritardo lo dice la data prevista', () => {
  const crediti = [
    F3_CRED,
    { id: 'k2', titolo_id: 't2', conto_sospeso_id: 'sosp2', importo_originale: 100,
      aperto_il: '2026-09-10', previsto_il: '2026-10-30', attivo: true },
    { id: 'k3', titolo_id: 't3', conto_sospeso_id: 'sosp2', importo_originale: 80,
      aperto_il: '2026-08-01', previsto_il: '2026-08-15', attivo: false, stornato_il: 'x' }
  ];
  const rec = [{ credito_id: 'k1', importo: 200, attivo: true }];
  const sc = C.scadenzarioCrediti(crediti, rec, { oggi: '2026-09-22' });
  deve(sc.aperti === 2, 'i sospesi vivi non sono due: ' + sc.aperti);
  deve(sc.da_recuperare === 400, 'il totale da recuperare non è 300+100: ' + sc.da_recuperare);
  deve(sc.in_ritardo === 1 && sc.totale_ritardo === 300, 'il ritardo non è quello del 15/09: ' + JSON.stringify(sc));
  deve(sc.stornati === 1, 'lo stornato non si conta a parte');
  /* Lo stornato NON entra nei totali: se entrasse, si andrebbe a chiedere dei
     soldi per un credito che non esiste più. */
  deve(sc.da_recuperare !== 480, 'un sospeso stornato è ancora nei totali');
  /* E l'ordine è per data attesa: lo scadenzario serve a sapere chi chiamare
     prima. */
  deve(sc.righe[0].credito.id === 'k1', 'lo scadenzario non mette per primo quello atteso prima');
  return '2 vivi, 400 da recuperare, 1 in ritardo per 300';
});

prova('Fase 3 · il motore non chiede l\'ora al computer', () => {
  /* Un motore che guarda l'orologio dà risposte diverse a due persone sullo
     stesso dato (§44, §45). `oggi` lo passa chi chiama. */
  const src = readFileSync(join(RADICE, 'tariffe', 'motore', 'contabilita.js'), 'utf8');
  const da = src.indexOf('FASE 3 — I SOSPESI');
  const a = src.indexOf('var API = {', da);
  deve(da > 0 && a > da, 'non trovo il blocco della Fase 3');
  const blocco = src.slice(da, a).split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
  deve(!/new Date\(\s*\)/.test(blocco), 'la Fase 3 chiede l\'ora al computer di chi guarda');
  deve(!/Date\.now\(/.test(blocco), 'la Fase 3 chiede l\'ora al computer di chi guarda');
  /* E senza `oggi` non si inventa un ritardo. */
  const sc = C.scadenzarioCrediti([F3_CRED], [], {});
  deve(sc.righe[0].in_ritardo === false, 'senza sapere che giorno è, dichiara un ritardo');
  return 'nessun orologio, e senza «oggi» nessun ritardo inventato';
});


/* ═══ FASE 4 — LE RIGHE ARRIVANO DOVUNQUE SI SOMMI ════════════════════════

   Dalla Fase 2 un movimento può toccare più conti. `effettoSuConto` sa già
   leggere le righe, ma sapere non basta: le righe vanno PASSATE, e chi
   somma sono nove funzioni annidate una dentro l'altra. Una che dimentica
   di passarle non dà nessun errore — dà un numero, e il numero ha l'aria di
   quello giusto.

   Questo è il banco che lo misura: un incasso da 500 diviso 200 in cassa e
   300 in banca, con la testata che (come la scrive la schermata) porta il
   PRIMO conto e il totale. Chi legge la testata dice «500 in cassa, 0 in
   banca». Chi legge le righe dice «200 e 300». */
const F4_CASSA = { id: 'c-cassa', nome: 'Cassa', natura: 'premi', tipologia: 'cassa', saldo_iniziale: 0, attivo: true };
const F4_BANCA = { id: 'c-banca', nome: 'Banca', natura: 'premi', tipologia: 'banca', saldo_iniziale: 0, attivo: true };
const F4_DEB   = { id: 'c-deb', nome: 'Debito compagnia', natura: 'premi', tipologia: 'altro', saldo_iniziale: 0, attivo: true };
const F4_CAU   = [{ id: 'cau-inc', codice: 'incasso_premi', nome: 'Incasso premi', segno: 'entrata', natura: 'premi', incide_su_utile: false }];
const F4_MOV   = [{ id: 'm1', data: '2026-09-22', creato_il: '2026-09-22T10:00:00Z',
                    conto_id: 'c-cassa', causale_id: 'cau-inc', importo: 500, annullato_il: null }];
const F4_RIGHE = [
  { id: 'r1', movimento_id: 'm1', conto_id: 'c-cassa', dare: 200, avere: 0, ordine: 1 },
  { id: 'r2', movimento_id: 'm1', conto_id: 'c-banca', dare: 300, avere: 0, ordine: 2 },
  { id: 'r3', movimento_id: 'm1', conto_id: 'c-deb',   dare: 0,   avere: 500, ordine: 3 },
];
const F4 = { causali: F4_CAU, righe: F4_RIGHE };

prova('Fase 4 · la quadratura ricostruisce dalle righe, non dalla testata', () => {
  /* La banca dichiara 300, che è quello che ci è davvero arrivato. Letto
     dalla testata il conto banca risulterebbe a 0, e la quadratura direbbe
     «la banca ha 300 in più del sistema»: una differenza inventata, e
     qualcuno andrebbe a cercare in banca un movimento che non manca. */
  const dich = [{ conto_id: 'c-banca', data: '2026-09-22', saldo_dichiarato: 300 }];
  const q = C.quadratura(F4_BANCA, F4_MOV, dich, F4);
  deve(q.ricostruito === 300, 'la quadratura legge la testata invece delle righe: ricostruito ' + q.ricostruito);
  deve(q.quadra === true, 'un conto che quadra risulta storto');
  /* E lo storico, che è un\'altra funzione e un\'altra strada. */
  const st = C.storicoQuadrature(F4_BANCA, F4_MOV, dich, F4);
  deve(st.length === 1 && st[0].ricostruito === 300, 'lo storico delle quadrature legge la testata');
  return 'ricostruito 300 su banca, quadra, e lo storico dice lo stesso';
});

prova('Fase 4 · il fondo cassa conta i contanti veri, non il totale dell\'incasso', () => {
  /* Il fondo cassa somma le CASSE. Dalla testata risulterebbe 500 — cioè
     duecento euro di contanti e trecento che in cassa non ci sono mai
     stati. Chi conta il cassetto la sera troverebbe 200 e crederebbe di
     aver perso 300. */
  const f = C.fondoCassa([F4_CASSA, F4_BANCA], F4_MOV, F4);
  deve(f.totale === 200, 'il fondo cassa legge la testata: ' + f.totale);
  deve(f.quante === 1, 'conta come cassa un conto che non lo è');
  return 'fondo cassa 200, non 500';
});

prova('Fase 4 · la giornata ripartisce per conto dalle righe', () => {
  const g = C.giornata('2026-09-22', F4_MOV, [F4_CASSA, F4_BANCA, F4_DEB], F4);
  /* Entrate e uscite della giornata restano quelle del MOVIMENTO: a partita
     doppia le due gambe si annullano, quindi le righe non saprebbero dire
     se la giornata ha incassato o pagato. */
  deve(g.entrate === 500, 'le entrate della giornata non sono quelle del movimento: ' + g.entrate);
  deve(g.per_conto.length === 3, 'la giornata vede ' + g.per_conto.length + ' conti invece di 3');
  const trova = (id) => g.per_conto.filter(x => x.conto_id === id)[0];
  deve(trova('c-cassa').saldo === 200, 'la cassa della giornata legge la testata');
  deve(trova('c-banca').saldo === 300, 'la banca della giornata non compare col suo importo');
  deve(trova('c-deb').saldo === -500, 'il debito verso la compagnia non risulta in Avere');
  /* E il saldo di fine giornata di ogni conto passa dalle righe. */
  deve(trova('c-banca').saldo_fine === 300, 'il saldo di fine giornata legge la testata');
  return 'tre conti, 200 / 300 / -500, e il saldo di fine giornata torna';
});

prova('Fase 4 · le anomalie giudicano la quadratura sulle righe', () => {
  /* Un conto che quadra non deve finire fra «i conti che non quadrano»: un
     elenco di anomalie che ne contiene una falsa si smette di guardare. */
  const dich = [{ conto_id: 'c-banca', data: '2026-09-22', saldo_dichiarato: 300 }];
  const an = C.anomalie({ oggi: '2026-09-22', conti: [F4_BANCA], movimenti: F4_MOV,
                          causali: F4_CAU, quadrature: dich, righe: F4_RIGHE });
  const storti = an.filter(a => /non quadrano/.test(a.titolo));
  deve(storti.length === 0, 'le anomalie dichiarano storto un conto che quadra');
  return 'nessuna differenza inventata';
});

prova('Fase 4 · il dettaglio conto porta le righe fino allo storico', () => {
  const dich = [{ conto_id: 'c-banca', data: '2026-09-22', saldo_dichiarato: 300 }];
  const d = C.dettaglioConto(F4_BANCA, F4_MOV, dich, { causali: F4_CAU, righe: F4_RIGHE });
  deve(d.saldo === 300, 'il dettaglio del conto legge la testata: ' + d.saldo);
  deve(d.righe.length === 1, 'il movimento non compare nell\'estratto della banca');
  deve(d.quadrature.length === 1 && d.quadrature[0].quadra === true,
       'lo storico dentro il dettaglio non riceve le righe');
  return 'saldo 300, il movimento c\'è, e lo storico quadra';
});

prova('Fase 4 · senza righe il motore si comporta come prima', () => {
  /* Le righe sono facoltative, e devono restare tali: i movimenti scritti
     prima del 20/09/2026 non ne hanno, e un motore che desse per scontato
     «nessuna riga» direbbe che non muovono niente. */
  const f = C.fondoCassa([F4_CASSA], F4_MOV, { causali: F4_CAU });
  deve(f.totale === 500, 'senza righe il motore non legge più la testata: ' + f.totale);
  const g = C.giornata('2026-09-22', F4_MOV, [F4_CASSA], { causali: F4_CAU });
  deve(g.per_conto.length === 1 && g.per_conto[0].conto_id === 'c-cassa',
       'senza righe la giornata non ripartisce sulla testata');
  return 'testata, come prima del 20/09';
});


prova('Fase 4 · un conto che vive solo nelle righe non risulta cancellabile', () => {
  /* Il debito verso una compagnia e il conto dei sospesi non stanno MAI in
     testata: nascono dalla gamba Avere di un incasso. Contando per testata
     risultano senza movimenti, e la schermata offre di cancellarli — che
     renderebbe orfani proprio i movimenti che li hanno mossi. */
  const senza = C.eliminabile(F4_DEB, F4_MOV);
  deve(senza.ok === true, 'il banco non riproduce il difetto: senza righe dovrebbe sembrare cancellabile');
  const con = C.eliminabile(F4_DEB, F4_MOV, { righe: F4_RIGHE });
  deve(con.ok === false, 'un conto toccato solo da una riga Avere risulta cancellabile');
  return 'con le righe non si cancella, e il motivo dice quanti movimenti ci sono passati';
});

prova('Fase 4 · nel dettaglio conto le causali contano il PEZZO, non il movimento intero', () => {
  /* Un incasso da 500 che su questo conto ne ha portati 300 deve contare 300.
     Contando 500, il riepilogo per causale non tornerebbe col saldo scritto
     due riquadri più su, nella stessa finestra. */
  const d = C.dettaglioConto(F4_BANCA, F4_MOV, [], { causali: F4_CAU, righe: F4_RIGHE });
  deve(d.per_causale.length === 1, 'il riepilogo per causale non vede il movimento');
  deve(d.per_causale[0].totale === 300,
       'il riepilogo per causale conta il movimento intero: ' + d.per_causale[0].totale);
  deve(d.per_causale[0].totale === d.saldo, 'il riepilogo per causale non torna col saldo del conto');
  /* Senza `conto` resta la lettura della prima nota: il movimento intero. */
  const pn = C.perCausale(F4_MOV, F4_CAU, {});
  deve(pn[0].totale === 500, 'la prima nota non conta più il movimento intero');
  return '300 nel conto, 500 nella prima nota, e sono due domande diverse';
});


/* ═══ FASE 4 — IL CRUSCOTTO ══════════════════════════════════════════════ */
const F4_DASH = {
  conti: [F4_CASSA, F4_BANCA, { id: 'c-deb2', nome: 'Debito PRIMA', natura: 'premi',
                                tipologia: 'debito', saldo_iniziale: 0, attivo: true }],
  causali: F4_CAU,
  movimenti: [{ id: 'md', data: '2026-09-22', conto_id: 'c-cassa', causale_id: 'cau-inc',
                importo: 500, annullato_il: null }],
  righe: [{ movimento_id: 'md', conto_id: 'c-cassa', dare: 500, avere: 0 },
          { movimento_id: 'md', conto_id: 'c-deb2', dare: 0, avere: 500 }],
  crediti: [], recuperi: [], sospesi: [], oggi: '2026-09-22', letto: {}
};

prova('Fase 4 · il cruscotto non conta il debito come denaro in cassa', () => {
  /* Il conto di debito è di natura «premi» ma non è liquidità. Sommandolo,
     un incasso da 500 (cassa +500, debito −500) direbbe «premi dei clienti:
     0 €» il giorno stesso in cui sono entrati cinquecento euro — e il numero
     avrebbe l'aria di quello giusto. */
  const c = C.cruscotto(F4_DASH);
  const p = c.righe.filter(r => r.k === 'premi')[0];
  const d = c.righe.filter(r => r.k === 'debito')[0];
  deve(p.valore === 500, 'i premi dei clienti in cassa sono ' + p.valore + ' invece di 500');
  deve(d.valore === 500, 'i premi da rimettere sono ' + d.valore + ' invece di 500');
  /* E il debito si mostra SENZA segno: sta in Avere, quindi il saldo è
     negativo, ma «−500» accanto a dei saldi positivi si legge come un
     ammanco invece che come un debito. */
  deve(d.valore > 0, 'il debito esce col segno meno');
  return 'cassa 500 e debito 500, e non si annullano in un totale solo';
});

prova('Fase 4 · ogni riquadro del cruscotto dice che cosa fare', () => {
  /* Un numero senza il verbo è un numero che si guarda una volta e poi si
     smette (§33, §43). Dove non c'è niente da fare il verbo manca, ed è
     giusto; dove qualcosa manca, c'è. */
  const c = C.cruscotto(Object.assign({}, F4_DASH, { conti: [F4_CASSA] }));
  const az = c.righe.filter(r => r.k === 'aziendale')[0];
  deve(!!az.dafare && /Conti e causali/.test(az.dafare),
       'senza un conto aziendale il cruscotto non dice dove crearlo');
  const deb = c.righe.filter(r => r.k === 'debito')[0];
  deve(!!deb.dafare && /Conti e causali/.test(deb.dafare),
       'senza un conto di debito il cruscotto non dice che senza non si registra');
  /* E ogni riquadro ha comunque il suo perché. */
  c.righe.forEach(r => deve(!!r.motivo, 'il riquadro «' + r.titolo + '» non dice niente'));
  return 'cinque riquadri, e dove manca qualcosa c\'è il verbo';
});

prova('Fase 4 · un riquadro cieco non mostra zero', () => {
  /* Su un cruscotto di contabilità uno zero falso è la bugia peggiore: fa
     smettere di cercare proprio dove c'è il buco (§12, §18, §43). */
  const c = C.cruscotto(Object.assign({}, F4_DASH, { letto: { conti: false } }));
  const ciechi = c.righe.filter(r => r.valore === null);
  deve(ciechi.length === 3, 'i riquadri ciechi sono ' + ciechi.length + ' invece di 3');
  ciechi.forEach(r => {
    deve(r.valore !== 0, 'un riquadro che non si è potuto leggere mostra zero');
    deve(/non si è potuto|non si sono potuti/i.test(r.motivo),
         'un riquadro cieco non dice di esserlo: «' + r.motivo + '»');
  });
  deve(c.completo === false, 'il cruscotto si dichiara completo con tre riquadri ciechi');
  deve(c.ciechi === 3, 'il cruscotto non conta i riquadri ciechi');
  return '3 riquadri ciechi, nessuno zero, e il cruscotto sa di non sapere';
});


/* ═══ FASE 4-bis — LE ENTRATE SONO IL DENARO CHE SI MUOVE ════════════════ */
const F4B_CONTI = [
  { id: 'cassa', nome: 'Cassa', natura: 'premi', tipologia: 'cassa', saldo_iniziale: 0, attivo: true },
  { id: 'sosp', nome: 'Sospesi clienti', natura: 'premi', tipologia: 'credito', saldo_iniziale: 0, attivo: true },
  { id: 'deb', nome: 'Debito PRIMA', natura: 'premi', tipologia: 'debito', saldo_iniziale: 0, attivo: true }
];
const F4B_CAU = [
  { id: 'ap', codice: 'apertura_sospeso', nome: 'Apertura sospeso', segno: 'entrata', incide_su_utile: false },
  { id: 'rec', codice: 'recupero_sospeso', nome: 'Recupero sospeso', segno: 'entrata', incide_su_utile: false }
];
/* Il caso vero: una polizza messa a copertura (nessun denaro) e poi il
   cliente che paga (300 in cassa). Sono DUE movimenti con causale «entrata»
   e importo 300 in testata. */
const F4B_MOV = [
  { id: 'm1', data: '2026-09-22', conto_id: 'sosp', causale_id: 'ap', importo: 300, annullato_il: null },
  { id: 'm2', data: '2026-09-22', conto_id: 'cassa', causale_id: 'rec', importo: 300, annullato_il: null }
];
const F4B_RIGHE = [
  { movimento_id: 'm1', conto_id: 'sosp', dare: 300, avere: 0 },
  { movimento_id: 'm1', conto_id: 'deb', dare: 0, avere: 300 },
  { movimento_id: 'm2', conto_id: 'cassa', dare: 300, avere: 0 },
  { movimento_id: 'm2', conto_id: 'sosp', dare: 0, avere: 300 }
];

prova('Fase 4-bis · un premio a copertura NON entra in cassa, e non si conta due volte', () => {
  /* Letto dalla testata: due movimenti «entrata» da 300 fanno 600 — lo stesso
     premio entrato due volte, il giorno della copertura e il giorno in cui il
     cliente paga. Un numero credibile, doppio del vero, su una schermata di
     cassa. */
  const senza = C.giornata('2026-09-22', F4B_MOV, F4B_CONTI, { causali: F4B_CAU });
  deve(senza.entrate === 600, 'il banco non riproduce il difetto: dalla testata dovrebbe fare 600');

  const con = C.giornata('2026-09-22', F4B_MOV, F4B_CONTI, { causali: F4B_CAU, righe: F4B_RIGHE });
  deve(con.entrate === 300, 'le entrate della giornata sono ' + con.entrate + ' invece di 300');
  deve(con.competenza === 1, 'la copertura non è contata come scrittura di competenza');
  /* E lo stesso vale per la barra della prima nota. */
  const r = C.riepilogo(F4B_MOV, { causali: F4B_CAU, righe: F4B_RIGHE, conti: F4B_CONTI });
  deve(r.entrate === 300, 'la barra della prima nota conta ' + r.entrate + ' invece di 300');
  deve(r.competenza === 1, 'la barra non conta a parte la scrittura di competenza');
  return 'dalla testata 600, dalle gambe di denaro 300';
});

prova('Fase 4-bis · l\'intestazione della giornata torna con l\'elenco per conto', () => {
  /* Fino a ieri l'intestazione leggeva la testata e l'elenco per conto le
     righe: due numeri diversi sulla stessa giornata, uno accanto all'altro. */
  const g = C.giornata('2026-09-22', F4B_MOV, F4B_CONTI, { causali: F4B_CAU, righe: F4B_RIGHE });
  const liquidi = g.per_conto.filter(x => ['cassa'].includes(x.conto_id));
  const somma = liquidi.reduce((a, x) => a + x.entrate - x.uscite, 0);
  deve(somma === g.saldo, 'l\'intestazione dice ' + g.saldo + ' e i conti di denaro ' + somma);
  /* E i conti che denaro non sono restano nell'elenco: sapere che quel giorno
     è nato un debito verso una compagnia serve. */
  deve(g.per_conto.some(x => x.conto_id === 'deb'), 'il debito verso la compagnia sparisce dall\'elenco');
  return 'saldo ' + g.saldo + ', e il debito resta visibile';
});

prova('Fase 4-bis · un conto che non si è potuto leggere non si presume denaro', () => {
  /* Senza l'elenco dei conti non si può sapere quali sono di denaro: contarli
     tutti rimetterebbe dentro il difetto. Si conta zero e si dichiara. */
  const r = C.riepilogo(F4B_MOV, { causali: F4B_CAU, righe: F4B_RIGHE });
  deve(r.entrate === 0, 'senza i conti il riepilogo presume denaro: ' + r.entrate);
  deve(r.competenza === 2, 'senza i conti le righe non finiscono fra quelle di competenza');
  /* E senza righe si torna alla testata, come i movimenti di prima del 20/09. */
  const t = C.riepilogo(F4B_MOV, { causali: F4B_CAU });
  deve(t.entrate === 600 && t.da_testata === 2, 'senza righe non si legge più la testata');
  return 'zero e dichiarato, e senza righe la testata come prima';
});


prova('Fase 4-bis · una rata incassata dalla Fase 2 non risulta «mai entrata in contabilità»', () => {
  /* Un incasso di tre rate scrive UN movimento, e la testata ne porta una:
     le altre due risultavano «mai entrate», e un clic su «Portale in
     contabilità» avrebbe fatto nascere un secondo debito verso la compagnia
     per un premio entrato una volta sola. Dove sta scritto che una rata è
     entrata sono TRE posti — la testata, le righe, e le rate dell'incasso. */
  const base = { oggi: '2026-09-22', conti: [], movimenti: [], causali: [], sospesi: [],
                 titoli: [{ id: 't1', importo_lordo: 100 }, { id: 't2', importo_lordo: 200 },
                          { id: 't3', importo_lordo: 300 }] };
  const quante = d => (C.anomalie(d).filter(a => /il conto non sa/.test(a.titolo))[0] || {}).quanti || 0;

  deve(quante(base) === 3, 'il banco non riproduce il caso: senza niente dovrebbero essere 3');
  /* la prima chiusa dalla testata, la seconda da una riga, la terza dalle
     rate dell'incasso: nessuna delle tre deve risultare fuori. */
  deve(quante(Object.assign({}, base, {
    movimenti: [{ id: 'm', titolo_id: 't1', annullato_il: null }],
    righe: [{ movimento_id: 'm', titolo_id: 't2' }],
    incassi_rate: [{ titolo_id: 't3', attiva: true }]
  })) === 0, 'una rata incassata dalla Fase 2 risulta ancora «mai entrata in contabilità»');
  /* Una rata dell'incasso STORNATO invece è tornata aperta, e deve tornare a
     comparire: `attiva: false` non chiude niente. */
  deve(quante(Object.assign({}, base, {
    incassi_rate: [{ titolo_id: 't1', attiva: false }]
  })) === 3, 'una rata di un incasso stornato risulta ancora in contabilità');
  /* E un premio messo a copertura (Fase 3) è in contabilità anche lui. */
  deve(quante(Object.assign({}, base, {
    crediti: [{ titolo_id: 't1', attivo: true }]
  })) === 2, 'un premio a copertura non risulta in contabilità');
  return 'tre strade, e lo storno riapre';
});

console.log('\n══ CONTI E CAUSALI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCONTI E CAUSALI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
