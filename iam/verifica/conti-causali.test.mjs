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
const SQL6 = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_b02_m6_estratto_conto.sql'), 'utf8');
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
  /* Si guarda la SCRITTURA, non la parola. La prima stesura cercava
     `saldo:` ovunque nel blocco, e il 21/09/2026 e' diventata rossa su una
     frase dell'interfaccia — «Resta fuori dal saldo: senza verso non si
     indovina». E' la trappola gia' scritta dieci volte (§10, §12, §18, §26,
     §29, §31, §33, §34, §37, §41), qui in una veste nuova: non un commento
     ma un TESTO che l'utente legge. Due correzioni, come sempre: la frase e'
     stata riscritta e la prova adesso cerca un campo dentro una chiamata di
     scrittura, che e' quello che voleva dire dall'inizio. */
  const b = blocco();
  const scritture = [...b.matchAll(/\.(update|insert|upsert)\(\s*(\{[\s\S]{0,400}?\})/g)].map(m => m[2]);
  const colpevoli = scritture.filter(x => /(^|[{,\s])saldo\s*:/.test(x));
  deve(!colpevoli.length, 'il pannello scrive un saldo nel database: ' + (colpevoli[0] || '').slice(0, 120));
  return 'solo saldo_iniziale, il resto si calcola';
});

/* ═══ M6 — LE COORDINATE DELLE RIMESSE (20/09/2026) ═════════════════════════ */

prova('il conto dice dove i collaboratori versano, e la schermata lo salva', () => {
  /* L'IBAN su cui si riceve non si scrive dentro un programma: il giorno in
     cui l'agenzia cambia banca, un IBAN nel codice resta quello vecchio e i
     bonifici del mese dopo vanno su un conto chiuso. */
  const b = blocco();
  for (const campo of ['cnt-iban', 'cnt-bic', 'cnt-intestatario', 'cnt-rimesse']) {
    deve(b.includes("id=\"" + campo + "\""), 'il modulo del conto non ha ' + campo);
  }
  /* E si SALVANO: un campo che si compila e non si scrive è peggio di un
     campo che non c'è — chi lo riempie crede di aver fatto. */
  const salva = b.slice(b.indexOf('async function cntSalvaConto'), b.indexOf('async function cntSalvaCausale'));
  for (const col of ['bic:', 'intestatario:', 'rimesse:']) {
    deve(salva.includes(col), 'il salvataggio del conto non scrive ' + col);
  }
  deve(/rimesse: !!document\.getElementById\('cnt-rimesse'\)/.test(salva), 'la spunta delle rimesse non si legge dal modulo');
  return '4 campi, tutti salvati';
});

prova('il conto delle rimesse è UNO, e lo si scopre prima di salvare', () => {
  /* Il divieto vero è un indice unico sul database — la schermata è una delle
     strade, non l'unica — ma un vincolo che scatta dopo il salvataggio arriva
     come un errore che nessuno sa leggere. */
  deve(/create unique index if not exists iam_conti_rimesse_uno/.test(SQL6),
    'manca l\'indice unico sul conto delle rimesse');
  deve(/where rimesse and attivo/.test(SQL6), 'l\'indice non guarda solo i conti vivi');
  const altri = [{ id: '1', nome: 'RIMESSE', rimesse: true, attivo: true, iban: 'IT60X0542811101000000123456' }];
  const doppio = C.validaConto({ id: '2', nome: 'ALTRO', natura: 'aziendale', tipologia: 'banca', rimesse: true }, altri);
  deve(!doppio.ok && /RIMESSE/.test(doppio.errori.join(' ')), 'due conti delle rimesse passano: ' + JSON.stringify(doppio.errori));
  /* Ma lo stesso conto che si risalva non è un doppione di se stesso. */
  const suo = C.validaConto({ id: '1', nome: 'RIMESSE', natura: 'premi', tipologia: 'banca', rimesse: true, iban: 'IT60X0542811101000000123456' }, altri);
  deve(suo.ok, 'il conto delle rimesse non si può più risalvare: ' + JSON.stringify(suo.errori));
  return 'indice nel database, motivo nella schermata';
});

prova('il registro degli invii non si corregge e non si cancella', () => {
  /* Un registro che si può riscrivere non è un registro (§18, §29). */
  deve(/create trigger iam_invii_estratto_no_update_trg/.test(SQL6), 'manca il trigger che impedisce di cambiarlo');
  deve(/before update or delete on public\.iam_invii_estratto/.test(SQL6), 'il divieto non copre sia la modifica sia la cancellazione');
  /* E dice CHI ha mandato, quindi deve essere vero. */
  deve(/with check \(creato_da = auth\.uid\(\)\)/.test(SQL6), 'chiunque può scrivere una riga firmata con l\'identificativo di un altro');
  /* Un errore senza il motivo non spiega niente: è metà del valore di questo
     registro. */
  deve(/esito <> 'errore' or coalesce\(btrim\(errore\)/.test(SQL6), 'si può registrare un errore senza dire quale');
  /* E niente seed: nessun IBAN scritto dentro una migrazione. */
  deve(!/insert into public\.iam_conti/.test(SQL6), 'la migrazione scrive dei conti');
  return 'trigger, firma, motivo obbligatorio, zero seed';
});


/* ═══ FASE 1 — LA PARTITA DOPPIA (21/09/2026) ═══════════════════════════════ */

prova('i tre flag si compilano E si salvano: un campo mostrato e non letto non decide niente', () => {
  const b = blocco();
  /* Il difetto che questa prova esiste per prendere: una spunta disegnata nel
     modulo e mai letta dal salvataggio. Si vede, si clicca, e non cambia
     niente — ed è indistinguibile da un salvataggio che non funziona. */
  for (const [campo, colonna] of [['cnt-pagamento', 'e_mezzo_pagamento'], ['cnt-sospeso', 'e_conto_sospeso'], ['cnt-quadrabile', 'e_quadrabile']]) {
    deve(b.includes('id="' + campo + '"'), 'il modulo non mostra ' + campo);
    deve(new RegExp(colonna + ":\\s*!!document\\.getElementById\\('" + campo + "'\\)").test(b),
      colonna + ' si mostra e non si salva');
  }
  /* E si LEGGONO dalla riga: senza, bisogna aprire i conti uno per uno per
     sapere come sono configurati. */
  deve(/c\.e_mezzo_pagamento/.test(b) && /c\.e_conto_sospeso/.test(b) && /c\.e_quadrabile === false/.test(b),
    'i tre flag non si vedono nell\'elenco dei conti');
  return 'tre spunte mostrate, salvate e rilette';
});

prova('a chi si intesta un conto, e le due letture che possono cadere da sole', () => {
  const b = blocco();
  deve(/compagnia_id:\s*val\('cnt-compagnia'\)/.test(b), 'la compagnia non si salva');
  deve(/collaboratore_id:\s*val\('cnt-collaboratore'\)/.test(b), 'il collaboratore non si salva');
  /* I collaboratori arrivano dalla FONTE UNICA (§48): una seconda lettura qui
     vorrebbe dire due elenchi delle stesse persone, e quello sbagliato
     sarebbe quello che nessuno guarda. */
  deve(/CNT_PERSONE\s*=\s*\(await colCarica\(\)\)/.test(b), 'i collaboratori non vengono da colCarica');
  /* E stanno FUORI dalla Promise.all di conti e causali: una tendina che non
     si legge non deve spegnere la schermata (§35). */
  const car = b.slice(b.indexOf('async function cntCarica'), b.indexOf('function cntRender('));
  deve(!/quote_compagnie/.test(car.slice(0, car.indexOf('cntRender();'))), 'le compagnie stanno dentro la lettura che rilancia');
  deve(/CNT_INTEST_ERR/.test(b), 'non si distingue «non si è potuto leggere» da «non ce ne sono»');
  return 'due tendine che cadono da sole, e i collaboratori dalla fonte unica';
});

prova('i dodici conti minimi si PROPONGONO: li crea una persona, non una migrazione', () => {
  const b = blocco();
  const SQL1 = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260922_contab_partita_doppia.sql'), 'utf8')
    .split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
  /* Un conto è un posto dove stanno dei soldi, e ha un saldo. Dodici saldi a
     zero che nessuno ha deciso, dopo due settimane, sono dodici dati (§8.1). */
  deve(!/insert\s+into\s+public\.iam_conti/i.test(SQL1), 'la migrazione semina dei conti');
  deve(/Contabilita\.CONTI_MINIMI/.test(b), 'la proposta non legge i conti minimi dal motore');
  /* Solo quelli che MANCANO, e solo quelli SPUNTATI. */
  deve(/function cntMancanti\(/.test(b) && /cntMancanti\(\)/.test(b.replace('function cntMancanti(', '')), 'i conti già presenti si riproporrebbero');
  deve(/\.cnt-min:checked/.test(b), 'crea tutto invece di quello che è spuntato');
  /* Nascono senza data di dichiarazione del saldo: zero è anche un saldo
     vero, e la data è l'unica cosa che distingue «è zero» da «nessuno l'ha
     mai scritto» (§43). */
  const crea = b.slice(b.indexOf('async function cntCreaMinimi'), b.indexOf('function cntChiudi'));
  deve(!/saldo_dichiarato_il/.test(crea), 'i conti minimi nascono con un saldo dichiarato che nessuno ha dichiarato');
  /* E la porta resta chiusa a chi non scrive. */
  deve(/cntRenderMinimi\(puo\)/.test(b), 'la proposta si mostra anche a chi non può creare conti');
  return 'proposta, spuntata, senza data di dichiarazione';
});

prova('il genere di una causale si sceglie, si salva e si legge', () => {
  const b = blocco();
  deve(/Contabilita\.GENERI\.map/.test(b), 'la tendina del genere non legge il vocabolario del motore');
  deve(/genere:\s*val\('cnt-cgenere'\)/.test(b), 'il genere si mostra e non si salva');
  /* Il default è «manuale», come sul database: assente vuol dire «scritta a
     mano», non «errore». */
  deve(/val\('cnt-cgenere'\)\s*\|\|\s*'manuale'/.test(b), 'senza scelta il genere non ripiega su «manuale»');
  return 'sei generi dal motore, salvati, con il default del database';
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
