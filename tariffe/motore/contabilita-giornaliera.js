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

  /* ═══ GLI APPUNTI DEL GIORNO ══════════════════════════════════════════════
     Questa è la forma dei due fogli che la compagnia stampa ogni sera —
     «Appunti Incassi» e «Situazione Incassi» — e che Francesco usa davvero.
     Riprodurla vuol dire rispettare tre cose che quei fogli tengono separate
     e che sarebbe facilissimo mescolare.

     R1. UN PAGAMENTO MESSO SU UN SOSPESO NON È CASSA. Nel foglio della
         compagnia, il «Pagamento» di una rata può essere un mezzo (Contanti,
         Pos, Assegni, Banca) oppure IL NOME DI UN COLLABORATORE. Il secondo
         caso non è un incasso: è un pagamento da perfezionare, appoggiato al
         sottoconto sospeso di quella persona — nel foglio è una riga come
         «04010009 ODDO FRANCESCO». Entra nel totale degli incassi e NON entra
         nella cassa. È esattamente il «a netto di quelle sospese» chiesto.

     R2. UN SOSPESO INCASSATO È CASSA, MA NON È UN INCASSO NUOVO. Quando quel
         sospeso viene poi pagato, i soldi entrano. Se lo si sommasse al totale
         degli incassi si conterebbe DUE VOLTE lo stesso denaro: una quando la
         rata è stata messa a sospeso, una quando il sospeso è stato saldato.
         Per questo i sospesi incassati stanno in un blocco a parte — come nel
         foglio, sotto il titolo «Totale sospesi incassati» — e la cassa si
         ottiene sommando, non ricontando.

     R3. IL MEZZO SI RICONOSCE, NON SI INDOVINA. Un pagamento che non si
         riesce ad attribuire a nessun conto resta «non attribuito». Diventare
         «Altro» vorrebbe dire far quadrare il foglio per sbaglio.
     ════════════════════════════════════════════════════════════════════════ */

  /* Il nome del conto come chiave: «Banca Assicurativa Hdi», «BANCA
     ASSICURATIVA HDI» e «banca assicurativa hdi» sono lo stesso sottoconto. */
  function nomeConto(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* Decide se un «Pagamento» è cassa o è un sospeso. `conti` è l'elenco dei
     sottoconti (da `iam_conti`): quelli con `e_conto_sospeso` sono le persone.
     Senza elenco non si tira a indovinare sui nomi propri — si dichiara che
     non si sa, e la riga esce marcata. */
  function classificaMezzo(mezzo, conti) {
    var k = nomeConto(mezzo);
    if (!k) return { chiave: null, etichetta: 'Non indicato', sospeso: false, noto: false };
    var trovato = null;
    (conti || []).forEach(function (c) {
      if (trovato) return;
      if (nomeConto(c.nome) === k) trovato = c;
      else if (c.mezzi && [].concat(c.mezzi).some(function (m) { return nomeConto(m) === k; })) trovato = c;
    });
    if (trovato) {
      return {
        chiave: String(trovato.id || nomeConto(trovato.nome)),
        etichetta: trovato.nome || mezzo,
        sospeso: !!trovato.e_conto_sospeso,
        collaboratore_id: trovato.collaboratore_id || null,
        noto: true,
      };
    }
    /* Non è fra i conti. Se è una delle parole note dei mezzi, è cassa; se no,
       non si sa: potrebbe essere il nome di una persona (quindi un sospeso) o
       un conto che nessuno ha ancora creato. Le due cose non si indovinano.

       PRIMA DI TUTTO, le chiavi di MEZZI: sono i valori che il database scrive
       davvero in `quote_titoli.mezzo_pagamento`, e vengono da un vincolo, non
       da come uno l'ha digitato. Mancavano, e costava caro: `carta_credito`,
       `pos_bianco`, `pos_nero` e `altro` finivano fra i «non si riesce ad
       attribuire». Sul 23/09/2026 erano 2 mezzi su 5 — il netto del giorno
       usciva incompleto e la schermata dava la colpa a un dato che invece era
       scritto benissimo. Il vocabolario qui sotto è il SECONDO tentativo: serve
       per quello che si scrive a mano («contanti» al plurale, «sdd»). */
    /* Il vocabolario di chi scrive a mano. Ogni parola porta alla chiave
       canonica, non a se stessa: così «contanti» e `contante` finiscono nella
       STESSA colonna invece di farne due mezze, e l'etichetta esce scritta
       bene una volta sola. */
    var vocabolario = {
      contanti: 'contante', cash: 'contante',
      assegni: 'assegno',
      'carta di credito': 'carta_credito', 'carta credito': 'carta_credito', carta: 'carta_credito',
      'carta prepagata': 'prepagata',
      'pos bianco': 'pos_bianco', 'pos nero': 'pos_nero',
      sdd: 'domiciliazione', rid: 'domiciliazione',
      incasso: 'contante',
    };
    /* Ultimo tentativo: la stessa parola col trattino basso al posto dello
       spazio. «carta di credito» scritto a mano e `carta_credito` scritto dal
       database sono la stessa cosa, e distinguerli non aiuta nessuno. */
    var canonica = vocabolario[k] || k.replace(/[\s-]+/g, '_');
    if (MEZZI[canonica]) return { chiave: canonica, etichetta: MEZZI[canonica], sospeso: false, noto: true };
    return { chiave: k, etichetta: mezzo, sospeso: false, noto: false };
  }

  function appunti(dati) {
    var d = dati || {};
    var g = giorno(d.giorno);
    var conti = d.conti || [];

    var righe = (d.righe || []).filter(function (r) {
      return !g || giorno(r.data || r.incassato_il) === g;
    }).map(function (r) {
      var m = classificaMezzo(r.mezzo || r.mezzo_pagamento, conti);
      return {
        compagnia: String(r.compagnia || '').trim() || '—',
        data: giorno(r.data || r.incassato_il),
        nominativo: r.nominativo || r.cliente || '',
        ramo: r.ramo || r.modulo || r.prodotto || '',
        polizza: r.polizza || r.numero_polizza || '',
        effetto: giorno(r.effetto || r.data_effetto),
        mezzo: m,
        produttore: r.produttore || r.collaboratore || '',
        importo: cent(r.importo != null ? r.importo : r.importo_lordo),
        provvigione: cent(r.provvigione),
      };
    });

    /* Raggruppate per compagnia, come nel foglio: ogni compagnia col suo
       conteggio, il suo totale e le sue provvigioni. */
    var per = {};
    righe.forEach(function (r) {
      if (!per[r.compagnia]) per[r.compagnia] = { compagnia: r.compagnia, quante: 0, totale: 0, provvigioni: 0, righe: [] };
      var b = per[r.compagnia];
      b.quante++;
      b.totale = cent(b.totale + r.importo);
      b.provvigioni = cent(b.provvigioni + r.provvigione);
      b.righe.push(r);
    });
    var gruppi = Object.keys(per).map(function (k) { return per[k]; })
      .sort(function (a, b) { return b.totale - a.totale; });

    var somma = function (l) { return cent(l.reduce(function (t, r) { return t + r.importo; }, 0)); };
    var daPerf = righe.filter(function (r) { return r.mezzo.sospeso; });
    var incerte = righe.filter(function (r) { return !r.mezzo.noto; });
    var cassa = righe.filter(function (r) { return r.mezzo.noto && !r.mezzo.sospeso; });

    /* Solo la cassa vera si ripartisce per mezzo: mettere i sospesi qui dentro
       vorrebbe dire far comparire nel POS dei soldi che nessuno ha incassato. */
    var perMezzo = {};
    cassa.forEach(function (r) {
      var k = r.mezzo.chiave;
      if (!perMezzo[k]) perMezzo[k] = { chiave: k, etichetta: r.mezzo.etichetta, quante: 0, totale: 0 };
      perMezzo[k].quante++;
      perMezzo[k].totale = cent(perMezzo[k].totale + r.importo);
    });

    var totale = somma(righe);
    var perfTot = somma(daPerf);

    var avvisi = [];
    if (incerte.length) {
      avvisi.push({ g: 'grave', t: incerte.length + ' pagamenti non si riescono ad attribuire a nessun conto (' +
        incerte.slice(0, 4).map(function (r) { return r.mezzo.etichetta || '(vuoto)'; }).join(', ') +
        '): finché non si sa se sono cassa o sospesi, il netto del giorno è incompleto.' });
    }
    if (perfTot) {
      avvisi.push({ g: 'avviso', t: daPerf.length + ' pagamenti per ' + perfTot.toFixed(2).replace('.', ',') +
        ' € sono appoggiati al sospeso di un collaboratore: sono da perfezionare, e non sono entrati in cassa.' });
    }

    return {
      giorno: g,
      gruppi: gruppi,
      righe: righe,
      quante: righe.length,
      totale: totale,
      provvigioni: cent(righe.reduce(function (t, r) { return t + r.provvigione; }, 0)),
      daPerfezionare: { quante: daPerf.length, totale: perfTot, righe: daPerf },
      nonAttribuiti: { quante: incerte.length, totale: somma(incerte), righe: incerte },
      /* Il numero che Francesco ha chiesto: gli incassi al netto delle
         sospese. I non attribuiti restano DENTRO, perché toglierli
         significherebbe aver deciso che sono sospesi — e non lo si sa. */
      netto: cent(totale - perfTot),
      perMezzo: Object.keys(perMezzo).map(function (k) { return perMezzo[k]; })
        .sort(function (a, b) { return b.totale - a.totale; }),
      avvisi: avvisi,
    };
  }

  /* ══ LO STATO DELL'APPUNTO ═══════════════════════════════════════════════
     26/09/2026. Preso dal manuale di contabilità di AssiEasy (cap. 2A), che
     Francesco ha portato come modello: là questa è la colonna che si guarda
     ogni mattina, e la regola operativa è una riga sola —

         «Verificare che in Appunti Incassi non vi siano segnalazioni in rosso
          (devono avere tutte OK) e sanare eventuali differenze.»

     Finché un incasso non ha uno STATO, quella frase non si può eseguire: le
     righe della giornata ci sono già (`appunti` qui sopra le costruisce), ma
     nessuna dice se la compagnia le ha viste. E un incasso che la compagnia
     non ha visto è una copertura che il cliente crede di avere.

     I quattro stati, e cosa vuol dire ciascuno:

       APPUNTO  — l'abbiamo registrato noi e sul foglio cassa della compagnia
                  non c'è (ancora). Non è un errore: al mattino è la norma, e
                  alla chiusura serale è la cosa da sanare.
       OK       — c'è da entrambe le parti e gli importi coincidono. È l'unico
                  stato che non chiede niente a nessuno.
       SCOSTA   — c'è da entrambe le parti e gli importi NON coincidono. Il
                  manuale qui non lascia scegliere: si genera un ABBUONO per la
                  differenza, così il movimento resta bilanciato, e la riga
                  resta segnalata.
       FC       — sul foglio cassa della compagnia c'è una riga che da noi non
                  trova appunto. Le cause che il manuale nomina sono due:
                  numero di polizza o data di effetto diversi. Può anche essere
                  un incasso fatto in direzione, che noi non abbiamo mai visto.

     L'ABBUONO ha un verso, e non è un dettaglio contabile: è la differenza fra
     un costo e un ricavo.
       · PASSIVO (costo)  — abbiamo incassato MENO del titolo: ci rimettiamo.
       · ATTIVO (ricavo)  — abbiamo incassato PIÙ del titolo: è un'eccedenza.
     Il manuale li tiene su due conti diversi proprio per questo, e aggiunge la
     cosa che conta: gli abbuoni di piccolo importo vanno guardati ogni giorno,
     perché è lì che si nascondono gli ammanchi.

     Questo motore NON scrive niente: dice lo stato e quale abbuono servirebbe.
     Chi scrive è la schermata, dopo che una persona ha guardato. */

  var STATI_APPUNTO = {
    OK:      { chiave: 'OK',      etichetta: 'OK',             grave: false, spiega: 'La compagnia l\'ha visto e gli importi coincidono.' },
    APPUNTO: { chiave: 'APPUNTO', etichetta: 'Appunto',         grave: false, spiega: 'Registrato da noi, non ancora sul foglio cassa della compagnia.' },
    SCOSTA:  { chiave: 'SCOSTA',  etichetta: 'Scostamento',     grave: true,  spiega: 'C\'è da entrambe le parti, ma gli importi non coincidono.' },
    FC:      { chiave: 'FC',      etichetta: 'Solo foglio cassa', grave: true, spiega: 'Sul foglio cassa della compagnia, ma da noi non trova appunto.' },
  };

  /* La chiave con cui una riga nostra e una riga del foglio cassa sono «la
     stessa cosa». Il manuale elenca i campi che identificano un titolo in
     maniera univoca: agenzia, ramo, polizza, effetto. L'importo NON entra
     nella chiave — se ci entrasse, una differenza di un euro non produrrebbe
     uno scostamento da sanare ma due righe orfane, e lo scostamento è proprio
     la cosa che si vuole vedere. */
  function chiaveTitolo(r) {
    var p = chiave((r || {}).polizza || (r || {}).numero_polizza);
    if (!p) return null;                      // senza numero di polizza non si abbina niente
    var e = giorno((r || {}).effetto || (r || {}).data_effetto) || '';
    return p + '|' + e;
  }

  /* L'abbuono che serve a far tornare il movimento. `null` quando non serve. */
  function abbuonoPer(titolo, incassato) {
    var t = cent(titolo), i = cent(incassato);
    var d = cent(i - t);
    if (!d) return null;
    return {
      verso: d < 0 ? 'passivo' : 'attivo',
      importo: Math.abs(d),
      /* Il verso detto a parole, perché «passivo» e «attivo» si confondono: è
         l'agenzia che ci rimette, o che ci guadagna? */
      spiega: d < 0
        ? 'Incassati ' + Math.abs(d).toFixed(2).replace('.', ',') + ' € in meno del titolo: ci rimettiamo noi (costo).'
        : 'Incassati ' + Math.abs(d).toFixed(2).replace('.', ',') + ' € in più del titolo: eccedenza (ricavo).',
    };
  }

  function statoAppunto(nostro, dalFoglio) {
    if (!nostro && !dalFoglio) return null;
    if (!nostro) {
      return { stato: STATI_APPUNTO.FC, abbuono: null, scostamento: null,
               perche: 'Il foglio cassa della compagnia porta questa riga e da noi non c\'è: '
                     + 'o il numero di polizza o la data di effetto non combaciano, o è un incasso fatto in direzione.' };
    }
    if (!dalFoglio) {
      return { stato: STATI_APPUNTO.APPUNTO, abbuono: null, scostamento: null,
               perche: 'Da noi c\'è, sul foglio cassa della compagnia non ancora. '
                     + 'Al mattino è normale; alla chiusura serale va sanato.' };
    }
    var t = cent(nostro.importo != null ? nostro.importo : nostro.importo_lordo);
    var i = cent(dalFoglio.importo != null ? dalFoglio.importo : dalFoglio.importo_lordo);
    var ab = abbuonoPer(t, i);
    if (!ab) return { stato: STATI_APPUNTO.OK, abbuono: null, scostamento: null, perche: null };
    return {
      stato: STATI_APPUNTO.SCOSTA,
      scostamento: cent(i - t),
      abbuono: ab,
      perche: 'Noi ' + t.toFixed(2).replace('.', ',') + ' €, la compagnia ' + i.toFixed(2).replace('.', ',') + ' €. ' + ab.spiega,
    };
  }

  /* ── L'ABBINAMENTO DELLA GIORNATA ─────────────────────────────────────────
     Le nostre righe da una parte, il foglio cassa della compagnia dall'altra,
     e in mezzo lo stato di ognuna. È la schermata del mattino: se tutto è OK
     non c'è niente da fare, e ogni riga che non lo è dice da sé che cosa
     manca.

     I DOPPIONI SI DICHIARANO. Se due righe nostre hanno la stessa chiave
     (stessa polizza, stesso effetto) non si abbina «la prima e chi se ne
     frega»: sarebbe un incasso contato una volta e uno sparito. Si abbina
     quella con l'importo più vicino, e si avvisa. */
  function abbinaFoglio(nostre, dalFoglio) {
    var mie = (nostre || []).filter(Boolean);
    var loro = (dalFoglio || []).filter(Boolean);

    var perChiave = {};
    loro.forEach(function (r, idx) {
      var k = chiaveTitolo(r);
      if (!k) return;
      (perChiave[k] = perChiave[k] || []).push({ r: r, idx: idx, preso: false });
    });

    /* I DOPPIONI SI CONTANO DA TUTTE E DUE LE PARTI, e la prova me l'ha
       ricordato: la prima stesura guardava solo il foglio cassa. Due righe
       NOSTRE con la stessa polizza e lo stesso effetto sono il caso peggiore —
       una si abbina, l'altra resta appunto, il totale torna, e l'incasso
       doppio non lo vede nessuno. */
    var doppioni = [];
    var quanteMie = {};
    mie.forEach(function (n) {
      var k = chiaveTitolo(n);
      if (k) quanteMie[k] = (quanteMie[k] || 0) + 1;
    });
    Object.keys(quanteMie).forEach(function (k) { if (quanteMie[k] > 1) doppioni.push(k); });

    var righe = [];
    var usate = {};

    mie.forEach(function (n) {
      var k = chiaveTitolo(n);
      var cand = k ? (perChiave[k] || []).filter(function (x) { return !x.preso; }) : [];
      var scelto = null;
      if (cand.length) {
        if (cand.length > 1) {
          var mio = cent(n.importo != null ? n.importo : n.importo_lordo);
          cand = cand.slice().sort(function (a, b) {
            var da = Math.abs(cent(a.r.importo != null ? a.r.importo : a.r.importo_lordo) - mio);
            var db = Math.abs(cent(b.r.importo != null ? b.r.importo : b.r.importo_lordo) - mio);
            return da - db;
          });
          if (doppioni.indexOf(k) < 0) doppioni.push(k);
        }
        scelto = cand[0];
        scelto.preso = true;
        usate[scelto.idx] = true;
      }
      var s = statoAppunto(n, scelto ? scelto.r : null);
      righe.push({ nostro: n, foglio: scelto ? scelto.r : null, chiave: k,
                   stato: s.stato, scostamento: s.scostamento, abbuono: s.abbuono, perche: s.perche,
                   senzaChiave: !k });
    });

    /* Quello che resta del foglio cassa: FC. */
    loro.forEach(function (r, idx) {
      if (usate[idx]) return;
      var s = statoAppunto(null, r);
      righe.push({ nostro: null, foglio: r, chiave: chiaveTitolo(r),
                   stato: s.stato, scostamento: null, abbuono: null, perche: s.perche,
                   senzaChiave: !chiaveTitolo(r) });
    });

    var conta = function (k) { return righe.filter(function (x) { return x.stato.chiave === k; }); };
    var somma = function (l, quale) {
      return cent(l.reduce(function (t, x) {
        var r = quale === 'foglio' ? x.foglio : x.nostro;
        if (!r) return t;
        return t + cent(r.importo != null ? r.importo : r.importo_lordo);
      }, 0));
    };

    var ok = conta('OK'), app = conta('APPUNTO'), sco = conta('SCOSTA'), fc = conta('FC');
    var abbPassivo = cent(sco.filter(function (x) { return x.abbuono.verso === 'passivo'; })
      .reduce(function (t, x) { return t + x.abbuono.importo; }, 0));
    var abbAttivo = cent(sco.filter(function (x) { return x.abbuono.verso === 'attivo'; })
      .reduce(function (t, x) { return t + x.abbuono.importo; }, 0));

    var avvisi = [];
    /* Il manuale mette questa frase in cima al modello operativo, e la prova
       che conta è che la schermata la sappia dire. */
    if (sco.length || fc.length) {
      avvisi.push({ g: 'grave', t: 'Ci sono ' + (sco.length + fc.length) + ' righe da sanare prima della chiusura: '
        + (sco.length ? sco.length + ' con importo diverso da quello della compagnia' : '')
        + (sco.length && fc.length ? ' e ' : '')
        + (fc.length ? fc.length + ' presenti solo sul foglio cassa' : '') + '.' });
    }
    if (app.length) {
      avvisi.push({ g: 'avviso', t: app.length + ' incassi non risultano ancora sul foglio cassa della compagnia per '
        + somma(app).toFixed(2).replace('.', ',') + ' €: al mattino è normale, a fine giornata no.' });
    }
    if (doppioni.length) {
      avvisi.push({ g: 'grave', t: doppioni.length + ' polizze hanno più di una riga con la stessa data di effetto: '
        + 'l\'abbinamento ha scelto quella con l\'importo più vicino, ma va guardato a mano — '
        + 'un incasso contato due volte e uno sparito danno lo stesso totale.' });
    }
    var senzaNumero = righe.filter(function (x) { return x.senzaChiave; });
    if (senzaNumero.length) {
      avvisi.push({ g: 'grave', t: senzaNumero.length + ' righe non portano il numero di polizza: '
        + 'non si possono abbinare, e restano fuori dal controllo invece di risultare a posto.' });
    }

    return {
      righe: righe,
      ok: ok.length, appunti: app.length, scostamenti: sco.length, soloFoglio: fc.length,
      tutteOk: !sco.length && !fc.length && !app.length && !senzaNumero.length,
      daSanare: sco.length + fc.length,
      totaleNostro: somma(righe, 'nostro'),
      totaleFoglio: somma(righe, 'foglio'),
      /* La differenza fra i due totali è il numero che il manuale fa
         confrontare con la colonna premi del report giornaliero della
         compagnia. Se è zero e non ci sono righe da sanare, la giornata torna. */
      differenza: cent(somma(righe, 'foglio') - somma(righe, 'nostro')),
      abbuoni: { passivo: abbPassivo, attivo: abbAttivo, quanti: sco.length },
      doppioni: doppioni,
      avvisi: avvisi,
    };
  }

  /* ── I SOSPESI INCASSATI ─────────────────────────────────────────────────
     Il blocco in fondo al foglio. Righe: di chi era il sospeso, con che mezzo
     è stato saldato, quanto. Non si somma agli incassi (R2). */
  function sospesiIncassati(righe, quando, conti) {
    var g = giorno(quando);
    var lista = (righe || []).filter(function (r) {
      return !g || giorno(r.data || r.data_incasso || r.accreditato_il) === g;
    }).map(function (r) {
      return {
        data: giorno(r.data || r.data_incasso || r.accreditato_il),
        descrizione: r.descrizione || r.controparte || '',
        tipo: r.tipo || r.tipo_sospeso || r.collaboratore || '',
        mezzo: classificaMezzo(r.mezzo || r.mezzo_pagamento, conti),
        importo: cent(r.importo),
      };
    });
    var per = {};
    lista.forEach(function (r) {
      var k = r.mezzo.chiave || 'non_detto';
      if (!per[k]) per[k] = { chiave: k, etichetta: r.mezzo.etichetta, quante: 0, totale: 0 };
      per[k].quante++;
      per[k].totale = cent(per[k].totale + r.importo);
    });
    return {
      quante: lista.length,
      totale: cent(lista.reduce(function (t, r) { return t + r.importo; }, 0)),
      righe: lista,
      perMezzo: Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.totale - a.totale; }),
    };
  }

  /* ── LE SPESE ────────────────────────────────────────────────────────────
     Una spesa senza il mezzo con cui è stata pagata non serve a chiudere la
     cassa: se oggi sono entrati 100 € in contanti e ne sono usciti 30, in
     cassa ce ne sono 70 — ma solo se si sa che quei 30 sono usciti DAL
     CONTANTE e non dal POS. Per questo la spesa senza mezzo non viene tolta
     da nessuna colonna: esce a parte e si dichiara. Toglierla dal contante
     «perché di solito è così» farebbe quadrare un cassetto che non quadra. */
  function speseDelGiorno(righe, quando, conti) {
    var g = giorno(quando);
    var lista = (righe || []).filter(function (r) {
      return !g || giorno(r.data) === g;
    }).map(function (r) {
      return {
        data: giorno(r.data),
        descrizione: String(r.descrizione || r.causale || '').trim() || 'Spesa',
        mezzo: classificaMezzo(r.mezzo || r.mezzo_pagamento, conti),
        /* Una spesa è un'uscita: il segno lo mette il motore, così chi scrive
           il numero non deve ricordarsi se va col meno. */
        importo: Math.abs(cent(r.importo)),
      };
    });
    var per = {};
    lista.forEach(function (r) {
      if (!r.mezzo.noto) return;
      var k = r.mezzo.chiave;
      if (!per[k]) per[k] = { chiave: k, etichetta: r.mezzo.etichetta, quante: 0, totale: 0 };
      per[k].quante++;
      per[k].totale = cent(per[k].totale + r.importo);
    });
    var senza = lista.filter(function (r) { return !r.mezzo.noto; });
    return {
      quante: lista.length,
      totale: cent(lista.reduce(function (t, r) { return t + r.importo; }, 0)),
      righe: lista,
      perMezzo: Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return b.totale - a.totale; }),
      senzaMezzo: { quante: senza.length, totale: cent(senza.reduce(function (t, r) { return t + r.importo; }, 0)), righe: senza },
    };
  }

  /* ── LA CASSA DEL GIORNO ─────────────────────────────────────────────────
     Il conto che chiude la giornata, e l'unico punto in cui i due blocchi si
     incontrano. Si somma — non si riconta: gli incassi al netto delle sospese
     (soldi entrati oggi per polizze di oggi) più i sospesi saldati oggi
     (soldi entrati oggi per polizze di prima). */
  function cassaDelGiorno(app, sos, spe) {
    var a = app || { netto: 0, totale: 0, daPerfezionare: { totale: 0 }, perMezzo: [] };
    var s = sos || { totale: 0, perMezzo: [] };
    var u = spe || { totale: 0, perMezzo: [], senzaMezzo: { quante: 0, totale: 0 } };
    var per = {};
    var tocca = function (r) {
      if (!per[r.chiave]) per[r.chiave] = { chiave: r.chiave, etichetta: r.etichetta, entrato: 0, uscito: 0, quante: 0, saldo: 0 };
      return per[r.chiave];
    };
    (a.perMezzo || []).concat(s.perMezzo || []).forEach(function (r) {
      var c = tocca(r); c.quante += r.quante; c.entrato = cent(c.entrato + r.totale);
    });
    (u.perMezzo || []).forEach(function (r) {
      var c = tocca(r); c.uscito = cent(c.uscito + r.totale);
    });
    var colonne = Object.keys(per).map(function (k) {
      per[k].saldo = cent(per[k].entrato - per[k].uscito);
      return per[k];
    }).sort(function (x, y) { return y.saldo - x.saldo; });

    var avvisi = [];
    if (u.senzaMezzo && u.senzaMezzo.quante) {
      avvisi.push({ g: 'grave', t: u.senzaMezzo.quante + ' spese per ' +
        u.senzaMezzo.totale.toFixed(2).replace('.', ',') + ' € non dicono con che mezzo sono state pagate: ' +
        'restano fuori dalle colonne, perché toglierle dal contante senza saperlo farebbe quadrare un cassetto che non quadra.' });
    }

    return {
      incassi: a.totale,
      daPerfezionare: a.daPerfezionare.totale,
      incassiNetti: a.netto,
      sospesiIncassati: s.totale,
      entrato: cent(a.netto + s.totale),
      spese: u.totale,
      speseAttribuite: cent((u.perMezzo || []).reduce(function (t, r) { return t + r.totale; }, 0)),
      speseSenzaMezzo: u.senzaMezzo ? u.senzaMezzo.totale : 0,
      /* Quello che resta davvero nel cassetto. Le spese senza mezzo NON sono
         tolte dalle colonne ma SONO tolte dal totale: il totale è un fatto
         (sono usciti quei soldi), la colonna sarebbe un'attribuzione. */
      resta: cent(a.netto + s.totale - u.totale),
      perMezzo: colonne,
      avvisi: avvisi,
    };
  }

  var API = {
    MEZZI: MEZZI, num: num, cent: cent, giorno: giorno, chiave: chiave, idSospeso: idSospeso,
    sospesiScaricati: sospesiScaricati, incassiPerMezzo: incassiPerMezzo, foglio: foglio,
    nomeConto: nomeConto, classificaMezzo: classificaMezzo,
    appunti: appunti, sospesiIncassati: sospesiIncassati,
    /* Lo stato dell'appunto, dal manuale di contabilità di AssiEasy (cap. 2A) */
    STATI_APPUNTO: STATI_APPUNTO, chiaveTitolo: chiaveTitolo,
    abbuonoPer: abbuonoPer, statoAppunto: statoAppunto, abbinaFoglio: abbinaFoglio,
    speseDelGiorno: speseDelGiorno, cassaDelGiorno: cassaDelGiorno,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.ContabilitaGiornaliera = API;
})();
