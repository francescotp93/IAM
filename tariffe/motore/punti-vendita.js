/* ═══════════════════════════════════════════════════════════════════════════
   I PUNTI VENDITA  (23/09/2026)

   Richiesta di Francesco, con la schermata del portale di una compagnia
   davanti: a sinistra la struttura dei punti vendita con i filtri per
   abilitazione, a destra le persone di quello scelto.

   MISURATO PRIMA DI SCRIVERE, il 23/09/2026:

     · in banca dati NON ESISTE nessuna tabella dei punti vendita;
     · `iam_utenti.rete` è un campo di TESTO LIBERO: su cinque account, quattro
       ce l'hanno vuoto e uno dice «Test»;
     · la pagina «Reti / Punti vendita» del preventivatore è un segnaposto che
       dice «questa sezione è stata spostata dentro Utenti».

   Quindi qui non si sposta niente: si costruisce, e si costruisce in IAM.

   Le REGOLE stanno in questo file e si provano in Node (§5): una regola su chi
   può emettere una polizza scritta dentro una schermata non si può provare
   senza aprire un browser, e questa decide che cosa una persona può fare.

   LA REGOLA CHE COMANDA SU TUTTE LE ALTRE

     Un punto vendita figlio NON PUÒ POTERE PIÙ DEL PADRE.

   Se l'agenzia generale non ha l'incasso abilitato, una sua filiale non ce
   l'ha, comunque sia spuntata la sua casella. È il verso in cui funziona una
   delega: si può dare meno di quello che si ha, mai di più. Senza questa
   regola basterebbe togliere un permesso al padre e dimenticarsene, e le
   filiali continuerebbero a incassare — una schermata direbbe «no» e il
   sistema direbbe «sì».

   Le abilitazioni EFFETTIVE sono quindi l'AND della catena fino alla radice, e
   la schermata mostra le due cose separate: quello che è spuntato su quel
   punto vendita e quello che vale davvero. Confonderle vorrebbe dire non
   capire più perché una filiale non emette.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Le quattro abilitazioni della schermata di Francesco. Stanno in un elenco
     solo perché contarle, filtrarle e scriverle sono la stessa domanda: due
     elenchi scritti a mano divergono alla prima abilitazione aggiunta (§37). */
  var ABILITAZIONI = [
    { k: 'puo_proposta',   l: 'Inserimento proposta',  i: 'ti-file-plus' },
    { k: 'puo_emissione',  l: 'Emissione polizza',     i: 'ti-file-check' },
    { k: 'puo_incasso',    l: 'Incasso abilitato',     i: 'ti-cash' },
    { k: 'puo_quotazione', l: 'Emissione quotazione',  i: 'ti-calculator' }
  ];

  function testo(v) { return v == null ? '' : String(v).trim(); }
  function data(v) { var t = testo(v).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null; }

  /* L'orologio non si chiede al computer di chi guarda: due persone davanti
     allo stesso dato avrebbero due risposte (§44, §45). Chi chiama passa
     `oggi`; senza, il periodo non si giudica e si dice. */
  function attivo(pv, oggi) {
    pv = pv || {};
    if (pv.attivo === false) return { ok: false, motivo: 'spento' };
    var og = data(oggi);
    var da = data(pv.data_inizio), a = data(pv.data_fine);
    if (!og) return { ok: true, motivo: null, incerto: !!(da || a) };
    if (da && og < da) return { ok: false, motivo: 'non ancora aperto (dal ' + da + ')' };
    if (a && og > a) return { ok: false, motivo: 'chiuso il ' + a };
    return { ok: true, motivo: null };
  }

  /* ── L'ALBERO ───────────────────────────────────────────────────────────────

     Un punto vendita il cui padre non c'è NON SPARISCE: diventa una radice e
     si dichiara orfano. Nasconderlo vorrebbe dire che un padre cancellato per
     sbaglio porta via dalla vista tutte le sue filiali, e con loro le persone
     che ci lavorano — senza un errore e senza che nessuno se ne accorga. È la
     stessa regola di «non si è potuto leggere» ≠ «non c'è niente» (§12, §18),
     applicata a una gerarchia. */
  function albero(righe, opz) {
    opz = opz || {};
    var per = {}, tutti = [];
    (righe || []).forEach(function (r) {
      if (!r || !r.id) return;
      var n = {
        riga: r, id: r.id, nome: testo(r.nome) || '(senza nome)',
        codice: testo(r.codice) || null, padre_id: r.padre_id || null,
        figli: [], livello: 0, orfano: false,
        stato: attivo(r, opz.oggi)
      };
      per[r.id] = n; tutti.push(n);
    });
    var radici = [];
    tutti.forEach(function (n) {
      var p = n.padre_id ? per[n.padre_id] : null;
      if (n.padre_id && !p) { n.orfano = true; radici.push(n); return; }
      if (p && p !== n) p.figli.push(n); else radici.push(n);
    });

    /* Un ciclo (A padre di B, B padre di A) non deve far girare a vuoto chi
       disegna: il database lo vieta con un trigger, ma il motore non si fida
       di quello che gli arriva — un elenco può venire da una lettura vecchia
       o da una schermata a metà scrittura. */
    var visti = {}, ciclici = [];
    function profondita(n, liv, strada) {
      if (strada[n.id]) { ciclici.push(n.id); return; }
      strada[n.id] = true; visti[n.id] = true;
      n.livello = liv;
      n.figli.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'it'); });
      n.figli.forEach(function (f) { profondita(f, liv + 1, strada); });
      delete strada[n.id];
    }
    radici.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'it'); });
    radici.forEach(function (n) { profondita(n, 0, {}); });
    /* Chi non è stato raggiunto sta dentro un ciclo: si mostra come radice,
       marcato, invece di sparire. */
    var fuori = tutti.filter(function (n) { return !visti[n.id]; });
    fuori.forEach(function (n) { n.ciclo = true; n.livello = 0; radici.push(n); });

    return { radici: radici, per: per, tutti: tutti, orfani: tutti.filter(function (n) { return n.orfano; }).length, ciclici: fuori.length };
  }

  /* La catena dalla radice fino a questo punto vendita, compreso. Serve alle
     abilitazioni effettive e alla briciola in schermata. */
  function catena(righe, id) {
    var per = {};
    (righe || []).forEach(function (r) { if (r && r.id) per[r.id] = r; });
    var out = [], visti = {}, cur = per[id];
    while (cur && !visti[cur.id]) { visti[cur.id] = true; out.unshift(cur); cur = cur.padre_id ? per[cur.padre_id] : null; }
    return out;
  }

  /* ── LE ABILITAZIONI EFFETTIVE ──────────────────────────────────────────── */
  function effettive(righe, id) {
    var cat = catena(righe, id);
    var out = { catena: cat.map(function (r) { return testo(r.nome); }) };
    ABILITAZIONI.forEach(function (a) {
      var propria = !!(cat.length && cat[cat.length - 1][a.k]);
      var vale = cat.length > 0;
      var tolta = null;
      for (var i = 0; i < cat.length; i++) {
        if (!cat[i][a.k]) { vale = false; if (i < cat.length - 1) tolta = testo(cat[i].nome); break; }
      }
      out[a.k] = {
        propria: propria, effettiva: vale,
        /* Il nome di CHI la toglie: «non emette» senza dire perché fa
           riaprire la casella di questa filiale dieci volte. */
        tolta_da: (propria && !vale) ? tolta : null
      };
    });
    return out;
  }

  /* ── I FILTRI DELLA SCHERMATA ────────────────────────────────────────────

     Le caselle si sommano (AND): spuntandone due si cercano i punti vendita
     che hanno tutte e due, che è quello che una persona si aspetta. E si
     guarda l'abilitazione EFFETTIVA, non la casella: filtrare su «incasso
     abilitato» e ritrovarsi una filiale a cui il padre l'ha tolto vorrebbe
     dire che il filtro dice una cosa e la riga un'altra.

     Un punto vendita che non passa il filtro ma ha un figlio che lo passa
     RESTA IN ALBERO, marcato `di_passaggio`: toglierlo staccherebbe il figlio
     dalla sua radice e l'albero non si leggerebbe più. */
  function filtra(righe, filtri, opz) {
    filtri = filtri || {}; opz = opz || {};
    var A = albero(righe, opz);
    var eff = {};
    (righe || []).forEach(function (r) { if (r && r.id) eff[r.id] = effettive(righe, r.id); });

    function passa(n) {
      if (filtri.solo_attivi !== false && !n.stato.ok) return false;
      for (var i = 0; i < ABILITAZIONI.length; i++) {
        var k = ABILITAZIONI[i].k;
        if (filtri[k] && !(eff[n.id] && eff[n.id][k] && eff[n.id][k].effettiva)) return false;
      }
      return true;
    }
    var tieni = {};
    function giu(n) {
      var suo = passa(n);
      var sotto = false;
      n.figli.forEach(function (f) { if (giu(f)) sotto = true; });
      if (suo || sotto) { tieni[n.id] = true; n.di_passaggio = !suo; }
      return suo || sotto;
    }
    A.radici.forEach(giu);
    function pota(lista) {
      return lista.filter(function (n) { return tieni[n.id]; })
        .map(function (n) { n.figli = pota(n.figli); return n; });
    }
    var radici = pota(A.radici);
    var quanti = 0;
    (function conta(l) { l.forEach(function (n) { if (!n.di_passaggio) quanti++; conta(n.figli); }); })(radici);
    return { radici: radici, effettive: eff, quanti: quanti, totale: A.tutti.length,
             orfani: A.orfani, ciclici: A.ciclici };
  }

  /* ── LE PERSONE DI UN PUNTO VENDITA ──────────────────────────────────────

     Le persone sono quelle del REGISTRO UNICO (§10): diciassette, di cui
     cinque hanno un account. Se si partisse dagli account, dodici persone che
     lavorano in un punto vendita non comparirebbero — ed è lo stesso difetto
     già corretto per l'elenco Utenti e per le tendine dei collaboratori
     (§48). L'account, dove c'è, si mostra accanto. */
  function personeDi(persone, pvId, opz) {
    opz = opz || {};
    var conti = {};
    (opz.account || []).forEach(function (u) {
      if (!u) return;
      var k = u.iam_id || u.persona_id || u.id;
      if (k) conti[k] = u;
      if (u.email) conti['@' + testo(u.email).toLowerCase()] = u;
    });
    var out = (persone || []).filter(function (p) {
      return p && (pvId ? p.punto_vendita_id === pvId : !p.punto_vendita_id);
    }).map(function (p) {
      var a = conti[p.iam_id] || conti[p.id] || (p.email ? conti['@' + testo(p.email).toLowerCase()] : null) || null;
      return {
        id: p.id, nome: nomeDi(p), email: testo(p.email) || null,
        rui: testo(p.rui) || null,
        data_inizio: data(p.data_inizio) || data(p.creato_il) || null,
        account: a ? { id: a.id, email: testo(a.email) || null, ruolo: testo(a.ruolo) || null,
                       attivo: a.attivo !== false } : null,
        /* «Non ha un account» e «ha un account spento» sono due cose diverse:
           la prima si risolve creando l'accesso, la seconda riattivandolo. */
        stato: !a ? 'senza-account' : (a.attivo === false ? 'sospeso' : 'attivo')
      };
    });
    out.sort(function (a, b) { return testo(a.nome).localeCompare(testo(b.nome), 'it'); });
    return out;
  }

  /* Il nominativo si compone in un posto solo: tre tendine che lo scrivono
     ognuna per conto suo sono tre modi di scrivere la stessa persona (§35). */
  function nomeDi(p) {
    p = p || {};
    var n = (testo(p.cognome) + ' ' + testo(p.nome)).trim();
    return n || testo(p.nominativo) || testo(p.email) || '(senza nome)';
  }

  /* ── QUELLO CHE NON SI CANCELLA ──────────────────────────────────────────

     Un punto vendita con delle filiali sotto, o con delle persone dentro, non
     si cancella: si SPEGNE (§26). Cancellarlo renderebbe orfane le filiali e
     lascerebbe delle persone che lavorano in un posto che non esiste. Il
     divieto vero è un trigger del database — la schermata è una delle strade,
     non l'unica. */
  function eliminabile(pv, righe, persone) {
    if (!pv || !pv.id) return { ok: false, motivo: 'punto vendita sconosciuto' };
    var figli = (righe || []).filter(function (r) { return r && r.padre_id === pv.id; }).length;
    var dentro = (persone || []).filter(function (p) { return p && p.punto_vendita_id === pv.id; }).length;
    if (figli) return { ok: false, motivo: 'ha ' + figli + (figli === 1 ? ' filiale sotto' : ' filiali sotto') + ': spegnilo invece di cancellarlo' };
    if (dentro) return { ok: false, motivo: 'ci lavorano ' + dentro + (dentro === 1 ? ' persona' : ' persone') + ': spegnilo invece di cancellarlo' };
    return { ok: true, motivo: null };
  }

  /* ── CHE COSA SI PUÒ SALVARE ─────────────────────────────────────────────

     Il nome è obbligatorio; il periodo deve avere un verso; un punto vendita
     non può essere padre di se stesso, né di un suo antenato. Il ciclo lo
     vieta anche il database, ma dirlo qui evita di far scrivere un modulo
     intero per poi rifiutarlo. */
  function valida(pv, righe) {
    pv = pv || {};
    var err = [];
    if (!testo(pv.nome)) err.push('Il nome del punto vendita è obbligatorio.');
    var da = data(pv.data_inizio), a = data(pv.data_fine);
    if (da && a && a < da) err.push('La data di chiusura viene prima di quella di apertura.');
    if (pv.padre_id && pv.id && pv.padre_id === pv.id) err.push('Un punto vendita non può essere padre di se stesso.');
    else if (pv.padre_id && pv.id) {
      var cat = catena(righe, pv.padre_id);
      if (cat.some(function (r) { return r.id === pv.id; }))
        err.push('«' + testo(pv.nome) + '» è già sopra a quello che stai scegliendo come padre: si creerebbe un anello.');
    }
    /* Un codice che esiste già su un ALTRO punto vendita non si accetta: due
       punti vendita con lo stesso codice sono due elenchi che non si
       incrociano il giorno in cui qualcuno ci attribuisce delle polizze. */
    var cod = testo(pv.codice);
    if (cod && (righe || []).some(function (r) {
      return r && r.id !== pv.id && testo(r.codice).toLowerCase() === cod.toLowerCase();
    })) err.push('Il codice «' + cod + '» è già di un altro punto vendita.');
    return { ok: !err.length, errori: err };
  }

  /* ── IL RIEPILOGO IN TESTA ───────────────────────────────────────────────

     «Non si è potuto leggere» non è «non ce n'è» (§12, §18): chi chiama dice
     che cosa è riuscito a leggere, e quello che manca si dichiara invece di
     diventare uno zero. */
  function riepilogo(righe, persone, opz) {
    opz = opz || {};
    var letto = opz.letto || {};
    var A = albero(righe, opz);
    var attivi = A.tutti.filter(function (n) { return n.stato.ok; }).length;
    var senza = (persone || []).filter(function (p) { return p && !p.punto_vendita_id; }).length;
    return {
      punti: letto.punti === false ? null : A.tutti.length,
      attivi: letto.punti === false ? null : attivi,
      spenti: letto.punti === false ? null : (A.tutti.length - attivi),
      persone: letto.persone === false ? null : (persone || []).length,
      senza_punto: letto.persone === false ? null : senza,
      orfani: A.orfani, ciclici: A.ciclici,
      cieco: letto.punti === false || letto.persone === false
    };
  }

  var API = {
    ABILITAZIONI: ABILITAZIONI,
    albero: albero, catena: catena, effettive: effettive, filtra: filtra,
    attivo: attivo, personeDi: personeDi, nomeDi: nomeDi,
    eliminabile: eliminabile, valida: valida, riepilogo: riepilogo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PuntiVendita = API;
})();
