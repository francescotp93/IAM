// ═══════════════════════════════════════════════════════════════════════════════
//  IL RACCOGLITORE: PROVA TUTTI GLI INDIRIZZI DEL CATALOGO
//
//  Richiesta di Francesco: «per le note informative le devi recuperare tu».
//
//  Il catalogo dice DOVE stanno i documenti, ma nessuno di quegli indirizzi era
//  stato aperto: dall'ambiente in cui girano gli agenti la rete verso le
//  compagnie è chiusa. La funzione `prendi-documento`, che gira su Supabase,
//  ce la fa. Questo strumento la chiama per ogni voce del catalogo e scrive
//  nel catalogo stesso che cos'è successo.
//
//  ┌───────────────────────────────────────────────────────────────────────────┐
//  │ SCRIVE SOLO QUELLO CHE HA VISTO.                                          │
//  └───────────────────────────────────────────────────────────────────────────┘
//  `verificato` vuol dire che da quell'indirizzo è arrivato un PDF vero, e si
//  tiene la sua impronta e il suo peso. `scaduto` vuol dire che il sito ha
//  risposto 404. `non_pdf` vuol dire che ha risposto bene ma con una pagina
//  HTML — succede quando la compagnia sposta il documento e lascia al suo
//  posto la pagina del prodotto, ed è il caso più insidioso, perché un
//  raccoglitore che non guarda i byte archivierebbe quell'HTML come se fosse
//  un documento di prodotto.
//
//  I PDF NON FINISCONO NEL REPOSITORY: sono documenti delle compagnie, e un
//  repository non è il posto dove tenerli. Vanno in una cartella fuori, che
//  si passa con `--dove`.
//
//      node server/strumenti/prendi-note-informative.mjs --dove /tmp/note
//      node server/strumenti/prendi-note-informative.mjs --dove /tmp/note --solo Groupama
//      node server/strumenti/prendi-note-informative.mjs --prova   (non scrive il catalogo)
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');

const arg = (n, d = null) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const DOVE = arg('--dove');
const SOLO = arg('--solo');
const PROVA = process.argv.includes('--prova');
/* `--riprova` ripassa SOLO i documenti che l'ultima volta non sono arrivati.
   Serve dopo ogni cambio alla funzione (un dominio in più, un'intestazione
   diversa): rifare tutti e 283 per riprovarne venti vorrebbe dire chiedere a
   duecentosessanta siti un file che si ha già, e aspettare mezz'ora per
   sapere una cosa che si sa in due minuti. */
const RIPROVA = process.argv.includes('--riprova');

/* La chiave pubblica del progetto: sta già dentro il sorgente di IAM, non è un
   segreto. Si passa da fuori perché un repository non è il posto dove tenere
   nemmeno le chiavi che non sono segrete. */
const PROGETTO = process.env.SUPABASE_PROGETTO || 'ekjxrnsfqxnfxzrthdcf';
const CHIAVE = process.env.SUPABASE_CHIAVE_PUBBLICA || '';
if (!CHIAVE) {
  console.error('Manca SUPABASE_CHIAVE_PUBBLICA: è la chiave pubblica del progetto, quella che sta nel\n' +
    'sorgente di IAM. Si passa così:\n\n' +
    '  SUPABASE_CHIAVE_PUBBLICA=... node server/strumenti/prendi-note-informative.mjs --dove /tmp/note\n');
  process.exit(2);
}
const PORTA = 'https://' + PROGETTO + '.supabase.co/functions/v1/prendi-documento';

/* LA DATA È QUELLA DI OGGI, NON UNA SCRITTA A MANO. La prima versione aveva
   «2026-10-02» dentro il codice: alla seconda raccolta il catalogo avrebbe
   detto di essere stato controllato il 2 ottobre anche se lo era stato l'8, e
   una data falsa su una verifica è peggio di nessuna data. */
const OGGI = new Date().toISOString().slice(0, 10);

if (DOVE && !fs.existsSync(DOVE)) fs.mkdirSync(DOVE, { recursive: true });

const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));

async function prendi(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(PORTA, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CHIAVE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120000),
    });
    const d = await r.json();
    return { ...d, ms: Date.now() - t0, http: r.status };
  } catch (e) {
    /* Un errore di rete verso Supabase non è un indirizzo scaduto: sono due
       diagnosi diverse, e confonderle farebbe marcare «scaduto» un documento
       che c'è. */
    return { ok: false, rete: true, motivo: String(e?.message || e), ms: Date.now() - t0 };
  }
}

function statoDa(r) {
  if (r.ok) return 'verificato';
  if (r.rete) return null;                     /* non si sa: non si scrive niente */
  if (r.scaduto) return 'scaduto';
  if (/non e' un PDF|non è un PDF/.test(r.motivo || '')) return 'non_pdf';
  if (/fuori da quelli|non e' fra quelli|non è fra quelli/.test(r.motivo || '')) return 'dominio_non_ammesso';
  return 'non_preso';
}

const conta = {};
let fatti = 0;

/* Chi va ripreso. Con `--riprova` si lasciano stare quelli che sono già
   arrivati: «verificato» con la sua impronta vuol dire che il file c'è. */
const daFare = (d) => !RIPROVA || d.stato !== 'verificato';

/* ─────────────────────────────────────────────────────────────────────────────
   L'ORDINE È INTRECCIATO FRA LE COMPAGNIE, E NON È UN DETTAGLIO.

   Il catalogo tiene i documenti raggruppati per compagnia: sette di Sara, poi
   sette di Nobis. Prenderne sei alla volta in quell'ordine vorrebbe dire sei
   richieste insieme allo STESSO sito — che è il modo per farsi rispondere 403
   o, peggio, per dare fastidio a un sito che non ci ha fatto niente.

   Qui l'elenco si intreccia: il primo documento di ogni compagnia, poi il
   secondo di ogni compagnia, e così via. Sei alla volta sono sei siti diversi.
   Uno per uno ci volevano ottanta minuti; così tredici.
   ───────────────────────────────────────────────────────────────────────────── */
const lavori = [];
const scelte = cat.compagnie
  .filter((c) => !SOLO || c.compagnia === SOLO)
  .map((c) => ({ c, docs: (c.documenti || []).filter(daFare) }))
  .filter((x) => x.docs.length);
const quanti = Math.max(0, ...scelte.map((x) => x.docs.length));
for (let g = 0; g < quanti; g++) {
  scelte.forEach((x) => { if (x.docs[g]) lavori.push({ c: x.c, d: x.docs[g] }); });
}
const totale = lavori.length;
console.log('\nRACCOLGO ' + totale + ' documenti' + (SOLO ? ' di ' + SOLO : '') +
  (RIPROVA ? ' (solo quelli che la volta scorsa non sono arrivati)' : '') +
  (DOVE ? ', li salvo in ' + DOVE : ' (senza salvare: manca --dove)') + '\n');

/* Quante insieme. Sei è un numero scelto, non trovato: sotto non si guadagna
   niente di visibile, sopra si comincia a bussare due volte allo stesso sito
   perché le compagnie con pochi documenti finiscono prima e l'intreccio si
   stringe sulle altre. */
const INSIEME = 6;
let prossimo = 0;

async function unLavoro({ c, d }) {
  const r = await prendi(d.url);
  const stato = statoDa(r);
  fatti++;
  conta[stato || 'rete'] = (conta[stato || 'rete'] || 0) + 1;

  const eti = { verificato: '✅', scaduto: '🕓', non_pdf: '📄', dominio_non_ammesso: '⛔',
    non_preso: '❌', null: '🌐' }[String(stato)];
  console.log(`${eti} [${fatti}/${totale}] ${c.compagnia} · ${d.prodotto}` +
    (r.ok ? `  ${(r.byte / 1024).toFixed(0)} kB  ${r.impronta.slice(0, 12)}…` +
      (r.reindirizzato ? `  (reindirizzato a ${r.host})` : '') : `  ${String(r.motivo).slice(0, 110)}`));

  if (stato) {
    d.stato = stato;
    d.provato_il = OGGI;
    if (r.ok) {
      d.impronta = r.impronta;
      d.byte = r.byte;
      if (r.reindirizzato) d.indirizzo_finale = r.indirizzo_finale;
      delete d.motivo_non_preso;
    } else {
      delete d.impronta; delete d.byte;
      d.motivo_non_preso = String(r.motivo).slice(0, 300);
    }
  }

  if (r.ok && DOVE) {
    const nome = (c.compagnia + '-' + d.prodotto).replace(/[^A-Za-z0-9]+/g, '-').slice(0, 70)
      + '-' + r.impronta.slice(0, 8) + '.pdf';
    fs.writeFileSync(path.join(DOVE, nome), Buffer.from(r.pdf_base64, 'base64'));
  }
}

async function squadra() {
  while (prossimo < lavori.length) {
    const mio = lavori[prossimo++];
    /* Un documento che fa saltare tutto fermerebbe la raccolta a metà e il
       catalogo non direbbe niente degli altri: si scrive il guasto e si va
       avanti, che è lo stesso motivo per cui `prendi` non rilancia. */
    try { await unLavoro(mio); } catch (e) {
      console.log('💥 [' + (++fatti) + '/' + totale + '] ' + mio.c.compagnia + ' · ' +
        mio.d.prodotto + '  ' + String(e?.message || e).slice(0, 110));
      conta.guasto = (conta.guasto || 0) + 1;
    }
  }
}
await Promise.all(Array.from({ length: Math.min(INSIEME, lavori.length) }, squadra));

if (!PROVA) {
  /* `_verificato_il` vuol dire «tutto il catalogo è stato ripassato quel
     giorno»: un ripasso parziale non ha il diritto di scriverlo, o la data
     direbbe che sono stati provati 283 documenti quando ne sono stati provati
     venti. Gli altri conservano il loro `provato_il`, che è quello vero. */
  if (!RIPROVA && !SOLO) cat._verificato_il = OGGI;
  cat._stati = {
    trovato: 'l\'URL è stato trovato da una ricerca ma non è stato aperto da nessuno',
    verificato: 'da quell\'indirizzo è arrivato un PDF vero: si tiene la sua impronta e il suo peso',
    scaduto: 'il sito ha risposto 404: succede a ogni edizione nuova, l\'indirizzo va ritrovato',
    non_pdf: 'il sito ha risposto bene ma con una pagina HTML — la compagnia ha spostato il documento '
      + 'e al suo posto c\'è la pagina del prodotto. È il caso più insidioso: un raccoglitore che non '
      + 'guardasse i byte archivierebbe quell\'HTML come se fosse un documento di prodotto',
    dominio_non_ammesso: 'l\'indirizzo porta fuori dall\'elenco dei domini: va aggiunto nella funzione',
    non_preso: 'il sito ha risposto in un modo che non si è saputo interpretare',
  };
  fs.writeFileSync(CAT, JSON.stringify(cat, null, 2) + '\n');
}

console.log('\n── COM\'È ANDATA ──');
Object.keys(conta).sort().forEach((k) => console.log('  ' + String(k).padEnd(22) + conta[k]));
console.log(PROVA ? '\n(prova: il catalogo non è stato scritto)' : '\nCatalogo aggiornato con quello che si è visto.');
