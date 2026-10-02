// ═══════════════════════════════════════════════════════════════════════════════
//  BANCO DEI PREMI — legge i premi dal preventivatore VERO, in automatico
//
//  A che serve. I calcoli dei prodotti a tariffa sono impastati con il modulo a
//  schermo: leggono i campi con getElementById e scrivono il risultato in
//  innerHTML. Per spostarli sul server vanno separati in tre (leggi -> calcola
//  -> disegna), e l'unica prova che il premio non e' cambiato e' confrontare il
//  prima e il dopo su molte combinazioni.
//
//  Il "prima" non si puo' chiamare da Node: vive in una pagina. Questo banco
//  apre la pagina davvero, in un browser senza schermo, imposta gli stessi dati
//  che imposterebbe un operatore, chiama la funzione di calcolo e riporta il
//  numero. Nessuno deve guardare niente: Francesco lavora da telefono e il
//  criterio dev'essere binario.
//
//  Si usa su DUE versioni della pagina — quella di prima (da git, servita in una
//  cartella temporanea) e quella di adesso — e si confrontano i risultati.
// ═══════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* Un servitore statico minimo: la pagina carica fogli, tariffe e moduli con
   percorsi relativi, quindi serve una radice vera, non un setContent. */
export function servi(radice) {
  const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    /* IAM chiede i motori sotto `/nuovo-preventivo/...`, che in produzione e` il
       quotatore montato li`. In locale la radice del repo E` il quotatore: senza
       questo taglio il browser prende 404, nessun motore si carica, e la prova
       direbbe «il motore non c'e'» su un codice sano. */
    if (rel.startsWith('nuovo-preventivo/')) rel = rel.slice('nuovo-preventivo/'.length);
    let f = path.join(radice, rel);
    /* UNA CARTELLA SERVE IL SUO `index.html`, come fa Caddy in produzione.
       Senza, `/lab/` (Marketing) rispondeva 404 e il riquadro restava vuoto:
       le prove diventavano rosse tutte insieme, e non per il motivo che
       misuravano. Un banco che non somiglia alla produzione misura il banco. */
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(radice) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('no'); }
    res.setHeader('Content-Type', tipi[path.extname(f)] || 'application/octet-stream');
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, porta: srv.address().port })));
}

/* Apre il preventivatore e lo lascia pronto. Il login non serve: le funzioni di
   calcolo non lo chiedono, e fermare la pagina prima del login evita di toccare
   il database. */
export async function apriPreventivatore(radice) {
  const { srv, porta } = await servi(radice);
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const p = await b.newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(String(e).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + porta + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  /* Un errore di sintassi nella pagina fa smettere di eseguire TUTTO lo script,
     e le funzioni di calcolo semplicemente non esistono piu'. Senza questo
     controllo il banco direbbe «premio nullo» invece di «pagina rotta», che
     sono due diagnosi opposte. */
  const vivo = await p.evaluate(() => typeof window.showPage === 'function');
  if (!vivo) {
    await b.close(); srv.close();
    throw new Error('la pagina non esegue il suo script: ' + (errori[0] || 'motivo sconosciuto'));
  }
  return {
    pagina: p,
    errori,
    async chiudi() { await b.close(); srv.close(); },
  };
}

/* Apre IAM e ne accende il guscio.
   IAM tiene tutto dentro `#app`, che resta `display:none` finche` non si entra:
   senza accenderlo un browser vede solo la schermata di ingresso, e una prova
   che guarda il disegno misurerebbe il login invece della schermata. Accendere
   il guscio non salta nessun controllo — i dati continuano a non esserci —
   serve solo a poter guardare il disegno.

   `dentro` e` la sottopagina da aprire (es. 'appunti'): si accende il suo
   pannello senza passare dal menu, che chiederebbe il database. */
export async function apriIam(radice, { dentro = null } = {}) {
  const { srv, porta } = await servi(radice);
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errori = [];
  p.on('pageerror', e => errori.push(String(e).slice(0, 200)));
  await p.goto('http://127.0.0.1:' + porta + '/iam/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);

  const vivo = await p.evaluate(() => typeof window.goTab === 'function');
  if (!vivo) {
    await b.close(); srv.close();
    throw new Error('IAM non esegue il suo script: ' + (errori[0] || 'motivo sconosciuto'));
  }

  await p.evaluate(sotto => {
    const app = document.getElementById('app');
    if (app) app.style.display = 'flex';
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = 'none';
    if (sotto) {
      document.getElementById('panel-carica')?.classList.add('act');
      document.getElementById('contab-panel-' + sotto)?.classList.remove('ct-off');
    }
  }, dentro);

  return {
    pagina: p,
    errori,
    async chiudi() { await b.close(); srv.close(); },
  };
}

/* Estrae una copia della pagina a un certo commit, per avere il «prima». */
export function estraiVersione(radice, commit, dove) {
  fs.mkdirSync(dove, { recursive: true });
  execSync(`git archive ${commit} | tar -x -C ${JSON.stringify(dove)}`, { cwd: radice, stdio: 'pipe' });
  return dove;
}

/* Playwright e' installato solo dentro server/node_modules: da prima-extension/
   non si risolverebbe (Node cerca i node_modules risalendo le cartelle, e
   server/ non e' sulla strada). Le prove dell'estensione lo prendono di qua. */
export { chromium as chromiumPlaywright } from 'playwright';
