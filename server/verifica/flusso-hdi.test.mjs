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
const CLIENTE = col(31, { 1: '10', 6: 'ANA1', 7: 'M', 10: 'ROSSI MARIO', 11: 'VIA FINTA 1',
                          12: 'TRAPANI', 14: 'TP', 15: '91100', 17: '01/10/1980',
                          20: 'RSSMRA80R01L331X', 24: '3330000000', 25: 'finto@esempio.it' });
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
  deve(/accept="\.zip,\.csv,\.dat"/.test(pagina),
    'il tasto non accetta il .dat: il file di HDI non si può nemmeno scegliere');
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

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Flusso HDI: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
