// ═══════════════════════════════════════════════════════════════════════════════
//  I DUE DOCUMENTI NON DEVONO AVVICINARSI NEL VERSO SBAGLIATO (17/09/2026, passo 3 modulo 6)
//
//  QUOTO (index.html) e IAM (iam/index.html) sono due documenti. Fonderli
//  concatenandoli non si fa: la strada e' withus-one/, a moduli. Nel frattempo
//  la cosa che NON deve succedere e' che nascano altri doppioni — una funzione
//  con lo stesso nome nei due file e' quasi sempre la stessa schermata
//  scritta due volte (login, MFA, ticket, collaboratori: e' cosi' che erano
//  nate Utenti e Performance). Questa prova misura le collisioni e diventa
//  rossa se aumentano. Il numero si abbassa solo togliendo doppioni, mai
//  alzando la soglia.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const Q = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const I = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const scripts = s => [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
/* I fogli di stile in linea, SENZA i commenti.

   Il 21/09/2026 questo guardiano e' stato rosso per un giorno su `main`
   senza che una riga di codice fosse sbagliata: un commento di QUOTO
   spiegava perche' il kit di IAM non si copia, e per spiegarlo NOMINAVA i
   nomi del kit e il nome di un file di prova. In un foglio di stile un nome
   preceduto da un punto e' un selettore, e un nome di file coi punti e' una
   catena di selettori: cinque collisioni inventate, contate come vere.

   E' la trappola dei commenti per la dodicesima volta (§10, §12, §18, §26,
   §29, §31, §33, §34, §37, §41, §42). Le prime undici volte si e' corretto
   il commento; questa volta si corregge anche la MISURA, che e' quello che
   la prova voleva dire dall'inizio — contare i selettori, non le parole.

   I commenti si tolgono SOLO dentro i blocchi `<style>`, mai sul documento
   intero: una regex globale su `index.html` si mangia 450.000 caratteri,
   perche' le due sequenze che aprono e chiudono un commento compaiono anche
   dentro le espressioni regolari del JavaScript, e la ricerca accoppia pezzi
   che non sono commenti (§12).

   (E questo commento non le scrive nemmeno una volta: la prima stesura le
   citava, la seconda chiudeva il commento a meta' e il file non si caricava
   piu'. La regola di §31 vale anche qui.) */
const styles = s => [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map(m => m[1].replace(/\/\*[\s\S]*?\*\//g, ' ')).join('\n');
export const globali = js => new Set([...js.matchAll(/^(?:async\s+)?(?:function\s+|var\s+|let\s+|const\s+)([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
export const id = s => new Set([...s.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(m => m[1]));
export const classi = css => new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m => m[1]));
const comuni = (a, b) => [...a].filter(x => b.has(x)).sort();

/* La soglia e' la misura del 17/09/2026. Si abbassa, non si alza.
   `classi` e' scesa da 17 a 15 il 21/09/2026: non e' stato tolto un
   doppione, e' stata corretta la misura — due delle diciassette erano
   parole dentro un commento (vedi `styles` qui sopra). */
const SOGLIA = { globali: 43, id: 29, classi: 15 };

/* ── I GEMELLI VOLUTI (18/09/2026) ──────────────────────────────────────────
   Nove nomi compaiono nei due documenti perche' DEVONO: sono la rete di
   sicurezza dell'archivio (CLAUDE.md §12), cioe' la stessa manciata di
   funzioni che firmano gli indirizzi dei documenti. Non sono una schermata
   scritta due volte — sono la stessa cosa che deve esserci in tutti e due i
   posti, e finche' i documenti sono due non c'e' dove metterla una volta
   sola: nessuno dei due importa moduli dall'altro.

   Perche' si escludono invece di alzare la soglia: alzarla vorrebbe dire
   fare spazio anche al prossimo doppione vero. Escluderli per NOME li tiene
   contati uno per uno, e le due righe qui sotto impediscono che questo
   elenco diventi una porta aperta:
     · ogni nome esentato deve esistere davvero in tutti e due i documenti,
       altrimenti l'elenco e' vecchio e va sfoltito;
     · che le due copie non divergano lo sorveglia una prova apposta
       (`server/verifica/archivio.test.mjs`, «le due meta' dell'archivio non
       divergono»), che qui si controlla che esista ancora.
   ─────────────────────────────────────────────────────────────────────── */
const GEMELLI = ['ARCH_BUCKET', 'ARCH_CARTELLE', 'ARCH_PREFISSI', 'ARCH_SCADENZA',
  'archApri', 'archDisinnesca', 'archFirma', 'archPercorso', 'archSuoIndirizzo',
  /* 18/09/2026: l'archivio cifrato sul VPS. Stessa ragione degli altri — un
     documento si apre e si carica da tutti e due i documenti, e finche' sono
     due la stessa manciata di funzioni deve stare in tutti e due. Le due
     copie chiamano il backend con i nomi di casa loro (PAY_API/payToken in
     QUOTO, MAIL_API/mailToken in IAM): non e' una copia incollata, e' la
     stessa cosa scritta dove serve. */
  'archApriVps', 'archCaricaVps',
  /* 19/09/2026: il REGISTRO DEI MOVIMENTI. Stessa ragione, terza volta. Le
     REGOLE stanno in un motore solo (`tariffe/motore/registro.js`), che tutti
     e due i documenti caricano dallo stesso indirizzo — non e' una copia. Qui
     restano le tre funzioni che toccano il database e il DOM, e che quindi in
     un motore non possono stare. Non sono un copia-incolla: in QUOTO l'utente
     e' `currentUser`, in IAM e' `ME`, come PAY_API e MAIL_API per l'archivio. */
  'logMovimento', 'regCarica', 'regInstalla'];

/* ── LE CLASSI GEMELLE (19/09/2026) ─────────────────────────────────────────
   Il riquadro «chi e quando» lo disegna il MOTORE, quindi il markup e' uno
   solo: le sue classi devono esistere in tutti e due i documenti. Sono l'unico
   caso in cui due classi uguali NON sono una schermata scritta due volte —
   sono una schermata scritta una volta sola e usata in due posti, che e'
   esattamente il contrario. Valgono le stesse due guardie dei nomi. */
/* `reg-ultima` (19/09/2026, brief M1.1): l'etichetta «Ultima modifica» la
   scrive `Registro.storiaHTML`, cioè il motore — stessa ragione di `reg-r`. */
const GEMELLI_CLASSI = ['reg-r', 'cl-sub', 'reg-ultima'];

const gQ = globali(scripts(Q)), gI = globali(scripts(I));
const iQ = id(Q), iI = id(I);
const cQ = classi(styles(Q)), cI = classi(styles(I));
const G = comuni(gQ, gI).filter(x => !GEMELLI.includes(x)), ID = comuni(iQ, iI);
const C = comuni(cQ, cI).filter(x => !GEMELLI_CLASSI.includes(x));

prova('i gemelli voluti sono davvero gemelli, e qualcuno li sorveglia', () => {
  /* Un nome esentato che non c'e' piu' in uno dei due documenti sarebbe un
     buco: l'elenco farebbe spazio a un doppione nuovo con quel nome. */
  const spariti = GEMELLI.filter(x => !gQ.has(x) || !gI.has(x));
  deve(!spariti.length, 'esentati ma non presenti in tutti e due i documenti: ' + spariti.join(' ') + ' — sfoltisci l\'elenco');
  const spariteC = GEMELLI_CLASSI.filter(x => !cQ.has(x) || !cI.has(x));
  deve(!spariteC.length, 'classi esentate ma non presenti in tutti e due i documenti: ' + spariteC.join(' '));
  const guardia = fs.readFileSync(path.join(RADICE, 'server', 'verifica', 'archivio.test.mjs'), 'utf8');
  deve(guardia.includes('archivio non divergono'),
    'e\' sparita la prova che controlla che le due copie dell\'archivio dicano la stessa cosa: senza, l\'esenzione non e\' sorvegliata da nessuno');
  /* Il registro e' esentato perche' le REGOLE stanno in un motore solo: se un
     giorno uno dei due documenti smettesse di caricarlo e si riscrivesse le
     sue, l'esenzione coprirebbe un doppione vero. */
  /* Si cerca il TAG che lo carica, non la stringa: il percorso del motore
     compare anche dentro un commento di IAM, e cercare la parola direbbe
     «caricato» su un documento che non lo carica piu'. E' la trappola gia'
     scritta in CLAUDE.md §10 e §12, e l'ha presa la controprova. */
  const tag = /<script[^>]+src="[^"]*tariffe\/motore\/registro\.js/;
  deve(tag.test(Q) && tag.test(I),
    'un documento non carica piu\' il motore del registro: le tre funzioni esentate diventerebbero un doppione');
  deve(Q.includes('Registro.movimento(') && I.includes('Registro.movimento('),
    'un documento ha smesso di passare dal motore per scrivere un movimento');
  return GEMELLI.length + ' gemelli + ' + GEMELLI_CLASSI.length + ' classi, tutti presenti e sorvegliati';
});

prova('i nomi globali in comune fra QUOTO e IAM non aumentano', () => {
  deve(G.length <= SOGLIA.globali, `${G.length} nomi globali in comune, la soglia e' ${SOGLIA.globali}: ne e' nato uno nuovo (probabilmente una schermata scritta due volte). Elenco: ${G.join(' ')}`);
  return `${G.length}/${SOGLIA.globali} — ${G.join(' ')}`;
});

prova('gli id in comune non aumentano', () => {
  deve(ID.length <= SOGLIA.id, `${ID.length} id in comune, la soglia e' ${SOGLIA.id}: ${ID.join(' ')}`);
  return `${ID.length}/${SOGLIA.id} — ${ID.join(' ')}`;
});

prova('le classi CSS in comune non aumentano', () => {
  deve(C.length <= SOGLIA.classi, `${C.length} classi in comune, la soglia e' ${SOGLIA.classi}: ${C.join(' ')}`);
  return `${C.length}/${SOGLIA.classi} — ${C.join(' ')}`;
});

prova('i doppioni gia\' risolti non tornano: niente gestione utenti ne\' grafico Performance in QUOTO', () => {
  deve(!gQ.has('apriNuovoUtente') && !gQ.has('creaNuovoUtente') && !gQ.has('salvaPermessiUtente'), 'la gestione utenti e\' ricomparsa in QUOTO (INTERFACCIA §2.7: e\' di IAM)');
  deve(!gQ.has('loadPerformance') && !gQ.has('renderPerfChart'), 'il grafico Performance e\' ricomparso in QUOTO (e\' in IAM › KPI e gare › Produzione)');
  deve(gQ.size > 1000 && gI.size > 500, 'la misura non ha letto i due documenti: ' + gQ.size + ' / ' + gI.size);
  return `QUOTO ${gQ.size} globali, IAM ${gI.size}`;
});

prova('la soglia si abbassa quando si toglie un doppione: se e\' piu\' alta del misurato di 3 o piu\', va aggiornata', () => {
  /* Una soglia lasciata larga smette di fare il suo lavoro: dopo aver tolto un
     doppione si scrive il numero nuovo, cosi' il prossimo che ne aggiunge uno
     lo vede subito. */
  const scarto = SOGLIA.globali - G.length;
  deve(scarto < 3, `misurati ${G.length} nomi globali in comune, soglia ${SOGLIA.globali}: abbassala a ${G.length}`);
  return `scarto ${scarto}`;
});

console.log('\n══ COLLISIONI FRA I DUE DOCUMENTI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCOLLISIONI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
