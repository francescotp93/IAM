// ═══════════════════════════════════════════════════════════════════════════════
//  AGENDA — l'appuntamento deve restare dov'e' stato messo
//
//  IL DIFETTO CHE QUESTA PROVA SORVEGLIA.
//  L'agenda di IAM aveva due meta' che non si parlavano. Il salvataggio scriveva
//  nella memoria del browser; la lettura, a ogni login, prendeva dall'archivio.
//  Peggio: renderAgenda() ricaricava l'agenda dal browser ogni volta che la
//  scheda veniva aperta, coprendo i dati veri. Risultato per chi lavora:
//  l'appuntamento si salva, si vede, e il giorno dopo non c'e' piu'. Da un
//  altro computer non si e' mai visto. E un appuntamento cancellato tornava.
//
//  Le prove qui sotto girano due volte: sul codice di adesso (devono passare) e
//  sul codice di prima (devono fallire). La seconda e' la CONTROPROVA: senza,
//  una prova verde non dimostrerebbe che il difetto c'era davvero.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'agendaLocale', 'agendaLocaleSet', 'agendaLocaleAdd', 'agendaLocaleDel', 'agendaInSospeso',
  'renderAgenda', 'renderAgendaSePresente', 'saveAgenda', 'delAgenda', 'agendaImportaLocali',
  'loadAgendaDB', 'saveAgendaDB', 'loadPipe', 'saveAg',
  /* Le tre dell'attivita' di tutta la giornata: senza, il ritaglio carica un
     saveAgenda che chiama funzioni che nella stanza non esistono. */
  'agOra', 'agQuando', 'agGiornata',
];

// Compila il modulo "nuovo appuntamento" come lo compilerebbe una persona.
function compila(s, { titolo, data, ora, note }) {
  s.browser.elemento('ag-titolo').value = titolo;
  s.browser.elemento('ag-data').value = data;
  s.browser.elemento('ag-ora').value = ora;
  s.browser.elemento('ag-note').value = note || '';
}

async function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  await e.provaAsync("l'appuntamento salvato finisce nell'archivio, non solo nel browser", async () => {
    const s = stanza(sorgente, NOMI);
    compila(s, { titolo: 'Chiamata Mario Rossi', data: '2026-08-10', ora: '11:00', note: 'rinnovo RCA' });
    await s.ctx.saveAgenda();
    const scritte = s.archivio.stato.upsert.filter(u => u.tabella === 'iam_agenda');
    deve(scritte.length === 1, `l'archivio non ha ricevuto niente (upsert su iam_agenda: ${scritte.length})`);
    deve(scritte[0].riga.titolo === 'Chiamata Mario Rossi', 'la riga scritta non e quella compilata');
    deve(scritte[0].riga.utente_id === 'utente-1', "manca l'utente sulla riga: RLS la rifiuterebbe");
  });

  await e.provaAsync("l'appuntamento c'e' ancora al login successivo", async () => {
    const s = stanza(sorgente, NOMI);
    compila(s, { titolo: 'Perizia', data: '2026-08-12', ora: '09:30', note: '' });
    await s.ctx.saveAgenda();
    // nuovo accesso: la memoria in pagina riparte da zero e si ricarica dall'archivio
    s.ctx.AGENDA = [];
    await s.ctx.loadAgendaDB();
    deve(s.ctx.AGENDA.length === 1, `dopo il nuovo accesso l'agenda ha ${s.ctx.AGENDA.length} appuntamenti invece di 1`);
    deve(s.ctx.AGENDA[0].titolo === 'Perizia', "l'appuntamento ritrovato non e quello salvato");
  });

  await e.provaAsync("aprire l'agenda non ricopre i dati dell'archivio con quelli del browser", async () => {
    // caso reale: sul browser e rimasta una vecchia copia con UN appuntamento,
    // nell'archivio ce ne sono DUE. Aprire l'agenda non deve far sparire i due.
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_agenda: [{ id: '1', titolo: 'vecchio', data: '2026-08-01', ora: '09:00' }] },
      righeArchivio: [
        { id: '10', titolo: 'Rinnovo Bianchi', data: '2026-08-05', ora: '10:00', utente_id: 'utente-1' },
        { id: '11', titolo: 'Sopralluogo', data: '2026-08-07', ora: '15:00', utente_id: 'utente-1' },
      ],
    });
    await s.ctx.loadAgendaDB();
    s.ctx.renderAgenda();
    const daArchivio = s.ctx.AGENDA.filter(a => !a._locale);
    deve(daArchivio.length === 2, `dopo aver aperto l'agenda restano ${daArchivio.length} appuntamenti dell'archivio invece di 2`);
  });

  await e.provaAsync("l'appuntamento cancellato non torna", async () => {
    const s = stanza(sorgente, NOMI, {
      righeArchivio: [{ id: '10', titolo: 'Rinnovo Bianchi', data: '2026-08-05', ora: '10:00', utente_id: 'utente-1' }],
    });
    await s.ctx.loadAgendaDB();
    await s.ctx.delAgenda('10');
    const canc = s.archivio.stato.delete.filter(d => d.tabella === 'iam_agenda');
    deve(canc.length === 1, "la cancellazione non e arrivata all'archivio");
    s.ctx.AGENDA = [];
    await s.ctx.loadAgendaDB();
    deve(s.ctx.AGENDA.length === 0, "l'appuntamento cancellato e ricomparso al nuovo accesso");
  });

  await e.provaAsync("se l'archivio non risponde l'appuntamento non si perde e viene segnalato", async () => {
    const s = stanza(sorgente, NOMI);
    s.archivio.stato.erroreSuUpsert = true;
    compila(s, { titolo: 'Appuntamento offline', data: '2026-08-20', ora: '16:00', note: '' });
    await s.ctx.saveAgenda();
    deve(s.ctx.AGENDA.length === 1, "l'appuntamento e sparito dalla schermata");
    deve(s.ctx.agendaInSospeso().length === 1, 'non risulta segnalato come fermo sul browser');
    deve(s.browser.detto.alert.some(m => /solo su questo computer/i.test(m)), 'nessun avviso a chi lo ha inserito');
    deve(s.ctx.agendaLocale().length === 1, 'non e stato tenuto da parte per il recupero');
  });

  await e.provaAsync("il pulsante di recupero porta nell'archivio quello che era rimasto sul browser", async () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_agenda: [
        { id: '900', titolo: 'Vecchio appuntamento A', data: '2026-08-03', ora: '09:00', note: '' },
        { id: '901', titolo: 'Vecchio appuntamento B', data: '2026-08-04', ora: '10:00', note: '' },
      ] },
    });
    await s.ctx.loadAgendaDB();
    deve(s.ctx.agendaInSospeso().length === 2, `i fermi individuati sono ${s.ctx.agendaInSospeso().length} invece di 2`);
    await s.ctx.agendaImportaLocali();
    const scritte = s.archivio.stato.upsert.filter(u => u.tabella === 'iam_agenda');
    deve(scritte.length === 2, `portati nell'archivio ${scritte.length} invece di 2`);
    deve(s.ctx.agendaLocale().length === 0, 'la coda locale non e stata svuotata dopo il recupero');
    deve(s.ctx.agendaInSospeso().length === 0, 'restano segnalati come fermi anche dopo il recupero');
  });

  await e.provaAsync("dopo il recupero la coda locale non ripropone cio' che l'archivio ha gia'", async () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_agenda: [{ id: '10', titolo: 'Rinnovo Bianchi', data: '2026-08-05', ora: '10:00' }] },
      righeArchivio: [{ id: '10', titolo: 'Rinnovo Bianchi', data: '2026-08-05', ora: '10:00', utente_id: 'utente-1' }],
    });
    await s.ctx.loadAgendaDB();
    deve(s.ctx.AGENDA.length === 1, `appuntamento sdoppiato: ne risultano ${s.ctx.AGENDA.length}`);
    deve(s.ctx.agendaInSospeso().length === 0, "segnalato come fermo pur essendo gia' nell'archivio");
    deve(s.ctx.agendaLocale().length === 0, 'la copia locale ormai inutile non e stata tolta');
  });

  return e;
}

// ── 1. il codice di adesso ────────────────────────────────────────────────────
const adesso = await batteria(sorgenteAttuale(), 'AGENDA (codice di adesso)');
adesso.stampa();

// ── 2. la controprova sul codice di prima ─────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice
// difettoso anche dopo che sono arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = 'aa5be3f';
console.log('');
let contro = null;
try {
  contro = await batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'AGENDA (controprova sul codice di prima)');
  contro.stampa();
} catch (err) {
  console.log('CONTROPROVA non eseguibile: ' + err.message);
}

console.log('');
const problemi = [];
if (adesso.ko) problemi.push(`${adesso.ko} prove fallite sul codice di adesso`);
if (contro && contro.ko === 0) problemi.push('la controprova passa anche sul codice di prima: la prova non dimostra niente');
if (problemi.length) { for (const p of problemi) console.log('  X ' + p); }
console.log(problemi.length === 0
  ? `AGENDA: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `AGENDA: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
