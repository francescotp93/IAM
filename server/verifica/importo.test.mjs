/* ═══════════════════════════════════════════════════════════════════════════════
   UN IMPORTO IN EURO, LETTO SENZA INDOVINARE — le prove      (06/10/2026)

   Queste prove difendono una cosa sola, e non è un dettaglio di disegno: una
   richiesta di pagamento che parte a un cliente deve portare l'importo che
   l'operatore ha scritto, oppure non partire.

   La riga da cui nascono, misurata sul lato server installato il 06/10/2026:
   «170.00» diventava 17.000,00 €. Il caso sta qui sotto per nome, perché una
   prova che non contiene il guasto che l'ha generata non difende niente.

       node server/verifica/importo.test.mjs
   ═══════════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const Importo = (await import('file://' + path.join(RADICE, 'tariffe', 'motore', 'importo.js'))).default
  || (await import('file://' + path.join(RADICE, 'tariffe', 'motore', 'importo.js')));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* ── le scritture che hanno un solo significato ───────────────────────────── */
prova('UNA SCRITTURA CHIARA DIVENTA I CENTESIMI GIUSTI', () => {
  const casi = [
    ['1500', 150000], ['170,5', 17050], ['170,50', 17050], ['0,99', 99],
    ['1.500,00', 150000], ['1.500.000', 150000000], ['999,99', 99999],
    ['  170,00  ', 17000], ['€ 170,00', 17000], ['170,00 €', 17000],
    ['1\u00a0500', 150000],   /* spazio indivisibile: arriva dai fogli di calcolo */
  ];
  casi.forEach(([scritto, atteso]) => {
    const r = Importo.leggi(scritto);
    deve(r.ok, 'rifiuta «' + scritto + '» che è chiaro: ' + r.motivo);
    deve(r.cents === atteso, '«' + scritto + '» -> ' + r.cents + ' centesimi invece di ' + atteso);
  });
});

prova('IL GUASTO DEL 06/10/2026: UN PUNTO NON DIVENTA CENTO VOLTE TANTO', () => {
  /* Il lato server faceva: togli tutti i punti, poi virgola -> punto.
     «170.00» -> «17000» -> 17.000,00 €. Qui dentro quella lettura non deve
     esistere: né come risultato, né come interpretazione silenziosa. */
  ['170.00', '150.50', '1.500', '0.99'].forEach((s) => {
    const r = Importo.leggi(s);
    deve(!r.ok, '«' + s + '» ha due letture e questa ne ha scelta una: ' + JSON.stringify(r));
  });
  /* E la prova che misura la REGOLA e non la parola: qualunque cosa esca da
     una scrittura col punto ambiguo, non deve MAI essere la lettura
     «migliaia». Se un domani si decidesse di accettarla, dovrebbe essere la
     lettura decimale — quella che l'operatore vede sulla tastiera. */
  const r = Importo.leggi('170.00');
  deve(r.cents !== 1700000, 'ha letto 170.00 come 17.000,00 €: è esattamente il guasto');
});

prova('IL MOTIVO DEL RIFIUTO FA VEDERE LE DUE LETTURE E LA FORMA GIUSTA', () => {
  /* Un rifiuto che dice solo «importo non valido» manda l'operatore a
     riscrivere la stessa cosa. Deve dire che cosa ha letto e come si scrive. */
  const r = Importo.leggi('150.50');
  deve(!r.ok, 'accetta 150.50');
  deve(r.motivo.indexOf('150,50 €') >= 0, 'non fa vedere la lettura decimale: ' + r.motivo);
  deve(r.motivo.indexOf('15.050,00 €') >= 0, 'non fa vedere la lettura migliaia: ' + r.motivo);
  deve(/virgola/i.test(r.motivo), 'non dice come si scrive: ' + r.motivo);
});

prova('QUELLO CHE NON È UN IMPORTO SI RIFIUTA, E NON DIVENTA ZERO', () => {
  const casi = ['', '   ', 'abc', '-5', '0', '0,00', '170,005', '170,0,0', ',50', '170,',
    '1.50,00', '12.34.56', '1500abc', '€', '170-00'];
  casi.forEach((s) => {
    const r = Importo.leggi(s);
    deve(!r.ok, 'accetta «' + s + '»: ' + JSON.stringify(r));
    deve(typeof r.motivo === 'string' && r.motivo.length > 10,
      '«' + s + '» rifiutato senza spiegare perché: ' + r.motivo);
    deve(r.cents == null, '«' + s + '» è rifiutato ma porta comunque un importo: ' + r.cents);
  });
});

prova('IL GIRO ANDATA E RITORNO È ESATTO SU TUTTI I CENTESIMI', () => {
  /* Questa prova ha sostituito una che diceva «i centesimi si contano con gli
     interi, non con la virgola mobile». Era VACUA: su due decimali
     Math.round(parseFloat(x) * 100) dà lo stesso risultato, l'arrotondamento
     recupera l'imprecisione — quindi sostituire gli interi con la virgola
     mobile non l'avrebbe fatta diventare rossa, e una prova che non può
     diventare rossa non difende niente.

     Quello che si può misurare, e che vale, è il giro completo: l'importo
     riscritto in forma canonica e riletto deve tornare lo stesso numero. È la
     proprietà da cui dipende tutto il resto, perché è quella forma che va al
     server. */
  for (let c = 1; c <= 999999; c++) {
    const s = Importo.scritto(c);
    const r = Importo.leggi(s);
    if (!r.ok || r.cents !== c) {
      throw new Error(c + ' centesimi -> «' + s + '» -> ' + (r.ok ? r.cents : 'rifiutato: ' + r.motivo));
    }
  }
  /* e qualche cifra tonda in mezzo al tabellone, scritta a mano come la
     scriverebbe un operatore */
  [['8,07', 807], ['1234567,89', 123456789], ['0,07', 7], ['16,08', 1608]]
    .forEach(([s, atteso]) => {
      const r = Importo.leggi(s);
      deve(r.ok && r.cents === atteso, '«' + s + '» -> ' + r.cents + ' invece di ' + atteso);
    });
});

/* ── la forma che si manda al server ──────────────────────────────────────── */
prova('LA FORMA CANONICA NON CONTIENE PUNTI', () => {
  /* Il lato server INSTALLATO legge ancora l'importo in euro e toglie i punti.
     Su una stringa senza punti la sua lettura è esatta: è così che la
     correzione nel browser mette al sicuro anche il server di oggi, senza
     aspettare un rilascio. */
  ['1500', '1.500,00', '1.500.000', '170,5'].forEach((s) => {
    const r = Importo.leggi(s);
    deve(r.ok, 'rifiuta «' + s + '»');
    deve(r.scritto.indexOf('.') < 0, '«' + s + '» -> «' + r.scritto + '», che contiene un punto');
    deve(/^\d+,\d{2}$/.test(r.scritto), '«' + s + '» -> «' + r.scritto + '», che non è cifre+virgola+due decimali');
    /* e la forma canonica, riletta dalla LETTURA DEL SERVER INSTALLATO, deve
       dare gli stessi centesimi: è questa l'unica cosa che conta. */
    const comeIlServer = Math.round(parseFloat(r.scritto.replace(/\./g, '').replace(',', '.')) * 100);
    deve(comeIlServer === r.cents,
      'il server installato leggerebbe «' + r.scritto + '» come ' + comeIlServer + ' invece di ' + r.cents);
  });
});

prova('L\'IMPORTO SI RISCRIVE IN EURO ALLO STESSO MODO IN NODE E NEL BROWSER', () => {
  /* A mano e non con toLocaleString: in Node l'ICU può non esserci, e una
     prova che misura una formattazione diversa da quella vera non misura
     niente. */
  const casi = [[17000, '170,00 €'], [99, '0,99 €'], [150000, '1.500,00 €'],
    [150000000, '1.500.000,00 €'], [7, '0,07 €'], [0, '0,00 €'], [100, '1,00 €']];
  casi.forEach(([c, atteso]) => deve(Importo.euro(c) === atteso,
    c + ' centesimi -> «' + Importo.euro(c) + '» invece di «' + atteso + '»'));
});

/* ── la frase di conferma ─────────────────────────────────────────────────── */
prova('LA CONFERMA FA VEDERE L\'IMPORTO IN EURO E CHI LO RICEVERÀ', () => {
  /* Il controllo vero non è il numero nel campo — l'operatore l'ha appena
     scritto e lo rilegge come crede di averlo scritto. È l'importo riscritto
     in euro, accanto al nome di chi lo riceve. */
  const f = Importo.frase({ cents: 17000, cliente: 'Mario Rossi', causale: 'RC Auto' });
  deve(f.indexOf('170,00 €') >= 0, 'la conferma non dice l\'importo in euro: ' + f);
  deve(f.indexOf('Mario Rossi') >= 0, 'la conferma non dice a chi: ' + f);
  deve(f.indexOf('RC Auto') >= 0, 'la conferma non dice la causale: ' + f);
  /* Senza cliente non deve uscire «a undefined» o «a ». */
  const g = Importo.frase({ cents: 17000 });
  deve(g.indexOf('170,00 €') >= 0 && !/undefined|null|\ba\s*$/m.test(g),
    'senza cliente la conferma si scrive male: ' + g);
});

prova('SOPRA DIECIMILA EURO SI CHIEDE DUE VOLTE, CON PAROLE DIVERSE', () => {
  /* È la rete sotto l'errore «cento volte tanto»: le cifre normali di un
     premio stanno sotto, un premio moltiplicato per cento quasi sempre sopra.
     Due volte la stessa frase si clicca due volte senza leggerla, quindi la
     seconda domanda deve essere scritta in un altro modo. */
  deve(Importo.leggi('9999,99').sopraSoglia === false, '9.999,99 € è già sopra soglia');
  deve(Importo.leggi('10000').sopraSoglia === true, '10.000,00 € non è sopra soglia');
  deve(Importo.leggi('17000').sopraSoglia === true, '17.000,00 € (il guasto) non è sopra soglia');
  /* Il confronto si fa a parità di dati — stesso importo, nessun cliente —
     altrimenti le due frasi risulterebbero «diverse» solo perché una porta un
     nome, e la prova passerebbe anche se la seconda domanda fosse una copia
     della prima. */
  const a = Importo.frase({ cents: 1700000 });
  const b = Importo.fraseSoglia(1700000);
  deve(b.indexOf('17.000,00 €') >= 0, 'la seconda domanda non dice l\'importo: ' + b);
  deve(a !== b, 'le due domande sono la stessa frase: si cliccano due volte senza leggerle');
  const sole = (t) => t.replace(/[^a-z]/gi, '').toLowerCase();
  deve(sole(b).indexOf(sole(a)) < 0, 'la seconda domanda contiene la prima parola per parola: ' + b);
});

prova('UN IMPORTO FUORI SCALA SI RIFIUTA INVECE DI DIVENTARE UN NUMERO STRANO', () => {
  const r = Importo.leggi('99999999999');
  deve(!r.ok, 'accetta undici cifre: ' + JSON.stringify(r));
  const s = Importo.leggi('9999999,99');
  deve(s.ok && s.cents === 999999999, 'rifiuta il massimo dichiarato: ' + JSON.stringify(s));
  deve(Importo.TETTO_CENTS === 999999999, 'il tetto dichiarato non è quello che si applica');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nIMPORTO — un importo in euro, letto senza indovinare');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + ' — ' + (e.message || e)); }
}
console.log('\nIMPORTO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
