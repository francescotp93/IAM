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
const styles = s => [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
export const globali = js => new Set([...js.matchAll(/^(?:async\s+)?(?:function\s+|var\s+|let\s+|const\s+)([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));
export const id = s => new Set([...s.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(m => m[1]));
export const classi = css => new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m => m[1]));
const comuni = (a, b) => [...a].filter(x => b.has(x)).sort();

/* La soglia e' la misura del 17/09/2026. Si abbassa, non si alza. */
const SOGLIA = { globali: 43, id: 29, classi: 17 };

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
  'archApri', 'archDisinnesca', 'archFirma', 'archPercorso', 'archSuoIndirizzo'];

const gQ = globali(scripts(Q)), gI = globali(scripts(I));
const iQ = id(Q), iI = id(I);
const cQ = classi(styles(Q)), cI = classi(styles(I));
const G = comuni(gQ, gI).filter(x => !GEMELLI.includes(x)), ID = comuni(iQ, iI), C = comuni(cQ, cI);

prova('i gemelli voluti sono davvero gemelli, e qualcuno li sorveglia', () => {
  /* Un nome esentato che non c'e' piu' in uno dei due documenti sarebbe un
     buco: l'elenco farebbe spazio a un doppione nuovo con quel nome. */
  const spariti = GEMELLI.filter(x => !gQ.has(x) || !gI.has(x));
  deve(!spariti.length, 'esentati ma non presenti in tutti e due i documenti: ' + spariti.join(' ') + ' — sfoltisci l\'elenco');
  const guardia = fs.readFileSync(path.join(RADICE, 'server', 'verifica', 'archivio.test.mjs'), 'utf8');
  deve(guardia.includes('archivio non divergono'),
    'e\' sparita la prova che controlla che le due copie dell\'archivio dicano la stessa cosa: senza, l\'esenzione non e\' sorvegliata da nessuno');
  return GEMELLI.length + ' gemelli, tutti presenti e sorvegliati';
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
