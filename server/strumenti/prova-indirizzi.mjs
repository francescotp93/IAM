/* ═══════════════════════════════════════════════════════════════════════════════
   PROVARE GLI INDIRIZZI RITROVATI, PRIMA DI METTERLI NEL CATALOGO (08/10/2026)

   Quando un documento del catalogo non si scarica più — la compagnia ha
   pubblicato l'edizione nuova e spostato il file — l'indirizzo va ritrovato.
   Ritrovarlo si fa cercando online; METTERLO NEL CATALOGO no.

   ┌───────────────────────────────────────────────────────────────────────────┐
   │ UN INDIRIZZO TROVATO DA UNA RICERCA NON È UN DOCUMENTO.                   │
   └───────────────────────────────────────────────────────────────────────────┘
   È la regola di questa casa e vale anche qui: «trovato» vuol dire che
   qualcuno ha visto quell'indirizzo scritto da qualche parte. Questo
   strumento lo CHIAMA, con la funzione che gira su Supabase, e scrive nel
   catalogo solo quello da cui è arrivato un PDF vero, con la sua impronta.

   DUE COSE CHE SCARTA DA SÉ, e sono di mestiere, non di tecnica:

   1. GLI INDIRIZZI SU SITI DI TERZI. Un set informativo preso da un
      aggregatore o da un broker non è il documento della compagnia: di
      quell'edizione non risponde nessuno, e il file può essere vecchio di
      anni senza che si veda. Il documento precontrattuale si prende dal sito
      di chi lo emette, e basta.
   2. GLI INDIRIZZI SU DOMINI NON AUTORIZZATI. Non li prova nemmeno: li
      elenca, perché autorizzare un dominio vuol dire cambiare la funzione e
      rimandarla in produzione, e quella è una decisione di Francesco.

       node server/strumenti/prova-indirizzi.mjs <candidati.json> [--scrivi]

   Il file dei candidati è un array di { compagnia | gruppo, prodotto, url }.
   Senza `--scrivi` non cambia niente: dice solo che cosa funziona.
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');
const FN = path.join(RADICE, 'supabase', 'functions', 'prendi-documento', 'index.ts');

const sorgente = process.argv[2];
const scrivi = process.argv.includes('--scrivi');
const DOVE = (() => { const i = process.argv.indexOf('--dove'); return i >= 0 ? process.argv[i + 1] : null; })();
if (!sorgente || !fs.existsSync(sorgente)) {
  console.error('Serve il file dei candidati: node server/strumenti/prova-indirizzi.mjs <candidati.json> [--scrivi] [--dove /tmp/note-informative]');
  process.exit(2);
}

const PROGETTO = process.env.SUPABASE_PROGETTO || 'ekjxrnsfqxnfxzrthdcf';
const CHIAVE = process.env.SUPABASE_CHIAVE_PUBBLICA || '';
if (!CHIAVE) {
  console.error('Manca SUPABASE_CHIAVE_PUBBLICA (la chiave pubblica del progetto, quella che sta nel sorgente di IAM).');
  process.exit(2);
}
const PORTA = 'https://' + PROGETTO + '.supabase.co/functions/v1/prendi-documento';
const OGGI = new Date().toISOString().slice(0, 10);

const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const candidati = JSON.parse(fs.readFileSync(sorgente, 'utf8'));

/* I domini che la funzione accetta: si leggono dal suo sorgente, non da una
   copia. Se l'elenco divergesse, lo strumento proverebbe indirizzi che
   verrebbero rifiutati e darebbe la colpa alla compagnia. */
const src = fs.readFileSync(FN, 'utf8');
const bloc = src.slice(src.indexOf('const DOMINI = ['), src.indexOf('\n]', src.indexOf('const DOMINI = [')));
const AMMESSI = new Set([...bloc.matchAll(/^\s*'([^']+)',/gm)].map((m) => m[1]));

/* ── I SITI DI TERZI ──────────────────────────────────────────────────────────
   Non è un elenco di nemici: è il confine fra «documento della compagnia» e
   «copia trovata in giro». Aggregatori, comparatori, broker, bucket di
   archiviazione. Un documento di prodotto si prende da chi lo emette. */
const TERZI = /quipobroker|comparasemplice|amazonaws\.com|segugio|facile\.it|preventivass|6sicuro|assicurazione\.it|prontoassicuratore|miaassicurazione|drive\.google|dropbox|scribd|yumpu|slideshare/i;

/* Il documento del catalogo a cui un candidato si riattacca. La chiave è il
   NOME DEL PRODOTTO: l'indirizzo vecchio non serve, perché è proprio quello
   che si sta sostituendo. */
function trova(c) {
  const nome = String(c.prodotto || '').trim();
  const fuori = [];
  cat.compagnie.forEach((comp) => (comp.documenti || []).forEach((d) => {
    if (String(d.prodotto || '').trim() === nome) fuori.push({ comp, d });
  }));
  return fuori;
}

async function prendi(url) {
  try {
    const r = await fetch(PORTA, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CHIAVE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120000),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, rete: true, motivo: String(e?.message || e) };
  }
}

const daProvare = [], terzi = [], fuoriElenco = [], senzaDocumento = [];
candidati.forEach((c) => {
  if (!c.url) return;
  let host;
  try { host = new URL(c.url).hostname; } catch (e) { return; }
  if (TERZI.test(c.url)) { terzi.push({ ...c, host }); return; }
  const quali = trova(c);
  if (!quali.length) { senzaDocumento.push({ ...c, host }); return; }
  /* IL «www» CHE MANCA NON È UN DOMINIO NUOVO: se l'elenco ha
     `www.esempio.it` e il candidato dice `esempio.it`, è lo stesso sito
     scritto in due modi, e il reindirizzamento lo risolve da sé. Si prova con
     la forma autorizzata invece di chiedere un rilascio per niente. */
  let url = c.url;
  if (!AMMESSI.has(host) && AMMESSI.has('www.' + host)) {
    url = c.url.replace('://' + host, '://www.' + host);
    host = 'www.' + host;
  }
  if (!AMMESSI.has(host)) { fuoriElenco.push({ ...c, host }); return; }
  daProvare.push({ ...c, url, host, quali });
});

console.log('\nCANDIDATI: ' + candidati.length);
console.log('  da provare ora:                ' + daProvare.length);
console.log('  su siti di terzi (scartati):   ' + terzi.length);
console.log('  su domini non autorizzati:     ' + fuoriElenco.length);
console.log('  senza un documento nel catalogo: ' + senzaDocumento.length);

if (terzi.length) {
  console.log('\n── SCARTATI: NON SONO DELLA COMPAGNIA ──');
  terzi.forEach((c) => console.log('  ' + c.host + '   ' + String(c.prodotto).slice(0, 60)));
}
if (fuoriElenco.length) {
  console.log('\n── DOMINI DA AUTORIZZARE (serve il via di Francesco: è un rilascio) ──');
  const per = {};
  fuoriElenco.forEach((c) => { (per[c.host] = per[c.host] || []).push(c.prodotto); });
  Object.entries(per).forEach(([h, p]) => {
    console.log('  ' + h + '   (' + p.length + ' document' + (p.length === 1 ? 'o' : 'i') + ')');
    p.forEach((x) => console.log('      · ' + String(x).slice(0, 70)));
  });
}
if (senzaDocumento.length) {
  console.log('\n── NON SI RIATTACCANO A NESSUN DOCUMENTO DEL CATALOGO ──');
  senzaDocumento.forEach((c) => console.log('  ' + String(c.prodotto).slice(0, 70)));
}

console.log('\n── LA PROVA VERA: ' + daProvare.length + ' indirizzi ──');
const INSIEME = 6;
let i = 0, fatti = 0;
const conta = { arrivato: 0, scaduto: 0, non_pdf: 0, rifiutato: 0, rete: 0 };
const buoni = [];

async function squadra() {
  while (i < daProvare.length) {
    const c = daProvare[i++];
    const r = await prendi(c.url);
    fatti++;
    let esito;
    if (r.ok) esito = 'arrivato';
    else if (r.rete) esito = 'rete';
    else if (r.scaduto) esito = 'scaduto';
    else if (/non e' un PDF|non è un PDF/.test(r.motivo || '')) esito = 'non_pdf';
    else esito = 'rifiutato';
    conta[esito]++;
    const eti = { arrivato: '✅', scaduto: '🕓', non_pdf: '📄', rifiutato: '❌', rete: '🌐' }[esito];
    console.log(`${eti} [${fatti}/${daProvare.length}] ${String(c.prodotto).slice(0, 55)}` +
      (r.ok ? `  ${(r.byte / 1024).toFixed(0)} kB  ${r.impronta.slice(0, 12)}…` : `  ${String(r.motivo).slice(0, 90)}`));
    if (r.ok) {
      buoni.push({ c, r });
      if (DOVE) {
        const nome = (c.quali[0].comp.compagnia + '-' + c.prodotto).replace(/[^A-Za-z0-9]+/g, '-').slice(0, 70)
          + '-' + r.impronta.slice(0, 8) + '.pdf';
        if (!fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });
        fs.writeFileSync(path.join(DOVE, nome), Buffer.from(r.pdf_base64, 'base64'));
      }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(INSIEME, daProvare.length) }, squadra));

console.log('\n── COM\'È ANDATA ──');
Object.entries(conta).forEach(([k, v]) => { if (v) console.log('  ' + k.padEnd(12) + v); });

if (!scrivi) {
  console.log('\n(prova a vuoto: il catalogo non è stato scritto. Rilancia con --scrivi)');
  process.exit(0);
}

/* SI SCRIVE SOLO QUELLO CHE È ARRIVATO, e si tiene l'indirizzo vecchio: il
   giorno che qualcuno chiede «ma prima dove stava?», la risposta c'è. */
let scritti = 0;
buoni.forEach(({ c, r }) => {
  c.quali.forEach(({ d }) => {
    if (d.url !== c.url) {
      d.url_precedente = d.url;
      d.url = c.url;
      d.indirizzo_ritrovato_il = OGGI;
      d.come_trovato = 'ritrovato online l\'' + OGGI + ' dopo che il precedente non rispondeva'
        + (c.sicurezza ? ' (' + c.sicurezza + ')' : '');
    }
    d.stato = 'verificato';
    d.provato_il = OGGI;
    d.impronta = r.impronta;
    d.byte = r.byte;
    delete d.motivo_non_preso;
    if (r.reindirizzato) d.indirizzo_finale = r.indirizzo_finale;
    scritti++;
  });
});
fs.writeFileSync(CAT, JSON.stringify(cat, null, 2) + '\n');
console.log('\nScritti ' + scritti + ' documenti nel catalogo. L\'indirizzo vecchio resta in `url_precedente`.');
