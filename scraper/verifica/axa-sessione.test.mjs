// ═══════════════════════════════════════════════════════════════════════════
//  AXA — una volta dentro, si resta dentro
//
//  PERCHE' ESISTE
//    Francesco, 12/09/2026: «vediamo di non farli sconnettere più, una volta
//    funzionava».
//
//    Su Groupama questo difetto è stato chiuso l'11/09 e il commento diceva
//    «vale per tutti gli scraper, qui si comincia da Groupama». Su AXA era
//    rimasto aperto, e la misura sulla macchina lo ha mostrato: auth.json
//    scritto ad ogni login e RILETTO MAI — e per di più fermo al 2 settembre,
//    dieci giorni prima. Anche rileggendolo avremmo rimesso dentro cookie di
//    dieci giorni: niente. La sessione del portale vive nei cookie di sessione,
//    che Chromium tiene in memoria; ogni riavvio del servizio li perde, e
//    dall'agenzia si legge come «ho fatto l'accesso e mi ha buttato fuori»,
//    con un altro codice AXA Guardian da inserire.
//
//    Sempre quel giorno si è visto un secondo difetto, dal giornale: il codice
//    inserito da una persona («2FA inserito → OK») e poi il silenzio. Il ramo
//    che dichiara il codice non accettato non scriveva niente: impossibile
//    sapere se il codice fosse scaduto — dura 30 secondi — o se il portale
//    avesse rifiutato per altro.
//
//  COSA SI PROVA QUI
//    Che la sessione salvata venga ripresa e tenuta aggiornata, che si salvi
//    prima di spegnersi, che un codice rifiutato lasci una traccia leggibile, e
//    che il segreto TOTP non venga usato quando è un codice a 6 cifre — errore
//    che su Allianz ha rischiato di far bloccare l'utenza dell'agenzia.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(RADICE, 'axa/quote-service.mjs'), 'utf8');

const esiti = [];
const prova = (nome, fn) => { try { esiti.push([true, nome, fn() || '']); } catch (e) { esiti.push([false, nome, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('la sessione salvata si rilegge, non si scrive soltanto', () => {
  deve(/async function ripristinaSessione/.test(src),
    'auth.json resta scritto e mai riletto: ogni riavvio del servizio butta fuori dal portale');
  deve(/addCookies\(/.test(src),
    'i cookie salvati non vengono rimessi nel browser: senza quelli il portale non ci riconosce');
  return 'ripristinaSessione + addCookies';
});

prova('all\'avvio si prova a rientrare PRIMA di chiedere un codice', () => {
  const da = src.indexOf('// Avvio: se c\'è il segreto TOTP');
  const blocco = da < 0 ? '' : src.slice(da, da + 2200);
  deve(blocco, 'il blocco di avvio non si trova più: questa prova va riscritta, non cancellata');
  const ripristino = blocco.indexOf('ripristinaSessione');
  const arrendersi = blocco.indexOf("setState('pronto'");
  deve(ripristino > -1, 'all\'accensione non si tenta di riprendere la sessione salvata');
  deve(arrendersi > -1, 'non trovo il punto in cui ci si dichiara «pronti al login»: prova da riscrivere');
  deve(ripristino < arrendersi,
    'ci si dichiara «pronti al login» PRIMA di provare la sessione salvata: si chiede un codice che poteva non servire');
  return 'ripristino al carattere ' + ripristino + ', resa al ' + arrendersi;
});

prova('la copia su disco si tiene fresca mentre si lavora', () => {
  /* Il portale rinnova i suoi cookie mentre si usa: una copia presa solo al
     login invecchia, e al riavvio si rientra con qualcosa di morto. È
     esattamente quello che si è misurato: file fermo a dieci giorni prima. */
  const ka = src.slice(src.indexOf('let kaTick'), src.indexOf('}, 5 * 60 * 1000)'));
  deve(ka, 'non trovo più il keep-alive: prova da riscrivere');
  deve(/salvaSessione\(/.test(ka), 'il keep-alive non salva mai la sessione: la copia su disco invecchia e non fa più rientrare');
  /* Si salva solo da dentro. Salvare da sloggati sovrascriverebbe la copia
     buona con una inutile: è il modo perfetto per buttare via l'unica cosa
     rimasta. */
  const ready = ka.slice(ka.indexOf("state === 'ready'"), ka.indexOf("state === 'expired'"));
  deve(/salvaSessione\(/.test(ready), 'la sessione non viene salvata nel ramo in cui risulta viva');
  const expired = ka.slice(ka.indexOf("state === 'expired'"));
  deve(!/salvaSessione\(/.test(expired), 'si salva anche da sloggati: così si cancella la copia buona');
});

prova('prima di spegnersi salva la sessione', () => {
  deve(/process\.on\(segnale/.test(src) && /SIGTERM/.test(src),
    'nessuno spegnimento pulito: ogni rilascio che tocca questa cartella butta fuori dal portale');
  const blocco = src.slice(src.indexOf("for (const segnale of ['SIGTERM'"), src.indexOf("for (const segnale of ['SIGTERM'") + 900);
  deve(/salvaSessione\('spegnimento'\)/.test(blocco), 'allo spegnimento non si salva la sessione');
  deve(/Promise\.race|setTimeout/.test(blocco), 'il salvataggio non ha un tempo massimo: un servizio che non muore è peggio di una sessione persa');
  deve(/viva/.test(blocco), 'si salva anche da sloggati, cancellando la copia buona');
});

prova('«sono dentro» lo dice la home, non l\'indirizzo', () => {
  /* Il 12/09/2026, due volte, il portale si è fermato sulla pagina di rimbalzo
     dell'autenticazione — mobility.axa-italia.it/portal/?code=…&state=… — e il
     pannello ha detto «Login completato ✅» con la sessione inesistente.
     Francesco ha creduto due volte di essere entrato. */
  const i = src.indexOf('const filled = await fillOtpCode(codice)');
  const blocco = src.slice(i, src.indexOf('finally { BUSY = false; }', i));
  deve(blocco, 'non trovo più la conferma del codice: prova da riscrivere');
  deve(!/if \(\(await isLogged\(\)\) \|\| \/\\\/portal\\\/\/i\.test/.test(blocco),
    'si torna a dichiarare l\'accesso riuscito solo perché l\'indirizzo contiene «/portal/»: quell\'indirizzo ce l\'ha anche la pagina di rimbalzo');
  deve(/soloRimbalzo/.test(blocco), 'non si riconosce più la pagina di rimbalzo (code=/state= nell\'indirizzo)');
  /* Il successo deve dipendere da isLogged(), che guarda la home autenticata. */
  const successo = blocco.slice(blocco.indexOf('if (dentro)'), blocco.indexOf('if (dentro)') + 200);
  deve(/if \(dentro\)/.test(successo) && /salvaSessione/.test(successo), 'il ramo di successo non è più legato alla home vera');
  /* E quando resta lì, lo si dice per quello che è: non «codice sbagliato». */
  deve(/non ha aperto la sessione/.test(blocco), 'un accesso fermo sul rimbalzo viene ancora raccontato come codice rifiutato');
  return 'successo solo con la home autenticata';
});

prova('se il portale resta appeso al rimbalzo, si prova ad aprirgli la home', () => {
  /* Il blocco si prende INTERO, dalla sua prima riga alla sua chiusura, non a
     misura di caratteri: contarli rende la prova fragile a qualunque commento o
     spostamento: è già successo il 12/09/2026 su Groupama e di nuovo il 14/09
     qui, quando la spinta è stata spostata dentro `attendiAccesso` — prova
     rossa su un comportamento identico. Quello che si verifica non cambia. */
  const i = src.indexOf('async function attendiAccesso');
  const blocco = i < 0 ? '' : src.slice(i, src.indexOf('\n}', i));
  deve(blocco, 'non trovo più l\'attesa dell\'accesso: prova da riscrivere, non da cancellare');
  deve(/page\.goto\(PORTAL_URL/.test(blocco), 'non si tenta di far concludere il giro aprendo la home');
  deve(/i === spintaAl/.test(blocco), 'il tentativo non è limitato a una volta sola: rischia di disturbare un login che sta riuscendo');
  deve(/soloRimbalzo/.test(blocco), 'si aprirebbe la home anche quando non siamo sul rimbalzo');
});

prova('un codice rifiutato lascia scritto perché', () => {
  const i = src.indexOf('codice NON accettato');
  deve(i > -1, 'il ramo «codice non accettato» è di nuovo muto: dal giornale non si capisce cosa sia successo');
  /* Si guarda dalla raccolta degli indizi fino al messaggio: contare i
     caratteri all'indietro rende la prova fragile a ogni riga aggiunta in
     mezzo — è già successo quando è entrato il caso del rimbalzo. */
  const blocco = src.slice(src.indexOf('const dove = (page.url()'), i + 400);
  deve(/page\.url\(\)/.test(blocco), 'non si scrive su quale pagina siamo finiti');
  deve(/role=alert|\.error|alert/i.test(blocco), 'non si legge il messaggio del portale');
  /* Il contenuto dei campi non esce MAI nel giornale: lì dentro c'è il codice
     dell'operatore e, altrove nel flusso, dati del cliente. */
  deve(!/inputValue\(\)/.test(blocco), 'si rischia di scrivere nel giornale il contenuto di un campo');
});

prova('il messaggio dice che il codice dura 30 secondi e come non farselo più chiedere', () => {
  /* lastIndexOf: la prima occorrenza è quella breve dello stato a schermo, la
     seconda è il messaggio che arriva davvero all'operatore. */
  const i = src.lastIndexOf('Codice non accettato');
  const msg = src.slice(i, i + 700);
  deve(/30 secondi/.test(msg), 'non dice che il codice Guardian dura 30 secondi: è la causa più probabile del rifiuto');
  deve(/segreto TOTP|seme/i.test(msg), 'non dice come non farselo più chiedere (salvare il segreto in Fonti)');
});

prova('il seme TOTP non si usa quando è un codice a 6 cifre', () => {
  deve(/function semePlausibile/.test(src),
    'manca la guardia sul seme: con un codice a 6 cifre al posto del seme si mandano passcode sbagliati al portale, fino a farsi bloccare l\'utenza');
  /* La guardia deve stare davanti a ENTRAMBE le vie che usano il seme: il login
     guidato e il rientro automatico del keep-alive. Una sola non basta. */
  const usi = [...src.matchAll(/c\.totpSecret\s*&&\s*!semeKo|c\.totpSecret\)\s*\{/g)].length;
  deve(/const semeKo = motivoSemeNonValido\(c\.totpSecret\)/.test(src), 'il motivo non viene calcolato');
  const login = src.slice(src.indexOf('if (await otpField()) {'), src.indexOf('if (await otpField()) {') + 900);
  deve(/!semeKo/.test(login), 'il login guidato usa il seme senza controllarlo');
  const ka = src.slice(src.indexOf("state === 'expired'"));
  deve(/!semeKo/.test(ka), 'il rientro automatico usa il seme senza controllarlo');
  deve(/tutte cifre/.test(src), 'il motivo non spiega che è stato incollato un codice al posto del seme');
  return usi + ' punti protetti';
});

prova('«manca il seme» si dice una volta, non ogni cinque minuti', () => {
  /* Il 12/09/2026 il giornale ne aveva una riga ogni cinque minuti, tutta la
     notte: trenta righe identiche che dicono la stessa cosa nascondono quelle
     che contano. */
  deve(/avvisatoSeme/.test(src), 'l\'avviso torna a ripetersi ad ogni giro del keep-alive');
  deve(/avvisatoSeme = false/.test(src), 'una volta rientrati, l\'avviso non si riarma: al prossimo distacco resterebbe muto');
});

prova('quando la sessione cade, si scrive quando', () => {
  deve(/è caduta adesso/.test(src),
    'la caduta resta silenziosa: senza quel momento non si può sapere quanto dura una sessione, e quindi nemmeno come tenerla viva');
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

prova('si salva anche il sessionStorage, che storageState non prende', () => {
  /* IL PEZZO CHE MANCAVA ALLA COPIA. `storageState` di Playwright mette nel
     file i cookie e il localStorage, e il sessionStorage no — sta scritto nella
     sua documentazione. Ed e' proprio li' che le applicazioni costruite su
     Auth0 tengono volentieri il gettone di accesso.
     La prova che serviva davvero l'ha data il rilascio del 14/09/2026 alle
     12:57: il riavvio ha rimesso dentro una copia di UN MINUTO e il portale
     l'ha rifiutata. Non era la copia a essere vecchia — era incompleta. Prima
     di allora si era dato la colpa all'invecchiamento, e si sarebbe accorciato
     l'intervallo di salvataggio all'infinito senza risolvere niente. */
  deve(/sessionStorage/.test(src),
    'del sessionStorage non si salva niente: al riavvio si rimette dentro una sessione a cui manca il pezzo che conta');
  const salva = src.slice(src.indexOf('async function salvaSessione'), src.indexOf('async function ripristinaSessione'));
  deve(/sessionStorage\.key\(/.test(salva), 'la copia non legge le voci del sessionStorage');
  const ripristina = src.slice(src.indexOf('async function ripristinaSessione'), src.indexOf('async function ripristinaSessione') + 2200);
  deve(/sessionStorage\.setItem/.test(ripristina), 'le voci si salvano e non si rimettono mai: rete stesa e non agganciata, come auth.json fino all\'11/09');
  return 'salvato e rimesso';
});

prova('del sessionStorage si scrive QUANTE voci, mai cosa contengono', () => {
  /* Sono gettoni di accesso: valgono quanto una password, e un giornale lo
     leggono in tanti. Il conteggio invece serve, ed e' innocuo: al prossimo
     riavvio dira' se l'ipotesi era giusta. */
  const salva = src.slice(src.indexOf('async function salvaSessione'), src.indexOf('async function ripristinaSessione'));
  const righeLog = salva.match(/log\([^)]*\)/g) || [];
  for (const r of righeLog) {
    deve(!/voci\)|JSON\.stringify\(voci|getItem/.test(r),
      'una riga di giornale si porta dietro il contenuto del sessionStorage: ' + r);
  }
  deve(/quante/.test(salva), 'non si conta niente: al riavvio non si potra\' dire se il pezzo c\'era');
});

prova('all\'accensione si aspetta l\'accesso come si aspetta al login', () => {
  /* LA DIFFERENZA CHE E' COSTATA MEZZA GIORNATA, il 14/09/2026.
     Al login si aspettava fino a 30 secondi e a metà attesa si apriva la home
     per far concludere il giro di autenticazione — e funziona: alle 13:17:22
     quella spinta ha chiuso un accesso fermo sul rimbalzo.
     All'accensione invece si rimettevano i cookie e si guardava UNA VOLTA
     SOLA, subito: 13:02:39 sessione ripristinata, 13:02:50 «non più valida».
     Non lo era. I cookie dell'identità erano salvati e vivi, e il portale
     aveva appena consegnato un `code=`: mancava solo l'ultimo passo, e nessuno
     glielo lasciava fare. Si è dato la colpa ai cookie che ruotano, poi al
     sessionStorage: due spiegazioni sbagliate, perché il guasto non era nel
     COSA si salva ma in QUANTO si aspetta. */
  deve(/async function attendiAccesso/.test(src),
    'l\'attesa non è in un posto solo: le due strade torneranno a comportarsi diversamente');
  const avvio = src.indexOf('// Avvio: NON invio le credenziali') > -1
    ? src.slice(src.indexOf('// Avvio: NON invio le credenziali'))
    : src.slice(src.indexOf('ripristinaSessione()', src.indexOf('async function ripristinaSessione') + 50));
  const blocco = avvio.slice(0, 2200);
  deve(/attendiAccesso/.test(blocco),
    'all\'accensione si guarda ancora una volta sola: una sessione viva viene dichiarata morta a metà del giro di autenticazione');
  deve(/loggedIn\(\)/.test(blocco),
    'il verdetto finale non usa più il controllo severo: sul rimbalzo quello leggero direbbe di sì, ed è il falso positivo del 12/09');
  return 'stessa pazienza, verdetto severo';
});

prova('la spinta sulla pagina di rimbalzo esiste ancora, e in un posto solo', () => {
  /* È il pezzo che fa concludere il giro OIDC. Se sparisce, tornano sia il
     login che si arrende sia l'accensione che butta via una sessione buona. */
  const quante = (src.match(/apro la home per far concludere l/g) || []).length;
  deve(quante === 1, 'la spinta è sparita o è stata duplicata (' + quante + ' volte): duplicarla vuol dire due comportamenti che divergono');
  const f = src.slice(src.indexOf('async function attendiAccesso'), src.indexOf('async function attendiAccesso') + 1200);
  deve(/soloRimbalzo\(page\.url\(\)\)/.test(f), 'la spinta non guarda più se siamo davvero sul rimbalzo: navigherebbe a caso');
  deve(/i === spintaAl/.test(f), 'la spinta non è più una volta sola a metà attesa: disturberebbe un accesso che sta riuscendo');
});

let ko = 0;
for (const [ok, nome, nota] of esiti) { if (!ok) ko++; console.log((ok ? '  ok  ' : '  KO  ') + nome + (nota ? '  — ' + nota : '')); }
console.log('\nAXA SESSIONE: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
