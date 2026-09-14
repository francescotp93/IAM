// ═══════════════════════════════════════════════════════════════════════════════
//  IL CODICE SE LO PRENDE DA SOLO ANCHE QUANDO NON C'E' NESSUNO
//
//  PERCHE' ESISTE
//    Il 13/09/2026 il backend ha imparato a leggersi il codice OTP dalla posta
//    dell'agenzia, così nessuno deve più fare il giro «apri la posta, copia sei
//    cifre, incolla». Funzionava. Ma era agganciato a UN SOLO punto: la rotta
//    che parte quando una persona preme «Accedi» nel pannello Fonti.
//
//    Cioè lavorava nel caso in cui la persona è già lì davanti — dove serve
//    meno — e taceva nell'unico caso per cui era stato scritto.
//
//    Misurato il 14/09/2026, alle 11:22, senza nessuno davanti allo schermo:
//      11:22:51  [groupama] sessione ISA scaduta → re-login automatico…
//      11:22:55  [groupama] schermata OTP raggiunta: attendo il codice
//    La mail col codice era arrivata. Nessuno è andato a prenderla, e Groupama
//    è rimasto fuori dal portale finché un essere umano non se n'è accorto.
//
//    C'è anche un secondo guaio, più silenzioso: il guardiano, trovando la
//    fonte «non loggata», bussava con un altro /login — e ogni /login su
//    Groupama è UNA MAIL IN PIÙ con un codice nuovo, che rende inutile quello
//    appena arrivato.
//
//  COSA SI PROVA QUI
//    La regola pura — «è fermo ad aspettare un codice, e da quando devo
//    cercarlo nella posta» — e che il guardiano la consulti PRIMA di bussare.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* Si importa il modulo INTERO e si ripiega su un errore parlante: se la regola
   non c'è ancora (com'era prima del 14/09/2026), le prove devono dire COSA
   manca, non esplodere al caricamento. Una contro-prova che non parte non
   dimostra niente. */
const W = Object.assign({}, await import('../fontiWatchdog.js').catch(() => ({})));
const fermoAlCodice = W.fermoAlCodice
  || (() => { throw new Error('fermoAlCodice non esiste: il guardiano non sa riconoscere uno scraper già fermo ad aspettare il codice'); });
const serveIlCodice = W.serveIlCodice || (() => { throw new Error('serveIlCodice non esiste più'); });

const QUI = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = fs.readFileSync(path.join(QUI, 'fontiWatchdog.js'), 'utf8');
const srcFonti = fs.readFileSync(path.join(QUI, 'fonti.js'), 'utf8');

const esiti = [];
const prova = (nome, fn) => { try { esiti.push([true, nome, fn() || '']); } catch (e) { esiti.push([false, nome, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

const ORA = 1_800_000_000_000;

prova('fermo sul codice: si dice di sì, e da quando cercare nella posta', () => {
  const r = fermoAlCodice({ step: 'attesa_otp', running: false, since: ORA }, ORA);
  deve(r, 'uno scraper fermo ad aspettare il codice non viene riconosciuto: il codice nella posta resta lì');
  /* La mail parte quando il login COMINCIA, `since` è quando lo scraper si è
     FERMATO: qualche secondo dopo. Cercare da `since` esatto scarterebbe
     proprio la mail che ci serve. */
  deve(r.dopo < ORA, 'si cerca a partire dall\'istante in cui si è fermato: la mail è arrivata PRIMA e viene scartata');
  deve(ORA - r.dopo <= 10 * 60 * 1000, 'si guarda troppo indietro nella posta: si rischia di ripescare un codice già usato');
});

prova('un login ANCORA in corso non si tocca', () => {
  /* Consegnare un codice mentre lo scraper ne sta chiedendo un altro è il modo
     perfetto per bruciarli tutti e due. */
  deve(fermoAlCodice({ step: 'attesa_otp', running: true, since: ORA }, ORA) === null,
    'ci si intromette mentre il login sta ancora lavorando');
});

prova('chi non aspetta un codice non viene disturbato', () => {
  for (const step of ['loggato', 'non_loggato', 'pronto', 'errore', 'timeout_otp', '']) {
    deve(fermoAlCodice({ step, running: false, since: ORA }, ORA) === null,
      'il passo «' + step + '» viene scambiato per un\'attesa di codice: si va a frugare nella posta per niente');
  }
  deve(fermoAlCodice(null, ORA) === null, 'uno scraper che non risponde manda comunque a cercare nella posta');
});

prova('senza «since» si cerca comunque, non si rinuncia', () => {
  /* Non tutti gli scraper dicono da quando sono fermi. Rinunciare sarebbe la
     scelta comoda: qui si preferisce guardare gli ultimi minuti. */
  const r = fermoAlCodice({ step: 'attesa_codice', running: false }, ORA);
  deve(r, 'senza «since» si rinuncia a cercare il codice');
  deve(r.dopo < ORA && ORA - r.dopo <= 10 * 60 * 1000, 'la finestra di ricerca non è sensata: ' + (ORA - r.dopo) + ' ms');
});

prova('la vecchia regola resta al suo posto', () => {
  // fermoAlCodice si appoggia a serveIlCodice: se quella cambia, cambia tutto.
  deve(serveIlCodice('attesa_otp') === true && serveIlCodice('loggato') === false,
    'serveIlCodice non si comporta più come deve: fermoAlCodice ne eredita l\'errore');
});

prova('il guardiano guarda lo stato PRIMA di bussare con un altro login', () => {
  /* È l'ordine che conta. Bussare per primo vuol dire una seconda mail con un
     codice nuovo, e il primo codice — quello che stavamo per prendere —
     diventa carta straccia. */
  const guarda = src.indexOf('fermoAlCodice(statoOra');
  const bussa = src.indexOf('await tentaRientro(f.surl)');
  deve(guarda > -1, 'il guardiano non guarda lo stato: continua a bussare su uno scraper già fermo al codice');
  deve(bussa > -1, 'non trovo più il punto in cui si tenta il rientro: prova da riscrivere, non da cancellare');
  deve(guarda < bussa, 'si bussa PRIMA di guardare: arriva una seconda mail e il codice buono si brucia');
});

prova('e la posta la interroga davvero', () => {
  deve(/codiceDallaPosta/.test(src), 'il guardiano non chiama mai la lettura della posta: il codice resta da digitare a mano');
  deve(/export async function codiceDallaPosta/.test(srcFonti),
    'la lettura della posta non è esportata: solo il pulsante «Accedi» può usarla, e il caso senza nessuno resta scoperto');
});

prova('la lettura della posta sta SOPRA l\'interruttore del rientro automatico', () => {
  /* QUESTA E' LA PROVA CHE MANCAVA, ed e' costata una PR intera.
     Il 14/09/2026 il pezzo era stato scritto sotto `if (!conRientro) continue;`.
     In produzione FONTI_AUTOLOGIN non c'e' — il guardiano lo dice da solo ad
     ogni avvio, «rientro automatico: no» — quindi il giro usciva PRIMA di
     arrivarci: otto prove verdi su codice che sulla macchina non girava mai.
     E' il difetto che CLAUDE.md mette al primo posto, e nessuna prova verde se
     ne accorge da sola: va sorvegliato l'ORDINE.

     Perche' sopra e non sotto, nel merito: quell'interruttore governa il
     rimandare CREDENZIALI ai portali da soli, spento apposta dopo la mattina
     dei quattro codici Groupama. Prendere un codice gia' arrivato nella
     casella non e' quella cosa: non manda niente a nessuno e non fa nascere
     nessuna mail nuova. */
  const posta = src.indexOf('fermoAlCodice(statoOra');
  const interruttore = src.indexOf("if (!conRientro)");
  deve(interruttore > -1, 'non trovo piu\' l\'interruttore del rientro automatico: prova da riscrivere');
  deve(posta > -1, 'non trovo piu\' la lettura della posta nel giro di controllo');
  deve(posta < interruttore,
    'la lettura della posta e\' finita sotto FONTI_AUTOLOGIN: con l\'interruttore spento — cioe\' com\'e\' in produzione — non viene eseguita mai');
});

prova('ma si porta dietro i controlli che stavano piu\' sotto', () => {
  /* Salendo sopra l'interruttore ci si lascia alle spalle due guardie che
     servivano: lo scraper spento (non ha senso interrogarlo) e la quarantena
     (senza, si fruga nella posta ogni cinque minuti per sempre). */
  const da = src.indexOf('IL CODICE DALLA POSTA STA SOPRA');
  const cond = da < 0 ? '' : src.slice(src.indexOf('if (', da), src.indexOf('fermoAlCodice(statoOra', da));
  deve(/r && r\.ok/.test(cond),
    'si interroga anche uno scraper che non risponde: chiamata sprecata a ogni giro');
  deve(/quarantenaFinoA <= ora/.test(cond),
    'la quarantena non vale piu\' per la posta: si va a frugare nella casella ogni cinque minuti all\'infinito');
});

prova('«consegnato» non viene scambiato per «entrato»', () => {
  /* Se il portale rifiuta il codice serve comunque una persona. Dire «rientrata»
     spegnerebbe l'allarme su una fonte che è ancora fuori. */
  deve(/const dentro = !!\(out\.body && out\.body\.loggato\)/.test(srcFonti),
    'non si guarda se il portale ha ACCETTATO il codice: basta averlo spedito');
  deve(/return dentro;/.test(srcFonti), 'l\'esito non torna a chi ha chiamato: il guardiano non sa com\'è andata');
});

const ko = esiti.filter(e => !e[0]);
console.log('\n── Il codice dalla posta, anche senza nessuno davanti ──────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ok  ' : '  KO  ') + n + (d ? '  — ' + d : ''));
console.log(ko.length ? '\nVIGILANZA CODICE: ' + ko.length + ' fallite su ' + esiti.length : '\nVIGILANZA CODICE: ' + esiti.length + ' superate, 0 fallite');
process.exit(ko.length ? 1 : 0);
