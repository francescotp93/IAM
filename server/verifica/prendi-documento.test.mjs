// ═══════════════════════════════════════════════════════════════════════════════
//  IL RACCOGLITORE DEI DOCUMENTI: L'ELENCO DEI DOMINI
//
//  La funzione `prendi-documento` gira su Supabase e scarica i documenti dai
//  siti delle compagnie, perché la rete di chi li legge è chiusa e quella di
//  Supabase no.
//
//  Una funzione così, scritta male, è un PROXY APERTO sull'infrastruttura
//  dell'agenzia: chi riuscisse a chiamarla potrebbe raggiungere qualsiasi
//  indirizzo — una rete interna, un servizio di terzi — e nei log di quel
//  servizio comparirebbe l'agenzia, non lui.
//
//  Il vincolo che lo impedisce è un elenco di domini, e un elenco di domini
//  controllato male non vale niente: «sara.it.male.com» finisce per «sara.it»
//  se si guarda la fine della stringa invece dell'host intero, e un 302 verso
//  un altro host è esattamente il modo in cui un elenco si aggira.
//
//  Qui si prende il codice VERO della funzione e si esegue il suo controllo.
//  Non si può provare lo scaricamento — serve la rete che non c'è — ma la
//  parte che decide CHE COSA si può scaricare sì, e è quella che conta.
//
//      node server/verifica/prendi-documento.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SRC = fs.readFileSync(path.join(RADICE, 'supabase', 'functions', 'prendi-documento', 'index.ts'), 'utf8');
const CATALOGO = JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe', 'dati', 'note-informative.json'), 'utf8'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Si estrae il controllo dal sorgente vero, invece di riscriverlo qui: una
   copia della regola proverebbe la copia. */
function estrai() {
  const mD = SRC.match(/const DOMINI = \[([\s\S]*?)\]/);
  const mF = SRC.match(/function dentroElenco\(u: URL\): boolean \{([\s\S]*?)\n\}/);
  deve(mD && mF, 'non trovo l\'elenco dei domini o il controllo nel sorgente della funzione');
  /* I COMMENTI SI TOLGONO PRIMA DI TAGLIARE SULLE VIRGOLE. In questa casa i
     commenti stanno dappertutto, anche dentro un elenco, e un commento
     contiene virgole: tagliando prima, un dominio si attacca alla coda del
     commento che lo precede e sparisce dall'elenco letto. È successo
     aggiungendo HDI, e la prova è andata rossa invece di perdere un dominio
     in silenzio — ma meglio che non succeda. */
  const domini = mD[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    .split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  /* Il corpo è TypeScript solo nella firma: dentro è JavaScript. Si toglie
     l'annotazione e si esegue quello che c'è scritto davvero. */
  const corpo = mF[1].replace(/:\s*boolean/g, '');
  const fn = new Function('DOMINI', 'u', corpo);
  return { domini, dentro: (indirizzo) => { try { return !!fn(domini, new URL(indirizzo)); } catch (e) { return false; } } };
}

const { domini, dentro } = estrai();

prova('l\'elenco dei domini non è vuoto, e combacia col catalogo', () => {
  deve(domini.length > 0, 'elenco vuoto: la funzione non scaricherebbe da nessuna parte');
  const delCatalogo = CATALOGO._domini_da_cui_si_prende || [];
  deve(delCatalogo.length > 0, 'il catalogo non dichiara i suoi domini');
  /* Due elenchi della stessa cosa si separano: se un domani il catalogo
     nomina un dominio che la funzione non ha, la raccolta si fermerebbe su
     quella compagnia senza che nessuno capisca perché. */
  const mancanti = delCatalogo.filter((d) => domini.indexOf(d) < 0);
  deve(!mancanti.length, 'il catalogo usa domini che la funzione non accetta: ' + mancanti.join(', '));
  const inPiu = domini.filter((d) => delCatalogo.indexOf(d) < 0);
  deve(!inPiu.length, 'la funzione accetta domini che il catalogo non usa: ' + inPiu.join(', '));
});

prova('ogni URL del catalogo passa il controllo', () => {
  const tutti = [];
  (CATALOGO.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => tutti.push([c.compagnia, d.url])));
  deve(tutti.length >= 20, 'il catalogo ha solo ' + tutti.length + ' documenti: la prova non misura niente');
  tutti.forEach(([chi, u]) => {
    deve(/^https:\/\//.test(u), chi + ': l\'indirizzo non è https — ' + u);
    deve(dentro(u), chi + ': il suo indirizzo NON passa il controllo, quindi non si potrebbe scaricare — ' + u);
  });
});

prova('NIENTE HTTP IN CHIARO', () => {
  /* Un documento preso in chiaro può essere stato cambiato da chiunque stia
     in mezzo, e quello che ne esce finisce su un confronto mostrato a un
     cliente. */
  deve(!dentro('http://www.sara.it/x.pdf'), 'accetta http in chiaro');
  deve(!dentro('ftp://www.sara.it/x.pdf'), 'accetta ftp');
  deve(!dentro('file:///etc/passwd'), 'accetta un indirizzo di file locale');
});

prova('UN DOMINIO CHE SI TRAVESTE NON PASSA', () => {
  /* Il modo classico di aggirare un elenco scritto come «finisce con». */
  ['https://www.sara.it.male.com/x.pdf',
   'https://cdn.groupama.it.male.com/x.pdf',
   'https://malewww.sara.it/x.pdf',
   'https://www.sara.it.evil/x.pdf'].forEach((u) => {
    deve(!dentro(u), 'PASSA un dominio travestito: ' + u);
  });
});

prova('e nemmeno un sottodominio che nessuno ha autorizzato', () => {
  /* `dallbogg.it` è nell'elenco; `qualcosa.dallbogg.it` no, e va bene così:
     il giorno che serve, si aggiunge a mano e si sa che è stato aggiunto. */
  deve(dentro('https://dallbogg.it/wp-content/x.pdf'), 'non accetta il dominio che è nell\'elenco');
  deve(!dentro('https://interno.dallbogg.it/x.pdf'), 'accetta un sottodominio non elencato');
});

prova('LA RETE INTERNA E I SERVIZI DI METADATI NON SI RAGGIUNGONO', () => {
  /* Il danno peggiore di un proxy aperto: farsi leggere le credenziali della
     macchina su cui gira. */
  ['https://localhost/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data/',
   'https://metadata.google.internal/x', 'https://10.0.0.1/x', 'https://192.168.1.1/x',
   'https://[::1]/x'].forEach((u) => {
    deve(!dentro(u), 'RAGGIUNGE un indirizzo interno: ' + u);
  });
});

prova('i reindirizzamenti si seguono a mano, e ogni salto si controlla', () => {
  /* Lasciando seguire i reindirizzamenti alla libreria, l'elenco dei domini
     vale solo per il primo indirizzo: un 302 porta dove vuole. */
  deve(/redirect:\s*'manual'/.test(SRC), 'la funzione lascia seguire i reindirizzamenti da sola');
  deve(/if \(!dentroElenco\(u\)\) throw/.test(SRC), 'il controllo non è dentro il ciclo dei salti');
  const ciclo = SRC.match(/for \(let n = 0; n <= SALTI; n\+\+\) \{([\s\S]*?)\n  \}/);
  deve(ciclo, 'non trovo il ciclo dei reindirizzamenti');
  deve(/dentroElenco/.test(ciclo[1]), 'dentro il ciclo non si ricontrolla il dominio: un 302 scappa');
  deve(/troppi reindirizzamenti/.test(SRC), 'i salti non hanno un tetto: un anello girerebbe per sempre');
});

prova('si controlla che sia un PDF guardando i byte, non l\'etichetta', () => {
  /* Un sito che risponde «200 OK» con una pagina di errore e il tipo
     sbagliato farebbe archiviare un HTML come documento di prodotto. */
  deve(/'%PDF-'/.test(SRC), 'non si guarda la firma del file');
  deve(/if \(firma !== '%PDF-'\)/.test(SRC), 'la firma si legge ma non si usa per rifiutare');
});

prova('il tetto al peso del file è un numero vero, non una parola', () => {
  /* Cercare la parola «TETTO» nel sorgente non misura niente: la si può
     lasciare lì e metterla a infinito. Si prende il valore e si guarda. */
  const m = SRC.match(/const TETTO = ([^\n]+)/);
  deve(m, 'non c\'è nessun tetto al peso del file');
  let v;
  try { v = Function('return (' + m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim() + ')')(); }
  catch (e) { throw new Error('il tetto non è un numero calcolabile: ' + m[1]); }
  deve(Number.isFinite(v), 'il tetto non è finito: ' + v + ' — un file grande quanto si vuole entra');
  deve(v > 1024 * 1024, 'il tetto è troppo basso (' + v + '): un set informativo vero pesa un paio di MB');
  deve(v <= 100 * 1024 * 1024, 'il tetto è troppo alto: ' + v);
  /* E va usato in tutt'e due i posti: l'intestazione può mentire, quindi si
     ricontrolla sui byte arrivati. */
  deve((SRC.match(/> TETTO/g) || []).length >= 2,
    'il tetto si controlla in un posto solo: l\'intestazione «content-length» può mentire');
});

prova('LA FUNZIONE NON SALVA NIENTE: torna il file e basta', () => {
  /* La prima versione metteva il PDF in un archivio su Supabase, e per farlo
     serviva creare un secchio, decidere chi può leggerlo e tenerlo pulito:
     tre cose da approvare e da curare per un file che a chi lo chiede serve
     subito e una volta sola. L'impronta la calcola già il browser, e il
     documento che vale la pena tenere è quello che una persona ha confermato.

     Meno cose da approvare non è una comodità: è meno superficie su cui
     sbagliare, su un'infrastruttura che tiene i dati dei clienti. */
  deve(!/storage\s*\./.test(SRC), 'la funzione scrive in un archivio di file');
  deve(!/createClient|SERVICE_ROLE/.test(SRC),
    'la funzione usa una chiave di servizio: non le serve, e una chiave in meno in giro è una chiave in meno da perdere');
  deve(/pdf_base64/.test(SRC), 'la funzione non restituisce il file: allora chi l\'ha chiesto non ce l\'ha');
  deve(/Non tocca nessuna tabella/.test(SRC), 'non dichiara di non toccare niente');
});

prova('la funzione non archivia e non decide', () => {
  /* Prende il file e dice che cosa ha preso. Se una garanzia è presente o
     assente lo decide la schermata, con una persona davanti. */
  deve(!/iam_conf_prodotti|iam_conf_garanzie|iam_conf_documenti/.test(SRC),
    'la funzione scrive nell\'archivio: quello lo fa la schermata, dopo che una persona ha confermato');
  deve(!/'assente'/.test(SRC), 'la funzione parla di stati delle garanzie: non è il suo mestiere');
});

prova('un indirizzo scaduto si dichiara per quello che è', () => {
  /* Le compagnie spostano i PDF a ogni edizione: un 404 non è un guasto, è
     il mestiere, e va detto con parole che dicono cosa fare.
     La prova guarda il CAMPO che la funzione restituisce, non la parola nel
     sorgente: «scaduto» compare anche nei commenti, e cercarla là voleva dire
     non accorgersi che il campo era stato tolto. */
  deve(/scaduto:\s*r\.status === 404/.test(SRC),
    'un 404 non si distingue da un errore qualunque: manca il campo «scaduto» nella risposta');
  /* E la spiegazione sta nel messaggio che legge una persona, non in un
     commento che legge solo chi apre il file. */
  const msg = SRC.match(/motivo: 'Il sito della compagnia ha risposto[\s\S]*?\}, \{ status: 200 \}\)/);
  deve(msg, 'non trovo il messaggio che si dà quando il sito risponde male');
  deve(/edizione nuova/.test(msg[0]),
    'il messaggio non spiega che a ogni edizione nuova l\'indirizzo cambia: ' + msg[0].slice(0, 120));
});

prova('il catalogo dichiara di non essere verificato', () => {
  /* Dall'ambiente degli agenti non si è potuto nemmeno chiedere se un
     indirizzo risponde. Un catalogo che non lo dicesse farebbe credere che
     quei venticinque indirizzi siano buoni. */
  deve(CATALOGO._IL_LIMITE_DA_SAPERE, 'il catalogo non dichiara il suo limite');
  deve(/NESSUNO DI QUESTI URL È STATO VERIFICATO/.test(CATALOGO._IL_LIMITE_DA_SAPERE),
    'il limite non è dichiarato in modo che si veda: ' + CATALOGO._IL_LIMITE_DA_SAPERE.slice(0, 80));
  const stati = [];
  (CATALOGO.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => stati.push(d.stato)));
  deve(stati.every((s) => s === 'trovato'),
    'un documento si dichiara già preso senza che nessuno l\'abbia aperto: ' + JSON.stringify([...new Set(stati)]));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPRENDI DOCUMENTO — l\'elenco dei domini');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nPRENDI DOCUMENTO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
