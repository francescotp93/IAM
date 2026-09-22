/* ═══════════════════════════════════════════════════════════════════════════
   LA SCHEDA DEL CLIENTE — i numeri che si leggono aprendola
   ───────────────────────────────────────────────────────────────────────────
   Nasce il 22/09/2026 da una richiesta di Francesco, con sotto gli occhi la
   scheda cliente del portale Tutela Legale: «questa è come vorrei
   l'interfaccia dell'anagrafica cliente».

   Quella scheda risponde a quattro domande in un colpo d'occhio: quante
   polizze ha, quanto vale, quanto deve, e che cosa è successo di recente.
   Sono numeri che una persona legge e su cui poi telefona a un cliente:
   quindi stanno qui e non dentro una schermata (CLAUDE.md §5), perché un
   calcolo scritto in `index.html` non si può provare senza aprire un browser.

   LE REGOLE DI CASA CHE VALGONO SU TUTTO QUESTO FILE

   1. **Una polizza senza premio non vale zero.** Sommare zero farebbe un
      portafoglio PIÙ POVERO del vero, e un numero più basso, su una scheda,
      nessuno lo mette in dubbio (§36, §42). Restano fuori dal totale e si
      contano a parte.
   2. **«Non si è potuto leggere» non è «non c'è niente»** (§12, §18). Ogni
      risposta porta `letto`: chi disegna sa distinguere uno zero vero da un
      buco, e non scrive «nessun insoluto» su una lettura caduta.
   3. **Le provvigioni maturano sull'INCASSATO** (§17, decisione 1): una rata
      emessa e non pagata non ha prodotto niente per nessuno.
   4. **Niente date prese dall'orologio dentro il motore.** L'istante di
      riferimento arriva da chi chiama, così la stessa scheda dà la stessa
      risposta a due persone e una prova scritta oggi non diventa rossa
      domani (§44, §45).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══ ATTREZZI ════════════════════════════════════════════════════════════ */

  function testo(v) { return v == null ? '' : String(v).trim(); }

  function numero(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  /* Una data ISO non ha un fuso orario, e farla passare da `new Date(...)` +
     `toISOString()` gliene dà uno: in Italia il risultato torna indietro di un
     giorno (§44). Qui si confronta sui numeri della stringa, che è l'unica
     cosa che non cambia da un computer all'altro. */
  function giorno(v) {
    var s = testo(v);
    if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
    return '';
  }

  function annoDi(iso) { return giorno(iso).slice(0, 4); }
  function meseDi(iso) { return giorno(iso).slice(0, 7); }

  /* Arrotondamento SIMMETRICO: `Math.round(-0.5)` in JavaScript fa `-0`, cioè
     arrotonda verso l'alto anche i negativi, e gli storni esistono (§17). */
  function cent(n) {
    if (n == null || !isFinite(n)) return null;
    return (n < 0 ? -1 : 1) * Math.round(Math.abs(n) * 100) / 100;
  }

  /* ═══ LA SITUAZIONE DEL CLIENTE ═══════════════════════════════════════════
     I quattro numeri della scheda «Situazione cliente»: insoluti, valore
     degli insoluti, totale polizze, valore del portafoglio.

     `polizze` sono le righe di `quote_polizze` di questo cliente, `titoli` le
     sue rate. `oggi` è la data di riferimento, in ISO, e arriva da chi chiama.

     UN INSOLUTO È UNA RATA APERTA GIÀ SCADUTA, non una rata aperta e basta:
     una rata che scade fra un mese non è un insoluto, è un impegno futuro, e
     metterla fra gli insoluti farebbe telefonare a un cliente in regola.     */
  function situazione(polizze, titoli, oggi, opz) {
    opz = opz || {};
    var o = giorno(oggi);
    var pol = (polizze || []).filter(function (p) { return p && !annullata(p); });
    var attive = pol.filter(function (p) { return attiva(p, o); });

    var valore = 0, senzaPremio = 0;
    attive.forEach(function (p) {
      var n = numero(p.premio_annuo);
      if (n == null) senzaPremio++; else valore += n;
    });

    var aperte = (titoli || []).filter(function (t) {
      return t && testo(t.stato).toLowerCase() === 'aperto';
    });
    var insoluti = aperte.filter(function (t) {
      var d = giorno(t.data_decorrenza || t.data_scadenza);
      return d && d < o;
    });
    var valoreInsoluti = 0, insolutiSenzaImporto = 0;
    insoluti.forEach(function (t) {
      var n = numero(t.importo_lordo);
      if (n == null) insolutiSenzaImporto++; else valoreInsoluti += n;
    });

    return {
      polizze_attive: attive.length,
      totale_polizze: pol.length,
      /* Le proposte sono i preventivi non emessi: le passa chi chiama, perché
         vivono in un'altra tabella e questo motore non le va a cercare. */
      proposte: opz.proposte == null ? null : opz.proposte,
      valore_portafoglio: cent(valore),
      /* Il numero di polizze attive di cui NON si sa il premio. Senza questo,
         un portafoglio a metà si legge come un portafoglio povero. */
      senza_premio: senzaPremio,
      insoluti: insoluti.length,
      valore_insoluti: cent(valoreInsoluti),
      insoluti_senza_importo: insolutiSenzaImporto,
      /* Regola 2: chi disegna deve poter distinguere uno zero vero da un buco. */
      letto: {
        polizze: opz.letto && opz.letto.polizze === false ? false : true,
        titoli: opz.letto && opz.letto.titoli === false ? false : true
      }
    };
  }

  /* Annullata è una cosa dichiarata, non dedotta: lo dice lo stato della
     polizza. Una polizza scaduta NON è annullata (§14, regola 4) — è finita
     alla sua scadenza naturale, ed è esattamente quella da richiamare. */
  function annullata(p) {
    var s = testo(p.stato_pagamento).toLowerCase();
    if (s === 'annullata') return true;
    return testo(p.stato).toLowerCase() === 'annullata';
  }

  /* Attiva = la copertura corre oggi. Una polizza SENZA scadenza non è né
     attiva né scaduta: metterla da una delle due parti gonfierebbe o
     svuoterebbe il portafoglio (§42), quindi si conta fra le attive solo se
     l'effetto è passato e la scadenza non c'è ancora stata. */
  function attiva(p, oggi) {
    var scad = giorno(p.data_scadenza);
    var eff = giorno(p.data_effetto);
    if (scad && scad < oggi) return false;
    if (eff && eff > oggi) return false;
    return true;
  }

  /* ═══ LA COMPOSIZIONE DEL PORTAFOGLIO ═════════════════════════════════════
     La ciambella: una fetta per prodotto, con quante polizze e quanto premio.

     SI CONTANO LE POLIZZE, E IL PREMIO SI DICHIARA A PARTE. Una fetta
     disegnata sul premio farebbe sparire dal grafico i prodotti di cui il
     premio non si sa — cioè proprio quelli da guardare. La fetta è il NUMERO
     di polizze, che si sa sempre.                                            */
  function composizione(polizze, oggi) {
    var o = giorno(oggi);
    var attive = (polizze || []).filter(function (p) {
      return p && !annullata(p) && attiva(p, o);
    });
    var per = {};
    attive.forEach(function (p) {
      var k = testo(p.prodotto) || testo(p.modulo) || 'Senza prodotto';
      if (!per[k]) per[k] = { etichetta: k, polizze: 0, premio: 0, senza_premio: 0 };
      per[k].polizze++;
      var n = numero(p.premio_annuo);
      if (n == null) per[k].senza_premio++; else per[k].premio += n;
    });
    var out = Object.keys(per).map(function (k) { return per[k]; });
    out.sort(function (a, b) { return b.polizze - a.polizze || a.etichetta.localeCompare(b.etichetta); });
    var tot = out.reduce(function (s, g) { return s + g.polizze; }, 0);
    out.forEach(function (g) {
      g.premio = cent(g.premio);
      /* La quota è sul NUMERO, non sul premio: è quello che il disegno mostra. */
      g.quota = tot ? g.polizze / tot : 0;
    });
    return { gruppi: out, polizze: tot };
  }

  /* ═══ I PREMI E LE PROVVIGIONI, PER PERIODO ═══════════════════════════════
     Tre colonne, come sulla scheda di un gestionale: mese corrente, anno in
     corso, anno precedente.

     I NOMI DEI PERIODI SONO QUELLI CHE DICONO, e non «ultimo anno», che vuol
     dire due cose diverse (gli ultimi dodici mesi, oppure l'anno solare
     scorso) e chi legge non sa quale. Qui sono l'anno SOLARE in corso e
     quello prima, che sono i periodi su cui si chiude un bilancio.

     SI CONTA SULL'INCASSATO (§17): la data che fa testo è `incassato_il`, e
     una rata emessa e non pagata non entra in nessuna colonna.               */
  function periodi(titoli, oggi) {
    var o = giorno(oggi);
    var mese = o.slice(0, 7), anno = o.slice(0, 4);
    var prima = String(Number(anno) - 1);
    var vuoto = function () { return { premi: 0, provvigioni: 0, righe: 0, senza_provvigione: 0 }; };
    var out = { mese_corrente: vuoto(), anno_corrente: vuoto(), anno_precedente: vuoto(),
      etichette: { mese_corrente: mese, anno_corrente: anno, anno_precedente: prima } };

    (titoli || []).forEach(function (t) {
      if (!t || testo(t.stato).toLowerCase() !== 'incassato') return;
      var d = giorno(t.incassato_il);
      if (!d) return;
      var dove = [];
      if (meseDi(d) === mese) dove.push('mese_corrente');
      if (annoDi(d) === anno) dove.push('anno_corrente');
      else if (annoDi(d) === prima) dove.push('anno_precedente');
      if (!dove.length) return;
      var premio = numero(t.importo_lordo);
      var provv = numero(t.provvigione);
      dove.forEach(function (k) {
        out[k].righe++;
        if (premio != null) out[k].premi += premio;
        /* Quello che la compagnia non ha dichiarato non si stima (§17): esce
           dal totale col suo conto accanto, mai come uno zero. */
        if (provv == null) out[k].senza_provvigione++; else out[k].provvigioni += provv;
      });
    });
    ['mese_corrente', 'anno_corrente', 'anno_precedente'].forEach(function (k) {
      out[k].premi = cent(out[k].premi);
      out[k].provvigioni = cent(out[k].provvigioni);
    });
    return out;
  }

  /* ═══ I DOCUMENTI D'IDENTITÀ ══════════════════════════════════════════════
     Quelli dell'anagrafica (§11, regola 1): carta d'identità e passaporto,
     con la scadenza obbligatoria.

     UNO SCADUTO NON VALE COME PRESENTE. Il fascicolo lo dice già (§11) e qui
     vale identico: mostrarlo come un documento qualunque farebbe credere che
     una pratica sia a posto quando non lo è. E si mostra la versione ATTIVA
     di ogni tipo — la più recente — perché chi ha già rinnovato non deve
     comparire fra chi deve rinnovare (§11).                                  */
  function documenti(anagrafica, oggi) {
    var o = giorno(oggi);
    var righe = (anagrafica && anagrafica.documenti) || [];
    if (!Array.isArray(righe)) righe = [];
    var per = {};
    righe.forEach(function (d) {
      if (!d) return;
      var tipo = testo(d.tipo) || 'documento';
      var scad = giorno(d.scadenza);
      var data = giorno(d.data);
      var pre = per[tipo];
      /* La versione attiva è la più recente per data di caricamento; a parità,
         quella che scade più in là. */
      if (!pre || (data || '') > (pre.__data || '') ||
          ((data || '') === (pre.__data || '') && scad > (pre.scadenza || ''))) {
        per[tipo] = { tipo: tipo, numero: testo(d.numero), scadenza: scad, url: testo(d.url), __data: data };
      }
    });
    return Object.keys(per).map(function (k) {
      var d = per[k];
      delete d.__data;
      /* Senza scadenza non si dice «valido»: un documento d'identità senza
         data non si può dire valido, e accettarlo riempirebbe l'archivio di
         documenti su cui il contatore non ha niente da dire (§11). */
      d.stato = !d.scadenza ? 'senza_scadenza' : (d.scadenza < o ? 'scaduto' : 'valido');
      return d;
    }).sort(function (a, b) { return a.tipo.localeCompare(b.tipo); });
  }

  /* ═══ I CONSENSI ══════════════════════════════════════════════════════════
     Tre voci, come le mostra un gestionale: come si può contattare, il
     trattamento dei dati, la firma elettronica.

     IL CONSENSO MARKETING VALE SE LO DICE LA COLONNA **OPPURE** LA PRIVACY
     FIRMATA con la spunta: sono due strade per la stessa cosa, e guardarne
     una sola conterebbe fra i buchi chi il consenso l'aveva dato allo
     sportello (§50).                                                         */
  function consensi(anagrafica) {
    var a = anagrafica || {};
    var pf = a.privacy_firmata || a.privacy || null;
    var marketing = a.consenso_marketing === true ||
      !!(pf && (pf.marketing === true || pf.consenso_marketing === true));
    var recapito = testo(a.email) || testo(a.cellulare) || testo(a.telefono);
    return [
      { voce: 'Canale di comunicazione', ok: !!recapito, dettaglio: recapito || 'nessun recapito in scheda' },
      { voce: 'Trattamento dei dati (privacy)', ok: !!(pf && (pf.firmata_il || pf.data || pf.firmato)),
        dettaglio: (pf && (pf.firmata_il || pf.data)) ? 'firmata il ' + String(pf.firmata_il || pf.data).slice(0, 10) : 'non risulta firmata' },
      { voce: 'Consenso marketing', ok: marketing,
        dettaglio: marketing ? 'si può contattare per campagne' : 'non dato: niente campagne a questa persona' }
    ];
  }

  /* ═══ GLI ULTIMI EVENTI ═══════════════════════════════════════════════════
     Le righe del registro dei movimenti (§18) che riguardano QUESTO cliente:
     quelle agganciate alla sua anagrafica e quelle agganciate alle sue
     polizze. Le legge chi chiama; qui si mettono in fila e si tagliano.

     `quante` di default è 5, come sulla scheda di riferimento. E la risposta
     dice `letto`, perché «il registro non risponde» e «non è successo
     niente» sono due cose diverse (§18).                                     */
  function eventi(righe, quante) {
    var n = quante == null ? 5 : quante;
    if (righe == null) return { righe: [], letto: false, quante: 0 };
    var out = (righe || []).filter(Boolean).slice();
    out.sort(function (a, b) {
      return String(b.creato_il || '').localeCompare(String(a.creato_il || ''));
    });
    return { righe: out.slice(0, n), letto: true, quante: out.length };
  }

  var API = {
    situazione: situazione, composizione: composizione, periodi: periodi,
    documenti: documenti, consensi: consensi, eventi: eventi,
    attiva: attiva, annullata: annullata, giorno: giorno, cent: cent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.SchedaCliente = API;
})();
