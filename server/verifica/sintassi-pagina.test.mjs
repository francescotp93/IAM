// ═══════════════════════════════════════════════════════════════════════════════
//  GLI SCRIPT DELLE DUE PAGINE SI DEVONO POTER LEGGERE
//
//  Perché esiste. Il 26/09/2026 ho scritto un commento HTML dentro un template
//  literal e ci ho messo due apici inversi attorno a un nome di funzione:
//
//      return `<div>
//        <!-- La riempie `clkStato` quando … -->     ← qui
//
//  I due apici inversi hanno CHIUSO la stringa a metà, e da lì in poi la pagina
//  non era più JavaScript valido. Il guasto non è «quel riquadro non si
//  disegna»: è che l'INTERO script di 33.000 righe non viene eseguito, quindi
//  QUOTO non parte affatto. Un carattere, tutta l'applicazione.
//
//  Se n'è accorta `parita-amtrust`, che apre la pagina in un browser vero — ma
//  ci mette venti secondi e fa partire Chromium, e dice «la pagina non esegue
//  il suo script» senza il numero di riga. Questa prova fa la stessa domanda in
//  un decimo di secondo e dice riga e colonna.
//
//  Non sostituisce le prove col browser: quelle vedono se la pagina FUNZIONA,
//  questa solo se si può leggere. Ma è la prima a diventare rossa, ed è quella
//  che dice dove guardare.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Le pagine che sono un'applicazione intera in un file solo: un errore di
   sintassi in una di queste non degrada niente, spegne tutto. */
const PAGINE = ['index.html', path.join('iam', 'index.html')];

/* Gli script scritti nel documento, non quelli con `src` (quelli sono file loro
   e li legge `node --check` da sé quando qualcuno li prova). Si tiene la riga di
   partenza, perché un numero di riga dentro il ritaglio non serve a nessuno. */
function scriptInterni(sorgente) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const fuori = [];
  let m;
  while ((m = re.exec(sorgente))) {
    fuori.push({ corpo: m[1], daRiga: sorgente.slice(0, m.index).split('\n').length });
  }
  return fuori;
}

function leggibile(corpo) {
  /* `node --check` invece di `new Function`: dà riga, colonna e la riga di
     codice colpevole, che è tutto quello che serve per andare a sistemare. */
  const f = path.join(os.tmpdir(), 'sintassi-pagina-' + process.pid + '.js');
  try {
    fs.writeFileSync(f, corpo);
    execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'pipe', 'pipe'] });
    return null;
  } catch (e) {
    const testo = String((e.stderr || '') + (e.stdout || ''));
    const r = /:(\d+)\n([\s\S]*?)\n\s*\^/.exec(testo);
    const tipo = (/(SyntaxError:.*)/.exec(testo) || [, 'errore di sintassi'])[1];
    return { riga: r ? +r[1] : null, codice: r ? r[2].trim().slice(0, 100) : '', tipo: tipo.trim() };
  } finally {
    try { fs.unlinkSync(f); } catch (e) { /* già via */ }
  }
}

for (const pagina of PAGINE) {
  prova('gli script scritti dentro ' + pagina + ' sono JavaScript valido', () => {
    const src = fs.readFileSync(path.join(RADICE, pagina), 'utf8');
    const pezzi = scriptInterni(src);
    deve(pezzi.length > 0, 'nessuno script interno trovato: il modo di scrivere la pagina è cambiato, rileggere questa prova');
    const rotti = [];
    for (const p of pezzi) {
      const g = leggibile(p.corpo);
      if (g) rotti.push(pagina + ':' + (g.riga ? p.daRiga + g.riga - 1 : '?') + ' — ' + g.tipo + (g.codice ? '  →  ' + g.codice : ''));
    }
    deve(rotti.length === 0, rotti.join('\n        '));
    const righe = pezzi.reduce((a, p) => a + p.corpo.split('\n').length, 0);
    return pezzi.length + ' script, ' + righe.toLocaleString('it-IT') + ' righe';
  });
}

prova('un apice inverso dentro un commento HTML in un template literal si vede', () => {
  /* La controprova, dentro la prova stessa: si prende il guasto vero del
     26/09/2026 e si pretende che questo controllo lo trovi. Senza questa riga,
     un giorno qualcuno può «semplificare» `leggibile` e non accorgersene,
     perché su codice sano tutto resta verde. */
  const guasto = 'function f() {\n  return `<div>\n    <!-- la riempie `x` quando serve -->\n  </div>`;\n}\n';
  const g = leggibile(guasto);
  deve(g !== null, 'il controllo non vede il guasto che gli ha dato il nome: non protegge niente');
  const sano = 'function f() {\n  return `<div>\n    <!-- la riempie x quando serve -->\n  </div>`;\n}\n';
  deve(leggibile(sano) === null, 'il controllo grida al lupo su codice sano: ' + JSON.stringify(leggibile(sano)));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nSINTASSI DELLE PAGINE — un carattere non deve spegnere l\'applicazione');
for (const { nome, fn } of esiti) {
  try { const d = await fn(); console.log('  ok  ' + nome + (d ? ' — ' + d : '')); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nSINTASSI DELLE PAGINE: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
