/* ═══════════════════════════════════════════════════════════════════════════════
   DI CHI SONO LE RATE DEL PREGRESSO (19/09/2026)

   `quote_titoli.collaboratore_id` esiste dal 18/09 e nasce vuota su tutto
   quello che c'era prima. Finché resta vuota l'estratto conto di ognuno è
   vuoto, e il riepilogo d'agenzia ha una riga sola.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA MISURA CHE COMANDA SU TUTTO IL RESTO, presa il 19/09/2026 sul          │
   │ database vero prima di scrivere una riga di codice:                       │
   │                                                                           │
   │   · 55 rate, 0 assegnate                                                  │
   │   · 25 polizze su 30 portano un codice collaboratore della compagnia,     │
   │     11 codici distinti                                                    │
   │   · `creato_da` su TUTTE e 55 le rate è UN SOLO utente                    │
   │   · nome ed email di quei codici NON SONO NEL DATABASE                    │
   │                                                                           │
   │ Quindi: non esiste un dato che dica chi è `U25274`. Ogni assegnazione     │
   │ automatica sarebbe inventata (regola di casa §8.1), e una provvigione     │
   │ inventata è pagata a chi non doveva.                                      │
   └───────────────────────────────────────────────────────────────────────────┘

   QUELLO CHE QUESTO MOTORE FA, ED È UN'ALTRA COSA. Non indovina: APPLICA una
   decisione già presa da una persona e firmata, che sta in
   `quote_codici_collaboratore`. Il codice della compagnia è stabile — `U25274`
   sarà `U25274` anche nel flusso di stanotte — quindi la domanda si fa una
   volta sola e la risposta vale per il pregresso e per tutto quello che arriva.

   Indovinare e applicare una decisione si somigliano dal risultato (delle rate
   cambiano padrone senza che nessuno le tocchi una per una) e sono opposte
   nella sostanza: una la può smentire chiunque, l'altra ha una firma e una
   data. È la stessa distinzione del registro unico delle persone (§10), dove
   l'aggancio per codice fiscale si fa e quello per somiglianza no.

   LE CINQUE REGOLE, ognuna con la sua prova e la sua controprova.

   1. **Niente decisione, niente assegnazione.** Un codice senza riga in
      tabella non muove nulla. Non c'è una regola di ripiego, non c'è un
      «quello che ha più polizze»: non deciso vuol dire non deciso.

   2. **Non si sovrascrive quello che c'è.** Una rata già assegnata resta com'è,
      anche se il codice dice un'altra persona. Chi l'ha assegnata a mano
      sapeva qualcosa che il codice non sa — una polizza che ha cambiato mano,
      un subentro — e un'applicazione in blocco che glielo cancella è un lavoro
      buttato che nessuno si accorge di aver perso. Chi vuole davvero
      riscrivere passa da `sovrascrivi`, che è una scelta esplicita.

   3. **La chiave è la COPPIA compagnia+codice.** Due compagnie possono usare lo
      stesso codice per due persone diverse. Su una chiave a codice solo la
      seconda decisione mangerebbe la prima, e nessuno vedrebbe niente.

   4. **«Nessuno» è una decisione, l'assenza non lo è.** Un codice deciso
      «nessuno» (la produzione diretta dell'agenzia) non assegna e non torna
      più a chiedere. Confonderlo con «non deciso» vorrebbe dire riproporre
      ogni volta le stesse righe, e chi rivede sempre le stesse righe smette di
      guardarle.

   5. **L'email aggancia solo se è UNA.** Quando il flusso porta l'indirizzo di
      un collaboratore, un indirizzo che corrisponde a una sola persona in
      agenzia è un'evidenza forte — ma resta una PROPOSTA da confermare, e due
      persone con lo stesso indirizzo non producono niente. Il nome non si
      guarda mai: «Rossi Mario» e «Mario Rossi» si somigliano, e la somiglianza
      qui costa una provvigione.

   Il motore non tocca il database e non tocca il DOM: prende righe, restituisce
   piani. Chi scrive è la schermata.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-09-19';

  /* ══ 1. LA CHIAVE ═════════════════════════════════════════════════════════
     Maiuscole e spazi tolti perché la stessa compagnia arriva scritta in modi
     diversi da punti diversi del sistema («PRIMA», «Prima», « prima »). Se
     manca uno dei due pezzi la chiave è vuota, e una chiave vuota non abbina
     niente: meglio un codice che resta da decidere di un codice abbinato a
     caso. */
  function norm(s) {
    return String(s == null ? '' : s).trim().toUpperCase();
  }

  function chiave(compagnia, codice) {
    var a = norm(compagnia), b = norm(codice);
    if (!a || !b) return '';
    return a + '|' + b;
  }

  /* Il codice di una polizza arrivata dal flusso. Chi non viene dal flusso non
     ha un codice, e non averlo è un'informazione: quelle rate si assegnano a
     mano, non si attribuiscono a chi ha fatto l'importazione. */
  function codiceDi(polizza) {
    if (!polizza) return null;
    var ssf = (polizza.dati && polizza.dati.ssf) || {};
    var cod = norm(ssf.collaboratore);
    if (!cod) return null;
    var comp = norm(polizza.compagnia);
    if (!comp) return null;
    return { compagnia: comp, codice: cod, chiave: comp + '|' + cod };
  }

  /* ══ 2. LO STATO DI UNA DECISIONE ═════════════════════════════════════════
     Quattro stati, non due, e il quarto è quello che si dimentica sempre.

       persona        · deciso, e punta a qualcuno
       nessuno        · deciso: «non è di nessun collaboratore»
       da-ridecidere  · deciso, ma la persona è stata cancellata
       non-deciso     · non c'è riga, o c'è solo per le evidenze del flusso

     `da-ridecidere` non si può confondere con `non-deciso`: nel primo caso
     qualcuno aveva deciso e quella decisione è rimasta scoperta, e dirlo è
     diverso dal far finta che non sia mai successo — è lo stesso principio del
     registro che distingue «non risponde» da «non c'è niente» (§18).

     `riga.deciso` è quello che tiene separate le due cose. Senza, una riga
     scritta dall'importazione per conservare nome ed email si leggerebbe come
     una decisione andata a vuoto, e ogni codice mai guardato comparirebbe in
     rosso: un allarme che suona sempre non lo guarda più nessuno. */
  function statoDecisione(riga) {
    if (!riga || !riga.deciso) return 'non-deciso';
    if (riga.collaboratore_id) return 'persona';
    if (riga.nessuno) return 'nessuno';
    return 'da-ridecidere';
  }

  /* Da righe a mappa. L'ultima riga con la stessa chiave vince, ma in tabella
     la chiave è primaria: se qui ne arrivano due, qualcuno ha passato dati che
     il database non avrebbe accettato. */
  function mappa(righe) {
    var m = {};
    (righe || []).forEach(function (r) {
      var k = chiave(r.compagnia, r.codice);
      if (k) m[k] = r;
    });
    return m;
  }

  /* ══ 3. IL RIEPILOGO: che cosa si sa di ogni codice ════════════════════════
     Serve a RICONOSCERLO. Chi guarda la schermata non ha in mano il tracciato
     della compagnia: ha in mano la memoria di chi lavora in agenzia, e quella
     si accende con i nomi dei clienti, i prodotti e le date — non con «U25274».

     Si contano anche le rate GIÀ assegnate, separate: dicono che su quel codice
     qualcuno ha già lavorato a mano, ed è un'informazione prima di applicare
     qualcosa in blocco. */
  function riepilogo(polizze, titoli, mappaCodici, opz) {
    opz = opz || {};
    var maxClienti = opz.maxClienti || 4;
    var perPolizza = {};
    (polizze || []).forEach(function (p) { if (p && p.id) perPolizza[p.id] = p; });

    var per = {};
    function riga(k, info) {
      if (!per[k]) {
        var d = (mappaCodici || {})[k] || null;
        per[k] = {
          chiave: k, compagnia: info.compagnia, codice: info.codice,
          polizze: 0, titoli: 0, titoliAssegnati: 0, titoliDaAssegnare: 0,
          premio: 0, provvigione: 0,
          dal: null, al: null,
          clienti: [], prodotti: [],
          decisione: d, stato: statoDecisione(d),
          collaboratore_id: d ? d.collaboratore_id || null : null
        };
      }
      return per[k];
    }

    (polizze || []).forEach(function (p) {
      var c = codiceDi(p);
      if (!c) return;
      var r = riga(c.chiave, c);
      r.polizze++;
      if (p.cliente && r.clienti.length < maxClienti && r.clienti.indexOf(p.cliente) < 0) r.clienti.push(p.cliente);
      if (p.prodotto && r.prodotti.indexOf(p.prodotto) < 0) r.prodotti.push(p.prodotto);
      var d = p.data_effetto;
      if (d) {
        if (!r.dal || d < r.dal) r.dal = d;
        if (!r.al || d > r.al) r.al = d;
      }
    });

    (titoli || []).forEach(function (t) {
      var p = perPolizza[t.polizza_id];
      if (!p) return;
      var c = codiceDi(p);
      if (!c) return;
      var r = riga(c.chiave, c);
      r.titoli++;
      if (t.collaboratore_id) r.titoliAssegnati++; else r.titoliDaAssegnare++;
      r.premio += num(t.importo_lordo);
      r.provvigione += num(t.provvigione);
    });

    return Object.keys(per).map(function (k) {
      var r = per[k];
      r.premio = cent(r.premio);
      r.provvigione = cent(r.provvigione);
      return r;
    }).sort(function (a, b) {
      /* Prima quelli che hanno più rate da assegnare: è lì che c'è del lavoro
         da fare, e una schermata che mette in cima i codici già a posto fa
         scorrere per niente. */
      if (b.titoliDaAssegnare !== a.titoliDaAssegnare) return b.titoliDaAssegnare - a.titoliDaAssegnare;
      return a.chiave < b.chiave ? -1 : 1;
    });
  }

  /* ══ 4. IL PIANO ══════════════════════════════════════════════════════════
     Che cosa si sposterebbe, e che cosa no col suo motivo. Si guarda PRIMA di
     scrivere, come per l'importazione del flusso: un'operazione in blocco che
     scrive prima di farsi vedere è una cosa che si subisce.

     I motivi sono cinque e sono tutti detti in faccia:

       senza-polizza    · la rata punta a una polizza che non c'è fra quelle date
       senza-codice     · la polizza non viene dal flusso: nessun codice da usare
       codice-non-deciso· c'è il codice, manca la decisione
       codice-scoperto  · c'era una decisione, la persona è stata cancellata
       deciso-nessuno   · deciso che non è di nessuno
       gia-assegnata    · la rata ha già un collaboratore (regola 2) */
  function piano(titoli, polizze, mappaCodici, opz) {
    opz = opz || {};
    var sovrascrivi = !!opz.sovrascrivi;
    var soloChiavi = opz.soloChiavi ? indice(opz.soloChiavi) : null;

    var perPolizza = {};
    (polizze || []).forEach(function (p) { if (p && p.id) perPolizza[p.id] = p; });

    var assegna = [], saltate = [], perPersona = {};

    (titoli || []).forEach(function (t) {
      var p = perPolizza[t.polizza_id];
      if (!p) return void saltate.push({ id: t.id, motivo: 'senza-polizza' });

      var c = codiceDi(p);
      if (!c) return void saltate.push({ id: t.id, motivo: 'senza-codice' });
      if (soloChiavi && !soloChiavi[c.chiave]) return;

      var d = (mappaCodici || {})[c.chiave];
      var stato = statoDecisione(d);
      if (stato === 'non-deciso') return void saltate.push({ id: t.id, motivo: 'codice-non-deciso', chiave: c.chiave });
      if (stato === 'da-ridecidere') return void saltate.push({ id: t.id, motivo: 'codice-scoperto', chiave: c.chiave });
      if (stato === 'nessuno') return void saltate.push({ id: t.id, motivo: 'deciso-nessuno', chiave: c.chiave });

      /* Regola 2. Una rata già assegnata alla STESSA persona non è un conflitto
         e non è nemmeno lavoro: non si riscrive per non contarla come se si
         fosse spostato qualcosa. */
      if (t.collaboratore_id) {
        return void saltate.push({
          id: t.id, chiave: c.chiave,
          motivo: t.collaboratore_id === d.collaboratore_id ? 'gia-a-posto' : 'gia-assegnata',
          a: t.collaboratore_id
        });
      }

      assegna.push({ id: t.id, collaboratore_id: d.collaboratore_id, chiave: c.chiave });
      perPersona[d.collaboratore_id] = (perPersona[d.collaboratore_id] || 0) + 1;
    });

    /* `sovrascrivi` non è un ripensamento sulla regola 2: è la stessa regola
       con la scelta in mano a chi la prende. Si ripassa sulle saltate per
       conflitto e si spostano, ma restano contate a parte perché chi legge il
       riepilogo deve sapere quante assegnazioni a mano ha appena coperto. */
    var sovrascritte = [];
    if (sovrascrivi) {
      saltate = saltate.filter(function (s) {
        if (s.motivo !== 'gia-assegnata') return true;
        var t = trova(titoli, s.id);
        var p = t && perPolizza[t.polizza_id];
        var d = p && (mappaCodici || {})[codiceDi(p).chiave];
        if (!d || !d.collaboratore_id) return true;
        assegna.push({ id: s.id, collaboratore_id: d.collaboratore_id, chiave: s.chiave });
        perPersona[d.collaboratore_id] = (perPersona[d.collaboratore_id] || 0) + 1;
        sovrascritte.push(s);
        return false;
      });
    }

    return { assegna: assegna, saltate: saltate, sovrascritte: sovrascritte, perPersona: perPersona };
  }

  /* ══ 5. LE PROPOSTE: PRIMA IL RUI, POI L'EMAIL ════════════════════════════
     Due campi del flusso corrispondono a qualcosa che abbiamo già, e non
     valgono uguale.

     **Il RUI viene per primo perché è il numero dell'intermediario.** È il
     registro pubblico che dice chi è: non cambia quando qualcuno cambia
     indirizzo di posta, non si condivide fra due persone per comodità, e su
     `quote_collaboratori.rui_numero` è già scritto per dodici persone su
     diciassette. Un'email invece è un recapito, e i recapiti si prestano: la
     casella dell'agenzia messa su due schede, quella di un collaboratore usata
     dal suo assistente. Fra i due, quello che identifica una persona è il RUI.

     L'email resta come seconda strada, perché cinque persone su diciassette il
     RUI non ce l'hanno scritto e senza di lei per loro non ci sarebbe niente.

     In tutti e due i casi vale la stessa regola: **aggancia solo se è UNA**.
     Nel registro vero ci sono già undici RUI distinti su dodici schede, cioè
     due persone con lo stesso numero: lì non si propone niente, e l'ambiguità
     si dice invece di sceglierne una.

     Il nome non si guarda mai. `DESCRIZIONE_COLLABORATORE` arriva come capita
     («- STUDIO DI PROVA S.R.L.»), e due persone che si chiamano quasi uguale in
     un'agenzia ci sono sempre.

     E resta comunque una PROPOSTA: la scrive qualcuno, guardandola. */
  function proposteDaFlusso(collaboratoriFlusso, persone, compagnia) {
    var perEmail = {}, perRui = {};
    (persone || []).forEach(function (p) {
      var e = mail(p.email);
      if (e) (perEmail[e] = perEmail[e] || []).push(p);
      var r = codiceRui(p.rui_numero);
      if (r) (perRui[r] = perRui[r] || []).push(p);
    });

    return (collaboratoriFlusso || []).map(function (c) {
      var base = {
        compagnia: norm(compagnia), codice: norm(c.codice),
        chiave: chiave(compagnia, c.codice),
        nome_flusso: c.nome || null, email_flusso: c.email || null, rui_flusso: c.rui || null,
        produttore_flusso: c.produttore || null,
        collaboratore_id: null, motivo: null
      };

      var r = codiceRui(c.rui);
      var perRuiTrovate = r ? (perRui[r] || []) : [];
      if (perRuiTrovate.length === 1) {
        base.collaboratore_id = perRuiTrovate[0].id;
        base.motivo = 'rui';
        return base;
      }

      var e = mail(c.email);
      var trovate = e ? (perEmail[e] || []) : [];
      if (trovate.length === 1) {
        base.collaboratore_id = trovate[0].id;
        base.motivo = 'email';
        return base;
      }

      /* Niente aggancio: si dice PERCHÉ, e il motivo più informativo vince.
         «Due persone con questo RUI» è una cosa da andare a sistemare nel
         registro; «non ha email» è solo un dato che manca. */
      if (perRuiTrovate.length > 1) base.motivo = 'rui-ambiguo';
      else if (trovate.length > 1) base.motivo = 'email-ambigua';
      else if (r && !perRuiTrovate.length && !e) base.motivo = 'rui-sconosciuto';
      else if (!e) base.motivo = 'email-assente';
      else base.motivo = 'email-sconosciuta';
      return base;
    });
  }

  /* Il RUI si confronta senza spazi, punti e maiuscole: lo stesso numero è
     scritto «E000123456» in agenzia e «E 000123456» dalla compagnia, e due
     stringhe diverse per lo stesso intermediario non agganciano niente. */
  function codiceRui(s) {
    return String(s == null ? '' : s).replace(/[\s.\-\/]/g, '').toUpperCase();
  }

  /* ══ 6. ATTREZZI ══════════════════════════════════════════════════════════ */

  /* Simmetrico sui negativi, come in `estratto-conto.js`: gli storni esistono e
     `Math.round(-0.5)` arrotonda verso l'alto anche loro. */
  function cent(n) {
    var v = num(n);
    return (v < 0 ? -1 : 1) * Math.round(Math.abs(v) * 100) / 100;
  }

  function num(n) {
    var v = typeof n === 'number' ? n : parseFloat(n);
    return isFinite(v) ? v : 0;
  }

  function mail(s) {
    return String(s == null ? '' : s).trim().toLowerCase();
  }

  function indice(chiavi) {
    var m = {};
    (chiavi || []).forEach(function (k) { m[k] = true; });
    return m;
  }

  function trova(righe, id) {
    for (var i = 0; i < (righe || []).length; i++) if (righe[i].id === id) return righe[i];
    return null;
  }

  var API = {
    VERSIONE: VERSIONE,
    chiave: chiave, codiceDi: codiceDi, statoDecisione: statoDecisione, mappa: mappa,
    riepilogo: riepilogo, piano: piano, proposteDaFlusso: proposteDaFlusso,
    cent: cent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Assegnazione = API;
})();
