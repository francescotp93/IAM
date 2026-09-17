// ═══════════════════════════════════════════════════════════════════════════
//  GROUPAMA — una volta dentro, si resta dentro
//
//  PERCHE' ESISTE
//    Francesco, 11/09/2026: «una volta fatto l'accesso non mi deve buttare più
//    fuori, a meno che non venga cambiata la password o l'utenza».
//
//    Perche' invece buttava fuori: la sessione del portale vive nei COOKIE DI
//    SESSIONE, quelli senza data di scadenza. Chromium li tiene in MEMORIA e non
//    li scrive nel profilo su disco. Bastava quindi che il servizio si
//    riavviasse — e si riavvia a OGNI rilascio che tocca la sua cartella, piu'
//    ogni volta che il browser va in crisi — perche' quei cookie sparissero e il
//    portale ci vedesse come sconosciuti. Risultato visto dall'agenzia: accesso
//    fatto la mattina, buttato fuori nel pomeriggio, e un altro codice da
//    cercare nella posta.
//
//    Il pezzo che mancava non era grande: auth.json veniva SCRITTO ad ogni login
//    riuscito e non veniva RILETTO MAI. Una rete di sicurezza stesa e mai
//    agganciata — e invisibile, perche' il file c'era e sembrava che servisse.
//
//  COSA SI PROVA QUI
//    Che la sessione salvata venga ripresa, che venga ripresa PRIMA di arrendersi
//    e far ripartire la trafila del codice, e che la copia buona su disco non
//    venga sovrascritta proprio quando e' l'unica cosa che ci fa rientrare.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(RADICE, 'groupama/quote-service.mjs'), 'utf8');

const esiti = [];
const prova = (nome, fn) => { try { const d = fn() || ''; esiti.push([true, nome, d]); } catch (e) { esiti.push([false, nome, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('la sessione salvata si rilegge, non si scrive soltanto', () => {
  deve(/async function ripristinaSessione/.test(src),
    'auth.json torna a essere scritto e mai riletto: ogni riavvio del servizio butta fuori dal portale');
  deve(/addCookies\(/.test(src),
    'i cookie salvati non vengono rimessi nel browser: senza quelli il portale non ci riconosce');
  return 'ripristinaSessione + addCookies';
});

prova('all\'avvio si prova a rientrare PRIMA di chiedere un codice', () => {
  const da = src.indexOf('// Avvio: NON invio le credenziali');
  const blocco = da < 0 ? '' : src.slice(da, da + 1800);
  deve(blocco, 'il blocco di avvio non si trova piu\': questa prova va riscritta, non cancellata');
  const ripristino = blocco.indexOf('ripristinaSessione');
  const arrendersi = blocco.indexOf("step: 'pronto'");
  deve(ripristino > -1, 'all\'accensione non si tenta piu\' di riprendere la sessione salvata');
  deve(arrendersi > -1, 'non trovo piu\' il punto in cui ci si dichiara «pronti al login»: prova da riscrivere');
  deve(ripristino < arrendersi,
    'ci si dichiara «pronti al login» PRIMA di provare la sessione salvata: si chiede un codice che poteva non servire');
  return 'ripristino al carattere ' + ripristino + ', resa al ' + arrendersi;
});

prova('anche un browser rilanciato si riprende la sessione', () => {
  /* ensurePage rilancia l'intero browser quando la pagina e' morta. Browser
     nuovo = cookie di sessione persi, esattamente come dopo un riavvio: se qui
     non si ripristina, una crisi del browser costa un codice via email. */
  const da = src.indexOf('[recovery] contesto morto');
  const blocco = da < 0 ? '' : src.slice(da, da + 700);
  deve(blocco, 'il ramo di recupero del browser non si trova piu\': prova da riscrivere');
  deve(blocco.includes('ripristinaSessione'),
    'dopo aver rilanciato il browser non si rimette la sessione: si riparte da sconosciuti');
  return 'ripristino anche dopo il rilancio';
});

prova('prima di spegnersi il servizio salva la sessione', () => {
  /* E' il pezzo che rende indolori i rilasci: systemd manda SIGTERM, e fino a
     ieri si moriva li' coi cookie solo in memoria. */
  deve(/SIGTERM/.test(src), 'nessuno raccoglie il segnale di spegnimento: ad ogni rilascio la sessione muore in memoria');
  const da = src.indexOf("for (const segnale of ['SIGTERM'");
  const blocco = da < 0 ? '' : src.slice(da, da + 1400);
  deve(blocco.includes('salvaSessione'), 'allo spegnimento non si salva niente: il riavvio successivo riparte da zero');
  return 'sessione salvata allo spegnimento';
});

prova('da sloggati NON si sovrascrive la copia buona', () => {
  /* Se in quel momento siamo fuori, la copia su disco vale piu' di quella in
     memoria: e' quella che ci fara' rientrare. Salvarci sopra uno stato da
     sloggati sarebbe il modo perfetto per buttare via l'unica cosa utile. */
  const da = src.indexOf("for (const segnale of ['SIGTERM'");
  const blocco = da < 0 ? '' : src.slice(da, da + 1400);
  deve(/const viva =/.test(blocco) && /if \(viva\)/.test(blocco),
    'allo spegnimento si salva senza guardare se la sessione e\' viva: una copia da sloggati cancella quella buona');
  /* Il keep-alive si prende INTERO, dalla sua prima riga alla sua chiusura, non
     a misura di caratteri: contarli rende la prova fragile a qualunque commento
     aggiunto dentro il blocco — è successo il 12/09/2026, con la prova diventata
     rossa su codice che si comportava esattamente come prima. Quello che si
     verifica non cambia di una virgola. */
  const ka = src.indexOf('let kaTick = 0;');
  const fine = src.indexOf('}, 4 * 60 * 1000)', ka);
  const keepalive = (ka < 0 || fine < 0) ? '' : src.slice(ka, fine);
  deve(keepalive, 'non trovo più il keep-alive: prova da riscrivere, non da cancellare');
  deve(/else if \(kaTick % \d+ === 0\) await salvaSessione/.test(keepalive),
    'il salvataggio periodico non e\' legato al ramo «la password NON compare»: si rischia di salvare una sessione gia\' caduta');
  return 'si salva solo quando c\'è qualcosa di buono da salvare';
});

prova('i segnali di spegnimento li prende il nostro codice, non Playwright', () => {
  /* SENZA QUESTO IL SALVATAGGIO ALLO SPEGNIMENTO NON SERVE A NIENTE, e sembra
     che funzioni. Playwright, di suo, ascolta SIGTERM/SIGINT/SIGHUP e alla loro
     comparsa chiude il browser. Il nostro gestore parte nello stesso istante e
     perde la corsa: quando arriva a scrivere, il contesto e' gia' chiuso.
     Misurato su Groupama il 12/09/2026, al rilascio delle 13:33:
       13:33:42  SIGTERM: salvo la sessione prima di chiudere
       13:33:42  sessione NON salvata: browserContext... has been closed
     Quel giorno e' andata bene lo stesso — la copia periodica su disco era di
     quattro minuti prima — ma le protezioni erano due e ne ha lavorata una. */
  deve(/handleSIGTERM: false/.test(src), 'Playwright chiude il browser al segnale prima che noi salviamo: il salvataggio allo spegnimento parte e fallisce sempre');
  deve(/handleSIGINT: false/.test(src), 'Ctrl-C e riavvii manuali continuano a portarsi via la sessione');
  deve(/handleSIGHUP: false/.test(src), 'la chiusura del terminale chiude il browser prima del salvataggio');
  /* Gli interruttori vanno dove si apre il browser, non in un punto qualunque:
     se finiscono fuori dalle opzioni non li legge nessuno e non se ne accorge
     nessuno. */
  const da = src.indexOf('launchPersistentContext');
  const opzioni = da < 0 ? '' : src.slice(da, src.indexOf('});', da));
  deve(/handleSIGTERM: false/.test(opzioni),
    'gli interruttori non stanno fra le opzioni di apertura del browser: non hanno effetto');
  return 'i segnali arrivano a noi';
});

prova('quando la sessione cade si tenta il rientro, UNA volta sola', () => {
  /* PERCHE' ORA SI', QUANDO PRIMA NO. Fino al 16/09/2026 qui si scriveva
     «rifai il login» e ci si fermava, e la ragione era buona: ogni tentativo fa
     spedire una mail col codice, e l'11/09 quattro tentativi di fila avevano
     riempito la casella dell'agenzia senza riuscire mai — quel codice lo poteva
     leggere solo una persona.
     Dal 13/09 la casella la legge il backend, quindi un tentativo non spreca
     più un codice: ne fa nascere uno che consumiamo noi.
     Misurato il 16/09: sessione caduta lunedì alle 20:21, e due giorni dopo era
     ancora giù — perché nessuno tentava mai, e quindi la lettura automatica
     della posta non veniva MAI chiamata. Il pezzo costruito il 13/09 aspettava
     un evento che nessuno produceva. */
  const da = src.indexOf('è caduta adesso');
  const blocco = da < 0 ? '' : src.slice(da, src.indexOf('}, 4 * 60 * 1000)', da));
  deve(blocco, 'non trovo più il ramo della caduta: prova da riscrivere, non da cancellare');
  deve(/doAccedi\(/.test(blocco),
    'alla caduta non si tenta più il rientro: si torna ad aspettare che qualcuno se ne accorga a mano');
  deve(/rientroTentato/.test(blocco),
    'il tentativo non è contato: senza un freno diventa una mail col codice ogni quattro minuti, cioè il guasto dell\'11/09');
});

prova('il tentativo si riarma solo rientrando, non da solo', () => {
  /* Se il contatore si azzerasse col tempo, o non si azzerasse mai, si
     avrebbero i due guasti opposti: la raffica di mail, oppure una sola
     occasione per sempre — e alla seconda caduta nessuno proverebbe più. */
  deve(/let rientroTentato = false;/.test(src), 'il contatore del tentativo non esiste');
  /* Si guarda la POSIZIONE, non una rete di caratteri: la prima versione di
     questa prova pretendeva che fra «loggato» e l'azzeramento non ci fosse un
     punto e virgola, e falliva su codice giusto. */
  const set = src.slice(src.indexOf('const setState ='), src.indexOf('const setState =') + 400);
  const dentro = set.indexOf("step === 'loggato'");
  const azzera = set.indexOf('rientroTentato = false');
  deve(dentro > -1, 'non trovo più il punto in cui si dichiara di essere dentro');
  deve(azzera > dentro && (azzera - dentro) < 150,
    'il tentativo non si riarma quando si torna dentro: alla prossima caduta nessuno proverà a rientrare');
  /* La DICHIARAZIONE non e' un azzeramento: contarla insieme agli altri faceva
     fallire la prova su codice giusto (terzo inciampo dello stesso tipo oggi —
     una rete di caratteri al posto di una domanda chiara). */
  const azzeramenti = src.split('\n').filter(r => r.includes('rientroTentato = false') && !r.trim().startsWith('let ')).length;
  deve(azzeramenti === 1,
    'il contatore viene azzerato in ' + azzeramenti + ' punti: basta uno sbagliato per riaprire la raffica di mail');
});

const ko = esiti.filter(e => !e[0]);
console.log('\n── Groupama · una volta dentro, si resta dentro ────────────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : ''));
console.log(ko.length ? '\n🔴 ' + ko.length + ' prove fallite su ' + esiti.length : '\n🟢 ' + esiti.length + '/' + esiti.length + ' prove superate');
process.exit(ko.length ? 1 : 0);
