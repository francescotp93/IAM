/* ═══════════════════════════════════════════════════════════════════════════
   I NUMERI DELLA SCRIVANIA — le regole  (Blocco 3 · punto 10, 21/09/2026)

   La Scrivania diceva che cosa FARE («Da fare oggi»: insoluti, rinnovi,
   documenti mancanti, compleanni) e non diceva mai come sta andando. Per
   saperlo bisognava aprire Produzione › KPI e gare, che è un'altra schermata e
   un'altra domanda.

   ── PERCHÉ NON SONO GLI STESSI NUMERI DI «DA FARE OGGI» ──────────────────
   Il 4/8/2026 una striscia di quattro indicatori era stata TOLTA da questa
   stessa pagina (§13.3) perché ripeteva i numeri di «Da fare oggi» a cento
   pixel di distanza. Quella decisione vale ancora, e questi numeri non la
   violano: «Da fare oggi» elenca LAVORO ARRETRATO — cose che qualcuno deve
   sbrigare — questi dicono COME STA ANDANDO. Un rinnovo da lavorare è un
   compito; il portafoglio in gestione non è un compito di nessuno.

   ── LA REGOLA CHE VALE PIÙ DI TUTTE ──────────────────────────────────────
   Quello che non si sa NON entra nei totali, e si dichiara (regola di casa
   §8.1, e §17 applicata ai premi). Sul portafoglio vero cinque polizze su
   trenta non hanno un premio annuo, perché sono frazionate di cui la
   compagnia non ha mandato tutte le rate (§36): sommare zero al loro posto
   farebbe un portafoglio più povero di quello che è, e sarebbe un numero
   credibile e falso.

   ── E NON SI FANNO PERCENTUALI CONTRO LO ZERO ────────────────────────────
   «Da 0 a 5» non è «+500%»: è «prima non ce n'erano». Una percentuale
   calcolata su un denominatore zero è il modo più veloce di mettere in una
   scrivania un numero enorme che non vuol dire niente.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'kpi-2026-09-21';

  function testo(v) { return v == null ? '' : String(v).trim(); }
  function numero(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function cent(n) {
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }
  function giorno(v) { return testo(v).slice(0, 10); }

  /* Il mese in cui cade una data, come «2026-09». Le date si confrontano come
     stringhe perché sono ISO: niente fusi orari, niente `new Date()` che a
     mezzanotte in Italia restituisce il giorno prima (la trappola già presa
     nella Scrivania). */
  function mese(v) { return giorno(v).slice(0, 7); }
  function primoDelMese(m) { return testo(m) + '-01'; }
  function meseMeno(m, n) {
    var p = testo(m).split('-');
    var a = Number(p[0]), i = Number(p[1]) - 1 - n;
    while (i < 0) { i += 12; a--; }
    while (i > 11) { i -= 12; a++; }
    return a + '-' + (i + 1 < 10 ? '0' : '') + (i + 1);
  }

  /* ═══ IL PORTAFOGLIO ══════════════════════════════════════════════════════

     «Attiva» vuol dire che la copertura corre oggi: non annullata e non ancora
     scaduta. Una polizza senza scadenza non si può dire né attiva né scaduta,
     quindi non si conta da nessuna delle due parti — e si dichiara, perché
     metterla fra le attive gonfierebbe il portafoglio e metterla fra le
     scadute lo svuoterebbe. */
  function portafoglio(polizze, oggi) {
    var og = giorno(oggi) || '';
    var out = { attive: 0, scadute: 0, senza_scadenza: 0, annullate: 0,
                premio: 0, con_premio: 0, senza_premio: 0 };
    (polizze || []).forEach(function (p) {
      if (!p) return;
      if (testo(p.stato_pagamento) === 'annullata') { out.annullate++; return; }
      var sc = giorno(p.data_scadenza);
      if (!sc) { out.senza_scadenza++; return; }
      if (og && sc < og) { out.scadute++; return; }
      out.attive++;
      var pr = numero(p.premio_annuo);
      if (pr == null) { out.senza_premio++; return; }
      out.premio = cent(out.premio + pr);
      out.con_premio++;
    });
    /* Il motivo va scritto qui e non nella schermata: il numero e la ragione
       per cui è incompleto viaggiano insieme, altrimenti prima o poi uno dei
       due si mostra senza l'altro. */
    out.motivo = out.senza_premio
      ? out.senza_premio + (out.senza_premio === 1 ? ' polizza attiva non ha' : ' polizze attive non hanno')
        + ' un premio annuo: non entra' + (out.senza_premio === 1 ? '' : 'no') + ' nel totale.'
      : null;
    return out;
  }

  /* ═══ LA PRODUZIONE DI UN MESE ════════════════════════════════════════════

     Un preventivo conta nel mese in cui è stato fatto; una polizza nel mese in
     cui è stata emessa. Sono due date diverse e non si possono confondere: un
     preventivo di agosto emesso a settembre è produzione di agosto e polizza
     di settembre, e contarlo una volta sola su una delle due farebbe sparire
     metà del lavoro.

     E dove l'emissione non si sa, si ripiega sulla data del preventivo — come
     già fa `produzioneRiassunto` in IAM — perché una polizza emessa esiste
     comunque, e il mese in cui è nata la trattativa è la stima più vicina che
     non sia inventata. Il ripiego SI CONTA, e chi guarda lo vede. */
  function produzione(preventivi, m) {
    var mm = testo(m);
    var out = { mese: mm, preventivi: 0, polizze: 0, conversione: null, emissione_stimata: 0 };
    (preventivi || []).forEach(function (r) {
      if (!r) return;
      var nato = mese(r.creato_il);
      if (nato === mm) out.preventivi++;
      var emessa = r.polizza_emessa === true || !!(r.dati && r.dati.stato === 'emessa');
      if (!emessa) return;
      var quando = mese(r.polizza_il);
      if (!quando) { quando = nato; if (quando === mm) out.emissione_stimata++; }
      if (quando === mm) out.polizze++;
    });
    /* La conversione si calcola sui preventivi DI QUEL MESE: una polizza
       emessa a settembre da un preventivo di agosto può portare la
       percentuale sopra il cento, ed è giusto che si veda — vuol dire che si
       sta emettendo l'arretrato. Quello che non si fa è dividere per zero. */
    if (out.preventivi > 0) out.conversione = Math.round(out.polizze / out.preventivi * 100);
    return out;
  }

  /* ═══ L'INCASSATO ═════════════════════════════════════════════════════════

     Le rate incassate in un periodo, dalla data dell'incasso e non dalla
     decorrenza: è la stessa regola dell'estratto conto (§17) e del foglio
     cassa (§25). Una rata senza importo non si salta in silenzio — rende il
     totale incompleto, e lo si dice. */
  function incassato(titoli, dal, al) {
    var d = giorno(dal), a = giorno(al);
    var out = { righe: 0, importo: 0, senza_importo: 0 };
    (titoli || []).forEach(function (t) {
      if (!t) return;
      var q = giorno(t.incassato_il);
      if (!q) return;
      if (d && q < d) return;
      if (a && q > a) return;
      out.righe++;
      var imp = numero(t.importo_lordo);
      if (imp == null) { out.senza_importo++; return; }
      out.importo = cent(out.importo + imp);
    });
    out.motivo = out.senza_importo
      ? out.senza_importo + (out.senza_importo === 1 ? ' rata incassata non ha' : ' rate incassate non hanno')
        + ' un importo: il totale è incompleto.'
      : null;
    return out;
  }

  /* ═══ IL CONFRONTO CON PRIMA ══════════════════════════════════════════════

     La regola che tiene fuori il numero enorme e falso: da zero non si fa una
     percentuale. «Prima non ce n'erano» è l'informazione vera, e dirla in
     parole vale più di un «+500%» che nessuno sa interpretare.

     E zero contro zero non è «uguale» nel senso che interessa: è «niente né
     prima né adesso», che su una scrivania si legge in un altro modo. */
  function confronto(adesso, prima) {
    var a = numero(adesso), p = numero(prima);
    if (a == null || p == null) return { delta: null, pct: null, verso: null, testo: 'non confrontabile' };
    var delta = cent(a - p);
    if (p === 0 && a === 0) return { delta: 0, pct: null, verso: 'pari', testo: 'niente, come prima' };
    if (p === 0) return { delta: delta, pct: null, verso: 'su', testo: 'prima non ce n’erano' };
    if (a === 0) return { delta: delta, pct: -100, verso: 'giu', testo: 'adesso nessuno' };
    var pct = Math.round((a - p) / Math.abs(p) * 100);
    return {
      delta: delta, pct: pct,
      verso: pct > 0 ? 'su' : pct < 0 ? 'giu' : 'pari',
      testo: (pct > 0 ? '+' : '') + pct + '% sul mese prima'
    };
  }

  var API = {
    VERSIONE: VERSIONE,
    mese: mese, meseMeno: meseMeno, primoDelMese: primoDelMese,
    portafoglio: portafoglio, produzione: produzione, incassato: incassato,
    confronto: confronto, cent: cent, numero: numero
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Kpi = API;
})();
