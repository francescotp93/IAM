// ═══════════════════════════════════════════════════════════════════════════════
//  CRM · ANALISI — estrarre pezzi di portafoglio
//
//  Questo motore sceglie delle PERSONE e decide chi riceve una comunicazione
//  commerciale. Sbagliare qui non produce un errore: produce una campagna
//  partita a chi non l'aveva chiesta, e non se ne accorge nessuno.
//
//  Le cose che devono restare vere:
//
//    1. LA LISTA PER LA CAMPAGNA NON È LA LISTA CHE ESPORTI. L'esportazione è
//       uso interno e ci sono tutti; la campagna va solo a chi ha dato il
//       consenso (art. 6.1.a GDPR). E non devono essere la stessa funzione con
//       un interruttore: l'interruttore prima o poi si gira.
//
//    2. L'ETÀ SI CALCOLA. Chi compie gli anni domani oggi ne ha uno in meno, e
//       un filtro «fino a 30» che lo include manda l'offerta giovani a chi non
//       ne ha più diritto.
//
//    3. FALSO E «NON LO SAPPIAMO» SONO DUE COSE DIVERSE. In archivio `sposato`
//       è falso su 2.533 anagrafiche su 2.536, e non vuol dire che siano tutti
//       celibi: vuol dire che la casella non è mai stata toccata. Chi filtra
//       «non sposati» si porterebbe dietro l'intero portafoglio.
//
//    4. UN FILTRO SU UN CAMPO VUOTO DEVE DIRLO. «0 clienti» e «quel campo non
//       l'ha compilato nessuno» sono due risposte diverse, e confonderle fa
//       prendere decisioni sbagliate sul portafoglio.
//
//    5. IL CSV NON SI SPACCA. Un nominativo con dentro un punto e virgola —
//       succede — spezzerebbe la riga e sposterebbe tutte le colonne.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, m) => { if (!c) throw new Error(m); };

const A = require('../../tariffe/motore/crm-analisi.js');

/* Nomi inventati. La forma è quella vera di quote_anagrafiche. */
const P = (o) => Object.assign({
  id: 'x', nominativo: 'ROSSI MARIO', comune: 'Trapani', provincia: 'TP',
  data_nascita: '1980-06-15', email: '', cellulare: '', note: '',
  sposato: false, ha_figli: false, consenso_marketing: false, lead: false,
}, o);

const GENTE = [
  P({ id: '1', nominativo: 'ALFA ANNA',  comune: 'Trapani', data_nascita: '1990-01-10', email: 'a@x.it', cellulare: '333', consenso_marketing: true }),
  P({ id: '2', nominativo: 'BETA BRUNO', comune: 'Paceco',  data_nascita: '1975-05-20', cellulare: '334', consenso_marketing: true }),
  P({ id: '3', nominativo: 'GAMMA GINO', comune: 'trapani', data_nascita: '1960-11-02', email: 'g@x.it' }),
  P({ id: '4', nominativo: 'DELTA DINA', comune: 'Erice',   data_nascita: '2002-03-01', note: 'cliente storico, richiamare a gennaio' }),
];

/* ── 1. campagna e esportazione sono due liste diverse ──────────────────── */

prova('la campagna va solo a chi ha dato il consenso', () => {
  const c = A.perCampagna(GENTE, 'email');
  deve(c.quanti === 1, 'destinatari ' + c.quanti + ' invece di 1');
  deve(c.destinatari[0].nominativo === 'ALFA ANNA', 'ha scelto la persona sbagliata');
  deve(c.esclusi.senzaConsenso === 2, 'esclusi per consenso ' + c.esclusi.senzaConsenso + ' invece di 2');
  deve(c.esclusi.senzaRecapito === 1, 'Bruno ha il consenso ma non l\'email: doveva risultare senza recapito');
});

prova('e l\'esportazione invece li prende tutti', () => {
  /* Il portafoglio dell'agenzia guardato dall'agenzia: non è una
     comunicazione, e il consenso non c'entra. */
  const righe = A.righeEsporta(GENTE, '2026-09-24');
  deve(righe.length === 4, 'esportati ' + righe.length + ' invece di 4');
  deve(righe.some(r => r['Consenso marketing'] === 'No'),
    'l\'esportazione ha tolto chi non ha dato il consenso: è un uso interno');
});

prova('non esiste un modo per spegnere il filtro del consenso', () => {
  /* Se ci fosse un parametro, prima o poi qualcuno lo passerebbe. La prova
     guarda il codice, perché è l'unico modo di accorgersi se domani qualcuno
     lo aggiunge «per comodità». */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../tariffe/motore/crm-analisi.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('function perCampagna'), src.indexOf('/* ── L\'ESPORTAZIONE'));
  deve(/consenso_marketing === true/.test(fn), 'la campagna non filtra più sul consenso');
  deve(!/tutti|ignoraConsenso|forza|senzaFiltro/i.test(fn),
    'è comparso un modo per saltare il consenso: prima o poi verrà usato');
  deve(A.perCampagna(GENTE, 'email').quanti === A.perCampagna(GENTE, 'email', true).quanti,
    'un terzo argomento cambia il risultato: qualcuno ha aggiunto una scorciatoia');
});

prova('via SMS cambia il recapito, non la regola', () => {
  const c = A.perCampagna(GENTE, 'sms');
  deve(c.quanti === 2, 'destinatari SMS ' + c.quanti + ' invece di 2 (Anna e Bruno hanno il cellulare)');
  deve(c.esclusi.senzaConsenso === 2, 'il consenso smette di contare quando il canale cambia');
});

prova('e la campagna dice perché la lista si è accorciata', () => {
  /* Una lista che si accorcia senza spiegazione fa pensare a un guasto, e
     qualcuno prova a «sistemarla». */
  const c = A.perCampagna(GENTE, 'email');
  deve(/consenso/i.test(c.perche) && /6\.1\.a|GDPR/i.test(c.perche),
    'non spiega perché mancano delle persone: ' + c.perche);
});

/* ── 2. l'età ───────────────────────────────────────────────────────────── */

prova('chi compie gli anni domani, oggi ne ha ancora uno in meno', () => {
  deve(A.eta('1996-09-25', '2026-09-24') === 29, 'il giorno prima del compleanno: ' + A.eta('1996-09-25', '2026-09-24'));
  deve(A.eta('1996-09-24', '2026-09-24') === 30, 'il giorno del compleanno: ' + A.eta('1996-09-24', '2026-09-24'));
  deve(A.eta('1996-09-23', '2026-09-24') === 30, 'il giorno dopo: ' + A.eta('1996-09-23', '2026-09-24'));
});

prova('e «fino a 30» non prende chi ne ha 31', () => {
  const gente = [P({ id: 'a', data_nascita: '1996-09-25' }), P({ id: 'b', data_nascita: '1995-01-01' })];
  const r = A.filtra(gente, { etaA: 30 }, { oggi: '2026-09-24' });
  deve(r.length === 1 && r[0].id === 'a', 'il filtro sull\'età prende ' + r.length + ' persone invece di 1');
});

prova('senza data di nascita non si finisce in una fascia d\'età', () => {
  /* Meglio fuori che dentro per sbaglio: chi non ha la data non si sa quanti
     anni ha, e un'offerta per gli over 60 a un ventenne è una figuraccia. */
  const r = A.filtra([P({ id: 'z', data_nascita: null })], { etaDa: 18, etaA: 99 }, {});
  deve(r.length === 0, 'chi non ha la data di nascita entra lo stesso nella fascia');
});

prova('una data storta non diventa un\'età', () => {
  deve(A.eta('non una data') === null, 'accetta qualcosa che non è una data');
  deve(A.eta('') === null && A.eta(null) === null, 'il vuoto diventa un\'età');
  deve(A.eta('1850-01-01', '2026-09-24') === null, 'un anno impossibile passa: ' + A.eta('1850-01-01', '2026-09-24'));
});

/* ── 3. falso e «non lo sappiamo» ───────────────────────────────────────── */

prova('falso e non detto restano due cose diverse', () => {
  deve(A.tri(true) === true && A.tri(false) === false, 'i due valori veri si perdono');
  deve(A.tri(null) === null && A.tri(undefined) === null, '«non detto» diventa falso: ' + A.tri(null));
});

prova('chi non ha la casella compilata non entra fra i «non sposati»', () => {
  /* È il caso vero: la casella è falsa su 2.533 anagrafiche su 2.536 perché
     nessuno l'ha mai toccata. Filtrare «non sposati» si porterebbe dietro
     tutto il portafoglio e sembrerebbe una segmentazione. */
  const gente = [P({ id: 'a', sposato: true }), P({ id: 'b', sposato: false }), P({ id: 'c', sposato: null })];
  const r = A.filtra(gente, { sposato: false }, {});
  deve(r.length === 1 && r[0].id === 'b', 'i «non sposati» sono ' + r.length + ': è entrato anche chi non l\'ha mai dichiarato');
});

/* ── 4. i campi vuoti si dichiarano ─────────────────────────────────────── */

prova('la copertura dice quanto è pieno ogni campo', () => {
  const c = A.copertura(GENTE);
  const email = c.find(x => x.campo === 'email');
  deve(email.compilati === 2 && email.totale === 4, 'la copertura dell\'email non torna: ' + JSON.stringify(email));
  const com = c.find(x => x.campo === 'comune');
  deve(com.quota === 1, 'il comune risulta pieno al ' + (com.quota * 100) + '%');
});

prova('e marca come inutilizzabile un filtro che non discrimina', () => {
  /* Sotto il 10% un filtro non seleziona: prende il rumore. È il caso vero
     della professione, compilata su 1 anagrafica su 2.536. */
  const molti = [];
  for (let i = 0; i < 20; i++) molti.push(P({ id: 's' + i }));
  molti[0].professione = 'medico';
  const c = A.copertura(molti);
  const prof = c.find(x => x.campo === 'professione');
  deve(prof.inutilizzabile === true, 'un campo compilato su 20 non risulta inutilizzabile');
  const nasc = c.find(x => x.campo === 'data_nascita');
  deve(nasc.inutilizzabile === false, 'un campo pieno risulta inutilizzabile');
});

/* ── 5. i filtri ────────────────────────────────────────────────────────── */

prova('il comune si confronta senza badare a maiuscole e spazi', () => {
  const r = A.filtra(GENTE, { comuni: ['TRAPANI'] }, {});
  deve(r.length === 2, 'per Trapani escono ' + r.length + ' persone invece di 2: «trapani» minuscolo non si riconosce');
});

prova('e la residenza dichiarata dal cliente batte quella anagrafica', () => {
  /* È quella che lui riconosce come casa sua, ed è quella giusta per una
     campagna locale. */
  const g = [P({ id: 'a', comune: 'Trapani', res_dich_comune: 'Paceco' })];
  deve(A.filtra(g, { comuni: ['Paceco'] }, {}).length === 1, 'la residenza dichiarata viene ignorata');
  deve(A.filtra(g, { comuni: ['Trapani'] }, {}).length === 0, 'si usa ancora il comune anagrafico');
});

prova('le note si cercano dentro il testo', () => {
  deve(A.filtra(GENTE, { testoNote: 'gennaio' }, {}).length === 1, 'la ricerca nelle note non trova');
  deve(A.filtra(GENTE, { conNote: true }, {}).length === 1, 'il filtro «ha delle note» non funziona');
});

prova('il tipo di polizza passa dal portafoglio, non dall\'anagrafica', () => {
  const polizze = { '1': [{ modulo: 'auto' }], '2': [{ modulo: 'casa' }, { modulo: 'auto' }], '3': [{ modulo: 'casa' }] };
  const r = A.filtra(GENTE, { rami: ['auto'] }, { polizzePerCliente: polizze });
  deve(r.length === 2, 'per il ramo auto escono ' + r.length + ' persone invece di 2');
  deve(!r.some(x => x.id === '4'), 'è entrato chi non ha nessuna polizza');
});

prova('i filtri si sommano, non si sostituiscono', () => {
  const r = A.filtra(GENTE, { comuni: ['Trapani'], etaDa: 40 }, { oggi: '2026-09-24' });
  deve(r.length === 1 && r[0].id === '3', 'i due filtri insieme danno ' + r.length + ' persone invece di 1');
});

prova('senza filtri esce tutto il portafoglio, non niente', () => {
  deve(A.filtra(GENTE, {}, {}).length === 4, 'un filtro vuoto azzera l\'elenco');
});

/* ── 6. i recapiti e il CSV ─────────────────────────────────────────────── */

prova('si sa in anticipo quanti si riescono davvero a raggiungere', () => {
  /* Una lista di mille nomi con sei email non è una lista da mille, e va
     saputo prima di impostare la campagna. */
  const r = A.recapiti(GENTE);
  deve(r.email === 2 && r.cellulare === 2, 'i recapiti non tornano: ' + JSON.stringify(r));
  deve(r.senzaRecapito === 1, 'chi non ha né email né cellulare non viene contato');
});

prova('un nominativo col punto e virgola dentro non spacca il foglio', () => {
  const g = [P({ id: 'a', nominativo: 'ROSSI MARIO; SRL', email: 'x@y.it' })];
  const righe = A.csv(g, '2026-09-24').split('\r\n');
  deve(righe.length === 2, 'il CSV ha ' + righe.length + ' righe invece di 2: il punto e virgola ha spezzato la riga');
  deve(righe[1].indexOf('"ROSSI MARIO; SRL"') >= 0, 'il nominativo non è protetto dalle virgolette');
});

prova('e le virgolette dentro un campo si raddoppiano', () => {
  const g = [P({ id: 'a', nominativo: 'DITTA "IL SOLE"' })];
  deve(A.csv(g).indexOf('""IL SOLE""') >= 0, 'le virgolette interne non vengono raddoppiate: Excel legge male la riga');
});

prova('il foglio non si porta dietro codici fiscali e note', () => {
  /* Un Excel che gira per l'ufficio con dentro i dati che non servono è un
     dato personale in più in giro per niente. */
  const intest = A.COLONNE.map(c => c.e).join(' ').toLowerCase();
  deve(intest.indexOf('fiscale') < 0 && intest.indexOf('note') < 0,
    'l\'esportazione porta fuori dati che non servono: ' + intest);
  deve(intest.indexOf('consenso') >= 0, 'il foglio non dice chi ha dato il consenso e chi no');
});

/* ── 7. il collegamento con la schermata ────────────────────────────────────
   Le prove qui sopra provano il motore. Un motore perfetto dentro una pagina
   che non lo chiama non serve a niente: il 22 settembre il tasto della
   candidatura era corretto nel codice e morto nella pagina. Queste sette
   prove leggono `index.html` e guardano che la voce esista, che si accenda,
   che la pagina ci sia e che i tasti chiamino le funzioni giuste. */
import fs from 'fs';
const PAGINA = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

prova('il motore viene caricato dalla pagina', () => {
  deve(PAGINA.indexOf('tariffe/motore/crm-analisi.js') >= 0,
    'index.html non carica crm-analisi.js: tutte le funzioni ca* troverebbero window.CrmAnalisi vuoto');
});

prova('la voce di menu esiste e porta alla pagina giusta', () => {
  deve(/id="nav-crm"[^>]*onclick="showPage\('crm-analisi'\)"/.test(PAGINA),
    'la voce nav-crm non c\'è o non apre la pagina crm-analisi');
});

prova('la voce di menu si accende', () => {
  /* Nasce con display:none come tutte. Se nessuno la accende, resta una voce
     che esiste nel codice e che nessuno vede mai. */
  deve(/getElementById\('nav-crm'\)[\s\S]{0,90}?style\.display\s*=\s*'flex'/.test(PAGINA),
    'nav-crm non viene mai reso visibile');
});

prova('la pagina esiste', () => {
  deve(PAGINA.indexOf('id="page-crm-analisi"') >= 0, 'manca il contenitore page-crm-analisi');
  deve(PAGINA.indexOf('id="ca-filtri"') >= 0 && PAGINA.indexOf('id="ca-esito"') >= 0,
    'mancano i due riquadri della pagina (filtri ed esito)');
});

prova('aprendo la pagina il portafoglio si carica', () => {
  deve(/if \(name === 'crm-analisi'\) caCarica\(\);/.test(PAGINA),
    'showPage non chiama caCarica: la pagina si aprirebbe vuota e senza filtri');
});

prova('ogni filtro che Francesco ha chiesto ha il suo campo', () => {
  const chiesti = {
    'comune di residenza': 'ca-comune', 'collaboratore': 'ca-collab',
    'tipo di polizze': 'ca-ramo', 'età da': 'ca-eta-da', 'età a': 'ca-eta-a',
    'se hanno famiglia': 'ca-figli', 'tipo di lavoro': 'ca-prof',
    'note in anagrafica': 'ca-note', 'gruppo': 'ca-gruppo',
  };
  const mancanti = Object.keys(chiesti).filter(k => PAGINA.indexOf("id=\"" + chiesti[k] + "\"") < 0
    && PAGINA.indexOf("'" + chiesti[k] + "'") < 0);
  deve(mancanti.length === 0, 'filtri chiesti e non presenti: ' + mancanti.join(', '));
});

prova('i tre tasti in fondo chiamano le tre strade', () => {
  ['caEsportaExcel()', 'caEsportaPdf()', 'caCampagna()'].forEach(f => {
    deve(PAGINA.indexOf('onclick="' + f + '"') >= 0, 'nessun tasto chiama ' + f);
  });
});

prova('la campagna passa dal filtro del consenso, l\'esportazione no', () => {
  /* È la regola n.1 vista dal lato della pagina: se un domani qualcuno facesse
     partire la campagna dalla stessa lista che esporta, questa prova diventa
     rossa. */
  const i = PAGINA.indexOf('function caCampagna(');
  deve(i > 0, 'caCampagna non esiste');
  const corpo = PAGINA.slice(i, i + 1400);
  deve(corpo.indexOf('perCampagna(') >= 0,
    'caCampagna non passa da perCampagna(): manderebbe anche a chi non ha dato il consenso');

  const j = PAGINA.indexOf('function caEsportaExcel(');
  deve(j > 0, 'caEsportaExcel non esiste');
  const exp = PAGINA.slice(j, j + 700);
  deve(exp.indexOf('perCampagna(') < 0,
    'l\'esportazione passa dal filtro della campagna: il foglio per l\'ufficio perderebbe dei clienti');
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' CRM · Analisi: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
