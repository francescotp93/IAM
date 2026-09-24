/* ═══════════════════════════════════════════════════════════════════════════
   LE COLONNE CHE SI CHIEDONO DEVONO ESISTERE                    (24/09/2026)

   Nato da tre guasti trovati lo stesso giorno, tutti della stessa famiglia:

     · `quote_collaboratori.rui`      (la colonna e' `rui_numero`)
     · `iam_utenti.iam_id`            (non esiste: l'id dell'account E' `id`)
     · `quote_titoli.data_incasso`    (la colonna e' `incassato_il`)

   PostgREST risponde **400** su una colonna che non esiste. Dove la lettura
   sta in piedi da sola (§35) non spegne la pagina: spegne un riquadro, o una
   sezione, e dice «non si e' potuto leggere». Il terzo era cosi' — il
   riquadro «Incassato questo mese» sulla Scrivania di IAM era spento dal
   20/09 e non se n'era accorto nessuno.

   PERCHE' LE PROVE NON LI PRENDEVANO. Il finto database del banco restituisce
   quello che gli si mette dentro e **non guarda i nomi delle colonne**: una
   prova che fa girare la schermata resta verde con qualunque nome. E' §1 in
   una forma nuova — una suite verde dice che il codice fa quello che chi l'ha
   scritto aveva in mente, non che la tabella abbia quelle colonne.

   COME FUNZIONA. `supabase/colonne.json` e' una FOTOGRAFIA dello schema vero,
   presa dal database. Questa prova estrae le select letterali dei due
   documenti e chiede a quella fotografia se quelle colonne esistono.

   QUANDO DIVENTA ROSSA ci sono due cause, e la prova le dice tutte e due:
   o e' un refuso, o la fotografia e' vecchia perche' una migrazione ha
   aggiunto una colonna. Nel secondo caso si rifa' la fotografia — la riga
   per farlo sta dentro il file, in `_come_si_rifa`.

   UNA TABELLA CHE LA FOTOGRAFIA NON CONOSCE NON FA ROSSO, e non e' una
   distrazione: una tabella nuova si vede a occhio nudo, una colonna
   sbagliata su una tabella che c'e' no — ed e' quella che si sta cercando.
   Le tabelle saltate si contano, cosi' non spariscono in silenzio.
   ═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');

let passate = 0, fallite = 0;
function prova(nome, fn) {
  try { const n = fn(); passate++; console.log('  OK  ' + nome + (n ? ' — ' + n : '')); }
  catch (e) { fallite++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
function deve(c, m) { if (!c) throw new Error(m); }

/* ── I commenti non si tolgono con una regex globale (§12) ─────────────────
   Su un documento da 2 MB «via tutto quello che sta fra /* e la sua chiusura»
   si mangia mezzo file, perche' quelle due sequenze compaiono dentro le
   espressioni regolari e dentro il CSS. Si legge carattere per carattere
   tenendo lo stato, e le STRINGHE si conservano: e' dentro una stringa che
   sta l'elenco delle colonne. */
function senzaCommenti(s) {
  let out = '', i = 0, stato = 'fuori', apice = '';
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (stato === 'fuori') {
      if (c === '/' && d === '/') { stato = 'riga'; i += 2; continue; }
      if (c === '/' && d === '*') { stato = 'blocco'; i += 2; continue; }
      if (s.startsWith('<!--', i)) { stato = 'html'; i += 4; continue; }
      if (c === '"' || c === "'" || c === '`') { stato = 'stringa'; apice = c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (stato === 'stringa') {
      if (c === '\\') { out += c + (d || ''); i += 2; continue; }
      if (c === apice) stato = 'fuori';
      out += c; i++; continue;
    }
    if (stato === 'riga') { if (c === '\n') { stato = 'fuori'; out += c; } i++; continue; }
    if (stato === 'blocco') { if (c === '*' && d === '/') { stato = 'fuori'; i += 2; continue; } if (c === '\n') out += c; i++; continue; }
    if (stato === 'html') { if (s.startsWith('-->', i)) { stato = 'fuori'; i += 3; continue; } if (c === '\n') out += c; i++; continue; }
  }
  return out;
}

/* Le colonne di primo livello di una `select`: le virgole dentro le
   parentesi appartengono a una risorsa agganciata, che e' un'altra tabella. */
function livelloUno(s) {
  const out = []; let buf = '', p = 0;
  for (const ch of s) {
    if (ch === '(') p++;
    if (ch === ')') p--;
    if (ch === ',' && p === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out.map(x => x.trim()).filter(Boolean);
}

function chieste(file) {
  const s = senzaCommenti(fs.readFileSync(path.join(RADICE, file), 'utf8'));
  const re = /from\(\s*'([a-z0-9_]+)'\s*\)\s*\.select\(\s*'([^']*)'/g;
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    const riga = s.slice(0, m.index).split('\n').length;
    for (const raw of livelloUno(m[2])) {
      if (raw.includes('(')) continue;      // risorsa agganciata
      if (raw.includes('->')) continue;     // percorso dentro un jsonb
      if (raw === '*' || raw.startsWith('count')) continue;
      let col = raw.includes(':') ? raw.split(':').pop().trim() : raw;
      col = col.replace(/!.*$/, '').replace(/::.*$/, '').trim();
      if (!/^[a-z0-9_]+$/.test(col)) continue;
      out.push({ file, riga, tabella: m[1], colonna: col });
    }
  }
  return out;
}

const FOTO = JSON.parse(fs.readFileSync(path.join(RADICE, 'supabase', 'colonne.json'), 'utf8'));
const DOCUMENTI = ['index.html', 'iam/index.html'];

console.log('\nLE COLONNE CHE SI CHIEDONO DEVONO ESISTERE');
console.log('fotografia dello schema: ' + FOTO._fotografia + '\n');

prova('la fotografia dello schema c’è, ed è quella vera', () => {
  const t = FOTO.tabelle || {};
  deve(Object.keys(t).length > 50, 'la fotografia ha ' + Object.keys(t).length + ' tabelle: è troppo poco per essere quella vera');
  /* Tre colonne che questo lavoro ha misurato sul database: se la fotografia
     non le conosce, non è una fotografia dello schema di questa agenzia. */
  deve((t.quote_collaboratori || '').split(' ').includes('rui_numero'), 'la fotografia non conosce quote_collaboratori.rui_numero');
  deve((t.quote_titoli || '').split(' ').includes('incassato_il'), 'la fotografia non conosce quote_titoli.incassato_il');
  deve(!(t.iam_utenti || '').split(' ').includes('iam_id'), 'la fotografia dice che iam_utenti.iam_id esiste, e non esiste');
  return Object.keys(t).length + ' tabelle, ' + Object.values(t).reduce((a, c) => a + c.split(' ').length, 0) + ' colonne';
});

prova('ogni colonna chiesta in una select letterale esiste davvero', () => {
  const tutte = DOCUMENTI.flatMap(chieste);
  deve(tutte.length > 200, 'ne ho lette solo ' + tutte.length + ': la lettura del sorgente non sta funzionando');
  const saltate = new Set();
  const male = [];
  for (const c of tutte) {
    const cols = FOTO.tabelle[c.tabella];
    if (!cols) { saltate.add(c.tabella); continue; }
    if (!cols.split(' ').includes(c.colonna)) male.push(c);
  }
  if (male.length) {
    const vicine = (t, col) => (FOTO.tabelle[t] || '').split(' ')
      .filter(x => x.includes(col.split('_')[0]) || col.includes(x.split('_')[0])).slice(0, 3).join(', ');
    throw new Error('colonne che non esistono:\n' + male.map(c =>
      '        ' + c.file + ':' + c.riga + '  ' + c.tabella + '.' + c.colonna
      + (vicine(c.tabella, c.colonna) ? '   (forse: ' + vicine(c.tabella, c.colonna) + ')' : ''))
      .join('\n')
      + '\n        O è un refuso, o la fotografia è vecchia: si rifà con la riga'
      + '\n        scritta in supabase/colonne.json, campo _come_si_rifa.');
  }
  return tutte.length + ' colonne chieste, tutte esistono'
    + (saltate.size ? ' · ' + saltate.size + ' tabelle non nella fotografia: ' + [...saltate].join(', ') : '');
});

prova('i commenti non contano come codice', () => {
  const finto = "/* qui db.from('quote_titoli').select('data_incasso') non c'è più */\n"
    + "const x = db.from('quote_titoli').select('incassato_il');";
  const s = senzaCommenti(finto);
  deve(!s.includes('data_incasso'), 'il commento è rimasto: una colonna nominata per spiegare perché è stata tolta farebbe rosso un codice giusto');
  deve(s.includes('incassato_il'), 'la stringa vera è sparita insieme al commento');
  return 'commento via, stringa viva';
});

console.log('\n' + passate + ' superate, ' + fallite + ' fallite\n');
process.exit(fallite ? 1 : 0);
