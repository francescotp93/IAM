// ═══════════════════════════════════════════════════════════════════════════════
//  GESTIONE COMPAGNIE E PANNELLO PROVVIGIONI  (20/09/2026, brief #02 · M2)
//
//  L'aritmetica non si sorveglia qui: sta nel motore condiviso
//  `tariffe/motore/provvigioni.js` e ha le sue dodici prove in
//  `server/verifica/provvigioni.test.mjs`. Qui si sorveglia che le DUE
//  schermate:
//
//    · chiedano al motore invece di rifarne le regole (§5: una formula dentro
//      una schermata non si puo' provare senza aprire un browser);
//    · NON aggiornino mai una percentuale in posto. Questa e' la cosa che, se
//      si rompe, non si vede: gli estratti conto gia' mandati sono documenti
//      su cui si e' litigato, e devono continuare a dire lo stesso numero.
//      Modificare vuol dire CHIUDERE la riga vigente (`al` = ieri) e APRIRNE
//      una nuova da oggi;
//    · chiudano la porta a chi non deve decidere di soldi — e che il cancello
//      vero stia nel database, non nel bottone nascosto;
//    · non confondano «non si e' potuto leggere» con «non ce n'e'» (§12, §18);
//    · siano raggiungibili: una pagina senza voce di menu e senza riga in
//      `goTab` e' un riquadro vuoto (§6b).
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
const SQL = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_b02_m2_provvigioni.sql'), 'utf8');
const require = createRequire(import.meta.url);
const P = require(path.join(RADICE, 'tariffe', 'motore', 'provvigioni.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il motore e\' quello CONDIVISO, caricato dal preventivatore e non copiato', () => {
  /* Si cerca il TAG, non la stringa: `tariffe/motore/provvigioni.js` compare
     anche nei commenti del blocco, e una prova che cercasse la parola
     resterebbe verde anche con una copia locale. E' la trappola gia' presa
     quattro volte (§10, §12, §18, §26). */
  const tag = /<script src="\/nuovo-preventivo\/tariffe\/motore\/provvigioni\.js\?v=[^"]+"><\/script>/;
  deve(tag.test(H), 'IAM non carica il motore condiviso delle provvigioni con un tag <script src>');
  deve(fs.existsSync(path.join(RADICE, 'tariffe', 'motore', 'provvigioni.js')),
    'il file del motore non c\'e\' dove l\'indirizzo lo manda a prendere');
  deve(!fs.existsSync(path.join(QUI, '..', 'tariffe')), 'esiste una copia dei motori dentro iam/');
  return 'un file solo, dal preventivatore';
});

prova('le regole NON sono riscritte nelle schermate: le chiedono al motore', () => {
  const b = blocco();
  for (const f of ['Provvigioni.calcola', 'Provvigioni.copertura', 'Provvigioni.vigenti',
                   'Provvigioni.numero', 'Provvigioni.euro', 'Provvigioni.perc',
                   'Provvigioni.oggiIso', 'Provvigioni.RAMI']) {
    deve(b.includes(f), 'il pannello non chiama ' + f);
  }
  /* E non si e' portato dietro le formule. Le due che qui verrebbero da
     scrivere a mano sono la quota (provvigione x percentuale / 100) e il
     margine (per differenza): entrambe, scritte in pagina, direbbero un
     numero che l'estratto conto poi non conferma. */
  deve(!/\/\s*100/.test(b), 'una percentuale e\' applicata a mano nel pannello invece che dal motore');
  deve(!/margine_agenzia\s*=/.test(b), 'il margine dell\'agenzia e\' ricalcolato nel pannello');
  return '8 chiamate al motore, zero formule in pagina';
});

prova('MODIFICARE UNA PERCENTUALE NON E\' UN UPDATE: si chiude e si riapre', () => {
  const b = blocco();
  /* La cosa che questo file esiste per sorvegliare. Un `update` che tocca
     `aliquota_agenzia` o `retrocessione` riscriverebbe il passato: gli
     estratti conto gia' mandati comincerebbero a dire un altro numero, e
     nessuno se ne accorgerebbe finche' un collaboratore non contesta. */
  for (const [fn, tab] of [['prvSalvaTariffa', 'iam_provvigioni_tariffa'],
                           ['prvSalvaOverride', 'iam_provvigioni_collaboratore']]) {
    const f = funzione(b, fn);
    /* Nel ramo della modifica: un solo update, e chiude soltanto. */
    const updates = [...f.matchAll(/\.update\(\{([^}]*)\}\)/g)].map(m => m[1]);
    deve(updates.length === 1, fn + ' fa ' + updates.length + ' update: dovrebbe solo chiudere la riga vigente');
    deve(/^\s*al:\s*prvIeri\(\)\s*$/.test(updates[0]),
      fn + ' aggiorna qualcosa che non e\' la chiusura della riga: ' + updates[0].trim());
    /* E la riga nuova nasce da oggi, con un insert su quella tabella. */
    deve(new RegExp('\\.from\\(\'' + tab + '\'\\)\\.insert\\(riga\\)').test(f),
      fn + ' non apre una riga nuova su ' + tab);
    deve(/dal:\s*prvOggi\(\)/.test(f), fn + ' apre la riga nuova senza dire da quando vale');
  }
  /* Togliere qualcuno da un gruppo e' la stessa cosa: la produzione di ieri
     e' stata fatta dentro quel gruppo, e l'estratto conto di ieri deve
     continuare a dirlo. Quindi si chiude, non si cancella. */
  const tm = funzione(b, 'prvTogliMembro');
  deve(/\.update\(\{ al: prvOggi\(\) \}\)/.test(tm), 'togliere un membro non chiude la riga');
  deve(!/\.delete\(\)/.test(tm), 'togliere un membro CANCELLA la riga: la storia del gruppo sparisce');
  /* E in tutto il blocco non si cancella niente da nessuna delle quattro
     tabelle: la storia delle percentuali non si butta. */
  deve(!/\.delete\(\)/.test(b), 'da qualche parte nel pannello si cancella una riga invece di chiuderla');
  return 'chiudi (al=ieri) + riapri (dal=oggi), mai un update sulle percentuali';
});

prova('il cancello dell\'admin esiste ED E\' CHIAMATO', () => {
  const b = blocco();
  deve(/function prvPuoScrivere\(\)\s*{\s*return PROFILO\?\.ruolo === 'admin'/.test(b), 'manca prvPuoScrivere');
  /* §1: una funzione di controllo che non chiama nessuno non controlla
     niente. Qui si decide a chi vanno dei soldi: e' la stessa soglia dei
     codici collaboratore (§19) e dei conti (§26). */
  const usi = (b.match(/prvPuoScrivere\(\)/g) || []).length;
  deve(usi >= 3, 'prvPuoScrivere e\' chiamata solo ' + usi + ' volte: il cancello e\' decorativo');
  deve(/function prvApri\([^)]*\)\s*{\s*\n?\s*if \(!prvPuoScrivere\(\)\) return;/.test(b),
    'la finestra si apre anche a chi non puo\' scrivere');
  /* E il cancello VERO e' nel database. Il bottone nascosto serve solo a non
     mostrare la porta. */
  for (const t of ['provv_tariffa', 'provv_collab', 'gruppi', 'gruppi_membri']) {
    deve(new RegExp('create policy ' + t + '_write[\\s\\S]{0,240}iam_is_admin\\(\\)').test(SQL),
      'la scrittura su ' + t + ' non e\' chiusa all\'admin nelle politiche');
  }
  deve(/create policy provv_tariffa_select[\s\S]{0,200}iam_is_staff\(\)/.test(SQL),
    'la lettura delle tariffe non e\' chiusa allo staff');
  return 'bottone + finestra + RLS sulle quattro tabelle';
});

prova('le due porte esistono: menu, titolo e riga in goTab', () => {
  /* §6b: una pagina senza inizializzatore apre un riquadro vuoto. */
  deve(/if \(t === 'compagnie'\)\s*{\s*prvCarica\(true\);/.test(H), 'goTab non avvia il pannello compagnie');
  deve(/if \(t === 'provvigioni'\)\s*{\s*prvTab\(PRV_VISTA\); prvCarica\(true\);/.test(H), 'goTab non avvia il pannello provvigioni');
  deve(/id="panel-compagnie"/.test(H) && /id="panel-provvigioni"/.test(H), 'manca uno dei due pannelli');
  for (const k of ['compagnie', 'provvigioni']) {
    deve(new RegExp(k + ':\\s*\\(\\) => !!PERMESSI\\[PROFILO\\?\\.ruolo\\]\\?\\.conto').test(H),
      'il pannello ' + k + ' non e\' fra le sezioni riservate');
    deve(new RegExp("act: '" + k + "', go: function\\(\\)\\{ vai\\('" + k + "'\\); \\}").test(SCOCCA),
      'la scocca non ha la voce ' + k);
    deve(new RegExp(k + ":\\s*\\['[^']+', 'Strumenti'\\]").test(SCOCCA),
      'la scocca non ha il titolo della pagina ' + k);
    deve(new RegExp(k + ": 'strumenti'").test(SCOCCA), k + ' non e\' agganciata al menu Strumenti');
  }
  return 'due voci, due titoli, TAB2MENU, goTab, RISERVATE';
});

prova('«non si e\' potuto leggere» non diventa «non ce ne sono»', () => {
  const b = blocco();
  /* La stessa regola del registro (§18), del contatore documentale (§12) e
     dei conti (§26): un elenco vuoto su un errore farebbe credere che non
     esistano accordi — e qui vorrebbe dire far credere che non si debba
     niente a nessuno. */
  deve(/non vuol dire che non ce ne siano/.test(b), 'l\'errore di lettura si confonde con l\'elenco vuoto');
  deve(/class="cnt-err"/.test(b), 'l\'errore non si vede');
  /* E l'avviso arriva in TUTTI i contenitori: le sette letture partono
     insieme e cadono insieme, quindi una linguetta lasciata su «Carico…»
     resterebbe li' per sempre. E' il difetto gia' corretto sui conti. */
  deve(/\['prv-tariffe', 'prv-override', 'prv-gruppi'\]\.forEach/.test(b),
    'l\'avviso di errore non raggiunge tutte e tre le liste');
  return 'tre contenitori, due messaggi diversi per due cose diverse';
});

prova('la COPERTURA guarda il portafoglio vero, e la sua assenza non blocca il resto', () => {
  const b = blocco();
  /* Senza le polizze chi configura scrive le tariffe a memoria. Ma la lettura
     delle polizze e' l'unica delle sette che puo' mancare senza rendere la
     schermata inutile: se cade si tace su quella sezione, non si perde tutto. */
  deve(/db\.from\('quote_polizze'\)/.test(b), 'la copertura non legge il portafoglio');
  deve(/PRV_POLIZZE = po\.error \? \[\] : \(po\.data \|\| \[\]\)/.test(b),
    'un errore sulle polizze fa cadere anche le tariffe');
  deve(/Provvigioni\.copertura\(/.test(b), 'la copertura e\' calcolata in pagina');
  /* E il motore la calcola davvero: una compagnia scritta come la scrive la
     polizza («HDI Assicurazioni») deve ritrovare la sua tariffa («HDI»)
     passando dagli alias del catalogo. E' il difetto che la prova del motore
     ha trovato, e che qui si controlla che non torni per la porta di dietro. */
  const cop = P.copertura(
    [{ compagnia: 'HDI Assicurazioni', modulo: 'rcauto' }],
    [{ compagnia: 'HDI', ramo: 'rcauto', aliquota_agenzia: 12, dal: '2026-01-01' }],
    { catalogo: [{ nome: 'HDI', alias: ['HDI Assicurazioni'] }], data: '2026-09-20' }
  );
  deve(cop.length === 1 && cop[0].coperta, 'il motore non risolve l\'alias della compagnia nella copertura');
  return 'portafoglio letto, alias risolti, errore che non contagia';
});

prova('la storia di una tariffa sta nel registro unico', () => {
  const b = blocco();
  deve(/logMovimento\('Tariffa /.test(b), 'toccare una tariffa non lascia traccia');
  deve(/logMovimento\('Accordo provvigionale/.test(b), 'toccare un accordo non lascia traccia');
  deve(/logMovimento\('Tolto dal gruppo/.test(b), 'togliere qualcuno da un gruppo non lascia traccia');
  /* E i due tipi nuovi esistono nel vocabolario del motore del registro: un
     tipo che il motore non conosce non si aggancia a niente (§18). */
  const R = require(path.join(RADICE, 'tariffe', 'motore', 'registro.js'));
  deve(R.VOCI.tariffa && R.VOCI.tariffa.tabella === 'iam_provvigioni_tariffa', 'il registro non conosce il tipo «tariffa»');
  deve(R.VOCI.gruppo && R.VOCI.gruppo.tabella === 'iam_gruppi', 'il registro non conosce il tipo «gruppo»');
  return 'tracce sulle tre cose + due tipi nel vocabolario';
});

prova('una persona non puo\' stare in due gruppi vivi, e lo dice il DATABASE', () => {
  /* Se ci stesse, l'indiretto si pagherebbe due volte sulla stessa rata: due
     capi gruppo, la stessa produzione. La schermata gia' toglie dalla tendina
     chi e' occupato, ma la schermata e' UNA delle strade (c'e' la console,
     c'e' PostgREST): il divieto sta nell'indice unico. */
  deve(/create unique index if not exists iam_gruppi_membri_uno_solo[\s\S]{0,200}where al is null/.test(SQL),
    'niente indice unico: una persona puo\' stare in due gruppi vivi');
  const b = blocco();
  deve(/occupati\[m\.collaboratore_id\] = true/.test(b), 'la tendina propone anche chi e\' gia\' in un altro gruppo');
  /* E il motore non paga l'indiretto al capo sulla sua stessa produzione. */
  const g = [{ id: 'g1', capo_id: 'capo', indiretto: 5, dal: '2026-01-01' }];
  const m = [{ gruppo_id: 'g1', collaboratore_id: 'capo', dal: '2026-01-01' }];
  deve(P.indirettoPer(g, m, { collaboratore_id: 'capo', data: '2026-09-20' }).perc == null,
    'il capo gruppo prende l\'indiretto sulla propria produzione');
  return 'indice unico + tendina + motore';
});

prova('il simulatore non salva niente, e lo dice', () => {
  const b = blocco();
  const f = funzione(b, 'prvSimula');
  deve(!/db\.from\(/.test(f), 'il simulatore scrive nel database');
  /* Il testo sta nel MARKUP del pannello, non nel blocco JS: si cerca dov'e'
     scritto, non dove sarebbe comodo cercarlo. */
  deve(/Non salva niente/.test(H.slice(H.indexOf('id="panel-provvigioni"'), H.indexOf('id="panel-provvigioni"') + 6000)),
    'la schermata non dice che il simulatore non salva');
  /* E mostra il PERCHE', non solo il numero: l'accettazione del brief chiede
     di vedere chi prende che cosa e da quale regola. */
  deve(/fonte_retrocessione === 'collaboratore' \? 'accordo suo' : 'default della tariffa'/.test(f),
    'il simulatore non dice da quale accordo viene la percentuale');
  deve(/r\.stimata \?/.test(f), 'il simulatore non distingue la provvigione dichiarata da quella prevista');
  return 'nessuna scrittura, e il perche\' accanto al numero';
});

/* ─────────────────────────────────────────────────────────────────────────── */
function blocco() {
  const i = H.indexOf('/* ══ TARIFFE, ACCORDI E GRUPPI (brief #02 · M2');
  deve(i >= 0, 'non trovo il blocco prv* in iam/index.html');
  const fine = H.indexOf('function initDB()', i);
  return H.slice(i, fine < 0 ? H.length : fine);
}

/* Il corpo di una funzione, dalla sua intestazione alla prima graffa a inizio
   riga. Si cerca la CHIAMATA e non la parola: un commento che nomina un
   difetto fa scattare una prova che cerca la stringa (§10, §12, §18). */
function funzione(testo, nome) {
  const i = testo.indexOf('function ' + nome + '(');
  deve(i >= 0, 'manca ' + nome);
  const fine = testo.indexOf('\n}\n', i);
  return testo.slice(i, fine < 0 ? testo.length : fine);
}

console.log('\n══ COMPAGNIE E PROVVIGIONI (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCOMPAGNIE E PROVVIGIONI (IAM): ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
