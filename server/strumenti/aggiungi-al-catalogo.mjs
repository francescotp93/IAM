/* ═══════════════════════════════════════════════════════════════════════════════
   AGGIUNGERE COMPAGNIE AL CATALOGO DELLE NOTE INFORMATIVE      (08/10/2026)

   Il catalogo (`tariffe/dati/note-informative.json`) è l'elenco degli
   indirizzi da cui si prendono i documenti precontrattuali delle compagnie.
   Cresce: l'8/10/2026 è passato da 10 compagnie a oltre trenta, comprese le
   banche che vendono prodotti assicurativi.

   Questo strumento fonde un elenco nuovo dentro quello che c'è, e fa le tre
   cose che a mano si sbagliano:

   1. NON CREA DOPPIONI. La chiave è l'URL: se c'è già, non si tocca — e
      soprattutto NON SI PERDE lo stato di una verifica già fatta. Un
      documento «verificato» con la sua impronta non deve tornare «trovato»
      solo perché una ricerca l'ha ritrovato.
   2. OGNI DOCUMENTO NUOVO NASCE «trovato», mai «verificato». Verificato vuol
      dire che qualcuno l'ha scaricato e ne ha l'impronta; una ricerca sul web
      non è una verifica, e chiamarla così sarebbe la bugia più comoda.
   3. RACCOGLIE I DOMINI. L'elenco dei domini del catalogo deve combaciare con
      quello della funzione `prendi-documento`, altrimenti il documento non si
      scarica e nessuno capisce perché. Lo strumento stampa i domini nuovi da
      aggiungere alla funzione, uno per riga.

       node server/strumenti/aggiungi-al-catalogo.mjs <elenco.json> [--scrivi]

   Senza `--scrivi` non cambia niente: dice solo che cosa farebbe.
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.resolve(QUI, '..', '..');
const CAT = path.join(RADICE, 'tariffe', 'dati', 'note-informative.json');
const FN = path.join(RADICE, 'supabase', 'functions', 'prendi-documento', 'index.ts');

const sorgente = process.argv[2];
const scrivi = process.argv.indexOf('--scrivi') >= 0;
if (!sorgente || !fs.existsSync(sorgente)) {
  console.error('Serve il file dell\'elenco nuovo: node server/strumenti/aggiungi-al-catalogo.mjs <elenco.json> [--scrivi]');
  process.exit(2);
}

const cat = JSON.parse(fs.readFileSync(CAT, 'utf8'));
const nuovo = JSON.parse(fs.readFileSync(sorgente, 'utf8'));

/* L'elenco nuovo può arrivare come array di gruppi ({compagnie:[…]}) o come
   array di compagnie: si accettano tutt'e due invece di pretendere una forma. */
const compagnieNuove = [];
(Array.isArray(nuovo) ? nuovo : [nuovo]).forEach((x) => {
  if (x && Array.isArray(x.compagnie)) compagnieNuove.push(...x.compagnie);
  else if (x && x.compagnia) compagnieNuove.push(x);
});

const perNome = {};
cat.compagnie.forEach((c) => { perNome[c.compagnia.toLowerCase()] = c; });
const urlEsistenti = new Set();
cat.compagnie.forEach((c) => (c.documenti || []).forEach((d) => urlEsistenti.add(String(d.url))));

let aggiunte = 0, documenti = 0, saltati = 0;
const dominiNuovi = new Set();

compagnieNuove.forEach((n) => {
  const nome = String(n.compagnia || '').trim();
  if (!nome) return;
  let c = perNome[nome.toLowerCase()];
  if (!c) {
    c = { compagnia: nome, nota: 'Aggiunta l\'08/10/2026 cercando online. Nessuno di questi indirizzi è ancora stato aperto.',
      a_mandato: false, natura: n.natura || null, documenti: [] };
    cat.compagnie.push(c); perNome[nome.toLowerCase()] = c; aggiunte++;
  }
  (n.documenti || []).forEach((d) => {
    const url = String(d.url || '').trim();
    if (!/^https:\/\//i.test(url)) { saltati++; return; }
    /* Un URL che c'è già NON si tocca: potrebbe portare una verifica fatta,
       con la sua impronta, e riscriverlo la cancellerebbe. */
    if (urlEsistenti.has(url)) { saltati++; return; }
    urlEsistenti.add(url);
    try { dominiNuovi.add(new URL(url).hostname); } catch (e) { saltati++; return; }
    c.documenti.push({
      ramo: d.ramo || 'altro',
      prodotto: d.prodotto || '(senza nome)',
      tipo: d.tipo || 'set_informativo',
      url: url,
      /* MAI «verificato»: una ricerca sul web non è una verifica. */
      stato: 'trovato',
      trovato_il: '2026-10-08',
      come_trovato: d.come_trovato || 'ricerca sul dominio della compagnia',
    });
    documenti++;
  });
});

const dominiCat = new Set(cat._domini_da_cui_si_prende || []);
const daAggiungere = [...dominiNuovi].filter((h) => !dominiCat.has(h)).sort();
const fn = fs.readFileSync(FN, 'utf8');
const nonAmmessi = daAggiungere.filter((h) => fn.indexOf("'" + h + "'") < 0);

console.log('\nFUSIONE NEL CATALOGO');
console.log('  compagnie nuove:      ' + aggiunte);
console.log('  documenti aggiunti:   ' + documenti);
console.log('  saltati (gia c\'erano o indirizzo non valido): ' + saltati);
console.log('  domini nuovi:         ' + daAggiungere.length);
console.log('\nDOMINI DA AGGIUNGERE ALLA FUNZIONE prendi-documento (' + nonAmmessi.length + '):');
nonAmmessi.forEach((h) => console.log("  '" + h + "',"));

if (!scrivi) { console.log('\n(prova a vuoto: niente è stato scritto. Rilancia con --scrivi)'); process.exit(0); }

cat._domini_da_cui_si_prende = [...dominiCat, ...daAggiungere].sort();
fs.writeFileSync(CAT, JSON.stringify(cat, null, 2) + '\n');
console.log('\nScritto ' + CAT);
console.log('Ora i domini vanno messi anche nella funzione, o il documento non si scarica.');
