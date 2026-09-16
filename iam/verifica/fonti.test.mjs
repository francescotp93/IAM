// ═══════════════════════════════════════
//  FONTI COMPAGNIE — la schermata più delicata del sistema
//
//  Le credenziali con cui l'agenzia entra nei portali delle compagnie. Il kit
//  consegnato elenca quattro regole non negoziabili, e queste prove le
//  sorvegliano una per una — perché sono esattamente le regole che si
//  perdono per prime quando qualcuno «sistema al volo» una schermata:
//
//   1. Solo Super Admin, e il cancello sta NEL CODICE, non solo nel menu:
//      una voce nascosta si raggiunge lo stesso scrivendo l'indirizzo.
//   2. Le password non tornano mai al browser, quindi i campi non si
//      precompilano e un campo vuoto vuol dire «non la cambio».
//   3. Il freno non si scavalca: dopo tre accessi falliti lo scraper smette
//      di bussare, e forzarlo da qui farebbe bloccare l'utenza dalla
//      compagnia.
//   4. «Riuscito» lo dice il backend, mai il browser perché la richiesta è
//      partita.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ritaglia } from './banco.mjs';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(radice, 'withus-one.js'), 'utf8');

/* Le funzioni di QUESTA schermata. Serve a non confondere il vecchio pannello
   Fonti — che parla con /fonti sul motore — con «Stato collegamenti», che parla
   con l'API v1 e usa un vocabolario diverso di proposito. */
const FUNZIONI_PANNELLO = ['fontiStatoAccesso', 'fontiPuoEntrare', 'fontiCarica', 'fontiFiltro',
  'fontiDisegna', 'fontiSomma', 'fontiInfo', 'fontiScheda', 'fontiApri', 'fontiEsito', 'fontiSalva',
  'fontiNuovaApri', 'fontiCrea', 'fontiElimina', 'fontiStrumento', 'fontiAccedi', 'fontiAspetta',
  'fontiApriCodice', 'fontiCodiceDiretto', 'fontiCodice', 'fontiAltroCodice', 'fontiVerifica'];

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

// ── 1. La schermata vive in IAM, non nel preventivatore ──────────────────
prova('le fonti sono una schermata di IAM, non un riquadro del preventivatore', () => {
  deve(/id="panel-fonti"/.test(html), 'manca il pannello delle fonti in IAM');
  /* Sono credenziali dei portali: amministrazione. Il preventivatore resta
     dedicato a preventivare (IAM.md §4). */
  deve(!/go:\s*Q\('fonti'\)/.test(scocca), 'il menu apre ancora le fonti dentro il preventivatore');
  deve(/vai\('fonti'\)/.test(scocca), 'il menu non porta alla schermata di IAM');
});

// ── 2. Solo Super Admin ──────────────────────────────────────────────────
prova('il cancello sta nel codice, non solo nel menu', () => {
  const g = (ritaglia(html, 'fontiPuoEntrare') || '') + (ritaglia(html, 'fontiStatoAccesso') || '');
  deve(g, 'manca il controllo di accesso');
  /* Il controllo riusa isSuperAdmin(), che è l'helper del resto del
     gestionale. Una copia della regola qui dentro vorrebbe dire che il
     giorno in cui cambia, questa schermata resta indietro in silenzio. */
  deve(/isSuperAdmin\(\)/.test(g), 'il controllo non riusa isSuperAdmin()');
  deve(/function isSuperAdmin\(\)/.test(html), 'manca l\'helper isSuperAdmin');
  /* Una voce di menu nascosta si raggiunge scrivendo l'indirizzo: il
     controllo deve stare dove i dati vengono chiesti. */
  const c = ritaglia(html, 'fontiCarica');
  deve(c && /fontiStatoAccesso\(\)/.test(c), 'si possono caricare le fonti senza controllare chi sei');
  for (const f of ['fontiSalva', 'fontiVerifica']) {
    const b = ritaglia(html, f);
    deve(b && /fontiPuoEntrare\(\)/.test(b), f + ' non controlla chi sta scrivendo');
  }
});

// ── 3. Le password non tornano al browser ────────────────────────────────
prova('nessun campo password viene precompilato', () => {
  const s = ritaglia(html, 'fontiScheda');
  deve(s, 'manca fontiScheda');
  /* Il backend manda «salvata», non il valore. Se un giorno mandasse anche
     il valore, questo campo lo stamperebbe: qui si sorveglia che non lo
     faccia mai. */
  deve(!/f\.password/.test(s), 'la scheda legge una password dalla risposta del server');
  deve(!/f\.totp/.test(s), 'la scheda legge un segreto TOTP dalla risposta del server');
  deve(/type="password"[^>]*placeholder/.test(s.replace(/\n/g, ' ')) || /Lascia vuoto/.test(s),
    'il campo password non spiega che vuoto vuol dire «non la cambio»');
});

prova('un campo vuoto non cancella quello che c\'è', () => {
  const s = ritaglia(html, 'fontiSalva');
  deve(s, 'manca fontiSalva');
  /* Mandare una stringa vuota sovrascriverebbe la credenziale buona con
     niente, e l'agenzia resterebbe fuori dal portale. */
  for (const campo of ['user', 'pw']) {
    deve(new RegExp('if \\(' + campo + '\\)').test(s), 'il campo ' + campo + ' viene mandato anche se vuoto');
  }
  /* L'indirizzo ha una condizione in più: sulle compagnie con collegamento
     dedicato l'indirizzo lo conosce il collegamento, e mandarlo darebbe
     l'impressione di averlo cambiato senza che cambi niente. */
  deve(/if \(url && campoUrl && !campoUrl\.disabled\)/.test(s), 'l\'indirizzo viene mandato anche dove non è modificabile');
  deve(/Niente da salvare/.test(s), 'con tutti i campi vuoti parte comunque una scrittura');
  /* Dopo il salvataggio il campo si svuota: lasciarlo pieno fa credere che
     il valore mostrato sia quello salvato. */
  deve(/pwEl.*value = ''|value = ''/.test(s), 'il campo password resta pieno dopo il salvataggio');
});

// ── 4. Il freno si mostra, non si scavalca ───────────────────────────────
prova('lo stato «bloccata» si vede e si spiega', () => {
  const s = ritaglia(html, 'fontiScheda');
  deve(s && /bloccata/.test(s), 'lo stato bloccata non viene distinto');
  deve(/freno/i.test(s), 'non viene spiegato che cos\'è il blocco');
  /* «Bloccata» non è «non attiva e basta»: è l'unico stato che chiede un
     gesto preciso, e confonderli fa perdere tempo a chi guarda. */
  const info = ritaglia(html, 'fontiInfo');
  deve(html.includes('FONTI_STATO'), 'manca la mappa degli stati');
  deve(info, 'manca fontiInfo');
  /* Si guardano le AZIONI, non le parole: il testo che spiega il freno dice
     «non forzando da qui», ed è giusto che lo dica. Quello che non deve
     esistere è un pulsante che lo toglie. */
  const azioni = (s.match(/onclick="[^"]+"/g) || []).join(' ');
  deve(!/sblocc|forza|bypass|reset/i.test(azioni), 'c\'è un\'azione che scavalca il freno');
});

// ── 5. «Riuscito» lo dice il backend ─────────────────────────────────────
prova('l\'accesso non si dà per riuscito prima della conferma', () => {
  const v = ritaglia(html, 'fontiVerifica');
  deve(v, 'manca fontiVerifica');
  deve(/Verifica in corso/.test(v), 'non viene detto che la verifica è in corso');
  /* L'esito si legge dalla risposta, non si presume perché la richiesta è
     partita: dirlo prima è il modo più rapido di far fidare qualcuno di un
     collegamento che non funziona. */
  deve(/r\.ok === true|r\.stato === 'attiva'/.test(v), 'l\'esito non viene letto dalla risposta del motore');
  deve(/non ha confermato/.test(v), 'una risposta negativa non viene distinta da una riuscita');
});

// ── 6. Gli endpoint non sono stati rinominati ────────────────────────────
prova('gli endpoint restano quelli che c\'erano', () => {
  for (const e of ["'/fonti'", "/credenziali", "/verifica"]) {
    deve(html.includes(e), 'endpoint cambiato o mancante: ' + e);
  }
  /* Passano dal fetch autenticato di IAM: senza token il backend risponde
     403, e la schermata sembrerebbe rotta invece che chiusa. */
  const c = ritaglia(html, 'fontiCarica');
  deve(c && /mailFetch\(/.test(c), 'le fonti non passano dal fetch autenticato');
});

// ── 7. Lo stato non deve invecchiare in silenzio ─────────────────────────
prova('aprendo la schermata lo stato si rilegge', () => {
  /* Uno stato di collegamento vecchio di dieci minuti è peggio di nessuno
     stato: si crede a un «attiva» che non c'è più. */
  deve(/t === 'fonti'\s*\)\s*\{\s*fontiCarica\(true\)/.test(html.replace(/\s+/g, ' ')),
    'aprendo le fonti non si rilegge lo stato');
});

// ── 8. Niente di quello che c'era deve essere andato perso ──────────────
prova('il pannello nuovo fa tutto quello che faceva il vecchio', () => {
  /* La schermata nuova sostituisce quella del preventivatore: se ne perde
     un pezzo, quel pezzo si puo' fare solo mettendo le mani sul server.
     Questo elenco viene dalle rotte del backend, non da un desiderio. */
  const attese = {
    'elenco':            "'/fonti'",
    'salva credenziali': '/credenziali',
    'controlla stato':   '/verifica',
    'accedi al portale': '/accedi',
    'stato del login':   '/loginstate',
    'conferma codice':   '/conferma-codice',
    'altro codice':      '/altro-codice',
    'prova preventivo':  '/auto?targa=',
    'cattura API':       "'/sniff'",
    'esplora portale':   "'/explore'",
  };
  for (const [cosa, pezzo] of Object.entries(attese)) {
    deve(html.includes(pezzo), 'funzione persa rispetto al vecchio pannello: ' + cosa);
  }
  for (const fn of ['fontiCrea', 'fontiElimina']) {
    deve(ritaglia(html, fn), 'manca ' + fn + ': una compagnia nuova si collegherebbe solo dal server');
  }
});

prova('il codice del portale ha dove essere scritto', () => {
  /* Il portale manda un codice via email e senza quello il collegamento non
     riparte. Lasciare l'operatore davanti al messaggio senza un campo dove
     scriverlo e' il punto esatto in cui si rinuncia e si telefona. */
  const s = ritaglia(html, 'fontiScheda');
  deve(s && /f-cod-/.test(s), 'non c\'è nessun campo per il codice ricevuto');
  deve(s && /fontiCodice\(/.test(s), 'il codice non si può confermare');
  deve(s && /fontiAltroCodice\(/.test(s), 'non si può chiedere un codice nuovo');
});

prova('dopo l\'accesso si aspetta il portale, non si dice «fatto»', () => {
  const a = ritaglia(html, 'fontiAspetta');
  deve(a, 'manca l\'attesa: si direbbe «fatto» appena partita la richiesta');
  deve(/loginstate/.test(a), 'lo stato del login non viene richiesto al portale');
  /* Un ciclo senza fine lascerebbe la schermata a girare per sempre su un
     portale che non risponde piu'. */
  deve(/i < \d+/.test(a), 'l\'attesa non ha una fine');
  deve(/più del previsto/.test(a), 'scaduta l\'attesa non viene detto niente');
});

prova('eliminare una fonte chiede conferma e dice cosa sparisce', () => {
  const e = ritaglia(html, 'fontiElimina');
  deve(e, 'manca fontiElimina');
  deve(/confirm\(/.test(e), 'una fonte si elimina senza chiedere niente');
  deve(/credenziali/.test(e), 'non viene detto che spariscono anche le credenziali');
});

// ── 9. Il profilo che arriva in ritardo non deve chiudere fuori ─────────
prova('aprendo prima che arrivi il profilo si aspetta, non si viene respinti', () => {
  /* Il guasto vero del 4/8/2026, e il piu' insidioso di tutti: il profilo
     arriva da Supabase in modo asincrono, e chi apriva le Fonti subito dopo
     l'ingresso ci arrivava PRIMA. Con una risposta secca si', no, la
     schermata rispondeva «no» a un Super Admin, si chiudeva e non riprovava
     mai piu'. Restava l'estetica e non funzionava niente — senza errore,
     perche' dal suo punto di vista non era successo niente di sbagliato. */
  const st = ritaglia(html, 'fontiStatoAccesso');
  deve(st, 'manca fontiStatoAccesso: il controllo torna a essere sì/no');
  deve(/'attesa'/.test(st), 'non esiste lo stato «non lo so ancora»');
  deve(/!ME \|\| !ME\.email/.test(st), 'un profilo non ancora arrivato viene scambiato per un rifiuto');
  const c = ritaglia(html, 'fontiCarica');
  deve(c && /accesso === 'attesa'/.test(c), 'l\'attesa non viene distinta dal rifiuto');
  deve(c && /setTimeout\(\(\) => fontiCarica\(true\)/.test(c), 'quando il profilo arriva non si riprova');
  /* E non si aspetta per sempre: se dopo qualche secondo il profilo non c'e',
     il problema e' l'ingresso, e va detto invece di girare in tondo. */
  deve(c && /FONTI_ATTESE > \d+/.test(c), 'l\'attesa del profilo non ha una fine');
  deve(c && /Esci e rientra/.test(c), 'scaduta l\'attesa non viene detto cosa fare');
});

prova('a chi non ha i permessi si dice con che utenza è entrato', () => {
  /* «Riservata al Super Admin» senza dire con quale utenza si è entrati fa
     perdere tempo a chi ha due account, ed è il caso normale qui. */
  const c = ritaglia(html, 'fontiCarica');
  deve(c && /ME\.email/.test(c), 'non viene detto con quale utenza si è entrati');
});

// ── 10. I nomi dei campi vengono dal backend, non da una supposizione ───
prova('lo stato del login si legge con i nomi veri del backend', () => {
  /* Il guasto «non accede»: la prima versione leggeva codice_richiesto,
     serve_codice e stato === 'codice'. Campi inventati. Il ciclo girava a
     vuoto e non rilevava mai niente — senza errore, perché tecnicamente
     nessuna riga era sbagliata. I nomi veri stanno in seguiLoginGuidato()
     dentro server/fonti.js: step, running, msg. */
  const a = ritaglia(html, 'fontiAspetta');
  deve(a, 'manca fontiAspetta');
  deve(/st\.step|\.step \|\|/.test(a), 'lo stato non viene letto da «step»');
  deve(/loggato/.test(a), 'non si riconosce il passo «loggato»');
  deve(/attesa_codice|FONTI_PASSO_CODICE/.test(a), 'non si riconosce l\'attesa del codice');
  /* Il vocabolario degli stati rotti sta in una lista sola, condivisa fra
     le compagnie: error, errore, non_loggato, senza_credenziali, timeout_otp,
     totp_rifiutato. Riconoscerne solo alcuni lascia l'accesso «in corso» per
     sempre su quelli che mancano. */
  deve(/FONTI_PASSI_ROTTI/.test(a), 'gli stati di fallimento non vengono riconosciuti');
  for (const passo of ['non_loggato', 'senza_credenziali', 'timeout_otp', 'totp_rifiutato']) {
    deve(html.includes(passo), 'stato di fallimento non riconosciuto: ' + passo);
  }
  /* NON si decide su `running`: era un'altra mia invenzione. Gli stati di
     passaggio — credenziali, invio_otp, start — non sono errori, e leggerli
     come «ha finito» chiudeva l'accesso a metà. Si decide solo su `step`,
     come faceva il pannello che funzionava. */
  deve(/Accesso in corso/.test(a), 'gli stati di passaggio non vengono mostrati mentre si aspetta');
  deve(/i < 60/.test(a), 'i tentativi sono meno di 60: un login lento verrebbe dato per fallito');
  /* I campi inventati non devono tornare — nel CODICE DI QUESTO PANNELLO.
     Il commento che racconta il guasto li nomina, ed è il motivo per cui è
     scritto; per questo si tolgono i commenti prima di guardare.

     E si guarda SOLO le funzioni di questa schermata, non tutto il file. Dal
     20/08/2026 in IAM c'è anche «Stato collegamenti», che parla con l'API v1
     di QUOTO: lì `serve_codice` NON è inventato — è uno dei cinque stati che
     il contratto definisce e che il motore restituisce davvero
     (CONTRATTO-API.md §5bis). Vietarlo in tutto il file vorrebbe dire vietare
     a IAM di leggere il nome che il motore gli manda: il divieto vale per chi
     parla col vecchio endpoint, che quei nomi non li conosce. */
  const soloQui = FUNZIONI_PANNELLO.map(n => ritaglia(html, n) || '').join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  deve(soloQui.length > 2000, 'non riesco a ritagliare le funzioni del pannello: ' + soloQui.length + ' caratteri');
  for (const finto of ['codice_richiesto', 'serve_codice']) {
    deve(!soloQui.includes(finto), 'è tornato un campo che il vecchio endpoint non manda: ' + finto);
  }
});

prova('la bussata iniziale non blocca la schermata', () => {
  /* POST /accedi può restare appeso fino a un minuto e mezzo. Aspettarlo
     vuol dire una schermata ferma che non dice niente: si parte subito a
     seguire lo stato. */
  const c = ritaglia(html, 'fontiAccedi');
  deve(c, 'manca fontiAccedi');
  deve(!/await mailFetch\([^)]*accedi/.test(c), 'si aspetta la bussata iniziale invece di seguire lo stato');
  deve(/fontiAspetta\(/.test(c), 'dopo la bussata non si segue lo stato del portale');
});

// ── 11. Il portale parla, la schermata riporta ──────────────────────────
prova('quando il portale si ferma, si riporta quello che dice lui', () => {
  /* «La schermata password non è comparsa dopo l'utente» è il portale che
     spiega A CHE PUNTO si è rotto. Riassumerlo in «accesso non riuscito»
     toglie l'unica informazione utile che c'era. */
  const a = ritaglia(html, 'fontiAspetta');
  deve(a, 'manca fontiAspetta');
  deve(/st\.msg/.test(a), 'il messaggio del portale non viene riportato');
  deve(/Il portale:/.test(a), 'non si distingue un guasto del portale da uno del gestionale');
});

prova('non si inventa da dove arriva il codice', () => {
  /* Allianz usa Duo Mobile, altri mandano una email. Scrivere «arriva via
     email» su tutti manda l'operatore a guardare la posta mentre il codice
     è sul telefono. Il testo viene dal portale. */
  const s = ritaglia(html, 'fontiScheda');
  deve(s, 'manca fontiScheda');
  const senzaCommenti = s.replace(/\/\*[\s\S]*?\*\//g, '');
  deve(!/Arriva via email/.test(senzaCommenti), 'la scheda dà per scontato che il codice arrivi via email');
  deve(/FONTI_ATTESA\[f\.id\][\s\S]{0,40}msg/.test(s), 'la scheda non usa il messaggio del portale');
  const asp = ritaglia(html, 'fontiAspetta');
  deve(/codice: true, msg:/.test(asp), 'il messaggio del portale non viene conservato per la scheda');
});

// ── 12. L'esito deve sopravvivere al ridisegno ──────────────────────────
prova('l\'esito di un\'azione non viene cancellato dal ridisegno', () => {
  /* Il guasto «non dice nulla». Quasi tutte le azioni finiscono con
     fontiCarica(true), che ridisegna l'elenco e ricrea le schede da zero —
     buttando via lo <span> dove l'esito era appena stato scritto.
     «Credenziali salvate», «accesso confermato», «eliminata»: comparivano e
     sparivano nello stesso istante, e il pulsante sembrava non fare niente.
     L'unico messaggio che si vedeva era l'errore del portale, perché quel
     ramo era l'unico a non ridisegnare — ed è il motivo per cui il guasto
     è sembrato a lungo un problema del motore. */
  const e = ritaglia(html, 'fontiEsito');
  deve(e, 'manca fontiEsito');
  deve(/FONTI_ESITI\[id\]\s*=/.test(e), 'l\'esito non viene conservato: sopravvive solo finché nessuno ridisegna');
  const s = ritaglia(html, 'fontiScheda');
  deve(s && /FONTI_ESITI\[f\.id\]/.test(s), 'la scheda non ristampa l\'esito quando viene ricostruita');
  /* Anche il colore: un «salvato» verde che torna grigio dopo il ridisegno
     fa dubitare che sia andata bene. La scheda ora ristampa l'esito passando
     dallo stesso helper che lo disegna dal vivo (fontiEsitoHTML), e quell'unico
     punto deve portarsi dietro il colore. */
  deve(s && /fontiEsitoHTML\(/.test(s), 'la scheda non riusa il disegno dell\'esito: rischia di divergere dal vivo');
  const h = ritaglia(html, 'fontiEsitoHTML');
  deve(h && /colore/.test(h) && /color:/.test(h), 'il colore dell\'esito si perde nel ridisegno');
});

// ── 13. La barra dice «a che punto siamo» ────────────────────────────────
prova('l\'accesso mostra una barra che avanza con i passi del portale', () => {
  /* Prima c'era solo una scritta ferma: HDI rientra in ~80s in sottofondo e
     sembrava bloccato. La barra è DETERMINATA — ogni passo vale una
     percentuale nota — e deve comparire solo quando c'è una percentuale. */
  deve(/#panel-fonti \.f-prog\b/.test(html), 'manca lo stile della barra di avanzamento');
  const h = ritaglia(html, 'fontiEsitoHTML');
  deve(h && /f-prog/.test(h), 'la barra non viene disegnata insieme all\'esito');
  deve(h && /typeof st\.perc === 'number'/.test(h), 'la barra compare anche senza una percentuale: sarebbe una barra a vuoto');
  const p = ritaglia(html, 'fontiPassoPerc');
  deve(p, 'manca la mappa passo→percentuale');
  deve(/loggato[^]*100/.test(p), 'il passo «loggato» non arriva al 100%');
  deve(/credenziali/.test(p) && /attesa_otp/.test(p), 'i passi veri del backend non sono mappati sulla barra');
  const a = ritaglia(html, 'fontiAspetta');
  deve(/fontiPassoPerc\(/.test(a), 'mentre si aspetta la barra non segue i passi');
});

// ── 14. «Controlla stato» non boccia un accesso ancora in volo ───────────
prova('la verifica segue un login in corso invece di darlo per fallito', () => {
  /* Il guasto di Francesco su HDI: «Controlla stato» faceva una verifica secca
     mentre il login asincrono era ancora in corso, e rispondeva «Il motore non
     ha confermato l'accesso» su un accesso che stava riuscendo. Ora prima
     guarda /loginstate e, se c'è un accesso in volo, segue la barra. */
  const v = ritaglia(html, 'fontiVerifica');
  deve(v, 'manca fontiVerifica');
  deve(/loginstate/.test(v), 'la verifica non guarda lo stato del login prima di sentenziare');
  deve(/fontiAspetta\(/.test(v), 'un login ancora in corso non viene seguito: verrebbe dato per fallito');
  deve(/running === true|fontiPassoPerc\(/.test(v), 'non si distingue un accesso in volo da uno fermo');
});

let ko = 0;
console.log('\nFONTI COMPAGNIE');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ko && !ok) ko++;
  else if (!ok) ko++;
}
console.log(`\nFONTI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
