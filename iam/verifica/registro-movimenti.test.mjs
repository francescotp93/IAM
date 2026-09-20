// ═══════════════════════════════════════════════════════════════════════════════
//  IAM SCRIVE NEL REGISTRO DEI MOVIMENTI (19/09/2026)
//
//  Fino al 19/09/2026 `iam/index.html` non chiamava `logMovimento` NEMMENO UNA
//  VOLTA: fatture, permessi, schede economiche, cassa, blacklist — niente
//  lasciava traccia. La domanda «chi ha cambiato questa cosa» aveva una
//  risposta solo per meta' della casa.
//
//  Queste prove leggono il SORGENTE (IAM non si apre in un browser nel banco):
//  guardano che il motore sia caricato davvero, che le regole non siano state
//  riscritte di qua, e che i punti di chiamata non spariscano.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const IAM = path.join(QUI, '..', 'index.html');
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(IAM, 'utf8');
const require = createRequire(import.meta.url);
const R = require(path.join(RADICE, 'tariffe', 'motore', 'registro.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il motore e\' caricato, ed e\' lo STESSO file che carica QUOTO', () => {
  /* Non una copia: due copie del vocabolario vorrebbero dire due storie della
     stessa agenzia, e quella sbagliata sarebbe quella che nessuno guarda. */
  const tag = H.match(/<script src="([^"]*registro\.js[^"]*)"/);
  deve(tag, 'IAM non carica tariffe/motore/registro.js');
  const src = tag[1];
  /* L'indirizzo e' ASSOLUTO e passa da /nuovo-preventivo/: IAM sta alla radice
     del dominio e QUOTO sotto quel prefisso (deploy/caddy/iam.caddy), quindi
     un percorso relativo con `..` uscirebbe dalla radice del sito e non
     troverebbe niente. */
  deve(src.startsWith('/nuovo-preventivo/tariffe/motore/registro.js'),
    'l\'indirizzo del motore non e\' quello della stessa origine: ' + src);
  /* E il file esiste davvero dove quell'indirizzo lo cerca. */
  deve(fs.existsSync(path.join(RADICE, 'tariffe', 'motore', 'registro.js')),
    'il file del motore non c\'e\' dove l\'indirizzo lo manda a prendere');
  /* Il banco statico deve rispondere su quel prefisso come fa Caddy: senza,
     una prova fallirebbe per la strada e non per il contenuto. */
  const banco = fs.readFileSync(path.join(RADICE, 'static-server.js'), 'utf8');
  deve(/nuovo-preventivo/.test(banco),
    'il banco non conosce il prefisso /nuovo-preventivo/: non somiglia piu\' alla produzione');
  return src;
});

prova('le regole non sono state riscritte di qua', () => {
  /* La copia sottile di IAM tocca il database e il DOM. Tutto il resto — che
     cos'e' un identificativo, che forma ha, che cosa puo' portarlo — sta nel
     motore. Se una di queste cose ricomparisse qui sarebbero due regole, e
     quella sbagliata sarebbe quella che nessuno guarda. */
  deve(/Registro\.movimento\(/.test(H), 'IAM scrive un movimento senza passare dal motore');
  deve(/Registro\.storiaHTML\(/.test(H), 'IAM si disegna il riquadro della storia da solo');
  /* La ricerca si fa NEL BLOCCO del registro, non su tutto il file: la prima
     stesura cercava la forma di un uuid ovunque e accusava un codice corretto,
     perche' `vps:<uuid>` dell'archivio cifrato somiglia a un identificativo ed
     e' un'altra cosa. E' la trappola gia' scritta in CLAUDE.md §10 e §12: si
     cerca dove la regola vivrebbe, non la stringa dove capita. */
  const blocco = H.slice(H.indexOf('function mioNome'), H.indexOf('function initDB'));
  deve(blocco.length > 400, 'non ha trovato il blocco del registro in IAM');
  deve(!/\[0-9a-f\]\{8\}/.test(blocco), 'la forma dell\'identificativo e\' stata riscritta dentro IAM');
  deve(!/VOCI\s*=/.test(blocco), 'il vocabolario delle entita\' e\' stato copiato dentro IAM');
  deve(!/non risponde/.test(blocco), 'i testi del riquadro sono stati riscritti qui invece che nel motore');
  return 'movimento + storiaHTML dal motore, zero regole locali';
});

prova('si firma con l\'utente vero, che e\' quello che il database pretende', () => {
  /* `log_insert` ha `with check (utente_id = auth.uid())`: un registro che non
     garantisce CHI non garantisce niente. In IAM l'utente di Supabase e' `ME`,
     quindi `ME.id` E' `auth.uid()`. */
  const blocco = (H.match(/async function logMovimento[\s\S]*?\n\}/) || [''])[0];
  deve(blocco, 'IAM non ha piu\' `logMovimento`');
  deve(/utente_id:\s*ME\.id/.test(blocco), 'il movimento non si firma con l\'utente di Supabase: ' + blocco.slice(0, 200));
  deve(/if \(!db \|\| !ME/.test(blocco), 'si prova a scrivere un movimento senza sapere chi lo fa');
  /* E se il motore non si e' caricato non si scrive: meglio un movimento perso
     che una schermata che non si apre. */
  deve(/window\.Registro/.test(blocco), 'senza il motore IAM proverebbe a scrivere lo stesso');
  return 'ME.id, e niente scrittura senza motore';
});

prova('i punti di chiamata ci sono, e non scendono', () => {
  /* La soglia si ALZA, non si abbassa: e' lo stesso meccanismo della prova
     sulle collisioni, al contrario. Senza, un punto di chiamata scritto domani
     senza registrare niente non lo nota nessuno, e IAM torna muta. */
  const chiamate = (H.match(/logMovimento\(/g) || []).length - 1; // la definizione non conta
  /* 13 il 19/09/2026 al mattino; 21 col brief #02 M1 (conti e causali);
     29 con la M2, che ne aggiunge otto su tariffe, accordi e gruppi — e lì
     sotto c'è quanto prende ognuno; 33 con la M3, che registra ogni movimento
     della prima nota, il suo annullamento, la riapertura e il saldo
     dichiarato di un conto: su una contabilità «chi ha scritto questa riga»
     è la prima domanda che arriva, e arriva mesi dopo; 38 con la M4, dove
     ogni incasso portato in contabilità, accreditato o annullato lascia la
     sua riga — è denaro che entra, e si deve sapere chi l'ha detto. */
  const SOGLIA = 50;   /* 20/09/2026: il catalogo prodotti ne ha portati 13 (compagnie, prodotti, libreria, fusioni). La soglia sale, non scende. */
  deve(chiamate >= SOGLIA, 'movimenti registrati da IAM: ' + chiamate + ' (erano ' + SOGLIA + ')');
  deve(chiamate - SOGLIA < 3, 'adesso sono ' + chiamate + ': alza la soglia, altrimenti smette di sorvegliare');
  /* E riguardano le cose che la gente chiede mesi dopo. */
  ['scheda', 'collaboratore', 'utente', 'lead', 'trattativa', 'cassa', 'formazione']
    .forEach(k => deve(new RegExp("'" + k + "'").test(H), 'nessun movimento registrato su «' + k + '»'));
  return chiamate + ' punti di chiamata';
});

prova('i tipi che IAM usa esistono nel vocabolario del motore', () => {
  /* Un tipo scritto qui e non conosciuto la' finirebbe nel registro come
     «fuori vocabolario»: si vedrebbe — ed e' voluto — ma sarebbe un refuso,
     non una scelta. */
  const usati = [...H.matchAll(/logMovimento\([^;]*?,\s*'([a-z]+)'/g)].map(m => m[1]);
  deve(usati.length >= 10, 'non ha letto i tipi usati: ' + usati.length);
  const ignoti = [...new Set(usati)].filter(k => !R.VOCI[k]);
  deve(!ignoti.length, 'tipi usati da IAM e assenti dal vocabolario: ' + ignoti.join(' '));
  return [...new Set(usati)].sort().join(' ');
});

prova('la storia di una scheda si legge dalla scheda', () => {
  deve(/id="mc-storia"/.test(H), 'manca il contenitore della storia nella scheda del collaboratore');
  deve(/regInstalla\('mc-storia',\s*'scheda',\s*TEAM_ID/.test(H),
    'il contenitore c\'e\' ma non lo riempie nessuno: e\' il guasto numero uno di questo repository');
  /* `iam_team.id` e' TESTO, non un uuid: il motore deve saperlo, altrimenti
     scarterebbe ogni collegamento alle schede. */
  deve(R.VOCI.scheda.id === 'testo', 'il motore crede che le schede abbiano un uuid: ' + R.VOCI.scheda.id);
  return 'contenitore + riempimento + forma della chiave';
});

console.log('\n══ IL REGISTRO DEI MOVIMENTI IN IAM ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nREGISTRO IAM: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
