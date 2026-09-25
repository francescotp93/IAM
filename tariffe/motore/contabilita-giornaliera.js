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
    speseDelGiorno: speseDelGiorno, cassaDelGiorno: cassaDelGiorno,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.ContabilitaGiornaliera = API;
})();
