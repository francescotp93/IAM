/* ═══════════════════════════════════════════════════════════════════════════
   IL CONTRASSEGNO DEI MOTORI NON RESTA INDIETRO              (24/09/2026)

   Francesco: «il tasto Registra l'arrivo non funziona». Non faceva niente, e
   non diceva niente.

   LA CAUSA. `iam/index.html` caricava il motore della contabilita' con
   `?v=20260919`, e quel file era stato cambiato **cinque giorni dopo**. Gli
   header lo confermano: la pagina esce `no-cache` (§12), il motore esce
   `cache-control: max-age=600`. Quindi il browser puo' prendere l'HTML NUOVO
   e riusare il motore VECCHIO senza nemmeno chiedere — e la schermata nuova
   chiama una funzione che nel motore in memoria non c'e' ancora.

   > **Il contrassegno non e' un dettaglio: e' l'unica cosa che tiene d'accordo
   > l'HTML e il motore.** Quando resta indietro, i due sono di giorni diversi
   > e nessun errore lo dice: un bottone smette di funzionare, in silenzio.

   IL CENSIMENTO del 24/09/2026 ha trovato **21 contrassegni indietro** sui due
   documenti, alcuni di quaranta giorni. Non era un caso: era una disciplina
   che nessuno aveva mai misurato — ed e' §27 (il numero di versione scritto a
   mano) applicato ai motori invece che all'applicazione.

   COME SI RIALLINEA: il contrassegno di `tariffe/motore/X.js` dev'essere >=
   alla data dell'ultimo commit che ha toccato quel file, che si legge con
   `git log -1 --format=%cd --date=format:%Y%m%d -- tariffe/motore/X.js`.
   Il rosso di questa prova elenca quelli indietro con la data giusta accanto.

   SU UN CLONE SUPERFICIALE la storia non c'e': la prova dice «saltata» invece
   di diventare rossa *per la strada* invece che per il contenuto (§4, §27).
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');

let passate = 0, fallite = 0, saltate = 0;
function prova(nome, fn) {
  try {
    const n = fn();
    if (n === null) { saltate++; console.log('  ~   ' + nome + ' — saltata'); return; }
    passate++; console.log('  OK  ' + nome + (n ? ' — ' + n : ''));
  } catch (e) { fallite++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
function deve(c, m) { if (!c) throw new Error(m); }

const DOCUMENTI = ['index.html', 'iam/index.html'];

function ultimoCommit(rel) {
  try {
    return execSync('git log -1 --format=%cd --date=format:%Y%m%d -- ' + JSON.stringify(rel),
      { cwd: RADICE, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) { return ''; }
}

console.log('\nIL CONTRASSEGNO DEI MOTORI NON RESTA INDIETRO\n');

prova('ogni motore è caricato con un contrassegno di versione', () => {
  const senza = [];
  for (const f of DOCUMENTI) {
    const s = fs.readFileSync(path.join(RADICE, f), 'utf8');
    const re = /<script\s+src="([^"]*tariffe\/motore\/[a-z0-9-]+\.js)([^"]*)"/g;
    let m;
    while ((m = re.exec(s))) if (!/\?v=\d{8}/.test(m[2])) senza.push(f + ' → ' + m[1]);
  }
  deve(!senza.length, 'caricati senza contrassegno, quindi con la cache del browser:\n        ' + senza.join('\n        '));
  return 'tutti contrassegnati';
});

prova('il contrassegno NON è più vecchio del motore che carica', () => {
  /* La storia serve: su un clone superficiale non c'è, e allora non si
     misura niente invece di accusare un codice corretto. */
  if (!ultimoCommit('tariffe/motore')) return null;

  const indietro = [];
  let contati = 0;
  for (const f of DOCUMENTI) {
    const s = fs.readFileSync(path.join(RADICE, f), 'utf8');
    const re = /tariffe\/motore\/([a-z0-9-]+)\.js\?v=(\d{8})/g;
    let m;
    while ((m = re.exec(s))) {
      const rel = 'tariffe/motore/' + m[1] + '.js';
      const quando = ultimoCommit(rel);
      if (!quando) continue;          // motore mai committato: non c'è niente da confrontare
      contati++;
      if (quando > m[2]) indietro.push(f + '  ' + m[1] + '.js  v=' + m[2] + '  ma il file è del ' + quando);
    }
  }
  deve(contati > 10, 'ne ho confrontati solo ' + contati + ': la lettura non sta funzionando');
  deve(!indietro.length,
    'contrassegni indietro — il browser può servire il motore vecchio con la pagina nuova:\n        '
    + indietro.join('\n        ')
    + '\n        Si allineano con:  git log -1 --format=%cd --date=format:%Y%m%d -- tariffe/motore/<nome>.js');
  return contati + ' contrassegni, nessuno indietro';
});

prova('una modifica di OGGI non si nasconde dietro un contrassegno di ieri', () => {
  /* Il caso che ha prodotto il guasto: il motore modificato oggi e il
     contrassegno fermo a un giorno prima. È lo stesso confronto di sopra,
     detto sul file di lavoro invece che sulla storia — così vale anche
     PRIMA di committare, che è quando serve. */
  if (!ultimoCommit('tariffe/motore')) return null;
  let sporchi = [];
  try {
    sporchi = execSync('git status --porcelain -- tariffe/motore', { cwd: RADICE, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().split('\n').filter(Boolean)
      .map(r => r.slice(3).trim()).filter(r => /\.js$/.test(r));
  } catch (e) { return null; }
  if (!sporchi.length) return 'nessun motore modificato adesso';

  const oggi = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const male = [];
  for (const rel of sporchi) {
    const nome = path.basename(rel, '.js');
    for (const f of DOCUMENTI) {
      const s = fs.readFileSync(path.join(RADICE, f), 'utf8');
      const m = s.match(new RegExp('tariffe/motore/' + nome + '\\.js\\?v=(\\d{8})'));
      if (m && m[1] < oggi) male.push(f + '  ' + nome + '.js  v=' + m[1] + '  ma lo stai modificando oggi (' + oggi + ')');
    }
  }
  deve(!male.length, 'motori modificati adesso e non contrassegnati:\n        ' + male.join('\n        '));
  return sporchi.length + ' modificati, contrassegni al giorno';
});

console.log('\n' + passate + ' superate, ' + fallite + ' fallite'
  + (saltate ? ', ' + saltate + ' saltate (clone superficiale)' : '') + '\n');
process.exit(fallite ? 1 : 0);
