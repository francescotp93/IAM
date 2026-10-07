/* ═══════════════════════════════════════════════════════════════════════════════
   LE FASI DI CARICAMENTO, IN UN POSTO SOLO                    (07/10/2026)

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ IL PROBLEMA, CENSITO.                                                     │
   └───────────────────────────────────────────────────────────────────────────┘
   Il 07/10/2026 i due documenti dichiaravano TREDICI animazioni di attesa
   diverse — `spin`, `qspin`, `qbspin`, `ptrSpin`, `irSpin`, `clCarico`, `qbar`,
   `irBar`, `awLoadBar`, `boot-respiro`, `quotPulse`, `fabPulse`, `w1-respiro` —
   scritte una per schermata, ognuna col suo colore e la sua velocità. E una
   sessantina di punti che scrivevano «Caricamento…» e basta.

   Due costi veri, non estetici:
   · «Caricamento…» non dice che cosa si sta aspettando, quindi quando ci mette
     troppo non si sa se insistere o ricaricare;
   · un cerchio che gira mentre arriva una TABELLA non prepara l'occhio a
     niente, e quando i dati arrivano la pagina salta.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA REGOLA: UN'ATTESA DICE SEMPRE CHE COSA SI STA ASPETTANDO.              │
   └───────────────────────────────────────────────────────────────────────────┘
   Lo scheletro lo dice con la FORMA (arriva un elenco di righe, arrivano tre
   schede), lo stato lo dice con le PAROLE. Per questo `stato()` senza testo non
   torna un'attesa generica: si rifiuta. Una funzione che accetta il vuoto
   rimette in circolo i sessanta «Caricamento…» il giorno dopo.

   Qui dentro c'è solo COSTRUZIONE DI TESTO: niente DOM, niente rete. Così si
   prova in Node su quello che esce davvero, invece di aprire un browser e
   guardare.  Il vestito sta in `withus-tech.css` (classi `.wl-*`).
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'caricamento-2026-10-07';

  /* Quante righe ha senso mostrare. Uno scheletro che riempie la pagina non
     prepara l'occhio: lo stanca, e fa sembrare la pagina più lenta di quanto
     sia. */
  var RIGHE_MAX = 8;

  /* Larghezze che si alternano: una pila di barre tutte uguali legge come una
     tabella anche quando sta arrivando del testo. */
  var LARGHEZZE = ['92%', '74%', '86%', '61%', '80%', '68%'];

  function testo(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── LO STATO: «sto facendo questa cosa» ──────────────────────────────────
     `che` è una frase breve all'infinito o alla prima persona — «Leggo la
     contabilità», «Scarico il documento» — senza i puntini: li mette il
     vestito, e tre puntini scritti a mano dentro a un maiuscoletto spaziato
     diventano tre isole.
     `esito` chiude l'attesa senza cambiare riga: 'fatto' o 'guasto'. */
  function stato(che, esito) {
    var frase = String(che == null ? '' : che).trim().replace(/[.…]+$/, '');
    if (!frase) {
      throw new Error('caricamento: un\'attesa deve dire che cosa si sta aspettando');
    }
    var classe = 'wl-stato'
      + (esito === 'fatto' ? ' wl-fatto' : '')
      + (esito === 'guasto' ? ' wl-guasto' : '');
    return '<div class="' + classe + '" role="status" aria-live="polite">' + testo(frase) + '</div>';
  }

  /* ── LO SCHELETRO: «sta arrivando roba di questa forma» ───────────────────
     `righe` quante barre, `titolo` se la prima è più alta (una scheda che
     comincia con un'intestazione). */
  function scheletro(opz) {
    opz = opz || {};
    var quante = Math.max(1, Math.min(RIGHE_MAX, parseInt(opz.righe, 10) || 3));
    var fuori = '';
    if (opz.titolo) fuori += '<span class="wl-scheletro wl-titolo" style="width:42%"></span>';
    for (var i = 0; i < quante; i++) {
      fuori += '<span class="wl-scheletro" style="width:' + LARGHEZZE[i % LARGHEZZE.length] + '"></span>';
    }
    return '<div class="wl-gruppo" aria-hidden="true">' + fuori + '</div>';
  }

  /* ── I RIQUADRI: la forma di un elenco di schede che sta arrivando ───────── */
  function riquadri(quanti, opz) {
    opz = opz || {};
    var n = Math.max(1, Math.min(RIGHE_MAX, parseInt(quanti, 10) || 3));
    var fuori = '';
    for (var i = 0; i < n; i++) {
      fuori += '<div class="wl-riquadro">' + scheletro({ righe: opz.righe || 2, titolo: true }) + '</div>';
    }
    return '<div class="wl-gruppo" aria-hidden="true">' + fuori + '</div>';
  }

  /* ── LA BARRA: «la pagina sta caricando» ─────────────────────────────────── */
  function barra(opz) {
    opz = opz || {};
    return '<div class="wl-barra' + (opz.sopra ? ' wl-sopra' : '') + '" role="progressbar" aria-label="Caricamento in corso"></div>';
  }

  /* ── L'ANELLO: dentro a un bottone che sta lavorando ─────────────────────── */
  function anello() {
    return '<span class="wl-anello" aria-hidden="true"></span>';
  }

  /* ── IL BLOCCO COMPLETO: lo stato sopra, la forma sotto ───────────────────
     È quello che serve nove volte su dieci: una riga che dice che cosa si sta
     aspettando, e sotto la forma di quello che arriverà. */
  function blocco(che, opz) {
    opz = opz || {};
    return '<div class="wl-attesa">' + stato(che)
      + (opz.riquadri ? riquadri(opz.riquadri, opz) : scheletro(opz))
      + '</div>';
  }

  /* ── L'unico pezzo che tocca il DOM, e sta qui per non farlo scrivere a mano
        in venti schermate. Se l'elemento non c'è non succede niente: una
        schermata che si è chiusa mentre i dati arrivavano non deve esplodere. */
  function dentro(elemento, html) {
    var e = typeof elemento === 'string'
      ? (typeof document !== 'undefined' ? document.getElementById(elemento) : null)
      : elemento;
    if (!e) return false;
    e.innerHTML = html;
    return true;
  }

  var API = {
    VERSIONE: VERSIONE,
    RIGHE_MAX: RIGHE_MAX,
    stato: stato,
    scheletro: scheletro,
    riquadri: riquadri,
    barra: barra,
    anello: anello,
    blocco: blocco,
    dentro: dentro,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Caricamento = API;
})();
