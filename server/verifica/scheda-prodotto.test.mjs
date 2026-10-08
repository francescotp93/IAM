// ═══════════════════════════════════════════════════════════════════════════════
//  METTERE UN PRODOTTO IN ARCHIVIO LEGGENDO IL SUO DOCUMENTO
//
//  La cosa che queste prove difendono è una sola, e non è un dettaglio di
//  lettura: QUESTO MOTORE NON SCRIVE MAI 'assente'.
//
//  Sul set informativo vero su cui è stato misurato (DALLBOGG auto 06/2020, 61
//  pagine) gli «assente» giusti sono ZERO, e cinque tentativi indipendenti di
//  dedurli automaticamente hanno prodotto tutti un dato falso: dicevano «NON
//  COMPRESA» su cristalli, eventi naturali, eventi sociopolitici, collisione e
//  guasti dai ladri, cioè su garanzie che quel prodotto vende.
//
//  Il confronto lo si mostra a un cliente. Dire che un concorrente non copre
//  una cosa che invece copre non è una casella storta: è adeguatezza
//  (Reg. IVASS 40 e 41), e lo si scopre quando il cliente torna col documento
//  in mano.
//
//  I numeri di questo file vengono dalla misura su quel documento, non da
//  valori inventati: 12 presenti, 5 non lette, 0 assenti, 3 pagine orfane.
//
//      node server/verifica/scheda-prodotto.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const S = require(path.join(RADICE, 'tariffe', 'motore', 'scheda-prodotto.js'));
const C = require(path.join(RADICE, 'tariffe', 'motore', 'confronto.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };
const g = (s, id) => s.garanzie.filter((x) => x.garanzia === id)[0];

/* ── IL DOCUMENTO DI PROVA ────────────────────────────────────────────────────
   Costruito sulle forme VERE misurate sul set informativo DALLBOGG, con nomi e
   importi inventati dove il documento vero porterebbe i suoi. Ogni pagina qui
   sotto riproduce una trappola misurata, e il commento dice quale.

   Il documento vero NON sta in questo repository: è il materiale di una
   compagnia, e una prova non ha bisogno di portarselo dietro per misurare le
   stesse forme. */
const DOC = [
  /* pag.1 — la copertina: il tipo e l'edizione, e nessun piè di pagina
     (sul documento vero è una delle tre pagine orfane). */
  { n: 1, testo: 'SET INFORMATIVO\nAUTO\nDOCUMENTO INFORMATIVO PRECONTRATTUALE (DIP)\nEdizione 06/2020' },

  /* pag.2 — il DIP. Qui dentro:
     · il titolo che costituisce la garanzia OBBLIGATORIA, che in un documento
       auto vero non ha nessuna intestazione sua;
     · l'elenco delle opzionali su quattro righe, con l'ultimo nome — Rinuncia
       alla rivalsa — sulla quarta: è la garanzia che si perdeva. */
  { n: 2, testo: 'Questa polizza assicura i rischi della Responsabilità Civile Auto (R.C.A.) delle «Autovetture»\n'
      + 'Il presente Documento fornisce una sintesi delle principali coperture ed esclusioni del prodotto\n'
      + 'Che cosa è assicurato?\n'
      /* Il massimale di legge: è un numero VERO del documento che NON è il
         massimale della garanzia. Deve finire fra gli importi non attribuiti,
         non addosso alla RCA. */
      + 'La legge prevede un massimale minimo per sinistro pari a Euro 7.290.000,00\n'
      + 'Puoi inoltre integrare la polizza con le seguenti ulteriori\n'
      + 'garanzie opzionali (i dettagli sono riportati nel DIP Aggiuntivo):\n'
      + 'Incendio; Furto; Guasti Accidentali (Kasko/Collisione);\n'
      + 'Garanzie Aggiuntive (Cristalli, Eventi Naturali, Eventi\n'
      + 'Sociopolitici, Assistenza, Rinuncia alla Rivalsa).\n'
      + 'SET INFORMATIVO AUTO - DIP DANNI' },

  /* pag.3 — seconda pagina dello stesso fascicolo: serve perché un piè di
     pagina diventa confine solo se si ripete. */
  { n: 3, testo: 'Che cosa non è assicurato?\nNon sono coperti i danni subiti dal conducente responsabile del sinistro.\n'
      + 'SET INFORMATIVO AUTO - DIP DANNI' },

  /* pag.4 — il DIP aggiuntivo, e LA TRAPPOLA PRINCIPALE: «Non previste» è il
     valore della casella «Ulteriori garanzie con un premio aggiuntivo», non
     un'assenza. Sul documento vero questa forma compare cinque volte e
     negava cinque garanzie vendute. */
  { n: 4, testo: 'Cristalli (opzionale ma solo in abbinamento con le garanzie Eventi\nNaturali, Incendio, Furto e Rapina)\n'
      + 'Garanzie di base\nL\'assicurazione vale per la rottura dei cristalli del veicolo.\n'
      /* L'importo di un SOTTOCASO, nella forma in cui si attacca davvero alla
         garanzia («Nome: etichetta € importo»). Senza la regola della frase
         condizionata questi 300 € diventerebbero LA franchigia dei cristalli. */
      + 'Cristalli: franchigia € 300,00 solo se richiamata in polizza.\n'
      + 'Ulteriori garanzie con un premio\naggiuntivo\nNon previste\n'
      + 'SET INFORMATIVO AUTO - DIP AGGIUNTIVO RCA pag. 1 di 3' },

  /* pag.5 — due blocchi che il vocabolario distingue solo se li si legge per
     esattezza: «Kasko» è un nome esatto, «Collisione con veicoli
     identificati» contiene il sinonimo «collisione» e si prendeva il posto
     della kasko. Più una copertura che il vocabolario non conosce. */
  { n: 5, testo: 'Collisione con veicoli identificati (opzionale)\nGaranzie di base\n'
      + 'L\'assicurazione vale per l\'urto con altro veicolo identificato.\n'
      /* QUESTO TITOLO VIENE PRIMA DI «Kasko» DI PROPOSITO. Contiene il
         sinonimo «kasko» dentro una frase più lunga, cioè un riconoscimento
         NON esatto: senza la regola dell'esattezza si prende lui il posto
         della kasko, e la kasko finisce in archivio col nome sbagliato. */
      + 'Danni da collisione con altri mezzi (opzionale)\nGaranzie di base\n'
      + 'L\'assicurazione vale per i danni da collisione.\n'
      + 'Kasko (opzionale)\nGaranzie di base\nL\'assicurazione opera in caso di danno al veicolo.\n'
      + 'Garanzia GAP (Cash Back) (opzionale)\nGaranzie di base\nRimborso della differenza di valore.\n'
      + 'SET INFORMATIVO AUTO - DIP AGGIUNTIVO RCA pag. 2 di 3' },

  /* pag.6 — LA SECONDA TRAPPOLA: una negazione che nomina la garanzia ed è
     una CONDIZIONE DI OPERATIVITÀ, non un'assenza. Sul documento vero è
     l'unica riga che accosta una negazione al nome di una garanzia, e
     prenderla per un'assenza negava una garanzia venduta a premio.
     Più la tabella appiattita per area, con le etichette di colonna nella
     riga sopra. */
  { n: 6, testo: 'e Garanzia Guasti Cagionati dai ladri (o danneggiamenti)\n'
      + 'In caso di solo furto totale la garanzia Guasti Cagionati dai ladri è da intendersi non attiva.\n'
      + 'Guasti Franchigia Franchigia Franchigia\ncagionati 2.000,00 € 1.000,00 € 500,00 €\ndai ladri\n'
      + 'SET INFORMATIVO AUTO - DIP AGGIUNTIVO RCA pag. 3 di 3' },

  /* pag.7 — le Condizioni, col piè di pagina IN TESTA come l'allegato vero
     dell'assistenza: guardando solo in fondo, queste pagine restavano orfane
     e i loro numeri non si leggevano.
     Dentro: LA TERZA TRAPPOLA, un importo in una frase condizionata. Sul
     documento vero dava agli eventi sociopolitici una franchigia di 30 €
     mentre la loro vera è la tabella per area. */
  { n: 7, testo: 'CONDIZIONI DI ASSICURAZIONE pag. 1 di 2\nSEZIONE A - GARANZIA EVENTI SOCIOPOLITICI ED ATTI VANDALICI\n'
      + 'La Società garantisce l\'indennizzo dei danni da imbrattamento, solo nel caso di atti vandalici\n'
      + 'con franchigia fissa di € 30,00.\n'
      + 'Eventi sociopolitici Franchigia Franchigia\natti vandalici 1.000,00 € 500,00 €' },

  /* pag.8 — un massimale con la sua etichetta nella stessa riga: è l'unico
     modo in cui un numero si archivia. */
  { n: 8, testo: 'CONDIZIONI DI ASSICURAZIONE pag. 2 di 2\nSEZIONE B - GARANZIA ASSISTENZA STRADALE\n'
      + 'Assistenza stradale: massimale € 1.500,00 per sinistro.\n'
      /* La GAP una seconda volta, in un altro fascicolo: è UNA copertura, non
         due, e nell'elenco di quelle non riconosciute deve comparire una
         volta sola. */
      + 'SEZIONE C - GARANZIA GAP (Cash Back)\nRimborso della differenza di valore.\n'
      + 'ART. 9 - Oneri fiscali\nGli oneri fiscali sono a carico del contraente.' },

  /* pag.9-10 — una pagina piena di importi che NON si attribuiscono a nessuna
     garanzia: sul documento vero sono 82, qui 45, abbastanza per vedere se
     l'elenco si taglia e il conto resta intero. Sono le righe dei sottocasi:
     massimali di legge, rivalse limitate, scoperti per antifurto. */
  { n: 9, testo: 'Allegato A - Card Base - Rev. 2020/05 pag. 1 di 2\n'
      + Array.from({ length: 45 }, (_, k) =>
        'La Società rivale fino a concorrenza di € ' + (k + 1) + '.100,00 per il caso n. ' + (k + 1)).join('\n') },
  { n: 10, testo: 'Allegato A - Card Base - Rev. 2020/05 pag. 2 di 2\nFine dell\'allegato.' },
];

// ── 1. i fascicoli, e le pagine che restano fuori ────────────────────────────

prova('il documento si divide in fascicoli sul piè di pagina, scoperto non elencato', () => {
  const f = S.fascicoli(DOC);
  deve(f.ok, f.motivo);
  const tipi = f.fascicoli.map((x) => x.tipo + ' ' + x.da + '-' + x.a);
  deve(tipi.some((t) => /^dip 2-3$/.test(t)), 'fascicoli: ' + tipi.join(' | '));
  deve(tipi.some((t) => /^dip_aggiuntivo 4-6$/.test(t)), 'fascicoli: ' + tipi.join(' | '));
  deve(tipi.some((t) => /^condizioni 7-8$/.test(t)), 'fascicoli: ' + tipi.join(' | '));
});

prova('IL PIÈ DI PAGINA SI CERCA ANCHE IN TESTA, non solo in coda', () => {
  /* L'allegato vero dell'assistenza lo stampa in cima, e dentro ci sono i
     suoi massimali: guardando solo in fondo quelle pagine restavano orfane. */
  const f = S.fascicoli(DOC);
  const cond = f.fascicoli.filter((x) => x.tipo === 'condizioni')[0];
  deve(cond, 'il fascicolo col piè di pagina in testa non si riconosce: ' +
    f.fascicoli.map((x) => x.tipo).join(' | '));
  deve(cond.pagine.indexOf(7) >= 0 && cond.pagine.indexOf(8) >= 0, 'pagine: ' + JSON.stringify(cond.pagine));
  deve(f.orfane.indexOf(7) < 0 && f.orfane.indexOf(8) < 0, 'restano orfane: ' + JSON.stringify(f.orfane));
});

prova('una pagina senza piè di pagina si DICHIARA, non si butta in silenzio', () => {
  /* La soglia in percentuale, che era la prima idea, lasciava passare il 12%
     del documento vero — tutto l'allegato — senza che nessuno lo sapesse. */
  const f = S.fascicoli(DOC);
  deve(f.orfane.length === 1 && f.orfane[0] === 1,
    'pagine orfane: ' + JSON.stringify(f.orfane) + ' — la copertina non si dichiara');
  const s = S.scheda(DOC);
  deve(s.avvertenze.some((a) => /non appartengono a nessun fascicolo/.test(a) && /\b1\b/.test(a)),
    'avvertenze: ' + JSON.stringify(s.avvertenze));
});

prova('una copertina lontana non diventa un piè di pagina', () => {
  /* «Edizione 06/2020» chiude la copertina del set e la copertina delle
     Condizioni: sono due pagine lontane, e una famiglia vale come confine
     solo se compare su due pagine DI FILA. */
  const f = S.fascicoli(DOC);
  deve(!f.fascicoli.some((x) => /edizione/i.test(x.piede)),
    'una copertina è diventata un fascicolo: ' + f.fascicoli.map((x) => x.piede).join(' | '));
});

// ── 2. LA REGOLA CHE REGGE TUTTO ─────────────────────────────────────────────

const s = S.scheda(DOC);

prova('NON SI SCRIVE MAI «assente»', () => {
  deve(s.ok, s.motivo);
  deve(s.conta.assente === 0, 'ha scritto ' + s.conta.assente + ' «assente»: ' +
    s.garanzie.filter((x) => x.stato === 'assente').map((x) => x.garanzia).join(', '));
  deve(!s.garanzie.some((x) => x.stato === 'assente'), 'una garanzia è stata segnata assente');
  deve(s.garanzie.every((x) => ['presente', 'non_letto'].indexOf(x.stato) >= 0),
    'stati fuori dai due ammessi: ' + s.garanzie.map((x) => x.stato).join(', '));
});

prova('e lo DICE, invece di lasciar credere che il documento non escluda niente', () => {
  deve(s.avvertenze.some((a) => /non .*«assente»|«assente».*mai|Nessuna garanzia è stata segnata/.test(a)),
    'avvertenze: ' + JSON.stringify(s.avvertenze));
});

prova('«NON PREVISTE» NON È UN\'ASSENZA: è la casella delle estensioni', () => {
  /* La trappola che negava cinque garanzie vendute. «Ulteriori garanzie con
     un premio aggiuntivo: Non previste» vuol dire «niente da aggiungere
     sopra questa garanzia», e la riga «Garanzie di base» subito sopra la
     descrive come operante. */
  const c = g(s, 'cristalli');
  deve(c, 'cristalli non c\'è fra le garanzie del ramo');
  deve(c.stato === 'presente', 'cristalli è «' + c.stato + '» su un prodotto che li vende');
  /* E la costituzione deve venire dal BLOCCO, che è la prova più forte —
     titolo più «Garanzie di base» — non dall'elenco di pagina 2. Senza
     questo, un difetto che fa saltare il blocco passerebbe inosservato
     perché l'elenco salverebbe lo stato. */
  deve(c.forma === 'blocco', 'la costituzione viene da «' + c.forma + '» invece che dal blocco');
  deve(c.pagina === 4, 'pagina: ' + c.pagina);
});

prova('UNA CONDIZIONE DI OPERATIVITÀ NON È UN\'ASSENZA', () => {
  /* «In caso di solo furto totale la garanzia Guasti Cagionati dai ladri è da
     intendersi non attiva» — è l'unica riga del documento vero che accosta
     una negazione al nome di una garanzia, e non è un'assenza: è una
     condizione. Letta come assenza, nega una garanzia venduta a premio. */
  const x = g(s, 'guasti_ladri');
  deve(x.stato === 'presente', 'guasti_ladri è «' + x.stato + '»: una negazione condizionata è stata letta come assenza');
  deve(/Guasti Cagionati dai ladri/i.test(x.nome_documento || ''), 'nome: ' + x.nome_documento);
});

prova('quello che il documento non nomina resta «non letto», mai assente', () => {
  ['infortuni_conducente', 'tutela_legale', 'bonus_protetto', 'collisione_non_assicurati'].forEach((id) => {
    const x = g(s, id);
    deve(x, id + ' non c\'è fra le garanzie del ramo');
    deve(x.stato === 'non_letto', id + ' è «' + x.stato + '» e il documento non lo nomina');
    deve(/non la nomina/.test(x.perche || ''), id + ': ' + x.perche);
  });
});

prova('una garanzia non letta non porta numeri, NEMMENO SE GLIELI DANNO', () => {
  /* Il database ha un vincolo che lo impone: una garanzia «non letta» con un
     massimale di 10.000 € è un dato inventato con sopra l'etichetta di dato
     mancante. Qui la riga arriva già sbagliata, come arriverebbe da una
     schermata dove qualcuno ha spuntato «non letta» dopo aver scritto un
     numero: il motore la deve ripulire, non passarla a Postgres e scoprirlo
     da un errore. */
  const finta = { ok: true, garanzie: [
    { garanzia: 'kasko', nome_documento: 'Kasko', stato: 'non_letto',
      massimale: 10000, franchigia: 250, scoperto: 10, pagina: 3, frase: 'riga inventata' }] };
  const a = S.daArchiviare(finta);
  deve(a.ok, a.motivo);
  const r = a.garanzie[0];
  deve(r.massimale === null && r.franchigia === null && r.scoperto === null,
    'i numeri di una garanzia non letta sono passati: ' + JSON.stringify(r));
  /* E su quella vera non ce ne sono comunque. */
  S.daArchiviare(s).garanzie.filter((x) => x.stato === 'non_letto').forEach((x) => {
    deve(x.massimale == null && x.franchigia == null && x.scoperto == null,
      x.garanzia + ' è non letta e porta numeri: ' + JSON.stringify(x));
  });
});

// ── 3. la costituzione: chi esiste in questo prodotto ────────────────────────

prova('LA GARANZIA OBBLIGATORIA LA COSTITUISCE IL TITOLO DEL PRODOTTO', () => {
  /* In un documento auto vero la RCA non ha nessuna intestazione sua: la RCA
     *è* la polizza, e le sezioni servono per le opzionali. Senza questa
     regola la garanzia obbligatoria risultava «non letta», cioè lo strumento
     sembrava rotto proprio sulla riga che un cliente guarda per prima. */
  const r = g(s, 'rca');
  deve(r.stato === 'presente', 'la RCA è «' + r.stato + '» su una polizza RC Auto');
  deve(r.forma === 'titolo', 'forma: ' + r.forma);
  deve(/Responsabilità Civile Auto/i.test(r.frase || ''), 'frase: ' + r.frase);
});

prova('L\'ULTIMO NOME DELL\'ELENCO NON SI PERDE', () => {
  /* «Rinuncia alla Rivalsa» chiude un elenco che occupa quattro righe. Una
     versione di questo motore ne leggeva tre e quella garanzia — venduta a
     premio — risultava non letta. */
  const x = g(s, 'rinuncia_rivalsa');
  deve(x.stato === 'presente', 'rinuncia_rivalsa è «' + x.stato + '»: l\'elenco si legge troppo corto');
  deve(x.forma === 'elenco', 'forma: ' + x.forma);
});

prova('«Kasko» e «Collisione con veicoli identificati» sono due garanzie diverse', () => {
  /* Non è pignoleria: la kasko paga anche quando sei solo, la collisione con
     identificati solo se l'altro c'è e si sa chi è. Col solo sinonimo
     «collisione» della kasko, il secondo blocco si prendeva il posto del
     primo e la kasko vera spariva. */
  const k = g(s, 'kasko'), c = g(s, 'collisione_identificati');
  deve(k && c, 'una delle due non è nel vocabolario: ' + JSON.stringify([!!k, !!c]));
  deve(k.stato === 'presente' && c.stato === 'presente',
    'kasko=' + k.stato + ' collisione_identificati=' + c.stato);
  deve(/^kasko$/i.test((k.nome_documento || '').trim()),
    'la kasko ha preso il nome dell\'altra: «' + k.nome_documento + '»');
  deve(/collisione con veicoli identificati/i.test(c.nome_documento || ''),
    'nome: «' + c.nome_documento + '»');
});

prova('il vocabolario distingue davvero le due, e la guida le spiega diverse', () => {
  deve(C.garanziaDi('auto', 'collisione_identificati'), 'collisione_identificati non è nel vocabolario auto');
  const G = require(path.join(RADICE, 'tariffe', 'motore', 'guida-garanzie.js'));
  const e = (G.ESEMPI || {}).collisione_identificati;
  deve(e && e.esempio, 'la guida non ha un esempio per collisione_identificati');
  deve(/identific/i.test(e.esempio) && /non interviene|non opera|scappa/i.test(e.esempio),
    'l\'esempio non dice la differenza con la kasko: ' + e.esempio);
});

prova('la prosa del contratto non costituisce una garanzia', () => {
  /* «la garanzia furto e danni al bagaglio» è prosa. Una versione di questo
     motore la prendeva per un titolo, perché comincia con «garanzia». */
  /* La riga è nella forma che il motore riconosce come titolo travestito —
     una lettera, uno spazio, «garanzia» — perché è così che l'estrazione da
     PDF produce il titolo vero dei guasti dai ladri. La differenza è che qui
     quello che segue non è un nome di garanzia ma un pezzo di frase, e il
     nome non si riconosce per intero. */
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X pag. 1 di 2' },
    { n: 2, testo: 'e garanzia furto e danni al bagaglio del passeggero\nSET X pag. 2 di 2' }]);
  deve(d.ok, d.motivo);
  deve(g(d, 'furto').stato === 'non_letto',
    'una frase di prosa ha costituito il furto: ' + JSON.stringify(g(d, 'furto')));
});

prova('un importo non si attribuisce a un nome riconosciuto a metà', () => {
  /* «Danni da furto e rapina: massimale € 20.000,00» nomina il furto dentro
     una frase più lunga: il riconoscimento non è esatto, e attribuire quel
     numero al furto vuol dire scrivere un massimale su un'ancora incerta. */
  const d = S.scheda([
    { n: 1, testo: 'Prodotto: AUTO assicurazione\nFurto (opzionale)\nGaranzie di base\nopera.\nSET X pag. 1 di 2' },
    { n: 2, testo: 'Danni da furto e rapina: massimale € 20.000,00\nSET X pag. 2 di 2' }]);
  deve(d.ok, d.motivo);
  deve(g(d, 'furto').massimale === null,
    'ha attribuito l\'importo a un nome riconosciuto a metà: ' + g(d, 'furto').massimale);
  deve(d.quantiNonAttribuiti >= 1, 'e non lo dichiara: ' + d.quantiNonAttribuiti);
});

prova('il glossario definisce le garanzie, non le vende', () => {
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X pag. 1 di 2' },
    { n: 2, testo: 'GLOSSARIO\nKasko (opzionale)\nGaranzie di base\nDefinizione di kasko.\nSET X pag. 2 di 2' }]);
  deve(g(d, 'kasko').stato === 'non_letto',
    'una voce di glossario ha costituito la kasko: ' + JSON.stringify(g(d, 'kasko')));
});

// ── 4. i numeri: solo dove l'ancora è esplicita ──────────────────────────────

prova('un massimale si archivia solo se la sua etichetta è nella stessa riga', () => {
  const x = g(s, 'assistenza');
  deve(x.stato === 'presente', 'assistenza: ' + x.stato);
  deve(x.massimale === 1500, 'massimale: ' + x.massimale + ' (atteso 1500)');
  deve(x.pagina === 8, 'pagina: ' + x.pagina);
});

prova('UNA TABELLA APPIATTITA NON DIVENTA UN MASSIMALE', () => {
  /* «Franchigia Franchigia Franchigia» sopra e tre importi sotto: sono tre
     franchigie per area. Prendere il primo numero come massimale è il modo
     più credibile di scrivere un massimale falso. */
  const x = g(s, 'guasti_ladri');
  deve(x.massimale === null, 'massimale da una tabella di franchigie: ' + x.massimale);
  deve(x.franchigie_per_area && x.franchigie_per_area.length === 3,
    'le tre franchigie per area non si tengono: ' + JSON.stringify(x.franchigie_per_area));
  deve(x.daGuardare && /tabella/.test(x.daGuardare), 'non si dichiara: ' + x.daGuardare);
});

prova('UN IMPORTO IN UNA FRASE CONDIZIONATA NON È IL NUMERO DELLA GARANZIA', () => {
  /* «danni da imbrattamento, SOLO NEL CASO DI atti vandalici con franchigia
     fissa di € 30,00»: trenta euro sono di un caso particolare, e la
     franchigia vera degli eventi sociopolitici è la tabella per area. Una
     versione di questo motore archiviava 30 al posto di 1.000. */
  /* Il caso che misura davvero: «Cristalli: franchigia € 300,00 solo se
     richiamata in polizza» è nella forma che si attacca alla garanzia — il
     nome è esatto e l'importo sarebbe suo. Senza la regola, quei 300 €
     diventano LA franchigia dei cristalli. */
  const c = g(s, 'cristalli');
  deve(c.stato === 'presente', 'cristalli: ' + c.stato);
  deve(c.franchigia !== 300,
    'ha archiviato la franchigia del caso particolare: ' + c.franchigia);
  deve(c.franchigia == null, 'franchigia: ' + c.franchigia + ' — non è quella della garanzia');
  deve(c.daGuardare && /condizionata/.test(c.daGuardare),
    'non dichiara perché l\'importo non si è preso: ' + c.daGuardare);
  const x = g(s, 'eventi_sociopolitici');
  deve(x.stato === 'presente', 'eventi_sociopolitici: ' + x.stato);
  deve(x.franchigia !== 30, 'ha archiviato la franchigia del caso particolare: ' + x.franchigia);
});

prova('un numero su una pagina orfana non si archivia', () => {
  /* Non si sa da quale pezzo del documento venga, e un massimale senza pezzo
     non si può far ritrovare a nessuno. Sul documento vero era da là che
     arrivava un «massimale di assistenza 200 €» che è il limite cumulativo
     di recupero e traino di un allegato. */
  /* La pagina orfana sta PRIMA di quella buona: così, se il motore la
     guardasse, sarebbe il suo numero a vincere — il primo che arriva. Messa
     dopo, la prova passava anche col controllo spento. */
  const d = S.scheda([
    { n: 1, testo: 'Prodotto: AUTO assicurazione\nKasko (opzionale)\nGaranzie di base\nopera.\nnessun piede qui' },
    { n: 2, testo: 'Kasko: massimale € 7.000,00 cumulativo.\nnemmeno qui' },
    { n: 3, testo: 'Kasko: massimale € 99.000,00 per sinistro.\nSET X pag. 1 di 2' },
    { n: 4, testo: 'Fine.\nSET X pag. 2 di 2' }]);
  deve(d.ok, d.motivo);
  deve(d.orfane.indexOf(2) >= 0, 'la pagina 2 non è dichiarata orfana: ' + JSON.stringify(d.orfane));
  deve(g(d, 'kasko').massimale === 99000,
    'ha preso il numero della pagina orfana: ' + g(d, 'kasko').massimale);
});

// ── 5. quello che si dichiara di non sapere ──────────────────────────────────

prova('LE COPERTURE CHE IL VOCABOLARIO NON CONOSCE SI DICHIARANO', () => {
  /* Senza, spariscono dal confronto senza che nessun campo risulti «non
     letto»: il prodotto risulta più povero di quello che è e nessuno capisce
     perché. Sul documento vero sono GAP (Cash Back) e MoneyBox. */
  deve(s.fuoriVocabolario.length >= 1, 'non dichiara niente fuori vocabolario');
  deve(s.fuoriVocabolario.some((x) => /GAP/i.test(x.nome)),
    'la GAP non si dichiara: ' + JSON.stringify(s.fuoriVocabolario.map((x) => x.nome)));
  deve(s.avvertenze.some((a) => /il vocabolario non conosce/.test(a)),
    'non finisce fra le avvertenze: ' + JSON.stringify(s.avvertenze));
});

prova('e non si contano due volte quando stanno in due fascicoli', () => {
  const nomi = s.fuoriVocabolario.map((x) => x.nome.toLowerCase().replace(/^garanzi[ae]\s+/, ''));
  deve(nomi.length === nomi.filter((v, i, a) => a.indexOf(v) === i).length,
    'doppioni: ' + JSON.stringify(nomi));
});

prova('gli articoli delle condizioni generali non sono coperture', () => {
  /* Senza il vincolo «l\'intestazione deve dire GARANZIA», «Oneri fiscali»,
     «Foro competente» e «Reclami» finivano nell'elenco delle coperture non
     riconosciute. Sul documento vero erano 59 voci di cui 50 non sono
     garanzie, e un elenco così non lo guarda nessuno. */
  deve(!s.fuoriVocabolario.some((x) => /oneri fiscali|foro competente|reclami/i.test(x.nome)),
    'un articolo è diventato una copertura: ' + JSON.stringify(s.fuoriVocabolario.map((x) => x.nome)));
  deve(s.fuoriVocabolario.length <= 4, 'troppe voci, l\'elenco diventa illeggibile: ' + s.fuoriVocabolario.length);
});

prova('GLI IMPORTI CHE NON SI ATTRIBUISCONO SI ELENCANO, non si buttano', () => {
  /* Misurato sul documento vero con 128 letture indipendenti: gli importi
     sono 119, e quasi tutti appartengono a un sottocaso — il massimale di
     legge della RCA, lo scoperto dei cristalli, una rivalsa limitata, una
     franchigia per area e per antifurto. Attribuirne uno sarebbe inventare;
     buttarli in silenzio fa credere che il documento non li porti. */
  deve(s.quantiNonAttribuiti > 0, 'non ne dichiara nessuno su un documento che ne è pieno');
  deve(Array.isArray(s.importiNonAttribuiti) && s.importiNonAttribuiti.length > 0,
    'l\'elenco è vuoto: ' + JSON.stringify(s.importiNonAttribuiti));
  s.importiNonAttribuiti.forEach((x) => {
    deve(x.pagina != null, 'un importo senza pagina: ' + JSON.stringify(x));
    deve(x.riga && x.riga.length > 3, 'un importo senza la sua riga: ' + JSON.stringify(x));
  });
  deve(s.avvertenze.some((a) => /non sono stati attribuiti/.test(a)),
    'non finisce fra le avvertenze: ' + JSON.stringify(s.avvertenze));
  /* E non si archiviano: restano fuori dalle righe che vanno nel database. */
  const a = S.daArchiviare(s);
  deve(a.garanzie.every((x) => x.massimale === null || x.massimale > 0),
    'un importo non attribuito è finito in archivio');
});

prova('l\'elenco si taglia ma il conto resta intero', () => {
  /* Un elenco di ottanta righe non lo legge nessuno; un conto nascosto fa
     credere che non ci sia niente. */
  deve(s.importiNonAttribuiti.length === 40,
    'l\'elenco non si taglia a 40: ' + s.importiNonAttribuiti.length);
  /* E il conto deve essere PIÙ ALTO dell'elenco, non uguale: uguale vorrebbe
     dire che il taglio si è portato dietro anche il conto, cioè che il
     documento sembra avere 40 importi non attribuiti quando ne ha 47. */
  deve(s.quantiNonAttribuiti > 40,
    'il conto si è abbassato al taglio dell\'elenco: ' + s.quantiNonAttribuiti);
});

prova('l\'edizione si tiene come sta scritta, e più di una si dichiara', () => {
  /* «06/2020» è mese/anno e «2020/05» è anno/mese: due mesi diversi.
     Normalizzarle in una data vorrebbe dire inventare quale si intende. */
  deve(s.edizioni.length >= 1, 'nessuna edizione letta');
  deve(s.edizioni.some((e) => e.valore === '06/2020' && e.etichetta === 'edizione'),
    'edizioni: ' + JSON.stringify(s.edizioni));
  deve(s.edizioni.every((e) => e.pagina != null), 'un\'edizione senza pagina: ' + JSON.stringify(s.edizioni));
  /* «Rev. 2020/05» su DUE pagine, come sta sul documento vero (sei pagine
     dell'allegato): se non si contasse una volta sola, comparirebbe sei
     volte e l'elenco delle edizioni diventerebbe illeggibile. */
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nEdizione 06/2020\nSET X pag. 1 di 3' },
    { n: 2, testo: 'Rev. 2020/05\nSET X pag. 2 di 3' },
    { n: 3, testo: 'Rev. 2020/05\nSET X pag. 3 di 3' }]);
  deve(d.avvertenze.some((a) => /più di un'edizione/.test(a)),
    'due edizioni diverse e non lo dice: ' + JSON.stringify(d.avvertenze));
  const rev = d.edizioni.filter((e) => e.valore === '2020/05');
  deve(rev.length === 1, 'la stessa edizione contata ' + rev.length + ' volte: ' + JSON.stringify(d.edizioni));
});

prova('il documento che si dichiara una sintesi lo fa sapere', () => {
  deve(s.avvertenze.some((a) => /sintesi delle principali/.test(a)),
    'avvertenze: ' + JSON.stringify(s.avvertenze));
});

prova('UNA SCANSIONE SI DICHIARA PER QUELLO CHE È, non per «niente da leggere»', () => {
  /* «Non ho trovato garanzie» e «questo documento è un'immagine» sono due
     diagnosi opposte: la seconda si risolve chiedendo alla compagnia il PDF
     vero, la prima manda a spuntare a mano diciassette righe a vuoto. */
  const d = S.scheda([{ n: 1, testo: '' }, { n: 2, testo: '   ' }, { n: 3, testo: '\n \n' }]);
  deve(!d.ok, 'dice di aver letto un\'immagine');
  deve(d.scansione === true, 'non la riconosce come scansione: ' + JSON.stringify(d));
  deve(/scansione/i.test(d.motivo) && /immagine/i.test(d.motivo), 'motivo: ' + d.motivo);
  deve(d.pagine === 3, 'non dice quante pagine ha: ' + d.pagine);
  /* E NON si lamenta del ramo: con un'immagine il ramo non c'entra niente, e
     chiederlo farebbe provare e riprovare a vuoto. */
  deve(!/di che ramo/i.test(d.motivo), 'chiede il ramo a un\'immagine: ' + d.motivo);
});

prova('il ramo si legge dal documento, e se non si capisce si dice', () => {
  deve(s.ramo === 'auto', 'ramo: ' + s.ramo);
  const d = S.scheda([{ n: 1, testo: 'Gentile cliente, la ringraziamo per la fiducia.' }]);
  deve(!d.ok, 'ha letto un ramo da una lettera: ' + d.ramo);
  deve(/di che ramo/.test(d.motivo), 'motivo: ' + d.motivo);
});

prova('UN NOME CHE COPRE DUE PAGINE SU OTTANTA NON È IL TIPO DEL DOCUMENTO', () => {
  /* Misurato il 02/10/2026 su documenti veri di sei compagnie, scaricati dai
     loro siti. Il Guidamica di Groupama ha 84 pagine e si divide in tredici
     pezzi di cui UNO solo ha un piè di pagina riconoscibile — «allegato», due
     pagine — e il motore dichiarava tutto il documento «allegato». Lo stesso
     su Nobis («altro») e su AXA («informativa»).

     Un tipo sbagliato finisce in archivio, e poi un confronto dice di venire
     dal pezzo sbagliato: è peggio di non dirlo, perché manda a cercare una
     frase dove non c'è. */
  /* I CORPI DELLE PAGINE DEVONO ESSERE DIVERSI FRA LORO. Nella prima versione
     di questa prova erano tutti «contenuto», e il motore — che sceglie come
     piè di pagina il lato che si ripete di più — prendeva la TESTA invece
     della coda: tutto il documento diventava un pezzo solo senza nome, e
     usciva «altro» per un motivo che non c'entrava niente con la regola che
     si voleva provare. La prova passava e i guasti non venivano presi. */
  const tanti = [{ n: 1, testo: 'Prodotto: AUTO assicurazione\nKasko (opzionale)\nGaranzie di base\nopera.' }];
  /* Dodici pezzi con un piè di pagina che non dice che cosa siano… */
  for (let k = 0; k < 12; k++) {
    tanti.push({ n: tanti.length + 1, testo: 'riga di testo ' + tanti.length + '\nSezione ' + k + ' foglio A' });
    tanti.push({ n: tanti.length + 1, testo: 'riga di testo ' + tanti.length + '\nSezione ' + k + ' foglio A' });
  }
  /* …e uno solo, di due pagine, che si riconosce. */
  tanti.push({ n: tanti.length + 1, testo: 'riga di testo ' + tanti.length + '\nAllegato A - Card Base' });
  tanti.push({ n: tanti.length + 1, testo: 'riga di testo ' + tanti.length + '\nAllegato A - Card Base' });

  const d = S.scheda(tanti);
  deve(d.ok, d.motivo);
  deve(d.tipo === 'altro',
    'due pagine su ' + tanti.length + ' hanno deciso il tipo di tutto il documento: «' + d.tipo + '»');

  /* E quando invece il nome copre il documento, lo si dice. */
  const uno = S.scheda([
    { n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X - CONDIZIONI DI ASSICURAZIONE pag. 1 di 2' },
    { n: 2, testo: 'Kasko (opzionale)\nGaranzie di base\nopera.\nSET X - CONDIZIONI DI ASSICURAZIONE pag. 2 di 2' }]);
  deve(uno.tipo === 'condizioni', 'un documento tutto di condizioni esce come «' + uno.tipo + '»');
});

prova('il tipo di documento lo dicono i suoi fascicoli', () => {
  deve(s.tipo === 'set_informativo', 'tipo: ' + s.tipo + ' — con DIP, DIP aggiuntivo e condizioni è un set');
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X - DIP DANNI' },
    { n: 2, testo: 'altro\nSET X - DIP DANNI' }]);
  deve(d.tipo === 'dip', 'un solo fascicolo DIP dà tipo: ' + d.tipo);
});

prova('le legature del PDF non spezzano i nomi', () => {
  /* «identiﬁcati» con la legatura ﬁ non è «identificati»: sul documento vero
     quella legatura compare 216 volte. */
  deve(S.senzaLegature('identiﬁcati') === 'identificati', S.senzaLegature('identiﬁcati'));
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X pag. 1 di 2' },
    { n: 2, testo: 'Collisione con veicoli identiﬁcati (opzionale)\nGaranzie di base\nopera.\nSET X pag. 2 di 2' }]);
  deve(g(d, 'collisione_identificati').stato === 'presente',
    'la legatura ha fatto perdere la garanzia: ' + JSON.stringify(g(d, 'collisione_identificati')));
});

/* ── UN IMPORTO ATTACCATO A MANO SI DICHIARA (08/10/2026) ──────────────────
   MISURATO su 31 documenti veri di sei compagnie: zero massimali attribuiti su
   trenta documenti su trentuno. La regola dell'ancora — il nome della garanzia
   nella stessa riga del numero — è giusta e resta; quello che mancava era il
   pezzo umano, cioè una persona che attacca l'importo avendo davanti la frase
   e la pagina. Ma in archivio un numero messo a mano e uno letto dalla riga
   non valgono la stessa cosa, e devono distinguersi. */
prova('UN IMPORTO ATTACCATO A MANO ARRIVA IN ARCHIVIO MARCATO COME TALE', () => {
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X pag. 1 di 2' },
    { n: 2, testo: 'Furto e Incendio\nGaranzie di base\nopera.\nSET X pag. 2 di 2' }]);
  const gg = d.garanzie.filter((x) => x.garanzia === 'furto')[0];
  deve(gg, 'la garanzia di prova non esiste nel vocabolario');

  /* Prima: nessuna marcatura, la frase resta quella del documento. */
  const senza = S.daArchiviare(d, ['furto']).garanzie[0];
  deve(!/attaccato a mano/i.test(String(senza.frase || '')), 'marca a mano un importo che nessuno ha attaccato');

  /* Poi: la schermata attacca, come fa `cfnAttacca`. */
  gg.stato = 'presente'; gg.massimale = 25000; gg.pagina = 2;
  gg.attribuito_a_mano = ['massimale'];
  const con = S.daArchiviare(d, ['furto']).garanzie[0];
  deve(con.massimale === 25000, 'l\'importo attaccato non arriva in archivio');
  deve(/attaccato a mano/i.test(String(con.frase)), 'in archivio non resta scritto che è stato attaccato a mano: ' + con.frase);
  deve(/massimale/.test(String(con.frase)), 'non dice QUALE importo è stato attaccato');
  deve(/pagina 2/.test(String(con.frase)), 'non dice da quale pagina viene: ' + con.frase);
});

prova('UNA GARANZIA NON LETTA NON PORTA IMPORTI, E NON SI VANTA DI AVERLI', () => {
  /* Il vincolo del database vieta i numeri su una garanzia «non letta», e
     `daArchiviare` li toglie. Ma se la nota continuasse a dire «importo
     attaccato a mano», l'archivio direbbe di avere un numero che non ha. */
  const d = S.scheda([{ n: 1, testo: 'Prodotto: AUTO assicurazione\nSET X pag. 1 di 2' },
    { n: 2, testo: 'Furto e Incendio\nGaranzie di base\nopera.\nSET X pag. 2 di 2' }]);
  const gg = d.garanzie.filter((x) => x.garanzia === 'furto')[0];
  gg.stato = 'non_letto'; gg.massimale = 25000; gg.attribuito_a_mano = ['massimale'];
  const r = S.daArchiviare(d, ['furto']).garanzie[0];
  deve(r.massimale === null, 'un importo passa su una garanzia non letta: il database lo rifiuterebbe');
  deve(!/attaccato a mano/i.test(String(r.frase || '')),
    'dice di portare un importo attaccato a mano che invece è stato buttato: ' + r.frase);
});

/* ─────────────────────────────────────────────────────────────────────────────
   LA SEZIONE CHE IL REGOLAMENTO OBBLIGA A SCRIVERE          (08/10/2026)

   Perché questa prova esiste, coi numeri: il lettore è stato misurato su 207
   documenti veri scaricati dalle compagnie. Auto 5,2 garanzie riconosciute in
   media; casa 0,6, salute 0,5, VITA 0,0. Le forme che cercava — «X
   (opzionale)», «SEZIONE A - GARANZIA…», l'elenco delle opzionali — sono le
   forme di un set informativo AUTO, e fuori dall'auto i documenti non le
   usano: elencano le coperture sotto «Che cosa è assicurato?», che è una delle
   domande che il DIP DEVE portare.

   165 documenti su 214 hanno quella riga. Il motore non solo non la usava come
   ancora: non la riconosceva nemmeno come etichetta, perché la regex cercava
   «e'» con l'apostrofo mentre la riga, appianata, dice «e». Una regex che non
   ha mai combaciato con niente.

   LA COSA CHE QUESTA PROVA DIFENDE DAVVERO sta nell'ultima asserzione: sotto
   «Che cosa NON è assicurato?» ci sono le ESCLUSIONI, e leggerle come coperture
   sarebbe il modo più diretto di far risultare assicurato esattamente quello
   che non lo è — davanti a un cliente, su un foglio col nostro nome.
   ───────────────────────────────────────────────────────────────────────────── */
const DIP_CASA = [
  { n: 1, testo: 'DIP AGGIUNTIVO DANNI\nMultirischio abitazione\nDIP Aggiuntivo - Casa - ed. 06/2026 pag. 1 di 2' },
  { n: 2, testo: 'Che cosa è assicurato?\n'
      + 'Ad integrazione di quanto indicato nel DIP Danni, la polizza prevede le seguenti sezioni:\n'
      /* Forma 1: il nome, i due punti, la descrizione. */
      + '• Incendio del fabbricato: copre i danni all\'abitazione causati da incendio, esplosione o scoppio.\n'
      /* Forma 2: nome e descrizione attaccati, senza due punti — il taglio lo
         fa il verbo. */
      + '• Furto e rapina copre quanto sottratto dai ladri in caso di furto con destrezza o estorsione.\n'
      /* Forma 3: la spunta e la condizione fra parentesi. */
      + '✓ Tutela legale (operante se selezionata in Polizza)\n'
      /* Una copertura che il vocabolario non ha: va DICHIARATA, non buttata. */
      + '• Vita digitale: copre l\'assicurato e il suo nucleo familiare dai rischi su internet.\n'
      /* UNA VOCE CHE NON È UN NOME. Sta sotto la domanda, comincia col
         pallino, è lunga meno di settanta caratteri — e non è il nome di
         niente: è il seguito della frase di prima. Serve a misurare il
         vincolo delle otto parole, che senza un caso così non misura nulla. */
      + '• Sono previste garanzie aggiuntive tra le quali il fenomeno\n'
      /* E qui comincia il contrario delle coperture. */
      + 'Che cosa NON è assicurato?\n'
      + '✗ Danni da acqua causati da negligenza nella manutenzione delle tubazioni\n'
      + '✗ Assistenza domestica fuori dal territorio italiano\n'
      + 'DIP Aggiuntivo - Casa - ed. 06/2026 pag. 2 di 2' },
];

/* LO STESSO DOCUMENTO CON LE ESCLUSIONI A PALLINI, e serve proprio per questo.
   Nel documento sopra le esclusioni portano «✗», e quel marcatore le ferma da
   solo: la prova sulle esclusioni restava verde anche togliendo la chiusura
   della sezione, perché la fermava il secondo controllo. Misurato con un
   guasto: NON PRESO.

   Ma non tutte le compagnie usano la crocetta — molte elencano le esclusioni
   col pallino, identiche alle coperture. Qui dentro l'unica cosa che impedisce
   a un'esclusione di diventare una copertura è la CHIUSURA DELLA SEZIONE, e
   così il guasto si vede. */
const DIP_CASA_PALLINI = [
  { n: 1, testo: 'DIP AGGIUNTIVO DANNI\nMultirischio abitazione\nDIP Casa pallini - ed. 06/2026 pag. 1 di 2' },
  { n: 2, testo: 'Che cosa è assicurato?\n'
      + '• Incendio del fabbricato: copre i danni all\'abitazione causati da incendio.\n'
      + 'Che cosa NON è assicurato?\n'
      + '• Danni da acqua: esclusi i danni causati da negligenza nella manutenzione.\n'
      + '• Assistenza domestica: esclusa fuori dal territorio italiano.\n'
      + 'DIP Casa pallini - ed. 06/2026 pag. 2 di 2' },
];

prova('LE COPERTURE ELENCATE SOTTO «Che cosa è assicurato?» SI LEGGONO', () => {
  /* Il ramo si passa a mano: qui si misura l'ancora della sezione, non il
     riconoscimento del ramo, che ha la sua prova. */
  const d = S.scheda(DIP_CASA, { ramo: 'casa' });
  deve(d.ok, 'il documento non è stato letto: ' + d.motivo);
  ['incendio_fabbricato', 'furto_casa', 'tutela_legale_casa'].forEach((id) => {
    const x = g(d, id);
    deve(x && x.stato === 'presente', 'la copertura «' + id + '» elencata sotto la domanda non è stata letta');
    deve(x.forma === 'dip', 'è stata letta da un\'altra forma (' + x.forma + '), non dalla sezione del DIP');
  });
  /* Le tre forme devono funzionare tutt'e tre: se ne passasse una sola, la
     prova sopra resterebbe verde con due terzi del lavoro non fatto. */
  deve(g(d, 'incendio_fabbricato').nome_documento === 'Incendio del fabbricato',
    'il nome col «:» si porta dietro la descrizione: ' + g(d, 'incendio_fabbricato').nome_documento);
  deve(g(d, 'furto_casa').nome_documento === 'Furto e rapina',
    'il nome senza «:» non si taglia davanti al verbo: ' + g(d, 'furto_casa').nome_documento);
  deve(g(d, 'tutela_legale_casa').nome_documento === 'Tutela legale',
    'il nome con la parentesi si porta dietro la condizione: ' + g(d, 'tutela_legale_casa').nome_documento);
});

prova('e quella che il vocabolario non conosce si dichiara, invece di sparire', () => {
  const d = S.scheda(DIP_CASA, { ramo: 'casa' });
  deve((d.fuoriVocabolario || []).some((x) => /vita digitale/i.test(x.nome)),
    'una copertura venduta che il vocabolario non ha è sparita dal confronto: '
      + JSON.stringify((d.fuoriVocabolario || []).map((x) => x.nome)));
  /* E la descrizione non deve finire nell'elenco: un elenco di mezze frasi non
     lo legge nessuno, e una dichiarazione che nessuno legge non è una
     dichiarazione. */
  (d.fuoriVocabolario || []).forEach((x) => {
    deve(String(x.nome).split(/\s+/).length <= 8,
      'nell\'elenco delle coperture sconosciute è finita una frase: «' + x.nome + '»');
  });
});

prova('LE ESCLUSIONI NON DIVENTANO COPERTURE', () => {
  /* «Danni da acqua» e «Assistenza domestica» stanno in questo documento SOLO
     sotto «Che cosa NON è assicurato?». Se la sezione non si chiudesse, il
     prodotto risulterebbe coprire l'acqua e l'assistenza — e il confronto lo
     direbbe a un cliente. È il danno peggiore che questo motore possa fare. */
  [DIP_CASA, DIP_CASA_PALLINI].forEach((doc, n) => {
    const d = S.scheda(doc, { ramo: 'casa' });
    deve(d.ok, 'il documento ' + (n + 1) + ' non è stato letto: ' + d.motivo);
    /* La copertura vera di quel documento DEVE restare: una prova che passa
       perché il motore non legge più niente non prova niente. */
    deve(g(d, 'incendio_fabbricato') && g(d, 'incendio_fabbricato').stato === 'presente',
      'nel documento ' + (n + 1) + ' non si legge più nemmeno la copertura vera');
    ['danni_acqua', 'assistenza_casa'].forEach((id) => {
      const x = g(d, id);
      deve(!x || x.stato !== 'presente',
        'nel documento ' + (n + 1) + ' una garanzia nominata solo fra le ESCLUSIONI risulta assicurata: '
          + id + (x ? ' (letta da «' + x.riga + '»)' : ''));
    });
  });
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nSCHEDA PRODOTTO — leggere un documento di compagnia');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nSCHEDA PRODOTTO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
