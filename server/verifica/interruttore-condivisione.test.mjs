// ═══════════════════════════════════════════════════════════════════════════════
//  L'INTERRUTTORE DELLA CONDIVISIONE, MISURATO IN UN BROWSER
//
//  «Voglio proprio un interruttore a fianco al nominativo di chi sto per
//  condividere l'appuntamento» — Francesco, 28/09/2026, con la schermata sotto
//  gli occhi.
//
//  Prima erano caselle da spuntare da 16 pixel. Una casella dice «scegli fra
//  questi»; un interruttore dice «questa persona è dentro o è fuori», che è
//  esattamente la domanda di quella schermata — e si vede da lontano quali
//  sono accesi senza leggerli uno per uno.
//
//  PERCHÉ IN UN BROWSER E NON LEGGENDO IL FILE. Un interruttore è fatto di tre
//  pezzi che devono incontrarsi: la classe nel markup, la regola nel foglio di
//  stile, e la `<label>` che lega il nome alla casella nascosta. Leggendo il
//  testo si vede che ci sono tutti e tre; solo aprendo la pagina si vede se il
//  pallino sta al posto suo, se la riga è abbastanza alta per un dito, e se
//  toccando il NOME l'interruttore si accende.
//
//  Il 28/09 ho trovato così due cose che nessuna lettura avrebbe detto: `.sw`
//  era definita due volte (vinceva la seconda, e l'interruttore perdeva
//  `cursor:pointer`), e la riga era alta 42 pixel — sotto i 44 che servono a
//  non sbagliare bersaglio da telefono.
//
//  La schermata vera sta dietro al login, quindi qui si ricostruisce il
//  COMPONENTE fuori dal modale. Il foglio di stile è lo stesso, ed è quello
//  che si misura.
// ═══════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const TIPI = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, s) => {
  const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(RADICE, rel);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; return s.end('no'); }
  s.setHeader('Content-Type', TIPI[path.extname(f)] || 'application/octet-stream');
  s.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port;

const b = await chromium.launch({ executablePath: CHROMIUM });
/* Le misure che contano sono quelle del telefono: è da lì che Francesco lavora. */
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const errori = [];
p.on('pageerror', (e) => errori.push(String(e).slice(0, 200)));
await p.goto('http://127.0.0.1:' + porta + '/iam/index.html', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);

const M = await p.evaluate(() => {
  const box = document.createElement('div');
  box.id = 'prova-condividi';
  box.setAttribute('style', 'position:fixed;top:0;left:0;z-index:99999;width:340px;padding:4px;');
  document.body.appendChild(box);
  box.innerHTML = ['Antonio Anguzza', 'Angelo Lombardo', 'Alessandro Fenech', 'Leo Test']
    .map((n, i) => `<label class="wd-cond-riga"><span class="sw"><input type="checkbox" class="wd-cond-cb" value="u${i}"${i === 1 ? ' checked' : ''}><span class="sl"></span></span><span class="wd-cond-nome">${n}</span></label>`)
    .join('');

  const righe = [...box.querySelectorAll('.wd-cond-riga')];
  const riga = righe[0], accesa = righe[1];
  const sw = riga.querySelector('.sw');
  const cb = riga.querySelector('input');
  const nome = riga.querySelector('.wd-cond-nome');
  const pelle = riga.querySelector('.sl');
  const g = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const pallino = (el) => {
    const s = getComputedStyle(el.querySelector('.sl'), '::before');
    return { w: parseFloat(s.width), h: parseFloat(s.height), sx: s.left, giu: s.bottom, sposta: s.transform };
  };

  const spentaTinta = getComputedStyle(pelle).backgroundColor;
  const spentaSfumatura = getComputedStyle(pelle).backgroundImage;
  const accesaSfumatura = getComputedStyle(accesa.querySelector('.sl')).backgroundImage;

  /* Il gesto vero: si tocca il NOME, non l'interruttore. */
  nome.click();
  const dopoNome = cb.checked;
  const dopoTinta = getComputedStyle(pelle).backgroundImage;
  nome.click();
  const tornaSpento = !cb.checked;

  /* E toccando l'interruttore stesso. */
  sw.click();
  const dopoSw = cb.checked;
  sw.click();

  return {
    sw: g(sw), riga: g(riga), cursore: getComputedStyle(riga).cursor,
    pallinoSpento: pallino(riga), pallinoAcceso: pallino(accesa),
    spentaTinta, spentaSfumatura, accesaSfumatura, dopoTinta,
    dopoNome, tornaSpento, dopoSw,
    quante: righe.length,
    nomeAcceso: getComputedStyle(accesa.querySelector('.wd-cond-nome')).fontWeight,
    nomeSpento: getComputedStyle(riga.querySelector('.wd-cond-nome')).fontWeight,
    sfondoAcceso: getComputedStyle(accesa).backgroundColor,
    sfondoSpento: getComputedStyle(riga).backgroundColor,
  };
});

prova('è un interruttore, non una casella: 44×26 con il suo pallino', () => {
  deve(M.sw.w === 44 && M.sw.h === 26, 'misura ' + M.sw.w + '×' + M.sw.h + ' invece di 44×26');
  deve(M.pallinoSpento.w === 20 && M.pallinoSpento.h === 20,
    'il pallino è ' + M.pallinoSpento.w + '×' + M.pallinoSpento.h + ' invece di 20×20');
  return M.sw.w + '×' + M.sw.h + ', pallino ' + M.pallinoSpento.w;
});

prova('il pallino sta al centro e la corsa finisce dove deve', () => {
  /* 44 di larghezza, pallino 20, margine 3 per parte: la corsa è 18. Se il
     pallino fosse stato disegnato per un interruttore di un'altra misura —
     ed è quello che succedeva con `.sw` definita due volte — sporgerebbe o
     si fermerebbe prima della fine. */
  deve(M.pallinoSpento.sx === '3px', 'parte da ' + M.pallinoSpento.sx + ' invece che da 3px');
  deve(M.pallinoSpento.giu === '3px', 'sta a ' + M.pallinoSpento.giu + ' dal basso invece che a 3px');
  const corsa = /matrix\(1, 0, 0, 1, (\d+)/.exec(M.pallinoAcceso.sposta);
  deve(corsa && +corsa[1] === 18, 'la corsa è ' + M.pallinoAcceso.sposta + ' invece di 18px (44 − 20 − 3 − 3)');
});

prova('spento è grigio, acceso è il verde With Us', () => {
  deve(M.spentaSfumatura === 'none', 'da spento ha già una sfumatura: ' + M.spentaSfumatura);
  deve(/linear-gradient/.test(M.accesaSfumatura), 'da acceso non è verde: ' + M.accesaSfumatura);
  deve(/2, 152, 78/.test(M.accesaSfumatura), 'il verde non è quello del marchio: ' + M.accesaSfumatura);
  return 'spento ' + M.spentaTinta;
});

prova('si accende toccando il NOME, non solo l\'interruttore', () => {
  /* Da telefono è la differenza fra un gesto e tre tentativi: il bersaglio è
     tutta la riga, 330 pixel, non i 44 dell'interruttore. */
  deve(M.dopoNome === true, 'toccando il nominativo non succede niente');
  deve(M.tornaSpento === true, 'toccandolo di nuovo non si spegne');
  deve(M.dopoSw === true, 'toccando l\'interruttore stesso non succede niente');
  deve(/linear-gradient/.test(M.dopoTinta), 'si accende ma non si vede: ' + M.dopoTinta);
});

prova('la riga è alta abbastanza per un dito', () => {
  /* 44 pixel è la misura sotto la quale un bersaglio da telefono si sbaglia.
     La prima stesura era a 42, e l'ho scoperto misurando: leggendo il file
     sarebbe passata. */
  deve(M.riga.h >= 44, 'la riga è alta ' + M.riga.h + ' pixel: sotto i 44 si sbaglia bersaglio');
  deve(M.cursore === 'pointer', 'il cursore è «' + M.cursore + '»: non sembra toccabile');
  return M.riga.h + ' pixel di altezza, bersaglio largo ' + M.riga.w;
});

prova('una riga accesa si riconosce senza leggerla', () => {
  /* È il motivo per cui un interruttore batte una casella su un elenco di
     nomi: chi è dentro e chi è fuori si vede a colpo d'occhio. */
  deve(M.sfondoAcceso !== M.sfondoSpento,
    'accesa e spenta hanno lo stesso sfondo: ' + M.sfondoAcceso);
  deve(+M.nomeAcceso > +M.nomeSpento,
    'il nome acceso non è più marcato: ' + M.nomeSpento + ' → ' + M.nomeAcceso);
});

prova('aprendo IAM non si è rotto niente', () => {
  deve(errori.length === 0, errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nL\'INTERRUTTORE DELLA CONDIVISIONE — misurato in un browser');
for (const { nome, fn } of esiti) {
  try { const d = fn(); console.log('  ok  ' + nome + (d ? ' — ' + d : '')); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await b.close();
srv.close();
console.log(`\nINTERRUTTORE CONDIVISIONE: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
