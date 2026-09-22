// ═══════════════════════════════════════════════════════════════════════════════
//  LO SCADENZARIO — tariffe/motore/scadenzario.js  (22/09/2026)
//
//  Le prove sotto sono quelle che, saltando, producono un elenco di lavoro
//  CREDIBILE E SBAGLIATO:
//   · una rata letta sulla sua `data_scadenza` invece che sulla decorrenza —
//     e una rata scaduta venti giorni fa risulta scadere fra sei mesi;
//   · una polizza scaduta ieri dichiarata scoperta — e non si telefona a chi
//     si poteva ancora salvare;
//   · «non rinnovata» letto da `sostituisce_id`, che sul portafoglio vero è
//     vuoto su tutte e 4.003 le righe: l'elenco delle cose da fare diventa
//     tre volte più lungo del vero, e dopo tre telefonate a vuoto non lo
//     guarda più nessuno;
//   · un indizio scambiato per una dichiarazione — e un cliente da
//     richiamare sparisce dall'elenco.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../../tariffe/motore/scadenzario.js');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const OGGI = '2026-09-22';

/* Togliere i commenti con una regex globale si mangia codice vero (§12): su
   `index.html` quella sequenza compare dentro le espressioni regolari e nel
   CSS. Qui si legge il file carattere per carattere tenendo lo stato «sono
   dentro un commento», che è l'unica lettura che non accoppia pezzi che
   commenti non sono. Resta vero il rimedio definitivo di §31: la parola
   vietata non si scrive dentro il file che la vieta. */
const soloCodice = (src) => {
  const out = [];
  let dentro = false;
  for (const riga of src.split('\n')) {
    let r = '', i = 0;
    while (i < riga.length) {
      if (dentro) {
        const f = riga.indexOf('*' + '/', i);
        if (f < 0) { i = riga.length; } else { dentro = false; i = f + 2; }
      } else {
        const a = riga.indexOf('/' + '*', i);
        const b = riga.indexOf('//', i);
        if (a >= 0 && (b < 0 || a < b)) { r += riga.slice(i, a); dentro = true; i = a + 2; }
        else if (b >= 0) { r += riga.slice(i, b); i = riga.length; }
        else { r += riga.slice(i); i = riga.length; }
      }
    }
    out.push(r);
  }
  return out.join('\n');
};
const sorgenteMotore = () => soloCodice(require('fs').readFileSync(
  new URL('../../tariffe/motore/scadenzario.js', import.meta.url), 'utf8'));

/* ═══ LE QUATTRO FASCE ═════════════════════════════════════════════════════ */

prova('L\'ESEMPIO DI FRANCESCO: la rata semestrale del 15.09 è dentro i 15 giorni', () => {
  /* «polizza incassata il 15.04.2026 semestrale, avrà quindi una data
     scadenza della rata semestrale (QF) il 15.09.2026 non ancora incassata:
     è dentro i 15 giorni ed ancora in copertura». */
  const s = S.stato('2026-09-15', OGGI);
  deve(s.giorni === -7, 'giorni: ' + s.giorni);
  deve(s.fascia === 'proroga', 'fascia: ' + s.fascia);
  deve(s.coperta === true, 'la dichiara scoperta, e invece la copertura c\'è');
  deve(s.giorniDiProrogaRimasti === 8, 'giorni di proroga rimasti: ' + s.giorniDiProrogaRimasti);
  deve(/ancora in copertura/.test(s.etichetta), 'etichetta: ' + s.etichetta);
  /* E la stessa risposta deve darla la strada vera, quella che usa la
     schermata: la rata con tutte e due le date addosso, come arriva dal
     flusso della compagnia. */
  const r = S.daRata({ id: 't', polizza_id: 'p', tipo: 'quietanza',
    data_decorrenza: '2026-09-15', data_scadenza: '2027-03-15',
    incassato_il: '2026-04-15', importo_lordo: 200 }, { id: 'p' }, OGGI);
  deve(r.fascia === 'proroga', 'dalla rata vera: ' + r.fascia);
  deve(r.coperta === true, 'dalla rata vera la dichiara scoperta');
  return 'scaduta da 7 gg, 8 di proroga davanti';
});

prova('LA REGOLA: la data che fa testo è la DECORRENZA della rata, non la sua scadenza', () => {
  /* Misurato sul portafoglio vero: una quietanza semestrale ha decorrenza
     2026-09-02 e `data_scadenza` 2027-03-02 — la fine del periodo che copre.
     Leggere la seconda sposta il lavoro di sei mesi. */
  const t = { id: 't1', polizza_id: 'p1', tipo: 'quietanza',
    data_decorrenza: '2026-09-02', data_scadenza: '2027-03-02', importo_lordo: 365 };
  const r = S.daRata(t, { id: 'p1', cliente: 'Rossi' }, OGGI);
  deve(r.scadenza === '2026-09-02', 'ha preso la data sbagliata: ' + r.scadenza);
  deve(r.giorni === -20, 'giorni: ' + r.giorni);
  deve(r.fascia === 'scoperte', 'fascia: ' + r.fascia);
  /* La controprova di questa riga: sulla `data_scadenza` sarebbe «fra 161
     giorni», cioè «non è ancora lavoro». */
  deve(S.stato('2027-03-02', OGGI).fascia === 'avanti', 'il caso opposto non è quello che credevo');
  return 'decorrenza 02/09 → scoperta; la sua scadenza direbbe «più avanti»';
});

prova('LA REGOLA: la data d\'incasso non entra da nessuna parte', () => {
  /* Una rata incassata il 15.04 non scade il 15.04. Il motore non legge
     `incassato_il` nemmeno per sbaglio: la riga si costruisce sulla
     decorrenza e basta. */
  const t = { id: 't2', polizza_id: 'p1', tipo: 'rata',
    data_decorrenza: '2026-10-01', incassato_il: '2026-04-15', importo_lordo: 100 };
  const r = S.daRata(t, { id: 'p1' }, OGGI);
  deve(r.scadenza === '2026-10-01', 'scadenza: ' + r.scadenza);
  deve(r.fascia === 'vicine', 'fascia: ' + r.fascia);
  deve(!/incassato_il/.test(sorgenteMotore()), 'il motore legge la data d\'incasso da qualche parte');
  return 'la decorrenza comanda, l\'incasso non si legge';
});

prova('le quattro fasce non si sovrappongono, e coprono tutto', () => {
  /* §22: le fasce cumulative sono sparite di proposito — la stessa polizza
     in tre contatori è un numero che si somma con se stesso. */
  for (let g = -40; g <= 40; g++) {
    const dentro = S.FASCE.filter(f => f.k !== 'tutte' && f.test(g, 15));
    deve(dentro.length === 1, 'il giorno ' + g + ' cade in ' + dentro.length + ' fasce');
  }
  return '81 giorni percorsi, ognuno in una fascia sola';
});

prova('i confini: 0 è ancora vicina, −15 è l\'ultimo coperto, −16 è scoperta', () => {
  deve(S.stato('2026-09-22', OGGI).fascia === 'vicine', 'oggi non è «vicina»');
  deve(S.stato('2026-09-22', OGGI).coperta === true, 'una polizza che scade oggi risulta scoperta');
  deve(S.stato('2026-09-07', OGGI).fascia === 'proroga', '−15 dovrebbe essere ancora in proroga');
  deve(S.stato('2026-09-06', OGGI).fascia === 'scoperte', '−16 dovrebbe essere scoperta');
  deve(S.stato('2026-10-07', OGGI).fascia === 'vicine', '+15 dovrebbe essere vicina');
  deve(S.stato('2026-10-08', OGGI).fascia === 'avanti', '+16 dovrebbe essere più avanti');
  return '0 / −15 / −16 / +15 / +16 al posto giusto';
});

prova('la proroga si può stringere, e allora i confini si spostano con lei', () => {
  /* Il giorno in cui una compagnia ne dichiarerà una diversa è un parametro,
     non una riscrittura. */
  const a = S.stato('2026-09-15', OGGI, { giorni: 5 });
  deve(a.fascia === 'scoperte', 'con 5 giorni di proroga, −7 deve essere scoperta: ' + a.fascia);
  const b = S.stato('2026-09-15', OGGI, { giorni: 30 });
  deve(b.fascia === 'proroga', 'con 30 giorni, −7 è ancora in proroga: ' + b.fascia);
  deve(b.giorniDiProrogaRimasti === 23, 'rimasti: ' + b.giorniDiProrogaRimasti);
  return '5 → scoperta, 30 → 23 giorni davanti';
});

prova('senza data di scadenza non si inventa una fascia, e si dice perché', () => {
  const s = S.stato(null, OGGI);
  deve(s.fascia === null, 'ha messo in una fascia una riga senza data');
  deve(s.coperta === null, 'ha detto sì o no sulla copertura di una data che non c\'è');
  deve(/non si può dire/.test(s.motivo), 'motivo: ' + s.motivo);
  return 'niente fascia, motivo scritto';
});

/* ═══ IL RINNOVO ═══════════════════════════════════════════════════════════ */

const SCADUTA = {
  id: 'p-vecchia', cliente_id: 'c1', modulo: 'rca', numero_polizza: 'BLP1',
  targa: 'AB 123 CD', data_effetto: '2025-09-20', data_scadenza: '2025-09-20',
  sostituzioni: 0
};

prova('LA MISURA CHE HA DECISO IL LAVORO: sostituisce_id vuoto non vuol dire «non rinnovata»', () => {
  /* Sul portafoglio vero `sostituisce_id` è vuoto su tutte e 4.003 le
     polizze, perché PRIMA non ha tacito rinnovo: alla scadenza ne nasce una
     nuova e il tracciato non dice quale sostituisce quale (§14, regola 4). */
  const nuova = { id: 'p-nuova', cliente_id: 'c1', modulo: 'rca', numero_polizza: 'BLP2',
    targa: 'ab123cd', data_effetto: '2025-09-20', data_scadenza: '2026-09-20' };
  const i = S.indiceSuccessori([SCADUTA, nuova]);
  const r = S.rinnovo(SCADUTA, i);
  deve(r.stato === 'indizio', 'stato: ' + r.stato);
  deve(r.come === 'targa', 'come: ' + r.come);
  deve(r.polizza.id === 'p-nuova', 'ha agganciato la polizza sbagliata');
  return 'stessa targa, scritta in due modi → indizio';
});

prova('UN INDIZIO NON È UNA DICHIARAZIONE, e le due parole sono diverse', () => {
  /* Chiamarlo «rinnovata» nasconderebbe un cliente da richiamare, che è
     l'errore più caro dei due: una telefonata a chi ha già rinnovato costa
     due minuti, un cliente perso costa un anno di premio. */
  const nuova = { id: 'p-nuova', cliente_id: 'c1', modulo: 'rca',
    targa: 'AB123CD', data_effetto: '2025-09-20' };
  const r = S.rinnovo(SCADUTA, S.indiceSuccessori([SCADUTA, nuova]));
  deve(r.testo === 'Sembra rinnovata', 'testo: ' + r.testo);
  deve(r.stato !== 'dichiarato', 'ha promosso un indizio a dichiarazione');
  deve(/Nessuno l'ha dichiarato/.test(r.spiega), 'spiega: ' + r.spiega);
  /* E il dichiarato resta sopra a tutto. */
  const d = S.rinnovo(Object.assign({}, SCADUTA, { sostituzioni: 1 }), S.indiceSuccessori([]));
  deve(d.stato === 'dichiarato' && d.testo === 'Rinnovata', 'il dichiarato non vince');
  return 'tre parole diverse per tre stati diversi';
});

prova('la targa viene prima del cliente, e il NOME non si guarda mai', () => {
  /* §19, regola 5: la somiglianza fra due nomi costa una provvigione; qui
     costa un cliente. Due persone diverse con lo stesso nome non agganciano
     niente, perché il nome non entra nell'indice. */
  const perCliente = { id: 'p-altra', cliente_id: 'c1', modulo: 'rca', numero_polizza: 'BLP9',
    targa: 'ZZ999ZZ', data_effetto: '2025-09-25' };
  const perTarga = { id: 'p-targa', cliente_id: 'c-altro', modulo: 'rca', numero_polizza: 'BLP8',
    targa: 'AB123CD', data_effetto: '2025-09-21' };
  const r = S.rinnovo(SCADUTA, S.indiceSuccessori([SCADUTA, perCliente, perTarga]));
  deve(r.come === 'targa', 'con tutti e due gli indizi ha scelto: ' + r.come);
  deve(!/perNome|\.cliente\s*===|cliente\s*==\s*[a-z]/.test(sorgenteMotore()),
    'il motore confronta i nominativi da qualche parte');
  return 'targa > cliente, e il nome non entra nell\'indice';
});

prova('una polizza nuova troppo lontana dalla scadenza non è un rinnovo', () => {
  /* Una polizza dello stesso cliente e ramo comprata sei mesi dopo è una
     seconda macchina, non il rinnovo della prima. */
  const tardi = { id: 'p-tardi', cliente_id: 'c1', modulo: 'rca',
    targa: 'ZZ999ZZ', data_effetto: '2026-03-20' };
  const r = S.rinnovo(SCADUTA, S.indiceSuccessori([SCADUTA, tardi]));
  deve(r.stato === 'nessuno', 'stato: ' + r.stato);
  deve(r.testo === 'Non rinnovata', 'testo: ' + r.testo);
  /* Dentro la finestra invece sì: il rinnovo si emette anche in anticipo. */
  const prima = { id: 'p-prima', cliente_id: 'c1', modulo: 'rca',
    targa: 'ZZ999ZZ', data_effetto: '2025-09-17' };
  deve(S.rinnovo(SCADUTA, S.indiceSuccessori([SCADUTA, prima])).stato === 'indizio',
    'un rinnovo emesso tre giorni prima non si riconosce');
  return 'sei mesi dopo no, tre giorni prima sì';
});

prova('senza data di scadenza il rinnovo NON è «non rinnovata»: è «non si sa»', () => {
  /* §12, §18: «non si è potuto cercare» non è «non c'è». Metterla fra le non
     rinnovate manderebbe a richiamare un cliente su una data che non esiste. */
  const r = S.rinnovo({ id: 'x', cliente_id: 'c1', modulo: 'rca', sostituzioni: 0 },
    S.indiceSuccessori([]));
  deve(r.stato === 'non_si_sa', 'stato: ' + r.stato);
  deve(r.stato !== 'nessuno', 'l\'ha messa fra le non rinnovate');
  return 'quattro stati, e il quarto è «non si sa»';
});

prova('una targa troppo corta non aggancia niente', () => {
  /* Un campo sporco («-», «N.D.», uno spazio) normalizzato diventerebbe una
     chiave comune a mezzo portafoglio, e tutte quelle polizze risulterebbero
     rinnovate l'una dall'altra. */
  deve(S.targaNorm('N.D.') === '', 'targaNorm(N.D.) = ' + S.targaNorm('N.D.'));
  deve(S.targaNorm('-') === '', 'targaNorm(-) non è vuota');
  deve(S.targaNorm(' ab 123 cd ') === 'AB123CD', 'targaNorm: ' + S.targaNorm(' ab 123 cd '));
  const a = { id: 'a', cliente_id: 'ca', modulo: 'rca', targa: 'N.D.',
    data_effetto: '2025-09-20', data_scadenza: '2025-09-20', sostituzioni: 0 };
  const b = { id: 'b', cliente_id: 'cb', modulo: 'rca', targa: '-', data_effetto: '2025-09-21' };
  deve(S.rinnovo(a, S.indiceSuccessori([a, b])).stato === 'nessuno',
    'due targhe sporche si sono agganciate fra loro');
  return 'sotto le 5 cifre utili non è una targa';
});

prova('«NON RINNOVATA» si dice solo a chi è scaduto, o sta scadendo', () => {
  /* Una polizza che scade fra dieci mesi non è non rinnovata: non è ancora
     scaduta. È letteralmente vero che nessun successore esiste — ed è vero
     anche per tutto il portafoglio sano — ma metterla nell'elenco di chi
     richiamare è una risposta vera che porta a fare la cosa sbagliata.
     L'ha trovata il conteggio di una prova nel browser, non la rilettura. */
  const vuoto = { stato: 'nessuno' };
  const r = (fascia, extra) => S.statoLavoro(Object.assign(
    { tipo: 'polizza', fascia: fascia, rinnovo: vuoto }, extra || {}));
  deve(r('avanti').k === 'non_ancora', 'una polizza lontana dalla scadenza: ' + r('avanti').k);
  deve(r('vicine').k === 'nessuno', 'una che scade fra pochi giorni va richiamata: ' + r('vicine').k);
  deve(r('proroga').k === 'nessuno', 'una in proroga va richiamata: ' + r('proroga').k);
  deve(r('scoperte').k === 'nessuno', 'una fuori dai 15 giorni va richiamata: ' + r('scoperte').k);
  /* E l'ordine: il dichiarato vince anche su una polizza lontana. */
  deve(S.statoLavoro({ tipo: 'polizza', fascia: 'avanti', rinnovo: { stato: 'dichiarato' } }).k === 'lavorato',
    'il rinnovo dichiarato non vince sulla scadenza lontana');
  deve(r('proroga', { tacito_rinnovo: true }).k === 'tacito',
    'il tacito rinnovo finisce fra quelle da richiamare: si rinnova da solo, va verificato');
  deve(S.statoLavoro({ tipo: 'rata' }).k === 'rata', 'una rata non ha uno stato di rinnovo');
  return 'avanti → non ancora scaduta; le altre tre → da richiamare';
});

/* ═══ L'ELENCO ═════════════════════════════════════════════════════════════ */

prova('polizze e rate in una lista sola, e la rata prende i dati dalla sua polizza', () => {
  const polizze = [{ id: 'p1', cliente: 'Rossi Mario', cliente_id: 'c1', modulo: 'rca',
    numero_polizza: 'BLP1', compagnia: 'PRIMA', targa: 'AB123CD',
    data_effetto: '2026-04-15', data_scadenza: '2027-04-15', premio_annuo: 400 }];
  const rate = [{ id: 't1', polizza_id: 'p1', tipo: 'quietanza',
    data_decorrenza: '2026-09-15', importo_lordo: 200 }];
  const e = S.righe({ polizze, rate, oggi: OGGI });
  deve(e.righe.length === 2, 'righe: ' + e.righe.length);
  const r = e.righe.find(x => x.tipo === 'rata');
  deve(r.cliente === 'Rossi Mario', 'la rata non ha preso il cliente dalla polizza');
  deve(r.numero_polizza === 'BLP1', 'la rata non ha preso il numero');
  deve(r.che_cosa === 'Quietanza di frazionamento', 'che_cosa: ' + r.che_cosa);
  deve(r.fascia === 'proroga', 'fascia della rata: ' + r.fascia);
  const p = e.righe.find(x => x.tipo === 'polizza');
  deve(p.fascia === 'avanti', 'fascia della polizza: ' + p.fascia);
  return 'stessa polizza, due scadenze, due fasce diverse';
});

prova('una rata la cui polizza non si vede NON sparisce: si conta', () => {
  /* §55: quello che resta fuori si dichiara. Una giunzione che non trova
     niente non è un errore, è zero righe — e in silenzio nessuno lo sa. */
  const e = S.righe({
    polizze: [{ id: 'p1', data_scadenza: '2027-01-01' }],
    rate: [{ id: 't1', polizza_id: 'ALTRA', data_decorrenza: '2026-09-15' }],
    oggi: OGGI
  });
  deve(e.rate_senza_polizza === 1, 'rate fuori: ' + e.rate_senza_polizza);
  deve(e.righe.length === 1, 'ha mostrato una rata senza la sua polizza');
  return '1 fuori, contata';
});

prova('il rinnovo si attacca alle polizze e NON alle rate', () => {
  /* Una rata non si rinnova: si incassa. Una colonna «rinnovo» su una rata
     risponde a una domanda che nessuno ha fatto. */
  const polizze = [{ id: 'p1', cliente_id: 'c1', modulo: 'rca', targa: 'AB123CD',
    data_effetto: '2025-09-20', data_scadenza: '2025-09-20', sostituzioni: 0 }];
  const rate = [{ id: 't1', polizza_id: 'p1', data_decorrenza: '2026-09-15' }];
  const e = S.conRinnovo(S.righe({ polizze, rate, oggi: OGGI }).righe, polizze);
  deve(e.find(r => r.tipo === 'polizza').rinnovo.stato === 'nessuno', 'la polizza non ha il rinnovo');
  deve(e.find(r => r.tipo === 'rata').rinnovo === null, 'ha attaccato il rinnovo a una rata');
  return 'polizza sì, rata no';
});

prova('i contatori: un importo che non c\'è non vale zero', () => {
  /* §36, §42, §45: sommare zero fa un portafoglio più povero del vero, e un
     numero più basso non lo mette in dubbio nessuno. */
  const righe = [
    { fascia: 'proroga', importo: 100 },
    { fascia: 'proroga', importo: null },
    { fascia: 'avanti', importo: 50 }
  ];
  const c = S.conteggi(righe);
  deve(c.proroga.n === 2, 'n: ' + c.proroga.n);
  deve(c.proroga.importo === 100, 'importo: ' + c.proroga.importo);
  deve(c.proroga.senza_importo === 1, 'senza importo: ' + c.proroga.senza_importo);
  deve(c.tutte.n === 3 && c.tutte.importo === 150, 'tutte: ' + c.tutte.n + '/' + c.tutte.importo);
  return '2 righe, 100 € sommati, 1 dichiarata senza importo';
});

prova('la somma delle quattro fasce torna col totale, e quello che non torna si conta', () => {
  /* L'invariante che rende leggibili i contatori: se una riga sta in «tutte»
     e in nessuna fascia, la somma smette di tornare e nessuno se ne accorge.
     Una riga senza scadenza è esattamente quel caso, e si conta a parte. */
  const righe = [
    { fascia: 'proroga', importo: 100 },
    { fascia: 'avanti', importo: 50 },
    { fascia: null, importo: 70 }
  ];
  const c = S.conteggi(righe);
  const somma = ['scoperte', 'proroga', 'vicine', 'avanti'].reduce((a, k) => a + c[k].n, 0);
  deve(c.tutte.n === 3, 'tutte: ' + c.tutte.n);
  deve(c.senza_fascia === 1, 'non conta la riga senza fascia: ' + c.senza_fascia);
  deve(somma + c.senza_fascia === c.tutte.n,
    'la somma delle fasce più le righe senza fascia non torna col totale: ' + somma + '+' + c.senza_fascia + ' ≠ ' + c.tutte.n);
  return '2 in fascia, 1 fuori, e il conto torna';
});

prova('una polizza sospesa scade quando scade DAVVERO', () => {
  /* §41: i giorni fermi si recuperano in fondo. Nello scadenzario una
     polizza sospesa compariva con la data del contratto, che non è più vera.
     Oggi le sospese sono zero: questa prova serve al giorno in cui non lo
     saranno. */
  const sosp = require('../../tariffe/motore/sospensione.js');
  const p = { id: 'p1', data_scadenza: '2026-09-15',
    sospensioni: [{ dal: '2026-01-01', al: '2026-03-02' }] };   // 60 giorni fermi
  const senza = S.daPolizza(p, OGGI);
  deve(senza.fascia === 'proroga', 'senza il motore delle sospensioni: ' + senza.fascia);
  const con = S.daPolizza(p, OGGI, { sospensione: sosp });
  deve(con.scadenza === '2026-11-14', 'scadenza vera: ' + con.scadenza);
  deve(con.scadenzaContrattuale === '2026-09-15', 'ha riscritto la contrattuale');
  deve(con.fascia === 'avanti', 'fascia: ' + con.fascia);
  deve(con.spostataDi === 60, 'spostata di: ' + con.spostataDi);
  return '60 giorni fermi: da «in proroga» a «più avanti»';
});

/* ═══ LE DATE ══════════════════════════════════════════════════════════════ */

prova('l\'aritmetica delle date non cambia col fuso orario di chi guarda', () => {
  /* §44: una data ISO non ha un fuso, e farla passare da `new Date(...)` +
     `toISOString()` gliene dà uno. Dentro un processo solo il fuso è già
     quello che è: l'unico modo di misurarlo è rilanciare il motore. */
  const { execFileSync } = require('child_process');
  const script = `const S=require('${new URL('../../tariffe/motore/scadenzario.js', import.meta.url).pathname}');`
    + `const s=S.stato('2026-09-15','2026-09-22');`
    + `process.stdout.write(JSON.stringify([s.giorni,s.fascia,s.fineProroga,S.piuGiorni('2026-01-31',365)]));`;
  const atteso = JSON.stringify([-7, 'proroga', '2026-09-30', '2027-01-31']);
  const fusi = ['UTC', 'Europe/Rome', 'Pacific/Kiritimati', 'Pacific/Niue', 'America/New_York'];
  for (const tz of fusi) {
    const out = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: tz } }).toString();
    deve(out === atteso, 'in ' + tz + ' risponde ' + out + ' invece di ' + atteso);
  }
  return '5 fusi, stessa risposta';
});

prova('oggiLocale non torna indietro di un giorno a mezzanotte', () => {
  /* La trappola di §44 sul valore di partenza: `toISOString()` fra
     mezzanotte e le due in Italia propone ieri. */
  const codice = sorgenteMotore();
  deve(!/toISOString/.test(codice), 'il motore riconverte una data via UTC da qualche parte');
  deve(/getFullYear/.test(codice), 'il giorno di oggi non si legge dalle parti locali');
  return 'nessun toISOString nel motore';
});

console.log('\n══ SCADENZARIO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSCADENZARIO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
