/* ═══════════════════════════════════════════════════════════════════════════════
   CRM · ANALISI — estrarre pezzi di portafoglio  (24/09/2026)

   Si scelgono dei filtri, esce una lista: da lì una campagna, un foglio Excel
   o un PDF. Il motore sta qui, separato dalla schermata, perché due regole di
   questo file non sono di grafica e non devono dipendere da un pulsante.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ REGOLA 1 — LA LISTA PER LA CAMPAGNA NON È LA LISTA CHE ESPORTI.           │
   └───────────────────────────────────────────────────────────────────────────┘
   Sono due cose diverse e devono restare due funzioni diverse.

   L'esportazione in Excel o PDF è un uso INTERNO: l'agenzia guarda il proprio
   portafoglio, e ci sono dentro tutti. La campagna è una COMUNICAZIONE
   COMMERCIALE, e lì entra solo chi ha dato il consenso (art. 6.1.a GDPR).

   Se fossero la stessa funzione con un parametro, prima o poi qualcuno
   passerebbe il parametro sbagliato e partirebbe una campagna a chi non l'ha
   chiesta. Non è un errore che si vede: parte, e basta. Per questo
   `perCampagna()` NON accetta un modo per disattivare il filtro del consenso.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ REGOLA 2 — UN FILTRO SU UN CAMPO VUOTO DEVE DIRLO, NON TORNARE ZERO.      │
   └───────────────────────────────────────────────────────────────────────────┘
   Misurato sul portafoglio vero, 2.536 anagrafiche al 24/09/2026:

       comune ......... 1.954 (105 comuni)     professione ......... 1
       data di nascita  2.490                  condizione lavorativa 1
       cellulare ...... 1.744                  collaboratore ....... 1
       polizze ........ 4.073                  note ................ 23
                                               sposato 3 · figli 2
                                               email 6 · consenso 4

   Filtrare per professione oggi restituisce una riga. Una schermata che
   risponde «0 clienti» senza aggiungere altro fa pensare che il portafoglio
   non abbia quel tipo di cliente; la verità è che quel campo non l'ha
   compilato nessuno. `copertura()` esiste per dirlo accanto a ogni filtro:
   è la differenza fra «non ne abbiamo» e «non lo sappiamo».
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function testo(v) { return String(v == null ? '' : v).trim(); }

  /* Per confrontare i comuni: «SAN VITO LO CAPO», «San Vito lo Capo» e
     «  san vito lo capo » sono lo stesso posto. Gli accenti si tengono — in
     Sicilia «Cefalù» senza accento è un altro modo di scriverlo, ma toglierlo
     accorperebbe nomi che non c'entrano. Si normalizza solo spazi e maiuscole. */
  function chiave(v) { return testo(v).toLowerCase().replace(/\s+/g, ' '); }

  /* ── IL VOCABOLARIO ────────────────────────────────────────────────────────
     Ogni compagnia chiama le cose a modo suo, e finché non si mettono
     d'accordo i filtri danno risposte sbagliate senza dirlo. Misurato sul
     portafoglio vero il 25/09/2026:

         compagnia «PRIMA» ............ 4.073 polizze, rami `rca` e `beni`
         compagnia «HDI» ................. 18 polizze, rami `auto` e `persona`
         compagnia «HDI Assicurazioni» .... 5 polizze, rami `beni` e `persona`
         compagnia «Allianz» .............. 1 polizza,  ramo `rca`

     Tre conseguenze, tutte e tre invisibili a chi guarda il risultato:

       · «clienti HDI» ne trovava 13 invece di 15, perché `HDI` e
         `HDI Assicurazioni` per un confronto esatto sono due aziende diverse;
       · «polizza auto» ne trovava 15 invece di 4.005, perché Prima scrive
         `rca` e HDI scrive `auto` per la stessa cosa;
       · «senza polizza casa» non si poteva nemmeno chiedere: il ramo `casa`
         non esiste, quello che c'è si chiama `beni`.

     Qui sotto le due tabelle che li mettono d'accordo. Si allungano a mano
     quando entra una compagnia nuova, e va bene così: indovinare un
     accorpamento è peggio che dichiararlo. Quello che NON si riconosce resta
     com'è scritto, invece di finire in un mucchio «altro» dove sparisce. */
  var COMPAGNIE = {
    'hdi': 'HDI', 'hdi assicurazioni': 'HDI', 'hdi assicurazioni spa': 'HDI',
    'prima': 'Prima', 'prima assicurazioni': 'Prima', 'prima.it': 'Prima',
    'allianz': 'Allianz', 'allianz spa': 'Allianz',
  };
  var RAMI = {
    'rca': 'Auto', 'auto': 'Auto', 'rc auto': 'Auto', 'autovettura': 'Auto',
    'beni': 'Casa e beni', 'casa': 'Casa e beni', 'abitazione': 'Casa e beni',
    'persona': 'Persona', 'infortuni': 'Persona', 'salute': 'Persona',
    'vita': 'Vita', 'previdenza': 'Previdenza', 'fondo pensione': 'Previdenza',
  };

  function canonico(tabella, v) {
    var k = chiave(v);
    if (!k) return '';
    return tabella[k] || testo(v);
  }
  function compagniaCanonica(v) { return canonico(COMPAGNIE, v); }
  function ramoCanonico(v) { return canonico(RAMI, v); }

  /* Per confrontare: due valori sono lo stesso se lo sono una volta
     ricondotti al vocabolario. Così «HDI Assicurazioni» e «hdi» combaciano, e
     una compagnia che il vocabolario non conosce si confronta con se stessa
     invece di combaciare con tutte. */
  function stessaCompagnia(a, b) { return chiave(compagniaCanonica(a)) === chiave(compagniaCanonica(b)); }
  function stessoRamo(a, b) { return chiave(ramoCanonico(a)) === chiave(ramoCanonico(b)); }

  /* L'ETÀ SI CALCOLA, NON SI STIMA DIVIDENDO I GIORNI PER 365. Chi compie gli
     anni domani oggi ne ha uno in meno, e un filtro «fino a 30» che lo include
     manda l'offerta giovani a chi non ne ha più diritto. */
  function eta(dataNascita, alGiorno) {
    var n = testo(dataNascita); if (!n) return null;
    var d = new Date(n.slice(0, 10) + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    var o = alGiorno ? new Date(String(alGiorno).slice(0, 10) + 'T12:00:00') : new Date();
    var a = o.getFullYear() - d.getFullYear();
    var m = o.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && o.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  }

  /* I tre stati di un sì/no: vero, falso, e «nessuno l'ha chiesto». Il terzo
     non è il secondo. In archivio `sposato` è falso su 2.533 anagrafiche su
     2.536, e non vuol dire che siano tutti celibi: vuol dire che la casella
     non è mai stata toccata. Chi filtra «non sposati» si porterebbe dietro
     l'intero portafoglio. */
  function tri(v) { return v === true ? true : v === false ? false : null; }

  /* Una data come aaaa-mm-gg, o niente. Le date arrivano dal database già in
     questa forma, e confrontate come TESTO si ordinano da sole: niente fusi
     orari, niente `new Date()` che sposta di un giorno a seconda dell'ora. */
  function giorno(v) {
    var m = /^(\d{4}-\d{2}-\d{2})/.exec(testo(v));
    return m ? m[1] : null;
  }

  /* `giorniDopo('2026-09-25', 30)` → '2026-10-25'.

     TUTTO IN UTC, e non è pignoleria. Facendo i conti con l'ora locale, il
     giorno in cui cambia l'ora legale dura 23 o 25 ore, e «oggi più 30» può
     uscire il 24 o il 26. Una finestra «entro 30 giorni» che ne prende 29
     lascia fuori una polizza in scadenza — cioè un cliente che nessuno
     richiama, e nessuno se ne accorge perché il numero esce lo stesso.

     La prima versione si difendeva mettendo l'orario a mezzogiorno. Funziona,
     ma protegge un calcolo fragile invece di renderlo solido — e una prova
     lanciata in UTC (come il nostro contenitore) non può nemmeno accorgersi
     se qualcuno toglie quel mezzogiorno. In UTC non esiste ora legale: il
     conto è sempre lo stesso, ovunque giri. */
  function giorniDopo(dal, n) {
    var g = giorno(dal); if (!g) return null;
    var p = g.split('-');
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]) + Number(n || 0) * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }

  /* Chi è perso, chi è un prospect, chi è attivo: la definizione sta in UN
     motore solo (`portafoglio-stato`), e questo la chiede a lui. Si cerca a
     ogni chiamata perché nel browser i due file possono arrivare in un ordine
     qualunque; se non c'è, i filtri sullo stato non rispondono «tutti» — non
     rispondono affatto, che è la sola risposta onesta. */
  function motoreStato() {
    if (typeof window !== 'undefined' && window.PortafoglioStato) return window.PortafoglioStato;
    if (typeof require === 'function') { try { return require('./portafoglio-stato.js'); } catch (e) { return null; } }
    return null;
  }

  var CAMPI_COPERTURA = [
    { k: 'comune',                e: 'Comune',              pieno: function (r) { return !!testo(r.comune); } },
    { k: 'data_nascita',          e: 'Età',                 pieno: function (r) { return eta(r.data_nascita) != null; } },
    { k: 'professione',           e: 'Professione',         pieno: function (r) { return !!testo(r.professione); } },
    { k: 'condizione_lavorativa', e: 'Condizione lavorativa', pieno: function (r) { return !!testo(r.condizione_lavorativa); } },
    { k: 'sposato',               e: 'Stato famiglia',      pieno: function (r) { return r.sposato === true || r.ha_figli === true; } },
    { k: 'note',                  e: 'Note',                pieno: function (r) { return !!testo(r.note); } },
    { k: 'intermediario_id',      e: 'Collaboratore',       pieno: function (r) { return !!testo(r.intermediario_id); } },
    { k: 'email',                 e: 'Email',               pieno: function (r) { return !!testo(r.email); } },
    { k: 'cellulare',             e: 'Cellulare',           pieno: function (r) { return !!testo(r.cellulare); } },
    { k: 'consenso_marketing',    e: 'Consenso marketing',  pieno: function (r) { return r.consenso_marketing === true; } },
  ];

  /* Quanto è pieno ogni campo: si mostra accanto al filtro, così «0 risultati»
     non si confonde con «campo mai compilato». */
  function copertura(righe) {
    var tot = (righe || []).length;
    return CAMPI_COPERTURA.map(function (c) {
      var n = (righe || []).filter(c.pieno).length;
      return {
        campo: c.k, etichetta: c.e, compilati: n, totale: tot,
        quota: tot ? n / tot : 0,
        /* Sotto il 10% un filtro non discrimina: seleziona il rumore. */
        inutilizzabile: tot > 0 && n / tot < 0.10,
      };
    });
  }

  /* ── IL FILTRO ────────────────────────────────────────────────────────────
     `polizzePerCliente` è una mappa cliente_id → elenco di polizze: si passa
     da fuori perché il portafoglio sta in un'altra tabella, e ricaricarlo qui
     dentro vorrebbe dire due strade per la stessa domanda. */
  function filtra(righe, f, extra) {
    f = f || {}; extra = extra || {};
    var perCliente = extra.polizzePerCliente || {};
    var membriGruppo = extra.membriGruppo || null;   // Set di anagrafica_id
    var oggi = extra.oggi || null;

    var comuni = (f.comuni || []).map(chiave).filter(Boolean);
    var province = (f.province || []).map(chiave).filter(Boolean);
    /* Tutto passa dal vocabolario: chi cerca «Auto» deve trovare anche le
       polizze che la compagnia chiama `rca`, e chi cerca «HDI» anche quelle
       scritte «HDI Assicurazioni». */
    var rami = (f.rami || []).map(function (x) { return chiave(ramoCanonico(x)); }).filter(Boolean);
    var senzaRami = (f.senzaRami || []).map(function (x) { return chiave(ramoCanonico(x)); }).filter(Boolean);
    var compagnie = (f.compagnie || []).map(function (x) { return chiave(compagniaCanonica(x)); }).filter(Boolean);
    var senzaCompagnie = (f.senzaCompagnie || []).map(function (x) { return chiave(compagniaCanonica(x)); }).filter(Boolean);
    /* Gli elenchi di clienti che hanno (o non hanno) una garanzia: li prepara
       il database, perché le garanzie stanno dentro un jsonb e portarsele
       tutte nel browser sono 5 MB a ogni apertura. */
    var conGaranzia = extra.conGaranzia || null;      // Set di cliente_id, o null
    var senzaGaranzia = extra.senzaGaranzia || null;  // idem
    var cerca = chiave(f.testoNote);

    return (righe || []).filter(function (r) {
      if (comuni.length) {
        /* La residenza dichiarata dal cliente batte quella anagrafica quando
           c'è: è quella che lui riconosce come casa sua. */
        var c = chiave(r.res_dich_comune || r.comune);
        if (comuni.indexOf(c) < 0) return false;
      }
      if (f.etaDa != null || f.etaA != null) {
        var a = eta(r.data_nascita, oggi);
        if (a == null) return false;                       // senza data non si può dire
        if (f.etaDa != null && a < f.etaDa) return false;
        if (f.etaA  != null && a > f.etaA)  return false;
      }
      if (f.sposato != null && tri(r.sposato) !== f.sposato) return false;
      if (f.haFigli != null && tri(r.ha_figli) !== f.haFigli) return false;
      if (f.professione && chiave(r.professione).indexOf(chiave(f.professione)) < 0) return false;
      if (f.condizioneLavorativa && chiave(r.condizione_lavorativa) !== chiave(f.condizioneLavorativa)) return false;
      if (f.collaboratoreId && testo(r.intermediario_id) !== testo(f.collaboratoreId)) return false;
      if (f.conNote === true && !testo(r.note)) return false;
      if (cerca && chiave(r.note).indexOf(cerca) < 0) return false;
      if (membriGruppo && !membriGruppo.has(testo(r.id))) return false;
      if (province.length) {
        var pv = chiave(r.res_dich_provincia || r.provincia);
        if (province.indexOf(pv) < 0) return false;
      }

      /* ── QUELLO CHE IL CLIENTE HA, E QUELLO CHE NON HA ─────────────────────
         Le polizze si leggono UNA volta sola: servono a sei filtri diversi, e
         rileggerle sei volte per 2.500 clienti si sente. */
      var pz = perCliente[testo(r.id)] || [];

      if (rami.length) {
        var ha = pz.some(function (p) {
          return rami.indexOf(chiave(ramoCanonico(p.modulo || p.prodotto))) >= 0;
        });
        if (!ha) return false;
      }

      /* L'ASSENZA, ed è il filtro che vale di più: è lì che sta la vendita.
         «Auto SENZA casa», «RCA senza infortuni», «clienti senza previdenza».
         Si compone con `rami`: rami=[auto] + senzaRami=[casa] vuol dire «ha
         l'auto e non ha la casa».

         UN CASO CHE SEMBRA UGUALE E NON LO È: un cliente senza NESSUNA polizza
         passa questo filtro, perché è vero che non ha la casa. Se non lo si
         vuole, si mette anche `rami`. Da solo, `senzaRami` risponde alla
         domanda che gli è stata fatta e non a un'altra che pareva sottintesa. */
      if (senzaRami.length) {
        var haVietato = pz.some(function (p) {
          return senzaRami.indexOf(chiave(ramoCanonico(p.modulo || p.prodotto))) >= 0;
        });
        if (haVietato) return false;
      }

      if (compagnie.length) {
        var haComp = pz.some(function (p) { return compagnie.indexOf(chiave(compagniaCanonica(p.compagnia))) >= 0; });
        if (!haComp) return false;
      }
      if (senzaCompagnie.length) {
        var haCompVietata = pz.some(function (p) { return senzaCompagnie.indexOf(chiave(compagniaCanonica(p.compagnia))) >= 0; });
        if (haCompVietata) return false;
      }

      /* LE GARANZIE. Arrivano già risolte dal database come elenchi di
         clienti: qui si tiene o si scarta, e basta. Il «senza» sottrae lo
         STESSO elenco che il «con» tiene, così le due domande non possono
         divergere — è la regola che ha evitato il guaio delle due scritture
         di «infortuni conducente». */
      if (conGaranzia && !conGaranzia.has(testo(r.id))) return false;
      if (senzaGaranzia && senzaGaranzia.has(testo(r.id))) return false;

      /* LA SCADENZA: basta UNA polizza che scade nella finestra. Si misura da
         `oggi`, che arriva da fuori e non da `new Date()`: così la stessa
         domanda dà la stessa risposta anche fra sei mesi, in una prova. */
      if (f.scadenzaEntroGiorni != null) {
        if (!oggi) return false;              // senza data di riferimento non si può dire
        var limite = giorniDopo(oggi, f.scadenzaEntroGiorni);
        var inScadenza = pz.some(function (p) {
          var s = giorno(p.data_scadenza);
          return s && s >= oggi && s <= limite;
        });
        if (!inScadenza) return false;
      }
      if (f.scadute === true) {
        if (!oggi) return false;
        var haScaduta = pz.some(function (p) {
          var s = giorno(p.data_scadenza);
          return s && s < oggi;
        });
        if (!haScaduta) return false;
      }

      /* IL PREMIO: la somma di quelli annui del cliente. Le polizze che non
         dichiarano il premio NON valgono zero — sarebbe una fascia sbagliata —
         restano fuori dalla somma, e un cliente di cui non si sa niente non
         entra in nessuna fascia invece di entrare in quella più bassa. */
      if (f.premioDa != null || f.premioA != null) {
        var somma = 0, visti = 0;
        pz.forEach(function (p) {
          var v = Number(p.premio_annuo);
          if (p.premio_annuo != null && p.premio_annuo !== '' && !isNaN(v)) { somma += v; visti++; }
        });
        if (!visti) return false;
        somma = Math.round(somma * 100) / 100;
        if (f.premioDa != null && somma < f.premioDa) return false;
        if (f.premioA != null && somma > f.premioA) return false;
      }

      /* ── PERSI, PROSPECT, ATTIVI ──────────────────────────────────────────
         26/09/2026, richiesta di Francesco: «I clienti persi sarebbe sempre
         buono che si potessero trovare con un filtro nella parte crm e
         analisi, e che si potessero dividere per determinate date (il criterio
         deve essere che potrei ritrovare i clienti "persi" che non hanno
         rinnovato una polizza al rinnovo, ovvero QR)».

         Chi è perso, prospect o attivo lo dice `PortafoglioStato`, non questo
         file: le stesse tre parole devono voler dire la stessa cosa nel CRM,
         nella scheda cliente e nell'elenco — altrimenti il filtro trova
         cinquecento nomi e la scheda di uno di quelli dice «attivo».

         SUL CRITERIO «QR». Le quietanze di rinnovo vere in archivio sono DUE
         su 3.218 titoli, perché Prima Assicurazioni — il 99,4% del
         portafoglio — al rinnovo non manda una quietanza: emette una polizza
         nuova. Quindi «non ha rinnovato» si riconosce da due segni, e il
         motore li guarda entrambi: una QR rimasta non incassata (quando la
         compagnia la manda), oppure l'ultima copertura finita alla sua
         scadenza naturale invece che per un annullamento. Chi ha disdetto a
         metà annualità NON è un mancato rinnovo: sono 53 contro 511, ed è
         un'altra telefonata. */
      if (f.stato || f.persoDal || f.persoAl || f.persoAlRinnovo != null) {
        var PS = motoreStato();
        if (!PS || !oggi) return false;   // senza il motore o senza oggi non si afferma niente
        var sc = PS.statoCliente(pz, oggi, extra.titoliPerPolizza || null);
        if (f.stato === 'perso'    && sc.stato !== 'perso') return false;
        if (f.stato === 'attivo'   && sc.stato !== 'attivo') return false;
        if (f.stato === 'prospect' && sc.stato !== 'mai_avuto') return false;
        /* Le date si applicano SOLO a chi è perso: «perso fra il 1° e il 30
           giugno» su un cliente attivo non vuol dire niente, e lasciarlo
           passare riempirebbe la lista di gente da non chiamare.

           NOTA ONESTA. Oggi questa guardia è una cintura in più: chi non è
           perso non ha nessuna `persoIl`, quindi il controllo sulla data lo
           escluderebbe comunque. Resta scritta perché sta in piedi su
           un'invariante del motore accanto — «un cliente non perso non ha una
           data di perdita» — e quell'invariante è pinzata da una prova sua
           (`portafoglio-stato`: «un cliente che non è perso non ha una data di
           perdita»). Se domani qualcuno aggiungesse `persoIl` anche a un
           cliente attivo (per dire «l'ultima copertura finita», che è una cosa
           sensata da volere), senza questa riga il filtro per date comincerebbe
           a pescare clienti vivi e nessuno se ne accorgerebbe: la lista esce. */
        if (f.persoDal || f.persoAl) {
          if (sc.stato !== 'perso' || !sc.persoIl) return false;
          if (f.persoDal && sc.persoIl < giorno(f.persoDal)) return false;
          if (f.persoAl  && sc.persoIl > giorno(f.persoAl))  return false;
        }
        if (f.persoAlRinnovo === true && !(sc.stato === 'perso' && sc.persoAlRinnovo)) return false;
        if (f.persoAlRinnovo === false && sc.stato === 'perso' && sc.persoAlRinnovo) return false;
      }

      if (f.soloClienti === true && r.lead === true) return false;
      if (f.soloLead === true && r.lead !== true) return false;
      return true;
    });
  }

  /* ── CHI SI RIESCE A RAGGIUNGERE, E COME ─────────────────────────────────
     Serve prima di qualunque campagna: una lista di mille nomi con sei email
     non è una lista da mille. */
  function recapiti(righe) {
    var conEmail = [], conCell = [], muti = [];
    (righe || []).forEach(function (r) {
      var e = !!testo(r.email), c = !!testo(r.cellulare);
      if (e) conEmail.push(r);
      if (c) conCell.push(r);
      if (!e && !c) muti.push(r);
    });
    return {
      totale: (righe || []).length,
      email: conEmail.length, cellulare: conCell.length, senzaRecapito: muti.length,
      righeEmail: conEmail, righeCellulare: conCell,
    };
  }

  /* ── LA LISTA PER LA CAMPAGNA ────────────────────────────────────────────
     NON accetta un modo per saltare il consenso: vedi la regola 1 in cima.
     Torna anche quanti sono stati tolti e perché, perché una lista che si
     accorcia senza spiegazione fa pensare a un guasto. */
  function perCampagna(righe, canale) {
    var c = canale === 'sms' || canale === 'whatsapp' ? canale : 'email';
    var conConsenso = (righe || []).filter(function (r) { return r.consenso_marketing === true; });
    var raggiungibili = conConsenso.filter(function (r) {
      return c === 'email' ? !!testo(r.email) : !!testo(r.cellulare);
    });
    return {
      canale: c,
      destinatari: raggiungibili,
      quanti: raggiungibili.length,
      esclusi: {
        senzaConsenso: (righe || []).length - conConsenso.length,
        senzaRecapito: conConsenso.length - raggiungibili.length,
      },
      /* Detto qui e non nella schermata: è una regola, non un'etichetta. */
      perche: 'Una comunicazione commerciale va solo a chi ha dato il consenso (art. 6.1.a GDPR). L\'elenco completo resta disponibile per l\'uso interno e per l\'esportazione.',
    };
  }

  /* ── L'ESPORTAZIONE ──────────────────────────────────────────────────────
     Uso interno: ci sono tutti, consenso compreso o no. Le colonne sono
     scelte e non «tutto quello che c'è»: un foglio Excel che gira per
     l'ufficio con dentro codici fiscali e note non serve a nessuno. */
  var COLONNE = [
    { k: 'nominativo', e: 'Nominativo' },
    { k: 'comune',     e: 'Comune',     v: function (r) { return testo(r.res_dich_comune || r.comune); } },
    { k: 'provincia',  e: 'Provincia',  v: function (r) { return testo(r.res_dich_provincia || r.provincia); } },
    { k: 'eta',        e: 'Età',        v: function (r, o) { var a = eta(r.data_nascita, o); return a == null ? '' : String(a); } },
    { k: 'cellulare',  e: 'Cellulare' },
    { k: 'email',      e: 'Email' },
    { k: 'consenso',   e: 'Consenso marketing', v: function (r) { return r.consenso_marketing === true ? 'Sì' : 'No'; } },
  ];

  function righeEsporta(righe, oggi) {
    return (righe || []).map(function (r) {
      var o = {};
      COLONNE.forEach(function (c) { o[c.e] = c.v ? c.v(r, oggi) : testo(r[c.k]); });
      return o;
    });
  }

  /* CSV per Excel: separatore punto e virgola (è quello che Excel italiano si
     aspetta) e le virgolette raddoppiate dentro i campi. Un nominativo con
     dentro un punto e virgola — succede — spaccherebbe la riga. */
  function csv(righe, oggi) {
    var dati = righeEsporta(righe, oggi);
    var intest = COLONNE.map(function (c) { return c.e; });
    var vir = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    return [intest.map(vir).join(';')]
      .concat(dati.map(function (d) { return intest.map(function (i) { return vir(d[i]); }).join(';'); }))
      .join('\r\n');
  }

  var API = {
    CAMPI_COPERTURA: CAMPI_COPERTURA, COLONNE: COLONNE,
    testo: testo, chiave: chiave, eta: eta, tri: tri,
    giorno: giorno, giorniDopo: giorniDopo,
    COMPAGNIE: COMPAGNIE, RAMI: RAMI,
    compagniaCanonica: compagniaCanonica, ramoCanonico: ramoCanonico,
    stessaCompagnia: stessaCompagnia, stessoRamo: stessoRamo,
    copertura: copertura, filtra: filtra, recapiti: recapiti,
    perCampagna: perCampagna, righeEsporta: righeEsporta, csv: csv,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.CrmAnalisi = API;
})();
