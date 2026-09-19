/* ═══════════════════════════════════════════════════════════════════════════════
   L'ANAGRAFICA DEL CLIENTE — tariffe/motore/anagrafica.js  (19/09/2026, brief M3)

   Quattro cose che la scheda cliente faceva a metà o non faceva:
     1. la data di nascita RICAVATA dal codice fiscale (anno con la regola del
        secolo, mese in lettera, giorno +40 per le donne, omocodia sciolta);
     2. l'età, calcolata al volo e mai salvata — un'età scritta in tabella è
        sbagliata dal giorno dopo;
     3. chi compie gli anni oggi;
     4. il testo degli auguri, con la regola di chi si può contattare.

   Stanno qui e non in `index.html` perché in `index.html` c'erano GIÀ DUE
   parser del codice fiscale (`awCfNascita` e `datiDaCF`), uno senza omocodia
   e uno senza carattere di controllo, che davano due risposte diverse allo
   stesso codice. Due regole per la stessa cosa sono una regola sbagliata che
   nessuno guarda (CLAUDE.md §5). Adesso ce n'è una, provata in Node.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ UN CODICE FISCALE NON VALIDO NON PRODUCE UNA DATA. Il carattere di        │
   │ controllo si verifica: un refuso in un codice produce una data credibile  │
   │ e falsa, e una data di nascita falsa in un'anagrafica assicurativa è un   │
   │ preventivo sbagliato e un'età sbagliata sulla polizza. Il campo resta     │
   │ vuoto — e vuoto si vede, sbagliato no (regola di casa §8.1).              │
   └───────────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSIONE = 'anagrafica-2026-09-19';

  var MESI = { A: 1, B: 2, C: 3, D: 4, E: 5, H: 6, L: 7, M: 8, P: 9, R: 10, S: 11, T: 12 };
  /* Omocodia: quando due persone avrebbero lo stesso codice, l'Agenzia delle
     Entrate sostituisce le cifre (da destra) con lettere. La mappa è fissa. */
  var OMOCODIA = { L: '0', M: '1', N: '2', P: '3', Q: '4', R: '5', S: '6', T: '7', U: '8', V: '9' };
  var POSIZIONI_NUMERICHE = [6, 7, 9, 10, 12, 13, 14];

  /* Il carattere di controllo (DM 23/12/1976): posizioni dispari e pari con
     due tabelle diverse, somma modulo 26. Si calcola sul codice COME SCRITTO,
     lettere di omocodia comprese. */
  var DISPARI = { '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11,
    P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
  function pari(c) { return /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65; }
  function controllo(quindici) {
    var somma = 0;
    for (var i = 0; i < 15; i++) {
      var c = quindici[i];
      somma += (i % 2 === 0) ? DISPARI[c] : pari(c);   // i pari (0-based) = posizione dispari (1-based)
    }
    return String.fromCharCode(65 + (somma % 26));
  }

  function normalizza(cf) {
    var s = String(cf == null ? '' : cf).toUpperCase().replace(/\s/g, '');
    return /^[A-Z0-9]{16}$/.test(s) ? s : null;
  }

  /* Torna il codice con le cifre al posto delle lettere di omocodia, e dice se
     ce n'erano. Una lettera FUORI dalla mappa in una posizione numerica non è
     omocodia: è un codice sbagliato. */
  function sciogli(cf) {
    var arr = cf.split(''), omo = false;
    for (var k = 0; k < POSIZIONI_NUMERICHE.length; k++) {
      var i = POSIZIONI_NUMERICHE[k], c = arr[i];
      if (/\d/.test(c)) continue;
      if (!OMOCODIA[c]) return null;
      arr[i] = OMOCODIA[c]; omo = true;
    }
    return { cf: arr.join(''), omocodia: omo };
  }

  function valido(cf) {
    var s = normalizza(cf);
    if (!s) return false;
    if (!/^[A-Z]{6}[A-Z0-9]{2}[A-Z][A-Z0-9]{2}[A-Z][A-Z0-9]{3}[A-Z]$/.test(s)) return false;
    var sc = sciogli(s);
    if (!sc) return false;
    if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(sc.cf)) return false;
    if (!MESI[sc.cf[8]]) return false;
    return controllo(s.slice(0, 15)) === s[15];
  }

  function z(n) { return (n < 10 ? '0' : '') + n; }

  /* La data di nascita. `oggi` serve alla regola del secolo: un anno a due
     cifre non dice il secolo, e la scelta è «se non è nel futuro, è questo
     secolo». Chi ha più di cent'anni resta un caso da guardare a mano — è
     dichiarato nel campo `secolo`, non nascosto. */
  function nascita(cf, oggi) {
    if (!valido(cf)) return null;
    var s = sciogli(normalizza(cf));
    var c = s.cf;
    var yy = parseInt(c.slice(6, 8), 10), mese = MESI[c[8]], gg = parseInt(c.slice(9, 11), 10);
    var sesso = 'M';
    if (gg > 40) { gg -= 40; sesso = 'F'; }
    if (gg < 1 || gg > 31) return null;
    var rif = oggi ? new Date(oggi) : new Date();
    var anno = (yy <= rif.getFullYear() % 100) ? 2000 + yy : 1900 + yy;
    /* La data deve esistere: 31/04 o 30/02 non sono una nascita. */
    var d = new Date(Date.UTC(anno, mese - 1, gg));
    if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== gg) return null;
    return { data: anno + '-' + z(mese) + '-' + z(gg), sesso: sesso, omocodia: s.omocodia, secolo: 'stimato' };
  }

  function soloData(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v == null ? '' : v));
    return m ? { a: +m[1], m: +m[2], g: +m[3] } : null;
  }

  /* L'età si CALCOLA, non si salva. Compiuta o no nell'anno in corso: si
     guarda mese e giorno, non si divide per 365. */
  function eta(nascitaIso, oggi) {
    var n = soloData(nascitaIso);
    if (!n) return null;
    var rif = oggi ? new Date(oggi) : new Date();
    var anni = rif.getFullYear() - n.a;
    var mm = rif.getMonth() + 1, gg = rif.getDate();
    if (mm < n.m || (mm === n.m && gg < n.g)) anni--;
    return anni >= 0 && anni < 130 ? anni : null;
  }

  /* Chi è nato il 29 febbraio compie gli anni il 28 negli anni non bisestili:
     non festeggiarlo tre anni su quattro è la cosa che nessuno vorrebbe. */
  function compleannoOggi(nascitaIso, oggi) {
    var n = soloData(nascitaIso);
    if (!n) return false;
    var rif = oggi ? new Date(oggi) : new Date();
    var mm = rif.getMonth() + 1, gg = rif.getDate();
    if (n.m === mm && n.g === gg) return true;
    if (n.m === 2 && n.g === 29 && mm === 2 && gg === 28) {
      var a = rif.getFullYear();
      var bisestile = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
      return !bisestile;
    }
    return false;
  }

  /* GDPR: gli auguri sono marketing. Si mandano solo a chi ha dato il
     consenso, e serve un recapito. Il motivo si dice, così la riga in elenco
     spiega perché non ha il tasto. */
  function contattabile(a) {
    if (!a) return { ok: false, motivo: 'anagrafica assente' };
    if (!a.consenso_marketing) return { ok: false, motivo: 'senza consenso marketing' };
    var email = String(a.email || '').trim();
    var tel = String(a.cellulare || a.telefono || '').replace(/\D/g, '');
    if (!email && !tel) return { ok: false, motivo: 'senza email né telefono' };
    return { ok: true, email: email || null, telefono: tel || null };
  }

  function delGiorno(anagrafiche, oggi) {
    return (anagrafiche || [])
      .filter(function (a) { return a && a.tipo !== 'giuridica' && compleannoOggi(a.data_nascita, oggi); })
      .map(function (a) {
        var c = contattabile(a);
        return { anagrafica: a, eta: eta(a.data_nascita, oggi), contattabile: c.ok, motivo: c.motivo || null,
                 email: c.email || null, telefono: c.telefono || null };
      })
      .sort(function (x, y) { return String(x.anagrafica.nominativo || '').localeCompare(String(y.anagrafica.nominativo || '')); });
  }

  /* Il testo che esce di casa sta nel motore (CLAUDE.md §5). Segnaposto:
     {nome}, {agenzia}, {firma}. L'età NON è fra i segnaposto: in un augurio
     si scrive «buon compleanno», non «buon cinquantesimo». */
  var TESTO_AUGURI = 'Gentile {nome},\ntanti auguri di buon compleanno da tutti noi di {agenzia}!\n\n{firma}';
  function testoAuguri(modello, cliente, agenzia, firma) {
    var nome = (cliente && (cliente.nome || cliente.nominativo)) || 'cliente';
    return String(modello || TESTO_AUGURI)
      .replace(/\{nome\}/g, nome)
      .replace(/\{agenzia\}/g, agenzia || 'With Us')
      .replace(/\{firma\}/g, firma || '')
      .replace(/[ \t]+\n/g, '\n').trim();
  }

  /* Il numero come lo vuole WhatsApp: prefisso internazionale, niente più,
     niente spazi. Un numero italiano senza prefisso lo riceve. */
  function numeroWhatsapp(tel) {
    var n = String(tel || '').replace(/\D/g, '');
    if (!n) return null;
    if (n.length >= 9 && n.length <= 11 && n.slice(0, 2) !== '39') n = '39' + n;
    return n;
  }

  var API = {
    VERSIONE: VERSIONE, MESI: MESI, OMOCODIA: OMOCODIA, TESTO_AUGURI: TESTO_AUGURI,
    normalizza: normalizza, valido: valido, controllo: controllo, nascita: nascita,
    eta: eta, compleannoOggi: compleannoOggi, contattabile: contattabile, delGiorno: delGiorno,
    testoAuguri: testoAuguri, numeroWhatsapp: numeroWhatsapp
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.Anagrafica = API;
})();
