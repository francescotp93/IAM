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
  /* Dal 21/09/2026 la schermata compagnie legge anche l'anagrafica: la
     avvia gcCarica, che chiama prvCarica e catCarica insieme. */
  deve(/if \(t === 'compagnie'\)\s*{\s*gcCarica\(true\);/.test(H), 'goTab non avvia il pannello compagnie');
  deve(/async function gcCarica\([^)]*\)\s*{[\s\S]{0,600}prvCarica\(\)[\s\S]{0,40}catCarica\(\)/.test(H), 'gcCarica non legge tariffe e anagrafica');
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

prova('Gestione compagnie: si entra dalla compagnia, non dalla tariffa', () => {
  /* Richiesta del 21/09/2026: in alto «Nuova compagnia», non «Nuova
     tariffa»; dalla compagnia si arriva a prodotti e provvigioni; le
     compagnie esistenti si modificano. */
  const i = H.indexOf('id="panel-compagnie"'), j = H.indexOf('<!-- ══ PANNELLO PROVVIGIONI');
  deve(i > 0 && j > i, 'non trovo il pannello compagnie');
  const pan = H.slice(i, j);
  deve(!/Nuova tariffa/.test(pan), 'il pannello mostra ancora «Nuova tariffa»');
  deve(/id="gc-nuova" onclick="gcNuova\(\)"[^>]*>.*Nuova compagnia/.test(pan), 'manca il bottone «Nuova compagnia»');
  deve(/function gcNuova\(\)\s*{\s*if \(gcPuoScrivere\(\)\) catApriAnagrafica\(null\);/.test(H), '«Nuova compagnia» non apre l\'anagrafica');
  /* Ogni riga dell'elenco ha «Modifica», e la scheda ha «Modifica dati». */
  const el = H.slice(H.indexOf('function gcElenco('), H.indexOf('function gcScheda('));
  deve(/catApriAnagrafica\(\\'' \+ c\.id/.test(el), 'le compagnie dell\'elenco non si modificano');
  const sc = H.slice(H.indexOf('function gcScheda('), H.indexOf('function showReset('));
  deve(/Modifica dati/.test(sc) && /catApriProdotto\(null\)/.test(sc) && /prvApriTariffa\(null,\{compagnia:/.test(sc),
    'la scheda non porta a dati, prodotti e provvigioni');
  /* §1: le righe prodotto sono UNA funzione, chiamata da tutte e due le schermate. */
  deve((H.match(/catRigheProdotti\(c, puo\)/g) || []).length >= 2, 'le righe prodotto non sono condivise');
  return 'bottone, modifica, scheda con prodotti e provvigioni';
});

prova('le finestre si vedono anche da un pannello che non e\' il loro', () => {
  /* Guasto vero: prv-ov sta dentro panel-provvigioni, che da Gestione
     compagnie e' display:none — e la finestra con lui. */
  deve(/function gcSulBody\(el\)\s*{\s*if \(el && el\.parentElement !== document\.body\) document\.body\.appendChild\(el\);/.test(H), 'manca gcSulBody');
  deve(/function prvApri\(html\) {[\s\S]{0,260}gcSulBody\(ov\);/.test(H), 'la finestra delle tariffe resta chiusa nel suo pannello');
  deve(/function catApri\(html\) {[\s\S]{0,200}gcSulBody\(ov\);/.test(H), 'la finestra del catalogo resta chiusa nel suo pannello');
  return 'prv-ov e cat-ov salgono sul body';
});

prova('rinominare una compagnia non stacca tariffe, accordi e polizze', () => {
  const b = H.slice(H.indexOf('async function catSalvaCompagnia('), H.indexOf('/* Il prodotto di compagnia.'));
  deve(/rinomina && !alias\.some[\s\S]{0,120}alias\.push\(prima\.nome\)/.test(b), 'il nome vecchio non diventa un alias');
  deve(/\['iam_provvigioni_tariffa', 'iam_provvigioni_collaboratore'\]/.test(b) && /\.update\(\{ compagnia: nome \}\)\.eq\('compagnia', prima\.nome\)/.test(b),
    'tariffe e accordi restano sul nome vecchio');
  return 'alias + tariffe + accordi';
});

prova('«non si e\' potuto leggere» non diventa «non ce ne sono» — e non porta giu\' la pagina', () => {
  const b = blocco();
  /* La stessa regola del registro (§18), del contatore documentale (§12) e
     dei conti (§26): un elenco vuoto su un errore farebbe credere che non
     esistano accordi — e qui vorrebbe dire far credere che non si debba
     niente a nessuno.

     REGOLA AGGIORNATA IL 20/09/2026, dopo un guasto vero: le sette letture
     stavano in una `Promise.all` con un `throw` sul primo errore, e UNA
     colonna sbagliata (`nominativo`, che su `quote_collaboratori` non
     esiste) spegneva la schermata intera — comprese le sei letture che
     avevano funzionato. Chi la apriva non poteva creare nemmeno una
     compagnia. La prova di prima pretendeva l'avviso in tutti e tre i
     contenitori, cioe' misurava il mondo in cui cadevano tutte insieme.
     Adesso ognuna sta in piedi da sola, e l'avviso dice QUALE manca. */
  deve(/class="cnt-err"/.test(b), 'l\'errore non si vede');
  deve(/Non ho potuto leggere/.test(b), 'l\'errore di lettura si confonde con l\'elenco vuoto');
  deve(/Il resto è quello che c’è davvero/.test(b),
    'l\'avviso non dice che il resto della pagina e\' comunque vero');
  /* Ogni lettura ha il suo nome: «qualcosa e' andato storto» con sette
     richieste non dice a nessuno dove guardare. */
  const codice = b.split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
  const nomi = (codice.match(/leggi\('/g) || []).length;
  deve(nomi >= 7, 'le letture non sono isolate una per una: ne ho contate ' + nomi);
  deve(!/await Promise\.all\(\[\s*\n\s*db\.from/.test(codice),
    'le letture sono tornate dentro una Promise.all che cade tutta insieme');
  deve(/guasti\.push/.test(codice), 'una lettura caduta non viene raccolta');
  return nomi + ' letture, ognuna in piedi da sola';
});

prova('GUASTO VERO · il nominativo di un collaboratore NON e\' una colonna', () => {
  /* `quote_collaboratori` ha `nome` e `cognome`. `nominativo` esiste su
     `quote_anagrafiche` e sulle controparti dei sinistri: la query era stata
     copiata da li', e PostgREST risponde 400 su una colonna che non c'e'.
     Costo: la schermata Gestione compagnie non si apriva. */
  const b = blocco();
  deve(!/quote_collaboratori'\)\.select\('[^']*nominativo/.test(b),
    'si chiede di nuovo una colonna `nominativo` a quote_collaboratori');
  deve(/quote_collaboratori'\)\.select\('id,nome,cognome,stato'\)/.test(b),
    'la query non chiede le colonne che la tabella ha davvero');
  deve(!/\.order\('nominativo'\)/.test(b), 'si ordina per una colonna che non esiste');
  /* E il nominativo si compone in UN posto solo: due composizioni diverse
     sono due modi di scrivere la stessa persona in due tendine. */
  deve(/function prvNominativo\(/.test(b), 'manca la funzione che compone il nominativo');
  const usi = (b.match(/p\.nominativo \|\| '—'/g) || []).length;
  deve(usi === 0, usi + ' tendine leggono ancora un campo `nominativo` che non arriva');
  return 'nome + cognome, composti in un posto solo';
});

prova('la COPERTURA guarda il portafoglio vero, e la sua assenza non blocca il resto', () => {
  const b = blocco();
  /* Senza le polizze chi configura scrive le tariffe a memoria. Ma la lettura
     delle polizze e' l'unica delle sette che puo' mancare senza rendere la
     schermata inutile: se cade si tace su quella sezione, non si perde tutto. */
  deve(/db\.from\('quote_polizze'\)/.test(b), 'la copertura non legge il portafoglio');
  /* La lettura delle polizze e' una delle sette, e come tutte le altre sta in
     piedi da sola: prima era l'UNICA protetta (`po.error ? [] : ...`), ed era
     proprio quella protezione a dire che le altre sei non lo erano. */
  deve(/leggi\('il portafoglio/.test(b), 'un errore sulle polizze fa cadere anche le tariffe');
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
