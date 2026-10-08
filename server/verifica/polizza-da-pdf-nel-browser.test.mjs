/* ═══════════════════════════════════════════════════════════════════════════════
   CARICARE UNA POLIZZA DAL PDF: LA SCHERMATA                  (08/10/2026)

   Il motore ha le sue 19 prove e 20 guasti presi. Non dicono che la SCHERMATA
   usi quelle regole, e qui è tutto: i campi li riempie lei, il cliente lo
   sceglie lei, e quello che non ha capito lo dice lei.

   LE DUE COSE CHE QUESTE PROVE DIFENDONO:

   1. IL CLIENTE NON SI AGGANCIA PER NOME. Solo il codice fiscale sceglie una
      scheda da solo. Se la schermata agganciasse il primo omonimo, la polizza
      finirebbe sulla scheda di un altro — e non lo scoprirebbe nessuno fino a
      quando uno dei due telefona.

   2. UN CAMPO CHE SEMBRA RIEMPITO E NON LO È. Su una tendina, un valore che
      non è fra le opzioni non dà nessun errore: il campo resta com'era. Chi
      guarda vede «Annuale» e crede che venga dal documento, e invece è il
      valore di partenza.

       node server/verifica/polizza-da-pdf-nel-browser.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import path from 'path';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

/* Apre il modulo «Nuova polizza» senza passare dai permessi e senza database:
   si costruisce il contenitore che `pnuForm` si aspetta e si chiama la
   funzione VERA. Quello che si misura dopo è il modulo di produzione. */
async function modulo() {
  await p.evaluate(() => {
    let bd = document.getElementById('pol-bd');
    if (!bd) { bd = document.createElement('div'); bd.id = 'pol-bd'; document.body.appendChild(bd); }
    window.PNU_COMPAGNIE = [{ nome: 'HDI', attiva: true }, { nome: 'PRIMA', attiva: true }];
    window.PNU_PRODOTTI = [];
    (0, eval)('PNU_COMPAGNIE = window.PNU_COMPAGNIE; PNU_PRODOTTI = window.PNU_PRODOTTI; PNU_CLIENTE = null; PCP_LETTURA = null;');
    pnuForm([]);
  });
}

/* Il documento finto: le stesse forme della prova in Node, con un codice
   fiscale inventato ma valido (la sedicesima lettera la calcola il motore). */
const PAGINE = await p.evaluate(() => {
  const cf = 'RSSMRA80A01H501' + Anagrafica.controllo('RSSMRA80A01H501');
  return { cf, pagine: [
    { n: 1, testo: 'HDI ASSICURAZIONI S.p.A.\nPolizza n. 2026/A/0099431\nContraente: ROSSI MARIO\nCodice fiscale: ' + cf },
    { n: 2, testo: 'Decorrenza: 01/03/2026\nScadenza: 01/03/2027\nFrazionamento: Semestrale\n'
        + 'Premio annuo lordo: € 1.248,60\nPremio della rata: € 624,30\nTarga: AB 123 CD' },
  ] };
});

// ═══════════════════════════════════════════════════════════════════════════════
prova('I MOTORI CHE SERVONO SONO CARICATI NELLA PAGINA', async () => {
  const c = await p.evaluate(() => ({
    polizza: !!(window.PolizzaDaPdf && PolizzaDaPdf.VERSIONE),
    importo: !!(window.Importo && Importo.VERSIONE),
    anagrafica: !!(window.Anagrafica && Anagrafica.valido),
    pdf: !!(window.PdfTesto && PdfTesto.testoPagine),
  }));
  deve(c.polizza, 'il motore delle polizze non è caricato');
  /* Senza il motore degli importi OGNI premio risulterebbe «non capito», e la
     schermata sembrerebbe rotta per un motivo che non è il suo. */
  deve(c.importo, 'il motore degli importi non è caricato: i premi non si leggerebbero');
  deve(c.anagrafica, 'il motore dell\'anagrafica non è caricato: i codici fiscali non si verificherebbero');
  deve(c.pdf, 'il motore di lettura dei PDF non è caricato');
});

prova('LA SCHERMATA RIEMPIE I CAMPI CON QUELLO CHE HA LETTO', async () => {
  await modulo();
  const r = await p.evaluate(({ pagine }) => {
    const lettura = PolizzaDaPdf.leggi(pagine);
    pcpRiempi(lettura, { azione: 'cliente_nuovo', conCodiceFiscale: true, perche: 'non in archivio', omonimi: [] });
    const v = (id) => (document.getElementById(id) || {}).value;
    return { numero: v('pnu-numero'), compagnia: v('pnu-compagnia'), effetto: v('pnu-effetto'),
      scadenza: v('pnu-scadenza'), fraz: v('pnu-fraz'), annuo: v('pnu-annuo'), rata: v('pnu-rata'),
      esito: (document.getElementById('pcp-esito') || {}).textContent || '' };
  }, PAGINE);
  deve(r.numero === '2026/A/0099431', 'il numero di polizza non arriva nel campo: «' + r.numero + '»');
  deve(r.compagnia === 'HDI', 'la compagnia non viene scelta nella tendina: «' + r.compagnia + '»');
  deve(r.effetto === '2026-03-01' && r.scadenza === '2027-03-01', 'le date non arrivano: ' + r.effetto + ' / ' + r.scadenza);
  deve(r.fraz === 'Semestrale', 'il frazionamento non arriva: «' + r.fraz + '»');
  deve(parseFloat(r.annuo) === 1248.6, 'il premio annuo non arriva: «' + r.annuo + '»');
  deve(parseFloat(r.rata) === 624.3, 'la rata non arriva: «' + r.rata + '»');
  deve(/pagina 1/.test(r.esito) && /pagina 2/.test(r.esito), 'il resoconto non dice da quale pagina viene ogni dato');
});

prova('UN VALORE CHE LA TENDINA NON PREVEDE NON SEMBRA SCELTO: SI DICE', async () => {
  /* È il guasto silenzioso di tutta la schermata. `pcpMetti` torna false e il
     resoconto lo scrive, invece di lasciare il valore di partenza a farsi
     passare per un dato letto dal documento. */
  await modulo();
  const r = await p.evaluate(() => {
    const prima = document.getElementById('pnu-fraz').value;
    const messo = pcpMetti('pnu-fraz', 'Unico');          /* l'elenco non ha «Unico» */
    const compagnia = pcpMetti('pnu-compagnia', 'Una Compagnia Che Non Esiste');
    return { messo, compagnia, prima, dopo: document.getElementById('pnu-fraz').value };
  });
  deve(r.messo === false, 'dice di aver messo un valore che la tendina non ha');
  deve(r.compagnia === false, 'dice di aver scelto una compagnia che non è in elenco');
  deve(r.dopo === r.prima, 'ha cambiato il campo pur non potendo metterci il valore');

  const detto = await p.evaluate(({ cf }) => {
    const lettura = PolizzaDaPdf.leggi([{ n: 1, testo:
      'ZURICH INSURANCE\nPolizza n. 99887766\nContraente: ROSSI MARIO\nCodice fiscale: ' + cf
      + '\nDecorrenza: 01/03/2026\nFrazionamento: Unico\nPremio annuo lordo: € 300,00' }]);
    pcpRiempi(lettura, { azione: 'cliente_nuovo', conCodiceFiscale: true, perche: 'non in archivio', omonimi: [] });
    return (document.getElementById('pcp-esito') || {}).textContent || '';
  }, PAGINE);
  deve(/non è fra quelle in anagrafica compagnie|la tendina non prevede/.test(detto),
    'quando un valore non entra nel campo la schermata non lo dice: ' + detto.slice(0, 300));
});

prova('IL CLIENTE NON SI AGGANCIA PER NOME, MAI', async () => {
  await modulo();
  const r = await p.evaluate(({ pagine }) => {
    const lettura = PolizzaDaPdf.leggi(pagine);
    pcpRiempi(lettura, { azione: 'scelta_a_mano', perche: 'ci sono due schede con un nome simile',
      omonimi: [{ id: 'c1', nominativo: 'ROSSI MARIO' }, { id: 'c2', nominativo: 'ROSSI MARIO', comune: 'PALERMO' }] });
    return { scelto: window.PNU_CLIENTE || (0, eval)('PNU_CLIENTE'),
      etichetta: (document.getElementById('pnu-cliente-sel') || {}).textContent || '',
      esito: (document.getElementById('pcp-esito') || {}).textContent || '' };
  }, PAGINE);
  deve(!r.scelto, 'ha agganciato un cliente partendo da un nome: ' + JSON.stringify(r.scelto));
  deve(/Nessun cliente scelto/.test(r.etichetta), 'l\'etichetta dice che un cliente è scelto: ' + r.etichetta);
  deve(/scegli tu|scegli/i.test(r.esito), 'non chiede di scegliere: ' + r.esito.slice(0, 200));
  deve(/PALERMO/.test(r.esito), 'non fa vedere le schede fra cui scegliere');
});

prova('COL CODICE FISCALE IL CLIENTE SI SCEGLIE DA SOLO, E L\'ETICHETTA LO DICE', async () => {
  await modulo();
  const r = await p.evaluate(({ pagine, cf }) => {
    const lettura = PolizzaDaPdf.leggi(pagine);
    pcpRiempi(lettura, { azione: 'cliente_trovato',
      cliente: { id: 'c7', nominativo: 'ROSSI MARIO', codice_fiscale: cf }, perche: 'trovato' });
    return { id: ((0, eval)('PNU_CLIENTE') || {}).id,
      etichetta: (document.getElementById('pnu-cliente-sel') || {}).textContent || '',
      campo: (document.getElementById('pnu-cliente-q') || {}).value || '' };
  }, PAGINE);
  deve(r.id === 'c7', 'non sceglie il cliente trovato col codice fiscale: ' + JSON.stringify(r));
  deve(/ROSSI MARIO/.test(r.etichetta), 'l\'etichetta non dice chi è stato scelto: ' + r.etichetta);
  /* Il campo a schermo deve dire la stessa cosa della variabile: se restasse
     vuoto, chi guarda crederebbe che nessun cliente sia stato scelto e ne
     sceglierebbe un altro sopra. */
  deve(/ROSSI MARIO/.test(r.campo), 'il campo del cliente resta vuoto pur essendo stato scelto: «' + r.campo + '»');
});

prova('UNA POLIZZA GIÀ IN ARCHIVIO SI DICHIARA, E PORTA A QUELLA CHE C\'È', async () => {
  await modulo();
  const esito = await p.evaluate(({ pagine }) => {
    const lettura = PolizzaDaPdf.leggi(pagine);
    pcpRiempi(lettura, { azione: 'gia_in_archivio',
      polizza: { id: 'p9', numero_polizza: '2026/A/0099431', cliente: 'ROSSI MARIO' },
      perche: 'esiste già' });
    return (document.getElementById('pcp-esito') || {}).innerHTML || '';
  }, PAGINE);
  deve(/già in archivio/i.test(esito), 'non dice che la polizza esiste già');
  deve(/polDettaglio\('p9'\)/.test(esito), 'non porta alla polizza che c\'è già');
});

prova('LA SCHERMATA DICE CHE IL LETTORE NON È ANCORA MISURATO SU POLIZZE VERE', async () => {
  /* Finché non si misura su tre o quattro polizze di compagnia, quello che il
     motore legge è una proposta. Dirlo accanto ai dati è l'unica cosa che
     impedisce di salvarli a occhi chiusi — e il giorno in cui la misura ci
     sarà, questa riga va tolta: è quello il momento in cui questa prova
     diventa rossa e obbliga a passare di qui. */
  await modulo();
  const esito = await p.evaluate(({ pagine }) => {
    pcpRiempi(PolizzaDaPdf.leggi(pagine), { azione: 'cliente_nuovo', perche: 'x', omonimi: [] });
    return (document.getElementById('pcp-esito') || {}).textContent || '';
  }, PAGINE);
  deve(/Controlla tutto prima di salvare/i.test(esito), 'non dice di controllare prima di salvare');
  deve(/non è ancora stato misurato su polizze vere/i.test(esito), 'non dichiara che il lettore non è misurato');
});

prova('APRIRE IL MODULO AZZERA LA PROVENIENZA DELLA VOLTA PRIMA', async () => {
  /* Senza, la seconda polizza scritta nella stessa sessione si porterebbe
     dietro la provenienza del PDF della prima: una prova FALSA, peggio di
     nessuna prova. */
  const r = await p.evaluate(({ pagine }) => {
    (0, eval)('PCP_LETTURA = PolizzaDaPdf.leggi(' + JSON.stringify(pagine) + ')');
    const prima = !!(0, eval)('PCP_LETTURA');
    let bd = document.getElementById('pol-bd');
    if (!bd) { bd = document.createElement('div'); bd.id = 'pol-bd'; document.body.appendChild(bd); }
    /* `pnuApri` chiede il database: si misura la riga che conta, cioè che
       l'apertura azzeri la provenienza. */
    (0, eval)('PCP_LETTURA = null');
    return { prima, dopo: !!(0, eval)('PCP_LETTURA') };
  }, PAGINE);
  deve(r.prima && !r.dopo, 'la provenienza non si azzera');
  /* e la riga che lo fa dev'essere DENTRO pnuApri, non solo qui nella prova */
  const dentro = await p.evaluate(() => String(window.pnuApri));
  deve(/PCP_LETTURA\s*=\s*null/.test(dentro), 'pnuApri non azzera PCP_LETTURA: la prova sopra misura solo se stessa');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPOLIZZA DA PDF NEL BROWSER');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
if (banco.errori.length) console.log('\nerrori di pagina: ' + banco.errori.slice(0, 3).join(' | '));
await banco.chiudi();
console.log('\nPOLIZZA NEL BROWSER: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
