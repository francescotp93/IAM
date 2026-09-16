// ═══════════════════════════════════════════════════════════════════════════════
//  STATO COLLEGAMENTI — la schermata che dice se oggi si può quotare
//
//  A che serve. Se una compagnia non è collegata, il preventivo su quella
//  compagnia non esce. Prima per saperlo bisognava aprire un terminale sulla
//  macchina; adesso c'è una schermata in IAM, e i dati arrivano dalle API di
//  QUOTO passando dal ponte.
//
//  Che cosa sorvegliano queste prove, e perché proprio queste.
//
//  1. IAM NON HA LA CHIAVE DEL MOTORE E NON DEVE AVERLA. IAM gira nel browser,
//     e nel browser un segreto non è un segreto: chiunque apra gli strumenti di
//     sviluppo se lo legge, e il repository è pubblico. Di qui passa solo la
//     sessione dell'operatore.
//  2. «COLLEGATA» LO DICE IL MOTORE. Mai scrivere che l'accesso è riuscito solo
//     perché la richiesta è partita: è la stessa regola del pannello Fonti, ed
//     è la prima che si perde quando qualcuno «sistema al volo» una schermata.
//  3. «NON È DENTRO» E «NON LO DICE» SONO DUE COSE DIVERSE. La prima è da
//     sistemare, la seconda vuol dire che non lo sappiamo. Confonderle manda a
//     cercare un guasto dalla parte sbagliata — ed è successo davvero il
//     20/08/2026, dalla parte del motore.
//  4. IL FRENO NON SI SCAVALCA. Dopo tre accessi falliti la compagnia si ferma
//     per un quarto d'ora: è quello che ci evita di farci bloccare l'utenza,
//     che si sblocca solo telefonando.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('STATO COLLEGAMENTI');

/* Una risposta come quella vera di /api/v1/fonti/salute, con dentro i tre casi
   che contano: dentro, fuori, e «non lo dice». */
const SALUTE = {
  success: true,
  riepilogo: { totale: 3, attive: 1, raggiungibili: 3, con_problemi_gravi: 1 },
  problemi: [{ fonte: 'Groupama', gravita: 'alta', messaggio: 'Il portale ha rifiutato utente e password.', cosa_fare: 'Aggiorna la password in Fonti compagnie.' }],
  fonti: [
    { id: 'italiana', nome: 'Italiana', raggiungibile: true, loggato: true, diagnosi: [], visto_dal_servizio: { ultimo_messaggio: 'Sessione attiva' } },
    { id: 'groupama', nome: 'Groupama', raggiungibile: true, loggato: false,
      diagnosi: [{ gravita: 'alta', messaggio: 'Credenziali rifiutate.', cosa_fare: 'Aggiorna la password in Fonti compagnie.' }],
      visto_dal_servizio: { ultimo_messaggio: 'Login non riuscito: controlla utente/password.' } },
    { id: 'quotiamo', nome: 'Quotiamo', raggiungibile: true, loggato: null, diagnosi: [], visto_dal_servizio: null },
  ],
};

/* La stanza con le funzioni della schermata e un finto ponte pilotabile. */
function conSchermata(extra = {}) {
  const chiamate = [];
  const risposte = extra.risposte || {};
  const s = stanza(html, ['collegStato', 'collegDiagnosi', 'collegCarica', 'collegDisegna', 'collegAccedi', 'collegSegui', 'collegCodice'], {
    altro: {
      COLLEG: extra.COLLEG === undefined ? null : extra.COLLEG,
      COLLEG_ULTIMO: 0,
      COLLEG_LAVORO: extra.COLLEG_LAVORO || {},
      setTimeout: (fn) => { if (extra.seguiRicorsivo) fn(); return 0; },
      quotoFetch: async (percorso, opz) => {
        chiamate.push({ percorso, metodo: (opz && opz.method) || 'GET', corpo: opz && opz.corpo });
        const r = risposte[percorso];
        if (r instanceof Error) throw r;
        if (typeof r === 'function') return r();
        return r !== undefined ? r : SALUTE;
      },
    },
  });
  return { ...s, chiamate };
}

const html2 = (s, id) => (s.browser.elemento(id).innerHTML || '');

// ── 1. Il ponte: IAM non tiene la chiave del motore ─────────────────────────
e.prova('IAM non manda nessuna chiave interna al motore', () => {
  const c = ritaglia(html, 'quotoFetch');
  deve(c, 'manca quotoFetch');
  deve(!/X-Internal-Key/i.test(c),
    'IAM manda la chiave del motore: gira nel browser, quindi la regala a chiunque apra gli strumenti di sviluppo');
  deve(/access_token/.test(c), 'non manda la sessione dell\'operatore: il ponte non saprebbe chi sta chiedendo');
});

e.prova('si passa dal ponte, non dal motore', () => {
  deve(/functions\/v1\/quoto/.test(html), 'la schermata non passa dalla Edge Function');
  const c = ritaglia(html, 'collegCarica');
  deve(c && !/api\.withusassicurazioni/.test(c),
    'chiama il motore direttamente: da li\' non entrerebbe mai, perche\' la chiave non ce l\'ha');
});

e.prova('un errore del ponte si spiega, non si mostra e basta', () => {
  /* Sessione scaduta, permessi mancanti e motore spento sono tre guasti con
     tre rimedi diversi: dirli tutti «errore» costringe ad aprire la console
     del browser per sapere quale sia. */
  const c = ritaglia(html, 'collegCarica');
  for (const codice of ['FORBIDDEN', 'AUTH_FAILED', 'PROVIDER_UNAVAILABLE']) {
    deve(c.includes(codice), 'non distingue il caso ' + codice);
  }
});

// ── 2. Le tre risposte, tenute distinte ─────────────────────────────────────
e.prova('«dentro», «fuori» e «non lo dice» sono tre stati, non due', () => {
  const { ctx } = conSchermata();
  deve(ctx.collegStato({ raggiungibile: true, loggato: true }).chiave === 'dentro', 'chi e\' dentro non risulta dentro');
  deve(ctx.collegStato({ raggiungibile: true, loggato: false }).chiave === 'fuori', 'chi e\' fuori non risulta fuori');
  deve(ctx.collegStato({ raggiungibile: true, loggato: null }).chiave === 'boh',
    '«non lo dice» viene scambiato per una risposta: e\' la confusione che manda a cercare il guasto dalla parte sbagliata');
  deve(ctx.collegStato({ raggiungibile: false }).chiave === 'spento', 'un servizio spento non si distingue');
});

e.prova('nel quadro si legge quale compagnia è pronta e quale no', () => {
  const s = conSchermata({ COLLEG: SALUTE });
  s.ctx.collegDisegna();
  const lista = html2(s, 'cl-lista');
  deve(/Italiana/.test(lista) && /Groupama/.test(lista) && /Quotiamo/.test(lista), 'non le nomina tutte');
  deve(/collegata/.test(lista), 'non si vede quale e\' collegata');
  deve(/da collegare/.test(lista), 'non si vede quale e\' da collegare');
  deve(/non lo dice/.test(lista), 'chi non dichiara viene raccontato come se dichiarasse');
});

e.prova('chi è da sistemare sta in cima', () => {
  /* Chi apre questa schermata lo fa per le compagnie che non vanno: metterle
     in fondo vuol dire farle cercare. */
  const s = conSchermata({ COLLEG: SALUTE });
  s.ctx.collegDisegna();
  const lista = html2(s, 'cl-lista');
  deve(lista.indexOf('Groupama') < lista.indexOf('Italiana'),
    'la compagnia collegata viene prima di quella da sistemare');
});

e.prova('«cosa manca» dice anche cosa fare', () => {
  const s = conSchermata({ COLLEG: SALUTE });
  s.ctx.collegDisegna();
  const manca = html2(s, 'cl-manca');
  deve(/Groupama/.test(manca), 'il problema non compare fra quelli da sistemare');
  deve(/Aggiorna la password/.test(manca), 'dice qual e\' il problema ma non cosa farci');
});

e.prova('il conto in cima è quello vero, non una stima', () => {
  const s = conSchermata({ COLLEG: SALUTE });
  s.ctx.collegDisegna();
  const somma = html2(s, 'cl-somma');
  deve(/>1</.test(somma), 'non dice quante sono pronte');
  deve(/>2</.test(somma), 'non dice quante sono da collegare');
  deve(/>3</.test(somma), 'non dice quante compagnie ci sono');
});

// ── 3. «Collegata» lo dice il motore ────────────────────────────────────────
await e.provaAsync('non si scrive «collegata» perché la richiesta è partita', async () => {
  const s = conSchermata({
    COLLEG: SALUTE,
    risposte: {
      '/fonti/groupama/accedi': { success: true },
      '/fonti/groupama/accesso': { success: true, stato: 'fallito', messaggio: 'Il portale ha rifiutato utente e password.' },
    },
    seguiRicorsivo: false,
  });
  await s.ctx.collegAccedi('groupama');
  await new Promise(r => setTimeout(r, 30));
  const lavoro = s.ctx.COLLEG_LAVORO.groupama || {};
  deve(lavoro.stato !== 'completo', 'ha dato l\'accesso per riuscito: lo stato e\' «' + lavoro.stato + '»');
  deve(/rifiutato/i.test(String(lavoro.messaggio || '')), 'non riporta quello che ha detto il motore: ' + lavoro.messaggio);
});

await e.provaAsync('quando il motore dice «completo», allora sì', async () => {
  const s = conSchermata({
    COLLEG: SALUTE,
    risposte: {
      '/fonti/groupama/accedi': { success: true },
      '/fonti/groupama/accesso': { success: true, stato: 'completo', messaggio: 'Accesso eseguito.' },
      '/fonti/salute?forza=1': SALUTE,
    },
  });
  await s.ctx.collegAccedi('groupama');
  await new Promise(r => setTimeout(r, 30));
  deve((s.ctx.COLLEG_LAVORO.groupama || {}).stato === 'completo', 'non riconosce l\'accesso riuscito');
});

e.prova('l\'accesso si avvia e non aspetta chi legge l\'SMS', () => {
  /* Il motore risponde subito e si guarda come va: tenere una richiesta HTTP
     aperta finché qualcuno legge un codice vuol dire una schermata ferma che
     non dice niente, e poi una connessione chiusa dal browser. */
  const c = ritaglia(html, 'collegAccedi');
  deve(c && /collegSegui/.test(c), 'non segue lo stato dopo aver avviato');
  const seg = ritaglia(html, 'collegSegui');
  deve(seg && /serve_codice/.test(seg), 'non riconosce il momento in cui serve il codice');
});

e.prova('i cinque stati sono quelli del contratto, non altri', () => {
  /* Gli scraper ne producono una decina e cambiano da compagnia a compagnia.
     Il motore li traduce in cinque; se IAM ne leggesse altri, ogni compagnia
     nuova diventerebbe una modifica qui dentro. */
  const seg = ritaglia(html, 'collegSegui');
  for (const stato of ['in_corso', 'pronto', 'serve_codice', 'completo']) {
    deve(seg.includes(stato), 'lo stato «' + stato + '» non viene riconosciuto');
  }
  for (const inventato of ['attesa_otp', 'non_loggato', 'login_running']) {
    deve(!seg.includes(inventato),
      'legge «' + inventato + '», che e\' vocabolario degli scraper: quella traduzione la fa il motore');
  }
});

await e.provaAsync('se il codice non c\'è non si manda una richiesta vuota', async () => {
  const s = conSchermata({ COLLEG: SALUTE, COLLEG_LAVORO: {} });
  s.browser.elemento('cl-cod-groupama').value = '   ';
  await s.ctx.collegCodice('groupama');
  deve(!s.chiamate.some(c => /\/codice$/.test(c.percorso)), 'ha mandato un codice vuoto al portale');
  deve(/Manca il codice/.test((s.ctx.COLLEG_LAVORO.groupama || {}).messaggio || ''), 'non dice che manca il codice');
});

// ── 4. Il freno, e i segreti ────────────────────────────────────────────────
e.prova('da qui il freno non si scavalca', () => {
  /* Dopo tre accessi falliti lo scraper smette di bussare. Forzarlo da una
     schermata trasformerebbe un login sbagliato in un martellamento che fa
     bloccare l'utenza dell'agenzia dalla compagnia. */
  const sezione = html.slice(html.indexOf('id="panel-collegamenti"'), html.indexOf('id="panel-collegamenti"') + 4000);
  deve(/freno/i.test(sezione), 'la schermata non nomina nemmeno il freno');
  for (const f of ['collegAccedi', 'collegCodice', 'collegCarica']) {
    const c = ritaglia(html, f) || '';
    deve(!/sblocca|forza_freno|reset.?freno/i.test(c), f + ' prova a togliere il freno');
  }
});

e.prova('le password non passano da questa schermata', () => {
  for (const f of ['collegCarica', 'collegDisegna', 'collegAccedi', 'collegCodice']) {
    const c = (ritaglia(html, f) || '').replace(/\/\*[\s\S]*?\*\//g, '');
    deve(!/password/i.test(c), f + ' tocca le password: qui si guarda soltanto');
  }
});

e.prova('aggiornare salta la cache del motore', () => {
  /* Senza forza=1, dopo aver sistemato una credenziale si rilegge la risposta
     vecchia e sembra che non sia cambiato niente. */
  const c = ritaglia(html, 'collegCarica');
  deve(/forza=1/.test(c), 'il pulsante Aggiorna rilegge la risposta vecchia');
});

// ── 5. Non è un doppione delle Fonti, ed è raggiungibile ────────────────────
e.prova('è una schermata sua, accanto alle Fonti e non al posto loro', () => {
  deve(/id="panel-collegamenti"/.test(html), 'manca il pannello');
  deve(/id="panel-fonti"/.test(html), 'ha sostituito il pannello delle Fonti invece di affiancarlo');
  deve(/vai\('collegamenti'\)/.test(scocca), 'il menu non la apre');
  deve(/vai\('fonti'\)/.test(scocca), 'la voce delle Fonti e\' sparita dal menu');
});

e.prova('ha un titolo suo, altrimenti la barra direbbe «IAM > IAM»', () => {
  /* Ci sono due mappe: TITOLI (le schede di IAM) e TITOLI_QUOTO (le pagine del
     preventivatore). La seconda si legge SOLO a preventivatore aperto:
     metterlo lì non dà nessun errore, dà una barra che dice «IAM > IAM». */
  const i = scocca.indexOf('var TITOLI = {');
  deve(i > 0, 'manca la mappa TITOLI');
  const mappa = scocca.slice(i, scocca.indexOf('};', i));
  deve(/collegamenti\s*:/.test(mappa), 'la scheda non ha un titolo fra quelli di IAM');
});

e.prova('aprendola si rilegge lo stato, non si mostra quello di mezz\'ora fa', () => {
  const c = ritaglia(html, 'goTab');
  deve(c && /collegamenti'\)\s*\{\s*collegCarica\(true\)/.test(c.replace(/\s+/g, ' ').replace(/ \{ /g, '{ ')) ||
       /t === 'collegamenti'/.test(c),
    'aprendo la scheda non si ricarica niente');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
