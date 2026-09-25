// ═══════════════════════════════════════════════════════════════════════════════
//  LA VISUALIZZAZIONE, DAL TELEFONO
//
//  Francesco lavora dal telefono. Le cose che devono restare vere non sono di
//  gusto: sono cose che, se saltano, gli tolgono qualcosa ogni giorno.
//
//    1. LO ZOOM CON LE DITA RESTA LIBERO. In IAM c'era `user-scalable=no`, e
//       su Android voleva dire non poter ingrandire un numero dentro una
//       tabella. Ci stava per un motivo vero — iOS ingrandisce da solo sui
//       campi piccoli — ma quella e' la cura del sintomo: si toglie una cosa
//       utile per evitarne una fastidiosa.
//
//    2. E I CAMPI SONO A 16px DOVE SI TOCCA. E' l'altra meta' della stessa
//       correzione, e senza di essa la prima e' un peggioramento: togliere il
//       blocco dello zoom lasciando i campi a 14px fa saltare la pagina a ogni
//       tocco su un campo. Le due cose stanno insieme o non stanno.
//
//    3. LA PAGINA HA IL SUO `viewport`. Senza, il telefono finge di essere un
//       computer largo 980px e rimpicciolisce tutto.
//
//  QUELLO CHE QUESTA PROVA NON DICE: che la pagina sia bella, o che stia
//  dentro allo schermo. Per quello serve aprirla davvero — sono le prove da
//  utente vero che mancano (IAM_TEST_PLAN.md § 4).
// ═══════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGINE = ['index.html', 'iam/index.html'];

const esiti = [];
function prova(nome, fn) {
  try { const d = fn(); esiti.push([true, nome, d || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* Il `viewport` della PAGINA, non quelli dentro alle stringhe: tutte e due i
   file costruiscono documenti HTML da stampare, e quelli hanno il loro. Si
   guarda solo dentro al `<head>`. */
function viewportDella(html) {
  const testa = html.slice(0, html.indexOf('</head>'));
  const m = /<meta\s+name="viewport"\s+content="([^"]*)"/i.exec(testa);
  return m ? m[1] : null;
}

for (const pagina of PAGINE) {
  const html = readFileSync(join(RADICE, pagina), 'utf8');

  prova(`${pagina} — dichiara il suo viewport`, () => {
    const v = viewportDella(html);
    deve(v, 'nessun <meta name="viewport"> nel <head>: il telefono fingerebbe di essere largo 980px');
    deve(/width\s*=\s*device-width/.test(v), `il viewport non segue la larghezza del dispositivo: «${v}»`);
    return v;
  });

  prova(`${pagina} — non blocca lo zoom con le dita`, () => {
    const v = viewportDella(html) || '';
    deve(!/user-scalable\s*=\s*(no|0)/i.test(v),
      'la pagina blocca lo zoom: da Android non si puo\' ingrandire un numero in tabella');
    deve(!/maximum-scale\s*=\s*1(\.0)?\b/i.test(v),
      'maximum-scale=1 impedisce di ingrandire: vale quanto user-scalable=no');
    return 'si puo\' ingrandire';
  });

  prova(`${pagina} — i campi sono a 16px dove si tocca`, () => {
    /* Senza questa regola, togliere il blocco dello zoom peggiora le cose:
       iOS fa saltare la pagina a ogni tocco su un campo. */
    const m = /@media\s*\(\s*pointer\s*:\s*coarse\s*\)\s*\{([\s\S]{0,600}?)\n\}/.exec(html);
    deve(m, 'manca la regola @media (pointer: coarse): iOS ingrandira\' da solo a ogni tocco su un campo');
    const corpo = m[1];
    deve(/\binput\b/.test(corpo) && /\bselect\b/.test(corpo) && /\btextarea\b/.test(corpo),
      'la regola non copre tutti e tre i tipi di campo: ' + corpo.slice(0, 120));
    const f = /font-size:\s*([0-9.]+)px/.exec(corpo);
    deve(f, 'la regola non fissa il carattere dei campi');
    deve(parseFloat(f[1]) >= 16,
      `i campi sul touch sono a ${f[1]}px: sotto i 16 iOS ingrandisce da solo`);
    return `campi a ${f[1]}px sul touch`;
  });
}

prova('le due pagine si comportano allo stesso modo', () => {
  /* Un gestionale che si comporta in due modi diversi a seconda della pagina
     e' un gestionale che non sembra uno solo — ed e' la direzione decisa il
     25/09/2026: «IAM» e' il nome dell'insieme. */
  const v = PAGINE.map((p) => viewportDella(readFileSync(join(RADICE, p), 'utf8')));
  deve(v[0] === v[1], `viewport diversi: «${v[0]}» contro «${v[1]}»`);
  return v[0];
});

console.log('LA VISUALIZZAZIONE, DAL TELEFONO\n');
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome + (msg ? '  — ' + msg : '')); }
  else console.log('  ❌ ' + nome + '\n        ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Visualizzazione: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
