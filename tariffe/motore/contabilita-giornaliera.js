/* ═══════════════════════════════════════════════════════════════════════════════
   CONTABILITÀ GIORNALIERA — il foglio cassa del giorno  (24/09/2026)

   Che cosa risponde: in un dato giorno, che cosa è entrato in agenzia, COME, e
   quali sospesi sono stati scaricati. È il dettaglio che sta sotto i due
   riquadri che Contabilità mostra già — la giornata dichiarata a mano e quella
   ricostruita dai movimenti — e che finora non c'era: lì si vedono i totali,
   qui si vede di che cosa sono fatti.

   NON È UN TERZO ARCHIVIO, e non è il «Foglio cassa» del Portafoglio. Quello
   guarda la PRODUZIONE — le rate incassate e la provvigione che ne resta
   all'agenzia. Questo guarda la CASSA — che cosa è passato dal cassetto oggi.
   Due domande diverse sugli stessi giorni: tenerle separate è il motivo per cui
   questo file non allarga foglio-cassa.js.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ I SOSPESI SCARICATI SI RICAVANO PER DIFFERENZA, e va capito perché.       │
   └───────────────────────────────────────────────────────────────────────────┘
   L'elenco dei sospesi non è una storia di eventi: è una FOTOGRAFIA, ricaricata
   per intero ogni giorno (87 righe il 24/07, 65 il 23/07). Nessuno scrive «oggi
   Tizio ha pagato»: semplicemente, domani Tizio non c'è più. Quindi chi c'era
   ieri e oggi non c'è più è stato scaricato, e lo si riconosce dal `prog`, che
   è il numero progressivo della compagnia e non cambia.

   Misurato sui giorni veri: 8 sospesi per 2.316,93 € scaricati il 24/07/2026,
   47 per 19.056,49 € il 14/07.

   DUE AVVERTENZE, perché un numero così si guarda e ci si crede.

   1. I giorni sono quelli REGISTRATI, non quelli del calendario. Fra il
      17/07 e il 21/07 non c'è nessuna fotografia: i 28 sospesi «scaricati il
      21» sono in realtà quelli del fine settimana. La finestra vera viene
      detta insieme al numero, invece di lasciar credere che sia un giorno.

   2. LA DIFFERENZA DICE *CHE* È STATO SCARICATO, NON *COME*. Contante, POS,
      bonifico: quello non è scritto da nessuna parte. iam_movimenti ha già la
      forma giusta per registrarlo (`sospeso_id` accanto al conto e alla
      polizza, e `e_conto_sospeso` sui conti), ma al 24/09/2026 contiene sei
      movimenti in tutto: la struttura c'è, l'acqua no. Finché resta così, qui
      il mezzo di pagamento si dichiara MANCANTE invece di essere indovinato —
      un foglio cassa che scrive «contante» senza saperlo è peggio di uno che
      lascia la casella vuota.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MEZZI = {
    contante: 'Contante', pos: 'POS', pos_bianco: 'POS bianco', pos_nero: 'POS nero',
    assegno: 'Assegno', bonifico: 'Bonifico', carta_credito: 'Carta di credito',
    prepagata: 'Carta prepagata', paypal: 'PayPal', domiciliazione: 'Domiciliazione (SDD)',
    altro: 'Altro',
  };

  /* DUE MONDI, E CONFONDERLI COSTA CARO. Gli importi arrivano da due parti:
     numeri JSON veri (17.22, dall'elenco dei sospesi) e stringhe scritte a mano
     all'italiana («1.234,56», dai campi della giornata). La prima versione di
     questa funzione toglieva i punti a tutti e due, e 17.22 diventava 1722: su
     tre sospesi il totale passava da 137,72 a 2.927. Un numero credibile, e
     falso di venti volte.

     Adesso: un numero resta un numero; una stringa con la virgola è
     all'italiana; una stringa senza virgola si legge com'è. */
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v).trim();
    if (!s) return 0;
    var n = s.indexOf(',') >= 0 ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
    return isFinite(n) ? n : 0;
  }
  function cent(n) { var s = n < 0 ? -1 : 1; return s * Math.round(Math.abs(num(n)) * 100) / 100; }
  function giorno(v) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v == null ? '' : v)); return m ? m[1] : null; }

  function elenco(j) {
    if (Array.isArray(j)) return j;
    if (typeof j === 'string' && j.trim()) { try { var p = JSON.parse(j); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }

  /* Il numero della compagnia è la chiave. Arriva a volte con l'involucro di
     Excel attorno — `="BLP960372057"` — e due stringhe che rappresentano la
     stessa cosa non si riconoscerebbero l'una con l'altra. */
  function chiave(s) {
    return String(s == null ? '' : s).replace(/^="?|"?$/g, '').replace(/\s+/g, '').toUpperCase();
  }
  function idSospeso(s) {
    var p = chiave(s && s.prog);
    if (p) return 'prog:' + p;
    /* Senza progressivo si ripiega su polizza + importo: meno solido, e per
       questo la riga esce marcata. */
    return 'ripiego:' + chiave(s && s.polizza) + ':' + cent(s && s.importo).toFixed(2);
  }

  /* ── QUALI SOSPESI SONO STATI SCARICATI ──────────────────────────────────
     `prima` e `dopo` sono le due fotografie. `giorniPrima`/`giorniDopo` servono
     solo a dire che finestra si sta guardando: se fra le due fotografie ci sono
     tre giorni, il numero non è «di oggi». */
  function sospesiScaricati(prima, dopo, quando) {
    var a = elenco(prima), b = elenco(dopo);
    var ancora = {};
    b.forEach(function (s) { ancora[idSospeso(s)] = true; });

    var usciti = a.filter(function (s) { return !ancora[idSospeso(s)]; });
    var q = quando || {};
    var dal = giorno(q.dal), al = giorno(q.al);
    var giorniDiMezzo = (dal && al)
      ? Math.round((new Date(al + 'T12:00:00') - new Date(dal + 'T12:00:00')) / 86400000)
      : null;

    return {
      righe: usciti.map(function (s) {
        return {
          nominativo: String(s.nominativo || '').trim() || '(senza nome)',
          compagnia: String(s.compagnia || '').trim() || null,
          polizza: chiave(s.polizza) || null,
          targa: String(s.targa || '').trim() || null,
          produttore: String(s.produttore || '').trim() || null,
          importo: cent(s.importo),
          sospeso_dal: String(s.data || '').trim() || null,
          giorni_di_sospeso: s.gg != null ? num(s.gg) : null,
          /* L'informazione che manca, detta invece che indovinata. */
          mezzo_pagamento: null,
          mezzo_ignoto: true,
          riconosciuto_dal_progressivo: !!chiave(s.prog),
        };
      }),
      quanti: usciti.length,
      totale: cent(usciti.reduce(function (t, s) { return t + cent(s.importo); }, 0)),
      finestra: { dal: dal, al: al, giorni: giorniDiMezzo },
      /* Se fra le due fotografie è passato più di un giorno, questi sospesi non
         sono «di oggi»: sono di quei giorni lì, e la schermata deve dirlo. */
      piuDiUnGiorno: giorniDiMezzo != null && giorniDiMezzo > 1,
      senzaProgressivo: usciti.filter(function (s) { return !chiave(s.prog); }).length,
    };
  }

  /* ── GLI INCASSI DEL GIORNO, DIVISI PER COME SONO STATI PAGATI ───────────
     Le rate arrivano da quote_titoli: `incassato_il` è il giorno, e
     `mezzo_pagamento` come. Attenzione a che cosa significa quel mezzo: per le
     polizze vendute online è come il CLIENTE ha pagato la COMPAGNIA (carta,
     PayPal), non che cosa è passato dal cassetto dell'agenzia. Le due cose si
     tengono separate più sotto. */
  function incassiPerMezzo(titoli, g) {
    var d = giorno(g);
    var righe = (titoli || []).filter(function (t) {
      return giorno(t.incassato_il) === d && String(t.stato || '').toLowerCase() === 'incassato';
    });
    var per = {};
    righe.forEach(function (t) {
      var m = String(t.mezzo_pagamento || '').trim() || 'non_detto';
      if (!per[m]) per[m] = { mezzo: m, etichetta: MEZZI[m] || (m === 'non_detto' ? 'Non indicato' : m), quante: 0, totale: 0, righe: [] };
      per[m].quante++;
      per[m].totale = cent(per[m].totale + cent(t.importo_lordo));
      per[m].righe.push(t);
    });
    var lista = Object.keys(per).map(function (k) { return per[k]; })
      .sort(function (x, y) { return y.totale - x.totale; });
    return {
      per_mezzo: lista,
      quante: righe.length,
      totale: cent(righe.reduce(function (t, r) { return t + cent(r.importo_lordo); }, 0)),
      senzaMezzo: (per['non_detto'] || { quante: 0 }).quante,
    };
  }

  /* ── IL FOGLIO DEL GIORNO ───────────────────────────────────────────────
     Mette insieme le tre cose e non ne inventa nessuna: quello che la
     giornata dichiarata non dice resta null, non zero. Zero è un'informazione
     («non è entrato niente»); null è un'altra («non lo sappiamo»), e
     confonderle in un foglio cassa è il modo di far quadrare i conti per
     sbaglio. */
  function foglio(dati) {
    var d = dati || {};
    var g = giorno(d.giorno);
    var dich = d.dichiarata || null;
    var haDich = !!dich;

    var cassa = {
      contanti:   haDich && dich.contanti   != null ? cent(dich.contanti)   : null,
      pos_bianco: haDich && dich.pos_bianco != null ? cent(dich.pos_bianco) : null,
      pos_nero:   haDich && dich.pos_nero   != null ? cent(dich.pos_nero)   : null,
      spese:      haDich && dich.spese      != null ? cent(dich.spese)      : null,
      versamento: haDich && dich.versamenti != null ? cent(dich.versamenti) : null,
      fondo:      haDich && dich.fondo_cassa!= null ? cent(dich.fondo_cassa): null,
      note:       haDich ? (String(dich.note || '').trim() || null) : null,
    };
    var pos = (cassa.pos_bianco || 0) + (cassa.pos_nero || 0);
    var entrato = (cassa.contanti || 0) + pos;

    var sos = sospesiScaricati(d.sospesiPrima, d.sospesiDopo, { dal: d.giornoPrima, al: g });
    var inc = incassiPerMezzo(d.titoli, g);

    var avvisi = [];
    if (!haDich) avvisi.push({ g: 'avviso', t: 'Per questo giorno non è stata compilata la giornata: contanti, POS e spese non risultano.' });
    if (sos.piuDiUnGiorno) {
      avvisi.push({ g: 'avviso', t: 'Fra il giorno precedente registrato e questo passano ' + sos.finestra.giorni +
        ' giorni: i sospesi scaricati sono di tutto quel periodo, non solo di oggi.' });
    }
    if (sos.quanti && !d.mezziSospesiNoti) {
      avvisi.push({ g: 'avviso', t: 'Di questi sospesi si sa che sono stati scaricati, non come sono stati pagati: il mezzo non è registrato da nessuna parte.' });
    }
    if (inc.senzaMezzo) {
      avvisi.push({ g: 'avviso', t: inc.senzaMezzo + ' rate incassate oggi non dicono con che mezzo sono state pagate.' });
    }
    /* Le spese ci sono ma non si sa come sono state pagate: nella giornata
       dichiarata c'è solo il totale. */
    if (cassa.spese) {
      avvisi.push({ g: 'avviso', t: 'Le spese del giorno sono un totale: come siano state pagate non è registrato.' });
    }

    return {
      giorno: g,
      cassa: cassa,
      pos_totale: (cassa.pos_bianco == null && cassa.pos_nero == null) ? null : cent(pos),
      entrato_in_cassa: haDich ? cent(entrato) : null,
      sospesi: sos,
      incassi: inc,
      avvisi: avvisi,
      /* Quello che questo foglio NON può dire, scritto una volta e messo in
         cima: serve a chi guarda, e serve a chi un domani lo estende. */
      noteDiMetodo: [
        'I sospesi scaricati si ricavano per differenza fra la fotografia di ieri e quella di oggi: l\'elenco non registra i pagamenti, si limita a non contenere più chi ha pagato.',
        'Il mezzo con cui un sospeso è stato scaricato non è registrato: la struttura per farlo esiste già in Contabilità (movimenti con il conto e il sospeso), ma non viene ancora usata.',
        'Il mezzo di pagamento delle rate è come il cliente ha pagato la compagnia — spesso online — e non coincide con quello che è passato dal cassetto.',
      ],
    };
  }

  var API = {
    MEZZI: MEZZI, num: num, cent: cent, giorno: giorno, chiave: chiave, idSospeso: idSospeso,
    sospesiScaricati: sospesiScaricati, incassiPerMezzo: incassiPerMezzo, foglio: foglio,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.ContabilitaGiornaliera = API;
})();
