// ═══════════════════════════════════════════════════════════════════════════════
//  I TASTI DEVONO FUNZIONARE
//
//  «Assicurati che tutti i tasti funzionano» — Francesco, 25/09/2026.
//
//  Un tasto che chiama una funzione che non esiste non dà nessun segno: si
//  preme, non succede niente, e l'errore resta nella console del browser dove
//  non lo guarda nessuno. Per chi ci lavora è indistinguibile da un'app lenta.
//
//  Fra le due pagine ci sono più di 1.500 `onclick` e 400 altri gestori: a
//  mano non si controllano, e soprattutto non si ricontrollano dopo ogni
//  modifica. Questa prova lo fa a ogni giro.
//
//  COSA CONTROLLA, ed è meno ovvio di quanto sembri:
//
//    · `onclick="pippo()"`  →  `pippo` dev'essere definita nella pagina
//    · `onclick="Motore.pippo()"`  →  `Motore` dev'essere un motore davvero
//      caricato dalla pagina, e `pippo` un suo metodo
//    · i nomi del browser (alert, confirm, window.open, event…) non contano
//
//  COSA NON PUÒ CONTROLLARE, e va detto invece di lasciarlo credere: che il
//  tasto faccia la cosa GIUSTA. Questa prova dice che qualcosa succede, non
//  che sia la cosa voluta. Per quello servono le prove da utente vero, che
//  oggi non ci sono (IAM_TEST_PLAN.md § 4).
// ═══════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = join(QUI, '..', '..');

const esiti = [];
function prova(nome, fn) {
  try { const d = fn(); esiti.push([true, nome, d || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* Quello che il browser offre da solo: non è compito della pagina definirlo. */
const DEL_BROWSER = new Set([
  'alert', 'confirm', 'prompt', 'open', 'close', 'print', 'focus', 'blur',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch',
  'encodeURIComponent', 'decodeURIComponent', 'parseInt', 'parseFloat',
  'isNaN', 'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math',
  'Date', 'RegExp', 'Promise', 'Set', 'Map', 'console', 'window', 'document',
  'location', 'history', 'navigator', 'localStorage', 'sessionStorage',
  'event', 'this', 'return', 'if', 'else', 'true', 'false', 'null', 'undefined',
  'void', 'typeof', 'new', 'delete', 'try', 'catch', 'for', 'while', 'let',
  'const', 'var', 'function', 'class', 'await', 'async', 'of', 'in',
]);

/* I gestori scritti nell'HTML: onclick e i suoi fratelli. */
const GESTORI = /\son(click|change|input|submit|keyup|keydown|keypress|blur|focus|dblclick|mouseenter|mouseleave|paste)\s*=\s*"([^"]*)"/gi;

/* I nomi definiti dentro un pezzo di JavaScript. Non è un parser: è un
   riconoscitore di forme, e sono le forme che questo progetto usa davvero
   (`function f(`, `const f = `, `window.f = `, `f: function` negli oggetti). */
function nomiDefiniti(js) {
  const n = new Set();
  const forme = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g,
    /\bwindow\.([A-Za-z_$][\w$]*)\s*=/g,
  ];
  for (const f of forme) { let m; while ((m = f.exec(js))) n.add(m[1]); }
  return n;
}

/* TUTTE le variabili dichiarate, non solo quelle che tengono una funzione.
   Serve per i gestori come `COLLAB_VOLUMI.splice(...)`: `COLLAB_VOLUMI` è un
   array, `splice` è un metodo di JavaScript, e non c'è niente di rotto. La
   prima versione di questa prova li segnalava come tasti morti — cioè dava
   cinque falsi allarmi su una pagina sana, che è il modo migliore per far
   smettere di guardare il rosso. */
function variabiliDichiarate(js) {
  const n = new Set();
  let m;
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = re.exec(js))) n.add(m[1]);
  return n;
}

/* I motori caricati dalla pagina, col nome con cui si presentano su `window`.
   Il nome NON si indovina dal file: si legge dalla riga `window.X = API` del
   motore stesso — «foglio-cassa.js» si chiama `FoglioCassa`, e nessuna regola
   meccanica ci arriva. */
function motoriDella(pagina, html) {
  const base = dirname(join(RADICE, pagina));
  const out = new Map();
  const tag = /<script\s+src="([^"?]+)[^"]*"><\/script>/g;
  let m;
  while ((m = tag.exec(html))) {
    const rel = m[1];
    if (/^https?:/.test(rel)) continue;
    const percorso = rel.startsWith('/')
      ? join(RADICE, rel.replace(/^\/nuovo-preventivo\//, '').replace(/^\//, ''))
      : join(base, rel);
    let src;
    try { src = readFileSync(percorso, 'utf8'); } catch { continue; }
    const g = /window\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/.exec(src);
    if (!g) continue;
    /* I metodi esposti: le chiavi dell'oggetto API. */
    const api = new RegExp('var\\s+' + g[2] + '\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};').exec(src);
    const metodi = new Set();
    if (api) {
      let k; const chiave = /([A-Za-z_$][\w$]*)\s*:/g;
      while ((k = chiave.exec(api[1]))) metodi.add(k[1]);
    }
    out.set(g[1], metodi);
  }
  return out;
}

/* Da un gestore come `salva('x'); chiudi()` tira fuori le chiamate:
   [['','salva'], ['','chiudi']]. Con lo spazio dei nomi quando c'è. */
function chiamate(codice) {
  /* Prima si tolgono le stringhe: dentro a un gestore ci finisce del CSS
     (`style.transform = 'translateX(8px)'`) e dei messaggi, e `translateX(`
     ha la forma identica a una chiamata. Era il secondo falso allarme della
     prima versione di questa prova. */
  const nudo = codice.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");
  const out = [];
  const re = /([A-Za-z_$][\w$]*)\s*(?:\.\s*([A-Za-z_$][\w$]*))?\s*\(/g;
  let m;
  while ((m = re.exec(nudo))) {
    const prima = nudo[m.index - 1];
    if (prima === '.') continue;            // è già la coda di una catena
    out.push([m[2] ? m[1] : '', m[2] || m[1]]);
  }
  return out;
}

function esamina(pagina) {
  const html = readFileSync(join(RADICE, pagina), 'utf8');
  const js = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).join('\n');
  const definiti = nomiDefiniti(js);
  const variabili = variabiliDichiarate(js);
  const motori = motoriDella(pagina, html);

  const morti = [];
  let quanti = 0;
  let m;
  GESTORI.lastIndex = 0;
  while ((m = GESTORI.exec(html))) {
    const codice = m[2];
    for (const [ns, nome] of chiamate(codice)) {
      quanti++;
      if (ns) {
        if (DEL_BROWSER.has(ns)) continue;
        /* Una variabile della pagina che chiama un suo metodo: `array.splice()`,
           `set.has()`. Non si può verificare il metodo di un oggetto qualunque,
           e non serve: non è un tasto morto. */
        if (variabili.has(ns) || definiti.has(ns)) continue;
        if (!motori.has(ns)) { morti.push(`${ns}.${nome}() — «${ns}» non è un motore né una variabile di questa pagina`); continue; }
        const metodi = motori.get(ns);
        if (metodi.size && !metodi.has(nome)) morti.push(`${ns}.${nome}() — «${ns}» non espone «${nome}»`);
        continue;
      }
      if (DEL_BROWSER.has(nome) || definiti.has(nome)) continue;
      morti.push(`${nome}() — non è definita in ${pagina}`);
    }
  }
  return { quanti, morti: [...new Set(morti)], definiti: definiti.size, motori: motori.size };
}

console.log('I TASTI DEVONO FUNZIONARE\n');

for (const pagina of ['index.html', 'iam/index.html']) {
  prova(`${pagina} — ogni gestore chiama qualcosa che esiste`, () => {
    const r = esamina(pagina);
    deve(r.quanti > 100, `ho trovato solo ${r.quanti} chiamate: la lettura della pagina non ha funzionato`);
    deve(r.definiti > 100, `ho trovato solo ${r.definiti} funzioni definite: la lettura del JavaScript non ha funzionato`);
    deve(r.morti.length === 0,
      `${r.morti.length} tasti morti su ${r.quanti} chiamate:\n        ` + r.morti.slice(0, 25).join('\n        ')
      + (r.morti.length > 25 ? `\n        …e altri ${r.morti.length - 25}` : ''));
    return `${r.quanti} chiamate, ${r.definiti} funzioni, ${r.motori} motori — nessun tasto morto`;
  });
}

let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome + (msg ? '  — ' + msg : '')); }
  else console.log('  ❌ ' + nome + '\n        ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Tasti vivi: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
