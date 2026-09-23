// ═══════════════════════════════════════════════════════════════════════════════
//  I PUNTI VENDITA — la schermata  (23/09/2026)
//
//  Le regole stanno nel motore (`tariffe/motore/punti-vendita.js`, quattordici
//  prove in Node). Qui si sorveglia la schermata, e una di queste prove la FA
//  GIRARE: il 22/09 i Sospesi erano vuoti per tutti mentre ventidue prove che
//  leggevano il sorgente restavano verdi, perché il disegno chiamava una
//  funzione che in IAM non esiste e moriva a metà (§67). Una schermata si
//  misura aprendola.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const SCOCCA = fs.readFileSync(path.join(QUI, '..', 'withus-one.js'), 'utf8');
const require = createRequire(import.meta.url);
const PV = require(path.join(RADICE, 'tariffe', 'motore', 'punti-vendita.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function bloccoGrezzo() {
  const i = H.indexOf('/* ═══ I PUNTI VENDITA (23/09/2026)');
  deve(i >= 0, 'non trovo il blocco pvd* in iam/index.html');
  const fine = H.indexOf('/* ═══ DECISIONI APERTE (21/09/2026)', i);
  deve(fine > i, 'non trovo la fine del blocco pvd*');
  return H.slice(i, fine);
}
/* Si legge carattere per carattere tenendo lo stato «sono dentro un
   commento» o «dentro una stringa»: una riga interna di un commento su più
   righe passa il filtro riga-per-riga, e le sue parole italiane sembrano
   funzioni. Mai una regex globale (§12). */
function pulito(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      i = j; out += ' '; continue;
    }
    out += c; i++;
  }
  return out;
}

const punti = () => [
  { id: 'ag', nome: 'AGENZIA GENERALE 1499', codice: '1499', padre_id: null, attivo: true,
    data_inizio: '2025-07-09', puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true },
  { id: 'f2', nome: 'FILIALE CATANIA', codice: 'CT', padre_id: 'ag', attivo: true,
    puo_proposta: true, puo_emissione: false, puo_incasso: true, puo_quotazione: true },
  { id: 'f3', nome: 'SPORTELLO ACIREALE', codice: 'AC', padre_id: 'f2', attivo: true,
    puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true }
];
const gente = () => [
  { id: 'p1', cognome: 'ALEO', nome: 'ALESSANDRO', email: 'alex@x.it', punto_vendita_id: 'ag', iam_id: 'u1' },
  { id: 'p2', cognome: 'ODDO', nome: 'FRANCESCO', email: 'f@x.it', punto_vendita_id: 'ag' },
  { id: 'p3', cognome: 'ROSSI', nome: 'MARIO' }
];
const conti = () => [{ id: 'u1', iam_id: 'u1', email: 'alex@x.it', ruolo: 'top_master', attivo: true }];

/* IL BANCO CHE FA GIRARE LA SCHERMATA, una volta sola. Tre prove lo usano, e
   tre copie dello stesso finto database sarebbero tre banchi che un giorno
   misurano cose diverse. `scritte` raccoglie quello che il codice MANDA al
   database: una prova che guarda solo il riquadro disegnato dice come sta
   adesso e non che cosa ha scritto (§42). */
function banco(PUNTI, PERSONE, ACCOUNT, HUB) {
  const b = bloccoGrezzo();
  const elementi = {};
  const nodo = (id) => (elementi[id] = elementi[id] || { id, innerHTML: '', textContent: '', style: {} });
  ['pvd-albero', 'pvd-cards', 'pvd-avvisi', 'pvd-persone', 'pvd-filtri', 'pvd-tit-persone',
   'pvd-nuovo', 'pvd-nuovo-utente'].forEach(nodo);
  const doc = {
    getElementById: (id) => elementi[id] || null,
    querySelectorAll: () => []
  };

  const scritte = [];
  function q(tab) {
    const dati = tab === 'iam_punti_vendita' ? PUNTI
      : tab === 'quote_collaboratori' ? PERSONE
      : tab === 'iam_utenti' ? ACCOUNT
      : tab === 'iam_hub' ? (HUB || []) : [];
    const mio = { tab, filtri: {} };
    const api = {
      select() { return api; }, order() { return api; },
      update(v) { mio.update = v; scritte.push(mio); return api; },
      eq(k, v) { mio.filtri[k] = v; return api; },
      then(res) {
        return Promise.resolve(res(mio.update
          ? { data: [{ id: mio.filtri.id }], error: null }
          : { data: dati, error: null }));
      }
    };
    return api;
  }

  const src = b + '\nreturn { pvdCarica, pvdScegli, pvdRender, pvdApri, pvdMetti, pvdTogli,'
    + ' stato: () => ({ scelto: PVD_SCELTO, err: PVD_ERR }) };';
  const f = new Function('document', 'db', 'PuntiVendita', 'PROFILO', 'ME', 'esc',
    'cntOggiIso', 'pntData', 'goTab', 'window', 'confirm', 'logMovimento', 'regInstalla', src);
  const api = f(doc, { from: q }, PV, { ruolo: 'admin' }, { id: 'me' },
    (x) => String(x == null ? '' : x), () => '2026-09-23',
    (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—'),
    () => {}, {}, () => true, () => {}, () => {});
  return { api, elementi, scritte, nodo };
}

prova('LA SCHERMATA GIRA DAVVERO: la struttura si disegna e le persone stanno sotto', async () => {
  const { api, elementi } = banco(punti(), gente(), conti());
  await api.pvdCarica(true);
  deve(!api.stato().err, 'la lettura si è fermata: ' + JSON.stringify(api.stato().err));

  const alb = elementi['pvd-albero'].innerHTML;
  deve(alb.length > 200, 'la struttura non ha disegnato niente');
  ['AGENZIA GENERALE 1499', 'FILIALE CATANIA', 'SPORTELLO ACIREALE'].forEach(n =>
    deve(alb.indexOf(n) >= 0, n + ' non compare nella struttura'));
  /* I livelli si vedono: senza rientro un albero è un elenco. */
  deve(/margin-left:18px/.test(alb) && /margin-left:36px/.test(alb),
    'i livelli non si vedono: l’albero esce come un elenco piatto');
  /* E la regola che conta: lo sportello ha la casella spuntata, ma Catania
     gli toglie l'emissione — e la schermata dice CHI gliela toglie. */
  deve(/la toglie FILIALE CATANIA/.test(alb),
    'la schermata non dice chi toglie l’emissione allo sportello');

  /* Senza nessuno scelto si vedono le persone DA SMISTARE. */
  deve(/ROSSI MARIO/.test(elementi['pvd-persone'].innerHTML),
    'chi non ha un punto vendita non compare da nessuna parte');

  api.pvdScegli('ag');
  const pers = elementi['pvd-persone'].innerHTML;
  deve(/ALEO ALESSANDRO/.test(pers) && /ODDO FRANCESCO/.test(pers),
    'le persone dell’agenzia non compaiono');
  /* Una persona senza accesso non sparisce: dodici su diciassette sono così. */
  deve(/senza accesso a IAM/.test(pers), 'una persona senza account non è dichiarata');
  deve(/AGENZIA GENERALE 1499/.test(elementi['pvd-tit-persone'].textContent),
    'il titolo non dice di quale punto vendita sono');

  /* Il riepilogo conta, e conta chi è ancora da smistare. */
  deve(/Da smistare/.test(elementi['pvd-cards'].innerHTML), 'il riepilogo non conta chi è da smistare');
  return 'tre punti in albero, due persone sotto l’agenzia, una da smistare';
});

prova('IL RESPONSABILE SI LEGGE SULLA RIGA, e chi lavora altrove è marcato', async () => {
  const P = punti(); P[0].responsabile_id = 'p2';        // Oddo, che lavora qui
  P[1].responsabile_id = 'p3';                           // Rossi, che non ci lavora
  P[2].responsabile_id = 'mai-esistito';                 // cancellato dal registro
  const { api, elementi } = banco(P, gente(), conti());
  await api.pvdCarica(true);
  const alb = elementi['pvd-albero'].innerHTML;
  deve(/ODDO FRANCESCO<\/b> \(responsabile\)/.test(alb), 'il responsabile non si legge sulla riga');
  /* Un responsabile che NON lavora lì si marca: e' l'unico modo di accorgersi
     che qualcuno risponde di un posto in cui non risulta. */
  deve(/ROSSI MARIO[\s\S]{0,120}non risulta lavorare qui/.test(alb),
    'un responsabile che lavora altrove non viene marcato');
  /* E uno che non e' piu' nel registro NON sparisce (§67, la regola degli
     orfani): sparire farebbe credere che quel punto vendita non ne abbia mai
     avuto uno. */
  deve(/responsabile non piu/.test(alb), 'un responsabile cancellato sparisce in silenzio');

  api.pvdScegli('ag');
  deve(/ODDO FRANCESCO[\s\S]{0,120}responsabile/.test(elementi['pvd-persone'].innerHTML),
    'nell’elenco delle persone il responsabile non è marcato');
  return 'il capo sulla riga, quello che lavora altrove e quello sparito';
});

prova('I FLAG SONO INTERRUTTORI, e sono quelli di IAM', async () => {
  /* Richiesta di Francesco: «la parte dei flag deve essere fatta ad
     interruttori». E sono QUELLI DI IAM (`.sw`), non un secondo paio: due
     interruttori sono due modi di accendersi che un giorno divergono. */
  const { api, elementi } = banco(punti(), gente(), conti());
  await api.pvdCarica(true);
  const f = elementi['pvd-filtri'].innerHTML;
  const quanti = (f.match(/class="sw"/g) || []).length;
  deve(quanti === PV.ABILITAZIONI.length + 1,
    'i filtri non sono tutti interruttori: ' + quanti + ' su ' + (PV.ABILITAZIONI.length + 1));
  deve(/sw-track/.test(f) && /sw-thumb/.test(f), 'l’interruttore non ha il suo binario');
  /* CONTROPROVA DELLA REGOLA: una casella nuda non deve tornare. */
  deve(!/<input type="checkbox"[^>]*>\s*Solo attivi/.test(f), 'i filtri sono tornati caselle');

  /* E anche nel modulo: la stessa funzione, in riga invece che in linea. */
  const grezzo = bloccoGrezzo();
  deve(/pvdSwRiga\(/.test(pulito(grezzo)), 'il modulo non usa l’interruttore a riga');
  /* Il modulo si legge GREZZO: e' scritto dentro un template, e la pulizia
     delle stringhe lo cancellerebbe — una prova che misura una fetta vuota
     dichiara a posto quello che non ha letto (§12). */
  const modulo = grezzo.slice(grezzo.indexOf('function pvdApri'), grezzo.indexOf('function pvdDati'));
  deve(!/type="checkbox"/.test(modulo), 'nel modulo ci sono ancora caselle scritte a mano');
  deve(/ABILITAZIONI\.map/.test(modulo), 'le abilitazioni del modulo non vengono dal motore');
  return PV.ABILITAZIONI.length + 1 + ' interruttori nei filtri, e il modulo sulla stessa funzione';
});

prova('SI AGGIUNGE E SI TOGLIE QUALCUNO, e lo spostamento si scrive davvero', async () => {
  const { api, elementi, scritte, nodo } = banco(punti(), gente(), conti());
  await api.pvdCarica(true);
  api.pvdScegli('f2');                       // Catania, dove non lavora nessuno
  const box = elementi['pvd-persone'].innerHTML;
  deve(/pvd-aggiungi/.test(box), 'non c’è modo di aggiungere qualcuno da qui');
  /* Chi viene da un altro punto vendita si legge PRIMA di sceglierlo: una
     persona sta in un punto vendita solo, e spostarla la toglie a qualcuno. */
  deve(/ODDO FRANCESCO — viene via da AGENZIA GENERALE 1499/.test(box),
    'l’elenco non dice da dove verrebbe via');

  /* E la scrittura si guarda per quello che MANDA al database, non per quello
     che la schermata disegna dopo (§42). */
  nodo('pvd-aggiungi').value = 'p3';
  await api.pvdMetti();
  const w = scritte.filter(x => x.tab === 'quote_collaboratori');
  deve(w.length === 1, 'non ha scritto una volta sola: ' + w.length);
  deve(w[0].update.punto_vendita_id === 'f2', 'non sposta nel punto vendita scelto');
  deve(w[0].filtri.id === 'p3', 'sposta la persona sbagliata: ' + w[0].filtri.id);

  await api.pvdTogli('p3');
  const w2 = scritte.filter(x => x.tab === 'quote_collaboratori');
  deve(w2.length === 2 && w2[1].update.punto_vendita_id === null,
    'togliere qualcuno non lo lascia senza punto vendita');
  return 'aggiunge, dice da dove viene via, e toglie senza cancellare';
});

prova('GLI HUB NON CI SONO PIÙ, ma quello che era scritto non si cancella', () => {
  /* Francesco: «elimina la parte degli HUB perché i punti vendita li
     sostituiscono». Via la schermata; la tabella e `iam_team.hub_id` restano,
     perché tre schede economiche ci puntano ed è l'unica traccia di come
     l'agenzia era organizzata prima. */
  const codice = pulito(H);
  ['apriGestioneHub', 'renderHubList', 'loadHubDB', 'apriClassificaHub', 'apriAlertHub']
    .forEach(n => deve(codice.indexOf(n) < 0, n + ' è ancora nel documento'));
  deve(codice.indexOf('tm-hub-filter') < 0, 'il filtro per HUB è ancora nell’elenco collaboratori');

  /* E il salvataggio di una scheda NON azzera l'HUB che c'era: un campo che
     non si mostra piu' non e' un campo da cancellare. */
  const sc = codice.slice(codice.indexOf('function saveCollab'), codice.indexOf('async function salvaPersonaRegistro'));
  deve(/hub_id:/.test(sc), 'saveCollab non scrive più l’hub_id: le tre schede che ce l’hanno lo perderebbero');
  deve(!/mc-hub/.test(sc), 'saveCollab legge ancora un campo che non esiste più');

  /* La schermata dei punti vendita li LEGGE per proporre di trasformarli, e
     non li converte da sé: una struttura d'agenzia che nessuno ha deciso
     dopo due settimane è un dato (§8.1). */
  const b = pulito(bloccoGrezzo());
  deve(/iam_hub/.test(bloccoGrezzo()), 'i punti vendita non leggono più gli HUB da trasformare');
  deve(/function pvdDaHub/.test(b), 'non c’è il bottone che propone la trasformazione');
  deve(!/insert\(/.test(b.slice(b.indexOf('function pvdDaHub'), b.indexOf('function pvdApri'))),
    'la trasformazione scrive da sé invece di proporre');
  return 'undici funzioni via, la tabella intatta, e la trasformazione proposta';
});

prova('NIENTE FUNZIONI DEL PREVENTIVATORE: quelle qui dentro non esistono', () => {
  /* Il difetto del 22/09 (§67): `pfEuro` e `pfData` vivono nel documento
     alla radice, e chiamate qui sollevano un errore che fa morire il
     disegno a metà. Una prova che legge il sorgente non lo vede, perché la
     stringa c'è. */
  const b = pulito(bloccoGrezzo());
  const GLOBALI = ['String', 'Number', 'Math', 'Object', 'Array', 'Date', 'Promise',
    'parseInt', 'parseFloat', 'isFinite', 'isNaN', 'alert', 'confirm', 'encodeURIComponent'];
  const qui = new Set([...H.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(r => r[1]));
  ['esc'].forEach(n => qui.add(n));
  /* I PARAMETRI contano come definiti: `pvdLeggi(nome, fai, vuoto)` chiama
     `fai()`, ed è una funzione che arriva da chi chiama. Senza questa riga la
     prova accusava un codice giusto — e una prova che grida al lupo su una
     cosa legittima è una prova che si impara ad aggirare. */
  for (const r of bloccoGrezzo().matchAll(/function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g))
    r[1].split(',').forEach(x => { const n = x.trim().split(/[\s=]/)[0]; if (n) qui.add(n); });
  const fuori = [];
  for (const r of b.matchAll(/(^|[^\w$.])([a-z][A-Za-z0-9_$]{2,})\s*\(/g)) {
    const n = r[2];
    if (qui.has(n) || GLOBALI.indexOf(n) >= 0) continue;
    if (/^(if|for|while|switch|catch|return|typeof|function|await|new|else|do|case|delete|void|in|of|throw|var|let|const|async|try)$/.test(n)) continue;
    if (fuori.indexOf(n) < 0) fuori.push(n);
  }
  deve(!fuori.length, 'il blocco chiama funzioni che in IAM non esistono: ' + fuori.join(', '));
  deve(!/\bpf[A-Z]/.test(b), 'è tornata una funzione con il prefisso del preventivatore');
  return 'nessuna funzione presa in prestito';
});

prova('ogni classe che la schermata scrive ESISTE nel foglio di stile', () => {
  /* Una classe che non esiste viene ignorata IN SILENZIO: la schermata esce
     nuda e chi la guarda pensa a un disegno fatto male (§65). Il 23/09 il
     primo tentativo scriveva `cnt-cards`, che non esiste — la classe vera è
     `cnt-somma`. L'ha presa questa prova. */
  const b = bloccoGrezzo();
  const pannello = (() => {
    const i = H.indexOf('<div class="panel" id="panel-punti-vendita"');
    deve(i >= 0, 'manca il pannello #panel-punti-vendita');
    return H.slice(i, H.indexOf('<!-- ══ STATO COLLEGAMENTI', i));
  })();
  const stile = H.slice(H.indexOf('<style'), H.lastIndexOf('</style>'));
  const usate = new Set();
  for (const src of [b, pannello]) {
    for (const r of src.matchAll(/class="([^"]+)"/g))
      /* Solo le classi SCRITTE PER INTERO: `class="' + classi.join(' ') + '"`
         non è una classe, è un pezzo di codice — e una prova che lo prende
         per una classe accusa un codice giusto. Quelle costruite a pezzi si
         leggono dal `classi.push(...)` qui sotto. */
      r[1].split(/\s+/).forEach(c => {
        if (!/^[a-z][a-z0-9-]*$/.test(c)) return;
        if (/^(pvd|cnt|sw|d|card|page|head|eyebrow|subtitle|pictogram|cl|modal|fld|fgrid|ffull)-?/.test(c)) usate.add(c);
      });
    for (const r of src.matchAll(/classi\.push\('([a-z-]+)'\)/g)) usate.add(r[1]);
  }
  const mancanti = [...usate].filter(c => stile.indexOf('.' + c) < 0);
  deve(!mancanti.length, 'classi scritte e mai definite: ' + mancanti.join(', '));
  deve(usate.size >= 15, 'la prova non ha letto abbastanza classi: ' + usate.size);
  return usate.size + ' classi, tutte definite';
});

prova('la schermata è RAGGIUNGIBILE: voce di menu, rotta e titolo', () => {
  /* Una pagina che non ha una voce, per chi lavora, non esiste (§1): è il
     guasto numero uno di questo repository. */
  deve(/act: 'punti-vendita'/.test(SCOCCA), 'la voce di menu non c’è');
  deve(/vai\('punti-vendita'\)/.test(SCOCCA), 'la voce non porta da nessuna parte');
  deve(/'punti-vendita': \['Punti vendita', 'Agenzia'\]/.test(SCOCCA),
    'senza il titolo la briciola dice un posto in cui non sei più');
  /* E la rotta deve far partire la lettura: senza, si apre un riquadro vuoto
     (§6b). */
  deve(/if \(t === 'punti-vendita'\) \{ pvdCarica\(true\); \}/.test(H),
    'la rotta non fa partire il caricamento: si aprirebbe un riquadro vuoto');
  /* Il motore SI CARICA, non si copia: si cerca il TAG, non la stringa, che
     compare anche nei commenti (§18). */
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/punti-vendita\.js\?v=/.test(H),
    'IAM non carica il motore dei punti vendita, o ne tiene una copia');
  return 'menu, titolo, rotta e motore caricato';
});

prova('DECIDE L’ADMIN, e il cancello è chiamato', () => {
  /* Qui si decide chi può emettere una polizza e chi può incassare: è la
     stessa soglia dei codici collaboratore e dei conti. Il bottone nascosto
     non è un permesso — il cancello vero sta nelle politiche del database —
     ma una funzione di controllo che non chiama nessuno è il guasto numero
     uno (§1). */
  const b = bloccoGrezzo();
  deve(/function pvdPuoScrivere\(\)/.test(b), 'manca il cancello');
  ['pvdApri', 'pvdSalva', 'pvdElimina'].forEach(f => {
    const i = b.indexOf('function ' + f + '(');
    deve(i >= 0, 'manca ' + f);
    deve(/pvdPuoScrivere\(\)/.test(b.slice(i, i + 400)), f + ' non chiama il cancello');
  });
  return 'tre scritture, tre cancelli chiamati';
});

prova('un salvataggio che non tocca nessuna riga NON dice «salvato»', () => {
  /* BUG 1 (§47): PostgREST non dà errore quando un update tocca zero righe.
     Qui si decidono dei permessi: un salvataggio che sembra riuscito e non è
     avvenuto è peggio che altrove. */
  const b = bloccoGrezzo();
  const i = b.indexOf('async function pvdSalva');
  const f = b.slice(i, b.indexOf('\n}', i));
  deve(/\.select\('id'\)/.test(f), 'non si fa restituire le righe cambiate');
  deve(/!r\.data \|\| !r\.data\.length/.test(f), 'non guarda quante righe ha toccato');
  deve(/non ha toccato nessuna riga/.test(f), 'non lo dice in faccia');
  return 'select, conteggio, e il messaggio';
});

prova('quello che non si è potuto leggere NON diventa uno ZERO', () => {
  /* «Non si è potuto leggere» non è «non ce n’è» (§12, §18, §35). E ogni
     lettura sta in piedi da sola: una query sbagliata su tre non spegne la
     schermata intera — è il difetto che il 20/09 aveva spento Gestione
     compagnie per una colonna copiata dalla tabella accanto. */
  const b = bloccoGrezzo();
  deve(/async function pvdLeggi\(/.test(b), 'le letture non sono isolate');
  /* LA REGOLA NON È «TRE LETTURE»: è che OGNI lettura di `pvdCarica` passi di
     lì. Il numero è cambiato il 23/09 (sono arrivati gli HUB da trasformare),
     e una prova che fissa il numero diventa rossa su un codice giusto — è la
     prova che misura il mondo di ieri (§15, §16, §33, §35). */
  const carica = b.slice(b.indexOf('async function pvdCarica('), b.indexOf('function pvdFiltro('));
  const tutte = (carica.match(/db\.from\(/g) || []).length;
  const isolate = (carica.match(/await pvdLeggi\(/g) || []).length;
  deve(tutte > 0 && isolate === tutte,
    'in pvdCarica ci sono ' + tutte + ' letture e solo ' + isolate + ' passano da pvdLeggi');
  deve(!/Promise\.all/.test(b), 'le letture tornano a cadere tutte insieme');
  deve(/Non si e\\'e\\' potuto leggere|Non si e' potuto leggere/.test(b),
    'non dichiara la lettura caduta');
  return 'tre letture isolate, e la mancanza dichiarata';
});

prova('la tabella nasce VUOTA, e la schermata lo dice invece di sembrare rotta', () => {
  const b = bloccoGrezzo();
  deve(/Non c'e' ancora nessun punto vendita|Non c\\'e\\' ancora nessun punto vendita/.test(b),
    'con zero punti vendita la schermata non spiega niente');
  deve(/inventarne uno/.test(b), 'non dice perché è vuota');
  return 'una schermata vuota che dice perché';
});

console.log('\n══ PUNTI VENDITA (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = await fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPUNTI VENDITA (IAM): ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
