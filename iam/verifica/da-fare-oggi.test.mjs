// ═══════════════════════════════════════════════════════════════════════════════
//  DA FARE OGGI — prove sulla fascia operativa della scrivania (Blocco B)
//
//  Serve a impedire quattro errori che non si vedono guardando la pagina:
//   1. mettere la fascia DENTRO il blocco che resta nascosto finché non si
//      caricano i file di contabilità (era il difetto della scrivania: vuota
//      per chi vive di preventivi e rinnovi);
//   2. mostrare voci con conteggio zero, che trasformano l'elenco in rumore;
//   3. far cadere tutta la fascia per un errore su un singolo conteggio;
//   4. dimenticare di richiamare il calcolo quando la scrivania si apre.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const html = leggi('index.html');
// il corpo della funzione: dal nome fino alla graffa a inizio riga.
// I parametri restano generici di proposito: aggiungerne uno non deve rompere
// tutte le prove (è già successo con `forza`).
const corpo = (html.match(/async function caricaDaFareOggi\([^)]*\)[\s\S]*?\n\}/) || [''])[0];
if (!corpo) { console.log('DA FARE OGGI\n  X   la funzione caricaDaFareOggi non si trova'); process.exit(1); }

/* LA SCRIVANIA METTE PRIMA IL LAVORO (critique del 07/10/2026). La testata
   promette «le cose che richiedono attenzione, prima di tutto il resto», e
   la prima cosa sotto era un grafico alto 540 pixel: «Da fare oggi»
   cominciava a metà schermo. Adesso viene subito dopo la testata, prima del
   grafico e degli indicatori. */
prova('la fascia esiste ed è la prima cosa nella scrivania', () => {
  const pannello = html.slice(html.indexOf('<div class="panel" id="panel-dashboard">'));
  const fine = pannello.indexOf('<div class="panel" id="panel-', 10);
  const p = fine > 0 ? pannello.slice(0, fine) : pannello;
  const iTesta = p.indexOf('class="page-head"');
  const iOggi = p.indexOf('id="oggi"');
  const iGrafico = p.indexOf('id="vol-card"');
  const iKpi = p.indexOf('id="kpi-riga"');
  deve(iOggi > 0, 'la fascia "Da fare oggi" non c\'è');
  deve(iTesta < iOggi, 'la testata non viene prima');
  deve(iOggi < iGrafico && iOggi < iKpi, 'la fascia non è la prima cosa dopo la testata: il lavoro sta sotto il grafico');
  deve(!/display:\s*none/.test(p.slice(iOggi, iGrafico)), 'la fascia nasce nascosta');
  return 'testata → da fare oggi → grafico → indicatori';
});

/* IL VECCHIO BLOCCO IN FONDO È UN RIMANDO (scelta di Francesco, 07/10/2026).
   Prima c'erano un secondo titolo «Scrivania», novità ferme all'11/06, un
   modulo ticket e un messaggio che chiedeva di caricare file che non si
   caricano più: la pagina finiva in un vicolo cieco. */
prova('il vecchio blocco in fondo è un collegamento al Cruscotto, non un vicolo cieco', () => {
  deve(!/id="d-content"/.test(html) && !/id="d-empty"/.test(html), 'il vecchio blocco è ancora nella pagina');
  deve(!/Carica i file per vedere/.test(html), 'la scrivania chiede ancora di caricare file che non si caricano più');
  const pannello = html.slice(html.indexOf('<div class="panel" id="panel-dashboard">'));
  const p = pannello.slice(0, pannello.indexOf('<div class="panel" id="panel-', 10));
  deve(/goTab\('cruscotto'\)/.test(p), 'la contabilità del giorno non si raggiunge dalla scrivania');
  deve(/apriGiacenza\(\)/.test(p), 'la giacenza contanti non ha più una porta: si raggiungeva solo dal blocco tolto');
  deve(!/goTab\('conto'\)/.test(p), 'una scorciatoia punta ancora alla schermata «conto», che non esiste più');
  const build = (html.match(/function buildDashboard\(\)[\s\S]*?\n\}/) || [''])[0];
  deve(!/getElementById\('d-(metrics|tipo|anz|mov|empty|content)'\)/.test(build),
    'buildDashboard scrive ancora negli elementi tolti: il primo che manca ferma tutto quello che viene dopo');
});

prova('il calcolo si avvia da tutti i percorsi, non da uno solo', () => {
  // La scrivania viene ricostruita da 5 punti diversi (login, caricamento file,
  // cambio scheda...): agganciarne uno sarebbe bastato per il caso normale e
  // avrebbe lasciato la fascia vecchia in tutti gli altri.
  deve(/if \(t === 'dashboard'\) \{[^}]*caricaDaFareOggi\(\)/.test(html),
    'aprendo la scrivania il lavoro del giorno non viene calcolato');
  const build = (html.match(/function buildDashboard\(\)[\s\S]*?\n\}/) || [''])[0];
  deve(/caricaDaFareOggi\(\)/.test(build),
    'il calcolo non e dentro buildDashboard(): resterebbe vecchio in 4 percorsi su 5');
  // e con una guardia, altrimenti sei interrogazioni a ogni ridisegno
  deve(/OGGI_ULTIMO/.test(html) && /if \(!forza && OGGI_ULTIMO/.test(html),
    'manca la guardia contro le interrogazioni ripetute');
  deve(/caricaDaFareOggi\(true\)/.test(html), 'il tasto di ricalcolo non forza l\'aggiornamento');
  return 'buildDashboard + goTab, con guardia di 30 secondi';
});

prova('un errore su un conteggio non spegne la fascia', () => {
  deve(/const conta = async \(fn(?:, nome)?\) => \{ try \{ return await fn\(\); \} catch/.test(corpo),
    'i conteggi non sono protetti uno per uno');
  const protetti = (corpo.match(/await conta\(async \(\) =>/g) || []).length;
  deve(protetti >= 6, 'conteggi protetti: ' + protetti);
  return protetti + ' conteggi indipendenti';
});

prova('le voci a zero non si mostrano', () => {
  // ogni conteggio deve uscire senza aggiungere la voce quando non ha nulla
  const uscite = (corpo.match(/if \(!\w+(?:\.length)?\) return;|if \(!\w+ \|\| !\w+\.length\) return;/g) || []).length;
  deve(uscite >= 5, 'controlli sul vuoto: ' + uscite);
  return uscite + ' controlli sul vuoto';
});

prova('il disegno e separato dalla raccolta, e gestisce il caso vuoto', () => {
  // Separati per due motivi: si puo ridisegnare senza reinterrogare, e si puo
  // verificare la resa senza database.
  const disegna = (html.match(/function oggiDisegna\(voci[^)]*\)[\s\S]*?\n\}/) || [''])[0];
  deve(disegna, 'oggiDisegna non esiste: disegno e raccolta sono ancora mescolati');
  deve(/il lavoro è in pari/.test(disegna), 'manca il messaggio per quando non c\'e nulla da fare');
  deve(/oggiDisegna\(voci[,)]/.test(corpo), 'la raccolta non usa la funzione di disegno');
  return 'raccolta → oggiDisegna';
});

prova('si controlla la variabile del database giusta', () => {
  // `db` e una variabile di modulo: non finisce su window, quindi controllare
  // window.db significava controllare una cosa diversa da quella che si usa.
  deve(/if \(!db\) \{ box\.innerHTML/.test(corpo), 'il controllo non e su `db`');
  deve(!/if \(!window\.db\)/.test(corpo), 'controlla ancora window.db');
});

prova('ogni voce porta da qualche parte', () => {
  /* le voci del lavoro di oggi e quelle «da sistemare con calma»: tutte
     devono portare da qualche parte (critique 07/10/2026). */
  const voci = (corpo.match(/(?:voci|calma)\.push\(\{/g) || []).length;
  const destinazioni = (corpo.match(/va: \(\) =>/g) || []).length;
  deve(voci >= 6, 'voci previste: ' + voci);
  deve(destinazioni === voci, voci + ' voci ma ' + destinazioni + ' destinazioni');
  return voci + ' voci, tutte collegate';
});

prova('le pagine del preventivatore si aprono dentro la scocca', () => {
  const apri = (html.match(/function oggiApri\(pagina\)[\s\S]*?\n\}/) || [''])[0];
  deve(/withusOneApri/.test(apri), 'non usa il ponte della scocca: uscirebbe dall\'applicazione');
  deve(/quotoUrl|apriQuoto/.test(apri), 'senza la scocca non ha un ripiego: il tasto non farebbe niente');
  // le destinazioni devono essere pagine che nel preventivatore esistono
  const pagine = [...corpo.matchAll(/oggiApri\('([a-z-]+)'\)/g)].map(m => m[1]);
  const attese = ['titoli', 'scadenzario', 'portafoglio', 'storico', 'anagrafiche'];
  for (const p of pagine) deve(attese.includes(p), 'destinazione non prevista: ' + p);
  return pagine.length + ' aperture, con ripiego';
});

prova('gli insoluti vengono per primi: sono soldi gia fuori', () => {
  const iIns = corpo.indexOf("from('quote_titoli')");
  const iRin = corpo.indexOf("from('quote_scadenzario')");
  const iPerf = corpo.indexOf("eq('perfezionata', false)");
  deve(iIns > 0 && iRin > 0 && iPerf > 0, 'manca uno dei conteggi principali');
  deve(iIns < iRin && iRin < iPerf, 'l\'ordine delle urgenze non e quello deciso');
  return 'insoluti → rinnovi → perfezionamento';
});

prova('i conteggi leggono le tabelle giuste', () => {
  for (const t of ['quote_titoli', 'quote_scadenzario', 'quote_polizze', 'quote_preventivi', 'quote_anagrafiche']) {
    deve(corpo.includes("from('" + t + "')"), 'non legge da ' + t);
  }
  // nessuna scrittura: la scrivania guarda, non tocca
  deve(!/\.insert\(|\.update\(|\.delete\(/.test(corpo), 'la fascia scrive sul database: deve solo leggere');
  return '5 tabelle, sola lettura';
});

/* ══ UN ELENCO NON È UN CONTEGGIO (critique della Scrivania, 07/10/2026) ═══
   Il server manda al massimo mille righe per richiesta. La scrivania contava
   `data.length` su tabelle che ne hanno di più — scadute (~1.665), polizze
   (~4.000), anagrafiche (2.536) — e diceva «1000» senza dirlo. Adesso o conta
   il server, o si legge a pagine ordinate; e le tre voci dello scadenzario
   passano dallo stesso motore della pagina Scadenzario, così i due numeri
   non possono più divergere. */
prova('nessun conteggio si ferma al tetto delle mille righe', () => {
  deve(!/n: data\.length/.test(corpo), 'un conteggio usa ancora le righe scaricate');
  deve(!/\.limit\(/.test(corpo), 'c\'è un tetto secco');
  deve(/count: 'exact', head: true \}\)\.eq\('perfezionata', false\)/.test(corpo),
    'le polizze da perfezionare non le conta il server');
  const paginate = (corpo.match(/\.order\('id'\)\.range\(da, a\)/g) || []).length;
  deve(paginate >= 4, 'letture paginate e ordinate: ' + paginate);
  deve(/if \(r\.parziale\) parziale = true/.test(corpo), 'una lettura fermata non si dichiara');
  return paginate + ' letture paginate';
});

prova('rinnovi e scadute sono quelli dello Scadenzario, non una copia', () => {
  deve(/window\.Scadenzario/.test(corpo), 'la scrivania non usa il motore dello Scadenzario');
  deve(/M\.conRinnovo\(/.test(corpo) && /M\.statoLavoro\(/.test(corpo), 'il rinnovo non si riconosce col motore');
  deve(!/sostituzioni/.test(corpo), 'la scrivania guarda ancora `sostituzioni`, che è vuota ovunque');
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/scadenzario\.js\?v=/.test(html),
    'IAM non carica il motore dello scadenzario');
});

prova('i sospesi sono quelli della schermata Sospesi, non il file caricato a mano', () => {
  deve(!/APP\.sospesi/.test(corpo), 'la voce legge ancora il file caricato a mano');
  deve(/await sprCarica\(\)/.test(corpo) && /SPR_ESITO/.test(corpo), 'la voce non usa il conto della schermata Sospesi');
  /* Si guarda la SOTTRAZIONE, non la parola: la prima stesura cercava
     «da_dichiarare» nel blocco intero e restava verde anche togliendola dal
     conteggio, perché la stessa parola resta nel totale in euro. */
  deve(/const n = \(e\.righe \|\| 0\) - \(e\.da_dichiarare \|\| 0\)/.test(corpo),
    'il numero dei sospesi comprende le rate da dichiarare: finirebbero in due voci');
  deve(/- \(Number\(e\.totale_da_dichiarare\) \|\| 0\)/.test(corpo),
    'il totale dei sospesi comprende le rate da dichiarare');
});

/* ══ I DUE BUCHI DEL MARKETING LI CONTA IL SERVER (21/09/2026) ═════════════
   Brief «Anagrafiche», punto 1. Fino a oggi si scaricavano le anagrafiche e
   si contavano qui: il server ne manda al massimo mille per richiesta e in
   archivio ce ne sono 2.536, quindi il numero era quello delle righe
   arrivate. Nessun errore: un numero più piccolo, credibile, e più basso del
   vero — che su un elenco di cose da fare è il modo peggiore di sbagliare. */
prova('i buchi del marketing si contano sul server, non sulle righe scaricate', () => {
  const buchi = corpo.slice(corpo.indexOf('quantiClienti'));
  deve(/count: 'exact', head: true/.test(buchi),
    'il conteggio scarica ancora le righe: con più di mille dice un numero sbagliato e non lo dice');
  /* E non ne resta uno che filtra in memoria: basta quello per riavere il
     difetto su una delle due voci. */
  deve(!/\.filter\(a => !\(a\.email/.test(corpo), 'l\'email si conta ancora in memoria');
  deve(!/const haConsenso = /.test(corpo), 'IAM si riscrive la regola del consenso invece di chiederla al motore');
  return 'due conteggi, tutti e due dal server';
});

prova('la regola del consenso è QUELLA DEL MOTORE, non una copia di IAM', () => {
  /* Fino al 21/09/2026 IAM guardava solo la privacy firmata e non la colonna
     `consenso_marketing`: una seconda regola, che contava fra i buchi chi il
     consenso l'aveva dato allo sportello. Due regole sullo stesso dato sono
     due numeri diversi sulla stessa agenzia. */
  deve(/Anagrafica\.VISTE\[/.test(corpo), 'la condizione non viene dal motore');
  /* E il motore è caricato: si cerca il TAG, non la stringa — quel percorso
     compare anche nei commenti (§18, §26). */
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/anagrafica\.js\?v=/.test(html),
    'IAM non carica il motore delle anagrafiche');
  return 'una regola sola, caricata e non copiata';
});

prova('il marcatore LEAD nelle note non decide più chi è un lead', () => {
  /* Misurato il 21/09/2026: una sola riga in tutto l'archivio ha quel
     marcatore, e non è fra i clienti. Toglierlo non cambia un numero, e
     lascia un modo solo di essere un lead invece di due. */
  deve(!/\\bLEAD\\b/.test(corpo), 'il marcatore nelle note è ancora una seconda strada per essere lead');
  deve(/eq\('lead', false\)/.test(corpo), 'i clienti non si scelgono dalla colonna lead');
  return 'la colonna, e basta';
});

console.log('DA FARE OGGI');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log(`\nDA FARE OGGI: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti ? 1 : 0);
