// ═══════════════════════════════════════════════════════════════════════════════
//  COMPAGNIE OPERATIVE DEI COLLABORATORI — le voci aggiunte a mano non spariscono
//
//  IL PROBLEMA CHE QUESTA PROVA SORVEGLIA.
//  Nella scheda di un collaboratore si segnano le compagnie con cui lavora.
//  Oltre alle otto fisse se ne possono aggiungere altre scrivendone il nome.
//  L'elenco di queste voci in piu' stava soltanto nella memoria del browser di
//  chi le aveva scritte. Conseguenze, tutte silenziose:
//
//   1) da un altro computer la casella di quella voce non veniva disegnata.
//      Il salvataggio della scheda legge le caselle presenti sullo schermo:
//      quindi bastava riaprire la scheda da un altro computer e salvare — anche
//      solo per correggere un numero di telefono — perche' le compagnie in piu'
//      sparissero dal collaboratore, senza nessun avviso;
//   2) nell'elenco dei collaboratori, sempre da un altro computer, si leggeva
//      la sigla grezza "custom_studio_rossi" al posto del nome;
//   3) la crocetta per togliere una voce ridisegnava il riquadro con NESSUNA
//      voce spuntata: togliendone una si perdeva la spunta di tutte le altre
//      voci in piu' (le otto fisse, che stanno fuori dal riquadro, restavano).
//      Al salvataggio il collaboratore si ritrovava senza quelle compagnie.
//
//  Cosa si controlla qui: che il catalogo si ricavi anche da quello che i
//  collaboratori hanno gia' registrato in archivio, che il nome si veda per
//  esteso ovunque, che togliere una voce tolga solo quella, e che una voce
//  registrata non possa essere persa da un salvataggio.
//
//  Come sempre la prova gira due volte: sul codice di adesso (deve passare) e
//  sul codice di prima (deve fallire).
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = [
  'etichettaDaChiave', 'compagnieCustomLocali', 'getCompagnieCustom',
  'etichettaCompagnia', 'renderCompagnieCustom', 'aggiungiCompagniaCustom',
  'rimuoviCompagniaCustom', 'getCompagnieSelezionate',
];

const BASE = ['hdi','allianz','groupama','prima','generali','sara','vittoria','unipolsai'];

// Due collaboratori gia' in archivio. Il primo lavora con una compagnia in piu'
// che era stata aggiunta dal computer di un altro operatore.
const TEAM_ARCHIVIO = [
  { id: 'c1', nome: 'Anna',  cogn: 'Verdi',  compagnie: ['hdi', 'allianz', 'custom_studio_rossi'] },
  { id: 'c2', nome: 'Marco', cogn: 'Bianchi', compagnie: ['prima', 'custom_studio_rossi'] },
];

const COMPAGNIE_BASE_FINTE = {
  hdi:'HDI', allianz:'Allianz', groupama:'Groupama', prima:'Prima',
  generali:'Generali', sara:'Sara', vittoria:'Vittoria', unipolsai:'UnipolSai'
};

/**
 * Prepara la stanza come se la scheda del collaboratore fosse aperta sullo
 * schermo. Le caselle vengono create in base a quello che il codice disegna:
 * per questo, dopo renderCompagnieCustom(), si rileggono le righe prodotte.
 */
function apriScheda(sorgente, { memoria = {}, team = TEAM_ARCHIVIO, apertoId = 'c1' } = {}) {
  const s = stanza(sorgente, NOMI, {
    memoria,
    altro: {
      TEAM: team.map(c => ({ ...c, compagnie: [...(c.compagnie || [])] })),
      TEAM_ID: apertoId,
      COMPAGNIE_BASE: COMPAGNIE_BASE_FINTE,
    },
  });
  // Il codice di prima non definiva COMPAGNIE_BASE: gli serviva l'elenco scritto
  // dentro getCompagnieSelezionate(). Lasciarlo qui non cambia nulla per lui.
  return s;
}

/** Disegna le caselle e le rende "spuntabili" come farebbe la pagina. */
function disegna(s, selezionate) {
  s.ctx.renderCompagnieCustom(selezionate);
  const html = s.browser.elemento('mc-comp-custom-rows').innerHTML || '';
  const chiaviDisegnate = [...html.matchAll(/id="mc-comp-([^"]+)"/g)].map(m => m[1]);
  // le otto fisse hanno la casella scritta direttamente nella pagina
  for (const k of BASE.concat(chiaviDisegnate)) {
    s.browser.elemento('mc-comp-' + k).checked = (selezionate || []).includes(k);
  }
  return { html, chiaviDisegnate };
}

function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  // ── 1. il catalogo si ricava anche dall'archivio ───────────────────────────
  e.prova('una compagnia in piu\' registrata da un altro computer si vede lo stesso', () => {
    const s = apriScheda(sorgente, { memoria: {} }); // memoria vuota = altro computer
    const { chiaviDisegnate } = disegna(s, ['hdi', 'allianz', 'custom_studio_rossi']);
    deve(chiaviDisegnate.includes('custom_studio_rossi'),
      'la casella della compagnia in piu\' non viene disegnata: al salvataggio sparirebbe dal collaboratore');
  });

  // ── 2. salvare da un altro computer non la cancella ────────────────────────
  e.prova('salvare la scheda da un altro computer non cancella le compagnie in piu\'', () => {
    const s = apriScheda(sorgente, { memoria: {} });
    disegna(s, ['hdi', 'allianz', 'custom_studio_rossi']);
    const salvate = s.ctx.getCompagnieSelezionate();
    deve(salvate.includes('custom_studio_rossi'),
      'la compagnia in piu\' non viene risalvata: riaprire e salvare la scheda la cancella');
    deve(salvate.includes('hdi') && salvate.includes('allianz'), 'sono sparite anche le compagnie fisse');
  });

  // ── 3. il nome si legge per esteso ─────────────────────────────────────────
  e.prova('il nome della compagnia si legge per esteso, non come sigla', () => {
    const s = apriScheda(sorgente, { memoria: {} });
    const etichetta = s.ctx.etichettaCompagnia('custom_studio_rossi');
    deve(!/^custom_/.test(etichetta) && /rossi/i.test(etichetta),
      `si legge la sigla grezza invece del nome: "${etichetta}"`);
    deve(s.ctx.etichettaCompagnia('hdi') === 'HDI', 'le compagnie fisse non si leggono piu\' col nome giusto');
  });

  // ── 4. il nome scritto a mano ha la precedenza ─────────────────────────────
  e.prova('il nome scritto a mano ha la precedenza su quello ricostruito', () => {
    const s = apriScheda(sorgente, {
      memoria: { iam_comp_custom: [{ key: 'custom_studio_rossi', label: 'Studio Rossi & Figli' }] },
    });
    deve(s.ctx.etichettaCompagnia('custom_studio_rossi') === 'Studio Rossi & Figli',
      'il nome scritto al momento dell\'inserimento non viene piu\' usato');
  });

  // ── 5. togliere una voce non azzera le altre ───────────────────────────────
  e.prova('togliere una compagnia in piu\' non azzera le altre voci in piu\'', () => {
    const team = [
      { id: 'c1', compagnie: ['hdi', 'custom_studio_rossi', 'custom_agenzia_neri'] },
      { id: 'c2', compagnie: ['prima', 'custom_studio_rossi'] },
    ];
    const s = apriScheda(sorgente, {
      team,
      memoria: { iam_comp_custom: [
        { key: 'custom_studio_rossi', label: 'Studio Rossi' },
        { key: 'custom_agenzia_neri', label: 'Agenzia Neri' },
      ] },
    });
    disegna(s, ['hdi', 'custom_studio_rossi', 'custom_agenzia_neri']);
    s.ctx.rimuoviCompagniaCustom('custom_studio_rossi');
    // dopo la rimozione il riquadro e' stato ridisegnato: rileggo le spunte
    const html = s.browser.elemento('mc-comp-custom-rows').innerHTML || '';
    deve(!/id="mc-comp-custom_studio_rossi"[^>]*checked/.test(html),
      'la compagnia tolta risulta ancora spuntata');
    deve(/id="mc-comp-custom_agenzia_neri"[^>]*checked/.test(html),
      'togliendo una compagnia in piu\' si e\' persa la spunta anche dell\'altra: al salvataggio sparirebbe dal collaboratore');
  });

  // ── 6. si avvisa se la voce e' in uso su altri ─────────────────────────────
  e.prova('si avvisa se quella compagnia e\' registrata anche su altri collaboratori', () => {
    const s = apriScheda(sorgente, {
      memoria: { iam_comp_custom: [{ key: 'custom_studio_rossi', label: 'Studio Rossi' }] },
    });
    disegna(s, ['hdi', 'custom_studio_rossi']);
    s.ctx.rimuoviCompagniaCustom('custom_studio_rossi');
    deve(s.browser.detto.confirm.length > 0,
      'nessun avviso: la voce e\' usata anche da un altro collaboratore e la si toglie senza dirlo');
  });

  // ── 7. aggiungere una voce non perde quelle gia' spuntate ──────────────────
  e.prova('aggiungere una compagnia non fa perdere quelle gia\' spuntate', () => {
    const s = apriScheda(sorgente, { memoria: {} });
    disegna(s, ['hdi', 'allianz', 'custom_studio_rossi']);
    s.browser.elemento('mc-comp-nuova').value = 'Agenzia Neri';
    s.ctx.aggiungiCompagniaCustom();
    const html = s.browser.elemento('mc-comp-custom-rows').innerHTML || '';
    deve(/id="mc-comp-custom_agenzia_neri"[^>]*checked/.test(html), 'la compagnia appena aggiunta non risulta spuntata');
    deve(/id="mc-comp-custom_studio_rossi"[^>]*checked/.test(html),
      'aggiungendo una compagnia si e\' persa la spunta di quella che c\'era gia\'');
  });

  // ── 8. il nome non puo' iniettare codice nella pagina ──────────────────────
  e.prova('un nome con caratteri strani non entra nella pagina come codice', () => {
    const s = apriScheda(sorgente, {
      memoria: { iam_comp_custom: [{ key: 'custom_x', label: '<img src=x onerror=alert(1)>' }] },
    });
    const { html } = disegna(s, ['custom_x']);
    deve(!/<img\s/i.test(html), 'il nome della compagnia finisce nella pagina come codice, non come testo');
  });

  return e;
}

console.log('');
const adesso = batteria(sorgenteAttuale(), 'COMPAGNIE COLLABORATORI (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice
// difettoso, anche dopo che saranno arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = '0c5ac93';
console.log('');
let contro = null;
try {
  contro = batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'COMPAGNIE COLLABORATORI (controprova sul codice di prima)');
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
  ? `COMPAGNIE COLLABORATORI: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `COMPAGNIE COLLABORATORI: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
