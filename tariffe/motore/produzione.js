/* ═══════════════════════════════════════════════════════════════════════════
   LA PRODUZIONE — le regole  (21/09/2026)

   Due domande che sembrano una sola e non lo sono:

     · «come sta andando quest'anno rispetto all'anno scorso?»  → confronto()
     · «chi l'ha prodotta?»                                     → perProduttore()

   ── LA REGOLA CHE VALE PIÙ DI TUTTE: SI CONFRONTA PERIODO CON PERIODO ────
   Mettere dodici mesi dell'anno scorso accanto a nove dell'anno in corso
   disegna un crollo che non è successo. È il modo più facile di fare una
   riunione sui numeri sbagliati, e non è un caso limite: succede undici mesi
   su dodici. Il taglio al giorno lo fa il database (`iam_produzione_confronto`
   taglia il mese in corso allo stesso giorno nei due anni); qui si pretende
   che l'abbia fatto, e si tiene fuori dai totali tutto ciò che il database ha
   marcato `fuori_confronto`.

   I mesi dell'anno scorso oltre il mese in corso NON si nascondono: sono
   produzione vera, e vederli serve a sapere che cosa c'è ancora da fare
   entro dicembre. Escono a parte, e da soli non entrano in nessun confronto.

   ── QUELLO CHE NON SI SA NON VALE ZERO ───────────────────────────────────
   Una polizza senza premio annuo non è una polizza da zero euro: è una
   polizza di cui il premio non si sa (§36 — frazionate di cui la compagnia
   non ha mandato tutte le rate). Sommarla come zero fa un portafoglio più
   povero del vero, e un numero più basso, su una scrivania, nessuno lo mette
   in dubbio. Si conta a parte e si dichiara. (Regola di casa §8.1.)

   ── NON SI FANNO PERCENTUALI CONTRO LO ZERO ──────────────────────────────
   «Da 0 a 5» non è «+500%»: è «prima non ce n'erano».

   ── E CHI HA PRODOTTO NON SI INDOVINA ────────────────────────────────────
   `creato_da` sulle polizze è una persona sola su tutte e 1720 le righe: è
   chi ha premuto il tasto dell'importazione, non chi ha venduto. Il dato
   vero è il CODICE PRODUTTORE che la compagnia scrive sulla polizza, e per
   trasformarlo in un nome serve una decisione umana (§19). Finché quella
   decisione non c'è, la riga si mostra col codice e dice che il codice non
   è abbinato — mai con un nome scelto per somiglianza, che qui vuol dire
   attribuire a una persona la produzione di un'altra.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'produzione-2026-09-21';

  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu',
                    'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

  function testo(v) { return v == null ? '' : String(v).trim(); }

  function numero(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function num0(v) { var n = numero(v); return n == null ? 0 : n; }
  function intero(v) { var n = numero(v); return n == null ? 0 : Math.round(n); }

  function cent(n) {
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  /* Le date sono ISO e si leggono contando sui numeri della stringa: farle
     passare da `new Date()` + `toISOString()` gli darebbe un fuso orario che
     non hanno, ed è il difetto che il 21/09/2026 faceva nascere le scadenze
     un giorno prima (§44). */
  function annoDi(iso)   { return Number(testo(iso).slice(0, 4)) || null; }
  function meseDi(iso)   { return Number(testo(iso).slice(5, 7)) || null; }
  function giornoDi(iso) { return Number(testo(iso).slice(8, 10)) || null; }

  /* ── LA VARIAZIONE ────────────────────────────────────────────────────────
     Torna sempre il delta, che è vero anche quando la percentuale non esiste.
     `pct` è null quando non si può fare, e non zero: zero vorrebbe dire
     «uguale a prima», che è un'altra cosa. */
  function variazione(prima, adesso) {
    var p = num0(prima), a = num0(adesso);
    var delta = cent(a - p);
    if (p === 0 && a === 0) return { delta: 0, pct: null, verso: 'pari', testo: 'niente, come l’anno prima' };
    if (p === 0)            return { delta: delta, pct: null, verso: 'su',  testo: 'l’anno prima non ce n’era' };
    if (a === 0)            return { delta: delta, pct: -100, verso: 'giu', testo: 'quest’anno nessuna' };
    var pct = Math.round((a - p) / Math.abs(p) * 1000) / 10;
    return {
      delta: delta,
      pct: pct,
      verso: pct > 0 ? 'su' : pct < 0 ? 'giu' : 'pari',
      testo: (pct > 0 ? '+' : '') + String(pct).replace('.', ',') + '%'
    };
  }

  function vuoto() { return { polizze: 0, premio: 0, senza_premio: 0 }; }

  function somma(acc, r) {
    acc.polizze      += intero(r.polizze);
    acc.premio        = cent(acc.premio + num0(r.premio));
    acc.senza_premio += intero(r.senza_premio);
    return acc;
  }

  /* ── IL CONFRONTO ANNO SU ANNO ────────────────────────────────────────────
     `righe` è quello che torna `iam_produzione_confronto`. `al` è la data a
     cui il database ha tagliato (serve solo a scriverlo in faccia a chi
     guarda: il taglio è già stato fatto).

     Torna `null` se le righe non si sono potute leggere: «non risponde» e
     «non c'è niente» sono due cose diverse (§18), e su un grafico di
     andamento la confusione è peggio — un grafico piatto si legge come un
     anno andato male. */
  function confronto(righe, al) {
    if (righe == null) return null;
    if (!Array.isArray(righe)) return null;

    var alIso = testo(al);
    var annoCorr = annoDi(alIso);
    if (!annoCorr) {
      /* Senza la data di riferimento l'anno in corso lo dicono le righe: si
         prende il più alto, che è l'unico modo di non indovinare. */
      annoCorr = righe.reduce(function (m, r) {
        var a = intero(r.anno); return a > m ? a : m;
      }, 0) || null;
    }
    if (!annoCorr) {
      return {
        anno: null, anno_prec: null, al: alIso, mesi: [], massimo: 0,
        totali: { corrente: vuoto(), precedente: vuoto() },
        fuori: { polizze: 0, premio: 0, mesi: [] },
        variazione_premio: variazione(0, 0), variazione_polizze: variazione(0, 0),
        avvisi: ['Non c’è nessuna produzione da confrontare.'], vuoto: true
      };
    }
    var annoPrec = annoCorr - 1;

    var mesi = [];
    for (var i = 1; i <= 12; i++) {
      mesi.push({
        mese: i, nome: MESI[i - 1], breve: MESI_BREVI[i - 1],
        corrente: vuoto(), precedente: vuoto(),
        parziale: false, fuori_confronto: false
      });
    }

    var totCorr = vuoto(), totPrec = vuoto();
    var fuori = { polizze: 0, premio: 0, senza_premio: 0, mesi: [] };

    righe.forEach(function (r) {
      var a = intero(r.anno), m = intero(r.mese);
      if (m < 1 || m > 12) return;
      var cella = mesi[m - 1];
      if (r.parziale) cella.parziale = true;

      if (a === annoCorr) {
        somma(cella.corrente, r);
        somma(totCorr, r);
      } else if (a === annoPrec) {
        somma(cella.precedente, r);
        /* I mesi dell'anno prima oltre il mese in corso NON entrano nel
           totale da confrontare: sommarli è il crollo inventato. */
        if (r.fuori_confronto) {
          cella.fuori_confronto = true;
          fuori.polizze += intero(r.polizze);
          fuori.premio   = cent(fuori.premio + num0(r.premio));
          fuori.senza_premio += intero(r.senza_premio);
          if (fuori.mesi.indexOf(m) < 0) fuori.mesi.push(m);
        } else {
          somma(totPrec, r);
        }
      }
    });

    /* Il mese in corso è parziale anche se non ha prodotto NIENTE. Prendere
       il segno solo dalle righe vuol dire che un mese senza una polizza non
       risulta parziale — e un mese vuoto che sembra finito si legge come un
       mese andato a zero, che è un'altra notizia. Il taglio lo decide la
       data, non la presenza di righe. */
    var meseAlIso = meseDi(alIso);
    if (meseAlIso) mesi[meseAlIso - 1].parziale = true;

    var massimo = 0;
    mesi.forEach(function (c) {
      if (c.corrente.premio   > massimo) massimo = c.corrente.premio;
      if (c.precedente.premio > massimo) massimo = c.precedente.premio;
      c.variazione = variazione(c.precedente.premio, c.corrente.premio);
    });

    var avvisi = [];
    var senza = totCorr.senza_premio + totPrec.senza_premio + fuori.senza_premio;
    if (senza > 0) {
      avvisi.push(senza + (senza === 1
        ? ' polizza non ha un premio annuo e resta fuori dagli importi: non vale zero, il premio non si sa.'
        : ' polizze non hanno un premio annuo e restano fuori dagli importi: non valgono zero, il premio non si sa.'));
    }
    if (fuori.polizze > 0) {
      avvisi.push('Di ' + annoPrec + ' restano fuori dal confronto ' + fuori.polizze +
        (fuori.polizze === 1 ? ' polizza' : ' polizze') + ' dei mesi che quest’anno non sono ancora arrivati.');
    }
    var giorno = giornoDi(alIso), meseAl = meseAlIso;
    if (giorno && meseAl) {
      avvisi.push('I due anni sono contati fino allo stesso giorno, il ' + giorno + ' ' + MESI[meseAl - 1] + '.');
    }
    if (!totCorr.polizze && !totPrec.polizze) {
      avvisi.push('Non c’è ancora produzione in nessuno dei due anni.');
    }

    return {
      anno: annoCorr, anno_prec: annoPrec, al: alIso,
      mesi: mesi, massimo: massimo,
      totali: { corrente: totCorr, precedente: totPrec },
      fuori: fuori,
      variazione_premio:  variazione(totPrec.premio,  totCorr.premio),
      variazione_polizze: variazione(totPrec.polizze, totCorr.polizze),
      avvisi: avvisi,
      vuoto: !totCorr.polizze && !totPrec.polizze && !fuori.polizze
    };
  }

  /* ── CHI HA PRODOTTO ──────────────────────────────────────────────────────
     `righe` è `iam_produzione_mensile` (già aggregata dal database).
     `persone` è l'elenco dei collaboratori, per dare un nome a un id.

     Tre stati, e nessuno dei tre è un'ipotesi:
       · `persona` — la polizza porta un collaboratore_id: qualcuno ha deciso.
       · `codice`  — c'è il codice della compagnia e nessuna decisione: si
                     mostra il codice e si dice che è da abbinare.
       · `diretta` — nessun codice: la polizza non viene da un flusso
                     (nata in QUOTO, o scritta a mano). Non è «sconosciuto»,
                     è l'agenzia. */
  function perProduttore(righe, persone) {
    if (righe == null || !Array.isArray(righe)) return null;

    var nomi = {};
    (persone || []).forEach(function (p) {
      if (!p || !p.id) return;
      var n = testo(p.cognome) + (p.cognome && p.nome ? ' ' : '') + testo(p.nome);
      nomi[p.id] = n || testo(p.email) || testo(p.nominativo) || '—';
    });

    var per = {};
    righe.forEach(function (r) {
      var id = testo(r.collaboratore_id);
      var cod = testo(r.codice_produttore);
      var k, stato, etichetta;
      if (id)      { k = 'p:' + id;  stato = 'persona'; etichetta = nomi[id] || 'Collaboratore non in elenco'; }
      else if (cod){ k = 'c:' + testo(r.compagnia) + ':' + cod; stato = 'codice'; etichetta = cod; }
      else         { k = 'd';        stato = 'diretta'; etichetta = 'Produzione diretta dell’agenzia'; }

      if (!per[k]) {
        per[k] = {
          chiave: k, stato: stato, etichetta: etichetta,
          collaboratore_id: id || null,
          codice: cod || null,
          compagnia: stato === 'codice' ? testo(r.compagnia) : null,
          polizze: 0, premio: 0, senza_premio: 0, anni: {}
        };
      }
      var v = per[k];
      v.polizze += intero(r.polizze);
      v.premio   = cent(v.premio + num0(r.premio));
      v.senza_premio += intero(r.senza_premio);
      var a = intero(r.anno);
      if (a) {
        if (!v.anni[a]) v.anni[a] = vuoto();
        somma(v.anni[a], r);
      }
    });

    var elenco = Object.keys(per).map(function (k) { return per[k]; });

    var totale = elenco.reduce(function (s, v) { return cent(s + v.premio); }, 0);
    elenco.forEach(function (v) {
      /* La quota si fa sul premio noto. Su un totale a zero non si divide:
         una torta senza torta non ha fette. */
      v.quota = totale > 0 ? Math.round(v.premio / totale * 1000) / 10 : null;
    });

    /* Prima chi ha prodotto di più: chi apre questa schermata la apre per la
       prima riga. A parità, prima i codici da abbinare — sono lavoro. */
    var ordine = { codice: 0, persona: 1, diretta: 2 };
    elenco.sort(function (a, b) {
      if (b.premio !== a.premio) return b.premio - a.premio;
      if (b.polizze !== a.polizze) return b.polizze - a.polizze;
      return (ordine[a.stato] || 9) - (ordine[b.stato] || 9);
    });

    var daAbbinare = elenco.filter(function (v) { return v.stato === 'codice'; });
    return {
      righe: elenco,
      totale: totale,
      da_abbinare: daAbbinare.length,
      polizze_da_abbinare: daAbbinare.reduce(function (s, v) { return s + v.polizze; }, 0),
      premio_da_abbinare:  daAbbinare.reduce(function (s, v) { return cent(s + v.premio); }, 0),
      con_persona: elenco.filter(function (v) { return v.stato === 'persona'; }).length
    };
  }

  /* ── PER COMPAGNIA, PER RAMO ──────────────────────────────────────────────
     La stessa somma su una chiave diversa. Una funzione sola, perché due
     copie della stessa somma diventano due totali che un giorno non tornano. */
  function perChiave(righe, chiave) {
    if (righe == null || !Array.isArray(righe)) return null;
    var per = {};
    righe.forEach(function (r) {
      var k = testo(r[chiave]) || '—';
      if (!per[k]) per[k] = { etichetta: k, polizze: 0, premio: 0, senza_premio: 0 };
      somma(per[k], r);
    });
    var elenco = Object.keys(per).map(function (k) { return per[k]; });
    elenco.sort(function (a, b) { return b.premio - a.premio || b.polizze - a.polizze; });
    var totale = elenco.reduce(function (s, v) { return cent(s + v.premio); }, 0);
    elenco.forEach(function (v) { v.quota = totale > 0 ? Math.round(v.premio / totale * 1000) / 10 : null; });
    return { righe: elenco, totale: totale };
  }

  /* Filtra le righe della vista prima di sommarle: un anno, un produttore,
     una compagnia, un ramo. Un filtro assente non filtra (non è «nessuno»). */
  function filtra(righe, f) {
    if (righe == null || !Array.isArray(righe)) return null;
    f = f || {};
    return righe.filter(function (r) {
      if (f.anno && intero(r.anno) !== intero(f.anno)) return false;
      if (f.compagnia && testo(r.compagnia) !== testo(f.compagnia)) return false;
      if (f.ramo && testo(r.ramo) !== testo(f.ramo)) return false;
      if (f.collaboratore_id && testo(r.collaboratore_id) !== testo(f.collaboratore_id)) return false;
      if (f.codice && testo(r.codice_produttore) !== testo(f.codice)) return false;
      if (f.dal_mese && intero(r.mese) < intero(f.dal_mese)) return false;
      if (f.al_mese  && intero(r.mese) > intero(f.al_mese))  return false;
      return true;
    });
  }

  function anniPresenti(righe) {
    if (righe == null || !Array.isArray(righe)) return [];
    var s = {};
    righe.forEach(function (r) { var a = intero(r.anno); if (a) s[a] = true; });
    return Object.keys(s).map(Number).sort(function (a, b) { return b - a; });
  }

  var API = {
    VERSIONE: VERSIONE,
    MESI: MESI, MESI_BREVI: MESI_BREVI,
    confronto: confronto,
    perProduttore: perProduttore,
    perChiave: perChiave,
    filtra: filtra,
    anniPresenti: anniPresenti,
    variazione: variazione,
    cent: cent, numero: numero
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Produzione = API;
})();
