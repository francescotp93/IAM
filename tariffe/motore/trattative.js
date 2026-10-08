/* ═══════════════════════════════════════════════════════════════════════════
   LE TRATTATIVE — tariffe/motore/trattative.js  (08/10/2026)

   Richiesta di Francesco: «rivisitiamo la sezione trattative e facciamola in
   maniera intelligente»: ramo, target, compagnia, prodotto, autorizzazione
   della direzione, il cliente dal portafoglio o censito «fast», il
   collaboratore, il richiamo in Agenda, i grafici del valore in corso e
   chiuso per prodotto.

   Qui stanno le REGOLE. La schermata (`trt*` in iam/index.html) raccoglie,
   chiama e disegna: una formula scritta dentro la pagina non si prova senza
   aprire un browser (CLAUDE.md §5).

   LE TRE COSE CHE QUESTO MOTORE NON FA, ed e' il motivo per cui esiste:

   1. Non conta come zero un valore che nessuno ha scritto. Una trattativa
      senza premio resta fuori dalle somme e si CONTA a parte (§36, §42).
   2. Non mescola in corso, vinte e perse in un totale unico.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-10-08';

  /* Gli stati che stanno gia' scritti nell'archivio: non si rinominano (§18,
     «il vocabolario non rinomina lo storico»). `aperta` e' il valore di
     partenza della colonna, ed e' una trattativa in corso. */
  var STATI = {
    prospect:   { nome: 'Prospect',          fase: 'corso' },
    preventivo: { nome: 'Preventivo inviato', fase: 'corso' },
    trattativa: { nome: 'In trattativa',     fase: 'corso' },
    aperta:     { nome: 'In corso',          fase: 'corso' },
    chiusa:     { nome: 'Chiusa ✓',          fase: 'vinta' },
    persa:      { nome: 'Persa ✗',           fase: 'persa' }
  };

  function fase(status) {
    var s = STATI[String(status || '').toLowerCase()];
    return s ? s.fase : 'corso';
  }

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim().replace(/\s/g, '').replace(/€/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  /* Arrotondamento simmetrico al centesimo: `Math.round(-0.5)` fa -0 (§17). */
  function cent(n) { var s = n < 0 ? -1 : 1; return s * Math.round(Math.abs(n) * 100 + 1e-9) / 100; }

  /* ── IL VALORE DI UNA TRATTATIVA ───────────────────────────────────────────
     Il premio lordo; sulle righe scritte prima dell'08/10/2026 c'e' solo
     `importo`. Zero e vuoto non sono un valore: l'importo nasceva a 0 come
     valore di partenza, e uno zero cosi' non lo ha deciso nessuno (§43). */
  function valore(t) {
    var v = num(t && t.premio_lordo);
    if (v === null || v <= 0) v = num(t && t.importo);
    return v !== null && v > 0 ? v : null;
  }

  function nomeProdotto(t) {
    var p = String((t && (t.prodotto_nome || t.prodotto)) || '').trim();
    return p || 'Prodotto non indicato';
  }

  /* Raggruppa per prodotto, dal piu' grande. Oltre `max` gruppi si fondono in
     «Altri», e il numero di quanti ne contiene si dice. */
  function perProdotto(lista, max) {
    max = max || 6;
    var m = {};
    lista.forEach(function (t) {
      var k = nomeProdotto(t);
      var chiave = k.toLowerCase();
      if (!m[chiave]) m[chiave] = { nome: k, valore: 0, n: 0, senzaValore: 0 };
      var v = valore(t);
      m[chiave].n++;
      if (v === null) m[chiave].senzaValore++; else m[chiave].valore = cent(m[chiave].valore + v);
    });
    var g = Object.keys(m).map(function (k) { return m[k]; })
      .sort(function (a, b) { return (b.valore - a.valore) || (b.n - a.n) || a.nome.localeCompare(b.nome); });
    if (g.length > max) {
      var resto = g.slice(max - 1);
      var altri = { nome: 'Altri ' + resto.length + ' prodotti', valore: 0, n: 0, senzaValore: 0, altri: true };
      resto.forEach(function (x) { altri.valore = cent(altri.valore + x.valore); altri.n += x.n; altri.senzaValore += x.senzaValore; });
      g = g.slice(0, max - 1).concat([altri]);
    }
    return g;
  }

  function somma(lista, conProb) {
    var tot = 0, pond = 0, senza = 0;
    lista.forEach(function (t) {
      var v = valore(t);
      if (v === null) { senza++; return; }
      tot += v;
      if (conProb) {
        var p = num(t.prob);
        pond += v * (p !== null && p >= 0 && p <= 100 ? p : 0) / 100;
      }
    });
    return { valore: cent(tot), ponderato: cent(pond), n: lista.length, senzaValore: senza };
  }

  /* Le tappe di una trattativa in corso, nell'ordine in cui si attraversano.
     `aperta` e' il valore di partenza della colonna e non dice a che punto
     si e': sta in una tappa sua, dichiarata, invece di finire in una delle
     altre per somiglianza. Una tappa vuota resta nell'elenco con zero: la
     barra della pipeline ha sempre le stesse tappe nello stesso posto. */
  var TAPPE = ['prospect', 'preventivo', 'trattativa', 'aperta'];

  function fasiCorso(lista) {
    var m = {};
    TAPPE.forEach(function (k) { m[k] = { stato: k, nome: STATI[k].nome, valore: 0, n: 0, senzaValore: 0 }; });
    (lista || []).forEach(function (t) {
      var k = String(t.status || 'aperta').toLowerCase();
      if (fase(k) !== 'corso') return;
      if (!m[k]) k = 'aperta';
      var v = valore(t);
      m[k].n++;
      if (v === null) m[k].senzaValore++; else m[k].valore = cent(m[k].valore + v);
    });
    return TAPPE.map(function (k) { return m[k]; }).filter(function (x) { return x.stato !== 'aperta' || x.n > 0; });
  }

  /* I giorni fra due date ISO, contati sui numeri della stringa: una data
     ISO non ha un fuso orario, e farla passare da toISOString gliene da' uno
     (CLAUDE.md §44). */
  function giorniA(data, oggi) {
    var re = /^(\d{4})-(\d{2})-(\d{2})/;
    var a = re.exec(String(data || '')), b = re.exec(String(oggi || ''));
    if (!a || !b) return null;
    var da = Date.UTC(+a[1], +a[2] - 1, +a[3]), db = Date.UTC(+b[1], +b[2] - 1, +b[3]);
    return Math.round((da - db) / 86400000);
  }

  /* Il richiamo detto in parole. Su una trattativa decisa non si richiama
     nessuno: un «scaduto da 40 giorni» su una trattativa vinta manda a
     telefonare a chi ha gia' firmato. */
  function richiamoStato(t, oggi) {
    if (!t || !t.recall || fase(t.status) !== 'corso') return null;
    var g = giorniA(t.recall, oggi);
    if (g === null) return null;
    var etichetta = g === 0 ? 'oggi' : g === 1 ? 'domani' : g > 1 ? 'tra ' + g + ' giorni'
      : g === -1 ? 'scaduto ieri' : 'scaduto da ' + (-g) + ' giorni';
    return { giorni: g, scaduto: g < 0, oggi: g === 0, etichetta: etichetta };
  }

  /* Il riepilogo che i grafici disegnano. Il tasso di chiusura si calcola
     solo sulle trattative DECISE (vinte + perse): quelle in corso non sono
     ancora ne' una cosa ne' l'altra. E da zero decise non si fa una
     percentuale (§42). */
  function riepilogo(lista, opz) {
    opz = opz || {};
    lista = lista || [];
    var corso = [], vinte = [], perse = [];
    lista.forEach(function (t) {
      var f = fase(t.status);
      (f === 'vinta' ? vinte : f === 'persa' ? perse : corso).push(t);
    });
    var c = somma(corso, true), v = somma(vinte), p = somma(perse);
    var decise = vinte.length + perse.length;
    return {
      corso: Object.assign(c, { perProdotto: perProdotto(corso, opz.max), perStato: fasiCorso(corso) }),
      vinte: Object.assign(v, { perProdotto: perProdotto(vinte, opz.max) }),
      perse: Object.assign(p, { perProdotto: perProdotto(perse, opz.max) }),
      tassoChiusura: decise ? Math.round(vinte.length / decise * 100) : null,
      daAutorizzare: lista.filter(function (t) { return t.richiede_autorizzazione && t.autorizzazione_stato === 'in_attesa'; }).length
    };
  }

  /* ── IL CENSIMENTO «FAST» ──────────────────────────────────────────────────
     Persona fisica: nome, cognome e codice fiscale VALIDO. Societa': ragione
     sociale e partita IVA valida. Un codice sbagliato non diventa un prospect:
     un CF con un refuso e' un doppione che nessuno ritrovera' cercando quello
     giusto. */
  function pivaValida(p) {
    p = String(p || '').replace(/\s/g, '');
    if (!/^\d{11}$/.test(p)) return false;
    var s = 0;
    for (var i = 0; i < 10; i++) {
      var d = +p[i];
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      s += d;
    }
    return (10 - s % 10) % 10 === +p[10];
  }

  function cfValido(cf) {
    var A = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
      ? (function () { try { return require('./anagrafica.js'); } catch (e) { return null; } })()
      : (typeof window !== 'undefined' ? window.Anagrafica : null);
    var c = String(cf || '').toUpperCase().replace(/\s/g, '');
    if (A && A.valido) return !!A.valido(c);
    return /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(c);
  }

  function prospettoFast(d, utenteId) {
    d = d || {};
    var errori = [];
    var tipo = d.tipo === 'giuridica' ? 'giuridica' : 'fisica';
    var riga = { tipo: tipo, lead: true, lead_origine: 'trattativa', creato_da: utenteId || null };
    if (tipo === 'fisica') {
      var nome = String(d.nome || '').trim(), cognome = String(d.cognome || '').trim();
      var cf = String(d.codice_fiscale || '').toUpperCase().replace(/\s/g, '');
      if (!nome) errori.push('Manca il nome.');
      if (!cognome) errori.push('Manca il cognome.');
      if (!cf) errori.push('Manca il codice fiscale.');
      else if (!cfValido(cf)) errori.push('Il codice fiscale non è valido: controlla le lettere e il carattere finale.');
      riga.nome = nome; riga.cognome = cognome; riga.codice_fiscale = cf;
      riga.nominativo = (cognome + ' ' + nome).trim().toUpperCase();
    } else {
      var rs = String(d.ragione_sociale || '').trim();
      var piva = String(d.partita_iva || '').replace(/\s/g, '');
      if (!rs) errori.push('Manca la ragione sociale.');
      if (!piva) errori.push('Manca la partita IVA.');
      else if (!pivaValida(piva)) errori.push('La partita IVA non è valida: sono 11 cifre e l’ultima è di controllo.');
      riga.ragione_sociale = rs; riga.partita_iva = piva;
      riga.nominativo = rs.toUpperCase();
    }
    return { ok: errori.length === 0, errori: errori, riga: errori.length ? null : riga };
  }

  /* ── L'AUTORIZZAZIONE DELLA DIREZIONE ──────────────────────────────────────
     Una trattativa che aspetta un'autorizzazione non si chiude vinta: vorrebbe
     dire emettere quello che la direzione non ha ancora concesso. Il divieto
     vero e' un trigger nel database; questa funzione lo dice prima. */
  function chiudibile(t) {
    if (fase(t && t.status) !== 'vinta') return { ok: true };
    if (t.richiede_autorizzazione && t.autorizzazione_stato !== 'concessa') {
      return { ok: false, motivo: t.autorizzazione_stato === 'negata'
        ? 'La direzione ha negato l’autorizzazione: non si chiude vinta.'
        : 'Aspetta l’autorizzazione della direzione: non si chiude vinta prima.' };
    }
    return { ok: true };
  }

  /* L'evento in Agenda che una trattativa porta con se'. Un id stabile, cosi'
     cambiare la data del richiamo sposta lo stesso evento invece di farne un
     secondo. */
  function richiamo(t) {
    if (!t || !t.recall) return null;
    var data = String(t.recall).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
    var chi = String(t.cliente || 'cliente').trim();
    var cosa = String(t.prodotto || '').trim();
    return {
      id: 'tratt-' + t.id,
      titolo: 'Richiamo: ' + chi + (cosa ? ' — ' + cosa : ''),
      data: data,
      ora: t.recall_ora || null,
      note: 'Trattativa' + (cosa ? ' ' + cosa : '') + (t.compagnia ? ' · ' + t.compagnia : '')
    };
  }

  var API = {
    VERSIONE: VERSIONE, STATI: STATI,
    fase: fase, num: num, valore: valore, fasiCorso: fasiCorso, giorniA: giorniA, richiamoStato: richiamoStato,
    nomeProdotto: nomeProdotto, perProdotto: perProdotto, riepilogo: riepilogo,
    pivaValida: pivaValida, cfValido: cfValido, prospettoFast: prospettoFast,
    chiudibile: chiudibile, richiamo: richiamo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Trattative = API;
})();
