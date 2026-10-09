// ═══════════════════════════════════════════════════════════════════════════════
//  CATASTROFALI — il nostro premio è quello del portale HDI  (09/10/2026)
//
//  La prova di parità dice che il motore non è cambiato spostandolo. Questa
//  dice una cosa diversa, e più importante: che il premio è quello VERO della
//  compagnia. I numeri qui sotto non li ha calcolati il nostro codice: sono le
//  quotazioni fatte sul portale agenti HDI (PASS) il 09/10/2026, cambiando un
//  fattore alla volta — docs/HDI-CATASTROFALI-PASS.md.
//
//  Se un giorno qualcuno tocca il motore o la tabella dei CAP e questa prova
//  diventa rossa, il nostro preventivo ha smesso di coincidere con quello che
//  HDI emetterebbe. Non si aggiorna il numero qui per farla tacere: si rifà la
//  quotazione sul portale e si scrive la data nuova.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const richiedi = createRequire(import.meta.url);
const M = richiedi(path.join(RADICE, 'tariffe/motore/catastrofali.js'));
M.caricaTariffa(JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/catastrofali_cap.json'), 'utf8')));
const MAPPA = JSON.parse(fs.readFileSync(path.join(RADICE, 'scraper/hdi/catastrofali-pass.json'), 'utf8'));

const esiti = [];
const prova = (n, f) => { try { const m = f(); esiti.push([true, n, m || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Le quotazioni del portale (CAP 91025, stesso indirizzo). Il portale mostra
   i tassi arrotondati a tre decimali: 0,172 e 0,1. */
const PORTALE = [
  { valore: 150000, opt: {},               premio: 60, cosa: 'solo terremoto, scatta il minimo' },
  { valore: 150000, opt: { alluFabb: true }, premio: 60, cosa: 'terremoto + alluvione, scatta il minimo' },
  { valore: 300000, opt: { alluFabb: true }, premio: 81, cosa: 'terremoto + alluvione, 81,66 per difetto' }
];

prova('i tassi del CAP 91025 sono quelli che il portale mostra', () => {
  const r = M.calcCatPremio('91025', 150000, {});
  deve(r, 'CAP 91025 assente dalla tabella');
  deve(r.tassoTerr.toFixed(3) === '0.172', 'tasso terremoto ' + r.tassoTerr + ', il portale mostra 0,172');
  deve(Number(r.tassoAllu.toFixed(3)) === 0.1, 'tasso alluvione ' + r.tassoAllu + ', il portale mostra 0,1');
});

for (const q of PORTALE) {
  prova(q.valore.toLocaleString('it-IT') + ' € · ' + q.cosa + ' → ' + q.premio + ' €', () => {
    const r = M.calcCatPremio('91025', q.valore, q.opt);
    deve(r && r.premio === q.premio, 'il nostro premio è ' + (r && r.premio) + ' €, il portale HDI ' + q.premio + ' €');
  });
}

prova('il premio minimo è quello del portale', () => {
  deve(M.RCAB_PMIN === MAPPA.tariffa.premioMinimo,
    'minimo nostro ' + M.RCAB_PMIN + ' €, portale ' + MAPPA.tariffa.premioMinimo + ' €');
});

prova('la mappa del portale non contiene dati che non devono stare in un repo pubblico', () => {
  const t = JSON.stringify(MAPPA);
  deve(!/JSESSIONID|Set-Cookie|Bearer\s|password/i.test(t), 'nella mappa c\'è una sessione o una password');
  deve(!/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/.test(t), 'nella mappa c\'è un codice fiscale');
  deve(!/\d+(,|\.)\d+\s*%/.test(JSON.stringify(MAPPA.tariffa.provvigioni || '')), 'nella mappa c\'è una percentuale di provvigione');
});

let ko = 0;
console.log('\nCATASTROFALI — portale HDI');
for (const [ok, n, m] of esiti) { console.log(ok ? '  ok  ' + n + (m ? ' — ' + m : '') : '  X   ' + n + ' — ' + m); if (!ok) ko++; }
console.log(`\nCATASTROFALI PORTALE HDI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
