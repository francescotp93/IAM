// ═══════════════════════════════════════════════════════════════════════════════
//  FONTI COMPAGNIE — chi entra nel pannello
//
//  «Sblocca le funzioni di fonti anche per l'account di
//  lombardo.angelo955@gmail.com» (Francesco, 10/09/2026). Il pannello si apre
//  al Super Admin e a chi sta nell'elenco FONTI_STAFF; lo stesso elenco vive
//  nel server (QUOTE, server/fonti.js) e i due devono dire la stessa cosa.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idx = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (n, f) => { try { esiti.push([true, n, f() || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
const fetta = (da, a) => { const i = idx.indexOf(da); return i < 0 ? '' : idx.slice(i, idx.indexOf(a, i)); };

/* Si ESEGUE la funzione con tre profili diversi: cercare l'indirizzo nel
   sorgente passerebbe anche se il cancello lo ignorasse. */
function accesso(email) {
  const f = fetta('const FONTI_STAFF = ', '\nfunction fontiPuoEntrare');
  deve(f.length > 0, 'non trovo FONTI_STAFF / fontiStatoAccesso');
  const SUPER = 'francesco.oddo199307@gmail.com';
  return new Function('ME', 'isSuperAdmin', f + '\nreturn fontiStatoAccesso();')(email ? { email } : null, () => email && email.toLowerCase() === SUPER);
}

prova('Angelo entra, il Super Admin resta, un altro collaboratore no', () => {
  deve(accesso('lombardo.angelo955@gmail.com') === 'si', 'Angelo resta fuori');
  deve(accesso('Lombardo.Angelo955@gmail.com') === 'si', 'con le maiuscole Angelo resta fuori');
  deve(accesso('francesco.oddo199307@gmail.com') === 'si', 'il Super Admin resta fuori');
  deve(accesso('altro@example.it') === 'no', 'un collaboratore qualunque entra');
  deve(accesso(null) === 'attesa', 'senza profilo risponde secco invece di aspettare');
  return 'si, si, si, no, attesa';
});

prova('il rifiuto non dice piu\' «Super Admin», che non e\' piu\' vero', () => {
  const carica = fetta('async function fontiCarica(', '\n}\n');
  deve(/Riservata a chi gestisce le fonti/.test(carica), 'il messaggio di rifiuto e\' rimasto quello di prima');
  deve(!/Riservata al Super Admin/.test(carica), 'dice ancora «Riservata al Super Admin»');
  return 'messaggio aggiornato';
});

prova('l\'elenco e\' uno, e le azioni passano tutte dallo stesso cancello', () => {
  deve((idx.match(/const FONTI_STAFF = /g) || []).length === 1, 'FONTI_STAFF e\' definito piu\' volte');
  deve(/function fontiPuoEntrare\(\) \{ return fontiStatoAccesso\(\) === 'si'; \}/.test(idx), 'fontiPuoEntrare non passa da fontiStatoAccesso');
  for (const fn of ['fontiAccedi', 'fontiCodiceDiretto']) {
    const f = fetta('async function ' + fn + '(', '\n}\n');
    deve(/fontiPuoEntrare\(\)/.test(f), fn + ' non controlla il cancello');
  }
  return 'un elenco, un cancello';
});

console.log('FONTI COMPAGNIE — chi entra nel pannello');
for (const [ok, n, d] of esiti) console.log(`  ${ok ? 'ok ' : 'X  '} ${n}${d ? ' — ' + d : ''}`);
const ko = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`FONTI COMPAGNIE — staff: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
