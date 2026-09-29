// ═══════════════════════════════════════════════════════════════════════════════
//  LO STATO DI PAGAMENTO DI UNA RATA
//
//  Questo motore decide se una rata ha portato soldi in agenzia. Sbagliarlo
//  non dà errore: dà un portafoglio che sembra incassato e non lo è, o un
//  elenco di sospesi da rincorrere che non esistono.
//
//  Le cose che devono restare vere:
//
//    1. IL MOVIMENTO BATTE LA PAROLA. «Incassato» si scrive quando c'è
//       l'incasso in contabilità della compagnia, non quando la compagnia
//       scrive «incassato» su un'etichetta. Sul file HDI del 22/09/2026 le due
//       cose coincidevano, quindi il difetto non si vedeva: è esattamente il
//       modo in cui un difetto arriva in produzione.
//
//    2. LA MANO DI FRANCESCO VINCE SEMPRE. Se corregge una rata e il mese dopo
//       il flusso la riporta indietro, la correzione non è servita a niente e
//       nessuno se ne accorge. Il flusso può riempire un buco, mai smentire
//       una persona.
//
//    3. MA IL DISACCORDO SI DICE. «Non tocco» non vuol dire «non guardo»: se
//       il flusso dice una cosa diversa da quella scritta a mano, l'esito lo
//       riporta, così si può guardare.
//
//    4. «PAGATO SENZA INCASSO» NON È NÉ CARNE NÉ PESCE, E SI DICHIARA. Non
//       incassato (i soldi non si sono visti), non sospeso (non è un credito
//       dell'agenzia): resta da incassare, con la riga marcata.
//
//    5. LA POLIZZA SEGUE LE SUE RATE, e un solo sospeso basta a renderla
//       sospesa. È il caso da guardare: nasconderlo dietro una maggioranza
//       sarebbe il modo più facile di perderlo.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../../tariffe/motore/pagamento-rata.js');

const esiti = [];
function prova(nome, fn) {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* ── 1. il movimento batte la parola ─────────────────────────────────────── */

prova('con l\'incasso in contabilità, la rata è incassata', () => {
  deve(P.dalFlusso({ incassoContabile: '2026-09-22' }) === 'incassato', P.dalFlusso({ incassoContabile: '2026-09-22' }));
});

prova('senza incasso non si scrive «incassato», per quanto la compagnia lo dica', () => {
  /* Il difetto vero che questo motore chiude: l'HDI guardava la parola. */
  deve(P.dalFlusso({ dichiaratoPagato: true }) !== 'incassato',
    'la sola parola «pagato» ha prodotto un incasso');
});

prova('lo stato «SP» della compagnia diventa un sospeso', () => {
  deve(P.dalFlusso({ dichiaratoSospeso: true }) === 'sospeso', P.dalFlusso({ dichiaratoSospeso: true }));
});

prova('se non dice niente, resta da incassare: non si inventa', () => {
  deve(P.dalFlusso({}) === 'da_incassare', P.dalFlusso({}));
  deve(P.dalFlusso(null) === 'da_incassare', 'senza prove affatto');
});

prova('l\'incasso vince anche sul sospeso dichiarato', () => {
  /* Se i soldi sono arrivati, non è più un credito. */
  deve(P.dalFlusso({ incassoContabile: '2026-09-22', dichiaratoSospeso: true }) === 'incassato',
    'un sospeso dichiarato ha coperto un incasso vero');
});

prova('una data che non è una data non vale come incasso', () => {
  deve(P.dalFlusso({ incassoContabile: 'sì' }) === 'da_incassare', 'testo qualunque preso per una data');
  deve(P.dalFlusso({ incassoContabile: '' }) === 'da_incassare', 'stringa vuota presa per una data');
  deve(P.dalFlusso({ incassoContabile: '22/09/2026' }) === 'da_incassare', 'formato italiano preso per iso');
});

/* ── 2 e 3. la mano vince, ma il disaccordo si dice ──────────────────────── */

prova('la rata messa a mano non viene smentita dal flusso', () => {
  const r = P.decide({ incassoContabile: '2026-09-22' },
    { pagamento: 'sospeso', pagamento_a_mano: '2026-09-24T10:00:00Z' });
  deve(r.pagamento === 'sospeso', 'il flusso ha sovrascritto una correzione a mano: ' + r.pagamento);
  deve(r.cambia === false, 'l\'esito chiede di scrivere su una riga messa a mano');
  deve(r.fonte === 'mano', r.fonte);
});

prova('e il disaccordo viene riportato, non nascosto', () => {
  const r = P.decide({ incassoContabile: '2026-09-22' },
    { pagamento: 'sospeso', pagamento_a_mano: '2026-09-24T10:00:00Z' });
  deve(r.discorda === 'incassato', 'il disaccordo col flusso non è stato riportato: ' + r.discorda);
});

prova('quando invece vanno d\'accordo, non si segnala niente', () => {
  const r = P.decide({ incassoContabile: '2026-09-22' },
    { pagamento: 'incassato', pagamento_a_mano: '2026-09-24T10:00:00Z' });
  deve(!r.discorda, 'segnalato un disaccordo che non c\'è: ' + r.discorda);
  deve(r.cambia === false, 'una riga a mano non si riscrive nemmeno per confermarla');
});

/* ── il buco che si chiude ───────────────────────────────────────────────── */

prova('una rata NON toccata a mano si aggiorna quando la compagnia incassa', () => {
  /* Fino al 25/09/2026 l'importazione, su una rata già in archivio, non
     faceva niente («on conflict do nothing»): il portafoglio restava indietro
     per sempre. */
  const r = P.decide({ incassoContabile: '2026-10-05' }, { pagamento: 'da_incassare', pagamento_a_mano: null });
  deve(r.pagamento === 'incassato' && r.cambia === true,
    'la rata non è stata aggiornata: ' + r.pagamento + ' / cambia=' + r.cambia);
});

prova('ma se il flusso conferma quello che c\'era, non si riscrive', () => {
  const r = P.decide({ incassoContabile: '2026-10-05' }, { pagamento: 'incassato', pagamento_a_mano: null });
  deve(r.cambia === false, 'riscrittura inutile di una riga già giusta');
});

prova('una rata nuova la decide il flusso', () => {
  const r = P.decide({ dichiaratoSospeso: true }, null);
  deve(r.pagamento === 'sospeso' && r.cambia === true, r.pagamento + ' / ' + r.cambia);
  deve(r.fonte === 'flusso', r.fonte);
});

/* ── 4. pagato senza incasso ─────────────────────────────────────────────── */

prova('«pagato senza incasso» resta da incassare, e viene marcato', () => {
  deve(P.dalFlusso({ dichiaratoPagato: true }) === 'da_incassare', 'finito in uno stato che afferma qualcosa');
  deve(P.dichiaratoSenzaIncasso({ dichiaratoPagato: true }) === true, 'non è stato marcato');
  const r = P.decide({ dichiaratoPagato: true }, null);
  deve(r.dichiaratoSenzaIncasso === true, 'il marchio non arriva a chi legge l\'esito');
});

prova('e non si marca quando l\'incasso c\'è davvero', () => {
  deve(P.dichiaratoSenzaIncasso({ dichiaratoPagato: true, incassoContabile: '2026-09-22' }) === false,
    'marcata una rata che ha il suo incasso');
  deve(P.dichiaratoSenzaIncasso({ dichiaratoSospeso: true, dichiaratoPagato: true }) === false,
    'marcato un sospeso, che è già uno stato suo');
  deve(P.dichiaratoSenzaIncasso({}) === false, 'marcata una rata di cui la compagnia non dice niente');
});

/* ── la colonna `stato` del database ─────────────────────────────────────── */

prova('un sospeso, per la colonna `stato`, è una rata aperta', () => {
  /* Il vincolo del database ammette aperto/incassato/insoluto/stornato/
     annullato: «sospeso» non c'è, e non lo si allarga. Scrivere un valore che
     il vincolo rifiuta fa fallire tutta l'importazione. */
  const AMMESSI = ['aperto', 'incassato', 'insoluto', 'stornato', 'annullato'];
  for (const p of ['incassato', 'sospeso', 'da_incassare']) {
    deve(AMMESSI.indexOf(P.versoStato(p)) >= 0, p + ' produce «' + P.versoStato(p) + '», che il database rifiuta');
  }
  deve(P.versoStato('sospeso') === 'aperto', 'un sospeso è diventato ' + P.versoStato('sospeso'));
  deve(P.versoStato('incassato') === 'incassato', 'un incasso è diventato ' + P.versoStato('incassato'));
});

/* ── 5. la polizza segue le sue rate ─────────────────────────────────────── */

prova('un solo sospeso rende sospesa tutta la polizza', () => {
  deve(P.statoPolizza(['incassato', 'incassato', 'sospeso']) === 'sospeso',
    'il sospeso è stato coperto dalla maggioranza: ' + P.statoPolizza(['incassato', 'incassato', 'sospeso']));
});

prova('con almeno un incasso e nessun sospeso, la polizza è pagata', () => {
  deve(P.statoPolizza(['da_incassare', 'incassato']) === 'pagato', P.statoPolizza(['da_incassare', 'incassato']));
});

prova('senza niente, non pagata — e senza rate nemmeno si inventa', () => {
  deve(P.statoPolizza(['da_incassare', 'da_incassare']) === 'non_pagato', 'rate tutte da incassare');
  deve(P.statoPolizza([]) === 'non_pagato', 'nessuna rata');
  deve(P.statoPolizza(null) === 'non_pagato', 'elenco assente');
});

prova('il vocabolario è quello che `quote_polizze` usa già', () => {
  /* Un valore fuori vocabolario finisce nella colonna e non lo vede nessuno,
     finché una schermata non smette di riconoscerlo. */
  const AMMESSI = ['non_pagato', 'pagato', 'sospeso', 'annullata'];
  const casi = [[], ['incassato'], ['sospeso'], ['da_incassare'], ['incassato', 'sospeso']];
  for (const c of casi) {
    deve(AMMESSI.indexOf(P.statoPolizza(c)) >= 0, '[' + c.join(',') + '] produce «' + P.statoPolizza(c) + '»');
  }
});

/* ══ 6. LA REGOLA DI CASA, COMPAGNIA PER COMPAGNIA (28/09/2026) ═════════════
   «I flussi che carico da Prima me li devi dare in automatico incassati e non
    come sospesi. Quelli che carico da HDI, come pos, bonifici, carta HDI
    (questa modalità è finanziamento Agos), me li devi dare come sospesi e poi
    sarò io ad abbinarli una volta incassati. Quello che è contanti me lo devi
    aggiungere nella cassa contanti in automatico.»          — Francesco      */

prova('HDI: POS, bonifico e carta Agos restano SOSPESI anche con l\'incasso', () => {
  /* L'incasso del flusso dice che ha pagato il CLIENTE, non che la compagnia
     abbia avuto i suoi soldi. Confondere le due cose è il modo in cui
     un'agenzia si crede pari e non lo è. */
  for (const m of ['pos', 'bonifico', 'finanziamento']) {
    const r = P.dalFlusso({ fonte: 'hdi', mezzo: m, incassoContabile: '2026-09-23', dichiaratoPagato: true });
    deve(r === 'sospeso', 'HDI · ' + m + ' → ' + r);
  }
});

prova('ma la stessa regola NON vale per Prima', () => {
  /* In archivio ci sono 36 incassi Prima per bonifico: se la regola dei
     sospesi si applicasse al mezzo invece che alla compagnia, quei 36
     diventerebbero crediti dell'agenzia verso clienti che hanno già pagato
     Prima — cioè telefonate per andare a prendere soldi che non ci sono. */
  for (const m of ['pos', 'bonifico', 'finanziamento']) {
    const r = P.dalFlusso({ fonte: 'ssf', mezzo: m, incassoContabile: '2026-09-23' });
    deve(r === 'incassato', 'Prima · ' + m + ' → ' + r + ': la regola di HDI si è presa anche Prima');
  }
});

prova('HDI: il contante invece è già in casa, e va in cassa contanti', () => {
  const r = P.decide({ fonte: 'hdi', mezzo: 'contante', incassoContabile: '2026-09-23' }, null);
  deve(r.pagamento === 'incassato', 'il contante risulta ' + r.pagamento);
  deve(r.inCassaContanti === true, 'il contante non entra in cassa contanti');
});

prova('e un mezzo che Francesco non ha nominato resta come lo dice il flusso', () => {
  /* Assegno e domiciliazione non sono nella sua lista. Estendere una regola a
     mezzi di cui nessuno ha parlato vuol dire decidere al posto suo. */
  for (const m of ['assegno', 'domiciliazione', 'carta_credito']) {
    const r = P.dalFlusso({ fonte: 'hdi', mezzo: m, incassoContabile: '2026-09-23' });
    deve(r === 'incassato', 'HDI · ' + m + ' → ' + r + ': la regola si è allargata da sola');
  }
});

prova('la cassa contanti la decide il MEZZO, non il flusso da cui arriva', () => {
  deve(P.inCassaContanti({ fonte: 'ssf', mezzo: 'contante', incassoContabile: '2026-09-23' }) === true,
    'un contante di Prima non entra in cassa');
  deve(P.inCassaContanti({ fonte: 'hdi', mezzo: 'pos', incassoContabile: '2026-09-23' }) === false,
    'il POS finisce in cassa contanti');
});

prova('ma un contante non ancora pagato non è denaro che c\'è', () => {
  /* Una rata futura in contanti è denaro che arriverà, non denaro in cassa.
     Metterlo nel fondo cassa vuol dire contare soldi che nessuno ha portato. */
  deve(P.inCassaContanti({ fonte: 'hdi', mezzo: 'contante' }) === false,
    'un contante senza nessuna prova di pagamento entra in cassa');
});

prova('Prima: la copertura dichiarata vale come prova dell\'incasso', () => {
  /* Prima incassa e poi copre: se dichiara la polizza coperta OLTRE la
     decorrenza di una rata, quella rata l'ha incassata lei — anche quando non
     manda la data di pagamento. */
  const r = P.dalFlusso({ fonte: 'ssf', copertaFinoAl: '2027-03-16', decorrenza: '2026-09-16' });
  deve(r === 'incassato', 'una rata coperta dalla compagnia risulta ' + r);
});

prova('e il confronto è STRETTO: la rata che prolunga la copertura non è pagata', () => {
  /* «Coperta fino al 16/03/2027» vuol dire che la copertura finisce quel
     giorno. La rata che decorre dal 16/03/2027 è quella che la prolunga, e non
     è pagata. Con `>=` al posto di `>` sarebbe risultata incassata — e in
     archivio le polizze semestrali sono 1.034. */
  const r = P.dalFlusso({ fonte: 'ssf', copertaFinoAl: '2027-03-16', decorrenza: '2027-03-16' });
  deve(r === 'da_incassare', 'la rata che prolunga la copertura risulta ' + r);
  deve(P.copertaAllaData({ copertaFinoAl: '2027-03-16', decorrenza: '2027-03-16' }) === false,
    'il confronto non è stretto');
});

prova('senza una delle due date non si suppone niente', () => {
  deve(P.copertaAllaData({ copertaFinoAl: '2027-03-16' }) === false, 'senza decorrenza');
  deve(P.copertaAllaData({ decorrenza: '2026-09-16' }) === false, 'senza copertura');
  deve(P.copertaAllaData({}) === false, 'senza niente');
});

prova('e la copertura vale SOLO per Prima', () => {
  /* Con HDI i soldi passano dall'agenzia: la copertura della compagnia non
     dice niente su chi ha in mano il denaro. */
  const r = P.dalFlusso({ fonte: 'hdi', mezzo: 'assegno', copertaFinoAl: '2027-03-16', decorrenza: '2026-09-16' });
  deve(r === 'da_incassare', 'su HDI la copertura decide il pagamento: ' + r);
});

prova('Prima non ha sospesi: un SP del tracciato resta da incassare', () => {
  /* Un sospeso è un credito dell'agenzia verso qualcuno. Con Prima il cliente
     paga la compagnia e l'agenzia non tocca quel denaro: quel credito non
     esiste, e metterlo nell'elenco dei sospesi lo gonfia di roba che nessuno
     deve andare a prendere. */
  deve(P.dalFlusso({ fonte: 'ssf', dichiaratoSospeso: true }) === 'da_incassare',
    'un SP di Prima → ' + P.dalFlusso({ fonte: 'ssf', dichiaratoSospeso: true }));
  deve(P.dalFlusso({ fonte: 'hdi', dichiaratoSospeso: true }) === 'sospeso',
    'e su HDI un SP deve restare un sospeso');
  /* Senza sapere da quale flusso arriva, il sospeso resta un sospeso: è il
     verso prudente. */
  deve(P.dalFlusso({ dichiaratoSospeso: true }) === 'sospeso', 'senza fonte');
});

prova('la regola di casa non tocca la mano di Francesco', () => {
  /* La regola più vecchia di tutte, e quella che non si negozia: se l'ha messa
     a mano, il flusso non la scrive — nemmeno la regola nuova. */
  const r = P.decide({ fonte: 'hdi', mezzo: 'pos', incassoContabile: '2026-09-23' },
    { pagamento: 'incassato', pagamento_a_mano: '2026-09-24' });
  deve(r.pagamento === 'incassato' && r.cambia === false, JSON.stringify(r));
  deve(r.discorda === 'sospeso', 'il disaccordo non viene riportato: ' + r.discorda);
});

prova('i tre vocabolari dei mezzi dicono le stesse cose', () => {
  /* Il gestionale ne tiene tre: quello del flusso (la tendina con cui si
     corregge), quello della contabilità (i conti) e quello del foglio cassa
     (le etichette). Se uno conosce «finanziamento» e gli altri no, una rata
     pagata con la carta HDI compare con la chiave nuda in una schermata e col
     nome giusto in un'altra — ed è la malattia dei due vocabolari che questo
     codice si porta dietro da sempre. */
  const F = require('../../tariffe/motore/flusso-ssf.js');
  const C = require('../../tariffe/motore/contabilita.js');
  const FC = require('../../tariffe/motore/foglio-cassa.js');
  const a = F.MEZZI.map(m => m.id).sort();
  const b = C.MEZZI.map(m => m.k).sort();
  const c = Object.keys(FC.MEZZI).sort();
  deve(a.join() === b.join(), 'flusso ≠ contabilità:\n  ' + a.join(' ') + '\n  ' + b.join(' '));
  deve(a.join() === c.join(), 'flusso ≠ foglio cassa:\n  ' + a.join(' ') + '\n  ' + c.join(' '));
  deve(a.includes('finanziamento'), 'la carta HDI (finanziamento Agos) non è nel vocabolario');
});

prova('e i tre mezzi che HDI tiene in sospeso esistono davvero', () => {
  /* Una regola che nomina un mezzo che il vocabolario non ha non scatta mai, e
     non lo dice: resta scritta e inerte. */
  const F = require('../../tariffe/motore/flusso-ssf.js');
  const noti = F.MEZZI.map(m => m.id);
  const fantasmi = P.MEZZI_SOSPESO_HDI.filter(m => !noti.includes(m));
  deve(!fantasmi.length, 'mezzi che non esistono nel vocabolario: ' + fantasmi.join(', '));
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Pagamento rata: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
