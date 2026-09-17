// ═══════════════════════════════════════════════════════════════════════════════
//  KPI › PRODUZIONE — era la pagina «Performance» di QUOTO (17/09/2026, passo 3 modulo 3)
//
//  Dentro IAM quella pagina non la raggiungeva nessuno. I numeri stanno qui,
//  in «KPI e gare › Produzione», letti dalla stessa tabella (quote_preventivi).
//  Queste prove tengono fermi i conti (che si fanno in una funzione pura) e la
//  regola dei permessi: la linguetta si puo' togliere a un collaboratore come
//  le altre, e all'amministratore non si chiude mai.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { sorgenteAttuale, stanza, ritaglia, esiti, deve, RADICE } from './banco.mjs';

const src = sorgenteAttuale();
const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('KPI PRODUZIONE');

const RIGHE = [
  { creato_il: '2026-01-10T10:00:00Z', prodotto: 'RC Auto', polizza_emessa: true, polizza_il: '2026-02-03T09:00:00Z' },
  { creato_il: '2026-01-20T10:00:00Z', prodotto: 'RC Auto', polizza_emessa: false },
  { creato_il: '2026-03-05T10:00:00Z', prodotto: 'Casa', polizza_emessa: false, dati: { stato: 'emessa' } },
  { creato_il: '2026-12-28T10:00:00Z', prodotto: 'RC Auto', polizza_emessa: true, polizza_il: '2027-01-04T09:00:00Z' },
  { creato_il: '2025-12-31T23:00:00Z', prodotto: 'Fuori anno', polizza_emessa: true },
  { creato_il: 'non una data', prodotto: 'Rotta' },
];

e.prova('i conti: preventivi per mese, polizze nel mese dell\'emissione, conversione, prodotto piu\' quotato', () => {
  const s = stanza(src, ['produzioneRiassunto']);
  deve(!s.mancanti.length, 'produzioneRiassunto non si ritaglia');
  const r = s.ctx.produzioneRiassunto(RIGHE, 2026);
  deve(r.totPrev === 4, 'preventivi del 2026: ' + r.totPrev + ' (attesi 4: fuori anno e data rotta non contano)');
  deve(r.prev[0] === 2 && r.prev[2] === 1 && r.prev[11] === 1, 'preventivi per mese: ' + JSON.stringify(r.prev));
  deve(r.totPol === 3, 'polizze: ' + r.totPol + ' (attese 3: polizza_emessa o stato emessa)');
  deve(r.pol[1] === 1, 'la polizza di gennaio emessa a febbraio deve stare a febbraio: ' + JSON.stringify(r.pol));
  deve(r.pol[2] === 1, 'lo stato «emessa» nei dati vale come polizza');
  deve(r.pol[11] === 1, 'la polizza emessa l\'anno dopo conta nel mese del preventivo, non sparisce: ' + JSON.stringify(r.pol));
  deve(r.conversione === 75, 'conversione: ' + r.conversione + ' (attesa 75)');
  deve(r.top === 'RC Auto', 'prodotto piu\' quotato: ' + r.top);
  return '4 preventivi, 3 polizze, 75%, RC Auto (3 contro 1)';
});

e.prova('senza righe niente divisioni per zero: conversione nulla, prodotto nullo', () => {
  const s = stanza(src, ['produzioneRiassunto']);
  const r = s.ctx.produzioneRiassunto([], 2026);
  deve(r.totPrev === 0 && r.totPol === 0 && r.conversione === null && r.top === null, JSON.stringify(r));
  deve(r.prev.length === 12 && r.pol.length === 12, 'sempre dodici mesi');
  return 'zero, zero, null, null';
});

e.prova('il grafico ha due serie con due tinte fisse, la legenda e la tabella dei numeri', () => {
  const s = stanza(src, ['produzioneGrafico'], { altro: { PROD_MESI: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'] } });
  deve(!s.mancanti.length, 'produzioneGrafico non si ritaglia');
  const prev = [3,0,0,0,0,0,0,0,0,0,0,1], pol = [1,0,0,0,0,0,0,0,0,0,0,0];
  const h = s.ctx.produzioneGrafico(prev, pol);
  deve((h.match(/var\(--prod-prev\)/g) || []).length === 13 && (h.match(/var\(--acc\)/g) || []).length === 13, 'le due serie non hanno ognuna la sua tinta su 12 barre + legenda');
  deve(/Preventivi<\/span>/.test(h) && /Polizze<\/span>/.test(h), 'manca la legenda');
  deve(/<table/.test(h) && /Vedi i numeri/.test(h), 'mancano i numeri in tabella');
  deve(/height:100%;background:var\(--prod-prev\)/.test(h), 'la barra piu\' alta non arriva al 100%');
  deve(/height:33%;background:var\(--prod-prev\)/.test(h), 'la scala non e\' proporzionale al massimo (1 su 3 → 33%)');
  deve(/title="Gen: 3 preventivi, 1 polizze"/.test(h), 'il passaggio del mouse non dice i numeri del mese');
  deve(/--prod-prev:#3b82f6/.test(src) && /--prod-prev:#1d4ed8/.test(src), 'la tinta dei preventivi non e\' definita nei due temi');
  return 'blu + verde, legenda, tabella, scala sul massimo';
});

const CONTORNO = {
  PERMESSI: { admin: { performance: true }, operatore: { performance: true }, collaboratore: { performance: false } },
  canonRuolo: r => (r === 'operativo' ? 'collaboratore' : r || 'collaboratore'),
  profiloDi: () => null, moduliDi: () => null, PROFILI: {},
  renderGaraTabs() {}, selGaraTab() {}, GARA_CUR: 're_pezzi', PERF_CUR: 'gare',
  loadCSFromDB() {}, loadREFromDB() {}, loadTCMFromDB() {},
};
const NOMI_TAB = ['selPerfTab', 'permessiJson', 'kpiFlagsDi'];

e.prova('la linguetta Produzione si apre e carica i numeri', () => {
  let caricato = 0;
  const s = stanza(src, NOMI_TAB, { PROFILO: { id: 'a-1', ruolo: 'admin' }, ME: { id: 'a-1' }, altro: { ...CONTORNO, loadProduzioneKpi() { caricato++; } } });
  deve(!s.mancanti.length, 'mancano: ' + s.mancanti.join(', '));
  s.ctx.selPerfTab('produzione');
  deve(caricato === 1, 'loadProduzioneKpi non viene chiamata');
  deve(s.browser.elemento('pp-produzione').style.display === 'block' && s.browser.elemento('pp-gare').style.display === 'none', 'il pannello non si mostra o gli altri non si nascondono');
  deve(/id="pt-produzione"/.test(src) && /id="pp-produzione"/.test(src) && /id="prod-chart"/.test(src), 'manca la linguetta o il pannello nel markup');
  return 'pannello acceso, numeri caricati';
});

e.prova('a un collaboratore la Produzione si puo\' togliere come le altre; all\'amministratore no', () => {
  const limitato = { id: 'c-1', ruolo: 'collaboratore', permessi: { kpi: { kpi_produzione: false } } };
  let caricato = 0;
  const s = stanza(src, NOMI_TAB, { PROFILO: limitato, ME: { id: 'c-1' }, altro: { ...CONTORNO, loadProduzioneKpi() { caricato++; } } });
  s.ctx.selPerfTab('produzione');
  deve(/non abilitata/i.test(s.browser.elemento('pp-produzione').innerHTML) && caricato === 0, 'la sezione tolta resta aperta o carica lo stesso');
  const admin = { id: 'a-1', ruolo: 'admin', permessi: { kpi: { kpi_produzione: false } } };
  const s2 = stanza(src, NOMI_TAB, { PROFILO: admin, ME: { id: 'a-1' }, altro: { ...CONTORNO, loadProduzioneKpi() {} } });
  s2.ctx.selPerfTab('produzione');
  deve(!/non abilitata/i.test(s2.browser.elemento('pp-produzione').innerHTML), 'chiusa anche all\'amministratore');
  deve(/kpi_produzione:\s*'KPI Produzione/.test(src), 'la spunta non e\' nel pannello controllo KPI (KPI_FLAGS_LABELS)');
  return 'chiusa al collaboratore senza spunta, aperta all\'admin, spunta nel pannello';
});

e.prova('chi non e\' amministratore vede i suoi; l\'amministratore filtra per collaboratore', () => {
  const f = ritaglia(src, 'loadProduzioneKpi');
  deve(f, 'loadProduzioneKpi non si ritaglia');
  deve(/const filtro = admin \? \(\(collabSel && collabSel\.value\) \|\| ''\) : \(\(ME && ME\.id\) \|\| ''\)/.test(f), 'il filtro non distingue admin e collaboratore');
  deve(/if \(filtro\) q = q\.eq\('creato_da', filtro\)/.test(f), 'il filtro non arriva alla richiesta');
  deve(/from\('quote_preventivi'\)/.test(f) && /\.gte\('creato_il', anno \+ '-01-01'\)/.test(f), 'non legge quote_preventivi per anno');
  return 'creato_da = ME.id, o quello scelto dall\'admin';
});

e.prova('la scocca lascia aprire «performance» da quoto-apri, e solo dall\'elenco chiuso', () => {
  const i = scocca.indexOf("d.w1 === 'quoto-apri'");
  deve(i >= 0, 'la scocca non gestisce quoto-apri');
  const blocco = scocca.slice(i, i + 400);
  deve(/APRIBILI\s*=\s*\{[^}]*utenti:\s*'utenti'[^}]*performance:\s*'performance'/.test(blocco), 'APRIBILI non ha performance accanto a utenti: ' + blocco.slice(0, 160));
  deve(/APRIBILI\[String\(d\.tab \|\| ''\)\]/.test(blocco), 'il nome che arriva passa a goTab senza l\'elenco');
  return 'APRIBILI = { utenti, performance }';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
