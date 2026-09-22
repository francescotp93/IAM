// ═══════════════════════════════════════════════════════════════════════════════
//  INCASSA UNA RATA — la schermata  (22/09/2026, Contabilità · Fase 2)
//
//  Le regole stanno nel motore condiviso `tariffe/motore/contabilita.js` e
//  hanno le loro prove in `server/verifica/contabilita.test.mjs`. Qui si
//  sorveglia che la schermata e la funzione del database:
//
//    · non scrivano MAI su quote_titoli, iam_movimenti o iam_incassi per conto
//      loro: una sola strada, la transazione del database. Due strade per
//      scrivere lo stesso fatto sono due contabilità della stessa agenzia;
//    · dicano che cosa manca PRIMA di far compilare — la causale, un conto che
//      riceve, un conto di debito verso la compagnia;
//    · non chiudano la differenza da sole;
//    · abbiano una chiave di idempotenza che nasce all'APERTURA e non al clic:
//      generata al clic, il secondo tentativo dopo un timeout ne avrebbe una
//      nuova e l'idempotenza non servirebbe a niente;
//    · siano raggiungibili: una linguetta senza inizializzatore è un riquadro
//      vuoto (§6b).
//
//  Queste prove leggono il SORGENTE: IAM non si apre in un browser nel banco.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

/* La migrazione che definisce le funzioni si cerca fra TUTTE: leggere per nome
   la prima vorrebbe dire sorvegliare il mondo di ieri il giorno in cui una
   correzione la sposta in un altro file (§55). */
const MIGR = path.join(RADICE, 'supabase', 'migrations');
function sqlChe(nome) {
  const file = fs.readdirSync(MIGR).filter(f => f.endsWith('.sql')).sort()
    .filter(f => fs.readFileSync(path.join(MIGR, f), 'utf8').includes('function public.' + nome + '('));
  if (!file.length) throw new Error('nessuna migrazione definisce ' + nome);
  return fs.readFileSync(path.join(MIGR, file[file.length - 1]), 'utf8');
}
/* Solo le righe di codice: un commento che NOMINA quello che sta vietando fa
   diventare rossa una prova su un codice giusto (§10, §12, §18, §26, §29). */
const soloSql = s => s.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function blocco() {
  const i = H.indexOf('/* ═══════════ INCASSA UNA RATA — Contabilità · Fase 2');
  deve(i >= 0, 'non trovo il blocco inca* in iam/index.html');
  const fine = H.indexOf('var INC_SOSPESI = [];', i);
  deve(fine > i, 'non trovo la fine del blocco inca*');
  return H.slice(i, fine);
}
/* Solo il codice, senza i commenti: la stessa trappola di sopra. */
const soloJs = s => s.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

prova('la schermata esiste, è raggiungibile e ha il suo inizializzatore', () => {
  deve(/id="ctab-incassa"/.test(H), 'manca la linguetta');
  deve(/id="contab-panel-incassa"/.test(H), 'manca il pannello');
  /* Quello che conta è che «incassa» sia NELL'elenco che accende i pannelli,
     non che sia il terzo: la prima stesura fissava la posizione, ed è
     diventata rossa il giorno in cui una linguetta nuova si è messa davanti —
     su un codice giusto. Si cerca la chiave dentro l'elenco. */
  const elenco = (H.match(/\[('[a-z]+',\s*)+'storico'\]\.forEach/) || [])[0] || '';
  deve(/'incassa'/.test(elenco),
    'la sotto-scheda non è nell\'elenco che accende i pannelli: la linguetta non spegnerebbe le altre');
  deve(/if \(sub==='incassa'\) incaApri\(\)/.test(H),
    'nessuno riempie il pannello: la linguetta aprirebbe un riquadro vuoto (§6b)');
  deve(/const contabSub = \[[^\]]*'incassa'/.test(H),
    'la sotto-scheda non è fra quelle che l\'indirizzo sa aprire');
  return 'linguetta, pannello, elenco e inizializzatore';
});

prova('la schermata NON scrive da sé: una strada sola, la transazione', () => {
  const b = soloJs(blocco());
  const vietate = ['quote_titoli', 'iam_movimenti', 'iam_movimenti_righe'];
  for (const t of vietate) {
    const scrive = new RegExp("from\\('" + t + "'\\)[^;]*\\.(insert|update|upsert|delete)\\(").test(b);
    deve(!scrive, 'la schermata scrive su ' + t + ' per conto suo: sono due strade per lo stesso fatto');
  }
  deve(!/from\('iam_incassi'\)[^;]*\.(insert|update|upsert|delete)\(/.test(b),
    'la schermata scrive l\'incasso senza passare dalla transazione');
  deve(/rpc\('iam_incasso_registra'/.test(b), 'non chiama la funzione che registra');
  deve(/rpc\('iam_incasso_storna'/.test(b), 'non c\'è la strada per stornare: «si storna» sarebbe una promessa non mantenuta');
  return 'nessuna scrittura diretta, due chiamate alla transazione';
});

prova('le righe le costruisce il MOTORE, non la schermata', () => {
  const b = soloJs(blocco());
  deve(/Contabilita\.righeIncasso\(/.test(b), 'la schermata non chiama il motore per le righe');
  deve(/Contabilita\.contoIncasso\(/.test(b), 'la somma non passa dal motore');
  deve(/Contabilita\.incassabile\(/.test(b), 'non chiede al motore se una rata si può incassare');
  deve(/Contabilita\.mezzoIncasso\(/.test(b), 'sceglie il mezzo da sé invece di chiederlo al motore');
  /* Una regola scritta nella schermata non si prova senza aprire un browser
     (§5): qui non ci devono essere né la somma né il verso a mano. */
  deve(!/dare:\s*\d/.test(b) && !/avere:\s*\d/.test(b),
    'ci sono righe Dare/Avere scritte a mano nella schermata');
  return 'righe, somma, incassabile e mezzo: tutto dal motore';
});

prova('la chiave di idempotenza nasce all\'APERTURA, non al clic', () => {
  const b = soloJs(blocco());
  deve(/INCA_CHIAVE = incaNuovaChiave\(\);/.test(b), 'la chiave non si genera');
  const apri = b.slice(b.indexOf('async function incaApri'), b.indexOf('async function incaLeggi'));
  deve(/INCA_CHIAVE = incaNuovaChiave\(\)/.test(apri),
    'la chiave non nasce quando si apre la schermata');
  const reg = b.slice(b.indexOf('async function incaRegistra'), b.indexOf('async function incaStorico'));
  deve(!/INCA_CHIAVE = incaNuovaChiave\(\)[^]*?rpc\('iam_incasso_registra'/.test(reg),
    'la chiave si rigenera PRIMA di registrare: il secondo tentativo ne avrebbe una nuova e farebbe due incassi');
  deve(/chiave_idempotenza: INCA_CHIAVE/.test(reg), 'la chiave non viene mandata');
  return 'una chiave per compilazione, non una per clic';
});

prova('si dice che cosa manca PRIMA di far compilare', () => {
  const b = blocco();
  deve(/function incaPronti/.test(b), 'manca il controllo di che cosa serve per incassare');
  for (const p of ['Incasso premi', 'modo di pagare', 'debito verso la compagnia']) {
    deve(b.includes(p), 'non dice che manca: ' + p);
  }
  deve(/Conti e causali/.test(b), 'non dice dove si sistema');
  deve(/non se ne inventa uno/.test(b), 'non dichiara che non si inventa il conto (§8.1)');
  return 'causale, conto che riceve, conto di debito — e dove si creano';
});

prova('«non si è potuto leggere» non è «non c\'è niente»', () => {
  const b = blocco();
  /* Senza la `i` questa prova cercava «non si è potuto leggere» e in schermata
     c'è «Non si è potuto leggere»: la trappola delle maiuscole di §23 e §43,
     che costa dieci minuti ogni volta. */
  const quante = (b.match(/non si è potuto legger|non si è potuto cercar/gi) || []).length;
  deve(quante >= 3, 'le letture che cadono non si dichiarano: trovate ' + quante + ' (§12, §18)');
  deve(/Non vuol dire che non ci sia/.test(b) || /non vuol dire che non ce ne siano/i.test(b),
    'un guasto della lettura si legge come «non c\'è niente»');
  deve(/function incaLeggi\(/.test(b),
    'le letture stanno in una Promise.all che cade tutta insieme: una colonna sbagliata spegne la schermata (§35)');
  return 'ogni lettura dichiara il suo guasto col suo nome';
});

prova('la registrazione è chiusa finché la differenza non è zero', () => {
  const b = soloJs(blocco());
  deve(/b\.disabled = !s\.quadra/.test(b),
    'il tasto «Registra» resta acceso con una differenza: si confermerebbe un incasso che non quadra');
  /* E la schermata dice DOVE si mette la differenza invece di chiuderla da
     sola: l'abbuono si vede nel movimento e nella quadratura. */
  deve(/Abbuoni/.test(blocco()) || /Abbuoni/.test(String(C.contoIncasso([{ importo: 2 }], [{ importo: 1 }]).motivo)),
    'non dice dove si mette la differenza');
  return 'tasto chiuso a differenza diversa da zero';
});

prova('la funzione del database: una transazione, idempotente, e niente update silenziosi', () => {
  const s = soloSql(sqlChe('iam_incasso_registra'));
  deve(/on conflict \(chiave_idempotenza\) do nothing/.test(s),
    'l\'idempotenza è un select seguito da un insert: due clic simultanei danno un errore su un incasso riuscito');
  deve(/and stato = 'aperto'/.test(s),
    'le rate si chiudono senza guardare che fossero aperte: si riscriverebbe un incasso già fatto');
  deve(/get diagnostics v_n = row_count/.test(s) && /se ne sono chiuse/.test(s),
    'un update che tocca zero righe passa per un successo (BUG 1, §47)');
  deve(/iam_movimento_registra\(/.test(s),
    'scrive il movimento per conto suo invece di passare dall\'unica funzione che lo fa');
  deve(/security invoker/.test(s),
    'la funzione scavalca le politiche: sarebbe una seconda regola su chi può incassare');
  /* Le righe le costruisce il motore, ma il pacchetto si controlla: il Dare
     deve essere quello dei pagamenti e l'Avere quello delle rate. */
  deve(/non corrispondono ai pagamenti/.test(s) && /non corrispondono alle rate/.test(s),
    'nessuno controlla che le righe dicano la stessa cosa dei pagamenti e delle rate');
  return 'on conflict, stato=aperto, row_count, movimento unico, invoker';
});

prova('lo storno riapre la rata e dimentica chi l\'aveva incassata', () => {
  const s = soloSql(sqlChe('iam_incasso_storna'));
  deve(/stato = 'aperto'/.test(s) && /incassato_il = null/.test(s),
    'la rata resta chiusa dopo lo storno: il portafoglio direbbe che il cliente ha pagato');
  deve(/pagatore_tipo = null/.test(s) && /pagatore_collaboratore_id = null/.test(s),
    'la rata riaperta ricorda ancora chi l\'aveva incassata: l\'estratto conto pagherebbe una provvigione su un incasso che non c\'è più');
  deve(/storno_di_movimento_id/.test(s), 'lo storno non punta al movimento originale');
  deve(/Uno storno senza motivo/.test(sqlChe('iam_incasso_storna')),
    'si storna senza dire perché');
  deve(/attiva = false/.test(s),
    'le righe dell\'incasso stornato restano attive: quella rata non si potrebbe più incassare');
  return 'rata riaperta, pagatore azzerato, motivo obbligatorio';
});

prova('«da portare in contabilità» non conta due volte le rate della Fase 2', () => {
  /* Un incasso di tre rate scrive UN movimento, che in testata può portarne
     una: le altre due sarebbero risultate da portare, e un clic avrebbe fatto
     nascere un secondo debito verso la compagnia. */
  const i = H.indexOf('function incDaPortare');
  const b = H.slice(i, i + 1200);
  deve(/INC_MOV_RIGHE/.test(b), 'non guarda le righe del movimento, solo la testata');
  deve(/INC_FASE2/.test(b), 'non guarda le rate degli incassi della Fase 2');
  /* Le due letture ci devono essere. Si cerca la CHIAMATA con la sua
     condizione, tollerando gli a capo: una prova che pretende una catena
     scritta tutta su una riga dichiara rotto un codice giusto il giorno in
     cui qualcuno la manda a capo \u2014 e allora si aggiorna il numero invece
     della regola. */
  deve(/iam_movimenti_righe'\)\s*\.select\('movimento_id,titolo_id'/.test(H),
    'le righe dei movimenti non si leggono');
  deve(/iam_incassi_rate'\)\s*\.select\('titolo_id'\)\s*\.eq\('attiva',\s*true\)/.test(H),
    'le rate degli incassi vivi non si leggono');
  /* E devono essere PAGINATE. PostgREST ne manda mille per richiesta: una
     lettura di controllo troncata fa comparire fra le \u00abda portare\u00bb una rata
     che in contabilit\u00e0 c'\u00e8 gi\u00e0, e un clic la registrerebbe due volte. */
  /* La fetta si taglia alla funzione DOPO, non a un numero di caratteri: una
     fetta \u00abtremila caratteri\u00bb si mangia il codice del vicino, e la prova
     accusa incCarica di un limit che non \u00e8 suo (\u00a712, \u00a734). */
  const daQui = H.indexOf('async function incCarica');
  const fin = H.indexOf('\nfunction ', daQui);
  const car = H.slice(daQui, fin > daQui ? fin : daQui + 3000)
    /* E si guardano solo le righe di CODICE: un commento che nomina il tetto
       che si e' appena tolto farebbe diventare rossa questa prova su un
       codice corretto. Mai una regex globale sui commenti, che su un file da
       un megabyte si mangia meta' del documento (\u00a712). */
    .split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');
  deve(!/\.limit\(/.test(car), 'incCarica ha ancora un limit: un tetto secco perde righe in silenzio');
  deve((car.match(/cntTutte\(|cntMorbida\(/g) || []).length >= 5,
    'le letture di incCarica non passano tutte dal lettore paginato');
  return 'testata, righe e incassi: tutti e tre';
});

console.log('\n══ INCASSA UNA RATA (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nINCASSA UNA RATA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
