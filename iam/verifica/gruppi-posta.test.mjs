// ═══════════════════════════════════════════════════════════════════════════════
//  GRUPPI DELLA POSTA — non stanno piu' solo sul computer di chi li crea
//
//  IL PROBLEMA CHE QUESTA PROVA SORVEGLIA.
//  Nella Posta si creano gruppi di destinatari ("Collaboratori", "Compagnie")
//  per scrivere a tutti insieme con un clic. Quegli elenchi stavano SOLO nella
//  memoria del browser di chi li aveva creati. Conseguenze, tutte silenziose:
//
//   1) da un altro computer, o dal telefono, il menu "Gruppi..." era vuoto:
//      sembrava che i gruppi non fossero mai stati creati;
//   2) chi puliva la cronologia del browser li perdeva tutti, senza avviso;
//   3) due persone sulla stessa casella vedevano due elenchi diversi.
//
//  Cosa si controlla qui: che un gruppo creato finisca nell'archivio, che un
//  gruppo creato altrove si veda, che quelli gia' presenti sul browser vengano
//  portati su da soli la prima volta, che modificarne uno non ne crei un
//  secondo, e che cancellarne uno lo tolga davvero.
//
//  E si controlla anche il contrario, che conta altrettanto: finche' la tabella
//  non esiste — la migrazione e' in sql/DA-APPROVARE-gruppi-posta.sql e NON e'
//  stata eseguita — tutto deve continuare a funzionare sul browser come prima,
//  dicendolo pero' a chi guarda, invece di far credere che sia al sicuro.
//
//  Come sempre la prova gira due volte: sul codice di adesso (deve passare) e
//  sul codice di prima (deve fallire).
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'gruppiLocali', 'gruppiLocaliSet', 'gruppoUguale', 'gruppiGiaPortati', 'gruppiGiaPortatiSet',
  'cmGruppi', 'cmGruppiOptions',
  'cmGruppiAggiornaSelect', 'cmInsertGruppo', 'mailGruppiCarica', 'mailGruppoScrivi',
  'mailGruppoRimuovi', 'mailRenderGruppi', 'mailGruppoSave', 'mailGruppoDelete',
];

const IO = { id: 'utente-1' };

/** Prepara la stanza come se la Posta fosse aperta. */
function apri({ memoria = {}, righeArchivio = [], db } = {}) {
  return stanza(SORGENTE, NOMI, {
    memoria,
    righeArchivio,
    ME: IO,
    db,
    opzioniArchivio: { idAutomatico: true },
    altro: {
      MAIL_GRUPPI: null,
      MAIL_GRUPPI_DB: false,
      mailFolderTabs() {}, mailAutoCloseSide() {}, mailGruppoForm() {},
    },
  });
}

/** Legge i gruppi dall'archivio, se il codice sa farlo. */
async function carica(s) {
  if (typeof s.ctx.mailGruppiCarica === 'function') await s.ctx.mailGruppiCarica();
}

/** Compila e salva la finestra "Nuovo gruppo", come farebbe una persona. */
async function salva(s, { nome, indirizzi, oldNome = '' }) {
  s.browser.elemento('gr-nome').value = nome;
  s.browser.elemento('gr-ind').value = indirizzi;
  await s.ctx.mailGruppoSave(oldNome);
}

const inArchivio = (s, nome) => s.archivio.stato.righe.filter(r => r.nome === nome);
const suBrowser = (s) => { try { return JSON.parse(s.browser.mem.get('iam_mail_gruppi') || '[]'); } catch (e) { return []; } };

let SORGENTE = null;

async function batteria(sorgente, etichetta) {
  SORGENTE = sorgente;
  const e = esiti(etichetta);

  // ── 1. un gruppo nuovo finisce nell'archivio ───────────────────────────────
  await e.provaAsync('un gruppo creato finisce nell\'archivio, non solo sul browser', async () => {
    const s = apri();
    await carica(s);
    await salva(s, { nome: 'Collaboratori', indirizzi: 'anna@withus.it, marco@withus.it' });
    const righe = inArchivio(s, 'Collaboratori');
    deve(righe.length === 1, 'il gruppo non e\' finito in archivio: da un altro computer non esisterebbe');
    deve(righe[0].indirizzi.includes('anna@withus.it'), 'gli indirizzi non sono stati salvati');
    deve(righe[0].utente_id === IO.id, 'il gruppo non risulta di chi lo ha creato');
  });

  // ── 2. un gruppo creato altrove si vede ────────────────────────────────────
  await e.provaAsync('un gruppo creato da un altro computer si vede lo stesso', async () => {
    const s = apri({ righeArchivio: [{ id: 'g1', utente_id: IO.id, nome: 'Compagnie', indirizzi: 'hdi@x.it' }] });
    await carica(s);
    deve(s.ctx.cmGruppi().some(g => g.nome === 'Compagnie'),
      'il gruppo salvato altrove non compare: il menu "Gruppi..." resta vuoto come prima');
  });

  // ── 3. quelli gia' sul browser salgono da soli ─────────────────────────────
  await e.provaAsync('i gruppi gia\' sul browser vengono portati in archivio da soli', async () => {
    const s = apri({ memoria: { iam_mail_gruppi: [{ nome: 'Rete Nord', indirizzi: 'nord@withus.it' }] } });
    await carica(s);
    deve(inArchivio(s, 'Rete Nord').length === 1,
      'quello che era gia' + '\' sul browser non viene portato al sicuro: si perderebbe pulendo la cronologia');
  });

  // ── 4. quelli gia' in archivio non vengono duplicati ───────────────────────
  await e.provaAsync('un gruppo gia\' in archivio non viene duplicato a ogni accesso', async () => {
    const s = apri({
      memoria: { iam_mail_gruppi: [{ nome: 'Compagnie', indirizzi: 'hdi@x.it' }] },
      righeArchivio: [{ id: 'g1', utente_id: IO.id, nome: 'Compagnie', indirizzi: 'hdi@x.it' }],
    });
    await carica(s);
    await carica(s);
    deve(inArchivio(s, 'Compagnie').length === 1,
      'lo stesso gruppo viene inserito piu\' volte: l\'elenco si riempirebbe di copie');
  });

  // ── 5. modificare non crea un secondo gruppo ───────────────────────────────
  await e.provaAsync('modificare un gruppo lo aggiorna, non ne crea un secondo', async () => {
    const s = apri({ righeArchivio: [{ id: 'g1', utente_id: IO.id, nome: 'Compagnie', indirizzi: 'hdi@x.it' }] });
    await carica(s);
    await salva(s, { oldNome: 'Compagnie', nome: 'Compagnie', indirizzi: 'hdi@x.it, allianz@x.it' });
    const righe = inArchivio(s, 'Compagnie');
    deve(righe.length === 1, 'la modifica ha creato un secondo gruppo con lo stesso nome');
    deve(righe[0].indirizzi.includes('allianz@x.it'), 'la modifica non e\' arrivata all\'archivio');
  });

  // ── 6. cancellare toglie davvero ───────────────────────────────────────────
  await e.provaAsync('cancellare un gruppo lo toglie dall\'archivio', async () => {
    const s = apri({ righeArchivio: [{ id: 'g1', utente_id: IO.id, nome: 'Compagnie', indirizzi: 'hdi@x.it' }] });
    await carica(s);
    await s.ctx.mailGruppoDelete('Compagnie');
    deve(inArchivio(s, 'Compagnie').length === 0,
      'il gruppo risulta cancellato a schermo ma resta in archivio: ricompare al prossimo accesso');
    // E non deve tornare su dalla copia rimasta sul browser al giro dopo:
    // e' il modo piu' facile di rendere un gruppo impossibile da eliminare.
    await carica(s);
    deve(inArchivio(s, 'Compagnie').length === 0,
      'il gruppo cancellato torna in archivio al riaccesso, ripescato dalla copia sul browser');
  });

  // ── 7. senza archivio si lavora come prima ─────────────────────────────────
  // Questa deve passare anche sul codice di prima: e' la promessa che la
  // migrazione non e' obbligatoria perche' la piattaforma continui a funzionare.
  await e.provaAsync('senza archivio si continua a lavorare sul browser, come prima', async () => {
    const s = apri({ db: null });
    await carica(s);
    await salva(s, { nome: 'Locale', indirizzi: 'x@y.it' });
    deve(suBrowser(s).some(g => g.nome === 'Locale'), 'senza archivio il gruppo va perso: prima invece si salvava');
    deve(s.ctx.cmGruppi().some(g => g.nome === 'Locale'), 'il gruppo salvato sul browser non si rilegge');
  });

  // ── 8. se l'archivio non risponde, il gruppo non si perde ──────────────────
  await e.provaAsync('se l\'archivio non risponde il gruppo non va perso', async () => {
    const rotto = { from: () => ({ select: () => Promise.reject(new Error('archivio non raggiungibile')) }) };
    const s = apri({ db: rotto });
    await carica(s);
    await salva(s, { nome: 'Ripiego', indirizzi: 'z@y.it' });
    deve(suBrowser(s).some(g => g.nome === 'Ripiego'),
      'con l\'archivio irraggiungibile il gruppo sparisce invece di restare sul browser');
  });

  // ── 9. lo si dice, quando sta solo sul browser ─────────────────────────────
  await e.provaAsync('si avvisa quando i gruppi stanno solo su questo computer', async () => {
    const s = apri({ db: null, memoria: { iam_mail_gruppi: [{ nome: 'Locale', indirizzi: 'x@y.it' }] } });
    await carica(s);
    s.ctx.mailRenderGruppi();
    const html = s.browser.elemento('posta-body').innerHTML || '';
    deve(/solo su questo computer/i.test(html),
      'niente avviso: sembra al sicuro e non lo e\'');
  });

  // ── 10. non si avvisa a sproposito ─────────────────────────────────────────
  await e.provaAsync('l\'avviso sparisce quando i gruppi sono davvero in archivio', async () => {
    const s = apri({ righeArchivio: [{ id: 'g1', utente_id: IO.id, nome: 'Compagnie', indirizzi: 'hdi@x.it' }] });
    await carica(s);
    s.ctx.mailRenderGruppi();
    const html = s.browser.elemento('posta-body').innerHTML || '';
    deve(!/solo su questo computer/i.test(html), 'avviso mostrato anche quando i gruppi sono al sicuro');
  });

  // ── 11. il nome non puo' iniettare codice nella pagina ─────────────────────
  await e.provaAsync('un nome con caratteri strani non entra nella pagina come codice', async () => {
    const s = apri({ db: null, memoria: { iam_mail_gruppi: [
      { nome: '<img src=x onerror=alert(1)>', indirizzi: 'x@y.it' },
      { nome: '" onmouseover="alert(2)', indirizzi: 'w@y.it' },
    ] } });
    await carica(s);
    s.ctx.mailRenderGruppi();
    const html = s.browser.elemento('posta-body').innerHTML || '';
    deve(!/<img\s/i.test(html), 'il nome del gruppo finisce nella pagina come codice, non come testo');
    deve(!/onmouseover\s*=\s*"/i.test(html),
      'un nome con le virgolette esce dall\'attributo del pulsante: diventa codice che parte da solo');
  });

  return e;
}

console.log('');
const adesso = await batteria(sorgenteAttuale(), 'GRUPPI POSTA (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice
// difettoso, anche dopo che saranno arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = '758c085';
console.log('');
let contro = null;
try {
  contro = await batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'GRUPPI POSTA (controprova sul codice di prima)');
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
  ? `GRUPPI POSTA: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `GRUPPI POSTA: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
