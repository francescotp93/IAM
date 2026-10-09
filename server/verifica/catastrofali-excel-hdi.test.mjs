// ═══════════════════════════════════════════════════════════════════════════════
//  CATASTROFALI — il nostro premio è quello del preventivatore Excel di HDI
//  (09/10/2026)
//
//  Francesco ha il file Excel con cui HDI quota il prodotto («Proposta
//  #rischi catastrofali civili abitazioni, tariffa in vigore dal 01/01/2023»):
//  dentro c'è la tariffa completa, CAP per CAP. Il file non sta nel repository
//  (è un documento interno di HDI); ci stanno i PREMI che calcola, ricalcolati
//  con LibreOffice sulle sue formule, in `campioni/catastrofali-excel-hdi.csv`.
//
//  Il premio di riferimento è la cella N17, «Premio annuo polizza»: senza
//  l'abbonamento per assistenza legale, peritale e arbitrale e senza
//  commissioni (la N22 li aggiunge: +3,3% e +20%). È quello che vendiamo.
//
//  Sul confronto completo (4.779 CAP × 3 valori × 5 combinazioni di garanzie,
//  71.685 casi) il motore coincide al centesimo di euro. Qui gira un campione
//  di circa duemila casi, compresi tutti quelli che prima davano un euro di
//  differenza. Se diventa rossa, il preventivo ha smesso di essere quello di
//  HDI: non si cambia il numero nel campione, si guarda il motore o la tabella.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const richiedi = createRequire(import.meta.url);
const M = richiedi(path.join(RADICE, 'tariffe/motore/catastrofali.js'));
M.caricaTariffa(JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/catastrofali_cap.json'), 'utf8')));

const casi = fs.readFileSync(path.join(RADICE, 'server/verifica/campioni/catastrofali-excel-hdi.csv'), 'utf8')
  .split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('cap;'))
  .map(l => { const c = l.split(';'); return { cap: c[0], valore: +c[1], terrCont: c[2] === 'si', alluFabb: c[3] === 'si', alluCont: c[4] === 'si', premio: +c[5] }; });

const esiti = [];
const prova = (n, f) => { try { const m = f(); esiti.push([true, n, m || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il campione c\'è ed è abbastanza largo', () => {
  deve(casi.length >= 1500, 'casi nel campione: ' + casi.length);
  return casi.length + ' casi';
});

prova('ogni premio coincide con quello dell\'Excel HDI (senza tutela legale)', () => {
  const diversi = [];
  for (const k of casi) {
    const r = M.calcCatPremio(k.cap, k.valore, { terrCont: k.terrCont, alluFabb: k.alluFabb, alluCont: k.alluCont });
    if (!r || r.premio !== k.premio) diversi.push(k.cap + ' ' + k.valore + ' € → nostro ' + (r && r.premio) + ', Excel ' + k.premio);
  }
  deve(!diversi.length, diversi.length + ' premi diversi: ' + diversi.slice(0, 5).join(' · '));
  return casi.length + ' premi identici';
});

prova('i casi di confine sono nel campione (dove la virgola mobile sbagliava di un euro)', () => {
  const k = casi.find(x => x.cap === '37135' && x.valore === 1100000 && x.terrCont && x.alluFabb && !x.alluCont);
  deve(k && k.premio === 1023, 'manca il caso del CAP 37135 (1.023 €)');
});

prova('le combinazioni di garanzie sono tutte rappresentate', () => {
  const combo = new Set(casi.map(k => [k.terrCont, k.alluFabb, k.alluCont].join()));
  deve(combo.size >= 5, 'combinazioni: ' + combo.size);
});

let ko = 0;
console.log('\nCATASTROFALI — Excel HDI');
for (const [ok, n, m] of esiti) { console.log(ok ? '  ok  ' + n + (m ? ' — ' + m : '') : '  X   ' + n + ' — ' + m); if (!ok) ko++; }
console.log(`\nCATASTROFALI EXCEL HDI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
