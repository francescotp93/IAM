// ═══════════════════════════════════════
//  LA PAGINA NON SI FA TENERE IN CACHE
//
//  Il difetto piu' caro di questo repository non e' mai stato un calcolo
//  sbagliato: e' «l'ho pubblicato e non si vede». E' successo col menu delle
//  Convenzioni il 2 settembre, e di nuovo con la scocca il 14 — li' la cura
//  era il ?v= nell'indirizzo di withus-one.js, e c'e' una prova che lo
//  sorveglia (versione-scocca.test.mjs).
//
//  Ma index.html quella leva NON ce l'ha, e non puo' averla: e' il documento
//  che il browser chiede per primo, non c'e' nessun indirizzo da versionare.
//  L'unico posto dove si puo' dire «questo file ricontrollalo sempre» e'
//  l'intestazione HTTP, cioe' vercel.json.
//
//  Senza, una modifica a index.html puo' restare invisibile per ore a chi ha
//  gia' aperto IAM — e nessuna prova del banco se ne accorgerebbe, perche'
//  sul disco il codice c'e'.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const conf = JSON.parse(fs.readFileSync(path.join(radice, 'vercel.json'), 'utf8'));

const esiti = [];
const prova = (nome, fn) => {
  try { const r = fn(); esiti.push([true, nome, r || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Trova l'intestazione che vale per un percorso, fra le regole dichiarate. */
function intestazione(percorso, chiave) {
  for (const r of (conf.headers || [])) {
    const rx = new RegExp('^' + String(r.source).replace(/\/\(\.\*\)/g, '/.*').replace(/\(\.\*\)/g, '.*') + '$');
    if (!rx.test(percorso)) continue;
    const h = (r.headers || []).find(x => x.key.toLowerCase() === chiave.toLowerCase());
    if (h) return h.value;
  }
  return null;
}

prova('la radice del sito si fa ricontrollare a ogni apertura', () => {
  const v = intestazione('/', 'Cache-Control');
  deve(v, 'nessun Cache-Control su «/»: chi ha gia' + '\' aperto IAM puo\' restare sulla copia vecchia');
  deve(/max-age=0/.test(v) && /must-revalidate/.test(v), 'Cache-Control troppo permissivo su «/»: ' + v);
  return v;
});

prova('ogni pagina .html si fa ricontrollare a ogni apertura', () => {
  /* index.html e analisi-bisogni.html: la seconda e' quella che apre il
     cliente da un link, e una versione vecchia li' vuol dire un questionario
     diverso da quello che l'agenzia crede di aver mandato. */
  for (const pagina of ['/index.html', '/analisi-bisogni.html', '/GUIDA.html']) {
    const v = intestazione(pagina, 'Cache-Control');
    deve(v, 'nessun Cache-Control su ' + pagina);
    deve(/max-age=0/.test(v) && /must-revalidate/.test(v), pagina + ': ' + v);
  }
  return 'tre pagine controllate';
});

prova('le intestazioni di sicurezza non sono state perse per strada', () => {
  /* Aggiungere una regola nuova in fondo e' il modo piu' rapido per
     sovrascriverne una che c'era: qui si controlla che ci siano ancora. */
  deve(intestazione('/index.html', 'X-Content-Type-Options') === 'nosniff', 'perso X-Content-Type-Options');
  deve(intestazione('/index.html', 'X-Frame-Options') === 'SAMEORIGIN', 'perso X-Frame-Options');
});

console.log('CACHE DELLE PAGINE — quello che cambia si fa vedere');
for (const [ok, n, m] of esiti) console.log(`  ${ok ? 'ok ' : 'X  '} ${n}${m ? ' — ' + m : ''}`);
const ko = esiti.filter(e => !e[0]).length;
console.log(`\nCACHE DELLE PAGINE — quello che cambia si fa vedere: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko === 0 ? 0 : 1);
