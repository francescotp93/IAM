/* ═══════════════════════════════════════════════════════════════════════════════
   IL TESTO DI UN PDF, UNA VOCE PER PAGINA                     (02/10/2026)

   Questa roba stava dentro `index.html`, scritta per leggere le proposte di
   polizza nel preventivo personalizzato. Adesso la vogliono in tre posti — il
   preventivo, l'archivio dei prodotti in Confronta, e il caricamento veloce di
   una polizza — e tre copie della stessa funzione si separano al primo
   documento strano: allora non si sa più quale delle tre ha prodotto il numero
   che si sta guardando.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ IL DOCUMENTO NON ESCE DAL BROWSER.                                        │
   └───────────────────────────────────────────────────────────────────────────┘
   Qui dentro non c'è nessuna chiamata di rete tranne quella che carica il
   lettore di PDF. Il file si legge in pagina e il testo resta in pagina: una
   proposta di polizza porta nome, indirizzo, codice fiscale e targa del
   cliente, e mandarla a un servizio esterno per farsela riassumere è
   esattamente quello che le regole di casa vietano.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE RIGHE SI RICOSTRUISCONO DALLE COORDINATE, NON DALL'ORDINE.             │
   └───────────────────────────────────────────────────────────────────────────┘
   `pdf.js` non restituisce righe: restituisce pezzi sparsi, nell'ordine in cui
   stanno nel file. Concatenarli di fila impasta colonne diverse della stessa
   riga in una frase sola — e una frase impastata è esattamente la riga che poi
   nessun motore sa più leggere.

   Si raggruppa per altezza e si ordina per ascissa. `righeDaPezzi` fa solo
   quello e non tocca né la rete né il browser: così si può provare in Node,
   con dei pezzi finti, invece di dover credere che funzioni.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'pdf-testo-2026-10-02';

  var CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';

  var promessa = null;
  function caricaPdfJs() {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Il lettore di PDF gira solo nel browser.'));
    }
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!promessa) {
      promessa = new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = CDN + 'pdf.min.js';
        s.onload = function () {
          if (!window.pdfjsLib) return ko(new Error('Lettore di PDF caricato ma non disponibile.'));
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + 'pdf.worker.min.js';
          ok(window.pdfjsLib);
        };
        s.onerror = function () { ko(new Error('Non riesco a caricare il lettore di PDF: serve la rete.')); };
        document.head.appendChild(s);
      }).catch(function (e) { promessa = null; throw e; });
    }
    return promessa;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LE DUE COLONNE DEL DIP, CHE SCHIACCIATE UNA SULL'ALTRA NON SI LEGGONO
     ═══════════════════════════════════════════════════════════════════════
     MISURATO l'08/10/2026 su 214 documenti veri scaricati dalle compagnie:
     94 — il 44% — hanno il DIP impaginato a DUE COLONNE affiancate, con
     «Che cosa è assicurato?» nella colonna di sinistra e «Che cosa NON è
     assicurato?» in quella di destra.

     `pdf.js` dà pezzi sparsi, e rimetterli in riga per sola altezza impasta
     le due colonne: su un documento Net Insurance vero la riga ricostruita
     diceva

       «Che cosa è assicurato? / Quali sono le  Che cosa NON è assicurato?»

     e due righe sotto le prestazioni assicurate finivano attaccate alle
     esclusioni, nella stessa riga. Per il lettore delle garanzie quella
     pagina non è difficile: è illeggibile, e tutte e 94 valevano zero.

     ┌─────────────────────────────────────────────────────────────────────┐
     │ MA UNA TABELLA NON È DUE COLONNE DI PROSA, e qui si sbaglia facile. │
     └─────────────────────────────────────────────────────────────────────┘
     Una tabella di franchigie ha anch'essa testo a destra e a sinistra di un
     vuoto, e spezzarla sarebbe un danno: «Eventi naturali | Franchigia |
     1.000,00 €» è UNA riga, e leggerla per colonne staccherebbe l'importo
     dalla garanzia. C'è una prova, in `lettura-proposta-nel-browser`, che
     difende esattamente quel caso, e deve restare verde.

     Le due condizioni che distinguono le due cose, e servono tutt'e due:
       1. ALMENO SEI RIGHE concordano sullo stesso confine (±12 punti). Una
          tabella di poche righe non basta: con poche righe un vuoto largo è
          un caso, non un'impaginazione;
       2. TUTT'E DUE I LATI PORTANO PROSA, cioè in media almeno 25 caratteri
          per riga. Le celle di una tabella sono corte, e un'etichetta al
          margine («Art. 3») lo è ancora di più: è la condizione che tiene
          fuori le tabelle, ed è quella che fa passare i DIP.

     C'ERA UNA TERZA CONDIZIONE, e è stata tolta: «il confine deve stare nella
     fascia centrale del foglio». Sembrava prudente, ma non si riusciva a
     costruire un caso in cui decidesse lei — con venticinque caratteri di
     prosa da tutt'e due i lati il confine finisce nella fascia centrale per
     geometria, e il guasto che la rimetteva al bordo non faceva andare rossa
     nessuna prova. Una condizione che nessun caso può misurare è peso morto,
     e il peso morto in un pezzo delicato è peggio di niente: fa credere che
     ci sia una difesa che non c'è.

     E LE RIGHE A TUTTA LARGHEZZA RESTANO AL LORO POSTO: un titolo o un piè
     di pagina attraversa la gronda, e spostarlo in mezzo alle colonne
     romperebbe il riconoscimento dei fascicoli, che il piè di pagina lo
     cerca in fondo alla pagina. Quindi si lavora a BLOCCHI: le righe a due
     colonne si raggruppano, dentro il blocco si legge prima tutta la
     sinistra e poi tutta la destra, e una riga a tutta larghezza chiude il
     blocco e si stampa dov'è.
     ═══════════════════════════════════════════════════════════════════════ */
  var VUOTO_MINIMO = 18;        /* punti: la gronda fra due colonne */
  var RIGHE_MINIME = 6;         /* quante righe devono concordare sul confine */
  var TOLLERANZA = 12;          /* di quanto possono discostarsi due confini */
  var CARATTERI_MINIMI = 25;    /* prosa, non celle di tabella */

  /* I pezzi raccolti per altezza: la base di tutto il resto. */
  function perRiga(pezzi) {
    var perAltezza = {}, altezze = [];
    (pezzi || []).forEach(function (it) {
      if (!it || !it.str) return;
      /* Si arrotonda: due pezzi della stessa riga stampata differiscono di
         frazioni di punto, e senza arrotondare ogni pezzo sarebbe una riga. */
      var y = Math.round((it.transform && it.transform[5]) || 0);
      if (!perAltezza[y]) { perAltezza[y] = []; altezze.push(y); }
      perAltezza[y].push({
        x: (it.transform && it.transform[4]) || 0,
        /* La larghezza non sempre c'è: senza, il pezzo è un punto, e una riga
           a tutta larghezza non si riconosce. Non è grave — si perde solo
           l'ottimizzazione, non la correttezza. */
        w: typeof it.width === 'number' && isFinite(it.width) ? it.width : 0,
        t: String(it.str),
      });
    });
    /* Dall'alto verso il basso: sul foglio l'ordinata cresce verso l'alto. */
    altezze.sort(function (a, b) { return b - a; });
    return altezze.map(function (y) {
      return { y: y, pezzi: perAltezza[y].sort(function (a, b) { return a.x - b.x; }) };
    });
  }

  function unaRiga(pezzi) {
    return pezzi.map(function (p) { return p.t; }).join(' ').replace(/\s+/g, ' ').trim();
  }

  /* Il confine fra le due colonne, o `null` se questa pagina non ne ha due. */
  function confineDelleColonne(righe) {
    var minX = Infinity, maxX = -Infinity;
    righe.forEach(function (r) {
      r.pezzi.forEach(function (p) {
        if (p.x < minX) minX = p.x;
        if (p.x + p.w > maxX) maxX = p.x + p.w;
      });
    });
    if (!isFinite(minX) || !(maxX > minX)) return null;

    /* UN CANDIDATO PER RIGA, il più largo: contando tutti i vuoti di una riga
       il numero «sei righe» non vorrebbe più dire sei righe, e una tabella a
       quattro colonne passerebbe con due righe sole. */
    var cand = [];
    righe.forEach(function (r) {
      var fine = null, mio = null;
      r.pezzi.forEach(function (p) {
        if (fine != null && p.x - fine >= VUOTO_MINIMO) {
          var c = (fine + p.x) / 2;
          if (!mio || p.x - fine > mio.vuoto) mio = { c: c, vuoto: p.x - fine };
        }
        if (fine == null || p.x + p.w > fine) fine = p.x + p.w;
      });
      if (mio) cand.push(mio.c);
    });
    if (cand.length < RIGHE_MINIME) return null;

    cand.sort(function (p, q) { return p - q; });
    var mediana = cand[Math.floor(cand.length / 2)];
    var vicini = cand.filter(function (c) { return Math.abs(c - mediana) <= TOLLERANZA; });
    if (vicini.length < RIGHE_MINIME) return null;

    /* La condizione che tiene fuori le tabelle: prosa da tutt'e due i lati. */
    var sin = 0, des = 0, nSin = 0, nDes = 0;
    righe.forEach(function (r) {
      var s = '', d = '';
      r.pezzi.forEach(function (p) {
        if (p.x + p.w <= mediana) s += p.t;
        else if (p.x >= mediana) d += p.t;
      });
      if (s.trim()) { sin += s.trim().length; nSin++; }
      if (d.trim()) { des += d.trim().length; nDes++; }
    });
    if (!nSin || !nDes) return null;
    if (sin / nSin < CARATTERI_MINIMI || des / nDes < CARATTERI_MINIMI) return null;
    return mediana;
  }

  /* I pezzi di una pagina, come li dà `pdf.js`, diventano righe di testo.
     `transform[5]` è l'altezza sul foglio e `transform[4]` l'ascissa.

     Niente browser, niente rete: solo conti. È la parte che si può provare. */
  function righeDaPezzi(pezzi) {
    var righe = perRiga(pezzi);
    var conf = confineDelleColonne(righe);
    if (conf == null) {
      /* Una colonna sola: si fa come si è sempre fatto, riga per altezza. */
      return righe.map(function (r) { return unaRiga(r.pezzi); }).filter(Boolean);
    }

    /* ── QUANTO DEVE ESSERE LARGA UNA RIGA PER SPEZZARE IL BLOCCO ──────────
       Non basta che attraversi la gronda. Misurato sul DIP LTC di Net
       Insurance: fra le due domande e il loro testo c'era un pezzo corto a
       cavallo del confine, e bastava a chiudere il blocco. Risultato: la
       domanda di destra («Che cosa NON è assicurato?») finiva subito DOPO
       quella di sinistra, e il lettore delle garanzie chiudeva la sezione
       delle coperture prima di aver letto una riga — le due colonne erano
       separate e il documento valeva zero comunque.

       Spezza il blocco solo una riga che copre almeno il 60% del foglio:
       quello è un titolo o un piè di pagina, che va lasciato dov'è perché il
       riconoscimento dei fascicoli il piè di pagina lo cerca in fondo alla
       pagina. Tutto il resto si assegna alla sua colonna. */
    var LARGHEZZA_PIENA = 0.6;
    var minX = Infinity, maxX = -Infinity;
    righe.forEach(function (r) {
      r.pezzi.forEach(function (p) {
        if (p.x < minX) minX = p.x;
        if (p.x + p.w > maxX) maxX = p.x + p.w;
      });
    });
    var foglio = maxX - minX;

    var fuori = [], blocco = [];
    function chiudiBlocco() {
      if (!blocco.length) return;
      var a = [], b = [];
      blocco.forEach(function (r) {
        var s = [], d = [];
        /* Si assegna per il CENTRO del pezzo, non per il suo inizio: un pezzo
           che comincia poco prima del confine e finisce molto dopo sta a
           destra, e guardarne solo l'inizio lo metterebbe a sinistra. */
        r.pezzi.forEach(function (p) { ((p.x + p.w / 2) < conf ? s : d).push(p); });
        if (s.length) a.push(unaRiga(s));
        if (d.length) b.push(unaRiga(d));
      });
      a.concat(b).forEach(function (l) { if (l) fuori.push(l); });
      blocco = [];
    }
    righe.forEach(function (r) {
      var da = Infinity, a2 = -Infinity;
      r.pezzi.forEach(function (p) {
        if (p.x < da) da = p.x;
        if (p.x + p.w > a2) a2 = p.x + p.w;
      });
      var piena = foglio > 0 && (a2 - da) >= foglio * LARGHEZZA_PIENA
        && r.pezzi.some(function (p) { return p.w > 0 && p.x < conf && p.x + p.w > conf; });
      if (piena) { chiudiBlocco(); var l = unaRiga(r.pezzi); if (l) fuori.push(l); return; }
      blocco.push(r);
    });
    chiudiBlocco();
    return fuori;
  }

  /* Il documento intero: `[{ n, testo }]`, una voce per pagina, le pagine
     numerate da 1 come le numera chi apre il PDF. */
  function testoPagine(file, opz) {
    opz = opz || {};
    return caricaPdfJs().then(function (pdfjs) {
      return file.arrayBuffer().then(function (buf) {
        return pdfjs.getDocument({ data: buf }).promise;
      });
    }).then(function (doc) {
      var pagine = [], n = 1;
      function prossima() {
        if (n > doc.numPages) return pagine;
        var qui = n++;
        if (typeof opz.avanzamento === 'function') opz.avanzamento(qui, doc.numPages);
        return doc.getPage(qui).then(function (p) { return p.getTextContent(); })
          .then(function (c) {
            pagine.push({ n: qui, testo: righeDaPezzi(c.items).join('\n') });
            return prossima();
          });
      }
      return prossima();
    });
  }

  /* L'impronta del file, per sapere se un documento è cambiato. Si calcola nel
     browser: il file non si manda da nessuna parte nemmeno per questo. */
  function impronta(file) {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return Promise.resolve(null);
    }
    return file.arrayBuffer().then(function (buf) {
      return crypto.subtle.digest('SHA-256', buf);
    }).then(function (h) {
      var b = new Uint8Array(h), fuori = '';
      for (var i = 0; i < b.length; i++) fuori += ('0' + b[i].toString(16)).slice(-2);
      return fuori;
    }).catch(function () { return null; });
  }

  var API = { VERSIONE: VERSIONE, caricaPdfJs: caricaPdfJs, righeDaPezzi: righeDaPezzi,
    testoPagine: testoPagine, impronta: impronta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PdfTesto = API;
})();
