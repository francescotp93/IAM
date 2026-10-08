// ═══════════════════════════════════════════════════════════════════════════════
//  LE TRATTATIVE, IN UN BROWSER VERO (08/10/2026)
//
//  Non legge il sorgente cercando stringhe: apre la schermata in Chromium, col
//  foglio di stile vero di IAM, il codice vero della pagina e un archivio finto,
//  e guarda che cosa esce. Una schermata con tutti i pezzi al posto giusto può
//  disegnare lo stesso la cosa sbagliata (§46, §67).
//
//  Se Playwright non c'è dice «saltata»: rosso per la strada, non per il
//  contenuto (§4).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const H = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');
const motore = n => fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', n), 'utf8');

let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) { chromium = null; }

console.log('\n══ LE TRATTATIVE, NEL BROWSER ══');
if (!chromium) { console.log('  saltata: Playwright non è installato (npm i --no-save playwright@1.55)'); process.exit(0); }

const tra = (a, b) => { const i = H.indexOf(a); const j = H.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('non trovo ' + a); return H.slice(i, j); };
const css = [...H.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const pannello = tra('<div class="panel" id="panel-pipeline">', '<!-- LEAD -->');
const scheda = tra('<!-- MODAL TRATTATIVA -->', '<!-- MODAL LEAD -->');
const codice = [
  tra('let PIPE = [], AGENDA', '/* ══ I COLLABORATORI: UNA FONTE SOLA'),
  tra('/* ══ I COLLABORATORI: UNA FONTE SOLA', '// ─── AGENDA ──'),
  tra('// ─── CARICA TRATTATIVE DA SUPABASE', '// ─── CARICA AGENDA DA SUPABASE')
].join('\n');

/* L'archivio finto: una catena PostgREST che annota quello che si scrive e
   risponde con quello che la prova gli ha preparato. */
const FINTO = `
window.SCRITTE = []; window.RISPOSTE = {};
function q(tab) {
  const r = { tab, op: 'select', filtri: [], dati: null, singolo: false };
  const api = {
    select(){ return api; }, order(){ return api; }, limit(){ return api; },
    or(f){ r.filtri.push(['or', f]); return api; }, eq(k, v){ r.filtri.push([k, v]); return api; },
    contains(){ return api; },
    insert(d){ r.op = 'insert'; r.dati = d; return api; },
    update(d){ r.op = 'update'; r.dati = d; return api; },
    upsert(d){ r.op = 'upsert'; r.dati = d; return api; },
    delete(){ r.op = 'delete'; return api; },
    single(){ r.singolo = true; return api; },
    then(ok, ko) {
      if (r.op !== 'select') window.SCRITTE.push({ tab: r.tab, op: r.op, dati: r.dati, filtri: r.filtri });
      const k = r.tab + ':' + r.op;
      let res = window.RISPOSTE[k];
      if (typeof res === 'function') res = res(r);
      if (!res) res = r.op === 'insert' ? { data: r.singolo ? { id: 900 } : [{ id: 900 }], error: null }
                : r.op === 'update' ? { data: [{ id: 1 }], error: null } : { data: [], error: null };
      return Promise.resolve(res).then(ok, ko);
    }
  };
  return api;
}
window.db = { from: q };
`;
const STUB = `
var ME = { id: 'u-collab' }, PROFILO = { ruolo: 'collaboratore' }, UTENTI_LISTA = [];
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n){ if (n == null || isNaN(n)) return '—'; return new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n); }
function parseNum(v){ return parseFloat(v) || 0; }
function cntOggiIso(){ return '2026-10-08'; }
function logMovimento(){ window.MOVIMENTI = (window.MOVIMENTI||0) + 1; }
function loadTeam(){}
function closeModal(id){ document.getElementById(id).classList.remove('show'); }
function renderAgenda(){} function renderAgendaSePresente(){} async function loadAgendaDB(){}
function openGCal(){}
`;

const pagina = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>
<style>#app{display:block!important;height:auto!important}.panels{overflow:visible!important}.panel{display:block!important;position:static!important}.modal{display:none}.modal.show{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;position:static!important}</style></head>
<body><div id="app"><div class="panels">${pannello}</div>${scheda}</div>
<script>${motore('anagrafica.js')}</script><script>${motore('collaboratori.js')}</script><script>${motore('trattative.js')}</script>
<script>${FINTO}${STUB}${codice}
window.__API = { renderTratt, openTrattModal, saveTratt, trtCensisci, trtModoCliente, trtFastTipo,
  trtClienteScelto, stato: () => ({ PIPE, TRT_CAT }) };
</script></body></html>`;

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.setDefaultTimeout(4000);
const errori = [];
page.on('pageerror', e => errori.push(e.message));
await page.setContent(pagina);

const PIPE_PROVA = [
  { id: '1', cliente: 'ROSSI', status: 'prospect', prodotto: 'RC Auto', premio_lordo: 800, prob: 50, recall: '2026-10-07', data_ins: '2026-10-01', utente_id: 'u-collab' },
  { id: '2', cliente: 'BIANCHI', status: 'trattativa', prodotto: 'RC Auto', importo: 400, prob: 100, data_ins: '2026-10-02', utente_id: 'u-collab' },
  { id: '3', cliente: 'VERDI', status: 'preventivo', prodotto: 'Casa', importo: 0, prob: 30, data_ins: '2026-10-03', utente_id: 'u-collab' },
  { id: '4', cliente: 'NERI', status: 'chiusa', prodotto: 'Tutela legale', premio_lordo: 300, chiusa_il: '2026-10-04', data_ins: '2026-09-01', utente_id: 'u-collab' },
  { id: '5', cliente: 'GIALLI', status: 'persa', prodotto: 'Vita', importo: 1000, chiusa_il: '2026-10-05', data_ins: '2026-09-02', utente_id: 'u-collab' }
];

async function conPipe(lista) {
  await page.evaluate(l => { PIPE = l; window.__API.renderTratt(); }, lista);
}

prova('la schermata si disegna senza errori', async () => {
  await conPipe(PIPE_PROVA);
  deve(!errori.length, 'errori nella pagina: ' + errori.join(' | '));
});

prova('I NUMERI: la pipeline in testa, vinte e perse separate; lo zero non è un valore', async () => {
  const h = await page.locator('#trt-hero').innerText();
  deve(/1\.200,00/.test(h), 'la pipeline non è 1.200: ' + h);
  deve(/1 senza premio/.test(h), 'la trattativa senza premio non si dichiara: ' + h);
  deve(/50%/.test(h), 'tasso di chiusura: ' + h);
  const k = await page.locator('#trt-kpi').innerText();
  deve(/300,00/.test(k) && /1\.000,00/.test(k), 'vinte o perse sbagliate: ' + k);
  deve(!/1\.200,00/.test(k), 'la pipeline è finita anche fra i riquadri: due numeri uguali a cento pixel');
  return 'pipeline 1.200, vinte 300, perse 1.000, 50%';
});

prova('IL TUBO DELLE TAPPE: diviso per valore, e la tappa vuota resta nella legenda', async () => {
  const seg = await page.locator('#trt-hero .trt-tubo span').evaluateAll(es => es.map(e => e.className + ':' + e.style.flexGrow));
  deve(seg.join() === 'trt-c-prospect:800,trt-c-trattativa:400', 'segmenti: ' + seg.join());
  const tappe = await page.locator('#trt-hero .trt-tappa').allInnerTexts();
  deve(tappe.length === 3 && /Preventivo/.test(tappe[1]) && /1 trattativa/.test(tappe[1]), 'tappe: ' + tappe.join(' | '));
  return 'prospect 800, trattativa 400, preventivo vuoto ma in legenda';
});

prova('IL RICHIAMO SCADUTO si vede: nel riquadro, sulla riga e col suo filtro', async () => {
  const k = await page.locator('#trt-kpi .trt-k.trt-call').innerText();
  deve(/1/.test(k) && /in ritardo/.test(k), 'riquadro: ' + k);
  const chip = await page.locator('#tr-list .trt-chip.trt-scad').allInnerTexts();
  deve(chip.length === 1 && /scaduto ieri/.test(chip[0]), 'chip: ' + chip.join());
  await page.selectOption('#tr-filt', 'richiamare');
  const n = await page.locator('#tr-list .trt-r').count();
  await page.selectOption('#tr-filt', '');
  deve(n === 1, 'il filtro «da richiamare» ne mostra ' + n);
  return 'ROSSI, scaduto ieri';
});

prova('IL GRAFICO IN CORSO: per prodotto, dal più grande, e chi non ha premio lo dice', async () => {
  const righe = await page.locator('#trt-g-corso .trt-b').allInnerTexts();
  const nomi = await page.locator('#trt-g-corso .trt-b-n').allInnerTexts();
  deve(righe.length === 2, 'righe: ' + righe.length);
  deve(nomi[0] === 'RC Auto' && /1\.200,00/.test(righe[0]) && /2 trattative/.test(righe[0]), righe[0]);
  deve(/Casa/.test(righe[1]) && /premio non indicato/.test(righe[1]), 'la casa: ' + righe[1]);
  const w = await page.locator('#trt-g-corso .trt-b-pieno').evaluateAll(es => es.map(e => e.style.width));
  deve(parseFloat(w[0]) === 100 && parseFloat(w[1]) === 0, 'larghezze: ' + w.join(', '));
  const vinte = await page.locator('#trt-g-vinte').innerText();
  deve(/Tutela legale/.test(vinte) && !/Vita/.test(vinte), 'le perse sono finite fra le vinte: ' + vinte);
  return 'RC Auto 100%, Casa a zero con la scritta';
});

prova('il filtro sullo stato filtra l’elenco, NON i grafici', async () => {
  await page.selectOption('#tr-filt', 'chiusa');
  const n = await page.locator('#tr-list .trt-r').count();
  const g = await page.locator('#trt-g-corso .trt-b').count();
  await page.selectOption('#tr-filt', '');
  deve(n === 1 && g === 2, 'elenco ' + n + ', grafico ' + g);
});

prova('LE ALIQUOTE NON CI SONO PIÙ: la scheda chiede solo il premio lordo', async () => {
  await page.evaluate(() => window.__API.openTrattModal(null));
  await page.waitForTimeout(50);
  for (const id of ['#mt-aliquota', '#mt-prov', '#mt-calc']) {
    deve(await page.locator(id).count() === 0, id + ' è ancora nella scheda');
  }
  deve(await page.locator('#mt-lordo').isVisible(), 'il premio lordo è sparito con le aliquote');
});

prova('senza cliente non si salva, e la scheda resta aperta', async () => {
  await page.evaluate(() => { window.SCRITTE = []; return window.__API.saveTratt(); });
  const m = await page.locator('#mt-msg').innerText();
  const aperta = await page.locator('#modal-tratt').evaluate(e => e.classList.contains('show'));
  const scritte = await page.evaluate(() => window.SCRITTE.length);
  deve(/cliente/i.test(m) && aperta && scritte === 0, m + ' / aperta ' + aperta + ' / scritte ' + scritte);
});

prova('IL PROSPECT FAST: un CF sbagliato non entra, uno giusto diventa un lead agganciato', async () => {
  await page.evaluate(() => { window.__API.trtModoCliente('fast'); window.__API.trtFastTipo('fisica'); });
  await page.fill('#mt-f-nome', 'Mario'); await page.fill('#mt-f-cognome', 'Prova');
  await page.fill('#mt-f-cf', 'PRVMRA80A01H501A');
  await page.evaluate(() => { window.SCRITTE = []; return window.__API.trtCensisci(); });
  let m = await page.locator('#mt-fast-msg').innerText();
  deve(/codice fiscale/.test(m), 'nessun rifiuto: ' + m);
  const cf = await page.evaluate(() => 'PRVMRA80A01H501' + Anagrafica.controllo('PRVMRA80A01H501'));
  await page.fill('#mt-f-cf', cf);
  await page.evaluate(() => { window.RISPOSTE['quote_anagrafiche:insert'] = { data: { id: 'a-nuovo' }, error: null }; return window.__API.trtCensisci(); });
  const ins = await page.evaluate(() => window.SCRITTE.find(s => s.tab === 'quote_anagrafiche' && s.op === 'insert'));
  deve(ins && ins.dati.lead === true && ins.dati.codice_fiscale === cf && ins.dati.creato_da === 'u-collab', JSON.stringify(ins));
  const id = await page.inputValue('#mt-anag-id');
  deve(id === 'a-nuovo', 'il prospect non è agganciato: ' + id);
  return 'rifiutato il refuso, creato e agganciato quello giusto';
});

prova('se c’è già (stessa partita IVA) si aggancia quello, niente doppione', async () => {
  await page.evaluate(() => { window.__API.trtClienteScelto(null, ''); window.__API.trtModoCliente('fast'); window.__API.trtFastTipo('giuridica'); });
  await page.fill('#mt-f-rs', 'Prova srl'); await page.fill('#mt-f-piva', '01234567897');
  await page.evaluate(() => {
    window.SCRITTE = [];
    window.RISPOSTE['quote_anagrafiche:select'] = { data: [{ id: 'a-gia', tipo: 'giuridica', ragione_sociale: 'PROVA SRL', lead: false }], error: null };
    return window.__API.trtCensisci();
  });
  const ins = await page.evaluate(() => window.SCRITTE.filter(s => s.tab === 'quote_anagrafiche').length);
  const id = await page.inputValue('#mt-anag-id');
  await page.evaluate(() => { delete window.RISPOSTE['quote_anagrafiche:select']; });
  deve(ins === 0 && id === 'a-gia', 'scritture ' + ins + ', agganciato ' + id);
});

prova('IL RICHIAMO VA IN AGENDA con un id stabile', async () => {
  await page.selectOption('#mt-ramo', 'tutela');
  await page.fill('#mt-lordo', '121.25');
  await page.fill('#mt-recall', '2026-10-20'); await page.fill('#mt-recall-ora', '10:30');
  await page.evaluate(() => { window.SCRITTE = []; window.RISPOSTE['iam_trattative:insert'] = { data: { id: 77 }, error: null }; return window.__API.saveTratt(); });
  const s = await page.evaluate(() => window.SCRITTE);
  const tr = s.find(x => x.tab === 'iam_trattative' && x.op === 'insert');
  deve(tr && tr.dati.premio_lordo === 121.25 && tr.dati.anagrafica_id === 'a-gia', 'trattativa: ' + JSON.stringify(tr && tr.dati));
  deve(!('premio_netto' in tr.dati) && !('aliquota_imposte' in tr.dati), 'si scrive ancora un imponibile che nessuno ha dichiarato');
  deve(tr.dati.importo === 121.25, 'importo non allineato al lordo');
  const ag = s.find(x => x.tab === 'iam_agenda' && x.op === 'upsert');
  deve(ag && ag.dati.id === 'tratt-77' && ag.dati.data === '2026-10-20' && ag.dati.ora === '10:30', 'agenda: ' + JSON.stringify(ag));
  return 'lordo 121,25, agenda tratt-77';
});

prova('UN COLLABORATORE non concede l’autorizzazione e non chiude vinta una trattativa che la aspetta', async () => {
  await page.evaluate(() => window.__API.openTrattModal(null));
  await page.waitForTimeout(50);
  await page.evaluate(() => window.__API.trtClienteScelto('a1', 'ROSSI', 'Cliente'));
  await page.check('#mt-aut'); await page.locator('#mt-aut').dispatchEvent('change');
  deve(await page.locator('#mt-aut-stato').isDisabled(), 'la tendina dell’autorizzazione è aperta a un collaboratore');
  await page.selectOption('#mt-status', 'chiusa');
  await page.evaluate(() => { window.SCRITTE = []; return window.__API.saveTratt(); });
  const m = await page.locator('#mt-msg').innerText();
  const n = await page.evaluate(() => window.SCRITTE.length);
  deve(/autorizzazione/.test(m) && n === 0, m + ' / scritte ' + n);
});

prova('CON IL MOTORE DI STAMATTINA IN CACHE la schermata si disegna lo stesso (§74)', async () => {
  const esito = await page.evaluate(l => {
    PIPE = l;
    const vero = { richiamoStato: Trattative.richiamoStato, fasiCorso: Trattative.fasiCorso };
    delete Trattative.richiamoStato; delete Trattative.fasiCorso;
    let errore = null;
    try { window.__API.renderTratt(); } catch (e) { errore = e.message; }
    Object.assign(Trattative, vero);
    const righe = document.querySelectorAll('#tr-list .trt-r').length;
    window.__API.renderTratt();
    return { errore, righe };
  }, PIPE_PROVA);
  deve(!esito.errore && esito.righe > 0, 'con un motore vecchio: ' + (esito.errore || esito.righe + ' righe'));
});

prova('UN AGGIORNAMENTO CHE NON TOCCA RIGHE NON È UN SALVATAGGIO (BUG 1)', async () => {
  await conPipe(PIPE_PROVA);
  await page.evaluate(() => window.__API.openTrattModal('1'));
  await page.waitForTimeout(50);
  await page.evaluate(() => { window.RISPOSTE['iam_trattative:update'] = { data: [], error: null }; return window.__API.saveTratt(); });
  const m = await page.locator('#mt-msg').innerText();
  const aperta = await page.locator('#modal-tratt').evaluate(e => e.classList.contains('show'));
  await page.evaluate(() => { delete window.RISPOSTE['iam_trattative:update']; });
  deve(/Non salvato/.test(m) && aperta, m + ' / aperta ' + aperta);
});

let ok = 0;
for (const e of esiti) {
  try { const r = await e.fn(); ok++; console.log('  ok  ' + e.nome + (r ? ' — ' + r : '')); }
  catch (err) { console.log('  X   ' + e.nome + ' — ' + err.message); }
}
if (process.env.FOTO) {
  await page.evaluate(() => { document.getElementById('modal-tratt').classList.remove('show'); });
  await conPipe(PIPE_PROVA);
  await page.evaluate(() => document.querySelectorAll('html,body,.panels,.panel,#app').forEach(e => { e.scrollTop = 0; }));
  await page.screenshot({ path: process.env.FOTO, fullPage: true });
  if (process.env.FOTO_TELEFONO) {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(() => document.querySelectorAll('html,body,.panels,.panel,#app').forEach(e => { e.scrollTop = 0; }));
    await page.screenshot({ path: process.env.FOTO_TELEFONO, fullPage: true });
  }
}
await browser.close();
console.log(`\nTRATTATIVE NEL BROWSER: ${ok} superate, ${esiti.length - ok} fallite`);
if (ok !== esiti.length) process.exit(1);
