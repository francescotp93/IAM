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
  /* PayPal non è nessuna delle cinque voci che il gestionale conosce
     (`quote_titoli.mezzo_pagamento` ha un vincolo di valore): forzarlo a
     «carta di credito» sporcherebbe i conti. */
  const t = A.titoli.find(x => x._fonte_id === 'T2');
  deve(t.mezzo_pagamento === null, 'PayPal è stato tradotto in ' + t.mezzo_pagamento);
  deve(t._ssf.mezzo === 'PAYPAL', 'il mezzo vero della compagnia si perde');
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

/* ── la prova sul file VERO, se c'è ───────────────────────────────────────────
   Il file vero non sta nel repository. Se qualcuno lo mette nella cartella di
   lavoro (`FLUSSO_VERO=/percorso/al/file.zip`), questa prova gira anche su
   quello: è l'unico modo di accorgersi che una compagnia ha cambiato il
   tracciato. Se non c'è, si dice «saltata» e si va avanti — un rosso per un
   file assente sarebbe un rosso per la strada, non per il contenuto. */
const VERO = process.env.FLUSSO_VERO;

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
