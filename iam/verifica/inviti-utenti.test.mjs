// ═══════════════════════════════════════════════════════════════════════════════
//  INVITARE UN UTENTE — il ruolo scelto deve arrivare a destinazione
//
//  IL PROBLEMA CHE QUESTA PROVA SORVEGLIA.
//  Quando un amministratore invitava una persona sceglieva subito ruolo,
//  accessi e numero RUI. Quelle scelte non arrivavano mai:
//
//   1) la scheda veniva scritta con una casella, "rui", che sulla tabella
//      iam_utenti NON esiste (esiste su iam_team). L'archivio rifiutava tutta
//      la scrittura, e l'errore non veniva guardato;
//   2) anche senza quella casella, l'archivio non permette a un amministratore
//      di CREARE la scheda di un altro: la puo' creare solo la persona stessa,
//      al primo ingresso. Quindi la scrittura era destinata a fallire comunque;
//   3) le scelte finivano allora nella memoria del browser di chi invitava, e
//      al primo accesso successivo venivano ritentate come CREAZIONE (di nuovo
//      impossibile) e poi CANCELLATE lo stesso, riuscite o no. Il ruolo scelto
//      all'invito spariva in silenzio;
//   4) intanto, al primo ingresso, la persona provava a crearsi la scheda da
//      AMMINISTRATORE. La riga che lo decideva chiedeva all'archivio quante
//      schede esistessero, ma leggeva la risposta sbagliata — sempre vuota — e
//      la condizione risultava vera per tutti. Non e' mai andata a buon fine
//      solo perche' l'archivio rifiuta quel ruolo: l'effetto visibile era che
//      la scheda non nasceva e la persona entrava senza permessi applicati.
//
//  Cosa si controlla qui: che non si scriva su caselle inesistenti, che la
//  scheda nasca col ruolo piu' basso, che l'invito non venga mai buttato via
//  prima di essere stato messo in pratica davvero, e che quello che resta in
//  sospeso si veda nel pannello Utenti.
//
//  Come sempre la prova gira due volte: sul codice di adesso (deve passare) e
//  sul codice di prima (deve fallire).
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'invitiInSospeso', 'scriviInviti', 'aggiungiInvito', 'scartaInvito',
  'applicaInvitiInSospeso', 'mostraInvitiInSospeso',
  'caricaProfilo', 'creaNuovoUtente',
  'canonRuolo', 'dbRuolo', 'normalizzaRuolo', 'applicaSuperAdmin', 'isSuperAdmin',
];

// Le caselle che iam_utenti ha DAVVERO (lette da information_schema il 28/07).
// "rui" non c'e': e' proprio il punto della prova.
const COLONNE_VERE = [
  'id', 'email', 'nome', 'cognome', 'ruolo', 'attivo', 'creato_da', 'creato_il',
  'aggiornato_il', 'tema', 'accent', 'lab_abilitato', 'quoto', 'accesso_iam',
  'accesso_quoto', 'moduli', 'rete', 'responsabile', 'mail_caselle',
  'modalita_pagamento', 'permessi',
];

// Le regole di accesso vere, in piccolo: una scheda la puo' creare solo la
// persona stessa, e non con un ruolo alto.
const RUOLI_VIETATI_IN_CREAZIONE = ['admin', 'top_master', 'operatore', 'master'];
function regolaArchivio(chiSono) {
  return riga => {
    if (String(riga.id) !== String(chiSono)) return 'new row violates row-level security policy for table "iam_utenti"';
    if (RUOLI_VIETATI_IN_CREAZIONE.includes(riga.ruolo)) return 'new row violates row-level security policy for table "iam_utenti"';
    return null;
  };
}

const CONTORNO = {
  LEGACY_RUOLI: { top_master: 'admin', master: 'operatore', operativo: 'collaboratore' },
  RUOLI: { admin: { label: 'Admin' }, operatore: { label: 'Operatore' }, collaboratore: { label: 'Collaboratore' } },
  SUPER_ADMIN_EMAIL: 'francesco@withusassicurazioni.it',
  UTENTI_LISTA: [],
  renderUtenti: async () => {},
  renderKpiCtrl: async () => {},
  caricaUtenti: async () => {},
};

const INVITO = {
  id: 'nuovo-1', email: 'anna@withus.it', nome: 'Anna', cognome: 'Verdi',
  ruolo: 'operatore', attivo: true, creato_da: 'admin-1',
  accesso_iam: true, accesso_quoto: false, lab_abilitato: false,
};

function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  // ── 1. non si scrive piu' su caselle che non esistono ──────────────────────
  e.provaAsync("invitare non scrive piu' su una casella che l'archivio non ha", async () => {
    const s = stanza(sorgente, NOMI, {
      ME: { id: 'admin-1', email: 'capo@withus.it' },
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE, regolaInsert: regolaArchivio('mai') },
      altro: { ...CONTORNO },
    });
    deve(!s.mancanti.includes('creaNuovoUtente'), 'creaNuovoUtente non si trova nel file');
    s.ctx.db.auth = { signUp: async () => ({ data: { user: { id: 'nuovo-1' } }, error: null }) };
    s.browser.elemento('nu-email').value = 'anna@withus.it';
    s.browser.elemento('nu-nome').value  = 'Anna';
    s.browser.elemento('nu-cogn').value  = 'Verdi';
    s.browser.elemento('nu-ruolo').value = 'operatore';
    s.browser.elemento('nu-pass').value  = 'IAMABC123';
    s.browser.elemento('nu-rui').value   = 'A000123456';
    await s.ctx.creaNuovoUtente();

    const scritture = [...s.archivio.stato.upsert, ...s.archivio.stato.insert];
    deve(scritture.length > 0, "l'invito non ha provato a scrivere niente");
    for (const w of scritture) {
      const ignote = Object.keys(w.riga).filter(k => !COLONNE_VERE.includes(k));
      deve(ignote.length === 0, `si scrive ancora sulla casella "${ignote[0]}", che su iam_utenti non esiste: l'archivio rifiuta tutta la scheda`);
    }
  });

  // ── 2. il ruolo scelto all'invito non si perde ─────────────────────────────
  e.provaAsync("il ruolo scelto all'invito resta segnato anche se la scheda non si puo' creare", async () => {
    const s = stanza(sorgente, NOMI, {
      ME: { id: 'admin-1', email: 'capo@withus.it' },
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE, regolaInsert: regolaArchivio('mai') },
      altro: { ...CONTORNO },
    });
    s.ctx.db.auth = { signUp: async () => ({ data: { user: { id: 'nuovo-1' } }, error: null }) };
    s.browser.elemento('nu-email').value = 'anna@withus.it';
    s.browser.elemento('nu-ruolo').value = 'operatore';
    s.browser.elemento('nu-pass').value  = 'IAMABC123';
    await s.ctx.creaNuovoUtente();

    const rimasti = JSON.parse(s.browser.localStorage.getItem('iam_utenti_pendenti') || '[]');
    deve(rimasti.length === 1, "la scelta fatta all'invito non e' stata messa da parte da nessuna parte");
    deve(rimasti[0].ruolo === 'operatore', `il ruolo segnato e' "${rimasti[0].ruolo}" invece di "operatore"`);
  });

  // ── 3. l'invito non viene buttato via senza essere stato applicato ─────────
  e.provaAsync("un invito non applicato non viene cancellato", async () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_utenti_pendenti: [INVITO] },
      righeArchivio: [],                       // la scheda della persona non c'e' ancora
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE },
      altro: { ...CONTORNO },
    });
    const r = await s.ctx.applicaInvitiInSospeso();
    deve(r.applicati === 0, "risulta applicato un invito su una scheda che non esiste");
    const rimasti = JSON.parse(s.browser.localStorage.getItem('iam_utenti_pendenti') || '[]');
    deve(rimasti.length === 1, "l'invito e' stato cancellato pur non essendo stato messo in pratica: il ruolo scelto e' perduto");
  });

  e.prova("il vecchio codice non cancella piu' l'elenco a scatola chiusa", () => {
    const cancellazioneCieca = /for\s*\(const p of pendenti\)[\s\S]{0,300}removeItem\(['"]iam_utenti_pendenti['"]\)/;
    deve(!cancellazioneCieca.test(sorgente), "l'elenco degli inviti viene ancora svuotato senza guardare se le scritture sono riuscite");
  });

  // ── 4. quando la scheda esiste, le scelte si applicano ─────────────────────
  e.provaAsync("appena la scheda esiste, ruolo e accessi vengono applicati", async () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_utenti_pendenti: [INVITO] },
      righeArchivio: [{ id: 'nuovo-1', email: 'anna@withus.it', ruolo: 'collaboratore', accesso_iam: true, accesso_quoto: false }],
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE },
      altro: { ...CONTORNO },
    });
    const r = await s.ctx.applicaInvitiInSospeso();
    deve(r.applicati === 1, `applicati ${r.applicati} inviti invece di 1`);
    const riga = s.archivio.stato.righe.find(x => x.id === 'nuovo-1');
    deve(riga.ruolo === 'operatore', `la scheda e' rimasta con ruolo "${riga.ruolo}"`);
    const rimasti = JSON.parse(s.browser.localStorage.getItem('iam_utenti_pendenti') || '[]');
    deve(rimasti.length === 0, "l'invito applicato resta in elenco e verrebbe riapplicato ogni volta");
  });

  // ── 5. il numero RUI non fa perdere il resto ───────────────────────────────
  e.provaAsync("il numero RUI, che l'archivio non sa ancora dove mettere, non blocca ruolo e accessi", async () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_utenti_pendenti: [{ ...INVITO, rui: 'A000123456' }] },
      righeArchivio: [{ id: 'nuovo-1', email: 'anna@withus.it', ruolo: 'collaboratore' }],
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE },
      altro: { ...CONTORNO },
    });
    await s.ctx.applicaInvitiInSospeso();
    const riga = s.archivio.stato.righe.find(x => x.id === 'nuovo-1');
    deve(riga.ruolo === 'operatore', 'il ruolo non e stato applicato per colpa del numero RUI');
    deve(riga.rui === undefined, "il numero RUI risulta scritto su una casella che non esiste");
    const rimasti = JSON.parse(s.browser.localStorage.getItem('iam_utenti_pendenti') || '[]');
    deve(rimasti.length === 1 && rimasti[0].base_applicata === true,
      "il numero RUI non applicato non resta segnato: andrebbe perduto senza che nessuno lo sappia");
  });

  // ── 6. la scheda nasce col ruolo piu' basso ────────────────────────────────
  e.provaAsync("al primo ingresso la scheda nasce come collaboratore, non come amministratore", async () => {
    const s = stanza(sorgente, NOMI, {
      ME: { id: 'nuovo-1', email: 'anna@withus.it' },
      PROFILO: null,
      righeArchivio: [],
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE, regolaInsert: regolaArchivio('nuovo-1') },
      altro: { ...CONTORNO },
    });
    const prof = await s.ctx.caricaProfilo('nuovo-1');
    deve(s.archivio.stato.insert.length === 1, `tentativi di creare la scheda: ${s.archivio.stato.insert.length} invece di 1`);
    const chiesto = s.archivio.stato.insert[0].riga.ruolo;
    deve(!RUOLI_VIETATI_IN_CREAZIONE.includes(chiesto),
      `la scheda viene chiesta con ruolo "${chiesto}": l'archivio la rifiuta e la persona entra senza scheda e senza permessi applicati`);
    deve(prof && prof.ruolo === 'collaboratore', 'la scheda non e stata creata, oppure non e nata come collaboratore');
  });

  e.prova("il ruolo non dipende piu' da un conteggio letto male", () => {
    deve(!/count:\s*['"]exact['"],\s*head:\s*true[\s\S]{0,200}\?\s*['"]admin['"]/.test(sorgente),
      "il ruolo del nuovo utente viene ancora deciso da un conteggio che arriva sempre vuoto: la condizione e vera per tutti");
  });

  e.provaAsync("se la scheda non si riesce a creare, non si prosegue con un profilo a meta", async () => {
    const s = stanza(sorgente, NOMI, {
      ME: { id: 'nuovo-1', email: 'anna@withus.it' },
      PROFILO: null,
      righeArchivio: [],
      opzioniArchivio: { colonneAmmesse: COLONNE_VERE, regolaInsert: () => 'new row violates row-level security policy' },
      altro: { ...CONTORNO },
    });
    const prof = await s.ctx.caricaProfilo('nuovo-1');
    deve(prof === null, 'il profilo mancante non viene segnalato in modo chiaro a chi lo ha chiesto');
  });

  // ── 7. quello che resta in sospeso si vede ─────────────────────────────────
  e.prova("gli inviti da completare si vedono nel pannello Utenti", () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_utenti_pendenti: [INVITO] },
      altro: { ...CONTORNO },
    });
    s.ctx.mostraInvitiInSospeso();
    const avviso = s.browser.elemento('utenti-inviti').innerHTML;
    deve(/Anna/.test(avviso), "l'avviso non dice di chi si tratta");
    deve(/Operatore/i.test(avviso), "l'avviso non dice quale ruolo era stato scelto");
  });

  e.prova("senza inviti in sospeso il pannello resta pulito", () => {
    const s = stanza(sorgente, NOMI, { altro: { ...CONTORNO } });
    s.ctx.mostraInvitiInSospeso();
    deve(s.browser.elemento('utenti-inviti').innerHTML === '', "compare un avviso anche quando non c'e' niente in sospeso");
  });

  e.prova("togliere un invito dall'elenco chiede conferma", () => {
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_utenti_pendenti: [INVITO] },
      rispostaConfirm: false,
      altro: { ...CONTORNO },
    });
    s.ctx.scartaInvito('nuovo-1');
    deve(s.browser.detto.confirm.length === 1, "l'invito viene tolto senza chiedere niente");
    const rimasti = JSON.parse(s.browser.localStorage.getItem('iam_utenti_pendenti') || '[]');
    deve(rimasti.length === 1, 'l invito e stato tolto anche dopo aver risposto di no');
  });

  return e;
}

// ── il codice di adesso ───────────────────────────────────────────────────────
const adesso = await batteriaCompleta(sorgenteAttuale(), 'INVITI UTENTI (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice
// difettoso, anche dopo che saranno arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = 'aa5be3f';
console.log('');
let contro = null;
try {
  contro = await batteriaCompleta(sorgenteA(PRIMA_DELLA_CORREZIONE), 'INVITI UTENTI (controprova sul codice di prima)');
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
  ? `INVITI UTENTI: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `INVITI UTENTI: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);

// Le prove asincrone vanno attese tutte prima di stampare il riepilogo.
async function batteriaCompleta(sorgente, etichetta) {
  const e = batteria(sorgente, etichetta);
  await new Promise(r => setImmediate(r));
  return e;
}
