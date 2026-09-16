// ═══════════════════════════════════════════════════════════════════════════════
//  LA VERSIONE DELLA SCOCCA — la meta' che funziona anche senza storia git
//
//  PERCHE' ESISTE
//    Il 14 settembre 2026 la voce «Preventivi personalizzati» e' stata
//    aggiunta al menu, provata, fusa su main e pubblicata. Francesco:
//    «Continua a non vederlo». Il codice non c'entrava niente: il menu vive
//    in withus-one.js, che index.html chiede con un numero di versione
//    scritto a mano. Il file era cambiato, quel numero no — e il browser
//    aveva gia' in cache QUELL'INDIRIZZO. Il server serviva il file nuovo e
//    nessuno glielo chiedeva.
//
//    Una prova su questo c'era gia' (scocca-titoli-menu, «i fogli collegati
//    hanno una versione che cambia coi rilasci») e non ha fermato niente,
//    per una ragione scritta dentro di lei: il controllo sulla data
//    dell'ultima modifica si SALTA nei cloni superficiali, perche' li' la
//    storia non c'e' e darebbe un verdetto inventato. Giusto — ma le
//    sessioni web clonano sempre cosi', quindi proprio dove si lavora quella
//    guardia e' spenta.
//
//  LA CURA, E IL SUO LIMITE
//    Qui non si guarda la storia: si guarda il CONTENUTO. Accanto al tag,
//    in index.html, sta annotata l'impronta del file. Se il file cambia e
//    l'impronta no, questa prova diventa rossa e dice quale scriverci —
//    in un clone superficiale come in uno completo.
//
//    Il limite, detto chiaro: chi aggiorna l'impronta ma non il ?v= passa
//    lo stesso. Le due righe stanno una sopra l'altra apposta, e il commento
//    accanto lo dice. Questa prova prende l'errore che si fa davvero —
//    cambiare il file e dimenticarsi tutto il resto — non quello che
//    bisogna impegnarsi a fare.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RADICE, esiti, deve } from './banco.mjs';

const idx = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const e = esiti('VERSIONE SCOCCA — quello che cambia si fa richiedere');

const impronta = (file) =>
  crypto.createHash('md5').update(fs.readFileSync(path.join(RADICE, file))).digest('hex').slice(0, 8);

for (const file of ['withus-one.js', 'withus-one.css']) {
  e.prova(`l'impronta annotata di ${file} e' quella del file`, () => {
    const m = new RegExp('impronta ' + file.replace('.', '\\.') + ': ([0-9a-f]{8})').exec(idx);
    deve(m, `manca l'impronta annotata accanto al tag di ${file}: senza, nessuno si accorge che il file e' cambiato`);
    const atteso = impronta(file);
    deve(m[1] === atteso,
      `${file} e' cambiato: l'impronta annotata e' ${m[1]}, quella vera e' ${atteso}. ` +
      'Aggiorna il commento E il ?v= del tag, altrimenti chi ha gia\' aperto IAM continua a caricare la copia vecchia.');
    return atteso;
  });
}

e.prova('la scocca non si carica mai senza versione', () => {
  /* Un solo riferimento senza ?v= vanifica tutto il resto: basta un tag
     dimenticato perche' il browser torni alla copia vecchia. */
  const nudi = [...idx.matchAll(/(?:src|href)="(withus-one\.(?:js|css))"/g)].map(m => m[1]);
  deve(nudi.length === 0, 'caricata senza versione: ' + nudi.join(', '));
  return 'nessun riferimento nudo';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
