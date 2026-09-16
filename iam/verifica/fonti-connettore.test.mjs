// ═══════════════════════════════════════════════════════════════════════════════
//  FONTI COMPAGNIE — il Connettore Chrome dentro il pannello
//
//  «Creiamo l'estensione aggiornata per Chrome che mappa solo i domini che ci
//  interessano e porta automaticamente tutti i dati che ci servono»
//  (Francesco, 10/09/2026). L'estensione registra e consegna; questo pannello
//  e' dove la si collega e dove le catture si leggono. Quattro cose da tenere
//  ferme: la sezione c'e' e si ridisegna col pannello; il collegamento passa
//  dal server (chiave nuova) e poi dall'estensione, mai il contrario; le
//  catture si aprono, si scaricano e si cancellano dalla stessa schermata; e
//  gli otto portali sono quelli chiesti, con lo stesso nome dell'estensione.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const idx = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (n, f) => { try { esiti.push([true, n, f() || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
const fetta = (da, a) => { const i = idx.indexOf(da); return i < 0 ? '' : idx.slice(i, idx.indexOf(a, i)); };

prova('la sezione del connettore sta nel pannello Fonti e si ridisegna con lui', () => {
  const pannello = fetta('<div class="panel" id="panel-fonti">', '<section class="f-tools">');
  deve(/id="f-connettore"/.test(pannello), 'nel pannello non c\'e\' la sezione del connettore');
  const carica = fetta('async function fontiCarica(', '\n}\n');
  deve(/connettoreDisegna\(\)/.test(carica), 'il pannello si carica senza ridisegnare il connettore: si vedrebbe vuoto');
  return 'sezione presente, ridisegnata a ogni carico';
});

prova('gli otto portali sono quelli chiesti, con lo stesso id dell\'estensione', () => {
  const m = idx.match(/const CONN_PORTALI = \{([^}]*)\}/);
  deve(m, 'manca l\'elenco dei portali');
  const ids = [...m[1].matchAll(/'?([\w-]+)'?\s*:/g)].map(x => x[1]).sort().join(',');
  deve(ids === '24h,allianz,axa,groupama,hdi,italiana,prima,sara', 'i portali non sono gli otto: ' + ids);
  return 'Italiana, HDI, Allianz, Prima, Groupama, AXA, Sara, 24H';
});

prova('«Collega» chiede la chiave al server e la consegna all\'estensione, in quest\'ordine', () => {
  const f = fetta('async function connettoreCollega(', '\n}\n');
  deve(f.length > 0, 'non trovo connettoreCollega');
  const iServer = f.indexOf("mailFetch('/fonti/connettore/chiave'"), iExt = f.indexOf("connettoreChiedi('collega'");
  deve(iServer > -1, 'non chiede una chiave nuova al server');
  deve(iExt > iServer, 'consegna all\'estensione prima di avere la chiave');
  deve(/method: 'POST'/.test(f), 'la chiave si chiede senza POST: il server non ne conia una');
  deve(/api: MAIL_API/.test(f), 'non dice all\'estensione a quale server consegnare');
  /* La chiave NON deve restare nella pagina: passa e basta. */
  deve(!/localStorage|sessionStorage/.test(f), 'la chiave del connettore viene messa da parte nella pagina');
  return 'server → estensione, e la chiave non resta qui';
});

prova('con l\'estensione si parla con postMessage, e senza risposta ci si arrende in fretta', () => {
  const f = fetta('function connettoreChiedi(', '\n}\n');
  deve(/postMessage\(\{ __withusConnettore: 'request'/.test(f), 'non usa il protocollo del ponte');
  deve(/ev\.source !== window/.test(f), 'accetta risposte da altre finestre');
  deve(/ev\.data\.reqId !== reqId/.test(f), 'accetta la risposta di un\'altra richiesta');
  deve(/estensione non rilevata/.test(f) && /ms \|\| 2500/.test(f), 'senza estensione resterebbe ad aspettare');
  return 'stesso protocollo dell\'estensione, con scadenza';
});

prova('la sezione dice cosa manca invece di restare muta', () => {
  const f = fetta('async function connettoreDisegna(', '\n}\n');
  deve(/Estensione non rilevata/.test(f), 'senza estensione non lo dice');
  deve(/Non collegata/.test(f), 'estensione presente ma non collegata: non lo dice');
  deve(/in attesa nell/.test(f), 'le catture ferme nell\'estensione non si vedono');
  deve(/Ancora nessuna/.test(f), 'con zero catture non spiega da dove arriva la prima');
  deve(/withus-connettore\.zip/.test(idx), 'manca il link per scaricare l\'estensione');
  deve(/chrome:\/\/extensions/.test(f), 'non spiega come si installa');
  return 'quattro stati detti, e il link per scaricarla';
});

prova('una cattura si apre, si scarica e si cancella dalla stessa schermata', () => {
  deve(/async function connettoreApri\(/.test(idx) && /async function connettoreScarica\(/.test(idx) && /async function connettoreElimina\(/.test(idx), 'mancano apri, scarica o elimina');
  const apri = fetta('async function connettoreApri(', '\n}\n');
  deve(/\/fonti\/connettore\/catture\/' \+ encodeURIComponent\(id\)/.test(apri), 'la cattura si legge con un id non codificato');
  deve(/connettoreRiga\(/.test(apri), 'le righe non si aprono: la risposta del portale non si vede');
  const riga = fetta('function connettoreRiga(', '\n}\n');
  deve(/JSON\.stringify\(JSON\.parse/.test(riga), 'una risposta JSON si mostra su una riga sola, illeggibile');
  deve(/segreti mascherati/.test(riga), 'non dice che le intestazioni sono mascherate: chi legge cercherebbe il token');
  const elimina = fetta('async function connettoreElimina(', '\n}\n');
  deve(/confirm\(/.test(elimina) && /method: 'DELETE'/.test(elimina), 'si cancella senza chiedere, o senza DELETE');
  return 'apri, scarica, elimina';
});

prova('la chiave per Giulia e\' di sola lettura, e si vede una volta sola', () => {
  const f = fetta('async function connettoreChiaveLettura(', '\n}\n');
  deve(f.length > 0, 'manca il pulsante «Chiave per Giulia»');
  deve(/ruolo: 'lettura'/.test(f), 'chiede una chiave senza dire che e\' di lettura: il server ne darebbe una di deposito');
  deve(/r\.ruolo !== 'lettura'/.test(f), 'non controlla che il server abbia risposto con una chiave di lettura');
  deve(/WITHUS_CATTURE_CHIAVE/.test(f), 'non dice dove va messa la chiave');
  deve(/confirm\(/.test(f), 'conia una chiave senza chiedere');
  deve(!/localStorage|sessionStorage/.test(f), 'la chiave viene messa da parte nella pagina');
  return 'lettura, mostrata una volta, con le istruzioni';
});

console.log('FONTI COMPAGNIE — il Connettore Chrome nel pannello');
for (const [ok, n, d] of esiti) console.log(`  ${ok ? 'ok ' : 'X  '} ${n}${d ? ' — ' + d : ''}`);
const ko = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`FONTI COMPAGNIE — connettore: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
