// ═══════════════════════════════════════════════════════════════════════════════
//  ALLEGATI DELLE FATTURE DEI COLLABORATORI — non restano su un solo computer
//
//  IL PROBLEMA CHE QUESTA PROVA SORVEGLIA.
//  Nella scheda di un collaboratore si caricano le sue fatture, con il file
//  allegato. La riga della fattura (descrizione, importo, pagata/da pagare)
//  finiva in archivio ed era uguale per tutti; il FILE no: veniva convertito in
//  testo e messo nella memoria del browser di chi lo aveva caricato. Da li' non
//  usciva. Conseguenze, tutte silenziose:
//
//   1) da un altro computer il pulsante "Apri" non veniva nemmeno disegnato:
//      la fattura sembrava senza allegato, anche se qualcuno lo aveva caricato;
//   2) la memoria del browser e' piccola (pochi megabyte). Quando si riempiva,
//      il salvataggio toglieva l'allegato a TUTTE le fatture di TUTTI i
//      collaboratori e rispondeva lo stesso "fatto": nessun avviso, nessun modo
//      di accorgersene se non aprendo una vecchia fattura e trovandola vuota;
//   3) svuotare la cronologia del browser, o cambiare computer, faceva sparire
//      per sempre gli allegati.
//
//  Cosa si controlla qui: che l'allegato venga caricato nell'archivio condiviso
//  (lo stesso contenitore "documenti" gia' usato per i documenti dei
//  collaboratori), che il suo percorso arrivi al database, che da un altro
//  computer la fattura si apra, che si apra con un indirizzo a scadenza e non
//  con uno buono per sempre, che il file vero non venga mai scritto nella
//  memoria del browser, e che quando qualcosa non riesce lo si dica invece di
//  far finta di niente.
//
//  Come sempre la prova gira due volte: sul codice di adesso (deve passare) e
//  sul codice di prima (deve fallire).
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'loadFattureStore', 'saveFattureStore', 'getFattureCollab', 'getFattureMerged',
  'mergeTeamFatture', 'loadTeam', 'saveTeam',
  // Dal 10/09/2026 loadTeam/saveTeam passano da questa guardia prima di
  // toccare localStorage: senza portarsela dentro, qui risulterebbe assente.
  'eStaffLocale', 'scordaTeamLocale',
  'fatturaFileSalvabile', 'fatturaFilePerDB', 'nomeFileSicuro', 'chiaveCasuale',
  'caricaAllegatoFattura', 'apriAllegatoFattura',
  'loadFatturaFile', 'aggiungiFatturaCollab', 'persistFattureCollaboratore',
  'renderFattureCollab', 'viewFatturaTemp', 'viewFatturaCollab',
];

// Il file che l'operatore sceglie dal disco: 'blob' e' il file vero (quello che
// va spedito in archivio), 'data' e' la copia in testo per l'anteprima.
function fileScelto() {
  return {
    nome: 'Fattura marzo.pdf',
    tipo: 'application/pdf',
    data: 'data:application/pdf;base64,SEVMTE8=',
    blob: { finto: true, contenuto: 'CONTENUTO-DEL-PDF' },
  };
}

function apriScheda(sorgente, extra = {}) {
  const s = stanza(sorgente, NOMI, {
    memoria: extra.memoria || {},
    altro: {
      TEAM: extra.team || [{ id: 'c1', nome: 'Anna', cogn: 'Verdi', fatture: [] }],
      TEAM_ID: extra.apertoId === undefined ? 'c1' : extra.apertoId,
      TEAM_FATTURE: extra.fatture || [],
      TEAM_FATTURA_FILE: extra.fileInAttesa === undefined ? null : extra.fileInAttesa,
      APP: { loaded: false },
      buildDashboard() {},
      parseNum: v => Number(String(v == null ? 0 : v).replace(',', '.')) || 0,
      fmt: v => String(v),
    },
  });
  if (extra.righeArchivio) s.archivio.stato.righe = extra.righeArchivio.map(r => ({ ...r }));
  return s;
}

/** Compila il modulo della nuova fattura come farebbe l'operatore. */
function compila(s, { desc = 'Provvigioni marzo', importo = '1200', pagata = false } = {}) {
  s.browser.elemento('mc-fat-desc').value = desc;
  s.browser.elemento('mc-fat-importo').value = importo;
  s.browser.elemento('mc-fat-pagata').checked = pagata;
}

async function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  // ── 1. l'allegato esce dal computer di chi lo carica ───────────────────────
  await e.provaAsync('l\'allegato caricato finisce in archivio, non solo su questo computer', async () => {
    const s = apriScheda(sorgente, { fileInAttesa: fileScelto() });
    compila(s);
    await s.ctx.aggiungiFatturaCollab();
    const caricati = s.archivio.stato.fileCaricati;
    deve(caricati.length === 1,
      'nessun file e\' stato caricato in archivio: l\'allegato resta solo sul computer di chi lo inserisce');
    deve(String(caricati[0].percorso).startsWith('fatture/c1/'),
      `il file e' finito in un posto inatteso: "${caricati[0].percorso}"`);
    const f = s.ctx.TEAM_FATTURE[0];
    deve(f && f.file && f.file.path, 'la fattura non tiene il riferimento al file in archivio');
  });

  // ── 2. il riferimento arriva al database ───────────────────────────────────
  await e.provaAsync('il percorso dell\'allegato viene scritto sul database', async () => {
    const s = apriScheda(sorgente, { fileInAttesa: fileScelto(), righeArchivio: [{ id: 'c1', fatture: [] }] });
    compila(s);
    await s.ctx.aggiungiFatturaCollab();
    const scritture = s.archivio.stato.aggiornamenti.filter(a => a.tabella === 'iam_team');
    deve(scritture.length > 0, 'la fattura non viene scritta sul database');
    const fatture = scritture[scritture.length - 1].riga.fatture || [];
    deve(fatture.length === 1 && fatture[0].file && fatture[0].file.path,
      'sul database arriva solo il nome del file, non dove trovarlo: dagli altri computer l\'allegato non si apre');
  });

  // ── 3. da un altro computer la fattura si apre ─────────────────────────────
  e.prova('da un altro computer il pulsante per aprire l\'allegato c\'e\'', () => {
    const dalDatabase = [{
      id: 'f1', desc: 'Provvigioni marzo', importo: 1200, pagata: false, data: '01/03/2026',
      file: { nome: 'Fattura marzo.pdf', tipo: 'application/pdf', path: 'fatture/c1/abc_Fattura_marzo.pdf' },
    }];
    // memoria vuota = altro computer: qui il file non c'e' mai stato
    const s = apriScheda(sorgente, { memoria: {} });
    const unite = s.ctx.getFattureMerged('c1', dalDatabase);
    deve(unite[0].file && unite[0].file.path,
      'da un altro computer la fattura risulta senza allegato');
    s.ctx.TEAM_FATTURE = unite;
    s.ctx.renderFattureCollab();
    const html = s.browser.elemento('mc-fatture-list').innerHTML || '';
    deve(/viewFatturaTemp/.test(html),
      'da un altro computer il pulsante "Apri" non viene disegnato: l\'allegato sembra non esistere');
  });

  // ── 4. si apre con un indirizzo a scadenza ─────────────────────────────────
  await e.provaAsync('l\'allegato si apre con un indirizzo a scadenza, non con uno valido per sempre', async () => {
    const s = apriScheda(sorgente, { fileInAttesa: fileScelto() });
    compila(s);
    await s.ctx.aggiungiFatturaCollab();
    await s.ctx.viewFatturaTemp(0);
    const w = s.browser.finestre[s.browser.finestre.length - 1];
    deve(w, 'non viene aperta nessuna finestra');
    deve(/\/firmato\//.test(w.location.href || ''),
      `l'allegato viene aperto con un indirizzo permanente: "${w.location.href}"`);
    const firmato = s.archivio.stato.urlFirmati[0];
    deve(firmato && firmato.secondi > 0 && firmato.secondi <= 3600,
      'l\'indirizzo dell\'allegato non ha una scadenza breve');
  });

  // ── 5. il file vero non entra nella memoria del browser ────────────────────
  e.prova('il file vero non viene mai scritto nella memoria del browser', () => {
    const s = apriScheda(sorgente, {
      fatture: [{ id: 'f1', desc: 'x', importo: 10, file: fileScelto() }],
    });
    s.ctx.persistFattureCollaboratore();
    const scritto = s.browser.localStorage.getItem('iam_fatture_collab') || '';
    deve(!/CONTENUTO-DEL-PDF/.test(scritto),
      'il file vero finisce nella memoria del browser: la riempie e non serve a niente, perche\' li\' non si puo\' salvare');
  });

  // ── 6. se l'archivio non risponde, lo si dice ──────────────────────────────
  await e.provaAsync('se l\'allegato non riesce ad arrivare in archivio, viene detto', async () => {
    const s = apriScheda(sorgente, { fileInAttesa: fileScelto() });
    s.archivio.stato.erroreSuUpload = true;
    compila(s);
    await s.ctx.aggiungiFatturaCollab();
    deve(s.browser.detto.alert.some(m => /archivio|computer/i.test(m)),
      'l\'allegato non e\' arrivato in archivio e nessuno lo dice: chi lo ha caricato crede che sia a posto');
    const f = s.ctx.TEAM_FATTURE[0];
    deve(f && f.file && f.file.data, 'la fattura perde anche la copia locale dell\'allegato');
  });

  // ── 7. memoria piena: non si buttano via allegati in silenzio ──────────────
  e.prova('con la memoria piena non si buttano via allegati senza dirlo', () => {
    const s = apriScheda(sorgente, {
      fatture: [
        { id: 'f1', desc: 'vecchia', importo: 10, file: { nome: 'a.pdf', tipo: 'application/pdf', data: 'data:application/pdf;base64,AAAA' } },
        { id: 'f2', desc: 'nuova',  importo: 20, file: { nome: 'b.pdf', tipo: 'application/pdf', path: 'fatture/c1/xyz_b.pdf' } },
      ],
    });
    // Si simula la memoria piena: qualunque scrittura che contenga un file viene rifiutata.
    const vero = s.browser.localStorage.setItem;
    s.browser.localStorage.setItem = (k, v) => {
      if (String(v).includes('base64')) { const err = new Error('QuotaExceededError'); err.name = 'QuotaExceededError'; throw err; }
      return vero(k, v);
    };
    s.ctx.persistFattureCollaboratore();
    deve(s.browser.detto.alert.length > 0,
      'la memoria era piena, un allegato senza copia in archivio e\' stato buttato via e non lo dice nessuno');
    const rimaste = JSON.parse(s.browser.localStorage.getItem('iam_fatture_collab') || '{}').c1 || [];
    const nuova = rimaste.find(f => String(f.id) === 'f2');
    deve(nuova && nuova.file && nuova.file.path,
      'con la memoria piena si perde anche il riferimento degli allegati che stanno in archivio');
  });

  // ── 8. due file con lo stesso nome non si sovrascrivono ────────────────────
  await e.provaAsync('due allegati con lo stesso nome non si sovrascrivono a vicenda', async () => {
    const s = apriScheda(sorgente, { fileInAttesa: fileScelto() });
    compila(s, { desc: 'Prima' });
    await s.ctx.aggiungiFatturaCollab();
    s.ctx.TEAM_FATTURA_FILE = fileScelto();
    compila(s, { desc: 'Seconda' });
    await s.ctx.aggiungiFatturaCollab();
    const percorsi = s.archivio.stato.fileCaricati.map(f => f.percorso);
    deve(percorsi.length === 2, 'il secondo allegato non e\' stato caricato');
    deve(percorsi[0] !== percorsi[1],
      'due fatture con lo stesso nome di file finiscono nello stesso posto: la seconda cancella la prima');
  });

  return e;
}

console.log('');
const adesso = await batteria(sorgenteAttuale(), 'ALLEGATI FATTURE (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice
// difettoso, anche dopo che saranno arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = '31fd2bb';
console.log('');
let contro = null;
try {
  contro = await batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'ALLEGATI FATTURE (controprova sul codice di prima)');
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
  ? `ALLEGATI FATTURE: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `ALLEGATI FATTURE: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
