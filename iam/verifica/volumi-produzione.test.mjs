// ═══════════════════════════════════════════════════════════════════════════════
//  VOLUMI DI PORTAFOGLIO E PRODUZIONE — le schermate  (21/09/2026)
//
//  Le regole stanno nel motore condiviso (`tariffe/motore/produzione.js`, dodici
//  prove in Node con tre controprove). Qui si sorveglia che le schermate:
//
//   · siano RAGGIUNGIBILI — una schermata che nessuno apre non esiste (§1);
//   · non scarichino il portafoglio nel browser: le somme le fa il database;
//   · non trasformino una lettura fallita in un grafico piatto, che su un
//     andamento si legge come un anno andato male (§12, §18);
//   · non diano MAI un nome a un codice produttore che nessuno ha deciso (§19).
//
//  Queste prove fanno GIRARE il codice, non solo cercare stringhe.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const P = require(path.join(RADICE, '..', 'tariffe', 'motore', 'produzione.js'));
const e = esiti('VOLUMI E PRODUZIONE');

/* Il finto archivio risponde alla funzione SQL e alla vista, e annota che cosa
   gli e' stato chiesto: cosi' si puo' pretendere che NON gli venga chiesto il
   portafoglio riga per riga. */
function conSchermata(risposte = {}) {
  const chieste = [];
  const db = {
    rpc(nome, arg) {
      chieste.push('rpc:' + nome);
      const r = risposte['rpc:' + nome];
      return Promise.resolve(r instanceof Error
        ? { data: null, error: { message: r.message } }
        : { data: r === undefined ? [] : r, error: null, arg: arg });
    },
    from(tabella) {
      chieste.push(tabella);
      const r = risposte[tabella];
      const esito = () => (r instanceof Error ? { data: null, error: { message: r.message } }
                                              : { data: r === undefined ? [] : r, error: null });
      const q = {
        select: () => q, order: () => q, limit: () => q, eq: () => q,
        then: (ris, err) => Promise.resolve(esito()).then(ris, err)
      };
      return q;
    }
  };
  const s = stanza(html, [
    /* Dal 21/09/2026 il grafico e' diviso in piu' pezzi: la scala corta
       dell'asse, il dettaglio del mese toccato e il tocco stesso. Se non si
       ritagliano, `volHTML` chiama una funzione che nella stanza non esiste,
       l'eccezione finisce nel `catch` di `volCarica` e la schermata mostra
       «non si e' potuto leggere» — cioe' una prova rossa che accusa il codice
       di un difetto del banco. */
    'volHTML', 'volDelta', 'volK', 'volDettaglio', 'volMese', 'volCarica', 'prdEuro', 'prdNum',
    'prdCarica', 'prdRender', 'prdFiltri', 'prdRiempiFiltri', 'prdOpz',
    'prdTabella', 'prdProduttoriHTML', 'prdNonLetto', 'prdAzzera'
  ], {
    db,
    altro: {
      VOL_ULTIMO: 0, VOL_DATI: null, VOL_MESE: null,
      PRD_RIGHE: null, PRD_PERSONE: [], PRD_ULTIMO: 0, PRD_ERRORE: '',
      wdsISO: () => '2026-09-21',
      kpiRiquadro: (t, v, s2) => '<div class="kpi-c"><b>' + t + '</b>' + v + '<i>' + (s2 || '') + '</i></div>',
      URL: { createObjectURL: () => 'blob:finto' },
      Blob: function () {}
    }
  });
  if (s.mancanti.length) throw new Error('non trovo nel sorgente: ' + s.mancanti.join(', '));
  s.ctx.window.Produzione = P;
  s.ctx.Produzione = P;
  return { ...s, chieste };
}

/* Il campione: settembre gia' tagliato al 21 nei due anni dal database, e i
   mesi dell'anno prima oltre settembre marcati fuori confronto. */
const CONFRONTO = [
  { anno: 2025, mese: 8,  polizze: 10, senza_premio: 2, premio: '1000.00', parziale: false, fuori_confronto: false },
  { anno: 2025, mese: 9,  polizze:  5, senza_premio: 0, premio:  '500.00', parziale: true,  fuori_confronto: false },
  { anno: 2025, mese: 11, polizze: 40, senza_premio: 0, premio: '9000.00', parziale: false, fuori_confronto: true  },
  { anno: 2026, mese: 8,  polizze: 20, senza_premio: 1, premio: '2000.00', parziale: false, fuori_confronto: false },
  { anno: 2026, mese: 9,  polizze:  7, senza_premio: 0, premio:  '700.00', parziale: true,  fuori_confronto: false }
];

const MENSILE = [
  { anno: 2026, mese: 3, collaboratore_id: 'p1',  codice_produttore: 'U100', compagnia: 'PRIMA', ramo: 'rca',  polizze: 4, senza_premio: 0, premio: '400.00' },
  { anno: 2026, mese: 4, collaboratore_id: null,  codice_produttore: 'U200', compagnia: 'PRIMA', ramo: 'rca',  polizze: 9, senza_premio: 2, premio: '900.00' },
  { anno: 2025, mese: 5, collaboratore_id: null,  codice_produttore: null,   compagnia: 'HDI',   ramo: 'beni', polizze: 2, senza_premio: 0, premio: '200.00' }
];

const corpo = (s) => (s.browser.elemento('vol-corpo').innerHTML || '');

/* TRAPPOLA D'AMBIENTE. `toLocaleString('it-IT')` in questo Node NON raggruppa
   le migliaia (1500,00), nel browser sì (1.500,00): una prova che cerca la
   forma con il punto dichiara rotto un codice giusto, e una che cerca quella
   senza smette di misurare il giorno in cui il banco cambia. Si accettano
   tutte e due — quello che conta è il numero, non il separatore. */
const euro = (n) => new RegExp(String(n).replace(/(\d)(?=(\d{3})+$)/g, '$1\\.?') + ',00');

e.prova('la schermata di dettaglio è RAGGIUNGIBILE: menu, titolo, rotta e scorciatoia', () => {
  /* §1: una schermata che nessuno può aprire, per chi lavora, non esiste. */
  deve(/id="panel-produzione"/.test(html), 'manca il pannello');
  deve(/if \(t === 'produzione'\)\s*\{ prdCarica\(true\); \}/.test(html),
    'goTab non avvia la schermata: sarebbe un riquadro vuoto (§6b)');
  deve(/act: 'produzione', go: function \(\) \{ vai\('produzione'\); \}/.test(scocca), 'la scocca non ha la voce');
  deve(/produzione:\s*\['Produzione', 'Agenzia'\]/.test(scocca),
    'manca il titolo della pagina: la briciola direbbe un posto in cui non sei');
  deve(/produzione: 'agenzia'/.test(scocca), 'la voce non è agganciata a un menu');
  /* E dalla Scrivania, che è dove si atterra la mattina. */
  deve(/goTab\('produzione'\)/.test(html.replace(/\s+/g, ' ')), 'dalla Scrivania non si raggiunge');
  /* Il grafico si avvia da solo quando si apre la Scrivania. */
  deve(/if \(t === 'dashboard'\)[^\n]*volCarica\(\)/.test(html), 'aprendo la Scrivania i volumi non si leggono');
  return 'menu + titolo + goTab + Scrivania';
});

e.prova('LE SOMME LE FA IL DATABASE: nel browser non scende il portafoglio', () => {
  /* Richiesta esplicita del brief, e non è una preferenza: 1720 polizze
     scaricate a ogni apertura della Scrivania sono un programma che si apre
     lento e che peggiora ogni mese che passa. */
  const b = ritaglia(html, 'volCarica') + ritaglia(html, 'prdCarica');
  deve(/rpc\('iam_produzione_confronto'/.test(b), 'il confronto non passa dalla funzione SQL');
  deve(/from\('iam_produzione_mensile'\)/.test(b), 'il dettaglio non passa dalla vista');
  deve(!/from\('quote_polizze'\)/.test(b), 'la schermata scarica le polizze una per una');
  deve(!/from\('quote_titoli'\)/.test(b), 'la schermata scarica le rate una per una');
  return 'una funzione e una vista, zero polizze';
});

await e.provaAsync('il grafico confronta i due anni ALLO STESSO GIORNO, e lo scrive', async () => {
  /* La regola che vale più di tutte: dodici mesi contro nove disegnano un
     crollo che non è successo. Qui l'anno prima ha 10.500 € in tutto, ma solo
     1.500 sono confrontabili. */
  const s = conSchermata({ 'rpc:iam_produzione_confronto': CONFRONTO });
  await s.ctx.volCarica(true);
  const h = corpo(s);
  deve(/2026 a oggi/.test(h), 'non dice che l’anno in corso è contato a oggi: ' + h.slice(0, 200));
  deve(/2025, stesso periodo/.test(h), 'non dice che l’anno prima è contato sullo stesso periodo');
  deve(euro(1500).test(h), 'il totale confrontabile dell’anno prima non è 1.500: ' + h.slice(0, 400));
  deve(euro(2700).test(h), 'il totale dell’anno in corso non è 2.700');
  deve(/stesso giorno, il 21 settembre/.test(h), 'non dichiara il giorno del taglio');
  /* E i mesi fuori confronto si VEDONO, marcati: sono produzione vera. */
  deve(/mesi non ancora arrivati/.test(h), 'i mesi fuori confronto spariscono senza dirlo');
  return '1.500 contro 2.700, e il taglio dichiarato';
});

await e.provaAsync('UNA LETTURA CHE CADE NON DIVENTA UN GRAFICO PIATTO', async () => {
  /* Su un andamento è peggio che altrove: un grafico a zero si legge come un
     anno andato male, non come un dato che non è arrivato (§12, §18). */
  const s = conSchermata({ 'rpc:iam_produzione_confronto': new Error('permission denied') });
  await s.ctx.volCarica(true);
  const h = corpo(s);
  deve(/[Nn]on si è potuto leggere/.test(h), 'la lettura caduta non si dichiara: ' + h.slice(0, 200));
  deve(/[Nn]on vuol dire che non ce ne sia/.test(h), 'non lo dice in faccia');
  deve(!/vol-graf/.test(h), 'disegna un grafico su dei dati che non ha');
  /* E un portafoglio davvero vuoto è un'altra frase. */
  const v = conSchermata({ 'rpc:iam_produzione_confronto': [] });
  await v.ctx.volCarica(true);
  deve(/[Nn]on c’è ancora produzione/.test(corpo(v)), 'un portafoglio vuoto non si distingue da una lettura caduta');
  return 'caduta ≠ vuoto, e nessun grafico inventato';
});

/* ══ È UN GRAFICO, NON UN INDICATORE (21/09/2026) ═════════════════════════
   Francesco: «per la dashboard ti avevo detto che volevo un grafico, non un
   indicatore». La prima stesura apriva con tre riquadri di numeri grandi e
   metteva sotto ventiquattro barre larghe al massimo sedici pixel. Queste
   prove misurano la differenza, e sono scritte sulla forma VERA dei dati
   dell'agenzia: 300 € a febbraio contro 95.000 a luglio, tre mesi dell'anno
   in corso non ancora arrivati, e un mese le cui polizze un premio non ce
   l'hanno. */
const FORMA_VERA = [
  /* Gennaio 2025 NON C'È: zero polizze, zero premio — e zero non è 300. */
  { anno: 2025, mese: 2,  polizze:  1, senza_premio: 0, premio:   '300.00', parziale: false, fuori_confronto: false },
  { anno: 2025, mese: 7,  polizze: 10, senza_premio: 0, premio: '95000.00', parziale: false, fuori_confronto: false },
  { anno: 2025, mese: 11, polizze:  5, senza_premio: 0, premio:  '9000.00', parziale: false, fuori_confronto: true  },
  { anno: 2026, mese: 7,  polizze: 12, senza_premio: 0, premio: '50000.00', parziale: false, fuori_confronto: false },
  /* Settembre 2026: tre polizze, e di nessuna si sa il premio. */
  { anno: 2026, mese: 9,  polizze:  3, senza_premio: 3, premio:     '0.00', parziale: true,  fuori_confronto: false }
];
/* I punti di un path SVG: «M12,34 L56,78» → [[12,34],[56,78]]. */
const punti = (h, classe) => {
  const m = h.match(new RegExp('class="' + classe + '" d="([^"]*)"'));
  if (!m) return null;
  return m[1].split(/[ML]/).filter(Boolean).map(p => p.trim().split(',').map(Number));
};

await e.provaAsync('IL GRAFICO È LA COSA GROSSA: un disegno, e UN numero, non tre riquadri', async () => {
  const s = conSchermata({ 'rpc:iam_produzione_confronto': FORMA_VERA });
  await s.ctx.volCarica(true);
  const h = corpo(s);
  /* Un grafico vero: un SVG con delle curve, non delle barre a percentuale. */
  deve(/<svg class="vol-svg"/.test(h), 'non c’è nessun disegno: ' + h.slice(0, 200));
  deve(/class="vol-l-ora" d="M/.test(h), 'manca la curva dell’anno in corso');
  deve(/class="vol-a-prec" d="M/.test(h), 'manca l’area dell’anno scorso');
  /* UN numero grande, non tre. Tre riquadri di cifre in cima a una scheda che
     si chiama «grafico» sono tre indicatori, e il grafico diventa la
     decorazione sotto — che è esattamente quello che era. */
  deve((h.match(/class="vol-big"/g) || []).length === 1,
    'i numeri grandi sono ' + (h.match(/class="vol-big"/g) || []).length + ', devono essere uno');
  deve(!/vol-testa|vol-tot|class="vol-t"/.test(h), 'i tre riquadri di prima sono ancora lì');
  /* E sulla Scrivania il grafico viene PRIMA della riga di indicatori: la
     prima cosa che si vede aprendo IAM è l’andamento, non tre cifre. */
  deve(html.indexOf('id="vol-card"') < html.indexOf('id="kpi-riga"'),
    'la riga degli indicatori sta sopra il grafico');
  return 'un SVG, un numero grande, e il grafico per primo';
});

await e.provaAsync('UNO ZERO DISEGNA ZERO: 300 € e «niente» non sono la stessa altezza', async () => {
  /* Il difetto misurato sul portafoglio vero: l’altezza aveva un minimo del
     2%, quindi gennaio 2025 (nessuna polizza) e febbraio 2025 (300 €)
     finivano alla STESSA altezza. Sono due fatti diversi (§8.1). */
  const s = conSchermata({ 'rpc:iam_produzione_confronto': FORMA_VERA });
  await s.ctx.volCarica(true);
  const p = punti(corpo(s), 'vol-l-prec');
  deve(p && p.length >= 2, 'non si legge la curva dell’anno scorso');
  const base = Math.max(...p.map(q => q[1]));
  deve(p[0][1] === base, 'gennaio, che non ha nessuna polizza, non sta sulla linea di base: ' + p[0][1]);
  deve(p[1][1] < base, 'febbraio, che ha 300 €, sta alla stessa altezza di un mese vuoto');
  /* E luglio, che è il massimo, sta in cima. */
  deve(p[6][1] === Math.min(...p.map(q => q[1])), 'il mese più grande non è il punto più alto');
  return 'zero sulla base, 300 sopra, il massimo in cima';
});

await e.provaAsync('UN MESE NON ANCORA ARRIVATO NON HA UNA CURVA: la linea si FERMA', async () => {
  /* Il difetto peggiore, e quello che si legge come una notizia falsa:
     ottobre 2026 non è un mese andato male, è un mese che non c’è ancora. Una
     curva che precipita a zero lì, accanto all’area alta di ottobre 2025, si
     legge come un crollo verticale. */
  const s = conSchermata({ 'rpc:iam_produzione_confronto': FORMA_VERA });
  await s.ctx.volCarica(true);
  const h = corpo(s);
  const ora = punti(h, 'vol-l-ora');
  deve(ora && ora.length === 9, 'la curva dell’anno in corso ha ' + (ora || []).length
    + ' punti: deve fermarsi a settembre, cioè nove');
  /* L’anno scorso invece prosegue, tratteggiato: è produzione vera. */
  const fuori = punti(h, 'vol-l-fuori');
  deve(fuori && fuori.length === 4, 'i mesi fuori confronto non proseguono tratteggiati: '
    + (fuori || []).length + ' punti (attesi 4: da settembre a dicembre)');
  /* E si attacca alla linea piena invece di cominciare staccato. */
  const prec = punti(h, 'vol-l-prec');
  deve(fuori[0][0] === prec[prec.length - 1][0], 'il tratteggio non parte dove finisce la linea piena');
  return '9 punti quest’anno, il tratteggio attaccato per gli altri tre mesi';
});

await e.provaAsync('IL NUMERO ESATTO SI LEGGE COL DITO, e i tre zeri restano tre', async () => {
  /* Il tooltip nativo non esiste sul telefono, ed è dove IAM si guarda metà
     delle volte: ogni mese è un bottone vero, e il numero compare sotto. */
  const s = conSchermata({ 'rpc:iam_produzione_confronto': FORMA_VERA });
  await s.ctx.volCarica(true);
  deve((corpo(s).match(/class="vol-tocco"/g) || []).length === 12,
    'le zone da toccare non sono dodici');
  deve(/Tocca un mese/.test(corpo(s)), 'non dice che si può toccare');

  /* Luglio: i due numeri veri. */
  s.ctx.volMese(6);
  const lug = corpo(s);
  deve(euro(50000).test(lug) && euro(95000).test(lug), 'il dettaglio di luglio non porta i due importi: ' + lug.slice(0, 300));

  /* Ottobre: non è ancora arrivato — e NON è «0,00 €». */
  s.ctx.volMese(9);
  const ott = corpo(s);
  deve(/non è ancora arrivato/.test(ott), 'ottobre non dice che non è ancora arrivato: ' + ott.slice(0, 300));
  deve(/resta fuori dal confronto/.test(ott), 'non dice che quel mese resta fuori dai totali');

  /* Settembre: tre polizze, nessun premio noto. Scrivere «0,00 €» qui sarebbe
     il numero credibile e falso — quelle polizze ci sono. */
  s.ctx.volMese(8);
  const set = corpo(s);
  deve(/premio non noto/.test(set), 'un mese senza premi noti dice zero: ' + set.slice(0, 400));
  deve(/3 polizze/.test(set), 'non dice che quelle polizze ci sono');

  /* E ritoccando lo stesso mese si richiude. */
  s.ctx.volMese(8);
  deve(/Tocca un mese/.test(corpo(s)), 'ritoccare lo stesso mese non richiude il dettaglio');
  return 'luglio coi numeri, ottobre non arrivato, settembre senza premio noto';
});

await e.provaAsync('UN CODICE CHE NESSUNO HA DECISO NON PRENDE UN NOME', async () => {
  /* §19: un nome scelto per somiglianza qui vuol dire attribuire a una
     persona la produzione di un'altra. Il lavoro da fare si conta e si dice
     dove si fa. */
  const s = conSchermata({
    iam_produzione_mensile: MENSILE,
    quote_collaboratori: [{ id: 'p1', nome: 'Anna', cognome: 'Neri' }]
  });
  await s.ctx.prdCarica(true);
  const h = s.browser.elemento('prd-produttori').innerHTML || '';
  deve(/Neri Anna/.test(h), 'il collaboratore deciso non compare col suo nome');
  deve(/U200/.test(h), 'il codice non deciso non si mostra');
  deve(/da abbinare/.test(h), 'il codice non deciso non è marcato');
  deve(/Nessuno ha ancora detto chi è/.test(h), 'non dice perché quel codice non ha un nome');
  deve(/Decisioni aperte/.test(h), 'non dice dove si decide');
  /* Nessun nome accostato a quel codice: la prova che conta. */
  const dopoCodice = h.slice(h.indexOf('U200'), h.indexOf('U200') + 400);
  deve(!/Neri Anna/.test(dopoCodice), 'al codice non deciso è stato accostato un nome');
  return 'un nome deciso, un codice nudo, e la strada per abbinarlo';
});

await e.provaAsync('la produzione senza premio non vale zero, e si dichiara', async () => {
  /* §36, §42: sommare zero fa un portafoglio più povero del vero, e un numero
     più basso su una scrivania nessuno lo mette in dubbio. */
  const s = conSchermata({ iam_produzione_mensile: MENSILE, quote_collaboratori: [] });
  await s.ctx.prdCarica(true);
  const somma = s.browser.elemento('prd-somma').innerHTML || '';
  const prod = s.browser.elemento('prd-produttori').innerHTML || '';
  deve(/2 polizze senza premio annuo/.test(somma), 'il riepilogo non dichiara le polizze senza premio: ' + somma);
  deve(/non valgono zero|non vale zero/.test(prod), 'la riga non dichiara che quelle polizze restano fuori');
  return 'contate, dichiarate, e fuori dagli importi';
});

await e.provaAsync('i filtri agiscono, e un filtro non scelto NON filtra', async () => {
  /* §42: confondere «non filtrato» con «nessuno» svuota una schermata e fa
     cercare per mezz’ora un guasto che non c’è. */
  const s = conSchermata({ iam_produzione_mensile: MENSILE, quote_collaboratori: [] });
  await s.ctx.prdCarica(true);
  const tutte = s.browser.elemento('prd-somma').innerHTML || '';
  deve(euro(1500).test(tutte), 'senza filtri il totale non è 1.500: ' + tutte);
  s.browser.elemento('prd-anno').value = '2025';
  s.ctx.prdRender();
  deve(euro(200).test(s.browser.elemento('prd-somma').innerHTML || ''), 'il filtro per anno non agisce');
  s.ctx.prdAzzera();
  deve(euro(1500).test(s.browser.elemento('prd-somma').innerHTML || ''), 'azzerando i filtri il totale non torna');
  return '1.500 → 200 → 1.500';
});

e.prova('la ricerca parte al CLIC, non a ogni tasto', () => {
  /* Lo standard delle liste di IAM (§22): i campi da riempire non ricalcolano
     da soli. Un clic su «Azzera» invece è già un clic. */
  const i = html.indexOf('id="panel-produzione"');
  const j = html.indexOf('</div>', html.indexOf('id="prd-rami"'));
  const seg = html.slice(i, j);
  deve(!/oninput=/.test(seg), 'un filtro ricalcola a ogni tasto');
  deve(!/onchange="prdRender/.test(seg), 'un filtro ricalcola al cambio invece che al clic');
  deve(/onclick="prdRender\(\)"/.test(seg), 'manca il tasto Cerca');
  deve(/onclick="prdAzzera\(\)"/.test(seg), 'manca il tasto Azzera filtri');
  return 'Cerca e Azzera, nessun ricalcolo automatico';
});

e.prova('dalla schermata non si scrive niente', () => {
  /* È una lettura. Una schermata di consuntivo che sa scrivere è una
     schermata da cui un giorno qualcuno «sistema» un numero. */
  const b = ['volCarica', 'volHTML', 'prdCarica', 'prdRender', 'prdTabella', 'prdProduttoriHTML', 'prdEsporta']
    .map(n => ritaglia(html, n) || '').join('\n');
  deve(!/\.update\(|\.insert\(|\.upsert\(|\.delete\(/.test(b), 'dalla produzione si scrive');
  return 'sola lettura';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
