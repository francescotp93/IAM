// ═══════════════════════════════════════════════════════════════════════════════
//  CONTI E CAUSALI — il pannello di IAM  (19/09/2026, brief #02 · M1)
//
//  Quello che si sorveglia qui NON è l'aritmetica: quella sta nel motore
//  condiviso e ha le sue undici prove in `server/verifica/contabilita.test.mjs`.
//  Qui si sorveglia che il pannello:
//
//    · usi il motore invece di riscriverne le regole (una formula dentro una
//      schermata non si può provare senza aprire un browser, §5);
//    · CHIAMI davvero quello che dichiara — una funzione di controllo che non
//      chiama nessuno è il guasto numero uno di questo repository (§1);
//    · lasci la porta chiusa a chi non deve scriverci, e non confonda «non si
//      è potuto leggere» con «non ce n'è» (§12, §18);
//    · sia raggiungibile: una pagina senza una voce di menu e senza la sua riga
//      in `goTab` è un riquadro vuoto (§6b).
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const IAM = path.join(QUI, '..', 'index.html');
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(IAM, 'utf8');
const SCOCCA = fs.readFileSync(path.join(QUI, '..', 'withus-one.js'), 'utf8');
const SQL = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260919_b02_m1_conti_e_causali.sql'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il motore è quello CONDIVISO, caricato dal preventivatore e non copiato', () => {
  /* Si cerca il TAG, non la stringa: `tariffe/motore/contabilita.js` compare
     anche nei commenti del blocco, e una prova che cercasse la parola
     resterebbe verde anche con una copia locale. È la trappola già presa due
     volte (§10, §12, §18). */
  const tag = /<script src="\/nuovo-preventivo\/tariffe\/motore\/contabilita\.js\?v=[^"]+"><\/script>/;
  deve(tag.test(H), 'IAM non carica il motore condiviso della contabilità con un tag <script src>');
  /* E non c'è una seconda copia dentro la cartella di IAM: due vocabolari
     della contabilità sono due contabilità della stessa agenzia. */
  deve(!fs.existsSync(path.join(QUI, '..', 'tariffe')), 'esiste una copia dei motori dentro iam/');
  return 'un file solo, dal preventivatore';
});

prova('le regole NON sono riscritte nel pannello: le chiede al motore', () => {
  const b = blocco();
  /* Le quattro decisioni che, riscritte qui, diventerebbero una seconda
     regola che un giorno dice un'altra cosa. */
  for (const f of ['Contabilita.validaConto', 'Contabilita.validaCausale', 'Contabilita.saldi',
                   'Contabilita.perNatura', 'Contabilita.eliminabile', 'Contabilita.causaleEliminabile',
                   'Contabilita.codiceDa', 'Contabilita.normalizzaIban']) {
    deve(b.includes(f), 'il pannello non chiama ' + f);
  }
  /* E non si è portato dietro le formule: niente mod 97 e niente somme di
     saldi scritte a mano in pagina. */
  deve(!/%\s*97/.test(b), 'il controllo dell’IBAN è stato riscritto nel pannello');
  deve(!/saldo_iniziale\s*\+/.test(b), 'il saldo è calcolato a mano nel pannello invece che dal motore');
  return '8 chiamate al motore, zero formule in pagina';
});

prova('il cancello dell\'admin esiste ED È CHIAMATO', () => {
  const b = blocco();
  deve(/function cntPuoScrivere\(\)\s*{\s*return PROFILO\?\.ruolo === 'admin'/.test(b), 'manca cntPuoScrivere');
  /* §1: una funzione di controllo che non chiama nessuno non controlla
     niente. Le quattro strade che scrivono devono passare di lì o dal
     render che nasconde i bottoni. */
  const usi = (b.match(/cntPuoScrivere\(\)/g) || []).length;
  deve(usi >= 3, 'cntPuoScrivere è chiamata solo ' + usi + ' volte: il cancello è decorativo');
  deve(/function cntApri\([^)]*\)\s*{\s*\n?\s*if \(!cntPuoScrivere\(\)\) return;/.test(b), 'la finestra si apre anche a chi non può scrivere');
  /* E il cancello VERO è nel database, non nel bottone nascosto. */
  deve(/create policy conti_write[\s\S]{0,200}iam_is_admin\(\)/.test(SQL), 'la scrittura sui conti non è chiusa all’admin nelle politiche');
  deve(/create policy causali_write[\s\S]{0,200}iam_is_admin\(\)/.test(SQL), 'la scrittura sulle causali non è chiusa all’admin nelle politiche');
  deve(/create policy conti_select[\s\S]{0,160}iam_is_staff\(\)/.test(SQL), 'la lettura dei conti non è chiusa allo staff');
  return 'bottone + goTab + RLS';
});

prova('la porta della pagina esiste: menu, titolo e riga in goTab', () => {
  /* §6b: una pagina senza inizializzatore apre un riquadro vuoto. */
  deve(/if \(t === 'conti'\)\s*{\s*cntTab\(CNT_VISTA\); cntCarica\(true\);/.test(H), 'goTab non avvia il pannello conti');
  deve(/conti:\s*\(\) => !!PERMESSI\[PROFILO\?\.ruolo\]\?\.conto/.test(H), 'il pannello conti non è fra le sezioni riservate');
  deve(/id="panel-conti"/.test(H), 'manca il pannello #panel-conti');
  /* E la scocca: la voce, il titolo, il menu di appartenenza. Senza il titolo
     la briciola direbbe un posto in cui non sei più. */
  deve(/act: 'conti', go: function\(\)\{ vai\('conti'\); \}/.test(SCOCCA), 'la scocca non ha la voce «Conti e causali»');
  deve(/conti:\s*\['Conti e causali', 'Strumenti'\]/.test(SCOCCA), 'la scocca non ha il titolo della pagina conti');
  deve(/conti: 'strumenti'/.test(SCOCCA), 'conti non è agganciata al menu Strumenti');
  return 'voce, titolo, TAB2MENU, goTab, RISERVATE';
});

prova('«non si è potuto leggere» non diventa «non ce ne sono»', () => {
  const b = blocco();
  /* La stessa regola del registro (§18) e del contatore documentale (§12):
     un elenco vuoto su un errore farebbe credere che l'agenzia non abbia
     conti — ed è la cosa peggiore da far credere su dei soldi. */
  deve(/non vuol dire che non ce ne siano/.test(b), 'l’errore di lettura si confonde con l’elenco vuoto');
  deve(/class="cnt-err"/.test(b), 'l’errore non si vede');
  /* E il vuoto vero ha un testo suo, diverso. */
  deve(/Nessun conto\./.test(b), 'l’elenco vuoto non ha un messaggio suo');
  return 'due messaggi diversi per due cose diverse';
});

prova('la storia di un conto sta nel registro unico, non in una traccia privata', () => {
  const b = blocco();
  /* §18: `quote_polizze.dati.modifiche` era il rimedio per una schermata sola.
     Qui la storia si legge dal registro, con il tipo giusto. */
  deve(/regInstalla\('cnt-storia',\s*CNT_VISTA === 'conti' \? 'conto' : 'causale'/.test(b), 'la finestra non mostra la storia dal registro');
  deve(/logMovimento\('Conto creato/.test(b) && /logMovimento\('Causale creata/.test(b), 'creare un conto o una causale non lascia traccia');
  deve(/logMovimento\('Conto eliminato/.test(b) && /logMovimento\('Causale eliminata/.test(b), 'eliminare non lascia traccia');
  /* E i due tipi esistono nel vocabolario del motore del registro: un tipo che
     il motore non conosce non si aggancia a niente. */
  const R = require(path.join(RADICE, 'tariffe', 'motore', 'registro.js'));
  deve(R.VOCI.conto && R.VOCI.conto.tabella === 'iam_conti', 'il registro non conosce il tipo «conto»');
  deve(R.VOCI.causale && R.VOCI.causale.tabella === 'iam_causali', 'il registro non conosce il tipo «causale»');
  return 'otto tracce, due tipi nel vocabolario';
});

prova('il CODICE di una causale non si riscrive mai su una modifica', () => {
  const b = blocco();
  const i = b.indexOf('async function cntSalvaCausale');
  deve(i >= 0, 'manca cntSalvaCausale');
  const f = b.slice(i, b.indexOf('\n}\n', i));
  /* Il codice è la chiave a cui punteranno i movimenti e a cui si aggancia
     l'automatismo dell'incasso: cambiarlo su una rinomina vorrebbe dire che il
     giorno dopo l'incasso non sa più che cosa scrivere. Nel ramo dell'update
     `riga` non deve contenere `codice`; nel ramo dell'insert sì. */
  const update = f.slice(f.indexOf('if (id) {'), f.indexOf('} else {'));
  deve(!/codice/.test(update.replace(/vecchia\?\.codice/g, '')), 'la modifica riscrive il codice della causale');
  const insert = f.slice(f.indexOf('} else {'));
  deve(/riga\.codice = Contabilita\.codiceDa/.test(insert), 'la causale nuova non si prende un codice dal motore');
  return 'il codice nasce una volta e non cambia';
});

prova('le dieci causali di partenza sono in tabella e non si cancellano', () => {
  deve(C.CAUSALI_INIZIALI.length === 10, 'le causali di partenza non sono dieci');
  /* Il divieto sta nel DATABASE e non nella schermata: la schermata è una
     delle strade, non l'unica (c'è la console, c'è PostgREST, ci sarà QUOTO). */
  deve(/create trigger iam_causali_no_delete_sistema_trg/.test(SQL), 'niente trigger che protegge le causali di sistema');
  deve(/if old\.di_sistema then[\s\S]{0,200}raise exception/.test(SQL), 'il trigger non solleva su una causale di sistema');
  /* E la schermata lo dice, invece di far cliccare un bottone che poi fallisce. */
  deve(/È una delle causali di partenza/.test(blocco()), 'la schermata non avverte sulle causali di partenza');
  return 'trigger nel database + avviso in pagina';
});

prova('il saldo non si scrive da nessuna parte: la colonna non esiste', () => {
  /* La regola 1 del motore, guardata dal lato del database: se un giorno
     qualcuno aggiunge una colonna `saldo`, quel numero comincerà a scostarsi
     dalla somma dei movimenti e nessuno saprà quale dei due è quello vero. */
  const tab = SQL.slice(SQL.indexOf('create table if not exists public.iam_conti'), SQL.indexOf('create unique index if not exists iam_conti_nome_uni'));
  deve(/saldo_iniziale\s+numeric/.test(tab), 'manca il saldo iniziale');
  deve(!/^\s*saldo\s+numeric/m.test(tab), 'è comparsa una colonna `saldo` memorizzata');
  const b = blocco();
  deve(!/\.update\(\{[^}]*saldo:/.test(b) && !/saldo:\s*[^_]/.test(b.replace(/saldo: s\.saldo/g, '')), 'il pannello scrive un saldo nel database');
  return 'solo saldo_iniziale, il resto si calcola';
});

/* ─────────────────────────────────────────────────────────────────────────── */
function blocco() {
  const i = H.indexOf('/* ══ CONTI E CAUSALI (brief #02 · M1');
  deve(i >= 0, 'non trovo il blocco cnt* in iam/index.html');
  const fine = H.indexOf('function initDB()', i);
  return H.slice(i, fine < 0 ? H.length : fine);
}

console.log('\n══ CONTI E CAUSALI (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCONTI E CAUSALI (IAM): ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
