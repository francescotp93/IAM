// ═══════════════════════════════════════════════════════════════════════════════
//  I MIEI DOCUMENTI — l'area riservata del collaboratore
//
//  E' la prima schermata di IAM fatta per chi NON e' dell'agenzia: il
//  collaboratore ci ritrova il suo mandato, le tabelle provvigionali, le
//  informative. Il valore sta nel fatto che ci siano ancora fra un anno,
//  quando l'email con cui erano arrivati non c'e' piu'.
//
//  Le cose che devono restare vere non sono di grafica:
//
//    1. L'ELENCO NON PASSA DA iam_firme. Quella tabella e' chiusa allo staff
//       (policy `iam_is_staff()`) e porta anche il token con cui si apre un
//       documento e si firma. La pagina chiama iam_mie_firme(), che gira nel
//       database con auth.uid(): non puo' tornare le righe di un altro nemmeno
//       sbagliando una condizione qui dentro. Se un giorno qualcuno ci attacca
//       una query diretta «perche' e' piu' comodo», questa prova cade.
//
//    2. IL DOCUMENTO NON SI APRE CON UN TOKEN NEL LINK. Un indirizzo finisce
//       negli appunti, nella cronologia, in uno screenshot mandato all'ufficio.
//       Si chiede col proprio accesso nell'intestazione, e il documento di un
//       altro risponde «non trovato».
//
//    3. NON C'E' UN TASTO «FIRMA». Firmare vuole il codice usa e getta che sta
//       nell'email, ed e' il secondo fattore: un tasto qui lo aggirerebbe, e
//       una firma varrebbe quanto una sessione lasciata aperta su un computer
//       acceso. La schermata deve dirlo, invece di far cercare.
//
//  In piu': il vuoto non deve sembrare un guasto, e un errore non deve
//  lasciare «Caricamento…» a schermo per sempre.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'mieDocsTitolo', 'mieDocsStato', 'mieDocsData',
  'schedaMioDocumento', 'caricaMieiDocumenti',
];
// `esc` NON si ritaglia: in index.html ce n'e' piu' d'una e l'estrattore ne
// prende una spezzata. Il banco ne fornisce gia' una fedele.

const MANDATO = {
  id: 'f1', tipo: 'mandato', titolo: null, versione: '2026.1',
  doc_url: 'https://esempio/mandato.pdf', stato: 'completata', valido_dal: '2026-09-01',
  firmato_collab_il: '2026-09-03T10:00:00Z', firmato_agente_il: '2026-09-04T09:00:00Z',
  creato_il: '2026-09-02T08:00:00Z',
};
const DA_FIRMARE = {
  id: 'f2', tipo: 'tabella_provvigionale', titolo: null, versione: '2026.2',
  doc_url: null, stato: 'inviata', valido_dal: null,
  firmato_collab_il: null, firmato_agente_il: null, creato_il: '2026-09-09T08:00:00Z',
};

/* Un `db` con la sola rpc: e' l'unica cosa che questa schermata usa, e
   passarne uno finto e' quello che rende provabile il caricamento. */
function schermo({ righe = [], errore = null } = {}) {
  const chiamate = [];
  const db = {
    rpc: async (nome, args) => {
      chiamate.push({ nome, args });
      if (errore) return { data: null, error: { message: errore } };
      return { data: righe, error: null };
    },
  };
  const s = stanza(sorgenteAttuale(), NOMI, { altro: { db, MAIL_API: 'https://api.esempio', mailToken: async () => 'tok' } });
  s.chiamate = chiamate;
  s.scritto = () => s.browser.elemento('miedocs-lista').innerHTML;
  return s;
}

const SORGENTE = sorgenteAttuale();
/* Il blocco della schermata, per le prove che guardano il codice invece del
   comportamento: sono quelle che si accorgono di una scorciatoia aggiunta
   domani, che nessuna prova sul risultato vedrebbe. */
function blocco() {
  /* Si aggancia al commento del BLOCCO JAVASCRIPT, non al testo «I MIEI
     DOCUMENTI» e basta: quello compare anche nel markup del pannello, molto
     piu' su, e indexOf prenderebbe quello — ritagliando mezza pagina invece
     della sezione. Una prova che guarda piu' di quello che dice non sta
     guardando: sta indovinando, e passa o cade per motivi che non c'entrano.
     (Scoperto l'11/09/2026, quando M4 ha aggiunto un `team_id` a duemila
     righe di distanza e questa prova e' diventata rossa.) */
  const da = SORGENTE.indexOf('/* ═══ I MIEI DOCUMENTI');
  const a  = SORGENTE.indexOf('function firmaDocUrl(', da);
  deve(da > 0 && a > da, 'il blocco «I miei documenti» non si trova più in index.html');
  return SORGENTE.slice(da, a);
}

const e = esiti('I MIEI DOCUMENTI');

/* ── 1. l'elenco non passa da iam_firme ─────────────────────────────────── */

await e.provaAsync('l\'elenco lo chiede al database, non alla tabella', async () => {
  const s = schermo({ righe: [MANDATO] });
  await s.ctx.caricaMieiDocumenti();
  deve(s.chiamate.length === 1, 'non ha chiamato niente: ' + JSON.stringify(s.chiamate));
  deve(s.chiamate[0].nome === 'iam_mie_firme',
    'chiama qualcos\'altro al posto di iam_mie_firme: ' + s.chiamate[0].nome);
});

e.prova('e non tocca iam_firme da nessuna parte', () => {
  /* iam_firme e' leggibile solo dallo staff e porta il token: una query
     diretta qui tornerebbe vuota al collaboratore (e piena all'agente), che e'
     il modo piu' rapido di far sembrare rotta una schermata che funziona. */
  const b = blocco();
  deve(!/from\(\s*['"]iam_firme['"]\s*\)/.test(b),
    'la schermata legge iam_firme direttamente: al collaboratore tornerebbe vuota');
  deve(!/\bteam_id\b/.test(b), 'la schermata filtra per team_id: non è suo il criterio, è auth.uid()');
});

/* ── 2. il documento non si apre con un token ───────────────────────────── */

e.prova('il documento si chiede con l\'accesso, non con un token nel link', () => {
  const b = blocco();
  const da = b.indexOf('async function apriMioDocumento');
  deve(da > 0, 'la funzione che apre il documento non esiste più');
  const fn = b.slice(da, b.indexOf('async function caricaMieiDocumenti'));
  deve(/Authorization/.test(fn) && /Bearer/.test(fn),
    'la richiesta non porta l\'accesso nell\'intestazione');
  deve(/\/firma-collab\/mio\/doc/.test(fn),
    'non usa la rotta che autorizza per identità');
  deve(!/[?&]t=/.test(fn) && !/\btoken\b/.test(fn),
    'il token del link è tornato dentro la pagina: finirebbe negli appunti e nella cronologia');
});

e.prova('e la vecchia strada col token resta solo allo staff', () => {
  /* firmaDocUrl() esiste ancora ed e' giusto: la usa la scheda del
     collaboratore in Operativa, dove sta l'agente. Non deve pero' essere
     quella che usa l'area riservata. */
  deve(/function firmaDocUrl\(/.test(SORGENTE), 'firmaDocUrl è sparita: la scheda dello staff si rompe');
  deve(!/firmaDocUrl\(/.test(blocco()),
    'l\'area riservata usa il link col token invece della rotta autenticata');
});

/* ── 3. niente tasto «Firma» ────────────────────────────────────────────── */

e.prova('da qui non si firma, e la schermata lo spiega', () => {
  const s = schermo();
  const html = s.ctx.schedaMioDocumento(DA_FIRMARE);
  deve(!/>\s*Firma\b/.test(html),
    'c\'è un tasto per firmare: aggirerebbe il codice usa e getta, che è il secondo fattore');
  deve(/email/i.test(html), 'non dice dove si firma: chi deve firmare resta fermo');
  deve(/agenzia/i.test(html), 'non dice a chi chiedere se l\'email non si trova');
});

/* ── 4. quello che la scheda mostra ─────────────────────────────────────── */

e.prova('la scheda dice quale documento, in quale versione, e a che punto è', () => {
  const s = schermo();
  const html = s.ctx.schedaMioDocumento(MANDATO);
  deve(/Mandato di collaborazione/.test(html), 'non si capisce che documento sia');
  deve(/versione 2026\.1/.test(html),
    'la versione non si vede: fra un anno non si dimostra a quali condizioni si era firmato');
  deve(/Firmato da entrambi/.test(html), 'non dice a che punto è');
  deve(/03\/09\/2026/.test(html), 'manca la data della propria firma');
  deve(/04\/09\/2026/.test(html), 'manca la data della controfirma');
});

e.prova('un documento ancora da firmare non sembra concluso', () => {
  const s = schermo();
  const html = s.ctx.schedaMioDocumento(DA_FIRMARE);
  deve(/Da firmare/.test(html), 'un documento in attesa sembra già a posto');
  deve(/Ricevuto il 09\/09\/2026/.test(html), 'non dice nemmeno da quando è lì');
});

e.prova('l\'allegato compare solo quando c\'è davvero', () => {
  const s = schermo();
  deve(/Allegato/.test(s.ctx.schedaMioDocumento(MANDATO)), 'il PDF allegato non è raggiungibile');
  deve(!/Allegato/.test(s.ctx.schedaMioDocumento(DA_FIRMARE)),
    'compare un allegato che non esiste: un tasto che non porta da nessuna parte');
});

e.prova('un titolo scritto a mano non porta dentro codice', () => {
  /* Il titolo lo scrive una persona dell'agenzia nel modulo d'invio: passa da
     li' a questa pagina senza nessun controllo in mezzo. */
  const s = schermo();
  const html = s.ctx.schedaMioDocumento({ ...MANDATO, titolo: '<img src=x onerror=alert(1)>' });
  deve(!/<img/.test(html), 'il titolo finisce in pagina come HTML: ' + html.slice(0, 120));
  deve(/&lt;img/.test(html), 'il titolo non compare affatto');
});

/* ── 5. il vuoto e l'errore ─────────────────────────────────────────────── */

await e.provaAsync('senza documenti non sembra un guasto', async () => {
  const s = schermo({ righe: [] });
  await s.ctx.caricaMieiDocumenti();
  const html = s.scritto();
  deve(!/Caricamento/.test(html), '«Caricamento…» resta a schermo per sempre');
  deve(/Non hai ancora documenti/.test(html), 'non dice che è normale non averne');
  deve(/mandato/i.test(html), 'non dice cosa comparirà qui, né quando');
});

await e.provaAsync('e se il database non risponde lo dice, invece di restare a caricare', async () => {
  const s = schermo({ errore: 'connessione persa' });
  await s.ctx.caricaMieiDocumenti();
  const html = s.scritto();
  deve(!/Caricamento/.test(html), 'resta «Caricamento…» per sempre e sembra una schermata rotta');
  deve(/Riprova|non riesco/i.test(html), 'non dice cosa è successo: ' + html.slice(0, 120));
  deve(!/connessione persa/.test(html),
    'sbatte in faccia il messaggio tecnico del database invece di una frase leggibile');
});

await e.provaAsync('due documenti si vedono tutti e due', async () => {
  const s = schermo({ righe: [MANDATO, DA_FIRMARE] });
  await s.ctx.caricaMieiDocumenti();
  const html = s.scritto();
  deve(/Mandato di collaborazione/.test(html) && /Tabella provvigionale/.test(html),
    'ne mostra uno solo');
});

/* ── 6. la schermata è raggiungibile ────────────────────────────────────── */

e.prova('c\'è una porta per arrivarci, e apre la schermata giusta', () => {
  /* Una schermata senza una voce che la apra, per chi lavora, non esiste. */
  deve(/goTab\('miedocs'\)/.test(SORGENTE), 'nessuna voce di menu apre «I miei documenti»');
  deve(/id="panel-miedocs"/.test(SORGENTE), 'il pannello non c\'è: goTab non troverebbe niente da mostrare');
  deve(/id="miedocs-lista"/.test(SORGENTE), 'manca il riquadro dove finisce l\'elenco');
  deve(/t === 'miedocs'.*caricaMieiDocumenti\(\)/s.test(
        SORGENTE.slice(SORGENTE.indexOf("t === 'miedocs'"), SORGENTE.indexOf("t === 'miedocs'") + 200)),
    'aprendo la schermata non si carica niente');
});

e.prova('e non è dietro un permesso, perché non ce n\'è uno da dare', () => {
  /* Il mandato lo firma anche un amministratore, e ognuno vede solo i propri:
     il filtro non e' qui, e' auth.uid() dentro iam_mie_firme(). Metterla
     dietro `PERMESSI` la toglierebbe a qualcuno senza motivo. */
  const da = SORGENTE.indexOf('const RISERVATE = {');
  const riservate = SORGENTE.slice(da, SORGENTE.indexOf('}', da));
  deve(!/miedocs/.test(riservate),
    '«I miei documenti» è finita fra le sezioni riservate: la vedrebbe solo lo staff');
});

e.prova('anche il segnalatore arriva ai suoi documenti', () => {
  /* La guardia del segnalatore rimbalza OGNI schermata tranne il profilo, ed
     e' scritta per i preventivi — lo dice il messaggio che mostra. Un
     documento che hai firmato tu non e' un preventivo: un segnalatore firma
     comunque l'informativa privacy e l'accordo di segnalazione, e ha diritto
     di rileggerli (art. 15 GDPR) senza chiederli a qualcuno. E' anche il primo
     gradino: l'area riservata si apre prima di tutto il resto. */
  /* `eSegnalatore(PROFILO)` compare due volte: qui e in puoQuotare(). Si
     aggancia DENTRO goTab, altrimenti si finisce a leggere l'altra e la prova
     passa senza guardare quello che dice di guardare. */
  const tab = SORGENTE.indexOf('function goTab(t) {');
  deve(tab > 0, 'goTab non si trova più');
  const da = SORGENTE.indexOf('if (eSegnalatore(PROFILO)', tab);
  deve(da > 0, 'la guardia del segnalatore non c\'è più: andrebbe ovunque');
  const guardia = SORGENTE.slice(da, SORGENTE.indexOf('}', da));
  deve(/t !== 'miedocs'/.test(guardia),
    'il segnalatore viene rimbalzato anche dai propri documenti: non sono preventivi, sono roba sua');
  deve(/t !== 'profilo'/.test(guardia),
    'la guardia non lascia più passare nemmeno il profilo: è stata allargata troppo');
});

e.prova('ma i preventivi restano chiusi al segnalatore', () => {
  /* Allargare la guardia di una voce e' un attimo; allargarla di troppo e'
     lo stesso attimo. Art. 109 CAP: chi non e' iscritto non intermedia. */
  const da = SORGENTE.indexOf('function puoQuotare()');
  const fn = SORGENTE.slice(da, SORGENTE.indexOf('}', SORGENTE.indexOf('return', da)));
  deve(/eSegnalatore\(PROFILO\)\s*\)\s*return false/.test(fn),
    'il segnalatore può arrivare al preventivatore: non è iscritto al RUI');
});

e.prova('tutte le funzioni che servono sono ancora in index.html', () => {
  const s = schermo();
  deve(s.mancanti.length === 0, 'non si trovano più: ' + s.mancanti.join(', '));
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
