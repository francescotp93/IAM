// ═══════════════════════════════════════════════════════════════════════════════
//  IL FIDO DELLA PERSONA — la scheda di IAM  (Blocco 3 · punto 6, 20/09/2026)
//
//  Le regole stanno nel motore condiviso (`Sospensione.fidi`, quattro prove in
//  `server/verifica/sospensione.test.mjs`). Qui si sorveglia che la scheda:
//
//   · carichi il motore invece di riscriverne le regole (§5, §10);
//   · CHIAMI davvero quello che dichiara (§1);
//   · non confonda «vuoto» con «zero» — sono due cose diverse, e confonderle
//     direbbe che una persona non può tenere niente quando invece nessuno ha
//     deciso;
//   · lasci la porta chiusa a chi non deve decidere quanto denaro resta in
//     mano a qualcuno;
//   · non confonda «non si è potuto leggere» con «non c'è un fido» (§18).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const SQL_TUTTO = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_sospensioni_e_fido.sql'), 'utf8');
/* Solo le righe di CODICE: i commenti di una migrazione spiegano anche quello
   che la migrazione NON fa, e una prova che cerca quelle parole dichiara rotto
   un file corretto. Si tolgono le righe che cominciano con `--` a inizio riga,
   mai con una regex globale (§12). */
const SQL = SQL_TUTTO.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
const require = createRequire(import.meta.url);
const S = require(path.join(RADICE, 'tariffe', 'motore', 'sospensione.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il blocco senza i commenti a inizio riga: un commento che NOMINA quello che
   una prova vieta la fa diventare rossa su un codice corretto (§10, §12, §18,
   §26, §29, §31, §33, §34, §37). Mai una regex globale su /* … *​/ (§12). */
const blocco = (() => {
  const i = H.indexOf('let FID_PERSONA');
  const j = H.indexOf('function ccpPuoDecidere()');
  deve(i > 0 && j > i, 'il blocco fid* non si ritaglia: l’ancora è cambiata');
  return H.slice(i, j).split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
})();

prova('il motore è quello CONDIVISO, caricato e non copiato', () => {
  /* Si cerca il TAG, non la stringa: quel percorso compare anche nei commenti,
     e una prova che cercasse la parola resterebbe verde con una copia locale —
     il tetto al credito di una persona non può avere due regole. */
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/sospensione\.js\?v=/.test(H),
    'IAM non carica il motore delle sospensioni dal preventivatore');
  const QUOTO = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  deve(/<script src="tariffe\/motore\/sospensione\.js\?v=/.test(QUOTO),
    'QUOTO non carica il motore: il riepilogo d’agenzia giudicherebbe con regole sue');
  return 'un file solo, due documenti';
});

prova('il fido si installa aprendo la scheda, e qualcuno lo chiama', () => {
  /* §1: il guasto numero uno di questo repository è il codice che nessuno
     chiama. E si installa INSIEME ai codici: due letture su due aperture
     diverse sono due occasioni di dimenticarne una. */
  deve(/id="mc-fido"/.test(H), 'manca il contenitore del fido nella scheda');
  deve(/\n  fidInstalla\(personaId\);/.test(H), 'fidInstalla non la chiama nessuno');
  deve(/async function fidInstalla\(personaId\)/.test(blocco), 'manca fidInstalla');
  return 'contenitore + chiamata dentro ccpInstalla';
});

prova('vuoto e ZERO sono due cose diverse', () => {
  /* La regola che rende onesto tutto il resto. Un campo vuoto TOGLIE il fido;
     uno zero è un accordo — questa persona non tiene denaro dell'agenzia. */
  deve(/if \(String\(raw \|\| ''\)\.trim\(\) !== ''\)/.test(blocco),
    'il campo vuoto non è distinto dallo zero: un vuoto diventerebbe un fido a zero');
  deve(/valore = null/.test(blocco), 'non c’è il caso «nessun fido dichiarato»');
  /* E lo dice a chi guarda, con tre frasi diverse. */
  deve(/Nessun fido dichiarato/.test(blocco), 'non spiega che cosa vuol dire lasciarlo vuoto');
  deve(/Fido a zero/.test(blocco), 'non spiega che cosa vuol dire zero');
  /* Il motore la pensa allo stesso modo, ed è lui che decide: qui si
     verifica che le due letture non divergano. */
  const f = S.fidi([{ collaboratore_id: 'p', importo: 10 }], [{ id: 'p', fido: null }]);
  deve(f.righe.length === 0 && f.senzaFido.length === 1, 'il motore giudica un fido non dichiarato');
  const z = S.fidi([{ collaboratore_id: 'p', importo: 10 }], [{ id: 'p', fido: 0 }]);
  deve(z.righe.length === 1 && z.righe[0].superato === true, 'il motore non conta un fido a zero');
  return 'vuoto → fuori dai conti, zero → conta';
});

prova('decide l’admin, e il cancello è CHIAMATO', () => {
  /* Qui si decide quanto denaro può restare in mano a qualcuno: è la stessa
     soglia dei codici collaboratore (§19) e dei conti (§26). Il cancello vero
     resta nelle politiche del database. */
  deve(/function fidPuo\(\) \{ return PROFILO\?\.ruolo === 'admin'; \}/.test(blocco), 'manca fidPuo');
  deve(/if \(!fidPuo\(\) \|\| !FID_PERSONA\) return;/.test(blocco), 'fidSalva non chiama il cancello');
  deve(/const puo = fidPuo\(\);/.test(blocco), 'la schermata non usa il cancello per nascondere la porta');
  return 'admin, e chiamato in due punti';
});

prova('«non si è potuto leggere» non diventa «non c’è un fido»', () => {
  deve(/non vuol dire che non ce ne sia uno/.test(blocco),
    'un errore di lettura si confonde con un fido assente (§18)');
  return 'due frasi per due cose';
});

prova('un fido salvato lascia traccia a registro', () => {
  /* «Chi ha alzato il fido a questa persona, e quando» è la domanda che arriva
     mesi dopo, ed è il motivo per cui il registro esiste (§18). */
  deve(/logMovimento\(/.test(blocco), 'il fido si cambia senza lasciare traccia');
  deve(/'collaboratore'/.test(blocco), 'il movimento non punta alla persona');
  deve(/FID_PERSONA\);/.test(blocco), 'il movimento non porta l’identificativo della riga toccata');
  return 'movimento con il puntatore';
});

prova('la migrazione mette il fido sulla PERSONA, e non inventa niente', () => {
  /* La scelta misurata: il credito si calcola su chi ha INCASSATO, e chi ha
     incassato può non avere una scheda economica — lì sarebbe risultato senza
     limite, in silenzio. */
  deve(/alter table quote_collaboratori\s+add column if not exists fido/.test(SQL),
    'il fido non sta sulla persona');
  deve(!/alter table iam_team[\s\S]{0,80}fido/.test(SQL), 'il fido è finito sulla scheda economica');
  /* Nullable e senza default: nessun numero «ragionevole» viene deciso da una
     migrazione (§8.1). */
  deve(!/fido numeric[^;]*default/.test(SQL), 'la migrazione dà un fido di partenza a tutti');
  deve(/check \(fido is null or fido >= 0\)/.test(SQL), 'un fido negativo entrerebbe nel database');
  /* E il limite delle sospensioni, per lo stesso motivo. */
  deve(/sospensione_giorni_max integer/.test(SQL), 'manca il limite per compagnia');
  deve(!/sospensione_giorni_max integer[^;]*default/.test(SQL), 'la migrazione decide quanto può durare una sospensione');
  return 'tre colonne, tutte vuote alla nascita';
});

prova('le sospensioni sono un ELENCO, non due date', () => {
  /* Una polizza può essere sospesa più volte nella stessa annualità, e i
     giorni si sommano. Con `sospesa_dal`/`sospesa_al` la seconda sospensione
     cancellerebbe la prima, e i giorni recuperati dal cliente sparirebbero. */
  deve(/sospensioni jsonb not null default '\[\]'::jsonb/.test(SQL), 'le sospensioni non sono un elenco');
  deve(!/sospesa_dal|sospesa_al/.test(SQL), 'sono tornate le due colonne che si cancellano a vicenda');
  /* E la scadenza contrattuale non si riscrive: si somma (lo dice il motore,
     e la migrazione lo scrive accanto alla colonna). */
  deve(/data_scadenza`? resta quella contrattuale/.test(SQL_TUTTO), 'non è scritto che la scadenza non si tocca');
  const p = { data_scadenza: '2027-03-01', sospensioni: [
    { dal: '2026-01-01', al: '2026-01-31' }, { dal: '2026-03-01', al: '2026-03-11' }] };
  const st = S.stato(p, '2026-09-20');
  deve(st.giorniTotali === 40, 'due sospensioni non si sommano: ' + st.giorniTotali);
  deve(p.data_scadenza === '2027-03-01', 'il motore ha riscritto la scadenza contrattuale');
  return '30 + 10 giorni, e la contrattuale intatta';
});

console.log('\n══ IL FIDO DELLA PERSONA (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nFIDO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
