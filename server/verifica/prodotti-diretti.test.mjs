// ═══════════════════════════════════════════════════════════════════════════════
//  LE CHIAVI DEL MENU DI IAM APRONO UN PRODOTTO VERO
//
//  Perché questa prova esiste. Il 15/09/2026 il menu «Nuovo preventivo» di IAM
//  è stato rifatto: arriva fino al singolo prodotto (la sottocategoria RC
//  Professionale, il prodotto AMTRUST, il tipo di cauzione). Ogni foglia manda a
//  QUOTO una chiave `prod`, che qui si risolve in PRODOTTI_DIRETTI.
//
//  Una chiave che di qua non c'è è un clic che non fa niente, senza nessun
//  errore visibile: la porta di servizio resta chiusa e nessuno se ne accorge
//  finché un collaboratore non lo dice. L'elenco delle chiavi è CONTRATTO
//  (INTERFACCIA-QUOTO-IAM.md §2.6), e questa prova controlla che il codice e il
//  contratto dicano la stessa cosa — e che ogni chiave punti a un prodotto che
//  nella fonte dati esiste davvero, con quel nome.
//
//  Controprova (obbligatoria, CODEX §3): QUOTO_INDEX=<index.html di prima>
//  fa girare la prova sul file vecchio, che deve diventare rossa.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const src = fs.readFileSync(process.env.QUOTO_INDEX || path.join(RADICE, 'index.html'), 'utf8');
const contratto = fs.readFileSync(path.join(RADICE, 'INTERFACCIA-QUOTO-IAM.md'), 'utf8');
const amtrust = JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/amtrust.json'), 'utf8'));
const rcprof = JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/rc_professionale.json'), 'utf8'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Il blocco PRODOTTI_DIRETTI, dalla dichiarazione alla graffa che lo chiude. */
function blocco() {
  const i = src.indexOf('const PRODOTTI_DIRETTI = {');
  deve(i >= 0, 'non trovo PRODOTTI_DIRETTI in index.html');
  return src.slice(i, src.indexOf('\n};', i));
}
const chiaviCodice = () => [...blocco().matchAll(/^\s*([a-z0-9_]+):\s*(?:async\s*)?\(\)\s*=>/gm)].map(m => m[1]);

/* Le chiavi che il contratto elenca nella sezione 2.6: tutto ciò che sta fra
   apici inversi nella colonna `prod` delle righe della tabella e nel testo. */
function chiaviContratto() {
  const i = contratto.indexOf('### 2.6');
  deve(i >= 0, 'il contratto non ha la sezione 2.6 sulle chiavi di prod');
  const sez = contratto.slice(i, contratto.indexOf('\n## 3.', i));
  const tabella = sez.slice(sez.indexOf('| Voce del menu IAM'), sez.indexOf('\n\nLe voci che aprono'));
  const out = new Set();
  for (const riga of tabella.split('\n').slice(2)) {
    const celle = riga.split('|').map(c => c.trim());
    const prod = celle[3] || '';
    for (const m of prod.matchAll(/`([a-z0-9_]+)`/g)) if (m[1] !== 'amt_') out.add(m[1]);
  }
  return [...out];
}

/* Le chiavi dei prodotti che una costante di QUOTO dichiara: {key:'x', … } */
function chiaviDi(costante) {
  const i = src.indexOf('const ' + costante + ' = [');
  deve(i >= 0, 'non trovo ' + costante);
  return [...src.slice(i, src.indexOf('\n];', i)).matchAll(/\{key:'([a-z0-9_]+)'/g)].map(m => m[1]);
}

prova('codice e contratto elencano le stesse chiavi', () => {
  const codice = chiaviCodice().sort();
  const doc = chiaviContratto().sort();
  const soloCodice = codice.filter(k => !doc.includes(k));
  const soloDoc = doc.filter(k => !codice.includes(k));
  deve(soloCodice.length === 0, 'chiavi nel codice ma non nel contratto §2.6: ' + soloCodice.join(', '));
  deve(soloDoc.length === 0, 'chiavi nel contratto §2.6 ma non in PRODOTTI_DIRETTI: ' + soloDoc.join(', '));
  deve(codice.length >= 50, 'solo ' + codice.length + ' chiavi: il menu ne chiede di piu\'');
  return codice.length + ' chiavi, identiche nei due posti';
});

prova('le voci uscite dal menu non hanno piu\' una chiave', () => {
  /* Imbarcazioni, Infortuni al conducente, Auto d'epoca e CVT/ARD sono fuori
     dal menu di IAM dal 15/09/2026. Un collegamento salvato non deve riaprirle
     dalla porta di servizio. */
  const vive = ['imbarcazioni', 'conducente', 'storici', 'cvtard'].filter(k => chiaviCodice().includes(k));
  deve(vive.length === 0, 'chiavi che dovevano sparire e ci sono ancora: ' + vive.join(', '));
  return 'imbarcazioni, conducente, storici, cvtard: nessuna';
});

prova('ogni chiave AMTRUST e\' un prodotto RC professionale di tariffe/amtrust.json', () => {
  const attese = Object.entries(amtrust.prodotti || {})
    .filter(([, p]) => p.tipo === 'rc_professionale').map(([k]) => 'amt_' + k).sort();
  const codice = chiaviCodice().filter(k => k.startsWith('amt_')).sort();
  deve(JSON.stringify(codice) === JSON.stringify(attese),
    'AMTRUST: nel codice ' + codice.join(', ') + ' — nella tariffa ' + attese.join(', '));
  /* E la chiave passata ad apriAmtrustDiretto e' la stessa della tariffa. */
  for (const m of blocco().matchAll(/amt_([a-z0-9_]+):\s*\(\)\s*=>\s*apriAmtrustDiretto\('([a-z0-9_]+)'\)/g)) {
    deve(m[1] === m[2], 'amt_' + m[1] + ' apre «' + m[2] + '»');
  }
  return attese.length + ' prodotti, denominazioni della tariffa';
});

prova('ogni sottocategoria RC Professionale chiesta esiste, una sola volta', () => {
  /* Si cerca per inizio del nome: qui si controlla che quell'inizio prenda
     esattamente UNA sottocategoria della tariffa, non zero e non due. */
  const chiamate = [...blocco().matchAll(/apriRcProfDiretto\('([^']+)'(?:,\s*'([^']+)')?\)/g)];
  deve(chiamate.length > 0, 'nessuna chiamata a apriRcProfDiretto');
  let n = 0;
  for (const [, cat, inizio] of chiamate) {
    if (cat === '__nonreg') continue;
    deve(rcprof[cat], 'categoria «' + cat + '» assente dalla tariffa');
    if (!inizio) continue;
    const hit = (rcprof[cat].sottocategorie || []).filter(s => String(s.nome).toUpperCase().startsWith(inizio.toUpperCase()));
    deve(hit.length === 1, cat + ' / «' + inizio + '»: ' + hit.length + ' sottocategorie corrispondono');
    n++;
  }
  const tutte = ['TECNICI', 'A.FISCALE', 'VARIE'].reduce((a, c) => a + rcprof[c].sottocategorie.length, 0);
  deve(n === tutte, n + ' sottocategorie collegate su ' + tutte + ' in tariffa');
  return n + ' sottocategorie, ognuna trovata una volta sola';
});

prova('ogni chiave cauz_ e\' un prodotto dichiarato dalle liste cauzioni', () => {
  const generali = chiaviDi('CAUZIONI_PRODUCTS').filter(k => !['fra_privati', 'pubblici_appalti'].includes(k));
  const attese = [...generali, ...chiaviDi('CAUZIONI_APPALTI_PRODUCTS'), ...chiaviDi('CAUZIONI_PRIVATI_PRODUCTS')]
    .map(k => 'cauz_' + k).sort();
  const codice = chiaviCodice().filter(k => k.startsWith('cauz_')).sort();
  deve(JSON.stringify(codice) === JSON.stringify(attese),
    'cauzioni: nel codice ' + codice.join(', ') + ' — nelle liste ' + attese.join(', '));
  return attese.length + ' tipi di cauzione, tutti collegati';
});

prova('RC Professionale si apre dopo la tariffa, non prima', () => {
  /* renderRcprof azzera la vista e la ridisegna quando la tariffa arriva: se la
     vista si imposta prima, viene sovrascritta e il menu apre l'elenco delle
     categorie invece del prodotto promesso. */
  const i = src.indexOf('async function apriRcProfDiretto(');
  deve(i >= 0, 'manca apriRcProfDiretto');
  const corpo = src.slice(i, src.indexOf('\n}', i));
  deve(corpo.indexOf('await ensureRcProf()') < corpo.indexOf("showPage('rcprof')"), 'la pagina si accende prima che la tariffa sia in memoria');
  deve(corpo.indexOf("showPage('rcprof')") < corpo.indexOf('rcpOpenCat('), 'la vista si imposta prima di accendere la pagina: renderRcprof la sovrascrive');
  const j = src.indexOf('async function apriAmtrustDiretto(');
  deve(j >= 0, 'manca apriAmtrustDiretto');
  const c2 = src.slice(j, src.indexOf('\n}', j));
  deve(c2.indexOf('await ensureAmtrust()') < c2.indexOf("showPage('rcprof')"), 'AMTRUST: la pagina si accende prima della tabella');
});

prova('le pagine chieste dal menu con il solo nome hanno la loro porta', () => {
  const i = src.indexOf('const PAGINE_DA_AVVIARE = {');
  const porte = src.slice(i, src.indexOf('\n};', i));
  for (const p of ['tutelalegale', 'rcab', 'infcirc', 'rcvp', 'casa', 'animali', 'fotovoltaico', 'viaggio']) {
    deve(new RegExp('^\\s*' + p + ':\\s*\\(\\) =>', 'm').test(porte), 'la pagina «' + p + '» non ha una porta in PAGINE_DA_AVVIARE');
  }
  return 'tutelalegale e rcab comprese';
});

prova('la citta\' dell\'impianto fotovoltaico usa l\'autocompletamento dei comuni del Motor', () => {
  deve(!/id="fv-citta"/.test(src), 'il campo e\' ancora un testo libero (fv-citta)');
  deve(/id="fv-comune"[^>]*oninput="resComuneSearch\(this\)"/.test(src), 'fv-comune non chiama resComuneSearch, lo stesso del Motor');
  deve(/getElementById\('fv-comune'\)/.test(src), 'il passo di salvataggio legge ancora il campo vecchio');
  deve(/id="fv-prov"/.test(src) && /id="fv-cap"/.test(src), 'senza fv-prov e fv-cap l\'autocompletamento non ha dove scrivere provincia e CAP');
});

let ko = 0;
console.log('\nPRODOTTI DIRETTI — le chiavi del menu di IAM aprono un prodotto vero');
for (const { nome, fn } of esiti) {
  try { const d = await fn(); console.log('  ok  ' + nome + (d ? ' — ' + d : '')); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n      ' + e.message); }
}
console.log(`\nPRODOTTI DIRETTI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
