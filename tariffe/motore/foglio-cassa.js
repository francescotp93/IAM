/* ═══════════════════════════════════════════════════════════════════════════════
   IL FOGLIO CASSA — tariffe/motore/foglio-cassa.js  (19/09/2026, brief M5)

   La produzione giorno per giorno: che cosa è ENTRATO, da chi, come, e che
   cosa ne resta all'agenzia. Non è un terzo archivio: sono le rate incassate
   (`quote_titoli`, stato «incassato» con la data), quelle arrivate dal flusso
   della compagnia e quelle segnate a mano nella pagina Titoli, lette con le
   stesse regole dell'estratto conto (§17). Due motori che calcolassero la
   quota del collaboratore in due modi darebbero al collaboratore un numero e
   all'agenzia un altro, e quello sbagliato sarebbe quello che nessuno guarda.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ DIRETTE E INDIRETTE, detto una volta per tutte.                            │
   │  · DIRETTA   = provvigione di compagnia su una rata SENZA collaboratore:   │
   │                produzione dell'agenzia, resta tutta a lei.                 │
   │  · INDIRETTA = provvigione di compagnia su una rata CON collaboratore:     │
   │                di quella una parte è la sua quota (dallo schema di         │
   │                `iam_team.provv`), il resto è il margine dell'agenzia.      │
   │ La percentuale si applica alla provvigione di compagnia, non al premio;   │
   │ quello che non si sa non si stima (§17): una rata senza provvigione       │
   │ dichiarata o senza percentuale concordata esce dai totali col motivo.     │
   └───────────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'foglio-cassa-2026-09-19';

  /* L'estratto conto è la regola delle provvigioni: si cerca a ogni chiamata
     (nel browser i due file possono arrivare in un ordine qualunque). */
  function motoreEstratto() {
    if (typeof window !== 'undefined' && window.EstrattoConto) return window.EstrattoConto;
    if (typeof require === 'function') { try { return require('./estratto-conto.js'); } catch (e) { return null; } }
    return null;
  }

  function cent(n) { var s = n < 0 ? -1 : 1; return s * Math.round(Math.abs(Number(n) || 0) * 100) / 100; }
  function testo(v) { var s = String(v == null ? '' : v).trim(); return s === '' ? null : s; }
  function giorno(v) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v == null ? '' : v)); return m ? m[1] : null; }

  var MEZZI = {
    contante: 'Contante', assegno: 'Assegno', bonifico: 'Bonifico', pos: 'POS', carta_credito: 'Carta di credito',
    paypal: 'PayPal', prepagata: 'Carta prepagata', domiciliazione: 'Domiciliazione (SDD)', altro: 'Altro'
  };
  var PAGATORI = { cliente: 'Cliente', collaboratore: 'Collaboratore', agenzia: 'Agenzia' };

  /* ══ I MOVIMENTI ═══════════════════════════════════════════════════════════
     `opz`: { titoli, polizze (mappa id → polizza), schemi (collab_id → provv),
              nomi (collab_id → nome), dal, al, compagnia, mezzo, collaboratore_id }
     Ogni riga è una rata incassata. Il filtro per collaboratore vale su chi
     ha PRODOTTO la rata (collaboratore_id): è la produzione, non l'incasso. */
  function movimenti(opz) {
    var o = opz || {};
    var E = motoreEstratto();
    var polizze = o.polizze || {};
    var schemi = o.schemi || {};
    var nomi = o.nomi || {};
    var righe = [];

    /* SU QUALE DATA SI GUARDA (21/09/2026, richiesta di Francesco: «ho
       inserito una polizza e non mi risulta nel foglio cassa; deve far testo
       la data emissione, e per la parte dell'incasso può avere anche una data
       diversa»).

       Sono due domande diverse e non vanno confuse:
         'incasso'   — che cosa è ENTRATO in un periodo. È la lettura storica,
                       quella che serve a quadrare la cassa.
         'emissione' — che cosa si è PRODOTTO in un periodo. Qui entrano anche
                       le rate non ancora incassate, perché una polizza emessa
                       oggi è lavoro di oggi anche se il cliente paga domani.

       Le due date restano tutte e due su ogni riga: una polizza emessa il 21
       e incassata il 30 appartiene a due periodi diversi per due domande
       diverse, e nasconderne una obbligherebbe a tenere il conto a mente.

         'effetto'   — da quando la polizza COPRE. Aggiunta il 24/09/2026,
                     dopo che il portafoglio di HDI e' entrato in archivio e
                     non si vedeva da nessuna parte: il tracciato PASS-133
                     non manda la data di emissione, e quelle diciotto
                     polizze sarebbero rimaste invisibili per sempre sull'unico
                     asse che le avrebbe mostrate tutte.

                     NON E' la data di emissione travestita. La regola qui
                     sopra resta intera: guardando per emissione, una polizza
                     senza quella data resta fuori e non la si indovina
                     dall'effetto. Qui e' chi guarda a dire «mostrami per
                     decorrenza», e sa che cosa sta chiedendo. */
    var su = (o.su === 'emissione' || o.su === 'effetto') ? o.su : 'incasso';
    /* Quante righe restano fuori SOLO perche' manca la data su cui si sta
       guardando. Senza questo numero la schermata mostra una tabella vuota e
       lascia credere che non sia entrato niente — che e' esattamente quello
       che e' successo il 24/09 dopo un'importazione riuscita. */
    var fuoriPerLaData = 0;

    (o.titoli || []).forEach(function (t) {
      if (!t) return;
      var pol = polizze[t.polizza_id] || {};
      var incassata = t.stato === 'incassato' && !!t.incassato_il;
      var dIncasso = incassata ? giorno(t.incassato_il) : null;
      var dEmissione = giorno(pol.data_emissione);
      var dEffetto = giorno(pol.data_effetto);
      /* Guardando per incasso, una rata non incassata non c'è: non è un
         incasso. Guardando per emissione, una polizza senza data di emissione
         non si mette in un periodo indovinandolo dall'effetto — si emette
         prima che decorra, e una data indovinata conta la riga nel mese
         sbagliato (§21). Resta fuori, e la schermata dice quante sono. */
      var data = su === 'emissione' ? dEmissione : (su === 'effetto' ? dEffetto : dIncasso);
      if (!data) {
        /* Si conta solo quello che sarebbe entrato per davvero: una riga di
           un'altra compagnia, o di un altro collaboratore, non e' «esclusa
           perche' manca la data» — e' esclusa dai filtri. */
        if ((!o.compagnia || testo(pol.compagnia) === o.compagnia) &&
            (!o.mezzo || testo(t.mezzo_pagamento) === o.mezzo) &&
            (!o.collaboratore_id || t.collaboratore_id === o.collaboratore_id)) {
          fuoriPerLaData++;
        }
        return;
      }
      if (o.dal && data < String(o.dal).slice(0, 10)) return;
      if (o.al && data > String(o.al).slice(0, 10)) return;
      if (o.compagnia && testo(pol.compagnia) !== o.compagnia) return;
      if (o.mezzo && testo(t.mezzo_pagamento) !== o.mezzo) return;
      if (o.collaboratore_id && t.collaboratore_id !== o.collaboratore_id) return;

      var conCollab = !!t.collaboratore_id;
      /* La regola dell'estratto conto si applica solo dove c'è un collaboratore:
         su una rata diretta non c'è nessuna percentuale da concordare, e
         chiederla direbbe «da confermare» a una provvigione che è tutta
         dell'agenzia. */
      var prov = (conCollab && E) ? E.rigaProvvigionale(t, pol, schemi[t.collaboratore_id]) : null;
      var provvCompagnia = t.provvigione == null ? null : Number(t.provvigione);
      righe.push({
        titolo_id: t.id || null,
        polizza_id: t.polizza_id || null,
        /* `data` e' quella su cui si sta guardando — serve all'ordinamento e
           ai raggruppamenti. Le due vere restano accanto, sempre tutte e due:
           chi legge una riga deve poter vedere quando e' stata emessa E
           quando e' stata incassata senza cambiare schermata. */
        data: data,
        data_emissione: dEmissione,
        data_incasso: dIncasso,
        incassata: incassata,
        cliente: testo(pol.cliente),
        cliente_id: pol.cliente_id || null,
        numero_polizza: testo(pol.numero_polizza),
        compagnia: testo(pol.compagnia),
        prodotto: testo(pol.prodotto) || testo(pol.modulo),
        tipo: testo(t.tipo),
        mezzo: testo(t.mezzo_pagamento),
        mezzo_nome: MEZZI[t.mezzo_pagamento] || testo(t.mezzo_pagamento) || null,
        pagatore_tipo: testo(t.pagatore_tipo) || 'cliente',
        pagatore: testo(t.pagatore),
        importo: t.importo_lordo == null ? null : Number(t.importo_lordo),
        provvigione: provvCompagnia,
        collaboratore_id: t.collaboratore_id || null,
        collaboratore: conCollab ? (nomi[t.collaboratore_id] || null) : null,
        /* La quota e il margine vengono dall'estratto conto: stessa regola. */
        quota_collaboratore: conCollab && prov ? prov.quota_collaboratore : null,
        margine_agenzia: conCollab && prov ? prov.margine_agenzia : (provvCompagnia == null ? null : provvCompagnia),
        percentuale: conCollab && prov ? prov.percentuale : null,
        daConfermare: prov ? prov.daConfermare : (provvCompagnia == null ? ['la compagnia non ha dichiarato la provvigione'] : []),
        fonte: t.fonte === 'ssf' ? 'flusso' : 'manuale',
        note: testo(t.note)
      });
    });

    righe.sort(function (a, b) { return String(b.data).localeCompare(String(a.data)) || String(a.cliente || '').localeCompare(String(b.cliente || '')); });
    /* Attaccato all'elenco invece che restituito a parte: chi chiama `righe()`
       oggi continua a ricevere un array e non si accorge di niente, e chi
       vuole il numero lo trova li'. */
    righe.fuoriPerLaData = fuoriPerLaData;
    righe.su = su;
    return righe;
  }

  /* ══ I TOTALI DELLA BARRA ══════════════════════════════════════════════════
     DUE GRUPPI, E NON SI SOMMANO MAI FRA LORO. Guardando per emissione qui
     dentro arrivano anche le rate che il cliente non ha ancora pagato, e
     metterle nello stesso totale degli incassi direbbe che in cassa ci sono
     dei soldi che nessuno ha versato — un numero credibile e falso, e la
     quadratura lo troverebbe sbagliato senza saper dire da dove viene.

       · emesso    — tutte le righe del periodo. È la produzione.
       · incassato — solo quelle con una data di incasso. È la cassa.

     E le PROVVIGIONI si contano solo sull'incassato, perché è la decisione 1
     dell'estratto conto (§17): una rata emessa e non pagata non ha prodotto
     niente per nessuno. Contarle sull'emesso vorrebbe dire scrivere in un
     foglio cassa un compenso che matura fra un mese.

     Guardando per incasso ogni riga è incassata, quindi i due gruppi
     coincidono e i numeri restano quelli di sempre. */
  function totali(righe) {
    var incassate = righe.filter(function (r) { return r.incassata; });
    var aperte = righe.filter(function (r) { return !r.incassata; });
    var buone = incassate.filter(function (r) { return !r.daConfermare.length; });
    var dirette = buone.filter(function (r) { return !r.collaboratore_id; });
    var indirette = buone.filter(function (r) { return r.collaboratore_id; });
    var somma = function (arr, k) { return cent(arr.reduce(function (s, r) { return s + (r[k] || 0); }, 0)); };
    return {
      movimenti: righe.length,
      conteggiati: buone.length,
      daConfermare: incassate.length - buone.length,
      /* La produzione del periodo, che include anche quello che non è ancora
         entrato: sono due righe di riepilogo, mai una somma sola. */
      righe_emesse: righe.length,
      premi_emessi: somma(righe, 'importo'),
      righe_da_incassare: aperte.length,
      premi_da_incassare: somma(aperte, 'importo'),
      /* La cassa. `premi` resta il nome che aveva, e resta quello che diceva:
         i premi INCASSATI. */
      righe_incassate: incassate.length,
      premi: somma(incassate, 'importo'),
      provvigioni: somma(buone, 'provvigione'),
      provvigioni_dirette: somma(dirette, 'provvigione'),
      provvigioni_indirette: somma(indirette, 'provvigione'),
      quota_collaboratori: somma(indirette, 'quota_collaboratore'),
      margine_agenzia: cent(somma(dirette, 'provvigione') + somma(indirette, 'margine_agenzia'))
    };
  }

  /* ══ LE QUADRATURE DI CASSA ════════════════════════════════════════════════
     Per mezzo, per compagnia, per collaboratore. Ogni gruppo somma premi e
     provvigioni; la somma dei gruppi deve tornare col totale — è la prova che
     nessuna riga è stata contata due volte o persa. */
  function raggruppa(righe, chiave, etichetta) {
    var m = {};
    righe.forEach(function (r) {
      var k = chiave(r) || '(non indicato)';
      if (!m[k]) m[k] = { chiave: k, etichetta: etichetta ? etichetta(r, k) : k, movimenti: 0, premi: 0, provvigioni: 0, quota_collaboratori: 0 };
      m[k].movimenti++;
      m[k].premi = cent(m[k].premi + (r.importo || 0));
      if (!r.daConfermare.length) {
        m[k].provvigioni = cent(m[k].provvigioni + (r.provvigione || 0));
        m[k].quota_collaboratori = cent(m[k].quota_collaboratori + (r.quota_collaboratore || 0));
      }
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.premi - a.premi; });
  }
  /* Le quadrature restano SUGLI INCASSI, sempre, anche quando si sta
     guardando per emissione: servono a far tornare la cassa con quello che
     c'è nel cassetto e sul conto, e una rata non incassata in cassa non c'è.
     Il filtro sta QUI dentro e non in chi chiama, perché i posti che lo
     chiamano sono tre (schermata, Excel, PDF) e tre controlli scritti a mano
     sono tre occasioni di dimenticarne uno. */
  function quadrature(righe) {
    var inc = (righe || []).filter(function (r) { return r.incassata; });
    return {
      perMezzo: raggruppa(inc, function (r) { return r.mezzo; }, function (r) { return r.mezzo_nome || '(non indicato)'; }),
      perCompagnia: raggruppa(inc, function (r) { return r.compagnia; }),
      perCollaboratore: raggruppa(inc, function (r) { return r.collaboratore_id; }, function (r, k) { return r.collaboratore || (r.collaboratore_id ? 'collaboratore rimosso' : 'Agenzia (produzione diretta)'); })
    };
  }

  function riassunto(opz) {
    var righe = movimenti(opz);
    return { righe: righe, totali: totali(righe), quadrature: quadrature(righe) };
  }

  /* ══ IL DOCUMENTO PDF ══════════════════════════════════════════════════════
     Un documento strutturato per PdfWithus.disegna: si costruisce qui, in Node,
     e si disegna nel browser. Stesso foglio dell'Excel: righe e totali sono
     gli stessi oggetti. */
  function euro(n) { return n == null ? '—' : '€ ' + Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dataIt(v) { return v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—'; }

  function documentoPdf(r, opz) {
    var o = opz || {};
    var periodo = (o.dal || o.al) ? 'dal ' + (o.dal ? dataIt(o.dal) : 'inizio') + ' al ' + (o.al ? dataIt(o.al) : 'oggi') : 'tutto il periodo';
    var filtri = [];
    if (o.compagnia) filtri.push('compagnia ' + o.compagnia);
    if (o.mezzo) filtri.push('mezzo ' + (MEZZI[o.mezzo] || o.mezzo));
    if (o.collaboratore) filtri.push('collaboratore ' + o.collaboratore);
    var t = r.totali;
    var blocchi = [
      { tipo: 'tessere', voci: [
        { etichetta: 'Premi incassati', valore: euro(t.premi), nota: t.movimenti + ' movimenti' },
        { etichetta: 'Provvigioni dirette', valore: euro(t.provvigioni_dirette), nota: 'produzione dell\'agenzia' },
        { etichetta: 'Provvigioni indirette', valore: euro(t.provvigioni_indirette), nota: 'di cui ai collaboratori ' + euro(t.quota_collaboratori) }
      ] },
      { tipo: 'titolo', testo: 'Movimenti' },
      { tipo: 'tabella', intestazioni: ['Data', 'Cliente', 'Polizza', 'Compagnia', 'Mezzo', 'Chi paga', 'Premio', 'Provv.', 'Collaboratore', 'Quota'],
        larghezze: [.09, .17, .12, .11, .1, .08, .09, .08, .1, .06],
        righe: r.righe.map(function (x) {
          return [dataIt(x.data), x.cliente || '—', x.numero_polizza || '—', x.compagnia || '—', x.mezzo_nome || '—',
            PAGATORI[x.pagatore_tipo] || x.pagatore_tipo,
            { testo: euro(x.importo), allinea: 'right' }, { testo: x.provvigione == null ? '—' : euro(x.provvigione), allinea: 'right' },
            x.collaboratore || (x.collaboratore_id ? '(rimosso)' : '—'), { testo: x.quota_collaboratore == null ? '—' : euro(x.quota_collaboratore), allinea: 'right' }];
        }), size: 6.8 }
    ];
    var quad = function (titolo, gruppi, primaColonna) {
      return [{ tipo: 'titolo', testo: titolo },
        { tipo: 'tabella', intestazioni: [primaColonna, 'Movimenti', 'Premi', 'Provvigioni', 'Quota collaboratori'], larghezze: [.4, .12, .16, .16, .16],
          righe: gruppi.map(function (g) { return [g.etichetta, String(g.movimenti), { testo: euro(g.premi), allinea: 'right' }, { testo: euro(g.provvigioni), allinea: 'right' }, { testo: euro(g.quota_collaboratori), allinea: 'right' }]; })
            .concat([{ celle: ['Totale', String(t.movimenti), { testo: euro(t.premi), allinea: 'right' }, { testo: euro(t.provvigioni), allinea: 'right' }, { testo: euro(t.quota_collaboratori), allinea: 'right' }], evidenzia: true }]),
          primaColonnaInGrassetto: true }];
    };
    blocchi = blocchi.concat(quad('Quadratura per mezzo di pagamento', r.quadrature.perMezzo, 'Mezzo'))
      .concat(quad('Quadratura per compagnia', r.quadrature.perCompagnia, 'Compagnia'))
      .concat(quad('Quadratura per collaboratore', r.quadrature.perCollaboratore, 'Collaboratore'));
    if (t.daConfermare) blocchi.push({ tipo: 'testo', titolo: 'Da confermare', tono: 'ambra', paragrafi: [
      t.daConfermare + ' movimenti non entrano nei totali delle provvigioni: la compagnia non ha dichiarato la provvigione, o per quel prodotto non c\'è una percentuale concordata col collaboratore. I premi sì.'] });
    return {
      tipo: 'FOGLIO CASSA', numero: periodo, sotto: filtri.join(' · ') || 'tutti i movimenti',
      azienda: o.azienda || {}, banda: null, filigrana: null, colonne: [], blocchi: blocchi, firma: null,
      avvertenze: 'Foglio cassa generato dal gestionale il ' + dataIt(o.oggi || new Date().toISOString()) + '. Le provvigioni indirette si ripartiscono sulle percentuali concordate per prodotto (iam_team.provv); le rate senza provvigione dichiarata o senza percentuale sono elencate ma non sommate.',
      piedeSinistra: (o.azienda && o.azienda.ragioneSociale) || '', piedeDestra: 'Foglio cassa ' + periodo,
      titoloPdf: 'Foglio cassa ' + periodo, nomeFile: 'foglio-cassa_' + (o.dal || 'inizio') + '_' + (o.al || 'oggi') + '.pdf'
    };
  }

  var API = { VERSIONE: VERSIONE, MEZZI: MEZZI, PAGATORI: PAGATORI, cent: cent,
    movimenti: movimenti, totali: totali, quadrature: quadrature, riassunto: riassunto, documentoPdf: documentoPdf, euro: euro, dataIt: dataIt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.FoglioCassa = API;
})();
