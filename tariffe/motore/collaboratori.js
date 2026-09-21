/* ═══════════════════════════════════════════════════════════════════════════════
   I COLLABORATORI: UNA FONTE SOLA  (21/09/2026)

   > «In ogni punto dell'app dove si cerca, seleziona o inserisce un
   > collaboratore la fonte deve essere SEMPRE e SOLO la tabella della sezione
   > Collaboratori.» — Francesco.

   La tabella è `quote_collaboratori`, il registro delle PERSONE (CLAUDE.md
   §10). Non è `iam_utenti`, che è il registro degli ACCOUNT: sono due cose
   diverse, e confonderle non dà un errore — dà un nome sbagliato.

   ── LA MAPPATURA, FATTA PRIMA DI TOCCARE (21/09/2026) ────────────────────
   Undici punti in cui si sceglie o si nomina un collaboratore:

     dalla tabella giusta (quote_collaboratori)
       · Titoli › assegna le rate                 `tit-collab`
       · Titoli › chi ha pagato                   `tit-pagatore-collab`
       · Foglio cassa › filtro e correzione       `fc-collab`, `fc-m-collab-sel`
       · Estratto conto › di chi                  `ecp-collab`
       · Scheda cliente › intermediario           `e-intermediario`, `ag-intermediario`
       · Provvigioni › accordi e simulatore       `prv-o-collab`, `prv-s-collab`

     DALLA TABELLA SBAGLIATA, e si vedeva solo leggendo i dati
       · Email al cliente › «il tuo consulente»   leggeva `iam_utenti`
       · Trattative › filtro                      `tr-collab`  → account
       · Trattative › scheda                      `mt-collab`  → account
       · Produzione › filtro                      `prod-collab` → account

   Misurato sul database, ed è la prova che non era un dettaglio: l'unica
   anagrafica che ha un intermediario di riferimento lo ha in
   `quote_collaboratori` e NON in `iam_utenti`. La lettura sbagliata non
   trovava niente, ripiegava su «chi ha creato il preventivo», e il cliente
   leggeva il nome di un altro — che è esattamente il guasto che quel codice
   diceva di aver corretto.

   ── IL TESTO LIBERO, E PERCHÉ NON SI ABBINA A OCCHIO ─────────────────────
   `iam_trattative.collab` contiene «Antonio Anguzza», «Francesco Oddo»,
   «Francesco»: nomi scritti a mano, nessuno dei quali è un identificativo.
   Si possono agganciare, ma con la regola di casa che vale dal 19/09 (§19):

     **aggancia solo se è UNA.** Un nome che tocca una sola persona diventa
     una proposta; due persone che ci somigliano non producono niente.

   «Francesco» da solo, con due Francesco in agenzia, non si abbina: si
   elenca. Un abbinamento sbagliato qui non è un fastidio — è una trattativa
   attribuita a chi non l'ha fatta.

   ── ATTIVI E STORICI ─────────────────────────────────────────────────────
   Nelle scelte NUOVE si mostrano solo gli attivi; su un record storico si
   continua a mostrare anche chi è stato disattivato, altrimenti una riga
   vecchia perderebbe il suo nome. Sono due domande diverse e hanno due
   funzioni diverse (`attivi` e `perScelta`).
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'collaboratori-2026-09-21';

  function testo(v) { return v == null ? '' : String(v).trim(); }

  /* Il nome si compone in UN posto solo. Tre tendine che se lo scrivevano
     ognuna per conto suo sono tre modi di scrivere la stessa persona, e
     nessuno se ne accorge finché due tendine non si guardano insieme (§35). */
  function nome(c) {
    if (!c) return '';
    var n = (testo(c.cognome) + ' ' + testo(c.nome)).trim();
    return n || testo(c.nominativo) || testo(c.email) || '';
  }

  /* `attivo !== false`: una colonna mai riempita non vuol dire «spento».
     Distinguere un `false` scritto da un vuoto è la stessa regola delle
     anagrafiche che nascono a «no» (§42). */
  function eAttivo(c) { return !!c && c.attivo !== false; }

  function attivi(persone) {
    return (persone || []).filter(eAttivo).sort(function (a, b) {
      return nome(a).localeCompare(nome(b), 'it');
    });
  }

  function trova(persone, id) {
    var k = testo(id);
    if (!k) return null;
    for (var i = 0; i < (persone || []).length; i++) {
      if (testo(persone[i].id) === k) return persone[i];
    }
    return null;
  }

  function nomeDi(persone, id) {
    var c = trova(persone, id);
    return c ? nome(c) : '';
  }

  /* ── L'ELENCO DI UNA TENDINA ──────────────────────────────────────────────
     Gli attivi, più — se c'è — la persona già scelta su quella riga anche se
     nel frattempo è stata disattivata: togliendola, riaprire un record vecchio
     lo farebbe sembrare senza collaboratore, e salvarlo glielo toglierebbe
     davvero. */
  function perScelta(persone, scelto) {
    var fuori = [];
    var c = trova(persone, scelto);
    if (c && !eAttivo(c)) fuori.push(c);
    return attivi(persone).concat(fuori);
  }

  /* Le opzioni come testo. `esc` arriva da chi chiama: è l'unica cosa che un
     motore non può avere (§18). */
  function opzioni(persone, scelto, primo, esc) {
    var e = esc || function (s) { return String(s == null ? '' : s); };
    var lista = perScelta(persone, scelto);
    var out = '<option value="">' + e(primo || '— collaboratore —') + '</option>';
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      var sel = testo(c.id) === testo(scelto) ? ' selected' : '';
      var spento = eAttivo(c) ? '' : ' (non più attivo)';
      out += '<option value="' + e(c.id) + '"' + sel + '>' + e(nome(c) + spento) + '</option>';
    }
    return out;
  }

  /* ── L'ABBINAMENTO DEL TESTO LIBERO ───────────────────────────────────────
     Serve a collegare quello che è stato scritto a mano prima che ci fosse una
     tendina. NON decide: propone, e dice quando non può.

     La forma normale toglie accenti, punteggiatura e maiuscole, e ORDINA le
     parole: «Rossi Mario» e «Mario Rossi» sono la stessa persona scritta in
     due ordini, e trattarle come due sarebbe pignoleria; «Rossi» e «Rossi
     Mario» invece no — la seconda ha un'informazione che la prima non ha. */
  function forma(s) {
    return testo(s).toLowerCase()
      .normalize ? testo(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').sort().join(' ')
      : testo(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').sort().join(' ');
  }

  function abbina(libero, persone) {
    var t = testo(libero);
    if (!t) return { testo: t, stato: 'vuoto', collaboratore_id: null, motivo: 'non c’è niente da abbinare' };
    var k = forma(t);
    if (!k) return { testo: t, stato: 'vuoto', collaboratore_id: null, motivo: 'non c’è niente da abbinare' };

    var candidati = (persone || []).filter(function (c) { return forma(nome(c)) === k; });
    /* Seconda strada: l'email scritta per intero. È un recapito e non un
       nome, ma un recapito che tocca una persona sola è un'evidenza forte
       (§19, regola 5). */
    if (!candidati.length) {
      var em = t.toLowerCase();
      candidati = (persone || []).filter(function (c) { return testo(c.email).toLowerCase() === em; });
    }

    if (candidati.length === 1) {
      return { testo: t, stato: 'una', collaboratore_id: candidati[0].id,
               nome: nome(candidati[0]), motivo: '' };
    }
    if (candidati.length > 1) {
      return { testo: t, stato: 'ambiguo', collaboratore_id: null,
               fra: candidati.map(nome),
               motivo: candidati.length + ' persone si chiamano così: non si sceglie a caso' };
    }
    return { testo: t, stato: 'nessuno', collaboratore_id: null,
             motivo: 'nessuno in elenco si chiama così' };
  }

  /* Il piano di collegamento di un elenco di valori liberi. Torna le tre
     famiglie separate, perché sono tre lavori diversi: quello che si può fare
     da solo, quello che vuole una persona, e quello che non c'è. */
  function pianoTesti(valori, persone) {
    var fatti = [], ambigui = [], mancanti = [];
    var visti = {};
    (valori || []).forEach(function (v) {
      var t = testo(v);
      if (!t || visti[t]) return;
      visti[t] = true;
      var r = abbina(t, persone);
      if (r.stato === 'una') fatti.push(r);
      else if (r.stato === 'ambiguo') ambigui.push(r);
      else if (r.stato === 'nessuno') mancanti.push(r);
    });
    return { collegabili: fatti, ambigui: ambigui, sconosciuti: mancanti,
             totale: fatti.length + ambigui.length + mancanti.length };
  }

  var API = {
    VERSIONE: VERSIONE,
    TABELLA: 'quote_collaboratori',
    /* Le colonne che servono ovunque. Una lista sola: due select diverse
       sulla stessa tabella diventano due tendine che mostrano cose diverse. */
    COLONNE: 'id,nome,cognome,email,attivo,iam_id,rui_numero',
    nome: nome, nomeDi: nomeDi, trova: trova,
    attivi: attivi, perScelta: perScelta, opzioni: opzioni,
    eAttivo: eAttivo, forma: forma, abbina: abbina, pianoTesti: pianoTesti
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Collaboratori = API;
})();
