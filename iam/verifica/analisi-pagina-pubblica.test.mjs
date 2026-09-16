// ═══════════════════════════════════════
//  LA PAGINA PUBBLICA DELL'ANALISI DEI BISOGNI
//
//  Questo file è l'unica cosa di IAM che sta su internet senza login. Chiunque
//  conosca l'indirizzo se lo scarica e lo legge riga per riga — con o senza un
//  codice di invito valido.
//
//  Quindi le prove qui non guardano se «funziona»: guardano che cosa un
//  estraneo trova dentro, e che cosa può ottenere provando.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pagina = fs.readFileSync(path.join(radice, 'analisi-bisogni.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const senzaCommenti = pagina.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

// ── 1. Che cosa NON deve esserci dentro ────────────────────────────────────
prova('nessuna chiave, nessun segreto', () => {
  /* La chiave anonima di Supabase è pubblica per definizione, ma qui non
     serve — e averla vorrebbe dire che questa pagina parla col database. */
  for (const spia of ['supabase', 'SUPABASE', 'eyJhbGciOi', 'service_role', 'apikey', 'anon']) {
    deve(!senzaCommenti.includes(spia), 'la pagina contiene un riferimento a Supabase o a una chiave: ' + spia);
  }
});

prova('non carica niente da fuori', () => {
  /* Ogni risorsa esterna è qualcuno che sa quale cliente sta compilando la sua
     analisi assicurativa e quando. Il carattere e i colori si possono
     scrivere; sapere chi apre la pagina non si può restituire. */
  const esterne = senzaCommenti.match(/https?:\/\/[^"'\s)]+/g) || [];
  for (const u of esterne) {
    deve(/api\.withusassicurazioni\.it/.test(u),
      'la pagina carica o contatta un indirizzo esterno: ' + u);
  }
});

prova('non contiene pezzi dell\'area interna', () => {
  for (const spia of ['panel-', 'withus-one', 'goTab', 'iam_utenti', 'isSuperAdmin', 'quote_anagrafiche']) {
    deve(!senzaCommenti.includes(spia), 'un pezzo dell\'area interna è finito nella pagina pubblica: ' + spia);
  }
});

prova('non è indicizzabile dai motori di ricerca', () => {
  deve(/<meta name="robots" content="noindex/.test(pagina),
    'la pagina può finire nei risultati di ricerca');
});

// ── 2. Il codice dell'invito ───────────────────────────────────────────────
prova('il codice viene tolto dall\'indirizzo appena letto', () => {
  /* Un indirizzo che contiene un segreto finisce nella cronologia, nei
     preferiti, e negli screenshot che le persone si mandano fra loro. */
  deve(/history\.replaceState/.test(senzaCommenti), 'il codice resta scritto nella barra dell\'indirizzo');
  const i = senzaCommenti.indexOf('replaceState');
  const j = senzaCommenti.indexOf("get('t')");
  deve(j > 0 && i > j && i - j < 200, 'il codice non viene tolto subito dopo essere stato letto');
});

prova('il codice viaggia nell\'intestazione, non nell\'indirizzo delle chiamate', () => {
  /* Negli indirizzi i segreti finiscono nei registri del server e in quelli
     di ogni cosa che sta in mezzo. Nelle intestazioni no. */
  deve(/Authorization.{0,20}Bearer/.test(senzaCommenti), 'il codice non viene mandato come intestazione');
  deve(!/[?&]t=.{0,4}\+.{0,4}TOKEN|[?&]token=/.test(senzaCommenti), 'il codice viene rimesso dentro un indirizzo');
});

// ── 3. Che cosa vede chi arriva senza invito ───────────────────────────────
prova('senza codice la pagina lo dice, e non prova niente', () => {
  deve(/if \(!TOKEN\)/.test(senzaCommenti), 'senza codice la pagina non si ferma');
  deve(/link personale/i.test(senzaCommenti), 'non viene spiegato che serve il link del consulente');
});

prova('gli errori non spiegano perché', () => {
  /* Al cliente non serve sapere se il codice è scaduto, revocato o mai
     esistito: gli serve sapere che deve chiamare il consulente. A un estraneo
     che prova codici, la differenza direbbe quali sono esistiti davvero. */
  const f = senzaCommenti.slice(senzaCommenti.indexOf('function fermati'), senzaCommenti.indexOf('// ── Le domande'));
  deve(!/scadut|revocat|inesistent/i.test(f), 'la schermata di errore distingue i casi');
});

// ── 4. I consensi ──────────────────────────────────────────────────────────
prova('i consensi non si ereditano e il marketing non è preselezionato', () => {
  deve(/privacy: false, marketing: false/.test(senzaCommenti),
    'i consensi vengono ripresi dalla sessione invece di essere dati adesso');
  deve(!/id="f-marketing"[^>]*checked(?!')/.test(pagina), 'il consenso di marketing parte spuntato');
});

prova('senza consenso necessario non si conclude', () => {
  deve(/if \(!DATI\.privacy\)/.test(senzaCommenti), 'si può concludere senza il consenso necessario');
});

// ── 5. Il lavoro del cliente non si perde ──────────────────────────────────
prova('si salva a ogni passo, e un salvataggio fallito non blocca', () => {
  /* Chi compila da casa si interrompe: squilla il telefono, finisce la
     batteria. Ricominciare da capo è il modo più sicuro per non farlo più. */
  deve(/await salva\(\)/.test(senzaCommenti), 'le risposte si salvano solo alla fine');
  /* Il ritaglio si prende dalla firma della funzione alla sua graffa di
     chiusura: la prima volta l'avevo tagliato fino a «function manca», che
     nel file viene PRIMA — il ritaglio era vuoto e la prova gridava al lupo
     su codice corretto. */
  const i = senzaCommenti.indexOf('async function salva');
  const s = senzaCommenti.slice(i, senzaCommenti.indexOf('\n}', i));
  deve(/catch/.test(s), 'se il salvataggio fallisce il cliente resta bloccato');
});

// ── 6. Il risultato mostrato al cliente ────────────────────────────────────
prova('al cliente non si propone un prodotto né un prezzo', () => {
  /* È uno strumento di consulenza, non di vendita: la specifica lo dice due
     volte. Un prodotto suggerito da una schermata, senza nessuno che lo
     spieghi, è esattamente quello che non deve succedere. */
  const e = senzaCommenti.slice(senzaCommenti.indexOf('function mostraEsito'));
  /* Si toglie prima la frase che NEGA — «non è un preventivo» —, altrimenti
     il disclaimer obbligatorio fa fallire la prova che lo pretende. */
  const senzaNegazioni = e.replace(/non (?:è )?un preventivo[^.]*\./gi, '');
  for (const spia of ['€', 'premio', 'prezzo', 'preventivo', 'acquista', 'sottoscriv', 'a partire da']) {
    deve(!new RegExp(spia, 'i').test(senzaNegazioni), 'il risultato mostrato al cliente parla di: ' + spia);
  }
  deve(/non (?:è )?un preventivo/i.test(e), 'non viene detto che non è un preventivo');
  deve(/non una raccomandazione|non è una raccomandazione/i.test(e), 'non viene detto che non è una raccomandazione');
});

let ko = 0;
console.log('\nPAGINA PUBBLICA — analisi dei bisogni');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nPAGINA PUBBLICA: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
