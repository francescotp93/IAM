// ═══════════════════════════════════════════════════════════════════════════════
//  IL PORTAFOGLIO DI HDI — tracciato PASS-133
//
//  I DATI QUI SOTTO SONO FINTI, TUTTI. Il file vero porta nomi, indirizzi,
//  codici fiscali e date di nascita di clienti dell'agenzia: non entra in un
//  repository, e non serve — quello che si prova qui è la STRUTTURA, e per
//  quella un file costruito a mano è meglio, perché si può rompere apposta.
//
//  Le cose che devono restare vere:
//
//    1. UN FILE TRONCATO NON SI CARICA. È il guaio peggiore, perché sembra un
//       file buono e più corto: si importerebbe mezzo portafoglio senza un
//       errore. La riga finale è l'unica cosa che dice che il file è finito.
//
//    2. GLI IMPORTI ALL'ITALIANA. «1.234,56» dato in pasto a parseFloat fa 1.
//       Un premio da milleduecento euro diventa un euro, e non se ne accorge
//       nessuno, perché 1 è un numero valido.
//
//    3. LE DATE SI GIRANO. «01/10/1980» letto all'americana è il 10 gennaio.
//
//    4. I TITOLI DI POLIZZE CHE NON ESISTONO RESTANO FUORI. Nel file vero sono
//       112 su 154: rate di contratti più vecchi o di altro portafoglio.
//       Caricarle riempirebbe lo scadenzario di rate agganciate al nulla.
//
//    5. SE I PREMI NON SI SCOMPONGONO, NON SI CARICA NIENTE. La somma che
//       torna è la prova che la colonna del premio è quella giusta: quando
//       smette di tornare, il tracciato è cambiato e va riletto PRIMA di
//       mettere numeri in archivio.
//
//    6. LE DATE NON HANNO UN NOME. Al primo giro le avevo battezzate a naso e
//       ne usciva una polizza annuale lunga due anni. Restano numerate finché
//       HDI non manda il tracciato: una decorrenza sbagliata sposta la
//       telefonata di rinnovo di un anno.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, m) => { if (!c) throw new Error(m); };

const H = require('../../tariffe/motore/flusso-hdi.js');

/* Un file minimo ma completo: testata, un cliente, una polizza che quadra, due
   garanzie che sommano al premio, due titoli — uno della polizza e uno di una
   polizza che nel file non c'è — e la coda. */
const col = (n, valori) => {
  const r = new Array(n).fill('');
  Object.keys(valori).forEach(k => { r[Number(k) - 1] = valori[k]; });
  return r.join(';');
};

const TESTATA = '0;UTF-8;PASS-133;0;N;24/09/2026';
const CODA    = '99;UTF-8;PASS-133;0;N;24/09/2026';
/* Le colonne sono quelle vere, comprese le DUE «IT» — nazione di residenza
   (14) e nazione di nascita (20). Sono le trappole che il 24/09/2026 hanno
   fatto leggere «IT» come provincia e come codice fiscale: se il finto file
   non le avesse, non somiglierebbe abbastanza a quello vero per accorgersi
   che il lettore è tornato a sbagliare. */
const CLIENTE = col(31, { 1: '10', 6: 'ANA1', 7: 'M', 10: 'ROSSI MARIO', 11: 'VIA FINTA 1',
                          12: 'TRAPANI', 14: 'IT', 15: 'TP', 16: '91100',
                          18: '01/10/1980', 19: 'ERICE', 20: 'IT',
                          21: 'RSSMRA80R01L331X', 25: '3330000000', 26: 'finto@esempio.it' });
const POLIZZA = col(82, { 1: '20', 2: 'POL1', 4: '133', 5: '1428', 6: '1428000001',
                          9: 'Auto', 12: 'Auto HDI', 16: 'Polizza attiva',
                          19: '17/11/2025', 20: '17/11/2024', 21: '17/11/2026',
                          24: 'Annuale', 61: 'ANA1', 79: 'RSSMRA80R01L331X',
                          70: '1.000,00', 72: '100,00', 73: '134,56', 74: '1.234,56' });
const GAR1    = col(36, { 1: '30', 2: 'POL1', 9: '100101', 10: 'RCA', 18: '7.750.000,00',
                          21: 'AUTO HDI - FINTA (AA000BB)', 31: '900,00', 34: '1.100,00' });
const GAR2    = col(36, { 1: '30', 2: 'POL1', 9: '100102', 10: 'Assistenza',
                          31: '100,00', 34: '134,56' });
const TIT_OK  = col(64, { 1: '40', 2: 'POL1', 11: '17/11/2025', 13: '17/11/2026',
                          14: 'Quietanza', 18: 'Annuale', 19: 'Incassato', 22: '17/11/2025' });
const TIT_KO  = col(64, { 1: '40', 2: 'POL-CHE-NON-CE', 14: 'Quietanza', 19: 'Incassato' });

const FILE = [TESTATA, CLIENTE, POLIZZA, GAR1, GAR2, TIT_OK, TIT_KO, CODA].join('\r\n');

/* ── 1. un file troncato non si carica ──────────────────────────────────── */

prova('un file senza la riga finale non si carica', () => {
  const troncato = FILE.split('\r\n').slice(0, -1).join('\r\n');
  const r = H.esamina(troncato, []);
  deve(!r.busta.ok, 'un file troncato risulta integro: si caricherebbe mezzo portafoglio');
  deve(!r.caricabile, 'un file troncato risulta caricabile');
  deve(/troncato/i.test(r.busta.guai.join(' ')), 'non dice che è troncato: ' + r.busta.guai.join(' | '));
});

prova('e uno senza testata nemmeno', () => {
  const r = H.esamina(FILE.split('\r\n').slice(1).join('\r\n'), []);
  deve(!r.caricabile, 'un file senza testata si carica lo stesso');
});

prova('ma quello intero sì, e si riconosce il tracciato', () => {
  const r = H.esamina(FILE, []);
  deve(r.busta.ok && r.caricabile, 'il file buono non si carica: ' + JSON.stringify(r.busta.guai));
  deve(r.busta.tracciato === 'PASS-133', 'non riconosce il tracciato: ' + r.busta.tracciato);
  deve(r.busta.estratto_il === '2026-09-24', 'la data di estrazione non si legge: ' + r.busta.estratto_il);
});

/* ── 2. gli importi all'italiana ────────────────────────────────────────── */

prova('«1.234,56» vale milleduecentotrentaquattro e cinquantasei', () => {
  deve(H.euro('1.234,56') === 1234.56, 'il separatore delle migliaia mangia il premio: ' + H.euro('1.234,56'));
  deve(H.euro('379,19') === 379.19, 'la virgola decimale non viene letta');
  deve(H.euro('0,00') === 0, 'lo zero diventa qualcos\'altro');
  deve(H.euro('') === null, 'un campo vuoto diventa zero: zero e «non detto» non sono la stessa cosa');
  deve(H.euro('-0,14') === -0.14, 'gli importi negativi si perdono: nei titoli ce ne sono');
});

prova('e finisce dentro la polizza, non solo nella funzione', () => {
  const r = H.esamina(FILE, []);
  deve(r.polizze[0].premio_lordo === 1234.56, 'il premio della polizza è ' + r.polizze[0].premio_lordo);
  deve(r.garanzie[0].massimale === 7750000, 'il massimale si è ridotto a ' + r.garanzie[0].massimale);
});

/* ── 3. le date si girano ───────────────────────────────────────────────── */

prova('«01/10/1980» è il primo ottobre, non il dieci gennaio', () => {
  deve(H.data('01/10/1980') === '1980-10-01', 'la data si gira male: ' + H.data('01/10/1980'));
  deve(H.data('') === null, 'una data vuota diventa una data');
  deve(H.data('non una data') === null, 'accetta qualcosa che non è una data');
});

/* ── 4. i titoli orfani restano fuori ───────────────────────────────────── */

prova('un titolo di una polizza che non esiste non entra', () => {
  const r = H.esamina(FILE, []);
  deve(r.titoli.length === 1, 'sono entrati ' + r.titoli.length + ' titoli invece di 1');
  deve(r.titoliScartati.length === 1, 'il titolo orfano non risulta scartato');
  deve(r.avvisi.some(a => /agganciate al nulla|non sono né nel file/i.test(a.t)),
    'non avvisa che dei titoli restano fuori: sparirebbero in silenzio');
});

prova('ma se la sua polizza è già in archivio, entra', () => {
  /* È il caso normale dal secondo file in poi: le rate arrivano dopo la
     polizza, e scartarle vorrebbe dire non incassare mai niente. */
  const r = H.esamina(FILE, ['POL-CHE-NON-CE']);
  deve(r.titoli.length === 2, 'con la polizza già in archivio il titolo resta fuori lo stesso');
  deve(r.titoliScartati.length === 0, 'risulta scartato un titolo che si poteva caricare');
});

/* ── 5. se i premi non si scompongono, non si carica ────────────────────── */

prova('i premi della polizza si scompongono, e il file lo dimostra', () => {
  const r = H.esamina(FILE, []);
  deve(r.polizze[0].premio_quadra === true, 'la somma non torna su un file costruito apposta perché torni');
});

prova('e se non si scompongono più, il file non si carica', () => {
  /* È il campanello del cambio di tracciato: meglio fermarsi che caricare
     premi credibili e sbagliati. */
  const rotta = FILE.replace('1.234,56', '9.999,99');
  const r = H.esamina(rotta, []);
  deve(r.polizze[0].premio_quadra === false, 'la somma torna anche con il lordo cambiato');
  deve(!r.caricabile, 'un file con i premi che non tornano si carica lo stesso');
  deve(r.avvisi.some(a => a.g === 'grave' && /premio/i.test(a.t)), 'non lo segnala come grave');
});

prova('le garanzie sommano al premio della polizza', () => {
  /* 1.100,00 + 134,56 = 1.234,56. È il controllo che dice se la colonna 34 è
     davvero il totale della garanzia. */
  const r = H.esamina(FILE, []);
  const somma = r.garanzie.reduce((a, g) => a + (g.premio_lordo || 0), 0);
  deve(Math.abs(somma - r.polizze[0].premio_lordo) < 0.02,
    'le garanzie sommano ' + somma.toFixed(2) + ' contro un premio di ' + r.polizze[0].premio_lordo);
});

/* ── 6. quello che non si sa non prende un nome ─────────────────────────── */

prova('effetto e scadenza sono quelli che confermano i titoli', () => {
  /* Come si è saputo quali colonne sono: incrociandole con i titoli, che
     portano il periodo della rata. Sul file vero combaciano 29 volte su 29
     sulle polizze annuali. Sulle semestrali no, e nemmeno devono: lì il titolo
     è la prima rata — stessa partenza, metà durata. Sbagliare esattamente dove
     ci si aspetta è la conferma migliore. */
  const r = H.esamina(FILE, []);
  const p = r.polizze[0], t = r.titoli[0];
  deve(p.effetto === '2025-11-17', 'l\'effetto non è la colonna 19: ' + p.effetto);
  deve(p.scadenza === '2026-11-17', 'la scadenza non è la colonna 21: ' + p.scadenza);
  deve(p.frazionamento === 'Annuale' && t.effetto === p.effetto && t.scadenza === p.scadenza,
    'su una polizza annuale il titolo non copre lo stesso periodo: ' + t.effetto + '→' + t.scadenza);
});

prova('le altre tre date restano numerate, non battezzate', () => {
  /* Al primo giro le avevo chiamate «effetto» e «scadenza»: ne usciva una
     polizza annuale lunga due anni. Una decorrenza sbagliata sposta la
     telefonata di rinnovo di un anno, e il numero sembra giusto. */
  const r = H.esamina(FILE, []);
  const p = r.polizze[0];
  /* c20 non è la decorrenza in corso: sulla polizza che sostituisce un'altra
     porta la decorrenza ORIGINALE del contratto sostituito. Finché non lo dice
     il tracciato, non prende un nome. */
  deve(p.date && p.date.c20 === '2024-11-17', 'la colonna 20 non si legge: ' + JSON.stringify(p.date));
  deve(p.date.c19 === undefined && p.date.c21 === undefined,
    'c19 e c21 sono rimaste anche fra quelle senza nome: ora si chiamano effetto e scadenza');
});

prova('e ogni record si porta dietro la riga intera', () => {
  /* `grezzo` è quello che permette di chiudere le colonne mancanti quando
     arriva il tracciato, senza rileggere il file. */
  const r = H.esamina(FILE, []);
  deve(Array.isArray(r.polizze[0].grezzo) && r.polizze[0].grezzo.length === 82,
    'la polizza non conserva le sue 82 colonne');
  deve(r.anagrafiche[0].grezzo.length === 31, 'l\'anagrafica non conserva le sue 31 colonne');
});

/* ── 7. i conti del file ────────────────────────────────────────────────── */

prova('si contano tutti i tipi di record, sinistri e incassi compresi', () => {
  const r = H.esamina(FILE, []);
  deve(r.conteggi.anagrafiche === 1 && r.conteggi.polizze === 1 && r.conteggi.garanzie === 2,
    'i conteggi non tornano: ' + JSON.stringify(r.conteggi));
  deve('sinistri' in r.conteggi && 'incassi' in r.conteggi,
    'sinistri e incassi non vengono contati: sono due tipi che l\'SSF non ha');
});

prova('una riga di tipo sconosciuto si segnala invece di sparire', () => {
  const r = H.esamina(FILE.replace(CODA, '77;roba;nuova\r\n' + CODA), []);
  deve(r.avvisi.some(a => /tipo «77»/.test(a.t)),
    'un tipo di record nuovo passa inosservato: al prossimo aggiornamento del tracciato si perderebbero righe in silenzio');
});

/* ── 8. il tasto ────────────────────────────────────────────────────────── */

prova('il file di HDI entra dallo stesso tasto dell\'altro flusso', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const acc = (/id="flu-file"[^>]*accept="([^"]*)"/.exec(pagina) || [])[1] || '';
  deve(/\.dat\b/.test(acc),
    'il tasto non accetta il .dat: il file di HDI non si può nemmeno scegliere — ' + acc);
  deve(/flusso-hdi\.js/.test(pagina), 'il lettore non viene caricato dalla pagina');
  deve(/fluAnteprimaHdi/.test(pagina), 'non c\'è nessuna anteprima per il file di HDI');
});

prova('si riconosce dalla prima riga, non dal nome del file', () => {
  /* Il nome lo sceglie chi scarica: basterebbe rinominare un file per farlo
     leggere dal lettore sbagliato, e uscirebbero numeri da un tracciato che
     non è quello. */
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const fn = pagina.slice(pagina.indexOf('function fluEHdi'), pagina.indexOf('async function fluAnteprimaHdi'));
  deve(/PASS-/.test(fn), 'non guarda il tracciato dichiarato nella prima riga');
  deve(/fluEHdi\(testo\)/.test(pagina), 'il controllo esiste ma non lo chiama nessuno');
});

prova('e l\'anteprima dice, nero su bianco, che non ha scritto niente', () => {
  /* Un\'importazione che scrive prima di farsi vedere è una cosa che si
     subisce. Se un giorno questa frase sparisce, è perché qualcuno ha acceso
     la scrittura: allora questa prova va aggiornata apposta, non per caso. */
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const fn = pagina.slice(pagina.indexOf('async function fluAnteprimaHdi'), pagina.indexOf('async function fluScelto'));
  deve(/non è stato scritto niente|non si scrive/i.test(fn),
    'l\'anteprima non dice che in archivio non è stato scritto niente');
  deve(!/\.insert\(|\.upsert\(|\.update\(/.test(fn),
    'l\'anteprima scrive in archivio: doveva solo guardare');
});

/* ═══ DALLA LETTURA ALLA SCRITTURA ════════════════════════════════════════
   `converti` traduce il PASS-133 nella forma che la scrittura dell'SSF già
   accetta. Tradurre soldi è il punto in cui un errore non si vede: il numero
   esce, è plausibile, e finisce in un portafoglio. Le due prove che contano
   qui nascono da due errori veri, fatti il 24/09/2026 su questo file.

   IL PRIMO: appaiare le rate agli incassi per polizza+data. La polizza
   1428407270 aveva sei righe di rata e un incasso solo da 733 €, e tutte e
   sei si prendevano 733 €. Il totale delle rate saliva a 7.985 € contro
   2.735 € davvero incassati: 5.912 € di soldi inesistenti.

   IL SECONDO, che è la causa del primo: quelle sei righe NON erano sei rate.
   Avevano tutte lo stesso progressivo — erano la stessa rata scritta una
   volta per sezione. */

const INC = (o) => Object.assign({ data: '2026-09-23', polizza_numero: 'P1', importo: 0, mezzo: 'Contante' }, o);
const TIT = (o) => Object.assign({ polizza_id: 'a1', tipo: 'Nuova Polizza', effetto: '2026-09-23',
  scadenza: '2027-09-23', frazionamento: 'Annuale', stato: 'Incassato', incassato_il: '2026-09-23',
  grezzo: ['40', 'PROG1'] }, o);
const POL = (o) => Object.assign({ id: 'a1', numero: 'P1', ramo: 'Auto', prodotto: 'RCA', agenzia: '1428',
  effetto: '2026-09-23', scadenza: '2027-09-23', frazionamento: 'Annuale',
  premio_lordo: 735.54, premio_netto: 600, anagrafica_id: 'c1' }, o);
const ANA = (o) => Object.assign({ id: 'c1', denominazione: 'ROSSI MARIO', codice_fiscale: 'RSSMRA80A01L331X',
  comune: 'Trapani', provincia: 'TP' }, o);

prova('la stessa rata ripetuta per sezione si conta una volta sola', () => {
  /* Sei righe, un progressivo. Sono una rata. */
  const sei = [1, 2, 3, 4, 5, 6].map(() => TIT({}));
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: sei, incassi: [INC({ importo: 733, mezzo: 'Bonifico' })], busta: { tracciato: 'PASS-133' } });
  deve(a.titoli.length === 1, 'sono entrate ' + a.titoli.length + ' rate invece di una');
  const somma = a.titoli.reduce((t, x) => t + x.importo_lordo, 0);
  deve(somma === 733, 'il totale delle rate fa ' + somma + ' invece di 733: la rata è stata moltiplicata');
});

prova('un incasso non può pagare due rate diverse', () => {
  /* Due rate vere (progressivi diversi) e un incasso solo: l'importo non si
     sa attribuire, e nessuna delle due se lo prende. Prendersi 733 € a testa
     è il modo in cui nascono 5.912 € dal nulla. */
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({ premio_lordo: null })], garanzie: [], sinistri: [],
    titoli: [TIT({ grezzo: ['40', 'PROG1'] }), TIT({ grezzo: ['40', 'PROG2'] })],
    incassi: [INC({ importo: 733 })], busta: { tracciato: 'PASS-133' } });
  const somma = a.titoli.reduce((t, x) => t + x.importo_lordo, 0);
  deve(somma <= 733, 'le rate caricate valgono ' + somma + ': più di quanto è stato incassato');
  deve(a.titoliSenzaImporto.length >= 1, 'nessuna rata è stata lasciata fuori: l\'importo è stato indovinato');
});

prova('la colonna 23 non è un importo', () => {
  /* Vale 293 su ogni riga del file: è un codice. Chi la scambiasse per soldi
     caricherebbe un portafoglio intero di rate da 293 €. */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../tariffe/motore/flusso-hdi.js', import.meta.url), 'utf8');
  const i = src.indexOf('function converti(');
  const corpo = src.slice(i, src.indexOf('var API = {', i));
  deve(!/c\(r,\s*23\)|grezzo\[22\]/.test(corpo), 'converti legge la colonna 23 come se fosse un importo');
});

prova('senza un importo scritto da qualcuno la rata non si carica', () => {
  /* Il premio diviso per il frazionamento sarebbe aritmetica plausibile su
     soldi veri: credibile e inventata. */
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({ frazionamento: 'Semestrale', premio_lordo: 600 })],
    garanzie: [], sinistri: [], titoli: [TIT({ frazionamento: 'Semestrale' })], incassi: [],
    busta: { tracciato: 'PASS-133' } });
  deve(a.titoli.length === 0, 'una rata semestrale senza incasso è entrata con un importo inventato: ' +
    (a.titoli[0] && a.titoli[0].importo_lordo));
  deve(a.titoliSenzaImporto.length === 1, 'la rata scartata non è stata contata');
});

prova('ma una rata annuale vale il premio annuo, e lo dice', () => {
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({})], incassi: [], busta: { tracciato: 'PASS-133' } });
  deve(a.titoli.length === 1 && a.titoli[0].importo_lordo === 735.54, 'la rata annuale non prende il premio annuo');
  deve(/premio annuo/i.test(a.titoli[0].note || ''), 'da dove viene l\'importo non è scritto sulla rata');
});

prova('le provvigioni restano vuote, non zero', () => {
  /* Zero è una cifra e finisce nei rendiconti come «non ha guadagnato
     niente». Vuoto è la verità: HDI non le manda. */
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({})], incassi: [INC({ importo: 100 })], busta: { tracciato: 'PASS-133' } });
  deve(a.titoli[0].provvigione === null, 'la provvigione è ' + a.titoli[0].provvigione + ' invece che vuota');
});

prova('il mezzo di pagamento arriva dall\'incasso, tradotto', () => {
  /* È il dato che serve al foglio cassa: senza, la contabilità giornaliera
     nasce con la colonna più importante vuota. */
  const m = { 'Contante': 'contante', 'Pos': 'pos', 'Bonifico': 'bonifico', 'SDD': 'domiciliazione',
    'Carta di credito Visa': 'carta_credito', 'Altro': 'altro' };
  Object.keys(m).forEach(k => {
    deve(H.mezzoNostro(k) === m[k], k + ' diventa ' + H.mezzoNostro(k) + ' invece di ' + m[k]);
  });
  deve(H.mezzoNostro('Zibaldone') === null, 'un mezzo sconosciuto diventa qualcosa invece di restare vuoto');
});

prova('una partita IVA non finisce nella casella del codice fiscale', () => {
  /* Cercare l'azienda nell'indice delle persone vuol dire non trovarla e
     crearne il doppione. */
  const a = H.converti({ anagrafiche: [ANA({ codice_fiscale: '01234567890', denominazione: 'ACME SRL' })],
    polizze: [], garanzie: [], sinistri: [], titoli: [], incassi: [], busta: {} });
  deve(a.clienti[0].partita_iva === '01234567890', 'gli undici caratteri non sono stati letti come partita IVA');
  deve(!a.clienti[0].codice_fiscale, 'la partita IVA è finita anche nel codice fiscale');
  deve(a.clienti[0].tipo === 'giuridica', 'l\'azienda è stata schedata come ' + a.clienti[0].tipo);
});

prova('polizze e rate portano una chiave stabile', () => {
  /* Se la chiave cambia da un\'importazione all\'altra, ricaricare lo stesso
     file raddoppia il portafoglio: è `_fonte_id` a dire «questa l\'ho già». */
  const uno = () => H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({})], incassi: [INC({ importo: 100 })], busta: {} });
  const a = uno(), b = uno();
  deve(a.polizze[0]._fonte_id === b.polizze[0]._fonte_id && /P1/.test(a.polizze[0]._fonte_id),
    'la chiave della polizza non è stabile: ' + a.polizze[0]._fonte_id);
  deve(a.titoli[0]._fonte_id === b.titoli[0]._fonte_id && /PROG1/.test(a.titoli[0]._fonte_id),
    'la chiave della rata non è stabile: ' + a.titoli[0]._fonte_id);
  deve(a.polizze[0]._cliente === a.clienti[0]._chiave, 'la polizza non si aggancia al suo cliente');
});

prova('il totale caricato non supera mai quello incassato davvero', () => {
  /* La prova di chiusura, sul file vero di Francesco: qualunque cosa faccia
     l\'accoppiamento, la somma delle rate che prendono l\'importo da un
     incasso non può superare la somma degli incassi. */
  const fs2 = require('fs');
  const percorso = '/root/.claude/uploads/69902a59-322e-5e06-8d26-1dd7126999e2/1e9ebdcf-1428_20260923.dat';
  if (!fs2.existsSync(percorso)) { deve(true, ''); return; }
  const r = H.esamina(fs2.readFileSync(percorso, 'utf8'), []);
  const a = H.converti(r);
  const daIncasso = a.titoli.filter(t => !/premio annuo/i.test(t.note || ''));
  const somma = daIncasso.reduce((t, x) => t + x.importo_lordo, 0);
  const incassato = r.incassi.reduce((t, i) => t + (i.importo || 0), 0);
  deve(somma <= incassato + 0.005,
    'le rate valgono ' + somma.toFixed(2) + ' ma di incassi ce ne sono ' + incassato.toFixed(2) +
    ': ' + (somma - incassato).toFixed(2) + ' € nati dal nulla');
});

/* ── il file dev'essere anche SCEGLIBILE ────────────────────────────────────
   Il 24/09/2026 Francesco ha provato a caricare il suo file e «non è andato»,
   mentre il lettore qui sopra lo leggeva senza una piega: 14 clienti, 18
   polizze, 154 rate. Il motore era giusto e la porta era stretta. Queste
   prove guardano la porta. */

prova('il lettore si sceglie dal contenuto, non dall\'estensione', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('async function fluScelto(');
  deve(i > 0, 'fluScelto non esiste');
  const corpo = pagina.slice(i, i + 900);
  deve(corpo.indexOf('fluAnnusaHdi(') >= 0,
    'fluScelto non annusa il file: un .dat rinominato .txt, o dentro uno zip, finirebbe nel lettore sbagliato');
});

prova('anche dentro uno zip il portafoglio HDI si trova', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('async function fluAnnusaHdi(');
  deve(i > 0, 'fluAnnusaHdi non esiste');
  const corpo = pagina.slice(i, i + 800);
  deve(/\.zip\$\/i\.test/.test(corpo) && corpo.indexOf('apriZip') >= 0,
    'lo zip non viene aperto: la compagnia lo manda così per email');
  deve(corpo.indexOf('slice(0, 400)') >= 0,
    'per annusare legge tutto il file invece dei primi byte');
});

prova('l\'estensione .dat da sola non basta come `accept`', () => {
  /* Su iPhone un\'estensione che iOS non conosce fa comparire il file in
     grigio: il tasto c\'è, la schermata c\'è, e il file non si riesce a
     scegliere. */
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const m = /id="flu-file"[^>]*accept="([^"]*)"/.exec(pagina) || /accept="([^"]*)"[^>]*id="flu-file"/.exec(pagina);
  deve(m, 'non trovo l\'accept del tasto di caricamento');
  deve(/text\/plain|application\/octet-stream/.test(m[1]),
    'l\'accept elenca solo estensioni: su iOS il .dat resta grigio — ' + m[1]);
});

prova('se il lettore inciampa la pagina lo dice, non resta ad aspettare', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('async function fluAnteprimaHdi(');
  const corpo = pagina.slice(i, pagina.indexOf('async function fluScelto(', i));
  const j = corpo.indexOf('H.esamina(');
  deve(j > 0, 'l\'anteprima non chiama esamina');
  deve(/try\s*\{[^}]*H\.esamina\(/.test(corpo),
    'esamina non è dentro un try: un file storto lascerebbe la pagina ferma su «Leggo il portafoglio…»');
});

prova('un .dat che non è di HDI dice cosa ha trovato', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('Questo .dat non è un portafoglio HDI');
  deve(i > 0, 'manca il messaggio per un .dat di un\'altra compagnia');
  deve(pagina.slice(i - 400, i + 400).indexOf('PASS-') >= 0,
    'il messaggio non mostra cosa c\'era scritto davvero: «non è un portafoglio HDI» è vero e inutile');
});

/* ═══ LE COLONNE DELL'ANAGRAFICA ═══════════════════════════════════════════
   Il 24/09/2026 l'anteprima diceva «1 cliente, 18 polizze» e Francesco si è
   fermato a chiedere se non fosse strano. Lo era. Il lettore prendeva la
   colonna 20 come codice fiscale, e la colonna 20 vale «IT» su ogni riga:
   quattordici persone con lo stesso codice fiscale.

   Nessun controllo protestava, perché il file era formalmente a posto. Ma a
   valle quel codice è LA CHIAVE con cui si decide «questa persona ce l'ho
   già»: uguale per tutti vuol dire che quattordici persone sono la stessa
   persona. Sarebbero entrati tredici clienti fusi in uno, con le polizze di
   tutti attaccate al primo — e non si sarebbe visto fino a quando qualcuno
   avesse chiamato per una polizza che risulta di un altro.

   Erano sbagliate anche provincia, CAP, data di nascita, comune di nascita,
   telefono ed email: sfalsate da due colonne che contengono «IT» (nazione di
   residenza e nazione di nascita), ognuna appoggiata giusto prima del campo
   che conta.

   Le colonne giuste non sono state indovinate: si è chiesto a ognuna delle
   quattordici righe di rispettare la forma del suo campo. La vecchia
   ipotesi rispondeva 0 su 14; la nuova 14 su 14. */

prova('ogni anagrafica esce con un codice fiscale suo', () => {
  const fs = require('fs');
  const percorso = '/root/.claude/uploads/69902a59-322e-5e06-8d26-1dd7126999e2/1e9ebdcf-1428_20260923.dat';
  if (!fs.existsSync(percorso)) { deve(true, ''); return; }
  const r = H.esamina(fs.readFileSync(percorso, 'utf8'), []);
  const cf = r.anagrafiche.map(a => String(a.codice_fiscale || '').trim().toUpperCase());
  const distinti = new Set(cf).size;
  deve(distinti === r.anagrafiche.length,
    'su ' + r.anagrafiche.length + ' anagrafiche ci sono solo ' + distinti + ' codici fiscali distinti: ' +
    'la colonna letta non è quella del codice fiscale, e quelle persone verrebbero fuse in una');
  deve(cf.every(v => H.codiceFiscaleValido(v)),
    'ci sono codici fiscali che non ne hanno la forma: ' + JSON.stringify(cf.filter(v => !H.codiceFiscaleValido(v))));
});

prova('e con gli altri campi nelle caselle giuste', () => {
  /* La provincia usciva «IT» e il CAP usciva «TP». Nessuno dei due dava
     errore: entravano così. */
  const fs = require('fs');
  const percorso = '/root/.claude/uploads/69902a59-322e-5e06-8d26-1dd7126999e2/1e9ebdcf-1428_20260923.dat';
  if (!fs.existsSync(percorso)) { deve(true, ''); return; }
  const a = H.converti(H.esamina(fs.readFileSync(percorso, 'utf8'), []));
  /* «Due lettere» NON basta: «IT» è due lettere, ed è esattamente il valore
     sbagliato che si leggeva. Serve la lista vera delle sigle. */
  const SIGLE = ('AG AL AN AO AP AQ AR AT AV BA BG BI BL BN BO BR BS BT BZ CA CB CE CH CL CN CO CR CS CT CZ ' +
    'EN FC FE FG FI FM FR GE GO GR IM IS KR LC LE LI LO LT LU MB MC ME MI MN MO MS MT NA NO NU OR PA PC PD ' +
    'PE PG PI PN PO PR PT PU PV PZ RA RC RE RG RI RM RN RO SA SI SO SP SR SS SU SV TA TE TN TO TP TR TS TV ' +
    'UD VA VB VC VE VI VR VT VV').split(' ');
  const guai = [];
  a.clienti.forEach(c => {
    if (c.provincia && SIGLE.indexOf(c.provincia) < 0) guai.push('provincia=' + c.provincia);
    if (c.cap && !/^[0-9]{5}$/.test(c.cap)) guai.push('cap=' + c.cap);
    if (c.data_nascita && !/^\d{4}-\d{2}-\d{2}$/.test(c.data_nascita)) guai.push('data_nascita=' + c.data_nascita);
    if (c.email && c.email.indexOf('@') < 0) guai.push('email senza chiocciola');
    if (c.cellulare && !/^[0-9 +]{6,}$/.test(c.cellulare)) guai.push('telefono=' + c.cellulare);
  });
  deve(guai.length === 0, 'campi nella casella sbagliata: ' + JSON.stringify([...new Set(guai)]));
  /* La controprova che le caselle sono piene davvero: se il lettore slittasse
     di nuovo, molti campi uscirebbero vuoti e la prova sopra passerebbe. */
  deve(a.clienti.filter(c => c.provincia).length === a.clienti.length, 'delle province sono vuote');
  deve(a.clienti.filter(c => c.cap).length === a.clienti.length, 'dei CAP sono vuoti');
  /* Una colonna sbagliata spesso non dà un valore storto: dà un valore che
     non si riesce a leggere, e il campo esce vuoto. Un campo vuoto passa
     ogni controllo di forma, quindi va contato. Nel file vero le date di
     nascita compilate sono 13 su 14. */
  deve(a.clienti.filter(c => c.data_nascita).length >= a.clienti.length - 1,
    'solo ' + a.clienti.filter(c => c.data_nascita).length + ' date di nascita su ' + a.clienti.length +
    ': la colonna letta non è quella della data');
  deve(a.clienti.filter(c => c.email).length >= a.clienti.length - 1, 'troppe email vuote');
});

prova('un identificativo uguale per tutti ferma il file', () => {
  /* La regola generale, che vale anche per il prossimo tracciato che slitta:
     non è un identificativo se non identifica. */
  const righe = ['0;UTF-8;PASS-133;0;N;24/09/2026'];
  for (let i = 1; i <= 4; i++) {
    const col = new Array(30).fill('');
    col[0] = '10'; col[1] = '133'; col[2] = 'PASS-133'; col[3] = '1428';
    col[5] = 'A' + i; col[6] = 'M'; col[9] = 'PERSONA ' + i;
    col[11] = 'TRAPANI'; col[13] = 'IT'; col[14] = 'TP'; col[15] = '91100';
    col[19] = 'IT'; col[20] = 'IT';           // <- la colonna sbagliata: uguale per tutti
    righe.push(col.join(';'));
  }
  const r = H.esamina(righe.join('\r\n'), []);
  deve(r.avvisi.some(a => a.g === 'grave' && /stesso codice fiscale/i.test(a.t)),
    'quattro persone con lo stesso codice fiscale non producono nessun avviso grave');
  deve(r.caricabile === false, 'un file così resta caricabile: entrerebbero quattro persone fuse in una');
});

prova('un codice fiscale storto non viene mai usato come chiave', () => {
  /* L'ultima rete: anche se un giorno la colonna slittasse di nuovo e
     l'avviso non bastasse, un codice di forma sbagliata NON diventa la
     chiave con cui si cerca «ce l'ho già». Meglio un doppione, che si vede
     e si unisce, che due persone fuse, che si scopre per telefono. */
  const a = H.converti({
    anagrafiche: [ANA({ id: 'c1', codice_fiscale: 'IT' }), ANA({ id: 'c2', codice_fiscale: 'IT' })],
    polizze: [], garanzie: [], sinistri: [], titoli: [], incassi: [], busta: {} });
  deve(a.clienti.every(c => !c.codice_fiscale && !c.partita_iva),
    'un codice fiscale di due lettere è stato tenuto come chiave: ' + JSON.stringify(a.clienti.map(c => c.codice_fiscale)));
  deve(a.avvisi.some(x => x.g === 'grave'), 'nessun avviso grave su codici fiscali scartati');
});

prova('la forma del codice fiscale si riconosce', () => {
  ['RSSMRA80A01L331X', '01234567890'].forEach(v =>
    deve(H.codiceFiscaleValido(v), v + ' dovrebbe essere valido'));
  ['IT', '', 'TP', '91027', 'RSSMRA80A01L33', 'RSSMRA80A01L331XY'].forEach(v =>
    deve(!H.codiceFiscaleValido(v), JSON.stringify(v) + ' non dovrebbe essere valido'));
});

/* ── QUELLO CHE LE TABELLE ACCETTANO ──────────────────────────────────────
   Il 24/09/2026 il convertitore era pronto, provato, e non avrebbe scritto
   una riga. `quote_titoli.tipo` ha un vincolo e i valori sono quattro:
   prima_rata, rata, quietanza, appendice. HDI manda «Nuova Polizza»,
   «Quietanza di Rinnovo», «Sostituzione», «Appendice» — e nessuno dei
   quattro coincide, nemmeno l'ultimo, che differisce per la maiuscola.

   Siccome la scrittura è UNA TRANSAZIONE, non sarebbero entrate meno rate:
   non sarebbe entrato niente, con un errore che parla di un vincolo e non
   nomina HDI. Trovarlo dopo aver pubblicato avrebbe voluto dire un tasto che
   sembra pronto e non carica mai.

   Questi sono i valori ammessi, copiati dai vincoli del database
   (`pg_constraint` su quote_titoli e quote_polizze, 24/09/2026). Se domani
   cambiano lì e non qui, questa prova non se ne accorge: è il suo limite, ed
   è scritto perché si sappia. */
const AMMESSI = {
  tipoRata: ['prima_rata', 'rata', 'quietanza', 'appendice'],
  statoRata: ['aperto', 'incassato', 'insoluto', 'stornato', 'annullato'],
  statoPagamento: ['non_pagato', 'sospeso', 'pagato', 'annullata'],
  /* Non è un vincolo del database: è quello che usano le altre 2.536 schede.
     Una terza parola per la stessa cosa è un filtro che da domani non trova
     più tutti. */
  tipoCliente: ['fisica', 'giuridica'],
};

prova('ogni rata esce con un tipo che la tabella accetta', () => {
  /* Le quattro parole vere di HDI, più una inventata per il caso ignoto. */
  const parole = ['Nuova Polizza', 'Quietanza di Rinnovo', 'Sostituzione', 'Appendice',
    'Quietanza di Frazionamento', 'Zibaldone', '', null];
  const a = H.converti({
    anagrafiche: [ANA({})],
    polizze: parole.map((_, n) => POL({ id: 'p' + n, numero: 'P' + n })),
    garanzie: [], sinistri: [],
    titoli: parole.map((w, n) => TIT({ polizza_id: 'p' + n, tipo: w, grezzo: ['40', 'PG' + n] })),
    incassi: parole.map((_, n) => INC({ polizza_numero: 'P' + n, importo: 100 })),
    busta: {},
  });
  deve(a.titoli.length === parole.length, 'sono entrate ' + a.titoli.length + ' rate su ' + parole.length);
  const fuori = a.titoli.filter(t => AMMESSI.tipoRata.indexOf(t.tipo) < 0);
  deve(fuori.length === 0,
    'tipi che il vincolo rifiuterebbe — e una sola riga così fa fallire TUTTA l\'importazione: ' +
    JSON.stringify([...new Set(fuori.map(t => t.tipo))]));
});

prova('e con uno stato che la tabella accetta', () => {
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({ stato: 'Incassato' }), TIT({ stato: 'Da incassare', grezzo: ['40', 'PG2'] })],
    incassi: [], busta: {} });
  const fuori = a.titoli.filter(t => AMMESSI.statoRata.indexOf(t.stato) < 0);
  deve(fuori.length === 0, 'stati rifiutati dal vincolo: ' + JSON.stringify(fuori.map(t => t.stato)));
});

prova('la parola vera di HDI non si perde nella traduzione', () => {
  /* Fra sei mesi «prima_rata» non racconterà che era una sostituzione. */
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({ tipo: 'Sostituzione' })], incassi: [INC({ importo: 100 })], busta: {} });
  deve(a.titoli[0].tipo === 'prima_rata', 'Sostituzione è diventata ' + a.titoli[0].tipo);
  deve(/Sostituzione/.test(a.titoli[0].note || ''),
    'la parola di HDI non è rimasta scritta da nessuna parte: ' + a.titoli[0].note);
});

prova('un tipo che non conosco si dichiara, non si nasconde', () => {
  const a = H.converti({ anagrafiche: [ANA({})], polizze: [POL({})], garanzie: [], sinistri: [],
    titoli: [TIT({ tipo: 'Zibaldone' })], incassi: [INC({ importo: 100 })], busta: {} });
  deve(a.avvisi.some(x => /Zibaldone/.test(x.t)),
    'un tipo sconosciuto entra come «rata» senza che nessuno lo sappia');
});

prova('i clienti escono con le parole che usa il resto dell\'archivio', () => {
  const a = H.converti({
    anagrafiche: [ANA({ id: 'c1', codice_fiscale: 'RSSMRA80A01L331X' }),
                  ANA({ id: 'c2', codice_fiscale: '01234567890' })],
    polizze: [], garanzie: [], sinistri: [], titoli: [], incassi: [], busta: {} });
  const fuori = a.clienti.filter(c => AMMESSI.tipoCliente.indexOf(c.tipo) < 0);
  deve(fuori.length === 0,
    'tipi cliente che nessun\'altra scheda usa: ' + JSON.stringify(fuori.map(c => c.tipo)));
  deve(a.clienti[0].tipo === 'fisica' && a.clienti[1].tipo === 'giuridica',
    'persona e azienda non sono distinte: ' + a.clienti.map(c => c.tipo).join(', '));
});

prova('sul file vero di Francesco non esce un solo valore fuori vincolo', () => {
  const fs = require('fs');
  const percorso = '/root/.claude/uploads/69902a59-322e-5e06-8d26-1dd7126999e2/1e9ebdcf-1428_20260923.dat';
  if (!fs.existsSync(percorso)) { deve(true, ''); return; }
  const a = H.converti(H.esamina(fs.readFileSync(percorso, 'utf8'), []));
  const guai = [];
  a.titoli.forEach(t => {
    if (AMMESSI.tipoRata.indexOf(t.tipo) < 0) guai.push('rata.tipo=' + t.tipo);
    if (AMMESSI.statoRata.indexOf(t.stato) < 0) guai.push('rata.stato=' + t.stato);
  });
  a.clienti.forEach(c => {
    if (AMMESSI.tipoCliente.indexOf(c.tipo) < 0) guai.push('cliente.tipo=' + c.tipo);
  });
  a.polizze.forEach(p => {
    if (p.stato_pagamento != null && AMMESSI.statoPagamento.indexOf(p.stato_pagamento) < 0) {
      guai.push('polizza.stato_pagamento=' + p.stato_pagamento);
    }
  });
  deve(guai.length === 0, 'il file vero produrrebbe valori rifiutati: ' + JSON.stringify([...new Set(guai)]));
});

/* ── la scrittura passa dalla porta che c'è già ────────────────────────────
   Non c'è una seconda funzione che scrive portafogli. Se un domani qualcuno
   ne aggiungesse una, queste prove restano verdi — ma quella che guarda la
   fonte diventa rossa appena HDI prova a entrare marcato 'ssf'. */

prova('il portafoglio HDI si prepara con il piano dell\'SSF', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('async function fluPreparaHdi(');
  deve(i > 0, 'non c\'è nessuna funzione che prepara il caricamento di HDI');
  /* Fino all'inizio della funzione dopo, non «duemila caratteri»: fluScelto
     viene subito sotto e ha anch'essa il suo controllo dei permessi. Una
     fetta troppo larga leggeva quello e dichiarava protetta una funzione che
     non lo era più. */
  const fine = pagina.indexOf('async function fluScelto(', i);
  deve(fine > i, 'non trovo dove finisce fluPreparaHdi');
  const corpo = pagina.slice(i, fine);
  deve(corpo.indexOf('H.converti(') >= 0, 'il piano non parte dalla conversione del tracciato');
  deve(corpo.indexOf('M.piano(') >= 0, 'HDI non usa il piano dell\'SSF: è una seconda strada per scrivere un portafoglio');
  deve(corpo.indexOf('fluEsistenti(') >= 0, 'non si guarda che cosa c\'è già: ricaricare lo stesso file raddoppierebbe il portafoglio');
  deve(/fluPuo\(\)/.test(corpo), 'chiunque può preparare un caricamento del portafoglio');
});

prova('il tasto per caricare c\'è, e solo se il file è caricabile', () => {
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = pagina.indexOf('async function fluAnteprimaHdi(');
  const corpo = pagina.slice(i, pagina.indexOf('async function fluPreparaHdi(', i));
  const j = corpo.indexOf('fluPreparaHdi()');
  deve(j > 0, 'l\'anteprima non offre nessun tasto per caricare');
  deve(/r\.caricabile[\s\S]{0,200}fluPreparaHdi\(\)/.test(corpo),
    'il tasto compare anche su un file che il lettore ha dichiarato non caricabile');
});

prova('HDI non entra in archivio spacciandosi per SSF', () => {
  /* `fonte` + `fonte_id` sono la chiave con cui il database riconosce «questa
     polizza l'ho già caricata». Due tracciati nello stesso spazio di chiavi
     vuol dire una collisione che non dà errore: dà una polizza che non entra,
     in silenzio. */
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  deve(/FLU_FONTE\s*=\s*'hdi'/.test(pagina), 'la strada di HDI non dichiara mai la sua fonte');
  deve(/p_fonte:\s*FLU_FONTE/.test(pagina), 'la scrittura non dice al database da quale tracciato arriva');
  deve(!/\.eq\('fonte',\s*'ssf'\)/.test(pagina),
    'si cerca ancora quello che c\'è già fra le sole righe dell\'SSF: le polizze HDI già caricate risulterebbero nuove, e si raddoppierebbero');
});

prova('la migrazione che apre la porta esiste, e non tocca l\'SSF', () => {
  const fs = require('fs');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const f = fs.readdirSync(dir).find(n => /import_anche_hdi/.test(n));
  deve(f, 'la migrazione che fa accettare la fonte non è stata scritta');
  const sql = fs.readFileSync(new URL(f, dir), 'utf8');
  deve(/drop function if exists public\.iam_importa_flusso\(uuid\);/.test(sql),
    'la versione vecchia non viene tolta: con f(uuid) e f(uuid,text default) insieme, la chiamata a un argomento '
    + 'diventa ambigua e Postgres la rifiuta — cioè la migrazione per HDI spegnerebbe l\'importazione SSF');
  deve(/p_fonte text default 'ssf'/.test(sql),
    'la fonte non ha il valore di prima come predefinito: le chiamate che esistono cambierebbero comportamento');
  deve(/not in \('ssf', 'hdi'\)/.test(sql),
    'la fonte non viene controllata: una chiamata sbagliata creerebbe uno spazio di chiavi nuovo senza che nessuno se ne accorga');
  deve(/COME SI TORNA INDIETRO/i.test(sql), 'la migrazione non dice come si torna indietro');
  deve(!/alter table|drop table|truncate/i.test(sql.replace(/^--.*$/gm, '')),
    'la migrazione tocca le tabelle: doveva sostituire solo il corpo di una funzione');
});

prova('l\'anteprima dice CHE COSA conta, e quanti restano fuori', () => {
  /* Il 24/09/2026 il riquadro diceva «11 clienti» su un file di 14, e per due
     volte Francesco si è fermato a chiedere se fosse un errore. La prima
     volta lo era (il lettore fondeva le persone), la seconda no: tre erano
     già in archivio. Un numero che costringe a chiedere «e gli altri?» è un
     numero scritto male, anche quando è giusto. */
  const fs = require('fs');
  const pagina = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  /* SOLO il riquadro dei clienti, non tutti e tre: guardandoli insieme
     bastava che uno fosse scritto bene perché la prova passasse, e infatti
     due sabotaggi su due non la facevano diventare rossa. */
  const i = pagina.indexOf('<div class="flu-tre">');
  deve(i > 0, 'non trovo i tre riquadri dell\'anteprima');
  const fine = pagina.indexOf('polizz', i);
  deve(fine > i, 'non trovo dove finisce il riquadro dei clienti');
  const tassello = pagina.slice(i, fine);
  /* «} nuov», cioè la parola scritta DOPO la fine dell'espressione: è
     l'etichetta che si legge. Cercare solo «nuov» non basta — dentro
     `p.clienti.nuovi.length` quella parola c'è comunque, e la prova
     passerebbe anche a etichetta cancellata. */
  deve(/flu-k">client[^<]*\} nuov/.test(tassello),
    'il riquadro dei clienti non dice che conta i NUOVI: su un file di 14 clienti di cui 3 già in archivio, «11 clienti» sembra una perdita');
  deve(/clienti\.gia/.test(tassello),
    'il riquadro dei clienti non guarda quanti ce ne sono già');
  deve(/già in archivio/.test(tassello),
    'non scrive da nessuna parte quanti restano fuori perché ci sono già: è l\'informazione che spiega la differenza');
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Flusso HDI: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
