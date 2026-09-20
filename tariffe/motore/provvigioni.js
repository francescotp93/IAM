/* ═══════════════════════════════════════════════════════════════════════════════
   PROVVIGIONI: TARIFFE DI AGENZIA, RETROCESSIONI E GRUPPI — Brief #02, M2
   (20/09/2026)

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ LA MISURA CHE COMANDA SU TUTTO IL RESTO, presa sul database vero prima di │
   │ scrivere una riga di codice.                                              │
   │                                                                           │
   │ Sul prodotto BLACK di PRIMA ci sono 13 rate con la provvigione dichiarata │
   │ dalla compagnia, e portano DODICI ALIQUOTE DIVERSE: da 0,00% a 13,85%.    │
   │                                                                           │
   │ Su una RC Auto la provvigione cambia garanzia per garanzia (il flusso lo  │
   │ dice in REC042) e il mix di garanzie cambia da polizza a polizza. Quindi  │
   │ UNA PERCENTUALE PER PRODOTTO NON PUÒ CALCOLARE QUELLA PROVVIGIONE.        │
   │                                                                           │
   │ Perciò, la regola numero uno di questo motore:                            │
   │                                                                           │
   │   **LA PROVVIGIONE DICHIARATA DALLA COMPAGNIA VINCE SEMPRE.**             │
   │                                                                           │
   │ L'aliquota configurata non la corregge e non la sostituisce mai. Serve a  │
   │ due cose, che sono un'altra cosa:                                         │
   │                                                                           │
   │   1. PREVEDERE dove la compagnia non dichiara niente. E succede: su HDI   │
   │      sono 38 rate su 38 senza provvigione.                                │
   │   2. CONTROLLARE dove dichiara: uno scostamento fra quello che arriva e   │
   │      quello pattuito è una cosa da guardare, non da correggere da soli.   │
   └───────────────────────────────────────────────────────────────────────────┘

   LE ALTRE CINQUE REGOLE, ognuna con la sua prova e la sua controprova.

   2. **Quello che è previsto viaggia marcato.** Una provvigione ricavata da
      un'aliquota esce con `stimata: true` e il motivo, e chi somma i totali
      la tiene separata. «Una riga stimata dentro un totale è una lite che si
      perde» (CLAUDE.md §17), e qui la lite è con un collaboratore.

   3. **La retrocessione si applica alla PROVVIGIONE DI AGENZIA, mai al
      premio** (brief §2.3). Il 60% di 41,21 € non è il 60% di 390 €: il
      secondo fa 234 €, un numero credibile e sei volte più grande di quello
      che l'agenzia incassa davvero.

   4. **Il margine dell'agenzia si ricava per DIFFERENZA**, non con una seconda
      percentuale: due arrotondamenti separati su 33,33 al 50% fanno 16,67 +
      16,67 = 33,34, e quel centesimo finisce in un documento che si manda
      fuori (§17).

   5. **Niente default inventati.** Nessuna tariffa per quella compagnia e quel
      ramo vuol dire nessun calcolo, col motivo scritto accanto. Non esiste una
      «percentuale di riserva»: se non è concordata, non c'è (§17).

   6. **Si usa l'aliquota vigente ALLA DATA, non quella di oggi.** Cambiare una
      percentuale non riscrive il passato: gli estratti conto già mandati sono
      documenti su cui si è litigato, e devono continuare a dire lo stesso
      numero. È il punto aperto 1 del brief, deciso: la storicizzazione si fa.

   Il motore NON tocca il database e NON disegna: calcola. Lo caricano IAM e il
   preventivatore dallo stesso file.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = '2026-09-20';

  /* ═══ IL VOCABOLARIO DEI RAMI ═════════════════════════════════════════════
     È il `modulo` della polizza, non il nome del prodotto. Misurato: i nomi
     dei prodotti sono testo libero e sporco («BLACK», «CASA_E_FAMIGLIA»,
     «RC Vita Privata · HDI» — tre convenzioni di scrittura su cinque
     prodotti), mentre il modulo è pulito e chiuso. Una tariffa agganciata al
     nome del prodotto è una tariffa che non trova mai la sua polizza. */
  var RAMI = [
    { k: 'rca',          l: 'RC Auto e veicoli' },
    { k: 'beni',         l: 'Beni e patrimonio' },
    { k: 'persona',      l: 'Persona' },
    { k: 'salute',       l: 'Salute' },
    { k: 'vita',         l: 'Vita e previdenza' },
    { k: 'impresa',      l: 'Imprese e professioni' },
    { k: 'cauzioni',     l: 'Cauzioni e fideiussioni' },
    { k: 'viaggio',      l: 'Viaggio' },
    { k: 'tutelalegale', l: 'Tutela legale' },
    { k: 'altro',        l: 'Altro' }
  ];

  /* ═══ ATTREZZI ════════════════════════════════════════════════════════════ */

  /* Arrotondamento SIMMETRICO: `Math.round(-0.5)` in JavaScript fa `-0`, cioè
     arrotonda verso l'alto anche i negativi, e gli storni esistono (§17). */
  function cent(n) {
    if (n == null || !isFinite(n)) return null;
    var s = n < 0 ? -1 : 1;
    return s * Math.round(Math.abs(n) * 100) / 100;
  }

  function testo(v) { return v == null ? '' : String(v).trim(); }

  function numero(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[\s %€]/g, '');
    if (/,\d{1,3}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  /* IL CONFRONTO DEI NOMI, e perché non è esatto.
     Misurato: sulle polizze c'è scritto «HDI Assicurazioni» e «PRIMA»
     (maiuscolo); nel catalogo «HDI» e «Prima». Un confronto carattere per
     carattere non aggancerebbe nemmeno una delle 23 polizze di Prima, e le
     tariffe resterebbero inerti senza che nessuno capisca perché. */
  function chiave(v) {
    var s = testo(v).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* Il nome scritto sulla polizza risolto in quello del catalogo, passando
     dagli alias (`quote_compagnie.alias`). Se non si riconosce si torna il
     nome normalizzato com'è: **non si inventa un aggancio**, ma non si perde
     nemmeno l'informazione. */
  function risolviCompagnia(nome, catalogo) {
    var k = chiave(nome);
    if (!k) return null;
    var lista = catalogo || [];
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if (!c) continue;
      if (chiave(c.nome) === k) return testo(c.nome);
      var al = c.alias || [];
      for (var j = 0; j < al.length; j++) if (chiave(al[j]) === k) return testo(c.nome);
    }
    return testo(nome);
  }

  function etichettaRamo(k) {
    for (var i = 0; i < RAMI.length; i++) if (RAMI[i].k === k) return RAMI[i].l;
    return testo(k) || '—';
  }

  /* ═══ LA VALIDITÀ NEL TEMPO ═══════════════════════════════════════════════
     Regola 6. Una riga vale se `dal <= data` e (`al` è vuoto oppure
     `al >= data`). Senza data si guarda l'oggi — ma chi calcola su una rata
     passa SEMPRE la data della rata, e c'è una prova che lo pretende. */
  function oggiIso() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function vigente(r, data) {
    if (!r) return false;
    var d = testo(data) || oggiIso();
    var dal = testo(r.dal);
    var al = testo(r.al);
    if (dal && dal > d) return false;
    if (al && al < d) return false;
    return true;
  }

  function vigenti(righe, data) {
    return (righe || []).filter(function (r) { return vigente(r, data); });
  }

  /* ═══ TROVARE LA TARIFFA ══════════════════════════════════════════════════
     Più specifico batte più generico: una riga con il prodotto vince su una
     riga di solo ramo. A parità di specificità vince la più RECENTE per `dal`:
     due righe vigenti con la stessa chiave non dovrebbero esistere (c'è un
     indice unico che lo impedisce), ma se il database venisse toccato a mano
     è meglio una regola dichiarata che un risultato a caso. */
  function punteggio(r) { return testo(r.prodotto) ? 2 : 0; }

  function combacia(r, q) {
    if (chiave(r.compagnia) !== chiave(q.compagnia)) return false;
    if (chiave(r.ramo) !== chiave(q.ramo)) return false;
    var p = testo(r.prodotto);
    if (p && chiave(p) !== chiave(q.prodotto)) return false;
    return true;
  }

  function tariffaPer(righe, q) {
    q = q || {};
    var cand = vigenti(righe, q.data).filter(function (r) { return combacia(r, q); });
    if (!cand.length) return null;
    cand.sort(function (a, b) {
      var d = punteggio(b) - punteggio(a);
      if (d) return d;
      return testo(b.dal) < testo(a.dal) ? -1 : (testo(b.dal) > testo(a.dal) ? 1 : 0);
    });
    return cand[0];
  }

  /* ═══ LA RETROCESSIONE ════════════════════════════════════════════════════
     Gerarchia del brief §2.2: override del collaboratore → default del
     prodotto/ramo. Fra gli override vince il più specifico: prodotto (4) >
     ramo+compagnia (3) > compagnia (2) > ramo (1) > accordo generale (0).

     Se non c'è né l'uno né l'altro, **non si inventa niente**: la risposta è
     `null` col motivo. Non esiste una percentuale di riserva (regola 5). */
  function specificitaOverride(r) {
    var n = 0;
    if (testo(r.prodotto)) n += 4;
    if (testo(r.compagnia)) n += 2;
    if (testo(r.ramo)) n += 1;
    return n;
  }

  function combaciaOverride(r, q) {
    if (testo(r.collaboratore_id) !== testo(q.collaboratore_id)) return false;
    if (testo(r.compagnia) && chiave(r.compagnia) !== chiave(q.compagnia)) return false;
    if (testo(r.ramo) && chiave(r.ramo) !== chiave(q.ramo)) return false;
    if (testo(r.prodotto) && chiave(r.prodotto) !== chiave(q.prodotto)) return false;
    return true;
  }

  function retrocessionePer(override, tariffe, q) {
    q = q || {};
    if (testo(q.collaboratore_id)) {
      var cand = vigenti(override, q.data).filter(function (r) { return combaciaOverride(r, q); });
      if (cand.length) {
        cand.sort(function (a, b) {
          var d = specificitaOverride(b) - specificitaOverride(a);
          if (d) return d;
          return testo(b.dal) < testo(a.dal) ? -1 : (testo(b.dal) > testo(a.dal) ? 1 : 0);
        });
        var v = numero(cand[0].retrocessione);
        if (v != null) return { perc: v, fonte: 'collaboratore', riga: cand[0] };
      }
    }
    var t = tariffaPer(tariffe, q);
    if (t) {
      var d = numero(t.retrocessione_default);
      /* ZERO È UN ACCORDO, e si conta. Vuoto è un'altra cosa e esce col
         motivo: è la stessa distinzione dell'estratto conto (§17). */
      if (d != null) return { perc: d, fonte: 'default', riga: t };
    }
    return { perc: null, fonte: null, riga: null,
             motivo: 'Nessuna retrocessione concordata per ' + (testo(q.compagnia) || '—') + ' · ' + etichettaRamo(q.ramo) };
  }

  /* ═══ L'INDIRETTO DEL CAPO GRUPPO ═════════════════════════════════════════
     Chi produce sta in un gruppo; il capo di quel gruppo prende una
     percentuale sulla provvigione di agenzia della sua produzione.

     Due cose che il motore NON fa:
     · **il capo non prende l'indiretto su se stesso.** Sarebbe una
       retrocessione in più travestita da indiretto, e la sua quota diretta ce
       l'ha già;
     · **non si somma l'indiretto di due gruppi.** Una persona vigente in due
       gruppi vorrebbe dire due capi pagati sulla stessa produzione: il
       database lo vieta con un indice unico, e qui si prende comunque UNA
       riga sola, la più recente, invece di sommarle in silenzio. */
  function gruppoDi(membri, collaboratoreId, data) {
    var cand = vigenti(membri, data).filter(function (m) {
      return m && testo(m.collaboratore_id) === testo(collaboratoreId);
    });
    if (!cand.length) return null;
    cand.sort(function (a, b) { return testo(b.dal) < testo(a.dal) ? -1 : (testo(b.dal) > testo(a.dal) ? 1 : 0); });
    return cand[0];
  }

  function indirettoPer(gruppi, membri, q) {
    q = q || {};
    var m = gruppoDi(membri, q.collaboratore_id, q.data);
    if (!m) return { perc: null, capo_id: null, gruppo: null };
    var g = (gruppi || []).filter(function (x) {
      return x && testo(x.id) === testo(m.gruppo_id) && x.attivo !== false && vigente(x, q.data);
    })[0];
    if (!g) return { perc: null, capo_id: null, gruppo: null };
    if (!testo(g.capo_id)) return { perc: null, capo_id: null, gruppo: g, motivo: 'Il gruppo «' + testo(g.nome) + '» non ha un capo gruppo.' };
    /* Il capo non prende l'indiretto sulla propria produzione. */
    if (testo(g.capo_id) === testo(q.collaboratore_id)) {
      return { perc: null, capo_id: null, gruppo: g, motivo: 'È il capo del gruppo: sulla sua produzione non c’è indiretto.' };
    }
    /* L'override del singolo membro vince sulla percentuale del gruppo. */
    var p = numero(m.indiretto);
    if (p == null) p = numero(g.indiretto);
    if (p == null) return { perc: null, capo_id: testo(g.capo_id), gruppo: g, motivo: 'Il gruppo «' + testo(g.nome) + '» non ha una percentuale di indiretto.' };
    return { perc: p, capo_id: testo(g.capo_id), gruppo: g, membro: m };
  }

  /* ═══ IL CALCOLO ══════════════════════════════════════════════════════════

     Entra una rata (premio e, se c'è, la provvigione dichiarata dalla
     compagnia) più la configurazione. Esce chi prende che cosa, e quello che
     non si sa dire esce come motivo — mai come zero.

     La regola 1 vive tutta in queste otto righe: `provvigione` è quella
     dichiarata se c'è; solo se manca si usa l'aliquota, e allora la riga è
     `stimata`. */
  function calcola(opz) {
    opz = opz || {};
    var premio = numero(opz.premio);
    var dichiarata = numero(opz.provvigione_dichiarata);
    /* IL NOME SI RISOLVE QUI, UNA VOLTA SOLA, e non lo si lascia fare a chi
       chiama. Sulle polizze c'è scritto «HDI Assicurazioni»; la tariffa è
       intestata a «HDI». Senza gli alias quella tariffa non si aggancia, e il
       difetto è invisibile: nessun errore, solo una provvigione che non si
       calcola mai. L'ha trovato la prova, non la rilettura — e se la
       risoluzione stesse in chi chiama, prima o poi uno dei chiamanti se ne
       dimenticherebbe. */
    var compagnia = opz.catalogo ? risolviCompagnia(opz.compagnia, opz.catalogo) : opz.compagnia;
    var q = {
      compagnia: compagnia, ramo: opz.ramo, prodotto: opz.prodotto,
      collaboratore_id: opz.collaboratore_id, data: opz.data
    };
    var tar = tariffaPer(opz.tariffe, q);
    var out = {
      premio: cent(premio),
      provvigione_agenzia: null, stimata: false,
      aliquota: tar ? numero(tar.aliquota_agenzia) : null,
      quota_collaboratore: null, perc_retrocessione: null, fonte_retrocessione: null,
      indiretto: null, perc_indiretto: null, capo_id: null,
      margine_agenzia: null,
      scostamento: null,
      motivi: [], tariffa: tar || null
    };

    /* ── 1. la provvigione di agenzia ───────────────────────────────────── */
    if (dichiarata != null) {
      out.provvigione_agenzia = cent(dichiarata);
      /* Il CONTROLLO, non la correzione: se la compagnia dichiara una cosa
         molto diversa da quella pattuita si dice, e decide una persona. */
      if (out.aliquota != null && premio != null && premio > 0) {
        var prevista = cent(premio * out.aliquota / 100);
        out.scostamento = { previsto: prevista, dichiarato: out.provvigione_agenzia, delta: cent(out.provvigione_agenzia - prevista) };
      }
    } else if (out.aliquota != null && premio != null) {
      out.provvigione_agenzia = cent(premio * out.aliquota / 100);
      out.stimata = true;
      out.motivi.push('La compagnia non ha dichiarato la provvigione: è calcolata con l’aliquota concordata del ' + out.aliquota + '%.');
    } else {
      out.motivi.push(tar
        ? 'Per ' + (testo(compagnia) || '—') + ' · ' + etichettaRamo(opz.ramo) + ' non è concordata nessuna aliquota di agenzia.'
        : 'Nessuna tariffa concordata per ' + (testo(compagnia) || '—') + ' · ' + etichettaRamo(opz.ramo) + '.');
      return out;
    }

    /* ── 2. la quota del collaboratore ──────────────────────────────────── */
    if (!testo(opz.collaboratore_id)) {
      /* Produzione diretta dell'agenzia: niente retrocessione, e non è un
         difetto. Il margine è tutta la provvigione. */
      out.margine_agenzia = out.provvigione_agenzia;
      return out;
    }
    var retro = retrocessionePer(opz.override, opz.tariffe, q);
    out.perc_retrocessione = retro.perc;
    out.fonte_retrocessione = retro.fonte;
    if (retro.perc == null) {
      out.motivi.push(retro.motivo);
      return out;                       /* regola 5: niente accordo, niente conto */
    }
    out.quota_collaboratore = cent(out.provvigione_agenzia * retro.perc / 100);

    /* ── 3. l'indiretto del capo gruppo ─────────────────────────────────── */
    var ind = indirettoPer(opz.gruppi, opz.membri, q);
    if (ind.perc != null) {
      out.perc_indiretto = ind.perc;
      out.capo_id = ind.capo_id;
      out.indiretto = cent(out.provvigione_agenzia * ind.perc / 100);
    } else if (ind.motivo && ind.gruppo) {
      out.motivi.push(ind.motivo);
    }

    /* ── 4. il margine, PER DIFFERENZA (regola 4) ───────────────────────── */
    out.margine_agenzia = cent(out.provvigione_agenzia - (out.quota_collaboratore || 0) - (out.indiretto || 0));
    /* Un margine negativo vuol dire che retrocessione e indiretto insieme
       superano il 100%: è una configurazione sbagliata, e si DICE. Prima o poi
       qualcuno mette 80 e 30 senza accorgersene. */
    if (out.margine_agenzia < 0) {
      out.motivi.push('Attenzione: retrocessione ' + retro.perc + '% e indiretto ' + out.perc_indiretto + '% insieme superano la provvigione. All’agenzia resta ' + out.margine_agenzia + ' €.');
    }
    return out;
  }

  /* ═══ I TOTALI, CON LE STIME TENUTE DA PARTE (regola 2) ═══════════════════ */
  function totali(righe) {
    var t = {
      movimenti: 0, premi: 0,
      provvigione_agenzia: 0, quota_collaboratori: 0, indiretto: 0, margine_agenzia: 0,
      stimate: 0, provvigione_stimata: 0,
      senza_conto: 0
    };
    (righe || []).forEach(function (r) {
      if (!r) return;
      t.movimenti++;
      t.premi = cent(t.premi + (r.premio || 0));
      if (r.provvigione_agenzia == null) { t.senza_conto++; return; }
      if (r.stimata) {
        /* Le stime si contano a parte e NON entrano nei totali veri: chi legge
           deve poter dire «questi sono i soldi, quelli sono una previsione». */
        t.stimate++;
        t.provvigione_stimata = cent(t.provvigione_stimata + r.provvigione_agenzia);
        return;
      }
      t.provvigione_agenzia = cent(t.provvigione_agenzia + r.provvigione_agenzia);
      t.quota_collaboratori = cent(t.quota_collaboratori + (r.quota_collaboratore || 0));
      t.indiretto = cent(t.indiretto + (r.indiretto || 0));
      t.margine_agenzia = cent(t.margine_agenzia + (r.margine_agenzia || 0));
    });
    return t;
  }

  /* ═══ CHE COSA MANCA PER CALCOLARE ════════════════════════════════════════
     La schermata ha bisogno di sapere quali coppie compagnia+ramo del
     portafoglio non hanno una tariffa: è la lista di lavoro per chi configura,
     e senza di lei le tariffe si scrivono a memoria. */
  function copertura(polizze, tariffe, opz) {
    opz = opz || {};
    var visti = {};
    (polizze || []).forEach(function (p) {
      if (!p) return;
      var comp = risolviCompagnia(p.compagnia, opz.catalogo);
      var k = chiave(comp) + '|' + chiave(p.modulo || p.ramo);
      if (!visti[k]) visti[k] = { compagnia: comp, ramo: testo(p.modulo || p.ramo), polizze: 0, prodotti: {} };
      visti[k].polizze++;
      var pr = testo(p.prodotto);
      if (pr) visti[k].prodotti[pr] = (visti[k].prodotti[pr] || 0) + 1;
    });
    return Object.keys(visti).map(function (k) {
      var v = visti[k];
      var t = tariffaPer(tariffe, { compagnia: v.compagnia, ramo: v.ramo, data: opz.data });
      return {
        compagnia: v.compagnia, ramo: v.ramo, ramo_l: etichettaRamo(v.ramo),
        polizze: v.polizze, prodotti: Object.keys(v.prodotti).sort(),
        tariffa: t || null,
        aliquota: t ? numero(t.aliquota_agenzia) : null,
        retrocessione: t ? numero(t.retrocessione_default) : null,
        coperta: !!(t && numero(t.aliquota_agenzia) != null)
      };
    }).sort(function (a, b) { return b.polizze - a.polizze; });
  }

  function euro(n) {
    var v = numero(n);
    if (v == null) return '—';
    return (v < 0 ? '-' : '') + '€ ' + Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function perc(n) {
    var v = numero(n);
    return v == null ? '—' : String(v).replace('.', ',') + '%';
  }

  var API = {
    VERSIONE: VERSIONE, RAMI: RAMI,
    chiave: chiave, risolviCompagnia: risolviCompagnia, etichettaRamo: etichettaRamo,
    vigente: vigente, vigenti: vigenti, oggiIso: oggiIso,
    tariffaPer: tariffaPer, retrocessionePer: retrocessionePer,
    gruppoDi: gruppoDi, indirettoPer: indirettoPer,
    calcola: calcola, totali: totali, copertura: copertura,
    cent: cent, numero: numero, euro: euro, perc: perc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Provvigioni = API;
})();
