// ═══════════════════════════════════════════════════════════════════════════════
//  LA DIAGNOSI DELLE FONTI SI FA DAL PANNELLO
//
//  «Preparala, cosi' non entro nel VPS» — Francesco, 09/09/2026.
//
//  PERCHE' ESISTE QUESTA PROVA. La diagnosi c'era gia' tutta: /fonti/salute
//  incrocia quello che vede il pannello (le credenziali salvate) con quello che
//  vede lo scraper (se le ha aperte), e da quell'incrocio smaschera la chiave
//  disallineata — il pannello ha le credenziali, il servizio dice di non
//  averle, e nessuno dei due da' errore. E' la causa dei login chiesti
//  all'infinito.
//
//  Ma «Fonti compagnie» chiamava solo /fonti, che l'elenco lo da' e la diagnosi
//  no. Per avere quella risposta bisognava entrare nella macchina con sudo e
//  lanciare scraper/diagnosi-fonti.mjs: e' cosi' che il guasto delle due chiavi
//  del 14 agosto 2026 e' costato tre giri di misurazione sul server. La
//  diagnosi c'era, ma non era raggiungibile da chi aveva il problema.
//
//  LE DUE COSE CHE QUESTE PROVE TENGONO FERME:
//   1. la strada resta /fonti/salute. Se un domani qualcuno ci mette un
//      endpoint nuovo, la regola si sdoppia — e due copie della stessa regola
//      prima o poi divergono, in silenzio.
//   2. il «cosa fare» arriva a schermo. Il server lo scrive apposta per chi non
//      e' un programmatore: un allarme senza uscita fa perdere piu' tempo di un
//      allarme che non c'e'.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const leggi = (f) => fs.readFileSync(path.join(radice, f), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const idx = leggi('index.html');
const i = idx.indexOf('async function fontiDiagnosi');
const fn = i < 0 ? '' : idx.slice(i, idx.indexOf('\nasync function fontiCarica', i));

prova('il pulsante c\'e\', nel pannello delle fonti', () => {
  deve(/onclick="fontiDiagnosi\(this\)"/.test(idx), 'nessun pulsante chiama la diagnosi');
  deve(/id="f-diagnosi"/.test(idx), 'manca il posto dove atterra il risultato');
  /* Deve stare nella schermata delle fonti, non in una qualunque: se finisse
     altrove il pulsante ci sarebbe e non lo troverebbe nessuno. */
  const pannello = idx.slice(idx.indexOf('id="panel-fonti"'), idx.indexOf('id="panel-fonti"') + 4000);
  deve(/fontiDiagnosi/.test(pannello), 'il pulsante non e\' dentro il pannello «Fonti compagnie»');
  return 'dentro Fonti compagnie';
});

prova('passa da /fonti/salute, non da un endpoint nuovo', () => {
  deve(i > 0, 'la funzione fontiDiagnosi non esiste');
  deve(/mailFetch\('\/fonti\/salute/.test(fn), 'la diagnosi non chiede /fonti/salute');
  /* Il pannello non deve rimettersi a decidere da solo che cosa e' un guaio:
     quella regola sta nel server, in un posto solo. */
  deve(!/ha_credenziali/.test(fn), 'il pannello si e\' rifatto l\'incrocio per conto suo: la regola e\' in due posti');
  return 'una regola sola, e sta nel server';
});

prova('chiede come stanno le cose adesso, non venti secondi fa', () => {
  /* /fonti ha una cache di 20 secondi, giusta per un elenco che si ridisegna.
     Chi preme «Diagnosi» sta facendo un'altra domanda. */
  deve(/forza=1/.test(fn), 'si accontenta della risposta in cache');
  return 'forza=1';
});

prova('quello che il server spiega arriva a schermo', () => {
  deve(/cosa_fare/.test(fn), 'mostra l\'allarme e butta via il «cosa fare»');
  deve(/messaggio/.test(fn), 'non mostra il messaggio del guaio');
  deve(/impronta_chiave_backend/.test(fn), 'non mostra l\'impronta della chiave, che serve a confrontare due macchine');
  /* I guai prima dell'elenco completo: chi apre la diagnosi ha un problema, e
     la riga che gli serve non deve essere l'ultima. */
  deve(fn.indexOf('problemi') < fn.indexOf('Tutte le fonti'), 'l\'elenco completo viene prima dei guai');
  return 'prima i guai, poi l\'elenco';
});

console.log('DIAGNOSI DELLE FONTI DAL PANNELLO');
for (const [ok, nome, msg] of esiti) {
  console.log(`  ${ok ? 'ok ' : 'X  '} ${nome}${msg ? ' — ' + msg : ''}`);
}
const falliti = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`DIAGNOSI DELLE FONTI DAL PANNELLO: ${esiti.length - falliti} superate, ${falliti} fallite`);
process.exit(falliti === 0 ? 0 : 1);
