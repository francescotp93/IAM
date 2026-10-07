/* ══ AREA RISERVATA — LA DEMO ═══════════════════════════════════════════════
   «Aggiungi la possibilita' per provare io in demo l'area riservata, cosi' la
   posso visualizzare» — Francesco, 07/10/2026.

   Si apre con area.html?demo (o dal pulsante «Area riservata (demo)» nella
   pagina Convenzioni di IAM). Mostra l'area di un associato INVENTATO: Mario
   Rossi, «Convenzione Demo».

   NIENTE DI VERO SI TOCCA. In demo questo file sostituisce, sul client della
   pagina, ogni strada verso l'esterno: le letture del database, l'accesso e
   le chiamate al nostro server. Nessuna richiesta parte, nessun dato si
   salva: quello che si scrive (un messaggio, una richiesta, i propri dati)
   vive solo finche' la scheda resta aperta. Anche una sessione vera gia'
   aperta nello stesso browser resta intatta: «Esci» in demo non la chiude.

   Senza ?demo nell'indirizzo questo file non fa niente. */
(function () {
  if (!/[?&]demo(=|&|$)/.test(location.search)) return;

  const giorni = (g) => { const d = new Date(); d.setDate(d.getDate() + g); return d.toISOString().slice(0, 10); };
  const istante = (g, ore) => { const d = new Date(); d.setDate(d.getDate() + g); d.setHours(ore || 10, 0, 0, 0); return d.toISOString(); };
  const ora = () => new Date().toISOString();
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

  const CONV = { nome: 'Convenzione Demo', ente: 'Associazione Esempio' };
  const IO = {
    id: 'demo', nome: 'Mario', cognome: 'Rossi', email: 'mario.rossi@esempio.it', telefono: '333 000 0000',
    deve_cambiare_password: false, privacy_accettata_il: '2026-09-01T10:00:00Z', quote_convenzioni: CONV,
  };
  // Il codice fiscale manca apposta: cosi' si vedono il triangolo e gli avvisi.
  const ANAG = {
    cognome: 'Rossi', nome: 'Mario', codice_fiscale: '', data_nascita: '1985-05-14',
    indirizzo: 'Via Garibaldi', civico: '12', comune: 'Trapani', cap: '91100', provincia: 'TP',
    cellulare: '333 000 0000', email: 'mario.rossi@esempio.it', professione: 'Impiegato', partita_iva: '', pec: '',
  };
  // Le stesse etichette di CAMPI_MIEI in area.html: e' con quelle che la pagina
  // riconosce il campo da segnare.
  const NECESSARI = [
    ['cognome', 'Cognome'], ['nome', 'Nome'], ['codice_fiscale', 'Codice fiscale'], ['data_nascita', 'Data di nascita'],
    ['indirizzo', 'Indirizzo'], ['civico', 'Civico'], ['comune', 'Comune'], ['cap', 'CAP'], ['provincia', 'Provincia'],
    ['cellulare', 'Cellulare'], ['email', 'Email'],
  ];
  const manca = () => NECESSARI.filter(([k]) => !String(ANAG[k] || '').trim()).map(([, et]) => et);

  const PRODOTTI = [
    { id: 'demo-auto', nome: 'RC Auto', icona: 'ti-car', modalita: 'quotazione', attivo: true, ordine: 1,
      descrizione: 'Responsabilità civile auto, con lo sconto della convenzione.',
      campi: [{ k: 'targa', etichetta: 'Targa', obbligatorio: true, aiuto: 'Es. AB123CD' },
              { k: 'scadenza', etichetta: 'Scadenza della polizza attuale', tipo: 'data' }] },
    { id: 'demo-moto', nome: 'Moto e scooter', icona: 'ti-motorbike', modalita: 'richiesta', attivo: true, ordine: 2,
      descrizione: 'RC moto, anche per l\'uso stagionale.',
      campi: [{ k: 'targa', etichetta: 'Targa', obbligatorio: true }] },
    { id: 'demo-casa', nome: 'Casa e famiglia', icona: 'ti-home', modalita: 'richiesta', attivo: true, ordine: 3,
      descrizione: 'Incendio, furto e responsabilità civile del capofamiglia.',
      campi: [{ k: 'mq', etichetta: 'Metri quadri', tipo: 'numero' },
              { k: 'uso', etichetta: 'La casa è', tipo: 'scelta', opzioni: ['Abitazione principale', 'Seconda casa', 'Data in affitto'] }] },
    { id: 'demo-infortuni', nome: 'Infortuni', icona: 'ti-first-aid-kit', modalita: 'richiesta', attivo: true, ordine: 4,
      descrizione: 'Infortuni professionali ed extraprofessionali.' },
    { id: 'demo-rcvp', nome: 'RC vita privata', icona: 'ti-shield-check', modalita: 'richiesta', attivo: true, ordine: 5,
      descrizione: 'I danni che fai agli altri nella vita di tutti i giorni.' },
    { id: 'demo-tcm', nome: 'TCM Vita', icona: 'ti-heart-handshake', modalita: 'richiesta', attivo: true, ordine: 6,
      descrizione: 'Temporanea caso morte: un capitale per la tua famiglia.',
      campi: [{ k: 'capitale', etichetta: 'Capitale desiderato (€)', tipo: 'numero', obbligatorio: true }] },
  ];

  const POLIZZE = [
    { numero: 'DEMO/2025/0001', prodotto: 'RC Auto', compagnia: 'Compagnia Esempio', premio: 398.5,
      dal: giorni(-345), al: giorni(20),
      rinnovo: { premio: 389, scadenza: giorni(20),
        bonifico: { intestatario: 'With Us Assicurazioni (demo)', iban: 'IT00 X000 0000 0000 0000 0000 000', banca: 'IBAN di esempio: non usarlo' },
        note: 'Questa è una demo: il pagamento non è attivo.' } },
    { numero: 'DEMO/2026/0014', prodotto: 'Casa e famiglia', compagnia: 'Compagnia Esempio', premio: 210,
      dal: giorni(-60), al: giorni(305), rinnovo: null },
  ];

  let NUMERO = 15;
  const RICHIESTE = [
    { id: 'demo-r2', numero: 15, prodotto_nome: 'Moto e scooter', stato: 'in_lavorazione', creato_il: istante(-2, 16) },
    { id: 'demo-r1', numero: 12, prodotto_nome: 'Infortuni', stato: 'preventivata', creato_il: istante(-6, 9) },
  ];
  const FILI = {
    'demo-r1': {
      messaggi: [
        { creato_il: istante(-6, 9), da_cliente: true, testo: 'Buongiorno, vorrei un preventivo infortuni per me. Faccio un lavoro d\'ufficio.' },
        { creato_il: istante(-5, 11), da_cliente: false, autore_nome: 'Agenzia (demo)', testo: 'Buongiorno Mario, ti abbiamo preparato il preventivo: lo trovi qui sotto e te l\'abbiamo mandato anche per email.' },
      ],
      allegati: [{ id: 'demo-a1', nome: 'preventivo-infortuni.pdf', dimensione: 184320, creato_il: istante(-5, 11), da_cliente: false }],
    },
    'demo-r2': {
      messaggi: [{ creato_il: istante(-2, 16), da_cliente: true, testo: 'La moto la uso solo da aprile a ottobre.' }],
      allegati: [],
    },
  };

  const OFFERTE = [
    { id: 'o1', posto: 'banner', attiva: true, ordine: 1, icona: 'ti-car', titolo: 'RC Auto: -15% per gli associati', testo: 'fino a fine mese' },
    { id: 'o2', posto: 'banner', attiva: true, ordine: 2, icona: 'ti-home', titolo: 'Casa e famiglia', testo: 'la RC del capofamiglia è inclusa' },
    { id: 'o3', posto: 'post', attiva: true, ordine: 3, icona: 'ti-clipboard-check', titolo: 'Check-up delle tue polizze', testo: 'Ti diciamo gratis se sei coperto bene.' },
    { id: 'o4', posto: 'post', attiva: true, ordine: 4, icona: 'ti-users', titolo: 'Infortuni per tutta la famiglia', testo: 'Una polizza, tutti dentro.', al: giorni(45) },
    { id: 'o5', posto: 'scheda', attiva: true, ordine: 5, icona: 'ti-discount', titolo: 'Sconto fedeltà', testo: 'Dal secondo prodotto, il 10% in meno.', al: giorni(40) },
  ];

  const TABELLE = {
    quote_convenzione_associati: () => [IO],
    quote_convenzione_prodotti: () => PRODOTTI,
    quote_convenzione_richieste: () => RICHIESTE.slice().sort((a, b) => b.creato_il.localeCompare(a.creato_il)),
    quote_offerte: () => OFFERTE,
  };

  let DENTRO = true;   // in demo si entra diretti; «Esci» riporta all'accesso finto

  function errore(t) { return Promise.reject(new Error(t)); }

  /* Le risposte del «server», una per ogni porta che area.html usa. */
  async function risposta(via, corpo) {
    await pausa(via === 'sono-qui' ? 0 : 250);
    switch (via) {
      case 'sono-qui': return {};
      case 'mia-password': return { ok: true };
      case 'mio-codice': return { minuti: 10 };
      case 'miei-dati': return { ok: true };
      case 'mia-anagrafica': return { anagrafica: copia(ANAG), manca: manca() };
      case 'salva-anagrafica': {
        for (const k of Object.keys(ANAG)) {
          if (k === 'email' || !(k in corpo)) continue;   // l'email non si cambia da qui, come nel vero
          ANAG[k] = String(corpo[k] == null ? '' : corpo[k]).trim();
        }
        return { anagrafica: copia(ANAG), manca: manca() };
      }
      case 'mie-polizze': return { polizze: copia(POLIZZE) };
      case 'mia-richiesta': {
        const r = RICHIESTE.find((x) => x.id === corpo.id);
        if (!r) return errore('Richiesta non trovata.');
        const f = FILI[r.id] || (FILI[r.id] = { messaggi: [], allegati: [] });
        return { richiesta: copia(r), messaggi: copia(f.messaggi), allegati: copia(f.allegati) };
      }
      case 'mio-messaggio': {
        const f = FILI[corpo.id]; if (!f) return errore('Richiesta non trovata.');
        f.messaggi.push({ creato_il: ora(), da_cliente: true, testo: String(corpo.testo || '') });
        f.messaggi.push({ creato_il: ora(), da_cliente: false, autore_nome: 'Agenzia (demo)',
          testo: 'Messaggio ricevuto. Nella versione vera qui ti risponde una persona dell\'agenzia.' });
        return { ok: true };
      }
      case 'mio-allegato': {
        const f = FILI[corpo.id]; if (!f) return errore('Richiesta non trovata.');
        f.allegati.push({ id: 'demo-a' + Date.now(), nome: corpo.nome || 'file', creato_il: ora(), da_cliente: true,
          dimensione: Math.round(String(corpo.dati || '').length * 0.75) });
        return { ok: true };
      }
      case 'mio-allegato-link':
        return errore('Questa è una demo: i file sono solo d\'esempio e non si aprono.');
      case 'richiesta': {
        const p = PRODOTTI.find((x) => x.id === corpo.prodotto_id);
        if (!p) return errore('Prodotto non trovato.');
        const id = 'demo-r' + Date.now();
        RICHIESTE.push({ id, numero: ++NUMERO, prodotto_nome: p.nome, stato: 'nuova', creato_il: ora() });
        FILI[id] = { messaggi: corpo.note ? [{ creato_il: ora(), da_cliente: true, testo: corpo.note }] : [], allegati: [] };
        return { ok: true };
      }
      default: return {};
    }
  }

  /* Il finto database: abbastanza per le letture che fa area.html
     (select / eq / order / limit), e niente scritture. */
  function installa(db) {
    db.from = (t) => {
      const filtri = [];
      const q = {};
      for (const m of ['select', 'order', 'limit', 'neq', 'in', 'is', 'not']) q[m] = () => q;
      q.eq = (k, v) => { filtri.push([k, v]); return q; };
      q.then = (ok, ko) => Promise.resolve({
        data: copia((TABELLE[t] ? TABELLE[t]() : []).filter((r) => filtri.every(([k, v]) => r[k] === undefined || r[k] === v))),
        error: null,
      }).then(ok, ko);
      return q;
    };
    db.rpc = async () => ({ data: [copia(CONV)], error: null });
    const auth = db.auth;
    auth.getSession = async () => ({ data: { session: DENTRO ? { access_token: 'demo', user: { id: 'demo' } } : null }, error: null });
    auth.signInWithPassword = async () => { DENTRO = true; return { data: {}, error: null }; };
    auth.signOut = async () => { DENTRO = false; return { error: null }; };
    auth.resetPasswordForEmail = async () => ({ data: {}, error: null });
    auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
  }

  /* LA STRISCIA. Sempre a schermo: chi guarda la demo non deve mai poter
     credere di essere nell'area vera, ne' di aver mandato qualcosa davvero. */
  function striscia() {
    if (document.getElementById('demo-striscia')) return;
    const s = document.createElement('div');
    s.id = 'demo-striscia';
    s.setAttribute('role', 'status');
    s.style.cssText = 'background:#fff3df;color:#7a4a05;border-bottom:1px solid #f3d9a8;padding:9px 20px;font-size:13.5px;line-height:1.45;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    s.innerHTML = '<i class="ti ti-eye" style="font-size:18px"></i>'
      + '<span><b>Modalità demo</b> — cliente e dati inventati. Niente viene salvato o inviato all\'agenzia.</span>'
      + '<a href="' + location.pathname + '" style="margin-left:auto;color:#7a4a05;font-weight:700">Esci dalla demo</a>';
    const top = document.querySelector('.top');
    if (top && top.parentNode) top.parentNode.insertBefore(s, top.nextSibling);
    else document.body.insertBefore(s, document.body.firstChild);
  }
  if (document.body) striscia(); else document.addEventListener('DOMContentLoaded', striscia);

  window.AREA_DEMO = { installa, risposta };
})();
