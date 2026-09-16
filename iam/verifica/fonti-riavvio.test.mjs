// ═══════════════════════════════════════════════════════════════════════════════
//  FONTI COMPAGNIE — il riavvio che si traveste da guasto
//
//  La VPS tira giu' `main` ogni minuto; se il rilascio tocca uno scraper, lo
//  riavvia, e chi stava facendo l'accesso in quel momento se lo vede morire a
//  meta'. Il pannello coglieva quell'evento in due momenti diversi e lo
//  raccontava in due modi diversi: alla bussata (404/405) diceva «il motore si
//  sta aggiornando», durante l'attesa mostrava in rosso «page.waitForTimeout:
//  Target page, context or browser has been closed» (Francesco, 09/09/2026).
//  Stesso evento, due frasi: una giusta e una che manda a cercare sul portale
//  un guasto che non c'e'.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idx = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (n, f) => { try { esiti.push([true, n, f() || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
const fetta = (da, a) => { const i = idx.indexOf(da); return i < 0 ? '' : idx.slice(i, idx.indexOf(a, i)); };

/* La funzione si estrae dal sorgente e si ESEGUE: una prova che cerca solo
   la parola «closed» nel file passerebbe anche con un commento. */
function riconoscitore() {
  const f = fetta('const FONTI_RIAVVIO_TESTO', '\n}\n');
  deve(f.length > 0, 'non trovo fontiEraUnRiavvio');
  return new Function(f + '\n}\nreturn fontiEraUnRiavvio;')();
}

prova('il messaggio crudo di Playwright vuol dire «riavvio», non «guasto»', () => {
  const era = riconoscitore();
  deve(era('page.waitForTimeout: Target page, context or browser has been closed'), 'il messaggio visto da Francesco non e\' riconosciuto');
  deve(era('Target page, context or browser has been closed'), 'senza il prefisso del comando non lo riconosce');
  deve(era('browser has been disconnected'), 'il browser scollegato non e\' riconosciuto');
  return 'tre vesti dello stesso evento';
});

prova('404 e 405 restano un riavvio, e un numero dentro un altro no', () => {
  const era = riconoscitore();
  deve(era('HTTP 404') && era('405 Method Not Allowed'), '404/405 non sono piu\' riconosciuti: la traduzione di prima e\' persa');
  deve(!era('codice 1404 rifiutato'), 'un 404 dentro un numero piu\' lungo passa per riavvio');
  return '404 e 405 si\', 1404 no';
});

prova('un guasto vero non viene scambiato per un riavvio', () => {
  const era = riconoscitore();
  for (const m of ['Credenziali non valide', 'Timeout 30000ms exceeded', 'portale lento: riprova', 'codice OTP rifiutato', ''])
    deve(!era(m), '«' + m + '» passerebbe per riavvio, e nasconderebbe un guasto vero');
  return 'cinque guasti veri restano guasti';
});

prova('durante l\'attesa il riavvio esce in ambra con la frase giusta, non in rosso', () => {
  const f = fetta('async function fontiAspetta(', '\n}\n');
  deve(f.length > 0, 'non trovo fontiAspetta');
  const rotti = f.slice(f.indexOf('FONTI_PASSI_ROTTI.includes'), f.indexOf('Stati di passaggio'));
  deve(/fontiEraUnRiavvio\(msg\)/.test(rotti), 'il ramo dei passi rotti non guarda se e\' stato un riavvio');
  deve(/fontiEraUnRiavvio\(msg\)\)[^\n]*FONTI_RIAVVIO_TESTO[^\n]*f-amber/.test(rotti), 'il riavvio non esce in ambra con la frase del motore che si aggiorna');
  const iRiavvio = rotti.indexOf('fontiEraUnRiavvio'), iRosso = rotti.indexOf("'Il portale: '");
  deve(iRiavvio > -1 && iRosso > iRiavvio, 'il rosso «Il portale:» scatta prima del controllo sul riavvio');
  deve(/fontiEraUnRiavvio\(msg\)\)[^\n]*fontiCarica\(true\)/.test(rotti), 'dopo il riavvio non si ricarica lo stato fresco');
  return 'ambra, frase del motore, stato ricaricato';
});

prova('alla bussata e durante l\'attesa e\' la stessa regola e la stessa frase', () => {
  const accedi = fetta('async function fontiAccedi(', '\n}\n');
  deve(/fontiEraUnRiavvio\(e\.message\)/.test(accedi), 'la bussata non usa la regola comune');
  deve(!/\/404\|405\//.test(accedi), 'la bussata ha ancora la sua regola privata sui 404/405');
  const quante = (idx.match(/FONTI_RIAVVIO_TESTO/g) || []).length;
  deve(quante >= 3, 'la frase del riavvio non e\' condivisa: la trovo ' + quante + ' volte');
  deve((idx.match(/Il motore si sta aggiornando/g) || []).length === 1, 'la frase e\' scritta a mano in piu\' punti: una copia cambiera\' e l\'altra no');
  return 'una regola, una frase';
});

console.log('FONTI COMPAGNIE — il riavvio che si traveste da guasto');
for (const [ok, n, d] of esiti) console.log(`  ${ok ? 'ok ' : 'X  '} ${n}${d ? ' — ' + d : ''}`);
const ko = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`FONTI COMPAGNIE — riavvio: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
