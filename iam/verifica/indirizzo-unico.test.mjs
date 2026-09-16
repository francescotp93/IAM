// ═══════════════════════════════════════════════════════════════════════════════
//  INDIRIZZO UNICO — prove sulla riscrittura verso il server delle quotazioni.
//
//  Serve a impedire tre errori che non si vedono guardando la pagina:
//   1. mettere una riscrittura DOPO la regola generale, che la renderebbe muta;
//   2. dimenticare uno dei percorsi che il preventivatore chiama in modo
//      assoluto (verrebbe cercato su IAM e risponderebbe 404);
//   3. lasciare per sbaglio il vecchio indirizzo esterno nel ponte.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const VPS = 'https://quoto.withusassicurazioni.it';
const conf = JSON.parse(leggi('vercel.json'));
const rotte = conf.routes || [];

// I percorsi che il server delle quotazioni dichiara e che il preventivatore
// chiama partendo dalla radice del dominio. Presi da api/index.js e server/*.js
// del repository QUOTE, non indovinati.
const PERCORSI = [
  'api', 'auth', 'backup', 'catalogo', 'crm', 'diag', 'firma-collab', 'fonti',
  'l', 'lead', 'login', 'mail', 'moto', 'notify', 'pay', 'preventivi',
  'products', 'public', 'scrape', 'shop', 'sign', 'user',
];

prova('la regola generale resta per ultima', () => {
  const ultima = rotte[rotte.length - 1];
  deve(ultima && ultima.src === '/(.*)' && ultima.dest === '/$1',
    'l ultima regola non e piu il catch-all: le riscritture dopo di essa sarebbero ignorate');
  return `${rotte.length} regole in tutto`;
});

prova('ogni riscrittura sta prima della regola generale', () => {
  const iGen = rotte.findIndex(r => r.src === '/(.*)');
  const dopo = rotte.filter((r, i) => i > iGen && String(r.dest).startsWith('http'));
  deve(dopo.length === 0, `${dopo.length} riscritture stanno dopo la regola generale e non verrebbero mai usate`);
  return 'nessuna riscrittura muta';
});

prova('il preventivatore ha il suo percorso sul dominio unico', () => {
  const esatta = rotte.find(r => r.src === '/nuovo-preventivo');
  const sotto = rotte.find(r => r.src === '/nuovo-preventivo/(.*)');
  deve(esatta && esatta.dest === VPS + '/', 'manca la regola per /nuovo-preventivo');
  deve(sotto && sotto.dest === VPS + '/$1', 'manca la regola per i file interni di /nuovo-preventivo');
  return '/nuovo-preventivo -> server delle quotazioni';
});

prova('nessun percorso di servizio e stato dimenticato', () => {
  const mancanti = PERCORSI.filter(p => !rotte.some(r => r.src === `/${p}/(.*)`));
  deve(mancanti.length === 0, 'percorsi senza riscrittura: ' + mancanti.join(', '));
  return `${PERCORSI.length} percorsi inoltrati`;
});

prova('ogni riscrittura punta al server delle quotazioni e a nient altro', () => {
  const fuori = rotte.filter(r => String(r.dest).startsWith('http') && !String(r.dest).startsWith(VPS));
  deve(fuori.length === 0, 'ci sono riscritture verso un indirizzo estraneo: ' + fuori.map(r => r.dest).join(', '));
  return 'nessuna destinazione estranea';
});

prova('ogni riscrittura conserva il pezzo di percorso catturato', () => {
  const rotti = rotte.filter(r => String(r.src).includes('(.*)') && String(r.dest).startsWith('http') && !String(r.dest).includes('$1'));
  deve(rotti.length === 0, 'riscritture che perdono il percorso: ' + rotti.map(r => r.src).join(', '));
  return 'il percorso arriva intero al server';
});

prova('le intestazioni di sicurezza non sono state toccate', () => {
  const h = (conf.headers && conf.headers[0] && conf.headers[0].headers) || [];
  const chiavi = h.map(x => x.key);
  deve(chiavi.includes('X-Content-Type-Options'), 'manca X-Content-Type-Options');
  deve(chiavi.includes('X-Frame-Options'), 'manca X-Frame-Options');
  return chiavi.join(', ');
});

prova('il ponte verso il preventivatore resta sullo stesso indirizzo: /nuovo-preventivo/', () => {
  /* Dal 16/09/2026 iam. e' servito da Caddy sul VPS (QUOTE/deploy/caddy/
     iam.caddy) e QUOTO sta sotto /nuovo-preventivo/ dello stesso dominio.
     Un indirizzo assoluto verso quoto. qui riaprirebbe la seconda origine:
     token nell'indirizzo, doppio login, clic nel riquadro invisibili. */
  const one = leggi('withus-one.js');
  const idx = leggi('index.html');
  deve(/var QUOTO = '\/nuovo-preventivo\/';/.test(one), 'withus-one.js: il riquadro non carica /nuovo-preventivo/');
  deve(/const QUOTO_URL = '\/nuovo-preventivo\/';/.test(idx), 'index.html: il salto a pagina intera non usa /nuovo-preventivo/');
  deve(!/var QUOTO = 'https:/.test(one) && !/const QUOTO_URL = 'https:/.test(idx), 'e\' tornato un indirizzo assoluto');
  /* QUOTO_ORIGIN si ricava dal percorso: con un percorso relativo e' l'origine di IAM. */
  deve(/var QUOTO_ORIGIN = \(function \(\) \{ try \{ return new URL\(QUOTO, location\.href\)\.origin;/.test(one), 'QUOTO_ORIGIN non si ricava piu\' da QUOTO: i messaggi al riquadro andrebbero a un\'origine sbagliata');
  return 'riquadro e salto a pagina intera su /nuovo-preventivo/, stessa origine';
});

console.log('INDIRIZZO UNICO');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`INDIRIZZO UNICO: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti === 0 ? 0 : 1);
