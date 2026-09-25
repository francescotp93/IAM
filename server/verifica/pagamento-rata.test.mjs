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

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Pagamento rata: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
