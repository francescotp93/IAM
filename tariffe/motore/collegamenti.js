/* ═══════════════════════════════════════════════════════════════════════════
   LO STATO DEI COLLEGAMENTI — le regole  (Blocco 3 · punto 12-bis, 20/09/2026)

   La schermata «Stato collegamenti» c'era già e rispondeva bene a una domanda
   sola: «adesso, chi risponde?». Quello che non sapeva dire è la domanda che
   si fa davvero in agenzia: «da quando?». Una compagnia scollegata da dieci
   minuti è un intoppo; la stessa compagnia scollegata da sei giorni è
   portafoglio che non si è quotato.

   E non lo sapeva perché la risposta del motore di QUOTO è una FOTOGRAFIA:
   `/fonti/salute` dice com'è adesso e non tiene memoria. La memoria si tiene
   qui, e queste sono le sue regole.

   ── QUELLO CHE «DA QUANDO» VUOL DIRE, E CHE VA DETTO ─────────────────────
   `dal` è da quando QUALCUNO HA GUARDATO e ha visto questo stato, non da
   quando è successo. Di notte non guarda nessuno: una compagnia caduta alle
   due di notte risulta caduta alle otto del mattino. Scrivere «scollegata da
   un'ora» quando lo è da sette sarebbe un numero credibile e falso, quindi
   questo motore marca la prima osservazione (`nuovo`) e la schermata lo dice.

   ── «NON LO DICE» NON È «NON È COLLEGATA» ────────────────────────────────
   Quattro stati, non due. Il servizio che risponde senza dichiarare la
   sessione è un'altra cosa dal servizio che dichiara di essere fuori: il
   primo non si sa, il secondo è un lavoro da fare. Confonderli manda a
   cercare un guasto dalla parte sbagliata — e, peggio, fa ripartire il
   cronometro del «da quando» a ogni oscillazione fra i due.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'collegamenti-2026-09-20';

  /* Ogni quanto la schermata richiede lo stato mentre resta aperta. Il numero
     sta qui e non nella pagina perché è la stessa cosa che la prova misura:
     due numeri scritti in due posti diventano due cadenze diverse. */
  var INTERVALLO_MS = 120000;     /* due minuti */

  /* Ogni quanto si riscrive la riga anche se NON è cambiato niente, solo per
     dire «l'ho guardato adesso». Senza questo freno, una schermata aperta
     scriverebbe una riga per fonte ogni due minuti: un registro che cresce di
     migliaia di righe al giorno e non dice niente di più. */
  var ECO_MS = 600000;            /* dieci minuti */

  var STATI = [
    { k: 'dentro', l: 'collegata',    ordine: 3 },
    { k: 'fuori',  l: 'da collegare', ordine: 1 },
    { k: 'spento', l: 'non risponde', ordine: 0 },
    { k: 'boh',    l: 'non lo dice',  ordine: 2 }
  ];

  function testo(v) { return v == null ? '' : String(v).trim(); }
  function etichetta(k) {
    for (var i = 0; i < STATI.length; i++) if (STATI[i].k === k) return STATI[i].l;
    return k || '';
  }
  function ordine(k) {
    for (var i = 0; i < STATI.length; i++) if (STATI[i].k === k) return STATI[i].ordine;
    return 9;
  }

  /* La classificazione. Stava nella pagina; sta qui perché è una REGOLA, e una
     regola che vive in una schermata non si può provare senza aprire un
     browser (CLAUDE.md §5). */
  function stato(f) {
    if (!f) return 'spento';
    if (!f.raggiungibile) return 'spento';
    if (f.loggato === true) return 'dentro';
    if (f.loggato === false) return 'fuori';
    return 'boh';
  }

  function quando(v) {
    if (!v) return null;
    var t = (v instanceof Date) ? v.getTime() : Date.parse(v);
    return isFinite(t) ? t : null;
  }

  /* «Da tre giorni» si legge; «da 4.317 minuti» no. Una sola unità, quella
     che conta: chi guarda vuole sapere se è di oggi o di settimana scorsa. */
  function durata(dal, ora) {
    var a = quando(dal), b = quando(ora) || Date.now();
    if (a == null) return { ms: null, testo: 'da quando non si sa' };
    var ms = Math.max(0, b - a);
    var min = Math.floor(ms / 60000);
    if (min < 2) return { ms: ms, testo: 'da poco' };
    if (min < 60) return { ms: ms, testo: 'da ' + min + ' minuti' };
    var ore = Math.floor(min / 60);
    if (ore < 24) return { ms: ms, testo: 'da ' + ore + (ore === 1 ? ' ora' : ' ore') };
    var gg = Math.floor(ore / 24);
    return { ms: ms, testo: 'da ' + gg + (gg === 1 ? ' giorno' : ' giorni') };
  }

  /* ═══ IL CONFRONTO FRA QUELLO CHE SI VEDE E QUELLO CHE SI RICORDA ═════════

     Torna una riga per fonte, e l'elenco (più corto) di quelle da scrivere.
     Le tre uscite, e perché ognuna è così:

     · MAI VISTA  → riga nuova, `dal` = adesso, `nuovo: true`. La schermata deve
       dire che quel cronometro parte da ora, non dal guasto.
     · STESSO STATO → `dal` non si tocca. Riscriverlo azzererebbe il «da
       quando» a ogni giro, cioè cancellerebbe l'unica cosa che questa tabella
       serve a sapere. Si riscrive solo l'ora dell'ultima occhiata, e solo ogni
       tanto (`ECO_MS`).
     · CAMBIATO   → `dal` = adesso, un cambio in più contato. È l'unico caso in
       cui il cronometro riparte davvero. */
  function confronta(fonti, salvati, ora, opz) {
    opz = opz || {};
    var adesso = quando(ora) || Date.now();
    var iso = new Date(adesso).toISOString();
    var eco = opz.eco_ms != null ? opz.eco_ms : ECO_MS;

    var mem = {};
    (salvati || []).forEach(function (r) { if (r && r.fonte) mem[r.fonte] = r; });

    var righe = (fonti || []).map(function (f) {
      var k = stato(f);
      var vecchia = mem[f.id] || null;
      var cambiato = !!vecchia && vecchia.stato !== k;
      var nuovo = !vecchia;
      var dal = (nuovo || cambiato) ? iso : (vecchia.dal || iso);
      var scad = vecchia ? (quando(vecchia.visto_il) == null || (adesso - quando(vecchia.visto_il)) >= eco) : true;

      return {
        fonte: f.id,
        nome: testo(f.nome) || f.id,
        stato: k,
        etichetta: etichetta(k),
        dal: dal,
        nuovo: nuovo,
        cambiato: cambiato,
        cambi: (vecchia && Number(vecchia.cambi)) ? Number(vecchia.cambi) + (cambiato ? 1 : 0) : (cambiato ? 1 : 0),
        da_quanto: durata(dal, adesso).testo,
        /* Si scrive quando è cambiato qualcosa, quando è la prima volta, o
           quando l'ultima occhiata è vecchia. Mai a ogni giro. */
        scrivi: nuovo || cambiato || scad,
        visto_il: iso,
        messaggio: (f.visto_dal_servizio && f.visto_dal_servizio.ultimo_messaggio) || null
      };
    });

    /* Prima quelle da sistemare: chi apre questa schermata lo fa per quelle, e
       a parità di stato prima quella ferma da più tempo. */
    righe.sort(function (a, b) {
      var oa = ordine(a.stato), ob = ordine(b.stato);
      if (oa !== ob) return oa - ob;
      var da = quando(a.dal) || 0, db2 = quando(b.dal) || 0;
      return da - db2;
    });

    return {
      righe: righe,
      daScrivere: righe.filter(function (r) { return r.scrivi; }),
      cambiate: righe.filter(function (r) { return r.cambiato; }),
      nuove: righe.filter(function (r) { return r.nuovo; }),
      letto_il: iso
    };
  }

  /* Il riassunto che sta in cima. `da_collegare` NON comprende «non lo dice»:
     sommarli darebbe un numero di lavori da fare che comprende dei forse. */
  function riepilogo(righe) {
    var out = { totale: (righe || []).length, dentro: 0, fuori: 0, spente: 0, incerte: 0, ferme_da_oltre_un_giorno: 0 };
    (righe || []).forEach(function (r) {
      if (r.stato === 'dentro') out.dentro++;
      else if (r.stato === 'fuori') out.fuori++;
      else if (r.stato === 'spento') out.spente++;
      else out.incerte++;
      if (r.stato !== 'dentro' && /giorn/.test(r.da_quanto || '')) out.ferme_da_oltre_un_giorno++;
    });
    return out;
  }

  var API = {
    VERSIONE: VERSIONE,
    INTERVALLO_MS: INTERVALLO_MS, ECO_MS: ECO_MS, STATI: STATI,
    stato: stato, etichetta: etichetta, durata: durata,
    confronta: confronta, riepilogo: riepilogo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Collegamenti = API;
})();
