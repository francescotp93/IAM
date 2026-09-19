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


prova('il rientro automatico e\' spento, e si accende solo da fuori', () => {
  /*  Il 19/09/2026 si e\' spento per una ragione misurata, non per prudenza:
      guardando dentro tutte e tre le caselle che il backend legge, mail da
      Groupama non ce n\'erano. Il codice arriva alla posta personale
      dell\'agente. Quindi ogni rientro automatico e\' una mail che nessun
      programma potra\' usare, spedita a una persona che sta lavorando.
      Non cancellato: spento, perche\' il giorno in cui il portale mandera\' il
      codice a una casella dell\'agenzia torna utile com\'e\'.  */
  deve(/const RIENTRO_AUTO = process\.env\.GROUPAMA_RIENTRO_AUTO === '1';/.test(src),
    'l\'interruttore non c\'e\' o non e\' un confronto esatto: un valore qualsiasi lo riaccenderebbe per sbaglio');
  const da = src.indexOf('if (isaPwd || await hasPasswordField())');
  const blocco = da < 0 ? '' : src.slice(da, src.indexOf('}, 4 * 60 * 1000)', da));
  deve(blocco, 'non trovo piu\' il ramo della caduta');
  const interruttore = blocco.indexOf('RIENTRO_AUTO');
  const tentativo = blocco.indexOf('await doAccedi(');
  deve(interruttore > -1, 'alla caduta si tenta il rientro senza guardare l\'interruttore: le mail ricominciano');
  deve(tentativo > interruttore,
    'il tentativo viene prima dell\'interruttore: il codice parte comunque');
});

prova('da spento lo dice, e lo dice una volta per caduta', () => {
  /*  Due guasti opposti, tutti e due gia\' visti in questa casa: la rinuncia
      muta (quattro giorni a cercare nel posto sbagliato) e il messaggio a
      ripetizione (il keep-alive passa ogni quattro minuti).  */
  const da = src.indexOf('if (isaPwd || await hasPasswordField())');
  const blocco = src.slice(da, src.indexOf('}, 4 * 60 * 1000)', da));
  const spento = blocco.indexOf('if (!RIENTRO_AUTO)');
  deve(spento > -1, 'non c\'e\' il ramo dello spento');
  /*  Dentro il RAMO, non dentro una finestra di caratteri: alla controprova la
      prima versione restava verde perche' nei 600 caratteri dopo l'interruttore
      ci finiva il messaggio del ramo ACCESO. Quarta volta che una misura in
      caratteri al posto di un confine mi fa passare per buono un guasto.  */
  const fine = blocco.indexOf('return;', spento);
  deve(fine > spento, 'il ramo dello spento non si chiude con un return: il tentativo prosegue comunque');
  const dentroIlRamo = blocco.slice(spento, fine);
  deve(/log\(/.test(dentroIlRamo), 'da spento non scrive niente: la caduta diventa invisibile');
  const latch = blocco.indexOf('rientroTentato = true');
  deve(latch > -1 && latch < spento,
    'il messaggio non e\' sotto il contatore: verrebbe ripetuto a ogni giro del keep-alive');
});


prova('da sloggati il keep-alive non apre il portale', () => {
  /*  Misurato il 19/09/2026 sulla casella a cui Groupama manda davvero i
      codici: 45 mail in un'ora e un quarto, una ogni 4 minuti — il battito di
      questo orologio. Non chiedeva un codice: apriva la home. Tanto basta,
      perche\' il portale vede un utente noto con la sessione morta e spedisce.
      Un keep-alive su una sessione che non c\'e\' piu\' non tiene vivo niente:
      manda solo una mail all\'agente ogni quattro minuti.  */
  const da = src.indexOf('let kaTick');
  const ka = da < 0 ? '' : src.slice(da, src.indexOf('}, 4 * 60 * 1000)', da));
  deve(ka, 'non trovo piu\' il keep-alive: prova da riscrivere, non da cancellare');
  const guardia = ka.indexOf("LOGIN_STATE.step !== 'loggato'");
  deve(guardia > -1, 'il keep-alive non guarda se c\'e\' una sessione: da sloggati continua a bussare, e ogni colpo e\' una mail');
  const primaNavigazione = ka.indexOf('page.goto(');
  deve(primaNavigazione > -1, 'il keep-alive non naviga piu\' affatto: allora non tiene sveglio niente');
  deve(guardia < primaNavigazione, 'la guardia viene DOPO la prima navigazione: il colpo e\' gia\' partito');
  const ritorno = ka.indexOf('return;', guardia);
  deve(ritorno > guardia && ritorno < primaNavigazione, 'la guardia non esce: si prosegue lo stesso fino al portale');
});

prova('quando si ferma lo dice, una volta sola', () => {
  /*  Muto no (quattro giorni persi a cercare una rinuncia silenziosa), ma
      nemmeno una riga ogni quattro minuti: il giornale diventa illeggibile
      proprio nei giorni in cui serve.  */
  const da = src.indexOf('let kaTick');
  const ka = src.slice(da, src.indexOf('}, 4 * 60 * 1000)', da));
  const guardia = ka.indexOf("LOGIN_STATE.step !== 'loggato'");
  const ritorno = ka.indexOf('return;', guardia);
  const dentro = ka.slice(guardia, ritorno);
  deve(/log\(/.test(dentro), 'si ferma in silenzio: nel giornale la sessione morta diventa invisibile');
  deve(/kaFermoDetto/.test(dentro), 'senza un contatore il messaggio si ripete a ogni giro, ogni quattro minuti');
  /*  E deve riarmarsi, o alla seconda caduta nessuno lo scrive piu\'.  */
  /*  La DICHIARAZIONE non e' un riarmo: contarla insieme agli altri fa fallire
      la prova su codice giusto. Stessa trappola gia' scritta qui sopra per
      `rientroTentato`, e ci sono ricascato dentro lo stesso file.  */
  const riarmi = ka.split('\n').filter(r => r.includes('kaFermoDetto = false') && !r.trim().startsWith('let ')).length;
  deve(riarmi === 1, 'il contatore si riarma in ' + riarmi + ' punti invece di uno');
});


prova('l\'interruttore del rientro e\' davvero acceso, e col valore giusto', () => {
  /*  §1 del CLAUDE.md applicato a una variabile: un interruttore che nessuno
      accende e\' codice che non serve a niente. Il codice lo legge con un
      confronto esatto a '1'; se la definizione del servizio scrivesse
      «true», «si» o «on», resterebbe spento e nessuno se ne accorgerebbe —
      il rientro semplicemente non partirebbe, in silenzio.
      Acceso il 19/09/2026, quando la casella a cui Groupama manda i codici
      (withus.coop@gmail.com) e\' stata collegata e verificata sul campo.  */
  const unita = fs.readFileSync(path.join(RADICE, 'groupama/deploy/groupama-scraper.service'), 'utf8');
  const riga = unita.split('\n').find(r => /^\s*Environment=GROUPAMA_RIENTRO_AUTO=/.test(r));
  deve(riga, 'la definizione del servizio non accende il rientro: il codice c\'e\' ma non parte mai');
  deve(/^\s*Environment=GROUPAMA_RIENTRO_AUTO=1\s*$/.test(riga),
    'il valore non e\' esattamente 1, quindi il codice lo legge come spento: ' + riga.trim());
  /*  E il nome dev'essere lo STESSO che legge il codice: due nomi diversi non
      danno errore, danno un interruttore che non accende niente.  */
  deve(/process\.env\.GROUPAMA_RIENTRO_AUTO/.test(src),
    'il codice non legge piu\' questa variabile: l\'interruttore e\' rimasto appeso al nulla');
});

const ko = esiti.filter(e => !e[0]);
console.log('\n── Groupama · una volta dentro, si resta dentro ────────────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : ''));
console.log(ko.length ? '\n🔴 ' + ko.length + ' prove fallite su ' + esiti.length : '\n🟢 ' + esiti.length + '/' + esiti.length + ' prove superate');
process.exit(ko.length ? 1 : 0);
