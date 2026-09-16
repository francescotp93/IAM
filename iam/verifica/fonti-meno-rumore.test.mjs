// ═══════════════════════════════════════════════════════════════════════════════
//  FONTI COMPAGNIE — meno rumore, piu' segnale
//
//  Tre correzioni nate guardando insieme a Francesco la diagnosi vera del
//  9 settembre 2026, su tredici fonti. Due le ha viste lui prima di me.
//
//  1. IL BADGE CHE SI CONTRADDICE. Dopo un accesso riuscito il pannello diceva
//     «Sessione gia' attiva ✅» e nella stessa schermata continuava a mostrare
//     «Configurata». Il motivo: la risposta di ogni scraper resta in cache
//     dieci secondi sul server, e la ricarica se la riprendeva. Due frasi che
//     si contraddicono a due centimetri insegnano a non fidarsi del pannello.
//
//  2. «NON RISPONDE» A CHI NON HA NIENTE CHE DEBBA RISPONDERE. INLINEA, SARA e
//     RC POLIZZA non hanno nessuno scraper: marcarle come guaste manda a
//     cercare un guasto che non esiste. Il messaggio sotto lo diceva gia'
//     giusto — era l'etichetta a mentire.
//
//  3. «RIFAI L'ACCESSO» CHE NON RIFA' NIENTE. Con la sessione viva lo scraper
//     risponde «gia' attiva» senza toccare il portale: giusto tutti i giorni,
//     inutile il giorno in cui hai cambiato la password sul portale — l'unico
//     in cui uno preme un pulsante che si chiama cosi'.
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

prova('dopo un\'azione il pannello chiede il dato fresco, non quello di prima', () => {
  const f = fetta('async function fontiCarica(', 'async function fontiApri');
  deve(f.length > 0, 'non trovo fontiCarica');
  deve(/forza \? '\?forza=1' : ''/.test(f), 'la ricarica forzata si ferma alla cache locale e si riprende la risposta di dieci secondi fa');
  /* «forza» deve voler dire una cosa sola: nessuna cache, ne' la mia ne' quella
     del server. Due significati per la stessa parola e non si sa piu' che cosa
     si sta guardando. */
  deve(/mailFetch\('\/fonti' \+/.test(f), 'la chiamata non porta con se\' la richiesta di saltare la cache');
  return 'nessuna cache vuol dire nessuna cache';
});

prova('chi non ha uno scraper non viene dato per rotto', () => {
  const f = fetta('async function fontiDiagnosi(', 'async function fontiCarica(');
  deve(f.length > 0, 'non trovo fontiDiagnosi');
  deve(/servizio_configurato === false/.test(f), 'non distingue chi e\' guasto da chi non ha proprio uno scraper');
  deve(/senza servizio automatico/.test(f), 'manca l\'etichetta che lo dice');
  /* L'ordine conta: il controllo su «non ha uno scraper» deve venire PRIMA di
     «non risponde», altrimenti la prima condizione vera vince e si torna a
     dare per rotto chi non ha niente da rompere. */
  /* Si cerca il TOKEN con le virgolette, non le parole: un commento che le
     usa non deve far cambiare l'esito a una prova sull'ordine del codice. */
  deve(f.indexOf('servizio_configurato') < f.indexOf("'non risponde'"), 'la condizione arriva dopo «non risponde» e non serve a niente');
  return 'senza scraper ≠ guasto';
});

prova('chi si quota dal browser non «non risponde»: e\' spento per come e\' fatto', () => {
  /* Stesso difetto di sopra, sfuggito per un caso: Prima. Il server lo dice
     gia' con un codice suo (via_browser); l'etichetta deve leggere quello,
     non dedurre un guasto dal fatto che il servizio non c'e'. */
  const f = fetta('async function fontiDiagnosi(', 'async function fontiCarica(');
  deve(/codice === 'via_browser'/.test(f), 'non legge il codice con cui il server dice «spenta per come e\' fatta»');
  deve(/si quota dal browser/.test(f), 'manca l\'etichetta che lo dice');
  deve(f.indexOf("'via_browser'") < f.indexOf("'non risponde'"), 'il controllo arriva dopo «non risponde» e non vince mai');
  return 'Prima e\' spenta di proposito, e si legge';
});

prova('«Rifai l\'accesso» chiede davvero di rientrare da capo', () => {
  const f = fetta('async function fontiAccedi(', 'async function fontiAspetta(');
  deve(/async function fontiAccedi\(id, rifai\)/.test(f), 'la funzione non sa se le si sta chiedendo di rifare o di entrare');
  deve(/rifai \? '\?forza=1' : ''/.test(f), 'lo sa e non lo dice al server');
  /* Chi preme deve sapere che cosa sta per succedere: rientrare da capo
     significa chiudere la sessione che c'e', e su un portale con OTP vuol dire
     un codice da leggere. */
  deve(/Chiudo la sessione/.test(f), 'non avvisa che sta per buttare la sessione viva');
  return 'il pulsante fa quello che il suo nome promette';
});

prova('e lo chiede solo quando ha senso', () => {
  /* Su una fonte non collegata «forza» non serve: non c'e' nessuna sessione da
     buttare, e chiederlo vorrebbe dire pulire i biscotti per niente. */
  deve(/fontiAccedi\('\$\{esc\(f\.id\)\}', \$\{st === 'attiva'\}\)/.test(idx),
    'il pulsante non dice alla funzione se la sessione risulta attiva');
  return 'solo dove c\'e\' una sessione da chiudere';
});

console.log('FONTI COMPAGNIE — meno rumore, piu\' segnale');
for (const [ok, n, d] of esiti) console.log(`  ${ok ? 'ok ' : 'X  '} ${n}${d ? ' — ' + d : ''}`);
const ko = esiti.filter(e => !e[0]).length;
console.log('');
console.log(`FONTI COMPAGNIE — meno rumore: ${esiti.length - ko} superate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
