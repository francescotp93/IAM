// ═══════════════════════════════════════════════════════════════════════════════
//  CONTROLLA TUTTO — lancia ogni prova di verifica/ e riassume in italiano.
//
//  Si usa cosi':  npm test        (oppure:  node controlla-tutto.mjs)
//
//  Ogni file verifica/*.test.mjs e' indipendente e si chiude con esito 0 se e'
//  tutto a posto. Qui non c'e' nessuna intelligenza: si lanciano tutti, si
//  raccolgono gli esiti e si dice se qualcosa non va.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const radice = path.dirname(fileURLToPath(import.meta.url));
const cartella = path.join(radice, 'verifica');

if (!fs.existsSync(cartella)) {
  console.log('CONTROLLO: manca la cartella verifica/, non c e niente da provare');
  process.exit(1);
}

const prove = fs.readdirSync(cartella).filter(f => f.endsWith('.test.mjs')).sort();
if (prove.length === 0) {
  console.log('CONTROLLO: nessuna prova trovata in verifica/');
  process.exit(1);
}

const falliti = [];
for (const p of prove) {
  const r = spawnSync(process.execPath, [path.join(cartella, p)], { cwd: radice, encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stdout.write(r.stderr);
  if (r.status !== 0) falliti.push(p);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log(falliti.length === 0
  ? `CONTROLLO: tutte le ${prove.length} prove sono superate`
  : `CONTROLLO: ${falliti.length} prove su ${prove.length} non superate — ${falliti.join(', ')}`);
process.exit(falliti.length === 0 ? 0 : 1);
