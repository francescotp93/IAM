// ═══════════════════════════════════════════════════════════════════════════════
//  KPI — le spunte "questa sezione la vede / non la vede" devono valere davvero
//
//  IL DIFETTO CHE QUESTA PROVA SORVEGLIA.
//  Nel Pannello Controllo KPI l'amministratore toglie la spunta a un
//  collaboratore per nascondergli, per esempio, la sezione CONSAP. La spunta
//  spariva, sembrava fatta, e non succedeva niente:
//   - la spunta finiva soltanto nella memoria del browser dell'amministratore;
//   - all'archivio si provava a scrivere su colonne che in iam_utenti non
//     esistono (kpi_consap, gara_rca...), l'errore veniva ingoiato in silenzio;
//   - il controllo, dalla parte del collaboratore, rileggeva quella stessa
//     memoria locale — che sul SUO computer era vuota. Sezione aperta lo stesso.
//  In pratica il pannello non ha mai disattivato niente per nessuno.
//
//  Da qui in avanti la spunta sta nell'archivio, dentro iam_utenti.permessi
//  sotto la voce "kpi", e viene letta da li'.
//
//  NOTA IMPORTANTE, scritta qui perche' non si perda: queste spunte servono a
//  tenere in ordine la schermata, NON a proteggere i dati. Chi puo' leggere una
//  posizione altrui lo decidono le regole dell'archivio (RLS su iam_kpi_*),
//  non questo pannello.
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'permessiJson', 'kpiFlagsDi', 'permessiEffettivi',
  'toggleKpiFlag', 'spunteKpiRimaste', 'mostraSpunteKpiRimaste', 'importaSpunteKpi',
  'salvaPermessiUtente', 'selPerfTab', 'selGaraTab',
];

// Le funzioni sopra ne chiamano altre che qui non interessano: le sostituiamo.
function stub(extra = {}) {
  const chiamate = { renderKpiCtrl: 0, renderGara: [], renderUtenti: 0 };
  return {
    chiamate,
    altro: {
      PERF_CUR: 'gare', GARA_CUR: 're_pezzi',
      UTENTI_LISTA: extra.utenti || [],
      PERMESSI: {
        admin:         { performance: true,  modifica: true },
        operatore:     { performance: true,  modifica: false },
        collaboratore: { performance: false, modifica: true },
      },
      canonRuolo: r => (r === 'operativo' ? 'collaboratore' : r || 'collaboratore'),
      /* permessiEffettivi ora interseca anche il profilo collaboratore (§2.4).
         Qui si provano le spunte KPI su un utente SENZA profilo — il caso di
         tutti quelli di oggi — quindi il profilo non deve entrarci. */
      profiloDi: () => null, moduliDi: () => null, PROFILI: {},
      renderGaraTabs() {},
      renderGara(g) { chiamate.renderGara.push(g); },
      loadCSFromDB() {}, loadREFromDB() {}, loadTCMFromDB() {},
      async renderKpiCtrl() { chiamate.renderKpiCtrl++; },
      async renderUtenti() { chiamate.renderUtenti++; },
      caricaUtenti: async () => {},
    },
  };
}

// Un collaboratore a cui l'amministratore ha tolto CONSAP e la gara RCA.
const COLLAB_LIMITATO = {
  id: 'collab-1', nome: 'Anna', cognome: 'Verdi', email: 'anna@withus.it', ruolo: 'collaboratore',
  permessi: { modifica: true, kpi: { kpi_consap: false, gara_rca: false } },
};

async function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  // ── 1. la spunta arriva davvero all'archivio ───────────────────────────────
  await e.provaAsync("togliere la spunta scrive nell'archivio, non solo su questo computer", async () => {
    const utente = { id: 'collab-1', nome: 'Anna', cognome: 'Verdi', ruolo: 'collaboratore', permessi: { modifica: true } };
    const s0 = stub({ utenti: [utente] });
    const s = stanza(sorgente, NOMI, { altro: s0.altro });
    await s.ctx.toggleKpiFlag('collab-1', 'kpi_consap', false);

    const scritte = s.archivio.stato.upsert.concat([]);
    const agg = s.archivio.stato.aggiornamenti || [];
    deve(agg.length === 1, `l'archivio non ha ricevuto niente (aggiornamenti su iam_utenti: ${agg.length})`);
    deve(agg[0].tabella === 'iam_utenti', `scritto su ${agg[0].tabella} invece che su iam_utenti`);
    const p = agg[0].riga.permessi;
    deve(p && p.kpi && p.kpi.kpi_consap === false, 'la spunta non e finita in permessi.kpi');
    deve(p.modifica === true, 'salvando la spunta KPI sono stati cancellati gli altri permessi');
    deve(scritte.length === 0, 'usata una scrittura non prevista');
  });

  await e.provaAsync('la spunta non finisce su colonne che in iam_utenti non esistono', async () => {
    const utente = { id: 'collab-1', ruolo: 'collaboratore', permessi: {} };
    const s0 = stub({ utenti: [utente] });
    const s = stanza(sorgente, NOMI, { altro: s0.altro });
    await s.ctx.toggleKpiFlag('collab-1', 'kpi_tcm', false);
    const agg = (s.archivio.stato.aggiornamenti || [])[0];
    deve(agg, "niente e' arrivato all'archivio");
    const colonne = Object.keys(agg.riga);
    const vere = ['permessi', 'ruolo', 'attivo', 'lab_abilitato', 'quoto', 'accesso_iam', 'accesso_quoto', 'rui', 'mail_caselle', 'modalita_pagamento', 'tema', 'accent', 'email', 'aggiornato_il', 'firma'];
    const inventate = colonne.filter(c => !vere.includes(c));
    deve(inventate.length === 0, `si scrive su colonne inesistenti (${inventate.join(', ')}): l'archivio rifiuta e nessuno se ne accorge`);
  });

  // ── 2. il collaboratore la vede applicata sul SUO computer ─────────────────
  e.prova('sul computer del collaboratore la sezione tolta risulta chiusa', () => {
    const s0 = stub();
    // memoria locale VUOTA: e' il caso vero, il collaboratore non ha mai visto
    // il pannello dell'amministratore.
    const s = stanza(sorgente, NOMI, { PROFILO: COLLAB_LIMITATO, ME: { id: 'collab-1' }, altro: s0.altro });
    s.ctx.selPerfTab('consap');
    deve(/non abilitata/i.test(s.browser.elemento('pp-consap').innerHTML),
      'la sezione CONSAP risulta ancora aperta: la spunta dell amministratore non e arrivata');
  });

  e.prova('anche le gare tolte risultano chiuse', () => {
    const s0 = stub();
    const s = stanza(sorgente, NOMI, { PROFILO: COLLAB_LIMITATO, ME: { id: 'collab-1' }, altro: s0.altro });
    s.ctx.selGaraTab('rca');
    deve(/non abilitata/i.test(s.browser.elemento('gp-rca').innerHTML), 'la gara RCA risulta ancora aperta');
    deve(s0.chiamate.renderGara.length === 0, 'la gara e stata comunque disegnata');
  });

  e.prova('quello che non e stato tolto resta aperto', () => {
    const s0 = stub();
    const s = stanza(sorgente, NOMI, { PROFILO: COLLAB_LIMITATO, ME: { id: 'collab-1' }, altro: s0.altro });
    s.ctx.selPerfTab('re');
    deve(!/non abilitata/i.test(s.browser.elemento('pp-re').innerHTML), 'chiusa una sezione che nessuno aveva tolto');
    s.ctx.selGaraTab('cross');
    deve(s0.chiamate.renderGara.includes('cross'), 'la gara Cross non viene disegnata pur essendo abilitata');
  });

  e.prova('un amministratore non viene mai bloccato da queste spunte', () => {
    const s0 = stub();
    const admin = { id: 'a-1', ruolo: 'admin', permessi: { kpi: { kpi_consap: false } } };
    const s = stanza(sorgente, NOMI, { PROFILO: admin, ME: { id: 'a-1' }, altro: s0.altro });
    s.ctx.selPerfTab('consap');
    deve(!/non abilitata/i.test(s.browser.elemento('pp-consap').innerHTML), "la sezione e chiusa anche all'amministratore");
  });

  // ── 3. le spunte KPI non si mescolano con i permessi di sezione ────────────
  e.prova('la voce kpi non viene scambiata per una sezione di IAM', () => {
    const s0 = stub();
    const s = stanza(sorgente, NOMI, { altro: s0.altro });
    const eff = s.ctx.permessiEffettivi(COLLAB_LIMITATO);
    deve(eff.kpi === undefined, "la voce kpi compare tra i permessi di sezione: non e' una sezione");
    deve(eff.modifica === true, "l'override per-utente non viene piu applicato");
  });

  await e.provaAsync('salvare i permessi di sezione non cancella le spunte KPI', async () => {
    const utente = JSON.parse(JSON.stringify(COLLAB_LIMITATO));
    const s0 = stub({ utenti: [utente] });
    const s = stanza(sorgente, NOMI, {
      altro: s0.altro,
      // la finestra dei permessi mostra le sezioni: qui ne simuliamo due
      spunte: [
        { dataset: { k: 'performance' }, checked: true },
        { dataset: { k: 'modifica' }, checked: false },
      ],
    });
    s.browser.elemento('pu-attivo').checked = true;
    await s.ctx.salvaPermessiUtente('collab-1');
    const agg = (s.archivio.stato.aggiornamenti || [])[0];
    deve(agg, "niente e' arrivato all'archivio");
    deve(agg.riga.permessi.performance === true && agg.riga.permessi.modifica === false, 'le spunte di sezione non sono state salvate');
    deve(agg.riga.permessi.kpi && agg.riga.permessi.kpi.kpi_consap === false,
      'salvando i permessi di sezione sono sparite le abilitazioni della scheda KPI');
  });

  // ── 4. le spunte rimaste sul vecchio computer non si perdono ───────────────
  e.prova('le spunte rimaste su questo computer vengono segnalate', () => {
    const utente = { id: 'collab-1', nome: 'Anna', cognome: 'Verdi', ruolo: 'collaboratore', permessi: {} };
    const s0 = stub({ utenti: [utente] });
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_kpi_flags: { 'collab-1': { kpi_consap: false, kpi_re: true } } },
      altro: s0.altro,
    });
    const r = s.ctx.spunteKpiRimaste();
    deve(r.length === 1, `segnalati ${r.length} utenti invece di 1`);
    deve(r[0].spente.join() === 'kpi_consap', `le sezioni disattivate rilevate sono ${r[0].spente.join()}`);
    s.ctx.mostraSpunteKpiRimaste();
    const avviso = s.browser.elemento('kpi-ctrl-residui').innerHTML;
    deve(/Anna Verdi/.test(avviso), "l'avviso non dice di chi sono le impostazioni rimaste");
  });

  await e.provaAsync("il pulsante porta le spunte rimaste nell'archivio", async () => {
    const utente = { id: 'collab-1', nome: 'Anna', cognome: 'Verdi', ruolo: 'collaboratore', permessi: { modifica: true } };
    const s0 = stub({ utenti: [utente] });
    const s = stanza(sorgente, NOMI, {
      memoria: { iam_kpi_flags: { 'collab-1': { kpi_consap: false, gara_rca: false } } },
      altro: s0.altro,
    });
    await s.ctx.importaSpunteKpi();
    const agg = s.archivio.stato.aggiornamenti || [];
    deve(agg.length === 2, `portate nell'archivio ${agg.length} impostazioni invece di 2`);
    const finale = agg[agg.length - 1].riga.permessi;
    deve(finale.kpi.kpi_consap === false && finale.kpi.gara_rca === false, "nell'archivio non risultano entrambe");
    deve(finale.modifica === true, 'il resto dei permessi e stato cancellato');
    deve(s.browser.localStorage.getItem('iam_kpi_flags') === null, "l'avviso continuerebbe a comparire");
  });

  e.prova('senza spunte rimaste il pannello resta pulito', () => {
    const s0 = stub();
    const s = stanza(sorgente, NOMI, { altro: s0.altro });
    deve(s.ctx.spunteKpiRimaste().length === 0, 'segnala impostazioni che non ci sono');
    s.ctx.mostraSpunteKpiRimaste();
    deve(s.browser.elemento('kpi-ctrl-residui').innerHTML === '', "compare un avviso senza niente da segnalare");
  });

  return e;
}

// ── il codice di adesso ───────────────────────────────────────────────────────
const adesso = await batteria(sorgenteAttuale(), 'KPI ABILITAZIONI (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
const PRIMA_DELLA_CORREZIONE = 'aa5be3f';
console.log('');
let contro = null;
try {
  contro = await batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'KPI ABILITAZIONI (controprova sul codice di prima)');
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
  ? `KPI ABILITAZIONI: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `KPI ABILITAZIONI: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
