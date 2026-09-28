/* ═══════════════════════════════════════════════════════════════════════════════
   LE GARANZIE DI UNA POLIZZA                               (28/09/2026)

   Che cosa copre davvero una polizza, e quanto costa ogni pezzo. È la domanda
   che arriva al telefono («ho la tutela legale?», «quanto mi costa il
   conducente?») e fino a oggi la scheda rispondeva con quattro colonne su
   otto e coi nomi come li scrive il computer della compagnia.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 1 — DUE TRACCIATI, DUE FORME, DUE POSTI.                                  │
   └───────────────────────────────────────────────────────────────────────────┘
   Lo Standard Share File (Prima) annida sotto `dati.ssf.garanzie` e scrive
   `{codice, descrizione, netto, imponibile, tasse, ssn, lordo, massimale,
   franchigia}`. HDI scrive alla radice, `dati.garanzie`, con
   `{codice, descrizione, premio_netto, premio_lordo, massimale, bene}` —
   perché «ssf» è il nome di un altro tracciato e scriverlo sopra i dati di
   HDI sarebbe una bugia.

   Due forme vogliono dire due modi di sbagliare. Qui diventano una sola, e
   chi disegna la tabella non deve più sapere da quale compagnia arriva.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 2 — I NOMI DI PRIMA SONO CODICI, NON NOMI.                                │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato il 28/09/2026 sull'archivio: 11.131 garanzie di Prima, e su
   **11.131 su 11.131** la descrizione è identica al codice. Cioè la scheda
   scriveva `INFORTUNI_CONDUCENTE` e `COLLISIONE_VEICOLI_NON_ASSICURATI`, che
   sono le stesse parole che userebbe un tabulato.

   I codici diversi sono 19 in tutto l'archivio. Diciannove nomi si scrivono,
   e la tabella qui sotto è fatta da quelli veri — non da quelli che uno si
   immagina che una compagnia usi. HDI invece le descrizioni le manda già
   scritte in italiano («Tutela Legale della Circolazione Basic»): quelle non
   si toccano.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 3 — UNA COLONNA VUOTA SU MILLE RIGHE NON È UNA COLONNA.                   │
   └───────────────────────────────────────────────────────────────────────────┘
   Massimale e franchigia: Prima li manda **vuoti su tutte e 11.131** le
   garanzie in archivio. HDI il massimale ce l'ha su 30 righe su 60. Mettere
   le due colonne sempre vorrebbe dire due colonne di trattini su ogni polizza
   Prima — e a forza di trattini si smette di guardare la tabella.

   `colonne()` dice quali colonne hanno almeno un valore **in questa polizza**.
   Si decide sul caso che si ha davanti, non sulla media dell'archivio.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ 4 — LE GARANZIE DEVONO SOMMARE AL PREMIO.                                 │
   └───────────────────────────────────────────────────────────────────────────┘
   È l'unico controllo che questa tabella si può fare da sola, ed è quello che
   dice se l'abbiamo letta bene: sul flusso HDI la somma delle garanzie fa il
   lordo di polizza su 18 polizze su 18. Quando non torna non si nasconde il
   resto: si mostra la tabella **e** si dice di quanto non torna. Una tabella
   che non quadra e non lo dice è peggio di una tabella che manca.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* I 19 codici veri di Prima, contati sull'archivio il 28/09/2026 (fra
     parentesi quante volte comparivano). Se un domani ne arriva uno nuovo,
     `nome()` restituisce il codice così com'è: meglio un codice a schermo che
     un nome inventato su una garanzia che non si conosce. */
  var NOMI = {
    RCA: 'Responsabilità civile auto',                                  // 3.989
    INFORTUNI_CONDUCENTE: 'Infortuni del conducente',                   // 2.286
    ASSISTENZA_STRADALE: 'Assistenza stradale',                         // 1.873
    TUTELA_LEGALE: 'Tutela legale',                                     // 1.433
    BONUS_PROTETTO: 'Bonus protetto',                                   //   658
    FURTO_INCENDIO: 'Furto e incendio',                                 //   455
    CRISTALLI: 'Cristalli',                                             //    84
    EVENTI_NATURALI: 'Eventi naturali',                                 //    78
    INFORTUNI_DOMESTICI: 'Infortuni domestici',                         //    70
    EVENTI_SOCIOPOLITICI: 'Eventi sociopolitici e atti vandalici',      //    48
    CONSULTO_LEGALE: 'Consulto legale',                                 //    36
    ASSISTENZA_DOMESTICA: 'Assistenza domestica',                       //    36
    COLLISIONE: 'Collisione',                                           //    29
    COLLISIONE_VEICOLI_NON_ASSICURATI: 'Collisione con veicoli non assicurati', // 26
    RC_VITA_PRIVATA: 'RC della vita privata',                           //    14
    COLLISIONE_ANIMALI_SELVATICI: 'Collisione con animali selvatici',   //    11
    RC_ANIMALI_DOMESTICI: 'RC animali domestici',                       //     2
    RC_BICI_ELETTRICHE: 'RC biciclette elettriche',                     //     2
    KASKO: 'Kasko'                                                      //     1
  };

  function testo(v) { return v == null ? '' : String(v).trim(); }

  /* Un numero, o `null`. La stringa vuota e `'-'` NON sono zero: «non
     dichiarato» e «zero euro» sono due risposte diverse, e confonderle su una
     franchigia vuol dire dire a un cliente che non ne ha una. */
  function num(v) {
    if (v == null || v === '' || v === '-') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim().replace(/[€\s]/g, '');
    if (!s) return null;
    /* «1.234,56» all'italiana e «1234.56» all'inglese. Si guarda l'ultimo
       separatore: se è una virgola, i punti sono migliaia. */
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function cent(n) { return n == null ? null : Math.round(n * 100) / 100; }

  /* Il nome da mostrare. Prima manda il codice anche come descrizione: in quel
     caso si traduce. HDI manda già l'italiano, e non si tocca. */
  function nome(g) {
    g = g || {};
    var cod = testo(g.codice), des = testo(g.descrizione);
    if (des && des !== cod) return des;          // HDI, e chiunque scriva un nome vero
    if (NOMI[cod]) return NOMI[cod];             // i 19 codici di Prima
    if (NOMI[des]) return NOMI[des];
    return des || cod || 'Garanzia senza nome';
  }

  /* LA FORMA UNICA. Tutti i campi ci sono sempre; quelli che il tracciato non
     manda restano `null`, che è diverso da zero. */
  function normalizza(g) {
    g = g || {};
    var lordo = num(g.lordo);
    if (lordo == null) lordo = num(g.premio_lordo);
    var netto = num(g.netto);
    if (netto == null) netto = num(g.premio_netto);
    return {
      codice: testo(g.codice) || null,
      nome: nome(g),
      grezza: testo(g.descrizione) || null,   // com'è scritta nel flusso
      netto: cent(netto),
      imponibile: cent(num(g.imponibile)),
      tasse: cent(num(g.tasse)),
      ssn: cent(num(g.ssn)),
      lordo: cent(lordo),
      massimale: num(g.massimale),
      franchigia: num(g.franchigia),
      /* Su quale bene è appesa la garanzia: HDI lo dice
         («AUTO HDI - PEUGEOT 2008 … (GV712FB)»), e su una polizza con due
         veicoli è l'unica cosa che distingue due RCA. */
      bene: testo(g.bene) || null,
      provvigione: cent(num(g.provvigione))
    };
  }

  /* Dove sono le garanzie di questa polizza, e da quale tracciato.
     Non si indovina: si guarda nei due posti dove i due flussi scrivono. */
  function dallaPolizza(p) {
    var d = (p && p.dati) || {};
    var ssf = d.ssf || {};
    if (ssf.garanzie && ssf.garanzie.length) return { lista: ssf.garanzie, fonte: 'ssf' };
    if (d.garanzie && d.garanzie.length) return { lista: d.garanzie, fonte: 'hdi' };
    return { lista: [], fonte: null };
  }

  /* Quali colonne facoltative hanno almeno un valore QUI. Il nome e il lordo
     non entrano: quelli ci sono sempre, e una tabella delle garanzie senza
     l'importo non è una tabella delle garanzie. */
  var FACOLTATIVE = ['netto', 'imponibile', 'tasse', 'ssn', 'massimale', 'franchigia', 'bene', 'provvigione'];

  function colonne(lista) {
    var viste = {};
    FACOLTATIVE.forEach(function (c) { viste[c] = false; });
    [].concat(lista || []).forEach(function (g) {
      FACOLTATIVE.forEach(function (c) { if (g && g[c] != null && g[c] !== '') viste[c] = true; });
    });
    return FACOLTATIVE.filter(function (c) { return viste[c]; });
  }

  function somma(lista, campo) {
    var t = null;
    [].concat(lista || []).forEach(function (g) {
      if (!g || g[campo] == null) return;
      t = (t == null ? 0 : t) + g[campo];
    });
    return cent(t);
  }

  function totali(lista) {
    return {
      quante: [].concat(lista || []).length,
      netto: somma(lista, 'netto'),
      imponibile: somma(lista, 'imponibile'),
      tasse: somma(lista, 'tasse'),
      ssn: somma(lista, 'ssn'),
      lordo: somma(lista, 'lordo'),
      provvigione: somma(lista, 'provvigione')
    };
  }

  /* LA SOMMA TORNA COL PREMIO? Tre risposte, non due: sì, no, e «non si può
     dire» — che è la risposta onesta quando il premio della polizza non c'è.
     Un «sì» dato senza avere il secondo numero sarebbe una rassicurazione
     costruita sul nulla.

     LA SOGLIA È UN CENTESIMO, e non di più. Sui flussi veri le garanzie
     sommano ESATTAMENTE al premio — su 18 polizze HDI su 18 — quindi la
     tolleranza non serve a coprire differenze di listino: serve solo
     all'arrotondamento dell'ultima cifra, quando la compagnia arrotonda ogni
     garanzia per conto suo e poi il totale un'altra volta. Due centesimi
     sono già una differenza da guardare, non da perdonare: sono soldi, e la
     regola di casa sui soldi è che un numero che non si può verificare non
     si dichiara giusto. */
  function quadratura(lista, premio) {
    var t = somma(lista, 'lordo');
    var p = num(premio);
    if (t == null || p == null) {
      return { esito: 'non_si_puo_dire', totale: t, premio: cent(p), scarto: null,
               spiega: t == null ? 'Le garanzie non portano gli importi.'
                                 : 'La polizza non dichiara il premio: non c\'è con cosa confrontare.' };
    }
    var d = cent(t - p);
    if (Math.abs(d) <= 0.01) {
      return { esito: 'quadra', totale: t, premio: cent(p), scarto: 0,
               spiega: 'Le garanzie sommano esattamente al premio della polizza.' };
    }
    return {
      esito: 'non_quadra', totale: t, premio: cent(p), scarto: d,
      spiega: 'Le garanzie sommano ' + t.toFixed(2).replace('.', ',') + ' €, il premio della polizza è '
        + p.toFixed(2).replace('.', ',') + ' €: ' + (d > 0 ? 'ne avanzano ' : 'ne mancano ')
        + Math.abs(d).toFixed(2).replace('.', ',') + ' €. '
        + 'O la polizza porta un importo che le garanzie non spiegano, o una garanzia non è arrivata col flusso.'
    };
  }

  /* Tutto quello che serve a disegnare la sezione, in una chiamata.
     `premio` di solito è `p.premio_annuo`: il confronto ha senso sull'anno,
     perché le garanzie del flusso sono annue anche quando la rata è semestrale. */
  function scheda(p) {
    var trovate = dallaPolizza(p);
    var lista = trovate.lista.map(normalizza);
    /* In ordine di prezzo: la RCA da 250 € prima del consulto legale da zero.
       Chi apre una polizza vuole sapere prima che cosa pesa. */
    lista.sort(function (a, b) { return (b.lordo == null ? -1 : b.lordo) - (a.lordo == null ? -1 : a.lordo); });
    var premio = p ? (p.premio_annuo != null ? p.premio_annuo : p.premio_lordo) : null;
    return {
      fonte: trovate.fonte,
      lista: lista,
      colonne: colonne(lista),
      totali: totali(lista),
      quadratura: quadratura(lista, premio)
    };
  }

  var API = {
    NOMI: NOMI, FACOLTATIVE: FACOLTATIVE,
    nome: nome, normalizza: normalizza, dallaPolizza: dallaPolizza,
    colonne: colonne, totali: totali, quadratura: quadratura, scheda: scheda
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Garanzie = API;
})();
