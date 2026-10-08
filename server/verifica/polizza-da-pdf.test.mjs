/* ═══════════════════════════════════════════════════════════════════════════════
   UNA POLIZZA LETTA DAL SUO PDF — le prove                    (08/10/2026)

   Quello che queste prove difendono non è «il motore legge bene»: è che
   QUELLO CHE NON HA LETTO BENE LO DICA, invece di consegnare un dato
   credibile e falso a chi sta per salvarlo in archivio.

   Le tre cose che farebbero danno davvero, in ordine:
     1. la polizza di un cliente attaccata alla scheda di un ALTRO cliente;
     2. un premio o una scadenza letti male e salvati senza che nessuno guardi;
     3. un doppione: la stessa polizza caricata due volte.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ I DOCUMENTI DI PROVA SONO FINTI, E IL MOTORE NON È ANCORA MISURATO.       │
   └───────────────────────────────────────────────────────────────────────────┘
   In questo repository non c'è nemmeno una polizza vera: i PDF che ci sono
   sono set informativi e condizioni, cioè documenti di PRODOTTO. I documenti
   qui sotto sono costruiti sulle FORME del linguaggio comune dei contratti
   italiani, non sulla forma di una compagnia precisa — e questo vuol dire che
   queste prove dimostrano che le regole funzionano, NON che funzionano sulle
   polizze di HDI o di PRIMA.

   È già successo, e si sa come va a finire: il 02/10/2026 il lettore dei set
   informativi, tarato su una compagnia sola, trovava 12 garanzie su 17 su
   quella e 3 su AXA, 0 su HDI. Finché non si misura su tre o quattro polizze
   vere, questo motore è una proposta da correggere a mano.

       node server/verifica/polizza-da-pdf.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const P = (await import('file://' + path.join(RADICE, 'tariffe', 'motore', 'polizza-da-pdf.js'))).default;
const A = (await import('file://' + path.join(RADICE, 'tariffe', 'motore', 'anagrafica.js'))).default;

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Un codice fiscale INVENTATO ma valido: le prime quindici lettere sono di
   fantasia e la sedicesima la calcola il motore, così il carattere di
   controllo torna davvero. Nessun dato di nessun cliente entra in una prova. */
const CF = 'RSSMRA80A01H501' + A.controllo('RSSMRA80A01H501');
const CF_STORTO = 'RSSMRA80A01H501' + (CF[15] === 'A' ? 'B' : 'A');

/* Una polizza finta, nella forma in cui i contratti italiani scrivono le cose:
   l'etichetta e poi il valore. */
const POLIZZA = [
  { n: 1, testo: 'HDI ASSICURAZIONI S.p.A.\n'
      + 'CONTRATTO DI ASSICURAZIONE AUTOVETTURE\n'
      + 'Polizza n. 2026/A/0099431\n'
      + 'Contraente: ROSSI MARIO\n'
      + 'Codice fiscale: ' + CF + '\n'
      + 'Residente in VIA GARIBALDI 12 - 90133 PALERMO (PA)' },
  { n: 2, testo: 'Decorrenza: 01/03/2026 alle ore 24:00\n'
      + 'Scadenza: 01/03/2027\n'
      + 'Frazionamento: Semestrale\n'
      + 'Premio annuo lordo: € 1.248,60\n'
      + 'Premio della rata: € 624,30\n'
      + 'Targa: AB 123 CD\n'
      + 'Garanzie prestate: RCA, Furto e Incendio, Cristalli' },
];

// ── che cosa legge ───────────────────────────────────────────────────────────
prova('LEGGE I CAMPI DI UNA POLIZZA, E DICE DA QUALE PAGINA VIENE OGNUNO', () => {
  const r = P.leggi(POLIZZA);
  deve(r.ok, r.motivo);
  const v = (k) => r.campi[k] && r.campi[k].valore;
  deve(v('numero_polizza') === '2026/A/0099431', 'numero: ' + v('numero_polizza'));
  deve(v('compagnia') === 'HDI', 'compagnia: ' + v('compagnia'));
  deve(v('contraente') === 'ROSSI MARIO', 'contraente: ' + v('contraente'));
  deve(v('codice_fiscale') === CF, 'codice fiscale: ' + v('codice_fiscale'));
  deve(v('data_effetto') === '2026-03-01', 'decorrenza: ' + v('data_effetto'));
  deve(v('data_scadenza') === '2027-03-01', 'scadenza: ' + v('data_scadenza'));
  deve(v('frazionamento') === 'Semestrale', 'frazionamento: ' + v('frazionamento'));
  deve(v('premio_annuo') === 1248.6, 'premio annuo: ' + v('premio_annuo'));
  deve(v('premio_rata') === 624.3, 'rata: ' + v('premio_rata'));
  deve(v('targa') === 'AB123CD', 'targa: ' + v('targa'));
  /* OGNI VALORE PORTA LA SUA PAGINA. Davanti a una cifra che non torna si
     deve poter tornare al punto del documento, non ricominciare. */
  deve(r.campi.numero_polizza.pagina === 1 && r.campi.premio_annuo.pagina === 2,
    'le pagine non vengono registrate: ' + JSON.stringify(r.campi.premio_annuo));
  Object.keys(r.campi).forEach((k) => {
    if (r.campi[k]) deve(r.campi[k].pagina > 0 && r.campi[k].grezzo, 'il campo ' + k + ' non dice da dove viene');
  });
});

prova('LA COMPAGNIA SI RIPORTA ALLA PAROLA CHE L\'ARCHIVIO USA GIÀ', () => {
  /* In archivio ci sono 2.999 polizze «HDI» e 5 «HDI Assicurazioni»: la stessa
     compagnia scritta in due modi, e quelle 5 sfuggono a ogni conto. Il motore
     scrive sempre la parola che l'archivio usa di più. */
  const r = P.leggi([{ n: 1, testo: 'HDI Assicurazioni S.p.A. — Polizza n. 123456' }]);
  deve(r.campi.compagnia && r.campi.compagnia.valore === 'HDI',
    'scrive «' + (r.campi.compagnia || {}).valore + '» invece di «HDI»');
  const p = P.leggi([{ n: 1, testo: 'PRIMA ASSICURAZIONI S.p.A. polizza n. 999888' }]);
  deve(p.campi.compagnia && p.campi.compagnia.valore === 'PRIMA', 'PRIMA non viene riconosciuta');
});

prova('UN CODICE FISCALE NON ANNUNCIATO SI TROVA LO STESSO, SE SUPERA IL CONTROLLO', () => {
  const r = P.leggi([{ n: 1, testo: 'Polizza n. 445566\nROSSI MARIO ' + CF + ' PALERMO' }]);
  deve(r.campi.codice_fiscale && r.campi.codice_fiscale.valore === CF, 'non ha trovato il codice fiscale nudo');
  deve(!r.nonCapito.some((x) => x.campo === 'codice_fiscale'), 'lo dichiara non capito pur avendolo trovato');
});

// ── che cosa NON legge, e lo dice ────────────────────────────────────────────
prova('QUELLO CHE NON HA CAPITO LO DICHIARA, CON IL PERCHÉ', () => {
  const r = P.leggi([{ n: 1, testo: 'Polizza n. 778899\nContraente: ROSSI MARIO\nPremio: tanto' }]);
  deve(r.ok, r.motivo);
  const mancanti = r.nonCapito.map((x) => x.campo);
  ['data_effetto', 'premio_annuo', 'frazionamento', 'codice_fiscale'].forEach((k) => {
    deve(mancanti.indexOf(k) >= 0, 'non dichiara di non aver letto ' + k);
    deve(r.campi[k] === null, 'il campo ' + k + ' non è nullo ma non è stato letto');
  });
  r.nonCapito.forEach((x) => deve(x.perche && x.perche.length > 15,
    'il campo ' + x.campo + ' è dichiarato non capito senza spiegare perché'));
});

prova('UN CODICE FISCALE CHE NON SUPERA IL CONTROLLO NON SI USA', () => {
  /* Un refuso produce un codice credibile e falso. Un codice falso o aggancia
     la polizza al cliente sbagliato, o crea un doppione: tutte e due si
     scoprono tardi, e si riparano a mano. */
  const r = P.leggi([{ n: 1, testo: 'Polizza n. 112233\nCodice fiscale: ' + CF_STORTO }]);
  deve(!r.campi.codice_fiscale, 'ha accettato un codice fiscale col carattere di controllo sbagliato');
  const detto = r.nonCapito.find((x) => x.campo === 'codice_fiscale');
  deve(detto && /controllo/.test(detto.perche), 'non dice che il problema è il carattere di controllo: ' + JSON.stringify(detto));
});

prova('UNA DATA CON L\'ANNO A DUE CIFRE SI RIFIUTA', () => {
  deve(!P.leggiData('01/03/26').ok, 'accetta un anno a due cifre');
  deve(/due secoli|due cifre/.test(P.leggiData('01/03/26').perche), 'non spiega perché: ' + P.leggiData('01/03/26').perche);
  deve(!P.leggiData('31/02/2026').ok, 'accetta il 31 febbraio');
  deve(P.leggiData('01/03/2026').valore === '2026-03-01', 'non legge una data buona');
  deve(P.leggiData('2026-03-01').valore === '2026-03-01', 'non legge la forma internazionale');
  deve(!P.leggiData('01/03/1950').ok, 'accetta un anno impossibile per una polizza');
});

prova('UN PREMIO AMBIGUO SI RIFIUTA: È LO STESSO MOTORE DEL LINK DI PAGAMENTO', () => {
  /* «1.248» col punto può voler dire 1.248,00 € oppure 1,24 €. Sul premio di
     una polizza la differenza finisce in contabilità e nelle provvigioni. */
  deve(P.leggiEuro('1.248,60').valore === 1248.6, 'non legge un premio scritto bene');
  deve(!P.leggiEuro('1.248').ok, 'accetta un importo con due letture');
  deve(!P.leggiEuro('1248.60').ok, 'accetta il punto come separatore decimale');
});

prova('UNA PAROLA CHE L\'ARCHIVIO NON USA NON DIVENTA UN FRAZIONAMENTO NUOVO', () => {
  deve(P.leggiFrazionamento('semestrale').valore === 'Semestrale', 'non normalizza la maiuscola');
  deve(P.leggiFrazionamento('UNICA').valore === 'Unico', 'non riporta «unica» alla parola dell\'archivio');
  const no = P.leggiFrazionamento('bimestrale');
  deve(!no.ok && /archivio/.test(no.perche), 'accetta una parola che l\'archivio non conosce');
});

// ── la scansione ─────────────────────────────────────────────────────────────
prova('UNA SCANSIONE SI DICHIARA, E NON SI CONFONDE CON «NON HO TROVATO NIENTE»', () => {
  /* Sono due diagnosi opposte: la prima si risolve chiedendo alla compagnia il
     PDF vero, la seconda mettendosi a copiare a mano. */
  const vuoto = P.leggi([{ n: 1, testo: '' }, { n: 2, testo: '   ' }]);
  deve(!vuoto.ok && vuoto.scansione === true, 'un PDF senza parole non si dichiara scansione');
  deve(/scansione|immagine/.test(vuoto.motivo), 'il motivo non nomina la scansione: ' + vuoto.motivo);
  /* «Zero parole» è un fatto, «quasi certamente una scansione» è un giudizio:
     chi legge deve sapere quale dei due gli stiamo dicendo, perché il primo
     chiude il discorso e il secondo no. Senza questa riga le due diagnosi
     possono diventare la stessa frase e nessuno se ne accorge — un guasto
     della controprova lo ha mostrato. */
  deve(/nessuna parola leggibile/.test(vuoto.motivo),
    'su un PDF con zero parole non dice il fatto, dice un\'impressione: ' + vuoto.motivo);

  /* IL CASO CHE IL LETTORE DEI SET INFORMATIVI NON PRENDEVA: la scansione con
     sopra due righe di testo vero (il numero di pagina, un timbro, un OCR
     parziale). Lì i caratteri non sono zero, e un controllo su «zero» la
     lascerebbe passare per documento leggibile. */
  const quasi = P.leggi([{ n: 1, testo: 'pag. 1' }, { n: 2, testo: 'pag. 2' }, { n: 3, testo: '- 3 -' }]);
  deve(!quasi.ok && quasi.scansione === true,
    'una scansione con due righe di testo passa per documento leggibile: ' + JSON.stringify(quasi).slice(0, 200));
});

// ── i controlli che si possono fare da soli ──────────────────────────────────
prova('DUE DATE O DUE IMPORTI CHE NON STANNO IN PIEDI DIVENTANO UN AVVISO', () => {
  const r = P.leggi([{ n: 1, testo: 'Polizza n. 445566\nDecorrenza: 01/03/2027\nScadenza: 01/03/2026\n'
    + 'Premio annuo lordo: € 300,00\nPremio della rata: € 500,00' }]);
  deve(r.avvisi.length >= 2, 'non si accorge né della scadenza prima della decorrenza né della rata più alta del premio: '
    + JSON.stringify(r.avvisi));
  deve(r.avvisi.some((a) => /scadenza/i.test(a)), 'manca l\'avviso sulle date');
  deve(r.avvisi.some((a) => /rata/i.test(a)), 'manca l\'avviso sugli importi');
});

prova('LA COMPLETEZZA SI DICHIARA, PER POTER DIRE «CONTROLLA TUTTO»', () => {
  const pieno = P.leggi(POLIZZA);
  deve(pieno.completezza.presi === pieno.completezza.su, 'sul documento pieno mancherebbe qualcosa: '
    + JSON.stringify(pieno.completezza));
  const scarso = P.leggi([{ n: 1, testo: 'Contraente: ROSSI MARIO e poi parecchie altre parole di contorno' }]);
  deve(scarso.completezza.presi === 0 && scarso.completezza.mancanti.length === P.ESSENZIALI.length,
    'la completezza non dice quanto manca: ' + JSON.stringify(scarso.completezza));
});

// ── LA DECISIONE: a quale cliente va questa polizza ──────────────────────────
prova('IL CLIENTE SI RICONOSCE DAL CODICE FISCALE', () => {
  const r = P.leggi(POLIZZA);
  const d = P.decide(r, { clientePerCf: { id: 'c1', nominativo: 'ROSSI MARIO' }, omonimi: [], polizzaPerNumero: null });
  deve(d.azione === 'cliente_trovato' && d.cliente.id === 'c1', 'non riconosce il cliente dal codice fiscale: ' + JSON.stringify(d));
});

prova('UN NOME CHE COMBACIA NON BASTA MAI: SI SCEGLIE A MANO', () => {
  /* È la regola che vale più di tutte. Due persone fuse in una scheda sola non
     si scoprono il giorno dopo: si scoprono quando una delle due telefona per
     una polizza intestata a un altro. */
  const senzaCf = P.leggi([{ n: 1, testo: 'Polizza n. 445566\nContraente: ROSSI MARIO\nDecorrenza: 01/03/2026' }]);
  deve(!senzaCf.campi.codice_fiscale, 'la prova non misura quello che crede: il codice fiscale c\'è');
  const d = P.decide(senzaCf, { clientePerCf: null, polizzaPerNumero: null,
    omonimi: [{ id: 'c1', nominativo: 'ROSSI MARIO' }, { id: 'c2', nominativo: 'ROSSI MARIO' }] });
  deve(d.azione === 'scelta_a_mano', 'con due omonimi e nessun codice fiscale ha deciso da solo: ' + JSON.stringify(d));
  deve(!d.cliente, 'ha comunque agganciato un cliente');
  deve(d.omonimi.length === 2, 'non porta a schermo le schede fra cui scegliere');
});

prova('SENZA CODICE FISCALE E SENZA OMONIMI SI PROPONE UNA SCHEDA NUOVA, DICENDO IL RISCHIO', () => {
  const senzaCf = P.leggi([{ n: 1, testo: 'Polizza n. 445566\nContraente: VERDI GIUSEPPE\nDecorrenza: 01/03/2026' }]);
  const d = P.decide(senzaCf, { clientePerCf: null, omonimi: [], polizzaPerNumero: null });
  deve(d.azione === 'cliente_nuovo' && d.conCodiceFiscale === false, 'non propone la scheda nuova: ' + JSON.stringify(d));
  deve(/doppione/.test(d.perche), 'non dice che una scheda senza codice fiscale rischia di diventare un doppione');
});

prova('LA STESSA POLIZZA NON SI CARICA DUE VOLTE', () => {
  /* Il numero di polizza ha un indice UNICO in archivio (misurato il
     08/10/2026: 7.149 polizze su 7.154 ne hanno uno). Un secondo inserimento
     verrebbe rifiutato dal database con un errore che non spiega niente:
     meglio dirlo prima, e portare alla polizza che c'è già. */
  const r = P.leggi(POLIZZA);
  const d = P.decide(r, { clientePerCf: { id: 'c1' }, omonimi: [],
    polizzaPerNumero: { id: 'p9', numero_polizza: '2026/A/0099431' } });
  deve(d.azione === 'gia_in_archivio', 'carica un doppione: ' + JSON.stringify(d));
  deve(d.polizza.id === 'p9', 'non porta alla polizza che c\'è già');
});

// ── i record da scrivere ─────────────────────────────────────────────────────
prova('I RECORD ESCONO NELLE PAROLE CHE L\'ARCHIVIO USA GIÀ', () => {
  const r = P.leggi(POLIZZA);
  const { anagrafica, polizza } = P.perSalvare(r, {});
  deve(anagrafica.tipo === 'fisica', 'il tipo non è quello delle altre schede: ' + anagrafica.tipo);
  deve(anagrafica.codice_fiscale === CF, 'il codice fiscale non arriva sulla scheda');
  deve(anagrafica.fonte === 'polizza_pdf', 'la scheda non dice da dove viene');
  deve(polizza.data_effetto === '2026-03-01' && polizza.frazionamento === 'Semestrale', 'i campi non arrivano sulla polizza');
  deve(polizza.premio_annuo === 1248.6, 'il premio non arriva sulla polizza');
  /* NESSUN mezzo di pagamento inventato: è una chiave esterna, e un codice che
     non esiste fa fallire l'inserimento. */
  deve(polizza.mezzo_pagamento === undefined, 'il motore propone un mezzo di pagamento che non ha letto');
});

prova('LA PROVA DI DOVE VIENE OGNI NUMERO RESTA ATTACCATA ALLA POLIZZA', () => {
  const r = P.leggi(POLIZZA);
  const { polizza } = P.perSalvare(r, {});
  const prov = polizza.dati.letto_da_pdf.provenienza;
  deve(prov.premio_annuo && prov.premio_annuo.pagina === 2, 'la provenienza del premio non è registrata');
  deve(prov.premio_annuo.grezzo === '1.248,60', 'non resta il testo grezzo letto sul documento');
  deve(polizza.dati.letto_da_pdf.versione_motore === P.VERSIONE, 'non resta scritto quale motore ha letto');
  deve(polizza.fonte === 'polizza_pdf', 'la polizza non dice che viene da un PDF');
});

prova('SE IL CLIENTE È GIÀ SCELTO NON SI PREPARA NESSUNA SCHEDA NUOVA', () => {
  const r = P.leggi(POLIZZA);
  const { anagrafica, polizza } = P.perSalvare(r, { clienteId: 'c1' });
  deve(anagrafica === null, 'prepara una scheda nuova per un cliente che esiste già');
  deve(polizza.cliente_id === 'c1', 'la polizza non si aggancia al cliente scelto');
});

prova('QUELLO CHE MANCA PER SALVARE SI DICE PRIMA', () => {
  const vuoto = P.leggi([{ n: 1, testo: 'Un documento con qualche parola ma nessun dato di contratto dentro' }]);
  const p = P.problemi(vuoto, {});
  deve(p.length >= 3, 'non elenca quello che manca: ' + JSON.stringify(p));
  deve(p.some((x) => /decorrenza/i.test(x)), 'non dice che manca la decorrenza, che è l\'unica che il database pretende');
  const pieno = P.problemi(P.leggi(POLIZZA), { clienteId: 'c1' });
  deve(pieno.length === 0, 'su un documento completo elenca problemi che non ci sono: ' + JSON.stringify(pieno));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPOLIZZA DA PDF — leggere un contratto e proporlo, senza indovinare');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
console.log('\nPOLIZZA DA PDF: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
