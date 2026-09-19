// ═══════════════════════════════════════════════════════════════════════════════
//  IL FLUSSO DI PORTAFOGLIO DELLE COMPAGNIE — tariffe/motore/flusso-ssf.js
//  (18/09/2026)
//
//  QUALI DATI GIRANO QUI DENTRO. Un campione SINTETICO
//  (`campioni/ssf/`), scritto a mano con la stessa forma del file vero:
//  nomi, codici fiscali, targhe e partite IVA sono inventati. Il file vero
//  dell'agenzia non entra nel repository, ed è una regola di casa, non una
//  preferenza (CLAUDE.md §8.3): contiene nome, indirizzo, telefono, email e
//  codice fiscale di clienti veri.
//
//  Il campione è costruito perché contenga TUTTI i casi che sul file vero si
//  incontrano: un cliente società, un doppione dentro lo stesso flusso, una
//  polizza senza contraente, una semestrale, una cessata a scadenza, una
//  annullata davvero, un'offerta di rinnovo, un titolo di tipo sconosciuto.
//  Le prove che seguono sono quelle che, se saltano, producono numeri
//  credibili e falsi: un portafoglio dimezzato, uno scadenzario pieno di
//  scadenze a quindici giorni, i propri collaboratori fra i clienti.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('../../tariffe/motore/flusso-ssf.js');

const QUI = path.dirname(fileURLToPath(import.meta.url));
const CAMPIONI = path.join(QUI, 'campioni', 'ssf');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il campione si legge dai CSV: lo zip ha la sua prova a parte. */
const mappa = {};
for (const f of fs.readdirSync(CAMPIONI)) {
  if (f.endsWith('.csv')) mappa[f] = fs.readFileSync(path.join(CAMPIONI, f), 'utf8');
}
const RACCOLTA = F.raccogli(mappa);
const A = F.analizza(RACCOLTA.record);
const cerca = (n) => A.polizze.find(p => p.numero_polizza === n);
/* Il piano su un gestionale vuoto: e' quello che si vedrebbe caricando questo
   flusso la prima volta. Le prove che parlano di «quante rate da incassare»
   guardano qui, perche' e' quello che si vede nell'anteprima. */
const P = F.piano(A, {});

prova('i nove file si riconoscono dal nome, e quello che non si riconosce si dichiara', () => {
  deve(RACCOLTA.trovati >= 8, 'record riconosciuti: ' + RACCOLTA.trovati);
  deve(!RACCOLTA.ignorati.length, 'file non riconosciuti: ' + RACCOLTA.ignorati.join(', '));
  deve(F.tipoDaNome('REC020_M_PRIMA_A2194_20260917040040_P.csv') === '020', 'il nome vero non si riconosce');
  /* Un file che non c'entra niente non deve entrare come se fosse un record:
     verrebbe letto come CSV e produrrebbe righe senza senso. */
  deve(F.tipoDaNome('elenco clienti.xlsx') === null, 'un file qualunque passa per un record del flusso');
  deve(F.tipoDaNome('REC999_X.csv') === null, 'un tipo di record che non esiste viene accettato');
  return RACCOLTA.trovati + ' record, 0 ignorati';
});

prova('la testata dice chi manda il flusso e di che giorni parla', () => {
  deve(A.testata.emittente === 'COMPAGNIA_DI_PROVA', 'emittente: ' + A.testata.emittente);
  deve(A.testata.versione === 'SSF V12', 'versione tracciato: ' + A.testata.versione);
  deve(A.testata.dal === '2026-09-16' && A.testata.al === '2026-09-16', 'periodo: ' + A.testata.dal + '→' + A.testata.al);
  deve(A.testata.intermediario === 'A9999', 'intermediario: ' + A.testata.intermediario);
  return A.testata.emittente + ' · ' + A.testata.versione;
});

prova('REGOLA 1 · i collaboratori non sono clienti', () => {
  /* Nel file vero del 17/09/2026: 37 righe in REC010, di cui 17 sono i
     propri sub-agenti. Importarle tutte vorrebbe dire mettere la rete di
     vendita dentro il portafoglio clienti, e da lì non si tira più fuori. */
  deve(A.clienti.length === 4, 'clienti letti: ' + A.clienti.length + ' (attesi 4)');
  deve(!A.clienti.some(c => /COLLABORATORE|STUDIO DI PROVA/.test(c.nominativo || '')), 'un collaboratore è finito fra i clienti');
  deve(A.collaboratori.length === 3, 'collaboratori: ' + A.collaboratori.length + ' (2 da REC010 + 1 solo in REC101)');
  return '4 clienti, 3 collaboratori, nessuno dei due nell\'elenco dell\'altro';
});

prova('persona fisica e società si distinguono, e il cognome si stacca dal nome', () => {
  const p = A.clienti.find(c => c.codice_fiscale === 'RSSMRA80A01H501U');
  deve(p && p.tipo === 'fisica', 'una persona con codice fiscale risulta ' + (p && p.tipo));
  /* `LUNGHEZZA_COGNOME` dice quanti caratteri del nominativo sono il cognome:
     senza, «ROSSI MARIO» si spezzerebbe a occhio, e su «DE LUCA ANNA MARIA»
     si sbaglierebbe. */
  deve(p.cognome === 'ROSSI' && p.nome === 'MARIO', 'cognome/nome: ' + p.cognome + ' / ' + p.nome);
  const s = A.clienti.find(c => c.partita_iva === '12345678901');
  deve(s && s.tipo === 'giuridica', 'una società con partita IVA risulta ' + (s && s.tipo));
  deve(s.ragione_sociale === 'OFFICINA DI PROVA S.R.L.', 'la ragione sociale tiene il trattino iniziale: ' + s.ragione_sociale);
  deve(!s.codice_fiscale, 'alla società è stato inventato un codice fiscale');
  return 'fisica con cognome staccato, giuridica con partita IVA';
});

prova('REGOLA 2 · il premio della polizza è la RATA, e l\'annuo non si stima', () => {
  /* Misurato sul file vero: su una semestrale la polizza dice 110,00 e i due
     titoli dell'anno sommano 220,00. Scrivere 110 in `premio_annuo`
     dimezzerebbe il valore del portafoglio su ogni polizza frazionata — e
     110 è un numero credibile, quindi non se ne accorgerebbe nessuno.
     Moltiplicare la rata per il numero di rate sarebbe una stima, e una
     stima in un portafoglio diventa un dato dopo due settimane. */
  const annuale = cerca('NP-0001'), semestrale = cerca('NP-0002');
  deve(annuale.premio_rata === 300 && annuale.premio_annuo === 300, 'annuale: rata ' + annuale.premio_rata + ' annuo ' + annuale.premio_annuo);
  deve(semestrale.premio_rata === 110, 'semestrale, rata: ' + semestrale.premio_rata);
  deve(semestrale.premio_annuo === null, 'semestrale, annuo: ' + semestrale.premio_annuo + ' — non si sa, e si scrive che non si sa');
  deve(semestrale.frazionamento === 'Semestrale', 'frazionamento tradotto in: ' + semestrale.frazionamento);
  deve(semestrale.dati.ssf.rate_anno === 2, 'le rate all\'anno non sono annotate');
  return 'annuale 300/300, semestrale 110/da confermare';
});

prova('REGOLA 3 · un\'offerta di rinnovo non è una polizza', () => {
  /* Nel file vero sono righe in stato PV: `EFFETTO` è la data del rinnovo e
     `SCADENZA_EFFETTIVA` è EFFETTO + 15 giorni, cioè il termine per pagare.
     Importarle come polizze riempirebbe lo scadenzario di scadenze false a
     due settimane. Il discriminante buono non è lo stato ma
     `SCADENZA_EMESSO`: se è vuoto, non è stato emesso niente. */
  deve(A.offerte.length === 1, 'offerte riconosciute: ' + A.offerte.length);
  deve(!cerca('NP-0005'), 'l\'offerta di rinnovo è entrata in portafoglio');
  const o = A.offerte[0];
  deve(o.numero_polizza === 'NP-0005', 'l\'offerta è ' + o.numero_polizza);
  deve(o._sostituisce === 'NP-0003', 'non si sa quale polizza sta rinnovando: ' + o._sostituisce);
  /* Non si buttano via: sono clienti da chiamare prima che scada il termine,
     ed è la cosa più utile che c'è in questo file. */
  const p = F.piano(A, {});
  deve(p.offerte.length === 1 && p.offerte[0].entro === '2027-02-15', 'il piano non dice entro quando si paga: ' + JSON.stringify(p.offerte));
  return '1 offerta, fuori dal portafoglio e dentro l\'elenco da chiamare';
});

prova('REGOLA 4 · la scadenza naturale non è un annullamento', () => {
  /* Prima non ha tacito rinnovo: alla scadenza la polizza «storna» con la
     data di annullamento UGUALE alla scadenza, e ne nasce una nuova. Nel
     file vero sono 9 righe su 32, e sei scadono nei mesi successivi.
     Segnarle annullate le toglierebbe dallo scadenzario: sono esattamente
     quelle da richiamare. */
  const naturale = cerca('NP-0003');
  deve(naturale, 'la polizza che cessa a scadenza non è stata importata: sparirebbe dal portafoglio');
  deve(naturale.stato_pagamento !== 'annullata', 'cessa alla sua scadenza e risulta annullata');
  deve(naturale.data_scadenza === '2027-01-31', 'perde la scadenza da cui dipende il rinnovo: ' + naturale.data_scadenza);
  const annullata = cerca('NP-0004');
  deve(annullata.stato_pagamento === 'annullata', 'una polizza cessata PRIMA della scadenza non risulta annullata: ' + annullata.stato_pagamento);
  deve(annullata.dati.ssf.data_annullamento === '2026-09-01', 'non si sa quando è stata annullata');
  return 'cessata a scadenza resta viva fino al 31/01, annullata prima è annullata';
});

prova('REGOLA 5 · la compagnia è chi emette il flusso, il rischio si conserva accanto', () => {
  /* L'emittente è la compagnia con cui si lavora, ed è su quel nome che sono
     scritte le regole documentali (§11). Il portatore del rischio è un'altra
     cosa e serve in sinistro: si tiene, non si butta. */
  const p = cerca('NP-0001');
  deve(p.compagnia === 'COMPAGNIA_DI_PROVA', 'compagnia scritta sulla polizza: ' + p.compagnia);
  deve(p.dati.ssf.compagnia_rischio === 'PORTATORE_RISCHIO', 'si perde chi porta il rischio: ' + p.dati.ssf.compagnia_rischio);
  deve(p.dati.ssf.compagnia_ania === '0999', 'si perde il codice ANIA');
  return 'emittente sulla polizza, portatore del rischio conservato';
});

prova('date, importi e vocabolari: quello che non si sa tradurre resta vuoto', () => {
  deve(F.data('25/10/2026') === '2026-10-25', 'la data all\'italiana non si converte');
  deve(F.data('') === null && F.data('boh') === null, 'una data illeggibile diventa qualcosa');
  deve(F.numero('1.234,56') === 1234.56, 'il punto delle migliaia mangia il numero: ' + F.numero('1.234,56'));
  deve(F.numero('243,48') === 243.48, 'la virgola decimale non si legge');
  /* Un importo che non si legge NON diventa 0: uno zero si somma agli altri
     e nessuno se ne accorge. */
  deve(F.numero('') === null && F.numero('n.d.') === null, 'un importo illeggibile diventa zero');
  const casa = cerca('NP-0007');
  deve(casa.modulo === 'beni', 'il ramo HOME finisce in: ' + casa.modulo);
  deve(cerca('NP-0001').modulo === 'rca', 'il ramo MOTOR non diventa rca');
  /* Il 18/09/2026 il vocabolario si è allargato: PayPal, le prepagate e i
     pagamenti «da fuori» adesso hanno un nome, perché una rata incassata
     senza mezzo di pagamento è un buco in contabilità. La REGOLA non è
     cambiata — quello che non si sa tradurre resta vuoto — è cambiato che
     cosa sappiamo tradurre, e l'esempio si sposta su un codice che davvero
     non conosciamo. Il codice della compagnia si conserva sempre accanto. */
  const t = A.titoli.find(x => x._fonte_id === 'T2');
  deve(t.mezzo_pagamento === 'paypal', 'PayPal non viene riconosciuto: ' + t.mezzo_pagamento);
  deve(t._ssf.mezzo === 'PAYPAL', 'il mezzo vero della compagnia si perde');
  deve(F.mezzoDa('UN_MEZZO_CHE_NON_ESISTE') === null, 'un mezzo sconosciuto viene tradotto lo stesso');
  return 'date ISO, importi col punto, vocabolari senza invenzioni';
});

prova('un titolo di un tipo che non conosciamo non entra in contabilità', () => {
  /* Nel file vero è un record `RI` da 0,00. Farlo entrare come rata
     metterebbe in contabilità una rata da zero euro, che poi qualcuno va a
     cercare. */
  deve(!A.titoli.some(t => t._fonte_id === 'T3'), 'il titolo di tipo sconosciuto è entrato');
  deve(A.avvisi.some(a => /RI/.test(a.t)), 'non viene detto che un titolo è stato saltato: ' + JSON.stringify(A.avvisi));
  const pagato = A.titoli.find(t => t._fonte_id === 'T1');
  deve(pagato.stato === 'incassato' && pagato.incassato_il === '2026-09-10', 'il titolo pagato non risulta incassato');
  deve(pagato.provvigione === 30, 'si perde la provvigione: ' + pagato.provvigione);
  /* «incassato» solo con la data di pagamento del cliente: uno stato senza
     una data è una promessa, e in contabilità non si incassa una promessa. */
  const aperto = A.titoli.find(t => t._fonte_id === 'T2');
  deve(aperto.stato === 'aperto', 'una rata senza data di pagamento risulta ' + aperto.stato);
  return '1 saltato e dichiarato, 1 incassato con la sua data, 1 aperto';
});

prova('una polizza il cui contraente non è nel flusso non si importa a metà', () => {
  const p = F.piano(A, {});
  deve(p.polizze.senzaCliente.length === 1, 'polizze senza contraente: ' + p.polizze.senzaCliente.length);
  deve(!p.polizze.nuove.some(x => x.numero_polizza === 'NP-0006'), 'una polizza senza cliente è fra quelle da scrivere');
  deve(A.avvisi.some(a => /NP-0006/.test(a.t)), 'non viene detto quale polizza resta fuori');
  return '1 polizza sospesa e dichiarata, non scritta a metà';
});

prova('LA REGOLA CHE COMANDA · il cliente che c\'è già non si sostituisce', () => {
  /* Il flusso porta i dati come li ha scritti il cliente sul sito della
     compagnia; la scheda in agenzia l'ha sistemata qualcuno a mano.
     Sovrascriverla vorrebbe dire buttare via quel lavoro ogni notte. */
  const esistenti = { clientiPerCf: { RSSMRA80A01H501U: 'id-gia-nostro' } };
  const p = F.piano(A, esistenti);
  /* Due: la stessa persona compare nel flusso con due chiavi diverse, e tutte
     e due devono portare alla SUA scheda. Una polizza intestata alla seconda
     chiave, agganciata a un'anagrafica nuova, sarebbe il doppione visto dal
     verso opposto. */
  deve(p.clienti.gia.length === 2, 'clienti riconosciuti come già presenti: ' + p.clienti.gia.length);
  deve(p.clienti.idPerChiave['RSSMRA80A01H501U-M-A9999'] === 'id-gia-nostro', 'la polizza non si aggancia alla scheda che c\'è già');
  deve(p.clienti.idPerChiave['RSSMRA80A01H501U-M-A9998'] === 'id-gia-nostro', 'la seconda chiave della stessa persona porta altrove');
  deve(!p.clienti.nuovi.some(c => c.codice_fiscale === 'RSSMRA80A01H501U'), 'il cliente che c\'è già verrebbe riscritto');
  /* E si aggancia anche per partita IVA, che per una società è la chiave. */
  const p2 = F.piano(A, { clientiPerPiva: { '12345678901': 'id-societa' } });
  deve(p2.clienti.idPerChiave['PIVA12345678901-A9999'] === 'id-societa', 'la società non si riconosce dalla partita IVA');
  return '1 agganciato per codice fiscale, 1 per partita IVA, 0 sovrascritti';
});

prova('due righe con lo stesso codice fiscale dentro il flusso non fanno due clienti', () => {
  /* Il campione ha la stessa persona con due chiavi diverse
     (`…-A9999` e `…-A9998`). Senza questo controllo il flusso creerebbe da
     solo il doppione che stiamo evitando. */
  const p = F.piano(A, {});
  const conCf = p.clienti.nuovi.filter(c => c.codice_fiscale === 'RSSMRA80A01H501U');
  deve(conCf.length === 1, 'lo stesso codice fiscale entrerebbe ' + conCf.length + ' volte');
  return 'una persona, una scheda';
});

prova('il secondo caricamento dello stesso file non duplica niente', () => {
  /* È la prova che rende l'importazione una cosa che si può rifare senza
     paura: lo stesso flusso arriva tutte le notti, e i giorni si
     sovrappongono. Senza chiave di provenienza, ogni notte raddoppierebbe il
     portafoglio. */
  const primo = F.piano(A, {});
  const esistenti = {
    clientiPerCf: {}, clientiPerPiva: {},
    polizzePerFonte: {}, titoliPerFonte: {}
  };
  primo.clienti.nuovi.forEach((c, i) => {
    if (c.codice_fiscale) esistenti.clientiPerCf[c.codice_fiscale] = 'cli-' + i;
    if (c.partita_iva) esistenti.clientiPerPiva[c.partita_iva] = 'cli-' + i;
  });
  primo.polizze.nuove.forEach((x, i) => { esistenti.polizzePerFonte[x._fonte_id] = 'pol-' + i; });
  primo.titoli.nuovi.forEach((x, i) => { esistenti.titoliPerFonte[x._fonte_id] = 'tit-' + i; });
  const secondo = F.piano(A, esistenti);
  deve(secondo.clienti.nuovi.length === 0, 'al secondo giro creerebbe ' + secondo.clienti.nuovi.length + ' clienti');
  deve(secondo.polizze.nuove.length === 0, 'al secondo giro creerebbe ' + secondo.polizze.nuove.length + ' polizze');
  deve(secondo.titoli.nuovi.length === 0, 'al secondo giro creerebbe ' + secondo.titoli.nuovi.length + ' titoli');
  deve(secondo.niente === true, 'il piano non dice che non c\'è niente da fare');
  deve(secondo.polizze.gia.length === primo.polizze.nuove.length, 'le polizze già importate non si riconoscono');
  return 'secondo giro: 0 clienti, 0 polizze, 0 titoli';
});

prova('veicolo e garanzie restano attaccati alla polizza', () => {
  const p = cerca('NP-0001');
  deve(p.dati.ssf.veicolo && p.dati.ssf.veicolo.targa === 'AA000AA', 'la targa si perde');
  deve(p.dati.ssf.garanzie.length === 2, 'garanzie sulla polizza: ' + p.dati.ssf.garanzie.length);
  const somma = p.dati.ssf.garanzie.reduce((s, g) => s + (g.lordo || 0), 0);
  deve(Math.abs(somma - p.premio_rata) < 0.01, 'le garanzie sommano ' + somma + ' e la polizza dice ' + p.premio_rata);
  return '1 veicolo, 2 garanzie che sommano al premio';
});

await (async () => {
  const zip = path.join(CAMPIONI, 'flusso-di-collaudo.zip');
  esiti.push({ nome: 'lo zip si apre senza librerie, leggendo l\'indice e non le intestazioni locali', fn: null, asincrona: async () => {
    /* Niente JSZip da un CDN: il contenitore di collaudo non lo raggiunge, e
       sarebbe una dipendenza in più da tenere aggiornata. Si legge l'indice
       dello zip e si scompatta con `DecompressionStream`, che c'è nei
       browser e in Node.
       Si legge l'INDICE apposta: nelle intestazioni locali le misure possono
       essere a zero e arrivare dopo i dati, e chi le legge si ritrova file
       vuoti senza un errore. */
    const m = await F.apriZip(fs.readFileSync(zip));
    const nomi = Object.keys(m);
    deve(nomi.length >= 8, 'dallo zip escono ' + nomi.length + ' file');
    deve(nomi.some(n => /REC020/.test(n)), 'nello zip non si trova il record delle polizze');
    const r = F.raccogli(m);
    const a = F.analizza(r.record);
    deve(a.polizze.length === A.polizze.length, 'dallo zip escono ' + a.polizze.length + ' polizze invece di ' + A.polizze.length);
    deve(a.clienti.length === A.clienti.length, 'dallo zip escono clienti diversi');
    return nomi.length + ' file, stesso risultato dei CSV sciolti';
  } });
})();

/* ══ L'ALTRO TRACCIATO: SSF V8 (19/09/2026) ══════════════════════════════════
   Il flusso di Plurima è lo stesso standard in una versione precedente: sei
   file invece di nove, metà delle colonne, e i file si chiamano in un altro
   modo. Il lettore si fermava al primo passo — «il file vero non ha testata»,
   che sembra un archivio rotto e invece era un archivio che non sapevamo
   aprire.

   Il campione qui sotto è sintetico e ricalca quello vero nei casi che
   contano, compresi i due che si scoprono solo guardandolo: la provvigione
   dichiarata ZERO su ogni rata, e `DATA_ANNULLAMENTO` valorizzata anche sulle
   polizze attive. */
const CAMPIONI8 = path.join(QUI, 'campioni', 'ssf-v8');
const mappa8 = {};
for (const f of fs.readdirSync(CAMPIONI8)) {
  if (f.endsWith('.csv')) mappa8[f] = fs.readFileSync(path.join(CAMPIONI8, f), 'utf8');
}
const R8 = F.raccogli(mappa8);
const A8 = F.analizza(R8.record);

prova('V8 · i file si chiamano in un altro modo, e si riconoscono lo stesso', () => {
  deve(R8.trovati === 6, 'record riconosciuti: ' + R8.trovati + ' su 6 — ' + R8.ignorati.join(', '));
  deve(F.tipoDaNome('SSF_20_polizze.csv') === '020', 'SSF_20 → ' + F.tipoDaNome('SSF_20_polizze.csv'));
  deve(F.tipoDaNome('SSF_00_testa.csv') === '000', 'SSF_00 → ' + F.tipoDaNome('SSF_00_testa.csv'));
  /* Il numero non è a tre cifre: `100` non deve diventare `010`, altrimenti il
     catalogo prodotti si legge come le anagrafiche. */
  deve(F.tipoDaNome('SSF_100_prodotti.csv') === '100', 'SSF_100 → ' + F.tipoDaNome('SSF_100_prodotti.csv'));
  deve(F.tipoDaNome('SSF_10_anagrafiche.csv') === '010', 'SSF_10 → ' + F.tipoDaNome('SSF_10_anagrafiche.csv'));
  deve(F.tipoDaNome('SSF_101_collaboratori.csv') === '101', 'SSF_101 → ' + F.tipoDaNome('SSF_101_collaboratori.csv'));
  /* E il modo vecchio continua a funzionare. */
  deve(F.tipoDaNome('REC020_M_PRIMA_A2194_2026_P.csv') === '020', 'il nome V12 non si riconosce più');
  return '6 record, due modi di chiamarli';
});

prova('V8 · senza SCADENZA_EMESSO le polizze NON diventano tutte offerte', () => {
  /* È il guasto che avrebbe fatto più danno: quella colonna in V8 non esiste,
     e leggerla come vuota vuol dire «non è mai stato emesso niente» su OGNI
     riga. Sul file vero di Plurima sarebbero state venti polizze su venti a
     non entrare in portafoglio. */
  deve(A8.polizze.length === 4, 'polizze importate: ' + A8.polizze.length + ' (attese 4)');
  deve(A8.offerte.length === 1, 'offerte: ' + A8.offerte.length + ' (attesa 1, quella in stato PV)');
  deve(A8.offerte[0].numero_polizza === 'V8-0003', 'l\'offerta è ' + A8.offerte[0].numero_polizza);
  /* E il ripiego si dichiara, invece di far finta di essere la regola vera. */
  deve(A8.tracciato.senza.some(s => /offerte di rinnovo/.test(s)), 'il tracciato non dichiara come distingue le offerte');
  return '4 polizze, 1 offerta (dallo stato), e il ripiego dichiarato';
});

prova('V8 · «la colonna non c\'è» non è «la colonna è vuota»', () => {
  /* La differenza si vede confrontando i due tracciati: in V12 una polizza
     senza `SCADENZA_EMESSO` È un'offerta, in V8 quel campo non esiste e la
     stessa lettura darebbe la risposta opposta a quella giusta. */
  const v12 = A.polizze.length, v8 = A8.polizze.length;
  deve(v12 > 0 && v8 > 0, 'uno dei due tracciati non importa niente: ' + v12 + ' / ' + v8);
  deve(A.tracciato.senza.length < A8.tracciato.senza.length,
       'il V12 dichiara di non portare tante cose quanto il V8: ' + A.tracciato.senza.length + ' / ' + A8.tracciato.senza.length);
  return 'V12 dichiara ' + A.tracciato.senza.length + ' mancanze, V8 ' + A8.tracciato.senza.length;
});

prova('V8 · i collaboratori si riconoscono dai produttori, non da un flag', () => {
  /* `FLAG_COLLABORATORE` in V8 non c'è: senza una seconda strada, la rete di
     vendita finirebbe nel portafoglio clienti (regola 1). */
  deve(A8.clienti.length === 3, 'clienti: ' + A8.clienti.length + ' (attesi 3: A9 è un collaboratore)');
  deve(!A8.clienti.some(c => c._chiave === 'A9'), 'un collaboratore è entrato fra i clienti');
  deve(A8.collaboratori.length === 2, 'collaboratori: ' + A8.collaboratori.length);
  /* Uno dei due non ha un'anagrafica (come nel file vero): entra lo stesso,
     con il suo codice produttore. */
  const c77 = A8.collaboratori.find(c => c.codice === 'C77');
  deve(c77 && c77.produttore === 'P-0077', 'il produttore senza anagrafica si perde: ' + JSON.stringify(c77));
  /* L'altro ce l'ha, e allora arriva anche la sua email. */
  const a9 = A8.collaboratori.find(c => c.codice === 'A9');
  deve(a9 && a9.email === 'collab@esempio.test', 'l\'email del collaboratore con anagrafica: ' + JSON.stringify(a9));
  return '3 clienti, 2 collaboratori, 1 con email';
});

prova('V8 · il codice produttore sta sull\'anagrafica, non sulla polizza', () => {
  const sua = A8.polizze.find(p => p.numero_polizza === 'V8-0002');
  deve(sua.dati.ssf.collaboratore === 'C77',
       'la polizza non eredita il codice dal suo contraente: ' + sua.dati.ssf.collaboratore);
  /* E le polizze dell'agenzia restano SENZA codice: `AGENZIA` (3489) non è un
     collaboratore, ed è la colonna che verrebbe voglia di usare. */
  const diretta = A8.polizze.find(p => p.numero_polizza === 'V8-0001');
  deve(!diretta.dati.ssf.collaboratore, 'il codice agenzia è diventato un collaboratore: ' + diretta.dati.ssf.collaboratore);
  return 'C77 alla sua polizza, niente sulle dirette';
});

prova('V8 · DATA_ANNULLAMENTO su una polizza ATTIVA non la annulla', () => {
  /* Sul file vero è valorizzata su tutte e venti le polizze, che sono tutte
     `AT`. Non è un annullamento: somiglia a una scadenza. Leggerla come fa la
     V12 toglierebbe dal portafoglio l'intero flusso. */
  const attiva = A8.polizze.find(p => p.numero_polizza === 'V8-0005');
  deve(attiva.dati.ssf.data_annullamento, 'il campione non riproduce il caso: la data non c\'è');
  deve(attiva.stato_pagamento !== 'annullata', 'una polizza attiva è stata annullata: ' + attiva.stato_pagamento);
  /* E quella cessata davvero PRIMA della scadenza sì. */
  const cessata = A8.polizze.find(p => p.numero_polizza === 'V8-0004');
  deve(cessata.stato_pagamento === 'annullata', 'la cessata prima della scadenza non è annullata: ' + cessata.stato_pagamento);
  return '1 attiva con la data, 1 annullata davvero';
});

prova('V8 · una provvigione dichiarata ZERO non è una provvigione assente', () => {
  /* Le due cose si somigliano e l'estratto conto le tratta in modo opposto:
     uno zero è un accordo e si conta, un vuoto esce dai totali col motivo.
     Il flusso di Plurima manda `0,00` su ogni rata — e chi guarda deve saperlo
     prima di credere che sia il gestionale a sbagliare i conti. */
  deve(A8.titoli.every(t => t.provvigione === 0), 'le provvigioni non sono tutte zero: ' + JSON.stringify(A8.titoli.map(t => t.provvigione)));
  deve(A8.tracciato.senza.some(s => /provvigione 0,00/.test(s)), 'il tracciato non dichiara le provvigioni a zero');
  deve(!A8.tracciato.senza.some(s => /NESSUNA provvigione/.test(s)), 'lo zero è stato letto come «non dichiarata»');
  return 'zero dichiarato, e detto';
});

prova('V8 · senza SCADENZA_INCASSATO non si deduce nessuna rata', () => {
  /* La rata successiva si deduce da «fin dove è pagata»: quel campo in V8 non
     c'è, e dedurre senza sarebbe inventare un credito. */
  deve(!(A8.titoli || []).some(t => t._generato), 'una rata è stata dedotta senza il dato che serve');
  deve(A8.tracciato.senza.some(s => /rata successiva non si può dedurre/.test(s)), 'il tracciato non lo dichiara');
  return 'nessuna rata inventata';
});

prova('M3.1 · la data di nascita che il flusso non porta si ricava dal codice fiscale — valido', () => {
  /* C4 ha il codice fiscale e nessuna DATA_NASCITA: la si ricava. C1 ha
     tutte e due: vince quella del flusso, e non si dice «ricavata». */
  /* La chiave del cliente è codice fiscale + tipo + agenzia, non l'ID del
     file: C4 è la riga dell'agenzia A9998, C1 quella di A9999. */
  const c4 = A.clienti.find(c => /A9998$/.test(c._chiave));
  deve(c4 && c4.data_nascita === '1980-01-01' && c4._nascita_da_cf === true, 'C4: ' + JSON.stringify(c4 && { d: c4.data_nascita, cf: c4._nascita_da_cf }));
  const c1 = A.clienti.find(c => /^RSSMRA80A01H501U-M-A9999$/.test(c._chiave));
  deve(c1 && c1.data_nascita === '1980-01-01' && c1._nascita_da_cf === false, 'C1: la data del flusso non vince');
  /* Il V8 di collaudo ha codici fiscali SINTETICI col controllo sbagliato:
     non deve uscire nessuna data ricavata, e le date del file restano. */
  deve(!A8.clienti.some(c => c._nascita_da_cf), 'nel V8 una data è stata ricavata da un codice non valido');
  deve(A8.clienti.some(c => c.data_nascita), 'nel V8 le date del file sono sparite');
  return 'C4 ricavata, C1 dal flusso, V8 niente inventato';
});

prova('M1.2 · la data di emissione esce in una colonna sua, e dove il tracciato non la porta resta vuota', () => {
  /* Nel V12 sta in DATA_EMISSIONE; P1 la porta (10/09/2026), P2 no. Non si
     ricava dall'effetto: si emette PRIMA di decorrere, a volte settimane
     prima, e una data indovinata nel filtro «emesse a settembre» è una
     polizza contata nel mese sbagliato. */
  const p1 = A.polizze.find(p => p._fonte_id === 'P1');
  deve(p1 && p1.data_emissione === '2026-09-10', 'P1: ' + (p1 && p1.data_emissione));
  const p2 = A.polizze.find(p => p._fonte_id === 'P2');
  deve(p2 && p2.data_emissione === null, 'P2 senza data ha una data: ' + (p2 && p2.data_emissione));
  deve(p1.dati.ssf.data_emissione === '2026-09-10', 'la copia dentro dati.ssf è sparita');
  /* V8: la colonna NON C'È. Tutte vuote, e il tracciato lo dichiara. */
  deve(A8.polizze.every(p => p.data_emissione === null), 'nel V8 qualche polizza ha una data di emissione inventata');
  deve(A8.tracciato.senza.some(s => /data di emissione/.test(s)), 'il V8 non dichiara che manca la data di emissione');
  deve(!A.tracciato.senza.some(s => /data di emissione/.test(s)), 'il V12 dichiara una mancanza che non ha');
  return 'V12: P1 10/09/2026, P2 vuota · V8: tutte vuote e dichiarato';
});

prova('V8 · lo zip si apre e dà lo stesso risultato dei CSV sciolti', () => {
  esiti.push({ nome: 'V8 · lo zip (asincrona)', fn: null, asincrona: async () => {
    const m = await F.apriZip(fs.readFileSync(path.join(CAMPIONI8, 'flusso-v8-di-collaudo.zip')));
    const a = F.analizza(F.raccogli(m).record);
    deve(a.polizze.length === A8.polizze.length && a.clienti.length === A8.clienti.length,
         'dallo zip escono numeri diversi: ' + a.polizze.length + '/' + a.clienti.length);
    return Object.keys(m).length + ' file, stesso risultato';
  } });
  return 'programmata';
});

/* ── la prova sul file VERO, se c'è ───────────────────────────────────────────
   Il file vero non sta nel repository. Se qualcuno lo mette nella cartella di
   lavoro (`FLUSSO_VERO=/percorso/al/file.zip`), questa prova gira anche su
   quello: è l'unico modo di accorgersi che una compagnia ha cambiato il
   tracciato. Se non c'è, si dice «saltata» e si va avanti — un rosso per un
   file assente sarebbe un rosso per la strada, non per il contenuto. */
const VERO = process.env.FLUSSO_VERO;

/* ══ QUELLO CHE SI BUTTAVA E ADESSO SERVE (18/09/2026) ═══════════════════════
   Tre dati che il file portava e che finivano nel cestino: l'email dei
   collaboratori, il dettaglio garanzia per garanzia con le provvigioni, e il
   mezzo di pagamento fuori dai cinque che il gestionale conosceva. */

prova('l\'email del collaboratore arriva, ed e\' l\'unico ponte verso le persone in agenzia', () => {
  /* I codici della compagnia («U25337») non li conosce nessuno: senza email
     quei collaboratori restano numeri che non si possono abbinare a una
     persona. Sul file vero l'email c'e' su 17 su 17. */
  const c = A.collaboratori.find(x => x.codice === 'U90001');
  deve(c, 'il collaboratore non c\'e\' nell\'elenco');
  deve(c.email === 'collab1@esempio.test', 'email: ' + c.email);
  deve(c.nome === 'STUDIO DI PROVA S.R.L.', 'il trattino iniziale resta nel nome: ' + c.nome);
  /* Chi compare solo fra i produttori (REC101) entra lo stesso: e' un
     collaboratore che in questo periodo non ha prodotto. */
  const solo101 = A.collaboratori.find(x => x.codice === 'U90003');
  deve(solo101, 'un collaboratore presente solo in REC101 sparisce');
  deve(solo101.polizze === 0 && solo101.provvigioni === 0, 'a chi non ha prodotto vengono attribuiti numeri');
  return A.collaboratori.length + ' collaboratori, ' + A.collaboratori.filter(x => x.email).length + ' con email';
});

prova('il codice produttore e il RUI arrivano, e sono due cose diverse dal codice delle polizze', () => {
  /* 19/09/2026. `ID_ANAGRAFICA_EXP` è la chiave con cui le POLIZZE nominano il
     collaboratore; `CODICE_PRODUTTORE` è come lo chiama la compagnia; `COD_RUI`
     è il numero con cui è iscritto al registro, cioè l'unico dei tre che dice
     CHI È e non come lo si chiama. Tenerne uno solo vuol dire non riconoscerlo
     più, o abbinarlo con l'evidenza più debole che c'è. */
  const c = A.collaboratori.find(x => x.codice === 'U90001');
  deve(c.produttore === 'P-7788', 'il codice produttore si perde: ' + c.produttore);
  deve(c.rui === 'E000111111', 'il RUI si perde: ' + c.rui);
  deve(c.codice !== c.produttore, 'il campione non distingue più i due codici: la prova non misura niente');
  const senzaRui = A.collaboratori.find(x => x.codice === 'U90003');
  deve(senzaRui.produttore === 'P-9900' && !senzaRui.rui, 'chi non ha il RUI: ' + JSON.stringify(senzaRui.rui));
  return 'U90001 per le polizze, P-7788 per la compagnia, E000111111 al registro';
});

prova('si sa chi ha prodotto che cosa, e non si aggancia nessuno da solo', () => {
  const c = A.collaboratori.find(x => x.codice === 'U90001');
  deve(c.polizze === 2, 'titoli attribuiti: ' + c.polizze + ' (attesi 2)');
  deve(Math.abs(c.provvigioni - 41) < 0.01, 'provvigioni: ' + c.provvigioni + ' (attese 41,00)');
  /* Il piano dice se quell'email e' gia' una persona in agenzia, ma non crea
     e non aggancia niente: il registro unico delle persone e' un'altra cosa,
     e agganciare a occhio su un'email fa i doppioni che quel lavoro ha tolto. */
  const p = F.piano(A, { collaboratoriPerEmail: { 'collab1@esempio.test': 'persona-1' } });
  const r = p.collaboratori.find(x => x.codice === 'U90001');
  deve(r.riconosciuto === true && r.persona_id === 'persona-1', 'chi c\'e\' gia\' non viene riconosciuto');
  const sconosciuto = p.collaboratori.find(x => x.codice === 'U90002');
  deve(sconosciuto.riconosciuto === false && sconosciuto.persona_id === null, 'a chi non c\'e\' viene inventata una persona');
  deve(Math.abs(p.provvigioni - 41) < 0.01, 'provvigioni del flusso: ' + p.provvigioni);
  return '2 titoli e 41,00 a U90001; 1 riconosciuto, 1 no, 0 creati';
});

prova('il dettaglio garanzia per garanzia resta attaccato alla rata', () => {
  /* Sul file vero la somma delle provvigioni di garanzia fa ESATTAMENTE il
     totale del titolo, su 18 titoli su 18: e' un dato che quadra, e dice su
     quale garanzia si guadagna — che e' un'altra cosa dal guadagno sulla
     polizza. */
  const t = A.titoli.find(x => x._fonte_id === 'T1');
  deve(t._ssf.garanzie.length === 2, 'garanzie sulla rata: ' + t._ssf.garanzie.length);
  const somma = t._ssf.garanzie.reduce((s, g) => s + (g.provvigioni || 0), 0);
  deve(Math.abs(somma - t.provvigione) < 0.01, 'le garanzie sommano ' + somma + ' e la rata dice ' + t.provvigione);
  const rca = t._ssf.garanzie.find(g => g.codice === 'RCA');
  deve(rca && rca.provvigioni === 25, 'la provvigione della RCA: ' + (rca && rca.provvigioni));
  return '2 garanzie che sommano alla provvigione della rata';
});

prova('il mezzo di pagamento non resta vuoto, e quello che non si sa non si inventa', () => {
  /* Prima il gestionale conosceva cinque mezzi e tutto il resto finiva a
     NULL: una rata incassata senza mezzo e' un buco in contabilita'. */
  deve(F.mezzoDa('CREDITCARD') === 'carta_credito', 'carta di credito: ' + F.mezzoDa('CREDITCARD'));
  deve(F.mezzoDa('PAYPAL') === 'paypal', 'PayPal: ' + F.mezzoDa('PAYPAL'));
  deve(F.mezzoDa('PREPAID') === 'prepagata', 'prepagata: ' + F.mezzoDa('PREPAID'));
  /* Una lista di modi possibili vuol dire che la compagnia NON sa quale sia
     stato usato: «altro» e' la verita', prendere il primo della lista sarebbe
     inventare. */
  deve(F.mezzoDa('APPLEPAY/CREDITCARD/GOOGLEPAY/PAYPAL/PREPAID') === 'altro', 'lista multipla: ' + F.mezzoDa('APPLEPAY/CREDITCARD/GOOGLEPAY'));
  deve(F.mezzoDa('BITCOIN') === null, 'un codice sconosciuto diventa qualcosa: ' + F.mezzoDa('BITCOIN'));
  deve(F.mezzoDa('') === null, 'un campo vuoto diventa qualcosa');
  /* E la polizza lo porta in una colonna sua, perche' e' una cosa che si
     guarda e si corregge, non un dettaglio sepolto dentro `dati`. */
  const p = cerca('NP-0002');
  deve(p.mezzo_pagamento === 'paypal', 'sulla polizza: ' + p.mezzo_pagamento);
  deve(cerca('NP-0007').mezzo_pagamento === 'bonifico', 'bonifico non riconosciuto');
  /* Il vocabolario e' uno solo: quello che traduce il flusso e' quello che
     riempie la tendina con cui si corregge. */
  deve(F.MEZZI.length === 9 && F.MEZZI.every(m => m.id && m.l), 'il vocabolario dei mezzi e\' incompleto');
  return '9 mezzi, i codici ignoti restano vuoti';
});

/* ═══════════════════════════════════════════════════════════════════════════
   LA RATA CHE RESTA DA INCASSARE (18/09/2026)

   Su una polizza frazionata la compagnia manda la rata successiva SOLO quando
   l'ha gia' emessa. Sul file vero succede due volte su venticinque; per tutte
   le altre quella rata esiste, il cliente la deve, e nessuno la vede. Il
   flusso lo dice in date: pagata fino al X, in corsa fino al Y.
   ═══════════════════════════════════════════════════════════════════════════ */

prova('una rata scoperta si deduce dal frazionamento, con l\'importo della rata precedente', () => {
  /* NP-0008: semestrale, pagata fino al 01/01/2027, in corsa fino al
     01/07/2027. Un semestre esatto scoperto, e nessun titolo nel flusso. */
  const dedotte = P.titoli.dedotti;
  deve(dedotte.length === 1, 'rate dedotte: ' + dedotte.length + ' (attesa 1, su NP-0008)');
  const t = dedotte[0];
  deve(t.data_decorrenza === '2027-01-01', 'decorre dal ' + t.data_decorrenza + ' invece che dal giorno in cui finisce l\'incassato');
  deve(t.importo_lordo === 145, 'importo: ' + t.importo_lordo + ' (la rata precedente vale 145,00)');
  deve(t.stato === 'aperto', 'stato: ' + t.stato + ' — una rata dedotta non e\' mai incassata');
  deve(t.provvigione === null, 'alla rata dedotta viene attribuita una provvigione: ' + t.provvigione);
  /* Si deve riconoscere a occhio che non l'ha mandata la compagnia: una riga
     di contabilita' indistinguibile da quelle vere e' una riga di cui non ci
     si puo' fidare. */
  deve(/dedotta/i.test(t.note || ''), 'la nota non dice che l\'abbiamo dedotta noi: ' + t.note);
  deve(/:RATA:/.test(t._fonte_id), 'la provenienza non si distingue: ' + t._fonte_id);
  return 'NP-0008 → rata 01/01/2027 da 145,00, aperta e dichiarata';
});

prova('quello che la compagnia ha gia\' mandato non si duplica', () => {
  /* NP-0002 e' semestrale come NP-0008, ma la sua seconda rata (T2, SE,
     16/03/2027) sta gia' nel flusso: la regola deve stare zitta. */
  const sue = A.titoli.filter(t => t._polizza === 'P2');
  deve(sue.length === 1, 'rate su NP-0002: ' + sue.length + ' — la seconda e\' stata duplicata');
  deve(sue[0]._fonte_id === 'T2' && !sue[0]._generato, 'la rata di NP-0002 non e\' piu\' quella della compagnia');
  /* E il conto di chi guarda: due rate da incassare in tutto — quella che
     manda la compagnia e quella che deduciamo noi. */
  deve(P.titoli.daIncassare.length === 2, 'rate da incassare: ' + P.titoli.daIncassare.length + ' (attese 2)');
  return 'NP-0002 resta con la sua rata sola; 2 da incassare in tutto';
});

prova('un pezzo scoperto piu\' corto di una rata non diventa un importo inventato', () => {
  /* NP-0009 (ed e' il caso VERO del file di Prima, BLP156705551): pagata fino
     al 17/12/2026, in corsa fino al 07/03/2027. Fra le due date ci sono meno
     di sei mesi: quanto vale quel troncone non lo dice nessuno, e scriverci
     dentro il semestre pieno metterebbe in contabilita' un credito falso. */
  const dedotta = P.titoli.dedotti.find(t => /^P9:/.test(t._fonte_id));
  deve(!dedotta, 'e\' stata dedotta una rata su NP-0009, con un importo che il flusso non dice');
  const avviso = A.avvisi.find(x => /NP-0009/.test(x.t));
  deve(avviso, 'il pezzo scoperto sparisce in silenzio: nessun avviso su NP-0009');
  deve(/a mano/.test(avviso.t), 'l\'avviso non dice che cosa deve fare chi legge: ' + avviso.t);
  return 'NP-0009 → nessun numero inventato, un avviso che lo dice';
});

prova('le regole di prudenza: niente rata dedotta dove non ne esiste una', () => {
  const base = { _fonte_id: 'X', numero_polizza: 'X', premio_rata: 100, data_scadenza: '2027-07-01',
                 stato_pagamento: 'pagato', dati: { ssf: { rate_anno: 2, scadenza_incassato: '2027-01-01' } } };
  const con = o => { const p = JSON.parse(JSON.stringify(base)); for (const k in o) p[k] = o[k]; return p; };
  deve(F.rataDaIncassare(con({}), []).titolo, 'il caso normale non produce piu\' niente');
  /* Annuale: la rata successiva e' il rinnovo, che e' un'altra cosa e arriva
     col flusso di allora. */
  const annuale = con({}); annuale.dati.ssf.rate_anno = 1;
  deve(F.rataDaIncassare(annuale, []) === null, 'su una polizza annuale viene dedotta una rata');
  /* Un'offerta di rinnovo non e' una polizza (regola 3), e una polizza
     annullata non deve piu' niente (regola 4). */
  deve(F.rataDaIncassare(con({ _offerta: true }), []) === null, 'un\'offerta produce una rata da incassare');
  deve(F.rataDaIncassare(con({ stato_pagamento: 'annullata' }), []) === null, 'a una polizza annullata si chiede ancora la rata');
  /* Pagata fino alla scadenza: non c\'e\' niente di scoperto. */
  const saldata = con({}); saldata.dati.ssf.scadenza_incassato = '2027-07-01';
  deve(F.rataDaIncassare(saldata, []) === null, 'su una polizza saldata viene dedotta una rata');
  /* Senza importo di rata non si scrive un numero: si avvisa. */
  const senzaImporto = F.rataDaIncassare(con({ premio_rata: null }), []);
  deve(senzaImporto && senzaImporto.avviso && !senzaImporto.titolo, 'senza importo di rata viene scritto un titolo lo stesso');
  return '6 casi: 1 rata, 4 silenzi, 1 avviso';
});

prova('i mesi si contano sull\'anniversario, non sui giorni', () => {
  /* 31/08 + un semestre e\' il 28 febbraio, non il 3 marzo: `setMonth` da
     solo trabocca nel mese dopo, e una rata che decorre dal 3 marzo invece
     che dal 28 febbraio e\' una rata sbagliata di tre giorni su ogni
     scadenzario. */
  deve(F.aggiungiMesi('2026-08-31', 6) === '2027-02-28', '31/08 + 6 mesi: ' + F.aggiungiMesi('2026-08-31', 6));
  deve(F.aggiungiMesi('2027-08-31', 6) === '2028-02-29', 'l\'anno bisestile: ' + F.aggiungiMesi('2027-08-31', 6));
  deve(F.aggiungiMesi('2026-09-16', 6) === '2027-03-16', 'il caso normale: ' + F.aggiungiMesi('2026-09-16', 6));
  deve(F.aggiungiMesi('2026-12-01', 1) === '2027-01-01', 'il cambio d\'anno: ' + F.aggiungiMesi('2026-12-01', 1));
  deve(F.aggiungiMesi('', 6) === null, 'una data vuota produce una data');
  return '31/08 + 6 mesi = 28/02 (29/02 se bisestile)';
});

/* ═══════════════════════════════════════════════════════════════════════════
   LE RATE CHE RESTANO FUORI SI VEDONO, COI LORO NUMERI (18/09/2026)

   Sul portafoglio completo compaiono quattro tipi di titolo che questo lettore
   non sa tradurre: `PS`, `ARM`, `ANN`, `RI`. Un titolo e' una riga di soldi, e
   tradurne uno a occhio vuol dire mettere in contabilita' un importo che
   nessuno ha dichiarato. Restano fuori — ma restare fuori in silenzio, o
   ridotti a un conteggio, vuol dire che nessuno potra' mai decidere che cosa
   sono. Servono i numeri.
   ═══════════════════════════════════════════════════════════════════════════ */

prova('le rate di tipo ignoto non entrano, ma portano con se\' tutto quello che serve a riconoscerle', () => {
  const ig = P.titoli.ignoti;
  deve(ig.length === 4, 'rate di tipo ignoto: ' + ig.length + ' (attese 4: PS, ARM, ANN, RI)');
  /* Nessuna di loro e' finita in contabilita'. */
  deve(!A.titoli.some(t => ['T3', 'T5', 'T6', 'T7'].includes(t._fonte_id)), 'una rata di tipo ignoto e\' entrata in contabilita\'');
  const ps = ig.find(x => x.tipo_share === 'PS');
  deve(ps.importo === 47.5, 'l\'importo non arriva: ' + ps.importo);
  deve(ps.provvigione === 4.75, 'la provvigione non arriva: ' + ps.provvigione);
  deve(ps.numero_polizza === 'NP-0001' && ps.cliente === 'ROSSI MARIO', 'non si sa su quale polizza e di chi: ' + ps.numero_polizza + ' / ' + ps.cliente);
  deve(ps.data === '2026-09-20', 'la data non arriva: ' + ps.data);
  /* Il nome che le da' la compagnia e' meta' dell'indizio: `ANN`/`ANU` con un
     importo NEGATIVO ha tutta l'aria di uno storno, ma «ha l'aria» non basta
     per scriverlo in contabilita'. Il dato si mostra, la decisione e' di una
     persona. */
  const ann = ig.find(x => x.tipo_share === 'ANN');
  deve(ann.tipo_compagnia === 'ANU', 'il nome della compagnia si perde: ' + ann.tipo_compagnia);
  deve(ann.importo === -110, 'il segno dell\'importo si perde: ' + ann.importo);
  return '4 fuori, tutte con polizza, cliente, data, importo e provvigione';
});

prova('un avviso solo per tutte, coi codici e le quantita\'', () => {
  /* Quattro riquadri che dicono la stessa cosa con una sigla diversa si
     leggono come quattro guasti, e la cosa da fare e' una sola. */
  const suTitoli = A.avvisi.filter(a => /non entra/.test(a.t));
  deve(suTitoli.length === 1, 'avvisi sui titoli ignoti: ' + suTitoli.length + ' (ne basta 1)');
  const t = suTitoli[0].t;
  ['PS', 'ARM', 'ANN', 'RI'].forEach(k => deve(t.includes('«' + k + '»'), 'l\'avviso non nomina il codice ' + k + ': ' + t));
  deve(/×1/.test(t), 'l\'avviso non dice quanti sono per codice: ' + t);
  /* E deve dire che cosa fare, non solo che c'e' un problema. */
  deve(/dimmi che cosa sono/.test(t), 'l\'avviso non dice come si risolve: ' + t);
  return '1 avviso, 4 codici, con le quantita\' e la via d\'uscita';
});

prova('aggiungere un tipo e\' una riga sola, e quel tipo entra davvero', () => {
  /* La controprova del contrario: finche' un codice non c'e' nella tabella
     resta fuori; appena c'e', entra come tutti gli altri. Se questa prova
     fallisse, vorrebbe dire che la tabella non e' il punto in cui si decide,
     e che il codice andrebbe cercato altrove. */
  deve(!F.TIPO_TITOLO.PS, 'PS e\' gia\' tradotto: questa prova non misura piu\' niente');
  F.TIPO_TITOLO.PS = 'appendice';
  try {
    const dopo = F.analizza(RACCOLTA.record);
    const entrata = dopo.titoli.find(t => t._fonte_id === 'T5');
    deve(entrata && entrata.tipo === 'appendice', 'aggiunto alla tabella, il tipo non entra lo stesso');
    deve(entrata.importo_lordo === 47.5 && entrata.provvigione === 4.75, 'entra con numeri diversi da quelli del file');
    deve(!dopo.titoliIgnoti.some(x => x.tipo_share === 'PS'), 'resta anche fra gli ignoti');
  } finally { delete F.TIPO_TITOLO.PS; }
  return 'PS fuori senza la riga, dentro con la riga';
});

console.log('\n══ FLUSSO DI PORTAFOGLIO (SSF) ══');
let ko = 0, salt = 0;
for (const e of esiti) {
  try {
    const r = e.asincrona ? await e.asincrona() : e.fn();
    console.log('  ok  ' + e.nome + (r ? '  — ' + r : ''));
  } catch (err) { ko++; console.log('  ❌  ' + e.nome + '\n      ' + err.message); }
}
if (VERO && fs.existsSync(VERO)) {
  try {
    const m = await F.apriZip(fs.readFileSync(VERO));
    const a = F.analizza(F.raccogli(m).record);
    deve(a.testata.emittente, 'il file vero non ha testata');
    deve(a.polizze.length + a.offerte.length > 0, 'dal file vero non esce nessuna polizza');
    deve(!a.avvisi.some(x => x.g === 'grave'), 'avvisi gravi sul file vero: ' + a.avvisi.filter(x => x.g === 'grave').map(x => x.t).join(' | '));
    console.log('  ok  il file vero si legge  — ' + a.testata.emittente + ': ' + a.clienti.length + ' clienti, '
      + a.polizze.length + ' polizze, ' + a.offerte.length + ' offerte, ' + a.titoli.length + ' titoli');
  } catch (err) { ko++; console.log('  ❌  il file vero si legge\n      ' + err.message); }
} else {
  salt++;
  console.log('  ··  saltata: la prova sul file vero (nessun FLUSSO_VERO indicato — i dati veri non stanno nel repository)');
}
console.log('\nFLUSSO SSF: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite' + (salt ? ', ' + salt + ' saltata' : ''));
process.exit(ko ? 1 : 0);
