// ═══════════════════════════════════════════════════════════════════════════════
//  CATALOGO PRODOTTI — il pannello di IAM  (20/09/2026)
//
//  Le REGOLE stanno nel motore condiviso e hanno le loro ventun prove in
//  `server/verifica/catalogo.test.mjs`. Qui si sorveglia che il pannello:
//
//    · usi il motore invece di riscriverne le regole (§5);
//    · CHIAMI davvero quello che dichiara — una funzione di controllo che non
//      chiama nessuno è il guasto numero uno di questo repository (§1);
//    · non ELIMINI mai un prodotto: sotto ci sono polizze, e sono storia (§26);
//    · sia raggiungibile — una pagina senza voce di menu e senza la sua riga in
//      `goTab` è un riquadro vuoto (§6b);
//    · non confonda «non si è potuto leggere» con «non ce n'è» (§12, §18);
//    · e che la migrazione e il motore normalizzino i nomi ALLO STESSO MODO:
//      se divergono, il database accetta un doppione che il codice credeva
//      impossibile.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const SCOCCA = fs.readFileSync(path.join(QUI, '..', 'withus-one.js'), 'utf8');
const QUOTO = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const SQL = fs.readFileSync(path.join(RADICE, 'supabase', 'migrations', '20260920_catalogo_prodotti.sql'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'catalogo.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* Il blocco del pannello, senza i commenti a inizio riga: un commento che
   NOMINA quello che una prova vieta la fa diventare rossa su un codice
   corretto — è la trappola già presa nove volte (§10, §12, §18, §26, §29,
   §31, §33, §34, §37). Mai una regex globale su /* … *​/, che su un file
   così grande si mangia mezzo documento (§12). */
const blocco = (() => {
  const i = H.indexOf('var CAT_COMPAGNIE');
  const j = H.indexOf('function showReset()');
  deve(i > 0 && j > i, 'il blocco cat* non si ritaglia: l’ancora è cambiata');
  return H.slice(i, j).split('\n').filter(r => !/^\s*(\/\*|\*|\/\/)/.test(r)).join('\n');
})();

prova('il motore è quello CONDIVISO, caricato e non copiato', () => {
  /* Si cerca il TAG, non la stringa: quel percorso compare anche nei commenti
     del blocco, e una prova che cercasse la parola resterebbe verde con una
     copia locale — due vocabolari dei prodotti sarebbero due cataloghi della
     stessa agenzia. */
  deve(/<script src="\/nuovo-preventivo\/tariffe\/motore\/catalogo\.js\?v=/.test(H),
    'IAM non carica il motore del catalogo dal preventivatore');
  deve(/<script src="tariffe\/motore\/catalogo\.js\?v=/.test(QUOTO),
    'QUOTO non carica il motore del catalogo: l’importazione riconoscerebbe con regole sue');
  /* E le regole non sono state riscritte di qua. */
  deve(!/function catNorm\b/.test(blocco), 'la normalizzazione è stata riscritta nel pannello');
  ['risolviCompagnia', 'valida', 'fondi', 'pianoCatalogo', 'copertura', 'vendibile'].forEach(f => {
    deve(new RegExp('M\\.' + f + '\\(|Catalogo\\.' + f + '\\(').test(blocco),
      'il pannello non usa ' + f + ' del motore: se la riscrive, sono due regole');
  });
  return 'motore condiviso, zero regole locali';
});

prova('la porta è chiusa a chi non deve scriverci, e il cancello è CHIAMATO', () => {
  /* §1: una funzione di controllo che non chiama nessuno non è un controllo.
     Il cancello VERO sta nelle politiche del database; qui si sorveglia che il
     pannello non mostri una porta che poi si chiude in faccia. */
  deve(/function catPuoScrivere\(\)/.test(blocco), 'manca catPuoScrivere');
  deve(/ruolo === 'admin'/.test(blocco), 'la soglia non è quella dell’amministrazione');
  deve(/const puo = catPuoScrivere\(\);/.test(blocco), 'catPuoScrivere non la chiama nessuno');
  /* E il database dice la stessa cosa, con l'unica eccezione dichiarata:
     l'importazione la lancia lo staff, e può REGISTRARE quello che ha trovato
     — marcato, e senza poter correggere niente. */
  deve(/for update to authenticated using \(iam_is_admin\(\)\)/.test(SQL), 'l’update non è riservato all’admin');
  deve(/for delete to authenticated using \(iam_is_admin\(\)\)/.test(SQL), 'la cancellazione non è riservata all’admin');
  deve(/iam_is_staff\(\) and origine = 'import' and da_verificare = true/.test(SQL),
    'lo staff non può registrare quello che l’importazione trova, oppure può fare di più');
  return 'admin per scrivere, staff solo per registrare l’import';
});

prova('un prodotto non si ELIMINA: si disattiva', () => {
  /* Sotto un prodotto ci sono polizze, e cancellarlo le renderebbe orfane
     (§26). Non c'è nemmeno una cancellazione nel pannello, ed è misurato. */
  deve(!/from\('iam_compagnia_prodotti'\)[\s\S]{0,80}\.delete\(/.test(blocco),
    'il pannello cancella un prodotto');
  deve(!/from\('iam_prodotti_standard'\)[\s\S]{0,80}\.delete\(/.test(blocco),
    'il pannello cancella un prodotto standard');
  deve(/function catSpegni\(/.test(blocco) && /attivo: !!eraSpento/.test(blocco),
    'non c’è il modo di disattivare');
  /* E si dice a parole, perché è la cosa che chi guarda sta per sbagliare. */
  deve(/non si elimina: si disattiva/.test(H), 'la schermata non lo spiega');
  return 'nessuna cancellazione, e lo dice';
});

prova('fondere non cancella: il nome scartato diventa un alias', () => {
  const f = blocco.slice(blocco.indexOf('async function catFondi'), blocco.indexOf('function catApriStandard'));
  deve(/M\.fondi\(tenuto, scartato\)/.test(f), 'la fusione non passa dal motore');
  deve(/alias: f\.tenuto\.alias/.test(f), 'l’alias del tenuto non viene scritto');
  deve(/attivo: false/.test(f), 'lo scartato viene cancellato invece che spento');
  deve(!/\.delete\(/.test(f), 'la fusione cancella una riga');
  /* Senza l'alias, l'importazione della notte dopo ricrea lo scartato come
     nuovo e la fusione è da rifare ogni notte. */
  deve(/alias è quello che le fa ritrovare/.test(H), 'non dice perché l’alias serve');
  return 'alias al tenuto, spegnimento allo scartato';
});

prova('si guarda prima di scrivere: il piano è un’anteprima, non una scrittura', () => {
  const a = blocco.slice(blocco.indexOf('function catApriPiano'), blocco.indexOf('async function catScriviPiano'));
  deve(/M\.pianoCatalogo\(/.test(a), 'il piano non viene dal motore');
  deve(!/\.insert\(/.test(a), 'l’anteprima scrive: si scoprirebbero i doppioni quando sono già dentro');
  deve(/Niente è stato scritto/.test(a), 'l’anteprima non dice che non ha scritto niente');
  /* E quello che nasce è marcato: il sistema registra che cosa ha trovato, e
     a dire se va bene è una persona. */
  const w = blocco.slice(blocco.indexOf('async function catScriviPiano'));
  deve(/da_verificare: true/.test(w), 'quello che nasce dall’importazione non è marcato');
  deve(/origine: 'import'/.test(w), 'non si sa più da dove viene');
  return 'il piano non tocca niente, la scrittura marca tutto';
});

prova('«non si è potuto leggere» non diventa «non ce n’è»', () => {
  /* Cinque letture: se una cade, si dice QUALE — «qualcosa è andato storto»
     non dice a nessuno dove guardare (§35). E la copertura può cadere senza
     rendere inutile la schermata. */
  deve(/const leggi = async \(nome, q, vuoto\)/.test(blocco), 'le letture non sono isolate una per una');
  deve(/guasti\.push\(\{ nome, motivo/.test(blocco), 'un guasto non porta il nome della lettura');
  deve(!/Promise\.all\(\[[\s\S]{0,400}throw/.test(blocco), 'è tornata la lettura che cade tutta insieme');
  deve(/Non vuol dire che non ci sia niente/.test(blocco), 'un errore di lettura si confonde con un elenco vuoto');
  return 'cinque letture, cinque nomi';
});

prova('la schermata si raggiunge: voce di menu, rotta e inizializzatore', () => {
  /* §6b: una pagina il cui contenuto lo scrive il codice, senza la sua riga
     in `goTab`, apre un riquadro vuoto. */
  deve(/id="panel-catalogo"/.test(H), 'manca il pannello');
  deve(/if \(t === 'catalogo'\)\s*\{[^}]*catCarica\(true\)/.test(H), 'aprendo la pagina non si carica niente');
  deve(/act: 'catalogo', go: function\(\)\{ vai\('catalogo'\); \}/.test(SCOCCA), 'non c’è la voce di menu');
  deve(/catalogo: 'strumenti'/.test(SCOCCA), 'la voce non evidenzia il suo cassetto');
  deve(/catalogo:\s*\['Catalogo prodotti', 'Strumenti'\]/.test(SCOCCA), 'manca la briciola in alto');
  return 'menu → rotta → inizializzatore';
});

prova('la libreria e i prodotti di compagnia sono DUE cose nel registro', () => {
  /* Vivono in due tabelle: una voce sola aprirebbe la riga sbagliata la metà
     delle volte, e un id che apre la cosa di qualcun altro è peggio di un id
     assente (§18, regola 1). */
  const R = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', 'registro.js'), 'utf8');
  deve(/prodotto:\s*\{[^}]*tabella: 'iam_compagnia_prodotti'/.test(R), 'il prodotto di compagnia non ha la sua tabella');
  deve(/prodotto_standard:\s*\{[^}]*tabella: 'iam_prodotti_standard'/.test(R), 'il prodotto standard non ha la sua voce');
  deve(/compagnia:\s*\{[^}]*tabella: 'quote_compagnie'/.test(R), 'la compagnia non ha la sua voce');
  deve(/logMovimento\('creazione', 'prodotto_standard'/.test(blocco), 'la libreria non usa la sua voce');
  return 'tre voci, tre tabelle';
});

prova('il database normalizza i nomi ESATTAMENTE come il motore', () => {
  /* Se le due normalizzazioni divergono, l'indice unico accetta un doppione
     che il codice credeva impossibile — ed è il modo in cui un catalogo
     comincia a contenere due volte lo stesso prodotto senza che nessuno se
     ne accorga. */
  deve(/create or replace function iam_nome_norm/.test(SQL), 'manca la funzione di normalizzazione');
  const m = /translate\(lower\(coalesce\(t, ''\)\),\s*'([^']+)',\s*'([^']+)'\)/.exec(SQL);
  deve(m, 'la tabella degli accenti non si legge dalla migrazione');
  deve(m[1].length === m[2].length, 'le due stringhe di translate hanno lunghezze diverse: ' + m[1].length + ' e ' + m[2].length);
  /* Il confronto vero: la stessa tabella deve stare nel motore. */
  const J = fs.readFileSync(path.join(RADICE, 'tariffe', 'motore', 'catalogo.js'), 'utf8');
  deve(J.includes("var da = '" + m[1] + "'"), 'gli accenti del motore non sono quelli della migrazione');
  deve(J.includes("var a  = '" + m[2] + "'"), 'le sostituzioni del motore non sono quelle della migrazione');
  deve(/\[\^a-z0-9\]\+/.test(SQL) && /\[\^a-z0-9\]\+/.test(J), 'le due non tolgono la stessa punteggiatura');
  /* E l'indice unico esiste davvero su quella funzione. */
  deve(/unique index[\s\S]{0,120}iam_compagnia_prodotti \(compagnia_id, ramo, iam_nome_norm\(nome\)\)/.test(SQL),
    'senza l’indice unico il doppione lo ferma solo il codice, e il codice non è l’unica strada');
  return 'stessa tabella accenti, stessa punteggiatura, indice unico';
});

prova('la migrazione NON tocca nessuna tabella esistente', () => {
  /* È la promessa scritta in testa al file, e va misurata: un `alter table`
     su `quote_polizze` o sulle tariffe sarebbe una modifica distruttiva su
     dati che funzionano, per agganciarli a una tabella ancora vuota. */
  const alter = SQL.split('\n').filter(r => /^\s*alter table/i.test(r));
  alter.forEach(r => deve(/iam_prodotti_standard|iam_compagnia_prodotti/.test(r),
    'la migrazione altera una tabella esistente: ' + r.trim()));
  deve(!/\bdrop table\b(?![^\n]*--)/i.test(SQL.replace(/^--.*$/gm, '')), 'la migrazione lascia una drop table fuori dal rollback');
  deve(/prodotto_id/.test(SQL) && /Convertire oggi/.test(SQL),
    'non è scritto perché le colonne a stringa restano come sono');
  return alter.length + ' alter table, tutte sulle due tabelle nuove';
});

console.log('\n══ CATALOGO PRODOTTI (IAM) ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCATALOGO IAM: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
