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

prova('LA SCHERMATA GIRA DAVVERO: la struttura si disegna e le persone stanno sotto', async () => {
  const b = bloccoGrezzo();
  const elementi = {};
  const nodo = (id) => (elementi[id] = elementi[id] || { id, innerHTML: '', textContent: '', style: {} });
  ['pvd-albero', 'pvd-cards', 'pvd-avvisi', 'pvd-persone', 'pvd-filtri', 'pvd-tit-persone',
   'pvd-nuovo', 'pvd-nuovo-utente'].forEach(nodo);
  const doc = {
    getElementById: (id) => elementi[id] || null,
    querySelectorAll: () => []
  };

  const PUNTI = [
    { id: 'ag', nome: 'AGENZIA GENERALE 1499', codice: '1499', padre_id: null, attivo: true,
      data_inizio: '2025-07-09', puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true },
    { id: 'f2', nome: 'FILIALE CATANIA', codice: 'CT', padre_id: 'ag', attivo: true,
      puo_proposta: true, puo_emissione: false, puo_incasso: true, puo_quotazione: true },
    { id: 'f3', nome: 'SPORTELLO ACIREALE', codice: 'AC', padre_id: 'f2', attivo: true,
      puo_proposta: true, puo_emissione: true, puo_incasso: true, puo_quotazione: true }
  ];
  const PERSONE = [
    { id: 'p1', cognome: 'ALEO', nome: 'ALESSANDRO', email: 'alex@x.it', punto_vendita_id: 'ag', iam_id: 'u1' },
    { id: 'p2', cognome: 'ODDO', nome: 'FRANCESCO', email: 'f@x.it', punto_vendita_id: 'ag' },
    { id: 'p3', cognome: 'ROSSI', nome: 'MARIO' }
  ];
  const ACCOUNT = [{ id: 'u1', iam_id: 'u1', email: 'alex@x.it', ruolo: 'top_master', attivo: true }];

  function q(tab) {
    const dati = tab === 'iam_punti_vendita' ? PUNTI
      : tab === 'quote_collaboratori' ? PERSONE
      : tab === 'iam_utenti' ? ACCOUNT : [];
    const api = { select() { return api; }, order() { return api; },
      then(res) { return Promise.resolve(res({ data: dati, error: null })); } };
    return api;
  }

  const src = b + '\nreturn { pvdCarica, pvdScegli, pvdRender, stato: () => ({ scelto: PVD_SCELTO, err: PVD_ERR }) };';
  const f = new Function('document', 'db', 'PuntiVendita', 'PROFILO', 'ME', 'esc',
    'cntOggiIso', 'pntData', 'goTab', 'window', src);
  const api = f(doc, { from: q }, PV, { ruolo: 'admin' }, { id: 'me' },
    (x) => String(x == null ? '' : x), () => '2026-09-23',
    (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—'),
    () => {}, {});

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
        if (/^(pvd|cnt|d|card|page|head|eyebrow|subtitle|pictogram|cl|modal|fld|fgrid|ffull)-?/.test(c)) usate.add(c);
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
  deve((b.match(/await pvdLeggi\(/g) || []).length === 3, 'le tre letture non passano tutte di lì');
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
