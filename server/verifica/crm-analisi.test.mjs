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
    /* Aggiunti il 25/09/2026: sono quelli che mancavano alle domande del
       mandato — «clienti HDI», «Prima in scadenza fra 30 giorni», «auto SENZA
       casa», per provincia, per fascia di premio. */
    'compagnia': 'ca-compagnia', 'provincia': 'ca-prov',
    'ma NON ha (l\'assenza)': 'ca-senza-ramo', 'scadenza': 'ca-scadenza',
    'premio da': 'ca-premio-da', 'premio a': 'ca-premio-a',
    'ha la garanzia': 'ca-garanzia', 'ma NON la garanzia': 'ca-senza-garanzia',
    'ha note in anagrafica': 'ca-con-note',
    /* Aggiunti il 26/09/2026, richiesta di Francesco: trovare i clienti persi,
       dividerli per date, e distinguere chi non ha rinnovato (QR) da chi ha
       disdetto a metà. E, con loro, i prospect: chi non ha mai comprato niente
       non è un cliente perso. */
    'stato del cliente (perso / prospect)': 'ca-stato',
    'come l\'abbiamo perso (QR o disdetta)': 'ca-come-perso',
    'perso dal': 'ca-perso-dal', 'perso al': 'ca-perso-al',
  };
  /* IL CAMPO DEVE ESISTERE SULLO SCHERMO, e si controlla solo la forma
     `id="ca-x"`. Prima bastava che il nome comparisse da qualche parte, anche
     solo nel codice che LEGGE quel campo: così cancellare il menu della
     compagnia dalla schermata lasciava la prova verde, perché `g('ca-compagnia')`
     era ancora lì a nominarlo. L'ha trovato una controprova, non una rilettura. */
  const mancanti = Object.keys(chiesti).filter(k => PAGINA.indexOf('id="' + chiesti[k] + '"') < 0);
  deve(mancanti.length === 0, 'filtri chiesti e non disegnati sullo schermo: ' + mancanti.join(', '));
});

prova('e ogni campo a schermo è davvero collegato alla ricerca', () => {
  /* Un campo che si vede, si compila e non arriva al filtro è PEGGIO di un
     campo che non c'è: chi lo usa crede di aver ristretto la ricerca e legge
     un elenco più largo di quello che ha chiesto. */
  const i = PAGINA.indexOf('const righe = M.filtra(');
  deve(i > 0, 'non trovo la chiamata al filtro');
  const chiamata = PAGINA.slice(PAGINA.lastIndexOf('async function caCerca', i), PAGINA.indexOf('}, {', i));
  /* Solo i CAMPI, riconosciuti dal tag e non da un elenco di eccezioni: un
     `<div>` è un contenitore e un `<datalist>` è un elenco di suggerimenti —
     nessuno dei due si compila. Una lista di nomi da saltare, invece, cresce
     ogni volta che si aggiunge qualcosa e prima o poi ci finisce dentro un
     campo vero, che da quel momento non è più controllato da nessuno. */
  const disegnati = [...new Set(
    [...PAGINA.matchAll(/<(input|select|textarea)\b[^>]*\bid="(ca-[a-z-]+)"/g)].map((m) => m[2]))]
  const scollegati = disegnati.filter((id) => chiamata.indexOf("'" + id + "'") < 0);
  deve(scollegati.length === 0, 'campi disegnati e mai letti dalla ricerca: ' + scollegati.join(', '));
  return disegnati.length + ' campi, tutti collegati';
});

prova('i menu si costruiscono sui nomi unificati, non su quelli grezzi', () => {
  /* Senza questo, il menu «Ha la polizza» mostra `rca` e `auto` come due voci
     diverse — sono la stessa cosa scritta da due compagnie — e chi sceglie una
     delle due ottiene metà delle polizze senza saperlo. Stessa storia per
     «HDI» e «HDI Assicurazioni». */
  const i = PAGINA.indexOf('function caDisegnaFiltri');
  deve(i > 0, 'non trovo la funzione che disegna i filtri');
  const corpo = PAGINA.slice(i, PAGINA.indexOf('function caPulisci', i));
  deve(/ramoCanonico/.test(corpo), 'il menu dei rami non passa dal vocabolario');
  deve(/compagniaCanonica/.test(corpo), 'il menu delle compagnie non passa dal vocabolario');
  /* E non deve restare la vecchia strada accanto alla nuova: due menu
     costruiti in due modi diversi sono peggio di uno costruito male. */
  deve(!/map\(p => \(p\.modulo \|\| p\.prodotto \|\| ''\)\.trim\(\)\)/.test(corpo),
    'c\'è ancora un menu costruito sui nomi grezzi');
});

prova('la pagina legge le colonne che i filtri nuovi richiedono', () => {
  /* Compagnia, scadenza e premio non si possono filtrare se non si leggono.
     Fino al 25/09/2026 la pagina chiedeva solo `modulo` e `prodotto`: i
     filtri sarebbero stati verdi restituendo sempre zero. */
  const i = PAGINA.indexOf("db.from('quote_polizze').select(");
  deve(i > 0, 'non trovo la lettura delle polizze');
  const sel = PAGINA.slice(i, PAGINA.indexOf(')', i + 40));
  for (const c of ['compagnia', 'data_scadenza', 'premio_annuo', 'modulo', 'prodotto']) {
    deve(sel.indexOf(c) >= 0, 'la pagina non legge «' + c + '»: ' + sel);
  }
});

prova('e la ricerca sa che giorno è, altrimenti la scadenza tace', () => {
  const i = PAGINA.indexOf('const righe = M.filtra(');
  const blocco = PAGINA.slice(i, PAGINA.indexOf('CA_RISULTATO', i));
  deve(/oggi:/.test(blocco),
    'il filtro sulla scadenza non riceve la data di oggi: restituirebbe sempre zero');
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

/* ── LE RICERCHE SUL PORTAFOGLIO ─────────────────────────────────────────────
   Sono le domande che Francesco ha scritto nel mandato, e valgono più di
   tutte le altre perché è lì che sta la vendita:

     «auto ma non casa» · «HDI con RCA senza infortuni» · «Prima in scadenza
     nei prossimi 30 giorni» · «fra 30 e 50 anni per il fondo pensione»

   Fino al 25/09/2026 il motore sapeva chiedere solo la PRESENZA di un ramo:
   «ha almeno una polizza auto». L'ASSENZA — che è la metà che serve — non
   esisteva, e nemmeno compagnia, provincia, scadenza e premio.

   Un filtro sbagliato qui non dà errore: manda l'offerta alla persona
   sbagliata, e non se ne accorge nessuno. */

const PORTAFOGLIO = {
  '1': [{ modulo: 'auto', compagnia: 'HDI', data_scadenza: '2026-10-10', premio_annuo: 600 }],
  '2': [{ modulo: 'auto', compagnia: 'HDI', data_scadenza: '2027-05-01', premio_annuo: 600 },
        { modulo: 'casa', compagnia: 'HDI', data_scadenza: '2027-05-01', premio_annuo: 300 }],
  '3': [{ modulo: 'casa', compagnia: 'Prima', data_scadenza: '2026-10-05', premio_annuo: 200 }],
  /* il 4 non ha nessuna polizza, ed è il caso che fa sbagliare l'assenza */
};
const OGGI = { polizzePerCliente: PORTAFOGLIO, oggi: '2026-09-25' };
const chi = (f) => A.filtra(GENTE, f, OGGI).map((x) => x.id).sort().join(',');

prova('«auto ma non casa» — l\'assenza, che è dove sta la vendita', () => {
  deve(chi({ rami: ['auto'], senzaRami: ['casa'] }) === '1',
    'dovrebbe uscire solo chi ha l\'auto e NON la casa, esce: ' + chi({ rami: ['auto'], senzaRami: ['casa'] }));
});

prova('e chi non ha NESSUNA polizza non sparisce da «senza casa»', () => {
  /* È vero che non ha la casa: la domanda è quella, e la risposta è sì. Se
     non lo si vuole si aggiunge `rami`. Il motore risponde alla domanda che
     gli è stata fatta, non a un'altra che pareva sottintesa. */
  deve(chi({ senzaRami: ['casa'] }) === '1,4',
    'chi non ha polizze è stato escluso da «senza casa»: ' + chi({ senzaRami: ['casa'] }));
});

prova('«clienti HDI» e «clienti Prima» si distinguono', () => {
  deve(chi({ compagnie: ['hdi'] }) === '1,2', 'HDI: ' + chi({ compagnie: ['hdi'] }));
  deve(chi({ compagnie: ['prima'] }) === '3', 'Prima: ' + chi({ compagnie: ['prima'] }));
  /* Maiuscole e minuscole non devono contare: nel portafoglio c'è «HDI». */
  deve(chi({ compagnie: ['HDI'] }) === '1,2', 'la compagnia scritta in maiuscolo non viene riconosciuta');
});

prova('«Prima in scadenza nei prossimi 30 giorni»', () => {
  deve(chi({ compagnie: ['prima'], scadenzaEntroGiorni: 30 }) === '3',
    chi({ compagnie: ['prima'], scadenzaEntroGiorni: 30 }));
});

prova('la finestra della scadenza è una finestra, non un «entro sempre»', () => {
  /* Il 2 scade il 01/05/2027: dentro 30 giorni no, dentro 400 sì. Senza
     questa prova, un filtro che ignora la data resterebbe verde. */
  deve(chi({ scadenzaEntroGiorni: 30 }) === '1,3', '30 giorni: ' + chi({ scadenzaEntroGiorni: 30 }));
  deve(chi({ scadenzaEntroGiorni: 400 }) === '1,2,3', '400 giorni: ' + chi({ scadenzaEntroGiorni: 400 }));
  deve(chi({ scadenzaEntroGiorni: 0 }) === '', 'zero giorni non è «tutte»: ' + chi({ scadenzaEntroGiorni: 0 }));
});

prova('e una polizza già scaduta non è «in scadenza»', () => {
  const passato = { polizzePerCliente: { '1': [{ modulo: 'auto', data_scadenza: '2026-09-01' }] }, oggi: '2026-09-25' };
  const r = A.filtra(GENTE, { scadenzaEntroGiorni: 30 }, passato);
  deve(r.length === 0, 'una polizza scaduta il 01/09 è stata contata fra quelle in scadenza');
  const s = A.filtra(GENTE, { scadute: true }, passato);
  deve(s.length === 1 && s[0].id === '1', 'il filtro delle scadute non la trova: ' + s.length);
});

prova('senza una data di riferimento il filtro sulla scadenza tace', () => {
  /* Meglio zero righe che righe sbagliate: una finestra calcolata su una data
     che non c'è darebbe un elenco plausibile e falso. */
  const r = A.filtra(GENTE, { scadenzaEntroGiorni: 30 }, { polizzePerCliente: PORTAFOGLIO });
  deve(r.length === 0, 'ha calcolato una finestra senza sapere che giorno è: ' + r.length);
});

prova('«fra 30 e 50 anni» per il fondo pensione', () => {
  /* Al 25/09/2026: ALFA 36, BETA 51, GAMMA 65, DELTA 24. */
  deve(chi({ etaDa: 30, etaA: 50 }) === '1', chi({ etaDa: 30, etaA: 50 }));
});

prova('la provincia filtra, e la residenza dichiarata batte l\'anagrafica', () => {
  deve(chi({ province: ['tp'] }) === '1,2,3,4', 'tutti sono in TP: ' + chi({ province: ['tp'] }));
  const gente = GENTE.map((g) => (g.id === '1' ? { ...g, res_dich_provincia: 'PA' } : g));
  const r = A.filtra(gente, { province: ['pa'] }, OGGI);
  deve(r.length === 1 && r[0].id === '1',
    'la provincia dichiarata dal cliente non ha battuto quella anagrafica');
});

prova('il premio è la somma delle polizze del cliente', () => {
  deve(chi({ premioDa: 800 }) === '2', 'il 2 ha 600+300=900: ' + chi({ premioDa: 800 }));
  deve(chi({ premioA: 500 }) === '3', 'il 3 ha 200: ' + chi({ premioA: 500 }));
});

prova('e chi non dichiara il premio non finisce nella fascia più bassa', () => {
  /* Il verso pericoloso: contare «nessun premio» come zero metterebbe mezzo
     portafoglio nella fascia «fino a 500 €», e l'offerta andrebbe a chi
     magari paga tremila euro l'anno. */
  const senzaPremio = { polizzePerCliente: { '1': [{ modulo: 'auto' }] }, oggi: '2026-09-25' };
  const r = A.filtra(GENTE, { premioA: 500 }, senzaPremio);
  deve(r.length === 0, 'un cliente senza premio dichiarato è entrato nella fascia bassa');
});

prova('i filtri si compongono: «HDI, auto senza casa, in scadenza»', () => {
  /* La domanda vera di una campagna non è mai una sola condizione. */
  deve(chi({ compagnie: ['hdi'], rami: ['auto'], senzaRami: ['casa'], scadenzaEntroGiorni: 30 }) === '1',
    chi({ compagnie: ['hdi'], rami: ['auto'], senzaRami: ['casa'], scadenzaEntroGiorni: 30 }));
});

prova('nessun filtro vuol dire tutti, non nessuno', () => {
  deve(chi({}) === '1,2,3,4', 'un filtro vuoto ha tolto qualcuno: ' + chi({}));
  deve(chi({ rami: [], senzaRami: [], compagnie: [], province: [] }) === '1,2,3,4',
    'elenchi vuoti si comportano come un filtro attivo');
});

prova('giorniDopo dà lo stesso risultato in qualunque fuso orario', () => {
  /* Questa prova gira in un contenitore in UTC, dove l'ora legale non esiste:
     un calcolo fatto con l'ora LOCALE sembrerebbe giusto qui e sbaglierebbe
     di un giorno a Roma, la domenica in cui l'ora cambia. Una finestra
     «entro 30 giorni» che ne prende 29 lascia fuori una polizza in scadenza.

     Quindi non ci si fida dell'orologio di questa macchina: lo stesso conto
     si rifà in tre fusi diversi, e devono dire tutti la stessa cosa. */
  const { execFileSync } = require('child_process');
  const src = new URL('../../tariffe/motore/crm-analisi.js', import.meta.url).pathname;
  const prog = 'const M=require(' + JSON.stringify(src) + ');'
    + 'console.log([M.giorniDopo("2026-10-20",20),M.giorniDopo("2026-03-25",10),'
    + 'M.giorniDopo("2026-12-31",1),M.giorniDopo("2026-02-27",2)].join("|"))';
  const risposte = ['UTC', 'Europe/Rome', 'Pacific/Auckland'].map((tz) =>
    execFileSync(process.execPath, ['-e', prog], { encoding: 'utf8', env: { ...process.env, TZ: tz } }).trim());
  deve(new Set(risposte).size === 1,
    'il conto cambia col fuso orario: ' + risposte.map((r, i) => ['UTC', 'Roma', 'Auckland'][i] + '→' + r).join('  '));
  deve(risposte[0] === '2026-11-09|2026-04-04|2027-01-01|2026-03-01',
    'i giorni non tornano: ' + risposte[0]);
  return risposte[0].split('|')[0] + ' anche a Roma e ad Auckland';
});

prova('giorniDopo non sbaglia il giorno per colpa dell\'ora', () => {
  /* A mezzanotte un cambio di ora legale sposta il risultato di un giorno, e
     una finestra «entro 30» che ne prende 29 lascia fuori una polizza in
     scadenza — cioè un cliente che nessuno richiama. */
  deve(A.giorniDopo('2026-09-25', 30) === '2026-10-25', A.giorniDopo('2026-09-25', 30));
  deve(A.giorniDopo('2026-10-20', 20) === '2026-11-09', A.giorniDopo('2026-10-20', 20));  // oltre il cambio d'ora
  deve(A.giorniDopo('2026-02-27', 2) === '2026-03-01', A.giorniDopo('2026-02-27', 2));    // fine mese
  deve(A.giorniDopo('2026-12-31', 1) === '2027-01-01', A.giorniDopo('2026-12-31', 1));    // fine anno
});


/* ── IL VOCABOLARIO DELLE COMPAGNIE E DEI RAMI ───────────────────────────────
   Misurato sul portafoglio vero il 25/09/2026: Prima scrive `rca`, HDI scrive
   `auto`, e sono la stessa cosa. La compagnia compare come «HDI» e come «HDI
   Assicurazioni». Finché non si mettono d'accordo, ogni filtro dà una
   risposta sbagliata SENZA DIRLO:

     · «clienti HDI» ne trovava 13 invece di 15
     · «polizza auto» ne trovava 15 invece di 4.005
     · «senza polizza casa» non si poteva nemmeno chiedere: il ramo `casa` non
       esiste, quello che c'è si chiama `beni` */

prova('«rca» e «auto» sono lo stesso ramo', () => {
  deve(A.ramoCanonico('rca') === A.ramoCanonico('auto'), 
    'rca=' + A.ramoCanonico('rca') + ' auto=' + A.ramoCanonico('auto'));
  deve(A.stessoRamo('RCA', ' auto ') === true, 'maiuscole e spazi non devono contare');
  deve(A.stessoRamo('rca', 'beni') === false, 'auto e casa sono stati accorpati');
});

prova('«HDI» e «HDI Assicurazioni» sono la stessa compagnia', () => {
  deve(A.stessaCompagnia('HDI', 'HDI Assicurazioni') === true, 'restano due aziende diverse');
  deve(A.stessaCompagnia('HDI', 'Prima') === false, 'HDI e Prima sono state accorpate');
  deve(A.compagniaCanonica('PRIMA') === 'Prima', A.compagniaCanonica('PRIMA'));
});

prova('una compagnia che il vocabolario non conosce resta com\'è scritta', () => {
  /* Il verso pericoloso sarebbe farne un mucchio «altro»: due compagnie nuove
     e diverse combacerebbero, e una campagna andrebbe ai clienti di un\'altra. */
  deve(A.compagniaCanonica('Zurigo Vita') === 'Zurigo Vita', A.compagniaCanonica('Zurigo Vita'));
  deve(A.stessaCompagnia('Zurigo Vita', 'Generali') === false,
    'due compagnie sconosciute sono state confuse fra loro');
});

prova('e il filtro usa il vocabolario, non il confronto esatto', () => {
  /* È la prova che conta: le due scritture devono uscire INSIEME. */
  const pz = {
    '1': [{ modulo: 'rca',  compagnia: 'PRIMA' }],
    '2': [{ modulo: 'auto', compagnia: 'HDI' }],
    '3': [{ modulo: 'beni', compagnia: 'HDI Assicurazioni' }],
  };
  const q = (f) => A.filtra(GENTE, f, { polizzePerCliente: pz, oggi: '2026-09-25' }).map(x => x.id).sort().join(',');
  deve(q({ rami: ['auto'] }) === '1,2', 'chiedendo «auto» non escono le `rca`: ' + q({ rami: ['auto'] }));
  deve(q({ rami: ['rca'] }) === '1,2', 'e neanche il contrario: ' + q({ rami: ['rca'] }));
  deve(q({ compagnie: ['HDI'] }) === '2,3', '«HDI» non prende «HDI Assicurazioni»: ' + q({ compagnie: ['HDI'] }));
  deve(q({ senzaRami: ['auto'] }) === '3,4', 'l\'assenza non usa il vocabolario: ' + q({ senzaRami: ['auto'] }));
});

/* ── LE GARANZIE ─────────────────────────────────────────────────────────────
   «Cliente senza una determinata garanzia nella polizza auto.» Le risolve il
   database (5 MB di jsonb non si portano nel browser a ogni apertura) e qui
   arrivano come elenchi di clienti. */

prova('la garanzia tiene chi ce l\'ha e scarta chi non ce l\'ha', () => {
  const con = new Set(['1', '2']);
  const q = (extra) => A.filtra(GENTE, {}, { polizzePerCliente: {}, ...extra }).map(x => x.id).sort().join(',');
  deve(q({ conGaranzia: con }) === '1,2', 'con garanzia: ' + q({ conGaranzia: con }));
  deve(q({ senzaGaranzia: con }) === '3,4', 'senza garanzia: ' + q({ senzaGaranzia: con }));
});

prova('un elenco vuoto di garanzia non è «nessun filtro»', () => {
  /* Se la ricerca nel database non trova nessuno, «chi ha quella garanzia»
     deve essere NESSUNO — non «tutti». È la differenza fra una campagna a
     zero persone e una a tutto il portafoglio. */
  const q = (extra) => A.filtra(GENTE, {}, { polizzePerCliente: {}, ...extra }).map(x => x.id).join(',');
  deve(q({ conGaranzia: new Set() }) === '', 'un elenco vuoto ha lasciato passare tutti');
  deve(q({ senzaGaranzia: new Set() }) === '1,2,3,4', 'un «senza» vuoto ha tolto qualcuno');
  deve(q({ conGaranzia: null }) === '1,2,3,4', 'null deve voler dire «filtro non chiesto»');
});

prova('«ha note in anagrafica» trova chi ha scritto qualcosa', () => {
  /* Solo DELTA ha una nota nel campione. Non è la ricerca nel testo: è
     «questo cliente ha una nota, qualunque essa sia». */
  const q = (f) => A.filtra(GENTE, f, { polizzePerCliente: {} }).map(x => x.id).join(',');
  deve(q({ conNote: true }) === '4', 'con note: ' + q({ conNote: true }));
  deve(q({}) === '1,2,3,4', 'senza il filtro devono esserci tutti');
});

/* ── IL FILTRO PER GRUPPO CHIEDE E LEGGE LA STESSA COLONNA ───────────────────
   Il 25/09/2026 la pagina chiedeva `cliente_id` a una tabella che ha
   `anagrafica_id`. PostgREST non lancia: torna un errore e `data` nullo,
   quindi l'insieme dei membri nasceva VUOTO e la ricerca per gruppo non
   trovava MAI nessuno. Nessun errore a schermo, solo un `console.warn`.

   La prova `colonne-che-esistono` adesso copre metà del problema: che la
   colonna chiesta esista. Resta l'altra metà, ed è quella che rifarebbe
   nascere lo stesso difetto — chiedere la colonna giusta e poi leggere un
   campo diverso dalla riga che torna. Qui si controlla che siano LA STESSA. */

prova('la ricerca per gruppo legge lo stesso campo che ha chiesto', () => {
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = src.indexOf("db.from('quote_gruppi_membri')");
  deve(i > 0, 'non trovo più la lettura dei membri del gruppo in index.html');
  /* Il confine è un punto preciso del codice, non un numero di caratteri:
     contando i caratteri o si resta corti (e la prova fallisce su codice
     giusto, com'è appena successo) o si sfora nella funzione dopo e si legge
     tutt'altro — è già capitato su un'altra prova di questo repo. */
  const fine = src.indexOf('M.filtra(', i);
  deve(fine > i, 'non trovo la chiamata al filtro dopo la lettura dei membri');
  const blocco = src.slice(i, fine);
  const chiesta = /\.select\('([a-z_]+)'\)/.exec(blocco);
  deve(chiesta, 'non riesco a leggere quale colonna viene chiesta: ' + blocco.slice(0, 80));
  const letta = new RegExp('x\\.([a-z_]+)').exec(blocco.slice(blocco.indexOf('new Set')));
  deve(letta, 'non riesco a leggere quale campo viene usato per costruire l\'insieme');
  deve(chiesta[1] === letta[1],
    'chiede «' + chiesta[1] + '» e legge «' + letta[1] + '»: l\'insieme dei membri resterebbe vuoto');
  deve(chiesta[1] === 'anagrafica_id',
    'la colonna di quote_gruppi_membri è `anagrafica_id`, qui si chiede «' + chiesta[1] + '»');
});

prova('e se la lettura fallisce lo dice, invece di far sparire i clienti', () => {
  /* Le due alternative erano bugie tutte e due: un insieme vuoto fa sparire
     tutti i clienti del gruppo, un `null` fa finta che il filtro non sia stato
     chiesto e li mostra tutti. Su una schermata che serve a scegliere chi
     chiamare, un numero sbagliato in silenzio è la cosa peggiore. */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = src.indexOf("db.from('quote_gruppi_membri')");
  const fine2 = src.indexOf('M.filtra(', i);
  const blocco = src.slice(i, fine2 > i ? fine2 : i + 700);
  deve(/\berror\b/.test(blocco), 'l\'errore della lettura non viene nemmeno raccolto');
  deve(/if \(error\)/.test(blocco), 'l\'errore viene raccolto e non guardato');
  /* E non basta scriverlo in console: deve fermarsi, o il conto esce lo stesso. */
  deve(/return;/.test(blocco.slice(blocco.indexOf('if (error)'))),
    'in caso di errore la ricerca prosegue e mostra un numero che non è quello vero');
});

/* ══ I CLIENTI PERSI, LE DATE, E IL CRITERIO «QR» ═════════════════════════════
   26/09/2026. «I clienti persi sarebbe sempre buono che si potessero trovare
   con un filtro nella parte crm e analisi, e che si potessero dividere per
   determinate date (il criterio deve essere che potrei ritrovare i clienti
   "persi" che non hanno rinnovato una polizza al rinnovo, ovvero QR)».

   Cinque clienti fatti su misura per i casi che si confondono:
     5 · attivo, una polizza in corso
     6 · perso alla scadenza naturale, a giugno       → «non ha rinnovato»
     7 · perso per annullamento, a marzo              → ha disdetto a metà
     8 · perso con una QR non incassata, ad agosto    → «non ha rinnovato»,
         detto dalla compagnia
     9 · nessuna polizza, mai                         → prospect

   L'errore che queste prove impediscono non dà nessun segnale: la lista esce,
   ha dei nomi dentro, e sono i nomi sbagliati. */
const PERSI = {
  '5': [{ id: 'p5', modulo: 'auto', data_scadenza: '2027-03-01', stato_pagamento: 'pagato' }],
  '6': [{ id: 'p6', modulo: 'auto', data_scadenza: '2026-06-15', stato_pagamento: 'pagato' }],
  '7': [{ id: 'p7', modulo: 'auto', data_scadenza: '2026-12-31', stato_pagamento: 'annullata',
          dati: { ssf: { data_annullamento: '2026-03-20', motivo_storno: 'VENDITA' } } }],
  '8': [{ id: 'p8', modulo: 'auto', data_scadenza: '2026-08-10', stato_pagamento: 'pagato' }],
};
const TITOLI_PERSI = { p8: [{ sigla_tipo: 'QR', stato: 'aperto' }] };
const GENTE_PERSI = [
  P({ id: '5', nominativo: 'EPSILON ELIO' }), P({ id: '6', nominativo: 'ZETA ZORA' }),
  P({ id: '7', nominativo: 'ETA ENZO' }),     P({ id: '8', nominativo: 'THETA TINA' }),
  P({ id: '9', nominativo: 'IOTA IVO' }),
];
const CTX_PERSI = { polizzePerCliente: PERSI, titoliPerPolizza: TITOLI_PERSI, oggi: '2026-09-26' };
const chiPerso = (f) => A.filtra(GENTE_PERSI, f, CTX_PERSI).map((x) => x.id).sort().join(',');

prova('il filtro «persi» prende chi non ha più polizze attive, e solo lui', () => {
  deve(chiPerso({ stato: 'perso' }) === '6,7,8', chiPerso({ stato: 'perso' }));
});

prova('«prospect» non è «perso»: chi non ha mai comprato sta in un\'altra lista', () => {
  /* In archivio sono 58, e finirebbero fra i 564 persi: 58 telefonate a gente
     che non ci ha mai comprato niente, presentate come clienti perduti. */
  deve(chiPerso({ stato: 'prospect' }) === '9', chiPerso({ stato: 'prospect' }));
  deve(chiPerso({ stato: 'perso' }).indexOf('9') < 0, 'il prospect è finito fra i persi');
});

prova('«attivo» prende solo chi ha una polizza che copre adesso', () => {
  deve(chiPerso({ stato: 'attivo' }) === '5', chiPerso({ stato: 'attivo' }));
});

prova('le date dividono i persi per quando li abbiamo perduti', () => {
  deve(chiPerso({ stato: 'perso', persoDal: '2026-06-01', persoAl: '2026-06-30' }) === '6',
    chiPerso({ stato: 'perso', persoDal: '2026-06-01', persoAl: '2026-06-30' }));
  deve(chiPerso({ persoDal: '2026-07-01' }) === '8', chiPerso({ persoDal: '2026-07-01' }));
  deve(chiPerso({ persoAl: '2026-04-30' }) === '7', chiPerso({ persoAl: '2026-04-30' }));
});

prova('per un annullamento vale la data dell\'annullamento, non la scadenza', () => {
  /* Il 7 è annullato il 20/03 e scadrebbe il 31/12: cercandolo per marzo deve
     uscire, cercandolo per dicembre no. Prendere la scadenza vorrebbe dire
     cercare il cliente nove mesi dopo averlo perso. */
  deve(chiPerso({ persoDal: '2026-03-01', persoAl: '2026-03-31' }) === '7', 'per marzo non esce');
  deve(chiPerso({ persoDal: '2026-12-01', persoAl: '2026-12-31' }) === '', 'esce anche a dicembre');
});

prova('le date non trascinano dentro chi è ancora cliente', () => {
  /* «Perso fra gennaio e dicembre» su un cliente attivo non vuol dire niente:
     se passasse, la lista da richiamare si riempirebbe di gente da non
     chiamare — ed è l'errore che non si vede, perché la lista esce. */
  const r = chiPerso({ persoDal: '2026-01-01', persoAl: '2026-12-31' });
  deve(r.indexOf('5') < 0, 'il cliente attivo è finito fra i persi per data: ' + r);
  deve(r.indexOf('9') < 0, 'il prospect è finito fra i persi per data: ' + r);
  deve(r === '6,7,8', r);
});

prova('«non ha rinnovato» prende la scadenza naturale e la QR non incassata', () => {
  deve(chiPerso({ persoAlRinnovo: true }) === '6,8', chiPerso({ persoAlRinnovo: true }));
});

prova('chi ha disdetto a metà annualità NON è un mancato rinnovo', () => {
  /* Sono 53 contro 511 in archivio, e sono due telefonate diverse: uno lo
     richiami con un preventivo, l'altro ha avuto un motivo e prima lo vuoi
     sapere. Se si confondessero, il criterio che Francesco chiama «QR» non
     servirebbe a niente. */
  deve(chiPerso({ persoAlRinnovo: true }).indexOf('7') < 0, 'la disdetta è finita fra i mancati rinnovi');
  deve(chiPerso({ stato: 'perso', persoAlRinnovo: false }) === '7',
    chiPerso({ stato: 'perso', persoAlRinnovo: false }));
});

prova('una QF non incassata non fa un mancato rinnovo', () => {
  /* Il caso che rovinerebbe tutto: se QR e QF si confondessero, ogni rata in
     ritardo diventerebbe un cliente perso al rinnovo. Il 7 ha una QF aperta e
     resta quello che è — una disdetta, non un mancato rinnovo. */
  const ctx = { polizzePerCliente: PERSI, oggi: '2026-09-26',
                titoliPerPolizza: { p7: [{ sigla_tipo: 'QF', stato: 'aperto' }] } };
  const r = A.filtra(GENTE_PERSI, { persoAlRinnovo: true }, ctx).map(x => x.id).sort().join(',');
  deve(r.indexOf('7') < 0, 'una rata scoperta è diventata un mancato rinnovo: ' + r);
});

prova('senza sapere che giorno è, il filtro non risponde «tutti»', () => {
  /* Il verso prudente: una lista completa sarebbe indistinguibile da una
     risposta giusta, e partirebbe una campagna a tutto il portafoglio. */
  const r = A.filtra(GENTE_PERSI, { stato: 'perso' }, { polizzePerCliente: PERSI });
  deve(r.length === 0, 'senza `oggi` ha risposto con ' + r.length + ' clienti');
});

prova('i filtri sullo stato si compongono con gli altri', () => {
  /* Un filtro che funziona solo da solo non serve: «chi ho perso a giugno fra i
     clienti di Trapani» è la domanda vera. */
  const gente = [P({ id: '6', nominativo: 'ZETA ZORA', comune: 'Trapani' }),
                 P({ id: '8', nominativo: 'THETA TINA', comune: 'Erice' })];
  const r = A.filtra(gente, { stato: 'perso', comuni: ['trapani'] }, CTX_PERSI).map(x => x.id);
  deve(r.join(',') === '6', 'composizione col comune: ' + r.join(','));
});

prova('il conteggio «quanti ce l\'hanno compilato» sta solo dove vuol dire qualcosa', () => {
  /* Trovato il 26/09/2026, e c'era da prima. Accanto a «Premio annuo da»
     compariva «1954/2536»: il conteggio del COMUNE, perché quel filtro veniva
     disegnato passando 'comune' come campo di copertura. Quattordici filtri su
     ventitré mostravano un numero che non li riguardava.

     Non è un dettaglio grafico: quel numero esiste per distinguere «non ne
     abbiamo» da «non lo sappiamo», ed è la cosa che si guarda quando una
     ricerca torna zero. Un numero giusto accanto alla domanda sbagliata è
     peggio di nessun numero.

     La regola: il conteggio si passa SOLO per i campi che stanno davvero
     nell'anagrafica — quelli di `CAMPI_COPERTURA`. I filtri che leggono le
     polizze passano un nome che non è in quell'elenco, e il conteggio non
     compare. */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const veri = A.CAMPI_COPERTURA.map(c => c.k);
  /* Per ogni `caCampo(etichetta, campo, '<… id="ca-x"')`: se `campo` è un campo
     vero di copertura, il filtro deve leggere QUEL campo dell'anagrafica. */
  const LECITI = {
    'ca-comune': 'comune', 'ca-eta-da': 'data_nascita', 'ca-eta-a': 'data_nascita',
    'ca-prof': 'professione', 'ca-collab': 'intermediario_id',
    'ca-sposato': 'sposato', 'ca-figli': 'sposato',
    'ca-note': 'note', 'ca-con-note': 'note',
  };
  const re = /caCampo\((?:'(?:[^'\\]|\\.)*')\s*,\s*'([a-z_]+)'\s*,\s*'<(?:select|input) id="(ca-[a-z-]+)"/g;
  const sbagliati = [];
  let m, visti = 0;
  while ((m = re.exec(src))) {
    visti++;
    const campo = m[1], id = m[2];
    if (veri.indexOf(campo) < 0) continue;            // nome non di copertura: nessun numero, a posto
    if (LECITI[id] !== campo) sbagliati.push(id + ' mostra il conteggio di «' + campo + '»');
  }
  deve(visti >= 20, 'trovati solo ' + visti + ' filtri: il modo di disegnarli è cambiato, rileggere questa prova');
  deve(sbagliati.length === 0, sbagliati.join(' | '));
  return visti + ' filtri, ' + Object.keys(LECITI).length + ' col conteggio giusto';
});

prova('la schermata legge le colonne che servono a dire «perso»', () => {
  /* Il filtro più giusto del mondo non serve a niente se la lettura non porta
     `stato_pagamento` e la data dell'annullamento: senza il primo le 34
     polizze annullate che scadono in futuro contano come attive, e 34 clienti
     persi risultano a posto; senza la seconda la perdita si daterebbe alla
     scadenza, che può distare mesi. Sono due errori che non danno errore. */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = src.indexOf("db.from('quote_polizze').select('id,cliente_id");
  deve(i > 0, 'la lettura del portafoglio del CRM è cambiata: rileggere questa prova');
  const sel = src.slice(i, src.indexOf(')', src.indexOf('.limit(', i)));
  for (const c of ['stato_pagamento', 'data_annullamento', 'id']) {
    deve(sel.indexOf(c) >= 0, 'la lettura del CRM non chiede «' + c + '»');
  }
});

prova('le quietanze di rinnovo si leggono soltanto quando servono, e solo loro', () => {
  /* Due righe su 3.218: chiederle tutte per trovarne due sarebbe uno spreco a
     ogni ricerca. E la lettura si fa solo se il filtro «come l'abbiamo perso» è
     stato chiesto — gli altri non devono pagarla. */
  const fs = require('fs');
  const src = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const i = src.indexOf("let titoliQR = null;");
  deve(i > 0, 'la lettura delle quietanze di rinnovo non c\'è più');
  const blocco = src.slice(i, i + 900);
  deve(/if \(g\('ca-come-perso'\)\)/.test(blocco), 'la lettura parte anche senza che il filtro sia stato chiesto');
  deve(/\.eq\('sigla_tipo', 'QR'\)/.test(blocco), 'si leggono tutti i titoli invece delle sole quietanze di rinnovo');
  deve(/if \(error\)/.test(blocco) && /return;/.test(blocco.slice(blocco.indexOf('if (error)'))),
    'se la lettura cade la ricerca prosegue e mostra un numero che non è quello vero');
});

prova('senza filtri sullo stato il motore non va nemmeno a cercarlo', () => {
  /* `statoCliente` su 2.500 clienti a ogni battuta di tasto si sente. E, più
     importante: chi non chiede lo stato non deve vedere la lista accorciarsi
     perché un motore non era caricato. */
  const r = A.filtra(GENTE_PERSI, { }, { polizzePerCliente: PERSI });
  deve(r.length === GENTE_PERSI.length, 'senza filtri sono usciti ' + r.length + ' su ' + GENTE_PERSI.length);
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' CRM · Analisi: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
