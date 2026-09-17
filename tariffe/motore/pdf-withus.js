/* ═══════════════════════════════════════════════════════════════════════════
   IL DISEGNO DEI DOCUMENTI WITH US — un solo posto per la carta intestata.

   Fino al 17/09/2026 il PDF del preventivo personalizzato (ppPdfBlob in
   index.html) teneva dentro di sé tutte le primitive: fascia scura coi due
   cerchi, schede bianche bordate, intestazione con l'agenzia, piede con le
   pagine, filigrana. Nessun altro documento poteva avere LO STESSO aspetto
   senza ricopiarle. Qui stanno una volta sola: il personalizzato le usa per
   primo, il foglio dell'analisi previdenziale per secondo, e «stessa
   interfaccia grafica» torna a voler dire lo stesso codice, non una grafica
   somigliante.

   DUE LIVELLI.
   · `primitive(doc, logo)`: le operazioni elementari su un jsPDF gia' creato
     (scrivi, scheda, fascia, intestazione, piede, filigrana, tabella…).
     Chi ha un impaginato suo — il personalizzato — le usa direttamente.
   · `disegna(jsPDF, documento, opz)`: impagina un DOCUMENTO STRUTTURATO
     (intestazione, due colonne, blocchi, firma, avvertenze) a partire da un
     oggetto piano. Il motore pensione produce quell'oggetto in Node, senza
     jsPDF, e si prova senza browser; qui lo si disegna.

   Niente `import`, niente compilazione: lo carica il browser con <script src>
   e Node con require per le prove, che passano un `doc` finto che annota le
   chiamate. jsPDF non serve a chi prova: serve a chi stampa. */
(function () {
  'use strict';

  var VERSIONE = 'pdf-withus-2026-09-17';

  /* La tavolozza del marchio. Il verde e' #02984e (token --w1-verde). */
  var C = {
    verde: [2, 152, 78], verdeVivo: [1, 192, 97], verdeScuro: [1, 107, 56],
    verdeTenue: [234, 247, 240], scuro: [21, 33, 45], cerchio1: [14, 43, 28],
    cerchio2: [17, 53, 36], testo: [31, 42, 55], testo2: [90, 107, 124],
    testo3: [139, 154, 169], bordo: [221, 227, 233], sfondo: [245, 247, 248],
    bianco: [255, 255, 255], chiaro: [188, 205, 214],
    rosso: [192, 57, 43], rossoTenue: [253, 230, 230], ambra: [176, 106, 0], ambraTenue: [255, 248, 236],
  };
  var PAGINA = { w: 210, h: 297, margine: 16, contenuto: 178, fondo: 272 };

  /* Helvetica di jsPDF non ha i caratteri tipografici italiani ne' il simbolo
     dell'euro: un apostrofo curvo uscirebbe come un geroglifico e l'euro
     SPARIREBBE senza dire niente. Si normalizzano, non si tolgono. Due
     sostituzioni per l'euro perche' sta da tutte e due le parti del numero:
     «€ 480,00» e «5.000.000 €,». */
  function safe(v) {
    return String(v == null ? '' : v)
      .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-').replace(/…/g, '...')
      .replace(/€\s*(?=\d)/g, 'EUR ')
      .replace(/\s*€/g, ' EUR');
  }
  /* I testi dei motori arrivano con qualche <b>, <p>, <br>: sul PDF si scrive
     testo piano. */
  function pulisciHtml(v) {
    return String(v == null ? '' : v)
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, '\n').trim();
  }

  function primitive(doc, logo) {
    var W = PAGINA.w, H = PAGINA.h, M = PAGINA.margine, CW = PAGINA.contenuto;
    var setFill = function (a) { doc.setFillColor(a[0], a[1], a[2]); };
    var setText = function (a) { doc.setTextColor(a[0], a[1], a[2]); };
    var setDraw = function (a) { doc.setDrawColor(a[0], a[1], a[2]); };

    var scrivi = function (v, x, y, size, style, color, maxW, leading, opz) {
      doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size || 9);
      setText(color || C.testo);
      var righe = maxW ? doc.splitTextToSize(safe(v), maxW) : [safe(v)];
      doc.text(righe, x, y, opz || undefined);
      return y + righe.length * (leading || 4.4);
    };
    var scheda = function (x, y, w, h, fill, stroke, r) {
      if (fill) setFill(fill);
      if (stroke) { setDraw(stroke); doc.setLineWidth(.25); }
      doc.roundedRect(x, y, w, h, r || 3, r || 3, stroke ? (fill ? 'FD' : 'S') : 'F');
    };
    var altezzaRighe = function (v, size, maxW, leading) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
      return doc.splitTextToSize(safe(v), maxW).length * leading;
    };

    /* La fascia scura con i cerchi astratti: la firma grafica del marchio. */
    var fascia = function (alta) {
      setFill(C.sfondo); doc.rect(0, 0, W, H, 'F');
      setFill(C.scuro); doc.rect(0, 0, W, alta, 'F');
      setFill(C.cerchio1); doc.circle(178, alta - 34, 24, 'F');
      setFill(C.cerchio2); doc.circle(202, alta - 50, 19, 'F');
      if (logo) { doc.addImage(logo, 'PNG', M, 12, 27.6, 12); }
      else {
        scheda(M, 12, 12, 12, C.verde, null, 3);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); setText(C.bianco);
        doc.text('WU', M + 6, 19.7, { align: 'center' });
      }
    };

    /* Carta intestata: a sinistra l'agenzia, a destra che documento e' e quale. */
    var intestazione = function (azienda, tipo, numero, sotto) {
      var yi = 31;
      yi = scrivi(azienda.ragioneSociale, M, yi, 10.5, 'bold', C.bianco, 110, 4.6);
      if (azienda.sede) yi = scrivi(azienda.sede, M, yi + .6, 7.5, 'normal', C.chiaro, 110, 3.6);
      var riga = [azienda.piva ? 'P.IVA ' + azienda.piva : '', azienda.rui ? 'RUI ' + azienda.rui : ''].filter(Boolean).join('  ·  ');
      if (riga) yi = scrivi(riga, M, yi + .4, 7.5, 'normal', C.chiaro, 118, 3.6);
      if (azienda.contatti && azienda.contatti.length) scrivi(azienda.contatti.join('  ·  '), M, yi + .4, 7.5, 'normal', C.chiaro, 118, 3.6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setText(C.verdeVivo);
      doc.text(safe(tipo), W - M, 17, { align: 'right' });
      doc.setFontSize(15); setText(C.bianco);
      doc.text(safe(numero), W - M, 24.5, { align: 'right' });
      if (sotto) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setText(C.chiaro); doc.text(safe(sotto), W - M, 30, { align: 'right' }); }
    };

    /* La banda rossa (o ambra) che si vede prima di qualunque altra cosa. */
    var banda = function (y, testo, tono) {
      var rosso = tono !== 'ambra';
      scheda(M, y, CW, 11, rosso ? C.rossoTenue : C.ambraTenue, rosso ? C.rosso : C.ambra, 2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setText(rosso ? C.rosso : C.ambra);
      doc.text(safe(testo), W / 2, y + 7.2, { align: 'center' });
      return y + 16;
    };

    /* Due schede affiancate (cliente e intermediario/consulente). */
    var dueColonne = function (y, colonne, hCard) {
      var colW = (CW - 6) / 2;
      hCard = hCard || 42;
      colonne.slice(0, 2).forEach(function (col, i) {
        var x = M + i * (colW + 6);
        scheda(x, y, colW, hCard, C.bianco, C.bordo, 3);
        scrivi(col.titolo, x + 7, y + 8, 7, 'bold', C.testo2);
        var yy = y + 15;
        (col.righe || []).forEach(function (r, j) {
          var t = typeof r === 'string' ? { testo: r } : r;
          yy = scrivi(t.testo, x + 7, yy + (j === 1 ? .8 : 0), t.size || (j === 0 ? 10.5 : 7.5), t.stile || (j === 0 ? 'bold' : 'normal'),
            t.colore || (j === 0 ? C.testo : C.testo2), colW - 14, t.size ? t.size * .44 : (j === 0 ? 4.6 : 3.6));
        });
      });
      return y + hCard + 7;
    };

    /* Il piede su ogni pagina: filo, agenzia, numero e «Pagina i di n». */
    var piede = function (sinistra, destra) {
      var pagine = doc.getNumberOfPages();
      for (var i = 1; i <= pagine; i++) {
        doc.setPage(i);
        setDraw(C.bordo); doc.setLineWidth(.25); doc.line(M, 286, W - M, 286);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setText(C.testo2);
        doc.text(safe(sinistra), M, 291);
        doc.text(safe(destra + '  |  Pagina ' + i + ' di ' + pagine), W - M, 291, { align: 'right' });
      }
    };

    /* La filigrana in diagonale, su ogni pagina. */
    var filigrana = function (testo) {
      if (typeof doc.GState !== 'function') return;
      var pagine = doc.getNumberOfPages();
      for (var i = 1; i <= pagine; i++) {
        doc.setPage(i);
        doc.setGState(new doc.GState({ opacity: .09 }));
        doc.setFont('helvetica', 'bold'); doc.setFontSize(32); setText(C.rosso);
        doc.text(safe(testo), W / 2, 175, { align: 'center', angle: 32 });
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    };

    /* Serve spazio: se non c'e', pagina nuova con la fascia bassa. */
    var spazio = function (y, h) {
      if (y + h > PAGINA.fondo) { doc.addPage(); fascia(26); return 40; }
      return y;
    };

    /* Una scheda con titolo e paragrafi (o punti elenco). */
    var schedaTesto = function (y, titolo, paragrafi, opz) {
      opz = opz || {};
      var size = opz.size || 8.5, lead = opz.leading || 4.2, larg = CW - 16 - (opz.punti ? 10 : 0);
      var testi = (paragrafi || []).map(pulisciHtml).filter(Boolean);
      var hRighe = testi.reduce(function (n, t) { return n + altezzaRighe(t, size, larg, lead) + 1.6; }, 0);
      var h = (titolo ? 16 : 8) + hRighe;
      y = spazio(y, h);
      scheda(M, y, CW, h, opz.fill || C.bianco, opz.stroke || C.bordo, 3);
      var yd = y + (titolo ? 16 : 8);
      if (titolo) scrivi(titolo, M + 8, y + 9, 7, 'bold', opz.coloreTitolo || C.testo2);
      testi.forEach(function (t) {
        if (opz.punti) { setFill(C.verde); doc.circle(M + 10, yd - 1.2, 1.1, 'F'); }
        yd = scrivi(t, M + (opz.punti ? 15 : 8), yd, size, 'normal', opz.colore || C.testo, larg, lead) + 1.6;
      });
      return y + h + 7;
    };

    /* Le tre (o due) tessere coi numeri grandi. */
    var tessere = function (y, voci) {
      var n = voci.length, gap = 5, w = (CW - gap * (n - 1)) / n, h = 30;
      y = spazio(y, h);
      voci.forEach(function (v, i) {
        var x = M + i * (w + gap);
        var fill = v.tono === 'gap' ? C.rossoTenue : (v.tono === 'ok' ? C.verdeTenue : C.bianco);
        var stroke = v.tono === 'gap' ? [240, 192, 187] : (v.tono === 'ok' ? [185, 227, 205] : C.bordo);
        scheda(x, y, w, h, fill, stroke, 3);
        scrivi(String(v.etichetta || '').toUpperCase(), x + 6, y + 8, 6.5, 'bold', C.testo2, w - 12, 3.4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(15); setText(v.tono === 'gap' ? C.rosso : (v.tono === 'ok' ? C.verdeScuro : C.testo));
        doc.text(safe(v.valore), x + 6, y + 18.5);
        if (v.nota) scrivi(v.nota, x + 6, y + 24.5, 6.8, 'normal', C.testo2, w - 12, 3.4);
      });
      return y + h + 6;
    };

    /* Una tabella: intestazioni, righe di celle (testo piano), larghezze in
       frazioni. Una riga puo' chiedere di essere evidenziata. Va a capo di
       pagina fra una riga e l'altra, ripetendo l'intestazione. */
    var tabella = function (y, intestazioni, righe, opz) {
      opz = opz || {};
      var n = intestazioni.length;
      var fr = opz.larghezze || intestazioni.map(function () { return 1 / n; });
      var somma = fr.reduce(function (a, b) { return a + b; }, 0);
      var ws = fr.map(function (f) { return CW * f / somma; });
      var size = opz.size || 7.8, lead = 3.7, pad = 2.2;
      var testa = function (yy) {
        setFill([244, 248, 246]); doc.rect(M, yy, CW, 7, 'F');
        var x = M;
        intestazioni.forEach(function (t, i) { scrivi(String(t || '').toUpperCase(), x + pad, yy + 4.8, 6.5, 'bold', C.testo2, ws[i] - pad * 2, 3.2); x += ws[i]; });
        return yy + 7;
      };
      y = spazio(y, 20);
      y = testa(y);
      righe.forEach(function (r, ri) {
        var celle = (r.celle || r).map(function (c) { return pulisciHtml(typeof c === 'object' && c !== null ? c.testo : c); });
        var altezze = celle.map(function (c, i) { return altezzaRighe(c, size, ws[i] - pad * 2, lead); });
        var h = Math.max.apply(null, altezze.concat([lead])) + pad * 2;
        if (y + h > PAGINA.fondo) { doc.addPage(); fascia(26); y = 40; y = testa(y); }
        if (r.evidenzia) { setFill(C.verdeTenue); doc.rect(M, y, CW, h, 'F'); }
        var x = M;
        celle.forEach(function (c, i) {
          var cella = (r.celle || r)[i];
          var grassetto = (cella && cella.stile === 'bold') || (r.evidenzia && i === 0) || (opz.primaColonnaInGrassetto && i === 0);
          scrivi(c, x + pad, y + pad + 2.6, size, grassetto ? 'bold' : 'normal', (cella && cella.colore) || C.testo, ws[i] - pad * 2, lead,
            (cella && cella.allinea === 'right') ? { align: 'right' } : undefined);
          x += ws[i];
        });
        setDraw(C.bordo); doc.setLineWidth(.2); doc.line(M, y + h, M + CW, y + h);
        y += h;
      });
      return y + 6;
    };

    /* Il titolo di una sezione: verde, maiuscolo, col filo sotto. */
    var titolo = function (y, testo) {
      y = spazio(y, 14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setText(C.verde);
      doc.text(safe(String(testo || '').toUpperCase()), M, y + 4);
      setDraw([216, 227, 220]); doc.setLineWidth(.3); doc.line(M, y + 6.5, M + CW, y + 6.5);
      return y + 12;
    };

    return { C: C, PAGINA: PAGINA, safe: safe, pulisciHtml: pulisciHtml, setFill: setFill, setText: setText, setDraw: setDraw,
      scrivi: scrivi, scheda: scheda, altezzaRighe: altezzaRighe, fascia: fascia, intestazione: intestazione, banda: banda,
      dueColonne: dueColonne, piede: piede, filigrana: filigrana, spazio: spazio, schedaTesto: schedaTesto, tessere: tessere,
      tabella: tabella, titolo: titolo };
  }

  /* ══ IL DOCUMENTO STRUTTURATO ═══════════════════════════════════════════
     { tipo, numero, sotto, azienda:{ragioneSociale,sede,piva,rui,contatti[]},
       banda:{testo,tono}|null, filigrana:string|null,
       colonne:[{titolo,righe[]},{titolo,righe[]}],
       blocchi:[ {tipo:'titolo',testo} | {tipo:'tessere',voci[]} | {tipo:'testo',titolo,paragrafi[],punti,tono}
               | {tipo:'tabella',intestazioni[],righe[],larghezze[],primaColonnaInGrassetto} | {tipo:'banda',testo,tono} ],
       firma:{nome,ruolo,rui,email,telefono}|null, avvertenze:string, piedeSinistra, piedeDestra, titoloPdf, nomeFile } */
  function disegna(jsPDF, documento, opz) {
    opz = opz || {};
    var d = documento || {};
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    if (doc.setProperties) doc.setProperties({ title: d.titoloPdf || d.numero || 'Documento', subject: d.tipo || '', author: (d.azienda && d.azienda.ragioneSociale) || '' });
    var p = primitive(doc, opz.logo);
    p.fascia(62);
    p.intestazione(d.azienda || {}, d.tipo || '', d.numero || '', d.sotto || '');
    var y = 70;
    if (d.banda && d.banda.testo) y = p.banda(y, d.banda.testo, d.banda.tono);
    if (d.colonne && d.colonne.length) y = p.dueColonne(y, d.colonne, d.colonneAltezza);
    (d.blocchi || []).forEach(function (b) {
      if (!b) return;
      if (b.tipo === 'titolo') y = p.titolo(y, b.testo);
      else if (b.tipo === 'tessere') y = p.tessere(y, b.voci || []);
      else if (b.tipo === 'testo') y = p.schedaTesto(y, b.titolo, b.paragrafi || [], {
        punti: !!b.punti,
        fill: b.tono === 'rosso' ? C.rossoTenue : (b.tono === 'ambra' ? C.ambraTenue : (b.tono === 'verde' ? C.verdeTenue : C.bianco)),
        stroke: b.tono === 'rosso' ? C.rosso : (b.tono === 'ambra' ? C.ambra : (b.tono === 'verde' ? [185, 227, 205] : C.bordo)),
        coloreTitolo: b.tono === 'rosso' ? C.rosso : (b.tono === 'ambra' ? C.ambra : C.testo2), size: b.size, leading: b.leading });
      else if (b.tipo === 'tabella') y = p.tabella(y, b.intestazioni || [], b.righe || [], { larghezze: b.larghezze, primaColonnaInGrassetto: !!b.primaColonnaInGrassetto, size: b.size });
      else if (b.tipo === 'banda') y = p.banda(p.spazio(y, 16), b.testo, b.tono);
    });
    if (d.firma && d.firma.nome) {
      var righeFirma = [d.firma.nome + (d.firma.ruolo ? ' · ' + d.firma.ruolo : '') + (d.firma.rui ? ' · RUI ' + d.firma.rui : ''),
        [d.firma.email, d.firma.telefono].filter(Boolean).join(' · ')].filter(Boolean);
      y = p.schedaTesto(y, 'CHI FIRMA', righeFirma, { size: 8.5 });
    }
    if (d.avvertenze) y = p.schedaTesto(y, 'AVVERTENZE', [d.avvertenze], { size: 7.5, leading: 3.6, colore: C.testo2 });
    if (d.filigrana) p.filigrana(d.filigrana);
    p.piede(d.piedeSinistra || ((d.azienda && d.azienda.ragioneSociale) || ''), d.piedeDestra || d.numero || '');
    return doc;
  }

  var API = { VERSIONE: VERSIONE, C: C, PAGINA: PAGINA, safe: safe, pulisciHtml: pulisciHtml, primitive: primitive, disegna: disegna };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PdfWithus = API;
})();
