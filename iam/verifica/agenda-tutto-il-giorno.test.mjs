// ═══════════════════════════════════════════════════════════════════════════════
//  AGENDA — L'ATTIVITA' DI TUTTA LA GIORNATA
//
//  «Senza orario» non vuol dire «alle nove». Sembra una sfumatura e non lo e':
//  un'attivita' di tutta la giornata esportata sul telefono come appuntamento
//  delle 9:00 occupa una fascia che nessuno ha fissato, e in un'agenda piena
//  quella fascia finta fa spostare cose vere.
//
//  In tre punti il codice scriveva `a.ora || '09:00'`. Con quelle righe in
//  mezzo, la casella «tutto il giorno» sarebbe stata un interruttore staccato:
//  si spunta, e nell'archivio arrivano lo stesso le nove. Le prove qui sotto
//  guardano il confine vero — quello che arriva all'ARCHIVIO e quello che
//  arriva al CALENDARIO — non la casella.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, stanza, esiti, deve } from './banco.mjs';

const src = sorgenteAttuale();
const NOMI = [
  'agendaLocale', 'agendaLocaleSet', 'agendaLocaleAdd', 'agendaLocaleDel', 'agendaInSospeso',
  'renderAgenda', 'renderAgendaSePresente', 'saveAgenda', 'agendaImportaLocali',
  'loadAgendaDB', 'saveAgendaDB', 'loadPipe', 'saveAg',
  'agOra', 'agQuando', 'agGiornata', 'agGiornoDopo', 'openGCal',
];
const e = esiti('AGENDA — tutto il giorno');

/* Alla fine saveAgenda chiede «aggiungere al calendario?». Qui si risponde di
   no: queste prove guardano cosa arriva all'ARCHIVIO, e il calendario ha le
   sue, piu' sotto. (Rispondendo di si' partirebbe openGCal, che nella stanza
   vorrebbe Blob e document.createElement — rumore, non contenuto.) */
const SENZA_CALENDARIO = { rispostaConfirm: false };

function compila(s, { titolo, data, ora, note, giornata }) {
  s.browser.elemento('ag-titolo').value = titolo;
  s.browser.elemento('ag-data').value = data;
  s.browser.elemento('ag-ora').value = ora === undefined ? '09:00' : ora;
  s.browser.elemento('ag-note').value = note || '';
  s.browser.elemento('ag-giornata').checked = !!giornata;
}
const scritte = s => s.archivio.stato.upsert.filter(u => u.tabella === 'iam_agenda');

// ─── 1. Quello che arriva all'archivio ──────────────────────────────────────
await e.provaAsync('spuntando «tutto il giorno» nell\'archivio arriva NIENTE orario, non le nove', async () => {
  const s = stanza(src, NOMI, SENZA_CALENDARIO);
  compila(s, { titolo: 'Consegna documenti', data: '2026-09-20', giornata: true });
  await s.ctx.saveAgenda();
  const u = scritte(s);
  deve(u.length === 1, 'l\'archivio non ha ricevuto niente');
  deve(u[0].riga.ora === null, 'e\' arrivato un orario che nessuno ha messo: ' + JSON.stringify(u[0].riga.ora));
  return 'ora = null';
});

await e.provaAsync('senza spunta l\'orario scritto arriva com\'e\'', async () => {
  const s = stanza(src, NOMI, SENZA_CALENDARIO);
  compila(s, { titolo: 'Chiamata Rossi', data: '2026-09-20', ora: '15:30' });
  await s.ctx.saveAgenda();
  deve(scritte(s)[0].riga.ora === '15:30', 'orario cambiato per strada: ' + scritte(s)[0].riga.ora);
});

await e.provaAsync('il campo ora svuotato a mano vale come tutto il giorno', async () => {
  /* Chi cancella l'orario dal campo sta dicendo la stessa cosa di chi spunta
     la casella: non ho un'ora. Rimetterci le nove sarebbe rispondergli di no. */
  const s = stanza(src, NOMI, SENZA_CALENDARIO);
  compila(s, { titolo: 'Pratica', data: '2026-09-20', ora: '   ' });
  await s.ctx.saveAgenda();
  deve(scritte(s)[0].riga.ora === null, 'orario reinventato: ' + JSON.stringify(scritte(s)[0].riga.ora));
});

await e.provaAsync('anche il recupero dalla coda locale non schiaccia sulle nove', async () => {
  /* Il terzo punto che scriveva `|| '09:00'`. Un'attivita' salvata senza rete
     e portata dentro dopo perderebbe il «tutto il giorno» proprio nel momento
     in cui finalmente viene messa al sicuro. */
  const s = stanza(src, NOMI, { memoria: { iam_agenda: [
    { id: '77', titolo: 'Inventario', data: '2026-09-21', ora: null, note: '' }
  ] } });
  await s.ctx.loadAgendaDB();
  await s.ctx.agendaImportaLocali();
  const u = scritte(s);
  deve(u.length === 1, 'niente e\' stato portato nell\'archivio');
  deve(u[0].riga.ora === null, 'recuperandola e\' diventata delle nove: ' + JSON.stringify(u[0].riga.ora));
});

// ─── 2. Quello che si legge sullo schermo ───────────────────────────────────
e.prova('sulla riga c\'e\' scritto «tutto il giorno», non solo la data', () => {
  /* Una riga con la sola data lascerebbe credere a un orario dimenticato. */
  const s = stanza(src, NOMI);
  deve(s.ctx.agQuando({ data: '2026-09-20', ora: null }) === '2026-09-20 · tutto il giorno',
    s.ctx.agQuando({ data: '2026-09-20', ora: null }));
  deve(s.ctx.agQuando({ data: '2026-09-20', ora: '15:30' }) === '2026-09-20 · 15:30',
    s.ctx.agQuando({ data: '2026-09-20', ora: '15:30' }));
});

e.prova('dentro lo stesso giorno la senza-orario sta in cima, non in fondo', () => {
  /* Non ha un'ora che la collochi fra le altre: in fondo sembrerebbe l'ultima
     cosa della giornata, che e' un'informazione inventata.
     ATTENZIONE a «semplificare» il confronto in `x.ora || '99:99'`: e' la
     scrittura che viene naturale a chi ordina degli orari, e spedisce le
     attivita' di tutta la giornata in fondo. Provato: cosi' questa prova
     diventa rossa, ed e' il motivo per cui il confronto e' scritto in due
     pezzi invece che in uno. */
  const s = stanza(src, NOMI);
  s.ctx.AGENDA = [
    { id: '1', titolo: 'Pomeriggio', data: '2099-01-10', ora: '16:00' },
    { id: '2', titolo: 'Tutto il giorno', data: '2099-01-10', ora: null },
    { id: '3', titolo: 'Mattina', data: '2099-01-10', ora: '09:30' },
  ];
  s.ctx.renderAgenda();
  const html = s.browser.elemento('ag-list').innerHTML;
  const p = ['Tutto il giorno', 'Mattina', 'Pomeriggio'].map(t => html.indexOf(t));
  deve(p.every(i => i >= 0), 'una delle tre righe non e\' stata disegnata');
  deve(p[0] < p[1] && p[1] < p[2], 'ordine sbagliato dentro la giornata');
  return 'senza orario, 09:30, 16:00';
});

// ─── 3. Quello che arriva al calendario ─────────────────────────────────────
function conCalendario(s) {
  s.ctx.localStorage.setItem('iam_cal', 'google');
  return u => { s.ctx.openGCal('Titolo', u.data, u.ora, 'nota'); return s.browser.finestre.pop().location.href; };
}

e.prova('senza orario il calendario riceve un evento di TUTTA LA GIORNATA', () => {
  /* Il difetto vero, quello che si vede sul telefono: `ora || '09:00'` faceva
     comparire un appuntamento 9:00-10:00 che nessuno aveva fissato. */
  const s = stanza(src, NOMI);
  const apri = conCalendario(s);
  const url = apri({ data: '2026-09-14', ora: null });
  const d = /dates=([^&]+)/.exec(url);
  deve(d, 'nessuna data nell\'indirizzo del calendario');
  deve(!/T\d{6}/.test(d[1]), 'e\' uscito un evento a ora fissa: ' + d[1]);
  /* La fine e' ESCLUSA: un evento del 14 va dichiarato 14 -> 15, altrimenti
     sul telefono non si vede per niente. */
  deve(d[1] === '20260914/20260915', 'intervallo sbagliato: ' + d[1]);
  return d[1];
});

e.prova('con l\'orario resta un appuntamento a ora fissa', () => {
  const s = stanza(src, NOMI);
  const apri = conCalendario(s);
  const d = /dates=([^&]+)/.exec(apri({ data: '2026-09-14', ora: '15:30' }));
  deve(d[1] === '20260914T153000/20260914T163000', 'intervallo sbagliato: ' + d[1]);
});

e.prova('il giorno dopo si calcola in UTC, anche a cavallo di mese e di ora legale', () => {
  /* Farlo sull'ora locale sposta il giorno di uno a seconda di che ore sono. */
  const s = stanza(src, NOMI);
  deve(s.ctx.agGiornoDopo('2026-09-30') === '20261001', 'fine mese: ' + s.ctx.agGiornoDopo('2026-09-30'));
  deve(s.ctx.agGiornoDopo('2026-12-31') === '20270101', 'fine anno: ' + s.ctx.agGiornoDopo('2026-12-31'));
  deve(s.ctx.agGiornoDopo('2026-10-25') === '20261026', 'ora legale: ' + s.ctx.agGiornoDopo('2026-10-25'));
  deve(s.ctx.agGiornoDopo('2028-02-28') === '20280229', 'bisestile: ' + s.ctx.agGiornoDopo('2028-02-28'));
});

// ─── 4. Il file .ics, per chi non usa Google ────────────────────────────────
e.prova('nel file .ics l\'evento di tutta la giornata e\' dichiarato a DATA', () => {
  /* Senza VALUE=DATE resta un appuntamento, e il telefono lo mette a un'ora. */
  const catturato = { ics: '' };
  const s = stanza(src, NOMI, { altro: {
    Blob: function (parti) { catturato.ics = String(parti[0]); },
    URL: { createObjectURL: () => 'blob:finto', revokeObjectURL() {} },
    setTimeout: () => 0,
    document: { getElementById: () => null,
      createElement: () => ({ click() {}, style: {}, set href(v) {}, set download(v) {} }),
      body: { appendChild() {}, removeChild() {} } },
  } });
  s.ctx.localStorage.setItem('iam_cal', 'ical');
  s.ctx.openGCal('Inventario', '2026-09-14', null, '');
  deve(/DTSTART;VALUE=DATE:20260914/.test(catturato.ics), 'DTSTART sbagliato: ' + catturato.ics.slice(0, 120));
  deve(/DTEND;VALUE=DATE:20260915/.test(catturato.ics), 'DTEND sbagliato: ' + catturato.ics.slice(0, 120));
  catturato.ics = '';
  s.ctx.openGCal('Chiamata', '2026-09-14', '15:30', '');
  deve(/DTSTART:20260914T153000/.test(catturato.ics), 'con l\'ora non deve diventare a data: ' + catturato.ics.slice(0, 120));
  return 'DATE quando serve, DATETIME quando serve';
});

// ─── 5. La trappola trovata strada facendo ──────────────────────────────────
e.prova('di openGCal ce n\'e\' una sola', () => {
  /* Ce n'erano DUE, e vinceva sempre la seconda: la prima non l'ha mai
     eseguita nessuno (CLAUDE.md §1). Con due in giro, il prossimo corregge
     quella sbagliata e non capisce perche' non cambia niente. */
  const quante = (src.match(/^function openGCal\(/gm) || []).length;
  deve(quante === 1, 'openGCal e\' dichiarata ' + quante + ' volte');
});

e.prova('la casella «tutto il giorno» c\'e\' nel modulo ed e\' collegata', () => {
  /* Una funzione provatissima che nessuno chiama non serve a niente. */
  deve(/id="ag-giornata"/.test(src), 'la casella non c\'e\' nel modulo');
  deve(/onchange="agGiornata\(\)"/.test(src), 'la casella non e\' collegata a niente');
  deve(/ag-giornata/.test(src.slice(src.indexOf('async function saveAgenda'), src.indexOf('async function delAgenda'))),
    'il salvataggio non guarda la casella');
});

e.prova('l\'interruttore e\' quello di casa, non una casella che si vede vuota da spuntata', () => {
  /* IL DATO ERA GIUSTO E LO SCHERMO DICEVA IL CONTRARIO.
     Dentro .fld il CSS toglie l'aspetto nativo agli input
     (-webkit-appearance:none): una <input type=checkbox> messa li' si vedeva
     come un cerchietto VUOTO anche da spuntata. Chi compila avrebbe creduto
     di non averla accesa, e avrebbe salvato il contrario di quello che
     voleva. Nessuna prova sul dato se ne sarebbe mai accorta: si vede solo
     aprendo il modulo in un browser.
     Qui si sorveglia la forma, perche' e' li' che stava il guasto. */
  const i = src.indexOf('id="modal-agenda"');
  const modulo = src.slice(i, src.indexOf('<!-- MODAL', i + 10));
  deve(/class="sw-row"/.test(modulo), 'l\'interruttore non usa la riga di casa (.sw-row)');
  const riga = modulo.slice(modulo.indexOf('class="sw-row"'));
  deve(/<label class="sw"><input type="checkbox" id="ag-giornata"/.test(riga),
    'la casella non e\' dentro l\'interruttore di casa: si vedrebbe vuota da spuntata');
  deve(/sw-track/.test(riga) && /sw-thumb/.test(riga), 'mancano le parti che fanno vedere lo stato acceso');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
