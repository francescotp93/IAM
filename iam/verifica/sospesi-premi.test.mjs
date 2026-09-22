// ═══════════════════════════════════════════════════════════════════════════════
//  I SOSPESI E LE MODALITÀ DI PAGAMENTO  (22/09/2026)
//
//  Richiesta di Francesco: una voce di pagamento può essere un COLLABORATORE,
//  e una sezione «Sospesi» deve mostrare, divise per chi li tiene, le polizze
//  da andare a incassare.
//
//  Le regole stanno nel motore (`Contabilita.daIncassare`, `vocabolario`) e
//  hanno le loro prove in `server/verifica/contabilita.test.mjs`. Qui si
//  sorveglia la schermata e la migrazione:
//
//    · il vocabolario è UNA tabella, non sei liste nel codice;
//    · una voce che è una persona non può essere «denaro in casa subito»;
//    · le nove voci di partenza non si cancellano: ci sono appese migliaia di
//      righe fra polizze e rate;
//    · la schermata non ricalcola le regole per conto suo, e non scrive
//      l'incasso: quello lo fa la Fase 2, che è già provata;
//    · «non si è potuto leggere» non diventa «non ce n'è» (§12, §18);
//    · due caricamenti insieme non sommano i contatori (§63-bis).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const Q = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const MIGR = path.join(RADICE, 'supabase', 'migrations');
function sqlChe(pezzo) {
  const file = fs.readdirSync(MIGR).filter(f => f.endsWith('.sql')).sort()
    .filter(f => fs.readFileSync(path.join(MIGR, f), 'utf8').includes(pezzo));
  if (!file.length) throw new Error('nessuna migrazione contiene ' + pezzo);
  return fs.readFileSync(path.join(MIGR, file[file.length - 1]), 'utf8');
}
const soloSql = s => s.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
const soloJs = s => s.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ═══ I SOSPESI: I PREMI CHE QUALCUNO TIENE (22/09/2026)');
  deve(i >= 0, 'non trovo il blocco spr* in iam/index.html');
  const fine = H.indexOf('/* ═══ LE MODALITÀ DI PAGAMENTO (22/09/2026)', i);
  deve(fine > i, 'non trovo la fine del blocco spr*');
  return soloJs(H.slice(i, fine));
}

/* ═══ LA MIGRAZIONE ════════════════════════════════════════════════════════ */

prova('una voce che è una PERSONA non può essere «denaro in casa subito»', () => {
  /* Se il premio ce l'ha in mano il collaboratore, in cassa dell'agenzia non
     c'è: è un vincolo del database, non una raccomandazione della schermata —
     la schermata è una delle strade, non l'unica. */
  const sql = soloSql(sqlChe('iam_modalita_pagamento'));
  deve(/collaboratore_id is null or contabilizza = 'sospeso'/.test(sql),
    'manca il vincolo che vieta a un collaboratore di essere «subito»');
  deve(/unique index[\s\S]{0,120}collaboratore_id/.test(sql),
    'due voci per la stessa persona sarebbero due elenchi di sospesi, nessuno completo');
  return 'CHECK nel database, e una persona sola per voce';
});

prova('il vincolo CHIUSO a nove valori è diventato una chiave esterna', () => {
  /* Con un CHECK, «Oddo Francesco» non si può nemmeno scrivere. Con la chiave
     esterna il codice deve esistere davvero, e `on delete restrict` impedisce
     di cancellare una voce che ha delle righe appese: «non si cancella, si
     spegne» (§26) smette di essere una raccomandazione. */
  const sql = soloSql(sqlChe('quote_titoli_mezzo_fk'));
  deve(/drop constraint if exists quote_titoli_mezzo_pagamento_check/.test(sql),
    'il CHECK a nove valori è ancora lì: una voce nuova non si potrebbe scrivere');
  deve(/drop constraint if exists quote_polizze_mezzo_pagamento_check/.test(sql), 'idem sulle polizze');
  const fk = (sql.match(/references public\.iam_modalita_pagamento\(codice\)/g) || []).length;
  deve(fk === 2, 'le chiavi esterne dovrebbero essere due (rate e polizze): ' + fk);
  deve(/on delete restrict/.test(sql), 'una voce in uso si potrebbe cancellare');
  /* Senza indice, cancellare una voce leggerebbe per intero migliaia di righe. */
  deve(/quote_titoli_mezzo_idx/.test(sql) && /quote_polizze_mezzo_idx/.test(sql),
    'mancano gli indici sulle colonne che puntano alla tabella');
  return 'CHECK via, due chiavi esterne, due indici';
});

prova('le nove voci di partenza si spengono, non si cancellano', () => {
  const sql = soloSql(sqlChe('iam_modalita_no_delete_sistema'));
  deve(/di_sistema/.test(sql), 'il trigger non guarda se la voce è di sistema');
  deve(/before delete on public\.iam_modalita_pagamento/.test(sql), 'il divieto non è un trigger');
  /* E il seme dice il verso che il motore dichiara da sempre: i contanti sono
     denaro in mano, tutto il resto arriva dopo. Nessun valore inventato. */
  /* Si contano le voci del SEME, non le occorrenze nel file: la parola
     compare anche nel vincolo che elenca i valori ammessi, e una prova che
     conta lì dichiara rotto un seme giusto. */
  const i = sql.indexOf('insert into public.iam_modalita_pagamento');
  deve(i > 0, 'non trovo il seme delle voci di partenza');
  const seme = sql.slice(i, sql.indexOf('on conflict', i));
  const semeSubito = (seme.match(/'subito'/g) || []).length;
  deve(semeSubito === 1, 'più di una voce di partenza è «subito»: solo i contanti lo sono (' + semeSubito + ')');
  deve(/'contante',\s*'Contanti',\s*'subito'/.test(sql), 'i contanti non sono la voce «subito»');
  return '1 sola voce «subito», e il divieto è un trigger';
});

prova('chi legge il vocabolario e chi lo scrive', () => {
  /* Leggere: chiunque abbia un accesso — le tendine che lo usano stanno anche
     nel preventivatore, e tenerlo allo staff vorrebbe dire una tendina vuota
     per un collaboratore (§39). Scrivere: l'admin, perché qui si decide se un
     premio finisce in cassa o in mano a una persona (§26). */
  const sql = soloSql(sqlChe('mod_select on public.iam_modalita_pagamento'));
  deve(/for select to authenticated using \(true\)/.test(sql), 'la lettura non è di tutti');
  deve(/mod_write[\s\S]{0,160}iam_is_admin\(\)/.test(sql), 'la scrittura non è riservata all\'admin');
  return 'tutti leggono, l\'admin scrive';
});

/* ═══ LA SCHERMATA DEI SOSPESI ═════════════════════════════════════════════ */

prova('la schermata non rifà le regole: chiama il motore', () => {
  const b = blocco();
  deve(/Contabilita\.daIncassare\(/.test(b), 'la schermata non chiama il motore');
  /* Nessun raggruppamento fatto a mano: due regole su chi tiene i premi
     sarebbero due elenchi che un giorno direbbero cose diverse (§5). */
  deve(!/mezzo_pagamento\s*===\s*'contante'/.test(b),
    'la schermata decide da sé che cosa è denaro in casa');
  return 'le regole stanno nel motore';
});

prova('la schermata NON scrive l\'incasso: manda dove si scrive', () => {
  /* «Scaricare» un sospeso è registrare l'incasso, e quella schermata esiste
     già (Fase 2): si sceglie il conto e anche un mezzo diverso da quello
     dichiarato. Rifare qui la scrittura sarebbe la seconda regola su come
     nasce un movimento. */
  const b = blocco();
  ['quote_titoli', 'iam_movimenti', 'iam_incassi'].forEach(t => {
    deve(!new RegExp("from\\('" + t + "'\\)[\\s\\S]{0,200}\\.(update|insert|upsert|delete)\\(").test(b),
      'la schermata dei sospesi scrive su ' + t);
  });
  deve(/selContabTab\('incassa'\)/.test(b), 'il tasto «Incassa» non porta dove si incassa');
  return 'legge e manda, non scrive';
});

prova('«non si è potuto leggere» non diventa «non ce n\'è»', () => {
  /* §12, §18: su una lista di soldi da incassare, un elenco vuoto su un
     guasto di lettura è la bugia peggiore. */
  const b = blocco();
  deve(/non vuol dire che non ce ne siano/.test(b), 'un guasto di lettura non si dichiara');
  deve(/SPR_PARZIALE/.test(b), 'non si accorge se la lettura si è fermata a metà');
  deve(/cntTutte\(/.test(b), 'la lettura non è paginata: il server ne manda mille per volta (§50)');
  deve(!/\.limit\(/.test(b), 'c\'è ancora un limite scritto a mano');
  deve(/\.order\(/.test(b), 'la lettura paginata non ha un ordine stabile (§63-bis)');
  return 'paginata, ordinata, e la mancanza dichiarata';
});

prova('due caricamenti insieme non sommano i contatori', () => {
  /* §63-bis: `selContabTab` ne fa partire uno, e chi preme «Aggiorna» mentre
     il primo legge ne fa partire un secondo. */
  const b = blocco();
  deve(/SPR_GIRO/.test(b), 'i giri non sono numerati');
  deve(/mio !== SPR_GIRO/.test(b), 'un giro vecchio può ancora scrivere in schermata');
  return 'ogni giro prende un numero';
});

prova('la linguetta ha il suo inizializzatore', () => {
  /* §6b: una schermata il cui contenuto lo scrive il codice, senza
     inizializzatore, apre un riquadro vuoto. */
  deve(/if \(sub==='sospesi'\) sprCarica\(\);/.test(H), 'la linguetta Sospesi non carica niente');
  /* E il caricamento da file resta, dichiarato: una schermata in uso non si
     spegne perché ne è nata una migliore (§17, §33). */
  deve(/Sospesi caricati da file/.test(H), 'il caricamento da file è stato spento');
  deve(/loadSospesi\(this\)/.test(H), 'il caricamento da file è stato cancellato');
  return 'la linguetta carica, e il file resta';
});

prova('lo stato è `var`, perché le prove lo iniettano', () => {
  /* §17, §32: con `let` la variabile del blocco e `window.X` sono due cose
     diverse, e una prova che inietta dati finti resterebbe verde senza aver
     misurato niente. */
  ['SPR_RATE', 'SPR_ESITO', 'SPR_ERR', 'SPR_GIRO', 'CNT_MODALITA'].forEach(n => {
    deve(new RegExp('var ' + n + '\\b').test(H), n + ' non è dichiarata con var');
  });
  return 'cinque variabili di stato, tutte var';
});

/* ═══ LE VOCI IN QUOTO ═════════════════════════════════════════════════════ */

prova('le tendine del preventivatore leggono la TABELLA, non una lista chiusa', () => {
  /* Il vocabolario era scritto in sei posti: il CHECK del database, due liste
     nel motore e tre nella pagina. Una voce che si aggiunge toccando sei posti
     è una voce che nessuno aggiunge. */
  const j = soloJs(Q);
  deve(/function mezCarica\(/.test(j), 'QUOTO non legge il vocabolario');
  deve(/from\('iam_modalita_pagamento'\)/.test(j), 'QUOTO non legge la tabella');
  /* Le tendine dove si SCEGLIE devono passare da `mezElenco`: una lista
     scritta a mano non conosce i collaboratori. */
  deve(/mezElenco\(p\.mezzo_pagamento\)/.test(j), 'la scheda del pagamento ha ancora una lista chiusa');
  deve(/function pnuOpzioniMezzo\(\)[\s\S]{0,400}mezElenco\(\)/.test(j),
    '«Nuova polizza» ha ancora una lista chiusa');
  /* E nel markup non devono restare opzioni scritte a mano per la barra dei
     titoli: erano nove, e i collaboratori non c'erano. */
  deve(!/<select id="tit-mezzo"/.test(Q), 'la barra dei titoli ha ancora una tendina scritta nel markup');
  return 'tre tendine sul vocabolario, zero opzioni nel markup';
});

prova('quello che si scrive e non è una voce NON diventa un codice inventato', () => {
  /* §8.1: un nome che non corrisponde a niente resta vuoto, e chi salva lo
     dice. Scriverlo come codice vorrebbe dire una riga di portafoglio che
     punta a una voce che non esiste — e la chiave esterna la rifiuterebbe,
     con un messaggio che nessuno può interpretare. */
  const j = soloJs(Q);
  deve(/function mezScegli\(/.test(j), 'manca la funzione che traduce quello che si scrive');
  deve(/h\.value = m \? m\.k : '';/.test(j), 'un nome che non corrisponde a niente diventa un codice');
  deve(/non è una voce dichiarata/.test(Q), 'salvando non si dice che quel nome non esiste');
  return 'niente voce, niente codice, e lo dice';
});

prova('il vocabolario ha un ripiego: una tendina vuota è peggio di una corta', () => {
  /* Se la tabella non è ancora stata letta — o se la lettura non riesce — le
     nove voci di sempre si vedono lo stesso. E il ripiego NON passa da
     `mezNome`, che chiamerebbe se stesso all'infinito. */
  const j = soloJs(Q);
  deve(/function mezElenco\(/.test(j), 'manca l\'elenco delle voci');
  deve(/return Object\.keys\(TIT_MEZZI\)\.map\(k => \(\{ k, l: TIT_MEZZI\[k\] \}\)\)/.test(j),
    'il ripiego non usa il seme, oppure passa da mezNome e si richiama all\'infinito');
  deve(/MEZ_ERR/.test(j), 'un guasto di lettura del vocabolario non si dichiara');
  return 'nove voci di sempre quando la tabella non risponde';
});

console.log('\n══ SOSPESI E MODALITÀ ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSOSPESI E MODALITÀ: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
