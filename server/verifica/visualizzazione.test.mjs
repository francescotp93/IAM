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

/* Le due pagine lette una volta sola: sono 1,9 MB e 1,2 MB, e rileggerle a
   ogni prova si sente. */
const SORGENTI = Object.fromEntries(PAGINE.map(p => [p, readFileSync(join(RADICE, p), 'utf8')]));

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

/* ── UNA CLASSE DEFINITA DUE VOLTE È UN GUASTO MUTO ────────────────────────
   Trovato il 28/09/2026. In IAM `.sw` (l'interruttore) e `.sw input` erano
   scritte DUE volte, a duecento righe di distanza, e vinceva la seconda:
   l'interruttore diventava 42×24 invece di 44×26 e perdeva `cursor:pointer`,
   mentre i 23 interruttori disegnati con `.sw-track`/`.sw-thumb` avevano il
   pallino calcolato per 44×26 e finivano fuori centro.

   Il segno che rivela questi casi è sempre lo stesso: qualcuno riscrive gli
   stessi stili IN LINEA per rimettere a posto una riga. Nel modale del diario
   la riga «Importante» aveva dovuto riscriversi `display:flex`,
   `justify-content` e `padding` a mano. Quando una classe viene aggirata con
   stili in linea, di solito è rotta e nessuno l'ha guardata.

   Questa prova guarda le classi dei COMPONENTI condivisi — quelle che, se si
   sdoppiano, cambiano faccia a schermate che nessuno stava toccando. */
prova('i componenti condivisi non sono definiti due volte', () => {
  const guardate = ['sw', 'sw-track', 'sw-thumb', 'sl', 'clk-badge', 'tit-sigla'];
  const guasti = [];
  for (const [nome, html] of Object.entries(SORGENTI)) {
    /* Solo dentro ai `<style>`: le stesse parole compaiono anche nel markup e
       dentro alle stringhe che costruiscono HTML. */
    const stili = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    for (const c of guardate) {
      /* La definizione, non l'uso: `.sw{` a inizio regola.
         `.sw` e `.sw input` sono due selettori DIVERSI e legittimi, e la prima
         stesura di questa prova li contava come la stessa regola: diventava
         rossa su codice sano. Si contano separatamente. */
      const base = '(^|[\\n,}])\\s*\\.' + c.replace(/-/g, '\\-');
      for (const [che, coda] of [['', '\\s*\\{'], [' input', '\\s+input\\s*\\{']]) {
        const quante = (stili.match(new RegExp(base + coda, 'g')) || []).length;
        if (quante > 1) guasti.push(nome + ': «.' + c + che + '» definita ' + quante + ' volte');
      }
    }
  }
  deve(guasti.length === 0, guasti.join(' | ')
    + ' — la seconda vince in silenzio e cambia faccia a schermate che nessuno stava toccando');
  return guardate.length + ' componenti, una definizione ciascuno';
});

prova('nella condivisione di un appuntamento c\'è un interruttore per nome', () => {
  /* Richiesta di Francesco del 28/09/2026: «voglio proprio un interruttore a
     fianco al nominativo di chi sto per condividere l'appuntamento». Prima
     erano caselle da spuntare da 16 pixel: una casella dice «scegli fra
     questi», un interruttore dice «questa persona è dentro o è fuori», che è
     la domanda di quella schermata. */
  const html = SORGENTI['iam/index.html'];
  const i = html.indexOf('wd-cond-riga');
  deve(i > 0, 'la riga della condivisione non c\'è più: rileggere questa prova');
  const blocco = html.slice(html.indexOf('const box = document.getElementById(\'wd-condividi-box\')'),
                            html.indexOf('document.getElementById(\'modal-wd\').classList.add'));
  deve(/class="sw"/.test(blocco), 'la riga non usa l\'interruttore di casa');
  deve(/class="sl"/.test(blocco), 'l\'interruttore è senza pelle: resterebbe una casella nuda');
  deve(!/width:16px;height:16px/.test(blocco), 'è rimasta la vecchia casella da 16 pixel');
  /* E il nome deve stare DENTRO la label, o da telefono il bersaglio sono 44
     pixel invece di tutta la riga. */
  deve(/<label class="wd-cond-riga">[\s\S]{0,400}wd-cond-nome/.test(blocco),
    'il nominativo è fuori dalla label: si accenderebbe solo toccando l\'interruttore');
});

prova('spegnere un interruttore toglie davvero la condivisione', () => {
  /* La lettura al salvataggio deve guardare gli interruttori ACCESI. Se
     guardasse tutte le caselle presenti, spegnerne uno non toglierebbe
     niente — e la condivisione tolta per sbaglio resterebbe, senza che
     nessuno se ne accorga. */
  const html = SORGENTI['iam/index.html'];
  const i = html.indexOf('function saveWD(');
  deve(i > 0, 'saveWD non c\'è più: rileggere questa prova');
  const corpo = html.slice(i, i + 900);
  deve(/wd-cond-cb:checked/.test(corpo),
    'il salvataggio non legge gli interruttori accesi: spegnerne uno non toglierebbe la condivisione');
});

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
