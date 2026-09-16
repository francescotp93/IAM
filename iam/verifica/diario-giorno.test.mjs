// ═══════════════════════════════════════
//  DIARIO — la vista GIORNO
//
//  La settimana dice SE un giorno è pieno, non COME. Dieci cose da dieci
//  minuti e tre incontri da due ore riempiono la stessa colonna, e dalla
//  settimana sembrano lo stesso carico. La vista Giorno legge la giornata ora
//  per ora e mette in cima le tre risposte che si cercano guardandola:
//  quante attività, quante chiuse, quanto tempo è già impegnato.
//
//  Queste prove sorvegliano i guasti che non si vedono guardando lo schermo:
//   1. il giorno che scivola cambiando data (sommare 24 ore attraversa il
//      cambio dell'ora legale e fa saltare o ripetere un giorno);
//   2. le attività senza orario leggibile che spariscono invece di finire
//      nella fascia «senza orario» — sono le stesse che già sparivano dalla
//      settimana;
//   3. il tempo impegnato che conta come zero minuti le attività senza ora di
//      fine, facendo sembrare libera una giornata che non lo è;
//   4. un'ora di fine prima dell'inizio, che darebbe un totale negativo;
//   5. le colonne nuove del database che, se non sono ancora state create,
//      fanno fallire il salvataggio invece di essere semplicemente saltate;
//   6. le quattro viste che si accendono insieme o si spengono a vicenda.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

function corpoDi(firma) {
  const i = html.indexOf(firma);
  if (i < 0) return null;
  let liv = 0, j = html.indexOf('{', i);
  const inizio = j;
  for (; j < html.length; j++) {
    if (html[j] === '{') liv++;
    else if (html[j] === '}') { liv--; if (liv === 0) return html.slice(inizio, j + 1); }
  }
  return null;
}

// ── 1. La vista esiste ed è raggiungibile ────────────────────────────────
prova('la linguetta Giorno c\'è e apre la sua vista', () => {
  deve(/id="wd-tab-giorno"/.test(html), 'manca la linguetta Giorno');
  deve(/selWDTab\('giorno'\)/.test(html), 'la linguetta non chiama selWDTab(\'giorno\')');
  deve(/id="wd-giorno"/.test(html), 'manca il contenitore della vista Giorno');
  deve(/id="wdg-agenda"/.test(html), 'manca l\'agenda oraria');
  deve(/id="wdg-somma"/.test(html), 'manca la riga dei totali');
});

// ── 2. Le quattro viste non si pestano i piedi ───────────────────────────
prova('quattro viste, una sola accesa per volta', () => {
  const c = corpoDi('function selWDTab(t)');
  deve(c, 'manca selWDTab');
  for (const v of ['wd-lista', 'wd-cal', 'wd-sett', 'wd-giorno']) {
    deve(c.includes(v), 'selWDTab non governa ' + v);
  }
  /* Ogni vista si accende SOLO sulla propria chiave: una condizione scritta
     male le accende in due, e la pagina raddoppia. */
  for (const [id, chiave] of [['lst', 'lista'], ['cal', 'cal'], ['set', 'sett'], ['gio', 'giorno']]) {
    const re = new RegExp(id + "\\.style\\.display\\s*=\\s*\\(t\\s*===\\s*'" + chiave + "'\\)");
    deve(re.test(c), 'la vista ' + chiave + ' non si accende solo sulla sua chiave');
  }
  deve(/t\s*===\s*'giorno'\s*\)\s*renderWDGiorno\(\)/.test(c.replace(/\s+/g, ' ')) || /renderWDGiorno\(\)/.test(c),
    'aprendo Giorno non si disegna niente');
});

// ── 3. Cambiare giorno non deve scivolare ────────────────────────────────
prova('cambiare giorno non salta e non ripete un giorno', () => {
  const c = corpoDi('function wdGiornoVai(passo)');
  deve(c, 'manca wdGiornoVai');
  /* Sommare 86.400.000 millisecondi attraversa il cambio dell'ora legale:
     due volte l'anno si salta un giorno o se ne ripete uno. Si lavora sulla
     data, ancorata a mezzogiorno. */
  deve(!/\+\s*86400000|\*\s*24\s*\*\s*60/.test(c), 'il giorno si sposta sommando millisecondi');
  deve(/setDate\(/.test(c), 'il giorno non si sposta con setDate');
  deve(/T12:00:00/.test(c), 'la data non è ancorata a mezzogiorno: l\'ora legale può spostarla');
});

// ── 4. Chi non ha orario non sparisce ────────────────────────────────────
prova('le attività senza orario leggibile restano visibili', () => {
  const c = corpoDi('function renderWDGiorno()');
  deve(c, 'manca renderWDGiorno');
  deve(/senzaOra/.test(c), 'non c\'è nessuna fascia per chi non ha orario');
  deve(/senza[\s\S]{0,40}orario/i.test(c), 'la fascia senza orario non è etichettata');
  deve(/!wdsOra\(w\)/.test(c), 'le attività senza orario non vengono raccolte');
});

// ── 5. Il tempo impegnato non deve mentire ───────────────────────────────
prova('il tempo impegnato non conta come zero chi non ha una fine', () => {
  const c = corpoDi('function wdgTempo(lista)');
  deve(c, 'manca wdgTempo');
  /* Una voce senza ora di fine non vale zero minuti: vale «non si sa».
     Contarla come zero fa sembrare libera una giornata piena. */
  deve(/if\s*\(!a\s*\|\|\s*!b\)\s*return/.test(c), 'un\'attività senza fine viene contata lo stesso');
  deve(/contate/.test(c), 'il totale non dice su quante attività è calcolato');
  deve(/d\s*>\s*0/.test(c), 'una durata negativa entrerebbe nel totale');
});

prova('una fine prima dell\'inizio viene fermata al salvataggio', () => {
  const c = corpoDi('function saveWD()');
  deve(c, 'manca saveWD');
  deve(/ora_fine\s*&&\s*w\.ora\s*&&\s*w\.ora_fine\s*<=\s*w\.ora/.test(c.replace(/\s+/g, ' ')),
    'si può salvare una fine precedente all\'inizio');
});

// ── 6. Le colonne nuove non devono poter rompere il salvataggio ──────────
prova('se una colonna nuova non esiste, il salvataggio riesce lo stesso', () => {
  const c = corpoDi('async function saveWD_DB(w)');
  deve(c, 'manca saveWD_DB');
  for (const col of ['ora_fine', 'cliente', 'prodotto']) {
    deve(c.includes(col), 'saveWD_DB non scrive ' + col);
  }
  /* Gli script SQL li lancia una persona: fra il rilascio e il lancio della
     migrazione le colonne non esistono. In quella finestra il salvataggio
     deve riuscire SENZA il campo nuovo — perdere il titolo di un'attività
     perché manca una colonna facoltativa sarebbe molto peggio. */
  deve(/FACOLTATIVE/.test(c), 'non c\'è nessun ripiego per le colonne non ancora create');
  deve(/delete payload\[/.test(c), 'la colonna mancante non viene tolta dal salvataggio');
  /* Si toglie una colonna per volta: il messaggio di errore ne nomina una
     sola, e buttarle via tutte insieme perderebbe anche quelle che c'erano. */
  deve(/find\(/.test(c), 'le colonne facoltative vengono tolte tutte insieme invece che una per volta');
});

// ── 7. I campi nuovi si vedono e si rileggono ────────────────────────────
prova('ora di fine, cliente e prodotto: si scrivono, si salvano, si rileggono', () => {
  for (const id of ['wd-ora-fine', 'wd-cliente', 'wd-prodotto']) {
    deve(html.includes('id="' + id + '"'), 'manca il campo ' + id);
  }
  const apri = corpoDi('async function openWDModal(id');
  deve(apri, 'manca openWDModal');
  for (const [campo, id] of [['ora_fine', 'wd-ora-fine'], ['cliente', 'wd-cliente'], ['prodotto', 'wd-prodotto']]) {
    deve(apri.includes(id), 'aprendo in modifica il campo ' + id + ' resta vuoto');
    deve(apri.includes(campo), 'aprendo in modifica non si rilegge ' + campo);
  }
  const det = corpoDi('function wdsDettaglio(id');
  deve(det && /w\.cliente/.test(det) && /w\.prodotto/.test(det), 'il dettaglio non mostra cliente e prodotto');
});

// ── 8. Niente HTML dal contenuto scritto dalle persone ───────────────────
prova('i campi nuovi passano dalla ripulitura', () => {
  /* Cliente lo scrive una persona di fretta: basta un apice per rompere il
     pannello, e un tag per fare di peggio. */
  const det = corpoDi('function wdsDettaglio(id');
  deve(det, 'manca wdsDettaglio');
  deve(!/\$\{w\.(cliente|prodotto|ora_fine)\}/.test(det), 'un campo nuovo esce senza ripulitura');
  const g = corpoDi('function renderWDGiorno()');
  deve(g && !/\$\{tempo\.(testo|nota)\}/.test(g), 'i totali escono senza ripulitura');
});

// ── 9. Salvando si aggiornano tutte le viste ─────────────────────────────
prova('salvando, nessuna vista resta indietro', () => {
  const c = corpoDi('function saveWD()');
  deve(c, 'manca saveWD');
  /* Sono quattro letture degli stessi dati: lasciarne indietro una fa
     ricomparire l'attività vecchia appena si cambia linguetta. */
  for (const r of ['renderWD()', 'renderWDCal()', 'renderWDSett()', 'renderWDGiorno()']) {
    deve(c.includes(r), 'dopo il salvataggio non viene ridisegnata: ' + r);
  }
});

// ── 10. Dalla settimana si apre la giornata ──────────────────────────────
prova('dall\'intestazione del giorno si apre la giornata', () => {
  deve(/wdApriGiorno\(/.test(html), 'manca wdApriGiorno');
  const c = corpoDi('function wdApriGiorno(ds)');
  deve(c, 'manca il corpo di wdApriGiorno');
  deve(/selWDTab\('giorno'\)/.test(c), 'aprire la giornata non cambia vista');
  /* Con il mouse si clicca; senza mouse serve il tasto. Una cosa cliccabile
     che non si raggiunge da tastiera esclude chi non usa il mouse. */
  deve(/onkeydown[^>]*wdApriGiorno/.test(html), 'la giornata non si apre da tastiera');
  deve(/role="button"[^>]*tabindex="0"|tabindex="0"[^>]*role="button"/.test(html.replace(/\n\s*/g, ' ')),
    'l\'intestazione cliccabile non si annuncia come pulsante');
});

// ── 11. La migrazione esiste, ed è rilanciabile ──────────────────────────
prova('lo script SQL c\'è, non esegue niente da solo ed è rilanciabile', () => {
  const p = path.join(radice, 'sql', 'DA-APPROVARE-diario-campi-nuovi.sql');
  deve(fs.existsSync(p), 'manca lo script SQL dei campi nuovi');
  const sql = fs.readFileSync(p, 'utf8');
  for (const col of ['ora_fine', 'cliente', 'prodotto']) {
    deve(sql.includes(col), 'lo script non aggiunge ' + col);
  }
  /* Rilanciabile senza danni: chi lo lancia due volte non deve rompere
     niente, ed è quello che succede sempre. */
  deve((sql.match(/add column if not exists/gi) || []).length >= 3, 'lo script non è rilanciabile senza danni');
  deve(!/\bdrop\b|\btruncate\b|\bdelete from\b/i.test(sql), 'lo script contiene un comando distruttivo');
});

// ── 12. Il mese, nel disegno consegnato ─────────────────────────────────
prova('il mese mostra le attività, non un pallino', () => {
  /* Prima era una griglia di quadratini con un puntino: diceva SE un giorno
     aveva qualcosa, non cosa — e per saperlo bisognava aprirlo. */
  const c = corpoDi('function renderWDCal()');
  deve(c, 'manca renderWDCal');
  deve(/wdm-griglia|wdm-g\b/.test(html), 'il mese non usa la griglia del disegno');
  deve(/wdm-e\b/.test(html), 'nel mese non si vedono le attività');
  deve(/slice\(0,\s*3\)/.test(c), 'non c\'è un limite alle attività mostrate per giorno');
  deve(/altre/.test(c), 'le attività oltre il limite spariscono senza dirlo');
});

prova('«oggi» evidenzia il numero, non tutta la cella', () => {
  /* La cella intera riempita di verde schiaccia il numero invece di
     indicarlo, e con dentro le attività le rende illeggibili. Nel disegno è
     solo il numero a essere evidenziato. */
  /* La classe si chiama wdm-oggi, non «oggi»: quel nome è già del riquadro
     «Da fare oggi» della scrivania, e la sua regola globale cadeva anche
     qui. Due cose diverse con lo stesso nome in un foglio unico. */
  deve(/\.wdm-g\.wdm-oggi \.wdm-n\s*\{[^}]*background/.test(html.replace(/\s+/g, ' ')),
    '«oggi» non evidenzia il numero');
  const r = corpoDi('function renderWDCal()');
  deve(r && !/\? ' oggi'/.test(r), 'il mese usa la classe «oggi», che è già del riquadro della scrivania');
  const c = corpoDi('function renderWDCal()');
  deve(c && !/oggi\s*\?\s*'var\(--acc\)'/.test(c), 'il mese usa ancora l\'accento del tema per «oggi»');
});

prova('«oggi» si calcola in ora locale, non in UTC', () => {
  /* toISOString() è in UTC: fra mezzanotte e le due in Italia restituisce il
     giorno prima, e il mese evidenzia il quadretto sbagliato. Si vede solo a
     quell'ora, e quindi nessuno lo collega mai alla causa. */
  const c = corpoDi('function renderWDCal()');
  deve(c, 'manca renderWDCal');
  const senzaCommenti = c.replace(/\/\*[\s\S]*?\*\//g, '');
  deve(!/toISOString\(\)/.test(senzaCommenti), '«oggi» viene calcolato in UTC');
  deve(/wdsISO\(new Date\(\)\)/.test(c), '«oggi» non usa la data locale');
});

// ── 13. La finestra «Nuova attività» ────────────────────────────────────
prova('le azioni della finestra stanno in fondo, non sopra i campi', () => {
  /* Si leggono i campi e poi si decide. «Salva» sopra la prima riga invita a
     premerlo prima di aver guardato cosa c'è sotto. */
  deve(/modal-ftr/.test(html), 'la finestra non ha un piede con le azioni');
  deve(/Salva attività/.test(html), 'manca il pulsante di salvataggio in fondo');
  deve(/#modal-wd \.mbtn\.prim/.test(html), 'il pulsante di salvataggio non è quello del disegno');
});

prova('la finestra è ridisegnata senza toccare le altre', () => {
  /* Le classi .modal e .fld sono condivise con tutte le finestre del
     gestionale: ridisegnarle qui le cambierebbe tutte. */
  const i = html.indexOf('#modal-wd{');
  deve(i > 0, 'lo stile della finestra non è confinato a #modal-wd');
  deve(/#modal-wd \.fld input/.test(html), 'i campi non seguono il disegno');
  /* E il verde e' quello del kit, non l'accento del tema: la finestra e' una
     superficie chiara fissa, e l'accento puo' essere viola. */
  deve(!/#modal-wd[^{]*\{[^}]*var\(--acc\)/.test(html), 'la finestra segue l\'accento del tema');
});

let ko = 0;
console.log('\nDIARIO — la vista giorno');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nDIARIO GIORNO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
