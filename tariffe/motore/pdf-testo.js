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

  /* I pezzi di una pagina, come li dà `pdf.js`, diventano righe di testo.
     `transform[5]` è l'altezza sul foglio e `transform[4]` l'ascissa.

     Niente browser, niente rete: solo conti. È la parte che si può provare. */
  function righeDaPezzi(pezzi) {
    var perAltezza = {}, altezze = [];
    (pezzi || []).forEach(function (it) {
      if (!it || !it.str) return;
      /* Si arrotonda: due pezzi della stessa riga stampata differiscono di
         frazioni di punto, e senza arrotondare ogni pezzo sarebbe una riga. */
      var y = Math.round((it.transform && it.transform[5]) || 0);
      if (!perAltezza[y]) { perAltezza[y] = []; altezze.push(y); }
      perAltezza[y].push({ x: (it.transform && it.transform[4]) || 0, t: String(it.str) });
    });
    /* Dall'alto verso il basso: sul foglio l'ordinata cresce verso l'alto. */
    altezze.sort(function (a, b) { return b - a; });
    return altezze.map(function (y) {
      return perAltezza[y].sort(function (a, b) { return a.x - b.x; })
        .map(function (p) { return p.t; }).join(' ')
        .replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
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
