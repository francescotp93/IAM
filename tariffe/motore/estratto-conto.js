/* ═══════════════════════════════════════════════════════════════════════════════
   L'ESTRATTO CONTO DEL COLLABORATORE (18/09/2026)

   Due conti diversi che si fanno sullo stesso mucchio di rate, e che NON vanno
   confusi, perché rispondono a due domande opposte:

     · DA VERSARE  — le rate a suo carico che NON risultano incassate.
                     È quello che deve ancora incassare dal cliente o portare
                     in agenzia. Serve a telefonargli.
     · PROVVIGIONI — le rate incassate nel periodo, e quanto gli spetta.
                     Serve a pagarlo.

   Una rata sta in uno dei due, mai in tutti e due: è incassata o non lo è.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LE QUATTRO DECISIONI, prese da Francesco il 18/09/2026.                   │
   │ Sono scritte qui perché chi legge il codice fra sei mesi deve sapere che  │
   │ non sono state indovinate.                                                │
   └───────────────────────────────────────────────────────────────────────────┘

   1. **La provvigione matura SULL'INCASSATO.** Una rata emessa e non pagata
      non ha ancora prodotto niente per nessuno. È la prassi d'agenzia, ed è
      anche la cosa che tiene insieme i due conti: quello che sta nei sospesi
      NON sta nelle provvigioni, per costruzione. Pagare sull'emesso vorrebbe
      dire anticipare al collaboratore soldi che il cliente non ha versato, e
      poi rincorrerli.

   2. **La percentuale si applica alla PROVVIGIONE DI COMPAGNIA**, non al
      premio. Il 60% dei 41,21 € che la compagnia riconosce, non il 60% dei
      390 € pagati dal cliente. È anche l'unico calcolo che i dati permettono
      senza chiedere niente a nessuno: la provvigione di ogni rata la porta il
      flusso (`quote_titoli.provvigione`).

   3. **Il «guadagno indiretto» è il MARGINE DELL'AGENZIA**: provvigione di
      compagnia meno la quota del collaboratore. È una sottrazione, non una
      gerarchia. L'override su «chi ha portato chi» non esiste in questo
      sistema e non si finge che esista.

   4. **La percentuale sta su `iam_team.provv`**, un elenco
      `{prodotto, perc, speciale, note}`: una percentuale PER PRODOTTO, che
      esisteva già prima di questo lavoro. Non se n'è inventata un'altra.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA REGOLA CHE COMANDA SU TUTTE: QUELLO CHE NON SI SA NON SI STIMA.        │
   │                                                                           │
   │ Se la compagnia non ha dichiarato la provvigione di una rata, o se per    │
   │ quel prodotto non c'è una percentuale concordata, la riga NON entra nei   │
   │ totali: esce con il motivo scritto accanto. Un estratto conto che arriva  │
   │ a un collaboratore è un documento su cui si litiga, e una riga stimata    │
   │ dentro un totale è una lite che si perde.                                 │
   │                                                                           │
   │ Non esiste una «percentuale di default». Se non è concordata, non c'è.    │
   └───────────────────────────────────────────────────────────────────────────┘

   Motore puro: niente rete, niente database, niente `window`. Riceve righe,
   restituisce righe e totali. Il foglio che esce di casa si costruisce qui
   (§5 di CLAUDE.md: l'unica cosa che esce di casa va provata).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'estratto-conto-2026-09-18';

  /* Arrotondamento al centesimo, per eccesso sul mezzo centesimo e SIMMETRICO
     sui negativi: `Math.round(-0.5)` in JavaScript fa `-0`, cioè arrotonda
     verso l'alto anche i numeri negativi, e su uno storno produrrebbe un
     centesimo di differenza nel verso sbagliato. Gli storni ci sono. */
  function cent(n) {
    if (n == null || !isFinite(n)) return null;
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  function testo(v) {
    var s = String(v == null ? '' : v).trim();
    return s === '' ? null : s;
  }

  /* `testo` restituisce `null` sul vuoto: serve alle righe, dove «vuoto» e
     «assente» sono la stessa cosa. Nei TESTI no — un `null` concatenato
     diventa la parola «null» dentro un documento che esce di casa. */
  function str(v) { return testo(v) || ''; }

  /* Confronto fra il nome del prodotto sulla polizza e quello scritto nella
     scheda del collaboratore. Si normalizzano spazi e maiuscole e basta:
     NON si fa corrispondenza parziale («RC Auto» che prende «RC Auto Storico»
     sarebbe una percentuale applicata a un prodotto diverso, e nessuno se ne
     accorgerebbe guardando il totale). */
  function chiave(v) {
    return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* ══ LA PERCENTUALE ═══════════════════════════════════════════════════════
     `schema` è l'elenco `iam_team.provv`: [{prodotto, perc, speciale, note}].
     Torna la riga che si applica, oppure null — e null vuol dire «non
     concordata», non «zero». Sono due cose diverse: zero è un accordo, null è
     una cosa da decidere. */
  function percentualeDi(schema, prodotto) {
    var k = chiave(prodotto);
    if (!k) return null;
    var righe = (schema || []).filter(function (r) { return chiave(r.prodotto) === k; });
    if (!righe.length) return null;
    /* Due righe per lo stesso prodotto sono un errore di compilazione della
       scheda, non un caso da risolvere a caso: vince quella SPECIALE se c'è
       (è per definizione l'eccezione voluta), e comunque la cosa si dichiara. */
    var speciale = righe.filter(function (r) { return !!r.speciale; });
    var scelta = speciale.length ? speciale[0] : righe[0];
    var perc = Number(scelta.perc);
    if (!isFinite(perc)) return null;
    return {
      perc: perc,
      speciale: !!scelta.speciale,
      note: testo(scelta.note),
      ambigua: righe.length > 1
    };
  }

  /* ══ UNA RIGA PROVVIGIONALE ═══════════════════════════════════════════════
     `t` è il titolo, `p` la sua polizza (può mancare), `schema` l'elenco delle
     percentuali del collaboratore. */
  function rigaProvvigionale(t, p, schema) {
    var pol = p || {};
    var base = t.provvigione == null ? null : Number(t.provvigione);
    var prodotto = testo(pol.prodotto) || testo(pol.modulo);
    var acc = percentualeDi(schema, prodotto);

    var daConfermare = [];
    if (base == null || !isFinite(base)) {
      daConfermare.push('la compagnia non ha dichiarato la provvigione di questa rata');
    }
    if (!acc) {
      daConfermare.push(prodotto
        ? 'nessuna percentuale concordata per «' + prodotto + '»'
        : 'la polizza non dice quale prodotto è: senza prodotto non c\'è percentuale');
    } else if (acc.ambigua) {
      daConfermare.push('nella scheda ci sono più percentuali per «' + prodotto + '»: si è presa quella speciale');
    }

    /* Il margine si ricava per DIFFERENZA, non con una seconda percentuale:
       così le due colonne sommano esattamente alla provvigione di compagnia.
       Calcolarlo come `base × (100 − perc)` produce uno scarto di un centesimo
       che poi nessuno sa spiegare, e in un documento che si manda fuori uno
       scarto inspiegabile vale quanto un errore. */
    var quota = null, margine = null;
    if (base != null && isFinite(base) && acc) {
      quota = cent(base * acc.perc / 100);
      margine = cent(base - quota);
    }

    return {
      titolo_id: t.id || null,
      polizza_id: t.polizza_id || null,
      numero_polizza: testo(pol.numero_polizza),
      cliente: testo(pol.cliente),
      compagnia: testo(pol.compagnia),
      prodotto: prodotto,
      tipo: testo(t.tipo),
      data: t.incassato_il || null,
      /* Il premio pagato dal cliente viaggia fino al foglio: il collaboratore
         deve poter riconoscere la polizza di cui si sta parlando, e il numero
         che ricorda è quello che il cliente gli ha dato. */
      premio: t.importo_lordo == null ? null : Number(t.importo_lordo),
      provvigione_compagnia: base != null && isFinite(base) ? base : null,
      percentuale: acc ? acc.perc : null,
      speciale: acc ? acc.speciale : false,
      nota_accordo: acc ? acc.note : null,
      quota_collaboratore: quota,
      margine_agenzia: margine,
      daConfermare: daConfermare
    };
  }

  /* Il periodo: estremi COMPRESI, e su una data in forma `YYYY-MM-DD` il
     confronto fra stringhe è già l'ordine giusto. Un estremo vuoto vuol dire
     «senza limite da quella parte». */
  function dentro(data, dal, al) {
    if (!data) return false;
    var d = String(data).slice(0, 10);
    if (dal && d < String(dal).slice(0, 10)) return false;
    if (al && d > String(al).slice(0, 10)) return false;
    return true;
  }

  /* ══ L'ESTRATTO CONTO PROVVIGIONALE ═══════════════════════════════════════
     `opz`: { titoli, polizze, schema, dal, al, collaboratore_id }

     `polizze` è una mappa id → polizza. `schema` è `iam_team.provv`.
     Se `collaboratore_id` c'è, si tengono solo le rate assegnate a lui: senza,
     l'estratto conto di un collaboratore conterrebbe le rate di tutti. */
  function provvigionale(opz) {
    var o = opz || {};
    var polizze = o.polizze || {};
    var righe = [];

    (o.titoli || []).forEach(function (t) {
      /* DECISIONE 1: matura sull'incassato. Lo stato da solo non basta —
         serve la data, perché è quella che dice in quale periodo cade. Uno
         stato «incassato» senza data è una rata che non si sa quando è
         entrata, e in un estratto conto a periodo non si può collocare. */
      if (t.stato !== 'incassato' || !t.incassato_il) return;
      if (o.collaboratore_id && t.collaboratore_id !== o.collaboratore_id) return;
      if (!dentro(t.incassato_il, o.dal, o.al)) return;
      righe.push(rigaProvvigionale(t, polizze[t.polizza_id], o.schema));
    });

    righe.sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });

    var buone = righe.filter(function (r) { return !r.daConfermare.length; });
    var totali = {
      righe: righe.length,
      conteggiate: buone.length,
      premi: cent(buone.reduce(function (s, r) { return s + (r.premio || 0); }, 0)),
      provvigione_compagnia: cent(buone.reduce(function (s, r) { return s + (r.provvigione_compagnia || 0); }, 0)),
      quota_collaboratore: cent(buone.reduce(function (s, r) { return s + (r.quota_collaboratore || 0); }, 0)),
      margine_agenzia: cent(buone.reduce(function (s, r) { return s + (r.margine_agenzia || 0); }, 0))
    };
    return { righe: righe, totali: totali, daConfermare: righe.filter(function (r) { return r.daConfermare.length; }) };
  }

  /* ══ QUELLO CHE RESTA DA INCASSARE (i «sospesi») ══════════════════════════
     Le rate a carico del collaboratore che NON risultano incassate. La data di
     riferimento è la scadenza, e in mancanza la decorrenza: è la data entro
     cui quei soldi dovevano esserci. */
  function dataRiferimento(t) {
    return t.data_scadenza || t.data_decorrenza || null;
  }

  function daVersare(opz) {
    var o = opz || {};
    var polizze = o.polizze || {};
    var oggi = o.oggi || new Date().toISOString().slice(0, 10);
    var righe = [];

    (o.titoli || []).forEach(function (t) {
      /* Incassata vuol dire che i soldi sono arrivati: non è più un sospeso.
         Anche «stornato» esce: una rata stornata non la deve più nessuno. */
      if (t.stato === 'incassato' || t.stato === 'stornato') return;
      if (o.collaboratore_id && t.collaboratore_id !== o.collaboratore_id) return;
      var rif = dataRiferimento(t);
      if (!dentro(rif, o.dal, o.al)) return;
      var pol = polizze[t.polizza_id] || {};
      righe.push({
        titolo_id: t.id || null,
        polizza_id: t.polizza_id || null,
        numero_polizza: testo(pol.numero_polizza),
        cliente: testo(pol.cliente),
        compagnia: testo(pol.compagnia),
        prodotto: testo(pol.prodotto) || testo(pol.modulo),
        tipo: testo(t.tipo),
        data: rif,
        scaduta: !!(rif && String(rif).slice(0, 10) < oggi),
        giorni: rif ? Math.round((new Date(oggi) - new Date(String(rif).slice(0, 10))) / 86400000) : null,
        importo: t.importo_lordo == null ? null : Number(t.importo_lordo),
        mezzo_pagamento: testo(t.mezzo_pagamento),
        stato: testo(t.stato)
      });
    });

    righe.sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });

    return {
      righe: righe,
      totali: {
        righe: righe.length,
        importo: cent(righe.reduce(function (s, r) { return s + (r.importo || 0); }, 0)),
        scadute: righe.filter(function (r) { return r.scaduta; }).length,
        importo_scaduto: cent(righe.filter(function (r) { return r.scaduta; })
          .reduce(function (s, r) { return s + (r.importo || 0); }, 0))
      }
    };
  }

  /* ══ IL CREDITO DELL'AGENZIA VERSO IL COLLABORATORE (M4.2, 19/09/2026) ════
     Le rate che il collaboratore ha INCASSATO LUI, per conto dell'agenzia
     (`pagatore_tipo = 'collaboratore'`): quei soldi il cliente li ha pagati,
     ma all'agenzia non sono ancora arrivati. È un terzo conto, e non va
     confuso con gli altri due: non è un sospeso (la rata È incassata) e non è
     una provvigione (è premio, non compenso). Si chiude con `rimesso_il`.

     `opz`: { titoli, polizze, collaboratore_id, dal, al, oggi, ancheRimesse }
     Senza `ancheRimesse` escono solo i crediti aperti; con il periodo si
     guarda la data dell'incasso. */
  function creditoAgenzia(opz) {
    var o = opz || {};
    var polizze = o.polizze || {};
    var righe = [];
    (o.titoli || []).forEach(function (t) {
      if (t.pagatore_tipo !== 'collaboratore' || !t.pagatore_collaboratore_id) return;
      if (t.stato !== 'incassato') return;
      if (o.collaboratore_id && t.pagatore_collaboratore_id !== o.collaboratore_id) return;
      if (t.rimesso_il && !o.ancheRimesse) return;
      if ((o.dal || o.al) && !dentro(t.incassato_il, o.dal, o.al)) return;
      var pol = polizze[t.polizza_id] || {};
      righe.push({
        titolo_id: t.id || null,
        polizza_id: t.polizza_id || null,
        collaboratore_id: t.pagatore_collaboratore_id,
        numero_polizza: testo(pol.numero_polizza),
        cliente: testo(pol.cliente),
        compagnia: testo(pol.compagnia),
        prodotto: testo(pol.prodotto) || testo(pol.modulo),
        incassato_il: t.incassato_il || null,
        mezzo_pagamento: testo(t.mezzo_pagamento),
        importo: t.importo_lordo == null ? null : Number(t.importo_lordo),
        rimesso_il: t.rimesso_il || null
      });
    });
    righe.sort(function (a, b) { return String(a.incassato_il).localeCompare(String(b.incassato_il)); });
    var aperte = righe.filter(function (r) { return !r.rimesso_il; });
    return {
      righe: righe,
      totali: {
        righe: righe.length,
        aperte: aperte.length,
        importo: cent(righe.reduce(function (s, r) { return s + (r.importo || 0); }, 0)),
        importo_aperto: cent(aperte.reduce(function (s, r) { return s + (r.importo || 0); }, 0))
      }
    };
  }

  /* ══ IL RIEPILOGO PER COLLABORATORE ═══════════════════════════════════════
     Quando si guarda l'agenzia intera invece di una persona sola. Le rate
     senza collaboratore NON si distribuiscono a caso e non spariscono: fanno
     una riga loro, «non assegnate», che è esattamente il lavoro da fare. */
  function perCollaboratore(titoli, polizze, nomi, opz) {
    var o = opz || {};
    var mappa = {};
    var chiaveDi = function (t) { return t.collaboratore_id || '(nessuno)'; };

    (titoli || []).forEach(function (t) {
      var k = chiaveDi(t);
      if (!mappa[k]) mappa[k] = { collaboratore_id: t.collaboratore_id || null, nome: (nomi || {})[k] || null, titoli: [] };
      mappa[k].titoli.push(t);
    });

    /* Il credito si conta su CHI HA PAGATO, non su chi ha prodotto: una rata
       assegnata a Tizio ma incassata da Caio è un credito verso Caio. Per
       questo si passa da tutti i titoli, non dal mucchio di ognuno. */
    var crediti = {};
    (titoli || []).forEach(function (t) {
      if (t.pagatore_tipo === 'collaboratore' && t.pagatore_collaboratore_id) {
        var kc = t.pagatore_collaboratore_id;
        if (!mappa[kc]) mappa[kc] = { collaboratore_id: kc, nome: (nomi || {})[kc] || null, titoli: [] };
        crediti[kc] = true;
      }
    });

    return Object.keys(mappa).map(function (k) {
      var g = mappa[k];
      var prov = provvigionale({ titoli: g.titoli, polizze: polizze, schema: (o.schemi || {})[k], dal: o.dal, al: o.al });
      var sosp = daVersare({ titoli: g.titoli, polizze: polizze, dal: o.dalSospesi, al: o.alSospesi, oggi: o.oggi });
      var cred = g.collaboratore_id ? creditoAgenzia({ titoli: titoli, polizze: polizze, collaboratore_id: g.collaboratore_id }).totali
                                    : { righe: 0, aperte: 0, importo: 0, importo_aperto: 0 };
      return {
        collaboratore_id: g.collaboratore_id,
        nome: g.nome,
        assegnato: !!g.collaboratore_id,
        provvigioni: prov.totali,
        daVersare: sosp.totali,
        credito: cred,
        daConfermare: prov.daConfermare.length
      };
    }).sort(function (a, b) {
      /* Le non assegnate in fondo: sono un lavoro da fare, non una persona. */
      if (a.assegnato !== b.assegnato) return a.assegnato ? -1 : 1;
      return (b.provvigioni.quota_collaboratore || 0) - (a.provvigioni.quota_collaboratore || 0);
    });
  }

  /* ══ IL DOCUMENTO CHE ESCE DI CASA (brief #02 · M6, 20/09/2026) ═══════════

     Fino a oggi il testo dell'email era scritto dentro `index.html`, a mano.
     Va tolto di lì per la stessa ragione per cui i testi previdenziali stanno
     nel motore (§5 di CLAUDE.md): **l'unica cosa che esce di casa è l'unica
     che va provata**, e una frase composta in una schermata non si può provare
     senza aprire un browser.

     Il CASO lo decide il risultato, non chi scrive (`casoInvio`): non esiste
     un modo di mandare per sbaglio un sollecito a chi non deve niente, né di
     scrivere «ti spettano X» quando X comprende righe che nessuno ha
     confermato.

     I MODELLI SONO DUE, e non sono «lungo» e «corto»:
       · `a` — disteso: spiega che cos'è il documento e che cosa fare;
       · `b` — asciutto: i numeri e la riga d'azione, per chi li riceve ogni
               mese e non ha bisogno che gli si spieghi di nuovo.
     Quello che NON cambia fra i due è l'avviso delle righe fuori dal totale:
     un modello «corto» che se lo mangia sarebbe il modo più comodo di
     nascondere una cosa scomoda, e c'è una prova che lo impedisce. */

  var MODELLI = ['a', 'b'];

  function casoInvio(vista) {
    if (!vista) return null;
    if (vista.tipo === 'provvigioni') {
      var t = vista.totali || {};
      if (!t.conteggiate && !(vista.daConfermare || []).length) return 'nessuna';
      return (vista.daConfermare || []).length ? 'parziale' : 'tutto';
    }
    var v = vista.totali || {};
    if (!v.righe) return 'nessuna';
    return v.scadute ? 'scadute' : 'in-corso';
  }

  /* Le COORDINATE su cui si versa non si calcolano qui: le dà
     `Contabilita.coordinateRimesse`, che possiede i conti e il controllo
     dell'IBAN (con la tabella delle lunghezze per paese). Qui arriva il
     RISULTATO — {ok, iban, intestatario, banca, motivo} — perché due
     controlli dello stesso IBAN sarebbero due regole, e quella che sbaglia
     sarebbe quella che nessuno guarda. Lo stesso mestiere di
     `EstrattoConto.rigaProvvigionale` cercata dal foglio cassa (§25). */

  /* Un documento che esce di casa non scrive «1 rate»: chi lo riceve legge un
     programma, non un'agenzia. */
  function plur(n, uno, molti) { return (n === 1 ? uno : molti); }

  function euro(n) {
    if (n == null || !isFinite(n)) return '—';
    return '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function giorno(d) {
    var s = str(d).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : s;
  }

  function periodoTesto(vista) {
    if (!vista.dal && !vista.al) return '';
    return 'dal ' + (giorno(vista.dal) || '…') + ' al ' + (giorno(vista.al) || '…');
  }

  /* `vista`  — quello che la schermata sta mostrando: {tipo, nome, dal, al,
                totali, daConfermare}
     `opz`    — {modello, coordinate, agenzia, firma} */
  function testiInvio(vista, opz) {
    var o = opz || {};
    var modello = MODELLI.indexOf(o.modello) >= 0 ? o.modello : 'a';
    var caso = casoInvio(vista);
    if (!caso) return null;

    var nome = str(vista.nome);
    var per = periodoTesto(vista);
    var t = vista.totali || {};
    var avvisi = [];
    var righe = [];
    var p = function (s) { righe.push('<p>' + s + '</p>'); };

    if (caso === 'nessuna') {
      /* Non si manda un sollecito a chi non deve niente, e non si manda un
         estratto conto provvigionale vuoto: sono due documenti che chi li
         riceve legge come un errore, e a ragione. */
      return {
        caso: caso, modello: modello, bloccante: true,
        avvisi: [vista.tipo === 'provvigioni'
          ? 'In questo periodo non c’è nessuna rata incassata a suo nome: un estratto conto vuoto non si manda.'
          : 'In questo periodo non ha nessuna rata da versare: un sollecito senza sospesi non si manda.'],
        oggetto: '', corpo: ''
      };
    }

    if (vista.tipo === 'provvigioni') {
      var oggetto = 'Estratto conto provvigionale' + (per ? ' — ' + per : '');
      p('Ciao ' + (nome || '') + ',');
      if (modello === 'a') {
        p('in allegato l’estratto conto provvigionale ' + (per || 'del periodo') +
          ': sono le rate incassate in questo periodo e la quota che ti spetta su ognuna.');
      }
      p('<b>' + t.conteggiate + '</b> ' + plur(t.conteggiate, 'rata incassata', 'rate incassate') +
        ' · provvigioni riconosciute dalla compagnia <b>' +
        euro(t.provvigione_compagnia) + '</b> · <b>a te spettano ' + euro(t.quota_collaboratore) + '</b>.');
      if (caso === 'parziale') {
        /* Questo avviso c'è in TUTTI E DUE i modelli: è la parte scomoda, ed è
           esattamente quella che un modello «corto» sarebbe tentato di
           togliere. Una prova lo impedisce. */
        var q = (vista.daConfermare || []).length;
        p('<b>' + q + '</b> ' + plur(q, 'rata non è', 'rate non sono') + ' in questo totale: manca la provvigione ' +
          'dichiarata dalla compagnia oppure la percentuale concordata. Non ' +
          plur(q, 'l’abbiamo stimata', 'le abbiamo stimate') + ' — ' + plur(q, 'la vediamo', 'le vediamo') +
          ' insieme e poi ' + plur(q, 'rientra', 'rientrano') + '.');
        avvisi.push(q + ' rate restano fuori dal totale, e il testo lo dice.');
      }
      if (modello === 'a') {
        p('Se qualcosa non torna, scrivimi prima di fatturare: correggerlo adesso costa meno.');
      }
      /* Nessuna data di pagamento: nessuno l'ha decisa, e una data promessa in
         un testo automatico è una promessa che l'agenzia non sa di aver
         fatto. */
      if (o.firma) p(str(o.firma));
      return { caso: caso, modello: modello, bloccante: false, avvisi: avvisi,
               oggetto: oggetto, corpo: righe.join('\n') };
    }

    // ── Da versare ──────────────────────────────────────────────────────────
    var ogg = 'Rate da versare' + (per ? ' — ' + per : '');
    p('Ciao ' + (nome || '') + ',');
    if (modello === 'a') {
      p('in allegato l’elenco delle rate a tuo carico che non risultano ancora incassate' + (per ? ' ' + per : '') + '.');
    }
    p('<b>' + t.righe + '</b> ' + plur(t.righe, 'rata', 'rate') + ' per <b>' + euro(t.importo) + '</b>' +
      (t.scadute ? ', di cui <b>' + t.scadute + '</b> già ' + plur(t.scadute, 'scaduta', 'scadute') +
                   ' per <b>' + euro(t.importo_scaduto) + '</b>' : '') + '.');

    var co = o.coordinate;
    if (co && co.ok) {
      p('Il versamento va su <b>' + co.iban + '</b>' +
        (co.intestatario ? ', intestato a ' + co.intestatario : '') +
        (co.banca ? ' (' + co.banca + ')' : '') + '.');
    } else {
      /* Un documento che chiede dei soldi senza dire dove versarli fa tornare
         indietro una telefonata. Non si inventa un IBAN: si dice a chi sta
         mandando che manca, PRIMA che parta. */
      avvisi.push((co && co.motivo) || 'Non ci sono coordinate da scrivere sul documento.');
      p('Le coordinate per il versamento te le confermo a parte.');
    }
    if (modello === 'a') {
      p('Se una di queste rate l’hai già incassata o versata, dimmelo: la sistemo io, non rifare il bonifico.');
    }
    if (o.firma) p(str(o.firma));
    return { caso: caso, modello: modello, bloccante: false, avvisi: avvisi,
             oggetto: ogg, corpo: righe.join('\n') };
  }

  var API = {
    VERSIONE: VERSIONE,
    cent: cent, percentualeDi: percentualeDi, rigaProvvigionale: rigaProvvigionale,
    dentro: dentro, provvigionale: provvigionale, daVersare: daVersare,
    perCollaboratore: perCollaboratore, creditoAgenzia: creditoAgenzia,
    /* M6 */
    MODELLI: MODELLI, casoInvio: casoInvio, testiInvio: testiInvio, plur: plur,
    euro: euro
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.EstrattoConto = API;
})();
