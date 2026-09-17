// ═══════════════════════════════════════════════════════════════════════════════
//  «PERFORMANCE» NON STA PIU' IN QUOTO (17/09/2026, passo 3 modulo 3)
//
//  La pagina di QUOTO con preventivi, polizze, conversione e grafico mensile
//  dentro IAM non la raggiungeva nessuno. I numeri stanno in IAM → KPI e gare
//  › Produzione; qui resta un rimando, sulla stessa strada di Utenti
//  (quoto-apri, elenco chiuso nella scocca). Queste prove guardano il
//  sorgente: che il doppione sia sparito davvero, libreria compresa, e che il
//  rimando dica dove andare.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ritaglia } from '../../iam/verifica/banco.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const quoto = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(RADICE, 'iam', 'withus-one.js'), 'utf8');
const contratto = fs.readFileSync(path.join(RADICE, 'INTERFACCIA-QUOTO-IAM.md'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };
const senzaCommenti = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

prova('il grafico e il suo caricamento non ci sono piu\', e nemmeno la libreria che serviva solo a loro', () => {
  const s = senzaCommenti(quoto);
  deve(!/function loadPerformance\(/.test(s) && !/function renderPerfChart\(/.test(s), 'loadPerformance o renderPerfChart esistono ancora');
  deve(!/perfChart/.test(s), 'resta la variabile del grafico');
  deve(!/apexcharts/i.test(s), 'ApexCharts si carica ancora dal CDN: serviva solo al grafico Performance');
  deve(!/id="nav-perf"/.test(s) && !/performance:'nav-perf'/.test(s), 'la voce di menu Performance c\'e\' ancora');
  return 'niente loadPerformance, renderPerfChart, ApexCharts, nav-perf';
});

prova('la pagina resta come rimando a IAM → KPI e gare › Produzione, e la porta ?page=performance esiste ancora', () => {
  const i = quoto.indexOf('id="page-performance"');
  deve(i >= 0, 'la pagina performance non esiste piu\': la scocca che chiede ?page=performance aprirebbe un riquadro vuoto');
  const pagina = quoto.slice(i, quoto.indexOf('</div>\n\n', i));
  deve(/KPI e gare › Produzione/.test(pagina), 'il rimando non dice dove sono finiti i numeri');
  deve(/onclick="apriPerformanceInIam\(\)"/.test(pagina), 'manca il tasto che apre IAM');
  deve(/'performance','ticket'/.test(quoto), 'performance non e\' piu\' fra le pagine che la scocca puo\' chiedere');
  return 'rimando con tasto, pagina ancora raggiungibile';
});

prova('il rimando usa quoto-apri con tab performance, mai verso \'*\', e a pagina intera va a IAM', () => {
  const fn = ritaglia(quoto, 'apriPerformanceInIam');
  deve(fn, 'apriPerformanceInIam non si ritaglia');
  deve(/w1:\s*'quoto-apri'/.test(fn) && /tab:\s*'performance'/.test(fn), 'il messaggio non e\' quoto-apri con tab performance');
  deve(!/'\*'/.test(fn) && /PONTE_IAM \|\| IAM_ORIGINI\[0\]/.test(fn), 'la destinazione non e\' dichiarata');
  deve(/window\.location\.href = IAM_URL/.test(fn), 'a pagina intera non va a IAM');
  return 'quoto-apri → IAM, destinazione dichiarata';
});

prova('la scocca accetta performance nell\'elenco chiuso, e il contratto lo dice', () => {
  const i = scocca.indexOf("d.w1 === 'quoto-apri'");
  deve(i >= 0 && /APRIBILI\s*=\s*\{[^}]*performance:\s*'performance'/.test(scocca.slice(i, i + 400)), 'APRIBILI non elenca performance');
  deve(/`utenti`[^\n]*`performance`|utenti[^\n]{0,80}performance/.test(contratto.slice(contratto.indexOf('APRIBILI'), contratto.indexOf('APRIBILI') + 400)), 'il contratto non elenca performance fra le schede apribili');
  deve(/\*\*KPI e gare\*\*[^\n]*Produzione/.test(contratto), 'la riga KPI e gare di §2.7 non dice che la produzione sta in IAM');
  return 'scocca + contratto allineati';
});

console.log('\n══ PERFORMANCE IN IAM ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nPERFORMANCE IN IAM: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
