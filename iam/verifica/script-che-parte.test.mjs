// ═══════════════════════════════════════════════════════════════════════════════
//  IL PROGRAMMA DELLA PAGINA DEVE ALMENO PARTIRE
//
//  PERCHE' ESISTE
//    Il 2 settembre 2026 ho aggiunto l'occhio sulla password inserendo una
//    funzione «prima di `function doLogin(`». Ma la definizione vera era
//    `async function doLogin()`: il testo nuovo e' finito DOPO la parola
//    `async`, che e' rimasta orfana. Da li':
//
//      · `mostraPw` e' diventata `async function mostraPw`;
//      · `doLogin` ha perso l'`async`, e il suo `await` e' diventato illegale;
//      · l'INTERO script ha smesso di essere leggibile dal browser.
//
//    Non e' che «l'occhio non funzionava»: non funzionava piu' NIENTE, login
//    compreso. E le prove esistenti restavano tutte verdi, perche' ritagliano
//    singole funzioni e le provano a parte: nessuna guardava se il file, tutto
//    insieme, fosse ancora un programma valido.
//
//    Questa prova guarda esattamente quello, ed e' la piu' stupida e la piu'
//    importante: prima di chiedersi se il codice fa la cosa giusta, bisogna
//    sapere se parte.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { RADICE, esiti, deve } from './banco.mjs';

const e = esiti('SCRIPT — la pagina deve almeno partire');

/* Un `<script>` classico si comporta come il corpo di una funzione normale:
   `new Function` lo accetta esattamente quando lo accetterebbe il browser.
   Un `<script type="module">` invece ammette anche l'await al primo livello,
   quindi si controlla in un altro modo. */
function scriptRotti(sorgente) {
  const rotti = [];
  const tutti = [...sorgente.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  tutti.forEach((m, i) => {
    const attributi = m[1] || '';
    if (/\bsrc\s*=/.test(attributi)) return;            // script esterno: non c'e' corpo da leggere
    if (/type\s*=\s*["']module["']/.test(attributi)) return; // altre regole: fuori da questa prova
    try { new Function(m[2]); } catch (err) { rotti.push(i + ': ' + err.message); }
  });
  return { rotti, quanti: tutti.length };
}

for (const file of ['index.html', 'withus-one.js']) {
  e.prova('il codice di ' + file + ' e\' leggibile dal browser', () => {
    const p = path.join(RADICE, file);
    const src = fs.readFileSync(p, 'utf8');
    if (file.endsWith('.js')) {
      try { new Function(src); } catch (err) { deve(false, 'non parte: ' + err.message); }
      return 'un programma valido';
    }
    const { rotti, quanti } = scriptRotti(src);
    deve(rotti.length === 0, 'script non leggibile → ' + rotti.join(' | '));
    return quanti + ' blocchi di codice, tutti leggibili';
  });
}

e.prova('doLogin e\' rimasta asincrona', () => {
  /* La prova precedente basterebbe, ma questa dice PERCHE': e' la funzione che
     ha perso l'`async` quel giorno, e senza di quello il login non parte
     nemmeno. Il nome della funzione nel messaggio d'errore fa risparmiare
     mezz'ora a chi lo legge. */
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/async function doLogin\s*\(/.test(src),
    'doLogin non e\' piu\' asincrona: il suo await diventa illegale e tutto lo script smette di partire');
  deve(!/async\s*\/\*/.test(src), 'c\'e\' una parola `async` staccata dalla sua funzione da un commento');
  return 'l\'accesso puo\' aspettare la risposta del server';
});

e.prova('l\'errore del 2FA sul recupero password si capisce', () => {
  /* Supabase risponde «AAL2 session is required to update email or password
     when MFA is enabled»: chi la legge conclude che il recupero e' rotto,
     mentre la strada c'e' ed e' un'altra. Il 2 settembre 2026 e' costata a
     Francesco un giro a vuoto mentre cercava di rientrare. */
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  const f = src.slice(src.indexOf('async function doReset'), src.indexOf('async function doLogout'));
  deve(/AAL2\|MFA/.test(f), 'la risposta in inglese di Supabase arriva cosi\' com\'e\' a chi legge');
  deve(/verifica in due passaggi/i.test(f), 'non spiega in italiano che cos\'e\' il problema');
  deve(/dal tuo profilo/.test(f), 'non dice come si fa allora a cambiarla');
  return 'dice cos\'e\' successo e qual e\' la strada buona';
});

e.prova('il cambio password non e\' un vicolo cieco col 2FA', () => {
  /* Con la verifica in due passaggi attiva Supabase pretende una sessione che
     abbia GIA' superato il secondo fattore. Ma la password attuale si controlla
     con un accesso normale, che non basta — e col «ricorda dispositivo 30
     giorni» il codice non viene chiesto affatto: la password resta immutabile
     per un mese. Francesco ci e' rimasto dentro il 2 settembre 2026.
     La prova segue la REGOLA, non il punto in cui il codice sta oggi: la prima
     versione guardava dentro doCambioPassword ed e' diventata rossa appena ho
     spostato quelle righe in due funzioni a parte, su codice corretto. */
  const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/async function saliDiLivello/.test(src), 'non c\'e\' nessun modo di far salire di livello la sessione');
  const sali = src.slice(src.indexOf('async function saliDiLivello'), src.indexOf('async function doCambioPassword'));
  deve(/challengeAndVerify/.test(sali), 'chiede il codice ma non lo usa per salire di livello');
  deve(/listFactors/.test(sali), 'non cerca quale app di autenticazione e\' registrata');
  deve(/trenta secondi/.test(sali), 'se il codice non va, non dice perche\' puo\' essere scaduto');

  const cambio = src.slice(src.indexOf('async function doCambioPassword'), src.indexOf('//  AUTENTICAZIONE A DUE FATTORI'));
  /* Due strade, e servono entrambe: chiederlo PRIMA (cosi' il messaggio in
     inglese non lo vede nessuno) e rimediare DOPO (se un giorno le regole di
     Supabase cambiano, non si torna al vicolo cieco). */
  deve(/servePrimaIlCodice\(\)/.test(cambio), 'il codice si chiede solo dopo aver mostrato un errore in inglese');
  deve(/AAL2\|MFA/.test(cambio), 'tolta la rete di sicurezza: se il controllo preventivo non basta, si torna bloccati');
  return 'lo chiede prima, e sa rimediare anche dopo';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
