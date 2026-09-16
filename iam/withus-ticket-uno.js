/* ═══════════════════════════════════════════════════════════════════
   IAM — Coda ticket unica
   ───────────────────────────────────────────────────────────────────
   Problema risolto: i ticket esistevano due volte. Quelli aperti da IAM
   stavano in `iam_ticket`, quelli aperti da QUOTO in `quote_ticket`, e
   le due liste non si vedevano. Chi scriveva da una parte non veniva
   letto dall'altra.

   Cosa fa questo file: mostra le due code in un elenco solo, dentro
   IAM. Nessuna tabella viene modificata, nessun dato viene spostato.
   Ogni ticket resta dove è nato e ogni modifica torna sulla sua tabella
   d'origine.

   Come lo fa senza toccare il codice esistente:
   - i ticket di QUOTO entrano in TK_LIST con un id "alias" negativo
     (il ticket 12 di QUOTO diventa -12), così tutti i pulsanti già
     scritti — che passano un numero — continuano a funzionare;
   - le funzioni di scrittura (setTKStato, delTicket, confermaModificaTicket)
     vengono avvolte: se l'id è negativo scrivono su `quote_ticket`,
     altrimenti chiamano l'originale senza modifiche;
   - dopo il rendering viene aggiunta una piccola etichetta di provenienza
     alle righe che arrivano da QUOTO.

   Rimuovendo il tag <script> di questo file, IAM torna esattamente com'era.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ALIAS = {};      // id negativo -> id reale su quote_ticket
  var ATTIVO = true;   // si spegne da solo se la tabella non è leggibile

  function realId(alias) { return ALIAS[alias]; }
  function isQuoto(id) { return Number(id) < 0; }

  /* ── Lettura ──────────────────────────────────────────────────── */

  async function fetchQuoto() {
    if (!ATTIVO || typeof db === 'undefined' || !db) return [];
    try {
      // La visibilità è già imposta dal database (RLS: quote_vede).
      // Qui non si aggiunge nessun filtro di ruolo lato pagina.
      var q = db.from('quote_ticket').select('*').order('creato_il', { ascending: false });
      if (typeof TK_FILTER !== 'undefined' && TK_FILTER && TK_FILTER !== 'tutti') {
        q = q.eq('stato', TK_FILTER);
      }
      var r = await q;
      if (r.error) throw r.error;
      return (r.data || []).map(function (t) {
        var alias = -Math.abs(Number(t.id));
        ALIAS[alias] = t.id;
        return {
          id: alias,
          titolo: t.titolo,
          descrizione: t.descrizione,
          sezione: t.sezione,
          priorita: t.priorita,
          stato: t.stato,
          segnalato_da: t.segnalato_da,
          segnalato_nome: t.segnalato_nome,
          risolto_da: t.risolto_da,
          risolto_nome: t.risolto_nome,
          risolto_il: t.risolto_il,
          creato_il: t.creato_il,
          aggiornato_il: t.aggiornato_il,
          _quoto: true
        };
      });
    } catch (e) {
      // Se per qualsiasi motivo la coda di QUOTO non è leggibile, IAM
      // continua a funzionare esattamente come prima: si mostra solo
      // la sua coda e non si riprova a ogni giro.
      console.warn('[coda unica] ticket QUOTO non leggibili:', e && e.message);
      ATTIVO = false;
      return [];
    }
  }

  function ordina(list) {
    return list.slice().sort(function (a, b) {
      return new Date(b.creato_il || 0) - new Date(a.creato_il || 0);
    });
  }

  function badge() {
    var el = document.getElementById('ai-ticket-badge');
    if (!el || typeof TK_LIST === 'undefined') return;
    var n = TK_LIST.filter(function (t) { return t.stato === 'aperto'; }).length;
    el.style.display = n > 0 ? 'flex' : 'none';
    el.textContent = n;
  }

  /* ── Etichetta di provenienza sulle righe ─────────────────────── */

  function etichetta(quoto) {
    var s = document.createElement('span');
    s.className = 'w1-orig';
    s.textContent = quoto ? 'QUOTO' : 'IAM';
    s.style.cssText = 'font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;' +
      (quoto ? 'background:rgba(2,152,78,.14);color:#02984e;'
             : 'background:var(--surf2);color:var(--txt3);');
    return s;
  }

  /* L'elenco che si vede davvero in IAM è quello della dashboard
     (#dtk-list). #tk-list è rimasto da una versione precedente e in
     pagina non c'è: si marcano entrambi, quello che esiste. Le righe
     non si contano per posizione ma si leggono dall'id nel loro
     onclick, così l'etichetta resta giusta anche se l'elenco è
     accorciato o riordinato. */
  function marcaRighe() {
    if (typeof TK_LIST === 'undefined') return;
    var indice = {};
    TK_LIST.forEach(function (t) { indice[String(t.id)] = !!t._quoto; });

    var dash = document.getElementById('dtk-list');
    if (dash) {
      var voci = dash.querySelectorAll('.dash-ticket-item');
      for (var i = 0; i < voci.length; i++) {
        var v = voci[i];
        if (v.querySelector('.w1-orig')) continue;
        var m = (v.getAttribute('onclick') || '').match(/openEditTicket\(\s*(-?\d+)\s*\)/);
        if (!m) continue;
        var meta = v.querySelector('.dash-ticket-meta') || v;
        meta.appendChild(etichetta(indice[m[1]]));
      }
    }

    var el = document.getElementById('tk-list');
    if (el) {
      var righe = el.children;
      for (var j = 0; j < righe.length && j < TK_LIST.length; j++) {
        var riga = righe[j];
        if (riga.querySelector('.w1-orig')) continue;
        var chips = riga.querySelector('div > div > div:nth-child(2)');
        if (!chips) continue;
        chips.appendChild(etichetta(!!(TK_LIST[j] && TK_LIST[j]._quoto)));
      }
    }
  }

  /* ── Scritture instradate sulla tabella giusta ────────────────── */

  async function quotoUpdate(alias, payload) {
    var id = realId(alias);
    if (id == null) throw new Error('Ticket non trovato.');
    var r = await db.from('quote_ticket').update(payload).eq('id', id);
    if (r.error) throw r.error;
  }

  function nomeUtente() {
    try {
      if (typeof PROFILO !== 'undefined' && PROFILO) {
        return (PROFILO.nome + ' ' + PROFILO.cognome).trim();
      }
    } catch (e) {}
    try { return ME && ME.email; } catch (e) {}
    return null;
  }

  /* ── La sezione dei ticket di QUOTO non va persa ─────────────────
     QUOTO usa sezioni sue (RCA, Infortuni, Richiesta funzione, Altro)
     che non stanno nell'elenco di IAM. Senza questa aggiunta, aprendo
     un ticket di QUOTO la tendina ripartirebbe da "Generale" e al
     salvataggio la sezione vera verrebbe sovrascritta. Qui la sezione
     del ticket viene aggiunta alla tendina se manca. */
  function avvolgiSezioni() {
    var _opt = window.ticketSezioneOptions;
    if (typeof _opt !== 'function') return;
    window.ticketSezioneOptions = function (selected) {
      var html = _opt.apply(this, arguments);
      var s = selected || 'Generale';
      if (html.indexOf('value="' + s + '"') === -1) {
        var e = document.createElement('div');
        e.textContent = s;
        html = '<option value="' + e.innerHTML + '" selected>' + e.innerHTML + '</option>' + html;
      }
      return html;
    };
  }

  function avvolgi() {
    avvolgiSezioni();

    /* setTKStato */
    var _set = window.setTKStato;
    if (typeof _set === 'function') {
      window.setTKStato = async function (id, stato) {
        if (!isQuoto(id)) return _set.apply(this, arguments);
        if (stato === 'risolto' &&
            !confirm('Vuoi segnare questo ticket come RISOLTO? L\'operazione è definitiva.')) return;
        var payload = { stato: stato, aggiornato_il: new Date().toISOString() };
        if (stato === 'risolto') {
          payload.risolto_da = (typeof ME !== 'undefined' && ME) ? ME.id : null;
          payload.risolto_nome = nomeUtente();
          payload.risolto_il = new Date().toISOString();
        }
        try { await quotoUpdate(id, payload); await window.loadTickets(); }
        catch (e) { alert('Errore: ' + (e.message || e)); }
      };
    }

    /* delTicket */
    var _del = window.delTicket;
    if (typeof _del === 'function') {
      window.delTicket = async function (id) {
        if (!isQuoto(id)) return _del.apply(this, arguments);
        if (!confirm('Eliminare questo ticket? È stato aperto dentro QUOTO.')) return;
        try {
          var r = await db.from('quote_ticket').delete().eq('id', realId(id));
          if (r.error) throw r.error;
          await window.loadTickets();
        } catch (e) { alert('Errore: ' + (e.message || e)); }
      };
    }

    /* confermaModificaTicket */
    var _conf = window.confermaModificaTicket;
    if (typeof _conf === 'function') {
      window.confermaModificaTicket = async function () {
        var id = (typeof TK_EDIT_ID !== 'undefined') ? TK_EDIT_ID : null;
        if (!isQuoto(id)) return _conf.apply(this, arguments);
        var g = function (i) { var e = document.getElementById(i); return e ? e.value : ''; };
        var titolo = (g('tke-titolo') || '').trim();
        var err = document.getElementById('tke-err');
        if (!titolo) { if (err) err.textContent = 'Il titolo è obbligatorio.'; return; }
        var stato = g('tke-stato');
        var prec = (typeof TK_LIST !== 'undefined')
          ? TK_LIST.find(function (x) { return x.id === id; }) : null;
        if (stato === 'risolto' && (!prec || prec.stato !== 'risolto')) {
          if (!confirm('Vuoi segnare questo ticket come RISOLTO? L\'operazione è definitiva.')) return;
        } else if (!confirm('Confermi le modifiche al ticket "' + titolo + '"?')) return;
        var payload = {
          titolo: titolo,
          descrizione: (g('tke-descr') || '').trim() || null,
          sezione: g('tke-sezione') || 'Generale',
          priorita: g('tke-priorita'),
          stato: stato,
          aggiornato_il: new Date().toISOString()
        };
        if (stato === 'risolto' && (!prec || prec.stato !== 'risolto')) {
          payload.risolto_da = (typeof ME !== 'undefined' && ME) ? ME.id : null;
          payload.risolto_nome = nomeUtente();
          payload.risolto_il = new Date().toISOString();
        }
        try {
          await quotoUpdate(id, payload);
          var ov = document.getElementById('tk-edit-overlay');
          if (ov) ov.remove();
          await window.loadTickets();
        } catch (e) { if (err) err.textContent = 'Errore: ' + (e.message || e); }
      };
    }

    /* loadTickets: dopo il caricamento di IAM aggiunge la coda di QUOTO */
    var _load = window.loadTickets;
    if (typeof _load !== 'function') return false;
    window.loadTickets = async function () {
      var r = await _load.apply(this, arguments);
      if (typeof TK_LIST === 'undefined') return r;
      var q = await fetchQuoto();
      if (q.length) {
        TK_LIST = ordina(TK_LIST.concat(q));
        try { renderTickets(); } catch (e) {}
        try { renderDashboardTickets(); } catch (e) {}
        badge();
      }
      marcaRighe();
      return r;
    };
    return true;
  }

  function avvia() {
    if (typeof window.loadTickets !== 'function') { setTimeout(avvia, 250); return; }
    if (window.__w1TicketUno) return;
    window.__w1TicketUno = true;
    avvolgi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
