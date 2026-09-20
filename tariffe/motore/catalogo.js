/* ═══════════════════════════════════════════════════════════════════════════
   IL CATALOGO PRODOTTI — anagrafica compagnie e prodotti di compagnia
   (20/09/2026, brief «Anagrafica compagnie e catalogo prodotti»)

   Il problema, misurato sul database prima di scrivere una riga:

     · `quote_compagnie` ha 9 compagnie, e solo HDI e Prima hanno degli alias;
     · un catalogo prodotti NON ESISTE, ne' standard ne' per compagnia;
     · sul portafoglio i prodotti sono STRINGHE, scritte come capita:
       «BLACK», «CASA_E_FAMIGLIA», «FAMIGLIA», «Rischi Catastrofali
       Abitazione (HDI)», «RC Vita Privata · HDI»;
     · le tariffe provvigionali (§28) identificano il prodotto per stringa —
       e la tabella e' VUOTA, quindi non c'e' niente da rompere li' dentro.

   Il ramo NON e' una parola nuova: e' la chiave dei moduli che tutta la casa
   usa gia' (`MODULES` in index.html, `quote_polizze.modulo`) — rca, beni,
   vita, persona, tutela, impresa, rcprof, cauzioni, salute, animali, viaggio.
   Inventarne un secondo vocabolario vorrebbe dire due elenchi che non si
   incrociano (CLAUDE.md §18, «storico»).

   Questo motore e' PURO: nessun database, nessun DOM. Si prova in Node, e lo
   caricano tutti e due i documenti (QUOTO e IAM) — carica, non copia (§10).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* I rami che il sistema conosce. Un prodotto su un ramo che non e' qui non
     si rifiuta — si segnala: un vocabolario che scarta in silenzio fa sparire
     un prodotto e non se ne accorge nessuno (§11, «tipo sconosciuto»). */
  var RAMI = ['rca', 'beni', 'vita', 'persona', 'tutela', 'impresa',
              'rcprof', 'cauzioni', 'salute', 'animali', 'viaggio'];

  /* Le parole che in un nome di compagnia non dicono CHI e': forme societarie
     e parole di contorno. Si tolgono solo nel confronto «per forma ridotta»,
     che e' l'ultima strada e vale solo se la corrispondenza e' UNA. */
  var CONTORNO = ['spa', 's p a', 'srl', 's r l', 'sa', 'assicurazioni',
                  'assicurazione', 'assicurazioni italia', 'compagnia',
                  'insurance', 'group', 'italia', 'italiana spa'];

  function testo(v) {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  /* Normalizza un nome: minuscole, accenti sciolti, tutto cio' che non e'
     lettera o cifra diventa uno spazio, gli spazi si comprimono.
     «CASA_E_FAMIGLIA», «Casa e Famiglia» e «casa  e  famiglia» sono lo stesso
     prodotto scritto da tre persone diverse. La stessa regola vale in SQL
     (`iam_nome_norm`), perche' l'indice unico deve dire la stessa cosa del
     codice: se le due normalizzazioni divergono, il database accetta un
     doppione che il codice credeva impossibile. */
  function norm(s) {
    var t = testo(s).toLowerCase();
    var da = 'àáâäãèéêëìíîïòóôöõùúûüçñ';
    var a  = 'aaaaaeeeeiiiiooooouuuucn';
    var out = '';
    for (var i = 0; i < t.length; i++) {
      var j = da.indexOf(t[i]);
      out += j >= 0 ? a[j] : t[i];
    }
    return out.replace(/[^a-z0-9]+/g, ' ').replace(/^ +| +$/g, '');
  }

  /* La forma ridotta di un nome di compagnia: «HDI Assicurazioni S.p.A.» e
     «HDI» diventano «hdi». Non e' l'identita' — e' un indizio, e vale solo
     dove punta a una compagnia sola. */
  function normCompagnia(s) {
    var n = norm(s);
    CONTORNO.forEach(function (p) {
      n = (' ' + n + ' ').split(' ' + p + ' ').join(' ').replace(/^ +| +$/g, '');
    });
    return n.replace(/ +/g, ' ');
  }

  /* ── LA COMPAGNIA ──────────────────────────────────────────────────────── */

  /* Tre strade, in quest'ordine, e l'ultima e' un indizio:
       1. il nome, normalizzato;
       2. uno degli alias, normalizzato — e' il motivo per cui gli alias
          esistono: sulle polizze e' scritto «HDI Assicurazioni», nel catalogo
          prodotti «HDI» (§11);
       3. la forma ridotta, SOLO se tocca una compagnia sola.
     Due compagnie che si riducono alla stessa forma non producono niente:
     «aggancia solo se e' una» e' la regola di casa (§19), e qui sbagliare
     vuol dire attribuire un portafoglio alla compagnia sbagliata. */
  function risolviCompagnia(nome, compagnie) {
    var n = norm(nome);
    if (!n) return null;
    var elenco = compagnie || [];
    var i, c;
    for (i = 0; i < elenco.length; i++) {
      c = elenco[i];
      if (c && norm(c.nome) === n) return { compagnia: c, come: 'nome' };
    }
    for (i = 0; i < elenco.length; i++) {
      c = elenco[i];
      var al = (c && c.alias) || [];
      for (var k = 0; k < al.length; k++) {
        if (norm(al[k]) === n) return { compagnia: c, come: 'alias', alias: al[k] };
      }
    }
    var rid = normCompagnia(nome);
    if (!rid) return null;
    var cand = elenco.filter(function (x) {
      if (!x) return false;
      if (normCompagnia(x.nome) === rid) return true;
      return ((x.alias) || []).some(function (a) { return normCompagnia(a) === rid; });
    });
    if (cand.length === 1) return { compagnia: cand[0], come: 'forma', forma: rid };
    if (cand.length > 1) {
      return { compagnia: null, come: 'ambiguo',
               motivo: 'il nome «' + testo(nome) + '» somiglia a ' + cand.length +
                       ' compagnie (' + cand.map(function (x) { return x.nome; }).join(', ') +
                       '): decidere a occhio qui vuol dire attribuire un portafoglio alla compagnia sbagliata' };
    }
    return null;
  }

  /* ── IL PRODOTTO DI COMPAGNIA ──────────────────────────────────────────── */

  /* Il confronto e' sempre dentro la coppia compagnia+ramo: «Casa» di HDI e
     «Casa» di Prima sono due prodotti, e due compagnie possono chiamare allo
     stesso modo due cose diverse (e' la regola 3 dei codici collaboratore,
     §19, applicata ai prodotti).
     Gli alias servono dopo una fusione: il nome scartato resta agganciato al
     prodotto tenuto, altrimenti l'importazione della notte dopo lo ricreerebbe
     come nuovo — e la fusione sarebbe da rifare ogni notte. */
  function risolviProdotto(compagniaId, ramo, nome, prodotti) {
    var n = norm(nome);
    if (!compagniaId || !n) return null;
    var r = norm(ramo);
    var elenco = (prodotti || []).filter(function (p) {
      return p && p.compagnia_id === compagniaId && norm(p.ramo) === r;
    });
    var i;
    for (i = 0; i < elenco.length; i++) {
      if (norm(elenco[i].nome) === n) return { prodotto: elenco[i], come: 'nome' };
    }
    for (i = 0; i < elenco.length; i++) {
      var al = elenco[i].alias || [];
      for (var k = 0; k < al.length; k++) {
        if (norm(al[k]) === n) return { prodotto: elenco[i], come: 'alias', alias: al[k] };
      }
    }
    return null;
  }

  /* Il prodotto standard proposto per un nome commerciale: si aggancia solo
     se la corrispondenza e' UNA, e solo dentro lo stesso ramo.
     «BLACK» non somiglia a «RC Auto» in nessun modo che un programma possa
     vedere: l'aggancio allo standard lo decide una persona, e questo lo
     PROPONE. Proporre e decidere non sono la stessa cosa (§19). */
  function proponiStandard(ramo, nome, standard) {
    var n = norm(nome);
    var r = norm(ramo);
    if (!n || !r) return null;
    /* Il ramo del file vale come filtro SOLO se è una parola che conosciamo.
       Se la compagnia scrive «auto» dove noi scriviamo «rca», restringere a
       «auto» non troverebbe mai niente — e il prodotto nascerebbe scollegato
       dalla libreria proprio nel caso in cui la libreria serve di più. Dove
       il ramo non è uno dei nostri, decide il NOME, e il ramo lo porta lo
       standard trovato: è quello che il brief chiede, ed è l'unico verso che
       non inventa una parola. */
    var noto = RAMI.indexOf(r) >= 0;
    var elenco = (standard || []).filter(function (s) {
      return s && s.attivo !== false && (!noto || norm(s.ramo) === r);
    });
    var esatti = elenco.filter(function (s) { return norm(s.nome) === n; });
    if (esatti.length === 1) return { standard: esatti[0], come: 'nome' };
    if (esatti.length > 1) return null;   /* due standard uguali: si sistema la libreria, non si indovina */
    var perCodice = elenco.filter(function (s) {
      return s.codice && norm(s.codice) === n;
    });
    if (perCodice.length === 1) return { standard: perCodice[0], come: 'codice' };
    return null;
  }

  /* ── LE TENDINE ────────────────────────────────────────────────────────── */

  /* Un prodotto non si elimina, si disattiva: le polizze che ci sono sotto
     sono storia, e cancellarlo le renderebbe orfane (e' la stessa regola dei
     conti, §26). Ma un prodotto spento NON deve comparire dove si sceglie che
     cosa vendere oggi — altrimenti si continua a venderlo.
     `dal`/`al` sono la stessa cosa detta col calendario: una validita' finita
     e' un prodotto che oggi non si puo' piu' collocare. */
  function vendibile(p, oggi) {
    if (!p || p.attivo === false) return false;
    var g = oggi || new Date().toISOString().slice(0, 10);
    if (p.dal && String(p.dal) > g) return false;
    if (p.al && String(p.al) < g) return false;
    return true;
  }

  function perTendina(prodotti, compagniaId, ramo, oggi) {
    var r = ramo ? norm(ramo) : null;
    return (prodotti || []).filter(function (p) {
      if (!p) return false;
      if (compagniaId && p.compagnia_id !== compagniaId) return false;
      if (r && norm(p.ramo) !== r) return false;
      return vendibile(p, oggi);
    }).sort(function (a, b) { return norm(a.nome) < norm(b.nome) ? -1 : 1; });
  }

  /* ── IL PIANO DELL'IMPORTAZIONE ────────────────────────────────────────── */

  /* La regola che comanda su tutte, ed e' del brief: **l'import non si ferma
     mai**. Ogni riga finisce in uno di tre posti — agganciata, da creare, o
     dichiarata impossibile con il motivo — e nessuna di queste tre cose e' un
     errore che blocca il resto. Un'importazione che si ferma sulla riga 400
     lascia un portafoglio scritto a meta', e nessuno sa quale meta'.

     E si GUARDA PRIMA DI SCRIVERE (§14): questo produce un piano, che la
     schermata mostra. Un'importazione che scrive prima di farsi vedere e' una
     cosa che si subisce. */
  function pianoCatalogo(opz) {
    var o = opz || {};
    var righe = o.righe || [];
    var compagnie = (o.compagnie || []).slice();
    var prodotti = (o.prodotti || []).slice();
    var standard = o.standard || [];

    var comp = { agganciate: [], daCreare: [], ambigue: [] };
    var prod = { agganciati: [], daCreare: [], senzaRamo: [] };
    var visteComp = {};      /* forma normalizzata → segnaposto della creazione */
    var vistiProd = {};

    righe.forEach(function (r) {
      if (!r) return;
      var nomeComp = testo(r.compagnia).trim();
      var nomeProd = testo(r.prodotto).trim();
      var ramo = testo(r.ramo || r.modulo).trim();

      /* 1. La compagnia. */
      var idComp = null, nuovaComp = null;
      if (!nomeComp) {
        /* Senza il nome dell'emittente non si aggancia e non si crea: creare
           una compagnia «(senza nome)» riempirebbe l'anagrafica di righe che
           nessuno sa cancellare. */
        prod.senzaRamo.push({ prodotto: nomeProd, motivo: 'la riga non dice la compagnia' });
        return;
      }
      var rc = risolviCompagnia(nomeComp, compagnie);
      if (rc && rc.come === 'ambiguo') {
        if (!comp.ambigue.some(function (x) { return norm(x.nome) === norm(nomeComp); })) {
          comp.ambigue.push({ nome: nomeComp, motivo: rc.motivo });
        }
        return;   /* non si aggancia niente sotto una compagnia che non si sa quale sia */
      }
      if (rc && rc.compagnia && String(rc.compagnia.id).indexOf('nuova:') === 0) {
        /* È il segnaposto che un'altra riga dello stesso file ha già prodotto:
           si conta lì, non fra le agganciate. Senza questo ramo l'anteprima
           direbbe «1 compagnia da creare, con 1 riga sotto» su un file che ne
           ha venti — e il numero che conta per decidere è proprio quello. */
        idComp = rc.compagnia.id;
        var seg = comp.daCreare.filter(function (x) { return x.id === idComp; })[0];
        if (seg) seg.righe++;
      } else if (rc && rc.compagnia) {
        idComp = rc.compagnia.id;
        if (!comp.agganciate.some(function (x) { return x.id === idComp; })) {
          comp.agganciate.push({ id: idComp, nome: rc.compagnia.nome, scritto: nomeComp, come: rc.come });
        }
      } else {
        var chiaveC = norm(nomeComp);
        if (!visteComp[chiaveC]) {
          visteComp[chiaveC] = { _nuova: true, id: 'nuova:' + chiaveC, nome: nomeComp,
                                 alias: [], origine: 'import', da_verificare: true, righe: 0 };
          comp.daCreare.push(visteComp[chiaveC]);
          /* La si mette subito nell'elenco in memoria: due righe della stessa
             compagnia nello stesso file non devono produrre due creazioni. */
          compagnie.push({ id: visteComp[chiaveC].id, nome: nomeComp, alias: [] });
        }
        visteComp[chiaveC].righe++;
        idComp = visteComp[chiaveC].id;
      }

      /* 2. Il prodotto. */
      if (!nomeProd) return;   /* una polizza senza prodotto e' un dato mancante, non un prodotto nuovo */
      if (!ramo) {
        prod.senzaRamo.push({ compagnia: nomeComp, prodotto: nomeProd,
          motivo: 'la riga non dice il ramo: un prodotto senza ramo non si puo' + '’' + ' mettere in nessuna tendina' });
        return;
      }
      var rp = risolviProdotto(idComp, ramo, nomeProd, prodotti);
      if (rp) {
        if (!prod.agganciati.some(function (x) { return x.id === rp.prodotto.id; })) {
          prod.agganciati.push({ id: rp.prodotto.id, nome: rp.prodotto.nome,
                                 scritto: nomeProd, come: rp.come, compagnia: nomeComp });
        }
        return;
      }
      var chiaveP = idComp + '|' + norm(ramo) + '|' + norm(nomeProd);
      if (!vistiProd[chiaveP]) {
        var st = proponiStandard(ramo, nomeProd, standard);
        var nuovo = {
          _nuovo: true, id: 'nuovo:' + chiaveP,
          compagnia_id: idComp, compagnia: nomeComp,
          /* Il ramo resta quello STANDARD della libreria quando l'aggancio
             c'e': e' il brief, e ha una ragione — il nome commerciale e' della
             compagnia, il ramo e' di casa nostra, e due rami per lo stesso
             prodotto sono due elenchi che non si incrociano. */
          ramo: st ? st.standard.ramo : ramo,
          ramo_dal_file: ramo,
          nome: nomeProd,
          prodotto_standard_id: st ? st.standard.id : null,
          standard: st ? st.standard.nome : null,
          origine: 'import', da_verificare: true, righe: 0,
          ramo_sconosciuto: RAMI.indexOf(norm(ramo)) < 0 ? ramo : null
        };
        vistiProd[chiaveP] = nuovo;
        prod.daCreare.push(nuovo);
        prodotti.push({ id: nuovo.id, compagnia_id: idComp, ramo: nuovo.ramo,
                        nome: nomeProd, alias: [] });
      }
      vistiProd[chiaveP].righe++;
    });

    return {
      compagnie: comp,
      prodotti: prod,
      conteggi: {
        righe: righe.length,
        compagnie_agganciate: comp.agganciate.length,
        compagnie_da_creare: comp.daCreare.length,
        compagnie_ambigue: comp.ambigue.length,
        prodotti_agganciati: prod.agganciati.length,
        prodotti_da_creare: prod.daCreare.length,
        prodotti_senza_ramo: prod.senzaRamo.length
      }
    };
  }

  /* ── LA FUSIONE DI DUE DOPPIONI ────────────────────────────────────────── */

  /* Due righe per lo stesso prodotto nascono in fretta: l'import scrive
     «CASA_E_FAMIGLIA», una persona scrive «Casa e Famiglia», e la
     normalizzazione non le unisce perche' sono davvero due stringhe diverse
     nei dati storici.

     Fondere NON vuol dire cancellare: il nome scartato diventa un ALIAS del
     tenuto. E' l'unica cosa che fa funzionare la fusione la notte dopo —
     senza, l'importazione ricreerebbe lo scartato come nuovo e la fusione
     sarebbe da rifare ogni notte.

     E non si fondono due prodotti di compagnie diverse, o di rami diversi:
     sarebbe una fusione che cambia di che cosa si sta parlando. */
  function fondi(tenuto, scartato) {
    if (!tenuto || !scartato) return { ok: false, motivo: 'servono due prodotti' };
    if (tenuto.id === scartato.id) return { ok: false, motivo: 'e’ lo stesso prodotto' };
    if (tenuto.compagnia_id !== scartato.compagnia_id) {
      return { ok: false, motivo: 'sono di due compagnie diverse: fonderli cambierebbe di che cosa si sta parlando' };
    }
    if (norm(tenuto.ramo) !== norm(scartato.ramo)) {
      return { ok: false, motivo: 'sono di due rami diversi (' + tenuto.ramo + ' e ' + scartato.ramo + ')' };
    }
    var alias = (tenuto.alias || []).slice();
    var aggiunti = [];
    [scartato.nome].concat(scartato.alias || []).forEach(function (a) {
      var n = norm(a);
      if (!n) return;
      if (norm(tenuto.nome) === n) return;
      if (alias.some(function (x) { return norm(x) === n; })) return;
      alias.push(a);
      aggiunti.push(a);
    });
    /* Lo standard: se il tenuto non ne ha uno e lo scartato si', si eredita —
       e' un'informazione in piu' che qualcuno aveva gia' deciso. Se ne hanno
       due diversi non si sceglie: lo dice, e decide una persona. */
    var standard = tenuto.prodotto_standard_id || null;
    var avvisi = [];
    if (!standard && scartato.prodotto_standard_id) standard = scartato.prodotto_standard_id;
    else if (standard && scartato.prodotto_standard_id && standard !== scartato.prodotto_standard_id) {
      avvisi.push('i due prodotti puntano a due prodotti standard diversi: resta quello del prodotto tenuto');
    }
    return {
      ok: true,
      tenuto: { id: tenuto.id, alias: alias, prodotto_standard_id: standard },
      scartato: { id: scartato.id, attivo: false },
      aliasAggiunti: aggiunti,
      avvisi: avvisi,
      /* Quello che la fusione NON fa, e va detto a chi la conferma: le
         polizze gia' scritte portano il nome come stringa, e non si
         riscrivono. L'alias e' quello che le fa ritrovare. */
      nota: 'Le polizze gia’ scritte continuano a dire «' + testo(scartato.nome) +
            '»: l’alias e’ quello che le fa ritrovare. Niente viene riscritto.'
    };
  }

  /* ── LA VALIDAZIONE DI UNA RIGA SCRITTA A MANO ─────────────────────────── */

  function valida(p, opz) {
    var o = opz || {};
    var errori = [], avvisi = [];
    if (!p || !testo(p.nome).trim()) errori.push('Il nome commerciale non può restare vuoto.');
    if (!p || !testo(p.ramo).trim()) errori.push('Il ramo non può restare vuoto.');
    if (!p || !p.compagnia_id) errori.push('Il prodotto deve appartenere a una compagnia.');
    if (errori.length) return { ok: false, errori: errori, avvisi: avvisi };

    if (RAMI.indexOf(norm(p.ramo)) < 0) {
      /* Non si rifiuta: un ramo che questo sistema non conosce puo' essere
         vero. Ma si VEDE — sparire in silenzio vorrebbe dire che un refuso
         toglie un prodotto da tutte le tendine e non se ne accorge nessuno. */
      avvisi.push('Il ramo «' + p.ramo + '» non è fra quelli che il sistema conosce: il prodotto non comparirà in nessuna tendina.');
    }
    if (p.dal && p.al && String(p.dal) > String(p.al)) {
      errori.push('La validità finisce prima di cominciare.');
    }
    var gia = risolviProdotto(p.compagnia_id, p.ramo, p.nome, (o.prodotti || []).filter(function (x) {
      return x && x.id !== p.id;
    }));
    if (gia) {
      errori.push('Questa compagnia ha già «' + gia.prodotto.nome + '» su questo ramo' +
        (gia.come === 'alias' ? ' (come alias)' : '') + ': se sono la stessa cosa, si fondono.');
    }
    if (p.prodotto_standard_id) {
      var st = (o.standard || []).filter(function (s) { return s && s.id === p.prodotto_standard_id; })[0];
      if (st && norm(st.ramo) !== norm(p.ramo)) {
        errori.push('Il prodotto standard «' + st.nome + '» è del ramo ' + st.ramo +
          ': il ramo lo decide la libreria, non il nome commerciale.');
      }
    }
    return { ok: errori.length === 0, errori: errori, avvisi: avvisi };
  }

  /* ── LA COPERTURA ──────────────────────────────────────────────────────── */

  /* Quanto del portafoglio il catalogo copre gia'. Senza questo numero si
     configura a memoria e ci si accorge del buco quando una tendina esce
     vuota — e' la stessa sezione che la M2 ha messo in Gestione compagnie
     (§28), qui sui prodotti invece che sulle tariffe. */
  function copertura(righe, compagnie, prodotti) {
    var fuori = [], dentro = 0;
    (righe || []).forEach(function (r) {
      if (!r) return;
      var rc = risolviCompagnia(r.compagnia, compagnie);
      var idc = rc && rc.compagnia ? rc.compagnia.id : null;
      var rp = idc ? risolviProdotto(idc, r.ramo || r.modulo, r.prodotto, prodotti) : null;
      if (rp) { dentro++; return; }
      var chiave = testo(r.compagnia) + ' · ' + testo(r.prodotto);
      var v = fuori.filter(function (x) { return x.chiave === chiave; })[0];
      if (!v) {
        fuori.push({ chiave: chiave, compagnia: testo(r.compagnia), prodotto: testo(r.prodotto),
                     ramo: testo(r.ramo || r.modulo), n: 1,
                     motivo: idc ? 'il prodotto non è in catalogo' : 'la compagnia non è in anagrafica' });
      } else v.n++;
    });
    fuori.sort(function (a, b) { return b.n - a.n; });
    return { dentro: dentro, fuori: fuori, totale: (righe || []).length };
  }

  var API = {
    RAMI: RAMI,
    norm: norm,
    normCompagnia: normCompagnia,
    risolviCompagnia: risolviCompagnia,
    risolviProdotto: risolviProdotto,
    proponiStandard: proponiStandard,
    vendibile: vendibile,
    perTendina: perTendina,
    pianoCatalogo: pianoCatalogo,
    fondi: fondi,
    valida: valida,
    copertura: copertura
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Catalogo = API;
})();
