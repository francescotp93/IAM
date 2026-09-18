// ═══════════════════════════════════════════════════════════════════════════════
//  L'ARCHIVIO CHIUSO — server/archivio.js e le funzioni di pagina (18/09/2026)
//
//  Il contenitore `documenti` non è più pubblico. Quello che questo file
//  sorveglia non è «la firma funziona» — quello lo dice Supabase — ma le tre
//  cose che, se saltano, rendono irraggiungibile un documento di un cliente
//  senza che nessuno se ne accorga:
//
//   1) i vecchi indirizzi pubblici, ancora scritti in 33 fra colonne e chiavi
//      jsonb, devono continuare a portare al file giusto;
//   2) da nessuna parte del codice deve più uscire un indirizzo pubblico:
//      basta un `getPublicUrl` rimasto e quel punto smette di funzionare il
//      giorno della chiusura, non il giorno in cui lo si scrive;
//   3) un indirizzo di un ALTRO sito, salvato a mano in un campo, non deve
//      essere scambiato per un percorso dell'archivio e «firmato»: si
//      aprirebbe una finestra su un errore invece che sul documento.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { ritaglia } from '../../iam/verifica/banco.mjs';
import { percorsoArchivio, SCADENZA } from '../archivio.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const srcIam = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const PUBBLICO = 'https://ekjxrnsfqxnfxzrthdcf.supabase.co/storage/v1/object/public/documenti/clienti/abc/172_ci.pdf';
const FIRMATO  = 'https://ekjxrnsfqxnfxzrthdcf.supabase.co/storage/v1/object/sign/documenti/clienti/abc/172_ci.pdf?token=xyz';
const PERCORSO = 'clienti/abc/172_ci.pdf';

/* La stessa funzione vive due volte, di proposito: in `server/archivio.js` per
   il server e dentro `index.html` per la pagina. Non è un doppione da togliere
   — la pagina non può importare un modulo del server — ma è un doppione che
   può divergere, e allora le due metà del programma capirebbero due cose
   diverse dallo stesso valore. Qui si provano INSIEME, con gli stessi casi. */
function stanzaPagina() {
  const ctx = { console, String, RegExp, decodeURIComponent };
  vm.createContext(ctx);
  const f = ritaglia(src, 'archPercorso');
  if (!f) throw new Error('non si ritaglia archPercorso da index.html');
  vm.runInContext(f, ctx);
  return ctx;
}

prova('dal valore salvato al percorso: i tre formati che convivono in archivio', () => {
  const pagina = stanzaPagina();
  const casi = [
    [PUBBLICO, PERCORSO, 'un indirizzo pubblico di prima del 18/09/2026'],
    [FIRMATO,  PERCORSO, 'un indirizzo già firmato'],
    [PERCORSO, PERCORSO, 'un percorso nudo, come si salva da oggi'],
    ['/' + PERCORSO, PERCORSO, 'un percorso con la barra davanti'],
    ['', '', 'il vuoto'],
    [null, '', 'niente'],
  ];
  for (const [dentro, atteso, che] of casi) {
    deve(percorsoArchivio(dentro) === atteso, 'server, ' + che + ': «' + percorsoArchivio(dentro) + '»');
    deve(pagina.archPercorso(dentro) === atteso, 'pagina, ' + che + ': «' + pagina.archPercorso(dentro) + '»');
  }
  return casi.length + ' casi, uguali sul server e nella pagina';
});

prova('un indirizzo di un altro sito non è roba nostra e non si firma', () => {
  const pagina = stanzaPagina();
  /* Un PDF precontrattuale su GitHub Pages, o un allegato incollato a mano:
     trattarlo come percorso vorrebbe dire chiedere a Supabase di firmare un
     file che non ha, e aprire una finestra su un errore. */
  for (const fuori of ['https://quoto.withusassicurazioni.it/docs/dip.pdf',
                       'https://api.withusassicurazioni.it/sign/privacy/doc?id=1&t=x',
                       'https://ekjxrnsfqxnfxzrthdcf.supabase.co/storage/v1/object/public/note-informative/x.pdf']) {
    deve(percorsoArchivio(fuori) === '', 'server: «' + fuori + '» scambiato per archivio');
    deve(pagina.archPercorso(fuori) === '', 'pagina: «' + fuori + '» scambiato per archivio');
  }
  /* Nemmeno un altro contenitore dello stesso progetto: `note-informative` è
     pubblico per scelta (sono documenti precontrattuali, vanno letti da
     chiunque) e non c'entra niente con l'archivio dei clienti. */
  return 'tre indirizzi esterni, nessuno scambiato';
});

prova('nel codice non resta un solo indirizzo pubblico dell\'archivio', () => {
  /* È la prova che vale di più: un `getPublicUrl` dimenticato non fa rumore
     finché il contenitore è aperto, e il giorno della chiusura diventa un
     documento che non si apre. Si guarda il codice, non il comportamento. */
  const sospetti = [];
  for (const [nome, testo] of [['index.html', src], ['iam/index.html', srcIam]]) {
    const righe = testo.split('\n');
    righe.forEach((r, i) => {
      if (/^\s*(\/\/|\*|--)/.test(r)) return;                       // commenti
      if (/getPublicUrl\s*\(/.test(r) && /documenti/.test(r)) sospetti.push(nome + ':' + (i + 1));
      if (/object\/public\/documenti/.test(r) && !/^\s*[-*]/.test(r) && !/`…\/object/.test(r)) sospetti.push(nome + ':' + (i + 1));
    });
  }
  for (const f of ['server/sign.js', 'server/shop.js', 'server/notify.js', 'server/firmaCollab.js', 'server/archivio.js']) {
    const testo = fs.readFileSync(path.join(RADICE, f), 'utf8');
    testo.split('\n').forEach((r, i) => {
      if (/^\s*(\/\/|\*)/.test(r)) return;
      if (/object\/public\/documenti/.test(r)) sospetti.push(f + ':' + (i + 1));
    });
  }
  deve(!sospetti.length, 'indirizzi pubblici rimasti: ' + sospetti.join(', '));
  return 'due pagine e cinque file di server, puliti';
});

prova('i caricamenti salvano il percorso, non un indirizzo', () => {
  /* Se un punto salvasse ancora `getPublicUrl(...)`, ogni riga scritta da lì
     metterebbe in archivio un indirizzo che non funziona più. */
  const caricamenti = (src.match(/storage\.from\('documenti'\)\.upload\(/g) || []).length;
  deve(caricamenti > 15, 'trovati solo ' + caricamenti + ' caricamenti: la prova non sta guardando niente');
  deve(!/getPublicUrl\([^)]*\)\.data\.publicUrl/.test(src), 'un caricamento produce ancora un indirizzo pubblico');
  /* Il caricatore comune esiste e restituisce il percorso. */
  const f = ritaglia(src, 'archCarica');
  deve(f, 'manca archCarica: il caricamento comune');
  deve(/return path;/.test(f), 'archCarica non restituisce il percorso');
  return caricamenti + ' caricamenti, nessun indirizzo pubblico';
});

prova('la finestra si apre PRIMA della firma, altrimenti il browser la blocca', () => {
  const f = ritaglia(src, 'archApri');
  deve(f, 'manca archApri');
  /* Si cerca LA finestra che aspetta il documento (`const w = window.open`),
     non la prima occorrenza di `window.open`: in archApri ce n'è un'altra
     prima, nel ramo dell'indirizzo esterno, e cercando quella la prova
     restava verde anche con l'ordine invertito. Trovato rifacendo la
     controprova il 18/09/2026: una prova che guarda il punto sbagliato non
     sta guardando, sta indovinando. */
  const iApertura = f.indexOf('const w = window.open');
  const iFirma = f.indexOf('await archFirma');
  deve(iApertura > 0 && iFirma > 0, 'archApri non apre la finestra che aspetta il documento, o non firma');
  deve(iApertura < iFirma, 'la finestra si apre dopo la firma: il browser la bloccherebbe come popup');
  deve(/w\.close\(\)/.test(f), 'se la firma non riesce resta aperta una finestra vuota');
  return 'apertura, poi firma';
});

prova('la rete di sicurezza intercetta anche i link che nessuno ha convertito', () => {
  /* I punti che mostrano un documento sono decine e ognuno scrive il suo
     `<a href>` a mano. La rete serve a quelli che restano, e a quelli che
     qualcuno scriverà domani copiando il vicino. */
  deve(/addEventListener\('click'/.test(src), 'non c\'è nessun ascoltatore sui clic');
  const f = ritaglia(src, 'archSuoIndirizzo');
  deve(f, 'manca archSuoIndirizzo');
  const ctx = { console, String, RegExp,
                ARCH_PREFISSI: /^(clienti|polizze|preventivi|messaggi|bonifici|shop|rcvp|infcirc|tutelalegale|cvt-fi|cauz|sal|pet|fv|rcrd|tl|sv|vg|fi)\// };
  vm.createContext(ctx);
  vm.runInContext(f, ctx);
  deve(ctx.archSuoIndirizzo(PUBBLICO), 'non riconosce un vecchio indirizzo pubblico');
  deve(ctx.archSuoIndirizzo(PERCORSO), 'non riconosce un percorso dell\'archivio');
  deve(!ctx.archSuoIndirizzo('https://quoto.withusassicurazioni.it/docs/dip.pdf'), 'intercetta un indirizzo esterno');
  deve(!ctx.archSuoIndirizzo('#'), 'intercetta un\'ancora');
  deve(!ctx.archSuoIndirizzo('javascript:void(0)'), 'intercetta un link senza indirizzo');
  deve(!ctx.archSuoIndirizzo('mailto:x@y.it'), 'intercetta un indirizzo di posta');
  return 'riconosce i nostri, lascia stare gli altri';
});

prova('il server firma per chi non ha un account, con due scadenze diverse', () => {
  deve(SCADENZA.dentro_casa === 300, 'la scadenza dentro casa è ' + SCADENZA.dentro_casa);
  deve(SCADENZA.al_cliente === 30 * 24 * 3600, 'la scadenza per il cliente è ' + SCADENZA.al_cliente);
  /* Cinque minuti bastano ad aprire un file dal gestionale. Non bastano a un
     cliente che apre la posta il giorno dopo: sono due cose diverse e devono
     restare due numeri diversi. */
  deve(SCADENZA.al_cliente > SCADENZA.dentro_casa * 100, 'le due scadenze si somigliano troppo per essere due scelte');
  const notify = fs.readFileSync(path.join(RADICE, 'server', 'notify.js'), 'utf8');
  deve(/firmaDocumento\(datiP\.polizza_url/.test(notify), 'l\'email della polizza non firma il collegamento');
  deve(/SCADENZA\.al_cliente/.test(notify), 'l\'email usa la scadenza di casa invece di quella del cliente');
  deve(/30 giorni/.test(notify), 'l\'email non dice al cliente quanto vive il collegamento');
  const firma = fs.readFileSync(path.join(RADICE, 'server', 'firmaCollab.js'), 'utf8');
  deve(/firmaDocumento\(f\.doc_url/.test(firma), 'la pagina di firma non firma il documento di riferimento');
  deve(!/docUrl: f\.doc_url/.test(firma), 'la pagina di firma restituisce ancora il valore grezzo');
  return 'polizza al cliente 30 giorni, documento di firma firmato';
});

prova('lo shop e la firma privacy non fabbricano più indirizzi pubblici', () => {
  const shop = fs.readFileSync(path.join(RADICE, 'server', 'shop.js'), 'utf8');
  deve(/res\.json\(\{ ok: true, url: path, nome: safe \}\)/.test(shop), 'lo shop restituisce ancora un indirizzo');
  const sign = fs.readFileSync(path.join(RADICE, 'server', 'sign.js'), 'utf8');
  deve(!/async function uploadDoc/.test(sign), 'in sign.js è tornata la funzione che fabbricava indirizzi pubblici');
  return 'shop: percorso; sign: la funzione morta non c\'è più';
});

prova('nella scocca di IAM non resta il ripiego all\'indirizzo pubblico', () => {
  /* C'era un `catch` che, se la firma falliva, ripiegava su `getPublicUrl`:
     col contenitore chiuso quel ripiego produce un indirizzo che risponde 400,
     cioè una finestra bianca invece di un errore che si capisce. */
  deve(!/getPublicUrl/.test(srcIam), 'il ripiego all\'indirizzo pubblico è ancora lì');
  deve(/createSignedUrl/.test(srcIam), 'la scocca non firma più niente');
  const f = ritaglia(srcIam, 'apriAllegatoFattura');
  deve(f && /non hai i permessi|non riesco ad aprire/i.test(f), 'quando non riesce ad aprire non lo dice a chi guarda');
  return 'firma o errore parlante, non una finestra bianca';
});

console.log('\n══ ARCHIVIO CHIUSO ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nARCHIVIO: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
