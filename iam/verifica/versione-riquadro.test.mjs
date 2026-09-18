// ═══════════════════════════════════════════════════════════════════════════════
//  IL CONTRASSEGNO DI VERSIONE DEL RIQUADRO — lo stesso guasto, un piano sotto
//
//  PERCHE' ESISTE
//    Il 14 settembre 2026 il menu nuovo non si vedeva: `withus-one.js` era
//    cambiato, il `?v=` scritto a mano no, e il browser aveva in cache
//    QUELL'indirizzo. Da li' e' nata `versione-scocca.test.mjs`.
//
//    Il 18 settembre 2026 e' successo di nuovo, un piano piu' sotto. La
//    scocca carica il preventivatore in un `iframe`, e gli chiede sempre lo
//    stesso indirizzo: `/nuovo-preventivo/?from=iam`. Quell'indirizzo non
//    cambia MAI, nemmeno quando QUOTO cambia da cima a fondo. Risultato: dopo
//    il rilascio della gestione documentale, dentro IAM si continuava a
//    vedere il preventivatore del rilascio prima — senza le schermate nuove e
//    senza la parte che firma gli indirizzi dei documenti. E ricaricare IAM
//    non bastava: un `iframe` e' un documento a sé, con la sua cache.
//
//  LA CURA
//    Il contrassegno non si scrive a mano: si CHIEDE al server. Una richiesta
//    `HEAD` legge l'etichetta del preventivatore (l'`ETag`, che Caddy calcola
//    dal contenuto) e la si aggiunge all'indirizzo del riquadro. Quando QUOTO
//    cambia, l'etichetta cambia, l'indirizzo cambia, e il browser scarica la
//    versione nuova; quando non cambia, l'indirizzo resta identico e la cache
//    continua a fare il suo lavoro.
//
//    Perche' non un numero annotato come per `withus-one.js`: quel file
//    cambia di rado, `index.html` di QUOTO cambia quasi a ogni lavoro. Una
//    prova che diventa rossa tutte le volte si impara ad aggirarla, e allora
//    non sorveglia piu' niente.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { RADICE, esiti, deve } from './banco.mjs';

const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('VERSIONE RIQUADRO — il preventivatore dentro IAM');

e.prova('il riquadro non chiede mai un indirizzo senza contrassegno', () => {
  /* Si guarda la RIGA che assegna l'indirizzo, non il file intero: la
     costante `QUOTO` compare in mezzo ai commenti, e una prova che cerca la
     parola invece della chiamata dichiara a posto qualunque cosa. */
  const righe = scocca.split('\n').filter(r => /\bfr\.src\s*=/.test(r) && !/^\s*(\/\/|\*)/.test(r));
  deve(righe.length, 'nessuno assegna piu\' l\'indirizzo al riquadro: la prova non sta guardando niente');
  /* La riga che assegna l'indirizzo deve portarci il contrassegno. Alla prima
     stesura qui c'era un `||` che accettava anche il solo fatto che
     `versioneQuoto` esistesse da qualche parte nel file: la prova restava
     verde anche togliendo il contrassegno, e l'ha scoperto la controprova.
     Una condizione in «oppure» con un fatto sempre vero non prova niente. */
  for (const r of righe) {
    deve(/&v=/.test(r), 'il riquadro riceve un indirizzo senza contrassegno: ' + r.trim().slice(0, 80));
  }
  deve(/versioneQuoto\(/.test(scocca), 'manca la funzione che chiede il contrassegno');
  return righe.length + ' assegnazioni, tutte con contrassegno';
});

e.prova('il contrassegno lo chiede al server, e non e\' un numero da ricordare', () => {
  const i = scocca.indexOf('function versioneQuoto');
  deve(i > 0, 'manca versioneQuoto');
  const f = scocca.slice(i, scocca.indexOf('\n  }', i));
  deve(/method: 'HEAD'/.test(f), 'non chiede l\'etichetta con una richiesta leggera');
  deve(/etag/i.test(f), 'non legge l\'etichetta che il server calcola dal contenuto');
  deve(/cache: 'no-store'/.test(f), 'la richiesta stessa puo\' arrivare dalla cache: leggerebbe l\'etichetta di prima');
  return 'HEAD, ETag, senza cache';
});

e.prova('se il server non risponde il riquadro si apre lo stesso', () => {
  /* Meglio un riquadro che forse e' vecchio di un riquadro che non si apre:
     senza rete, o con il server lento, il preventivatore deve comparire. */
  const i = scocca.indexOf('function versioneQuoto');
  const f = scocca.slice(i, scocca.indexOf('\n  }', i));
  deve(/\.catch\(/.test(f), 'se la richiesta fallisce non c\'e\' una via d\'uscita');
  deve(/typeof fetch !== 'function'/.test(f), 'su un browser senza fetch il riquadro non si caricherebbe');
  return 'errore e browser vecchi: si carica senza contrassegno';
});

e.prova('il contrassegno si chiede una volta sola per pagina, non a ogni apertura', () => {
  /* Il riquadro si apre e si richiude decine di volte in una giornata: una
     richiesta al server per ognuna sarebbe rumore inutile. */
  deve(/VERSIONI\s*=\s*\{\}/.test(scocca), 'manca la memoria dei contrassegni gia\' chiesti');
  const i = scocca.indexOf('function versioneQuoto');
  const f = scocca.slice(i, scocca.indexOf('\n  }', i));
  deve(/VERSIONI\[chiave\] !== undefined/.test(f), 'non guarda se il contrassegno e\' gia\' stato chiesto');
  return 'una richiesta per percorso, poi a memoria';
});

await e.provaAsync('funziona davvero: l\'indirizzo che esce porta il contrassegno del server', async () => {
  /* Le quattro prove qui sopra guardano il codice. Questa lo fa GIRARE, in
     una stanza chiusa con un finto server, e guarda l'indirizzo che finisce
     nel riquadro. */
  const ctx = {
    QUOTO: '/nuovo-preventivo/', ATTESA: null, console,
    encodeURIComponent, Promise,
    document: { getElementById: () => ({ style: {} }) },
    fetch: (u, o) => Promise.resolve({
      headers: { get: (h) => (h === 'etag' ? '"dlij27a4r702147za"' : null) },
      __chiesto: { u, o },
    }),
  };
  vm.createContext(ctx);
  const i = scocca.indexOf('var VERSIONI = {};');
  const fine = scocca.indexOf('\n  }', scocca.indexOf('function caricaFrame'));
  vm.runInContext(scocca.slice(i, fine + 4).replace(/^\s*function caricaFrame/m, 'function caricaFrame'), ctx);

  const fr = { src: '' };
  ctx.caricaFrame(fr, 'anagrafiche', null, null, '');
  /* I controlli stanno QUI, nel corpo della prova, non dentro il timer:
     un `deve` che fallisce dentro un `setTimeout` non lo prende nessuno e fa
     morire il processo invece di stampare una riga rossa. Se ne è accorta la
     controprova, che invece di un «X» dava un crollo. */
  await new Promise((r) => setTimeout(r, 30));
  deve(fr.src, 'il riquadro non ha ricevuto nessun indirizzo');
  deve(/\?from=iam/.test(fr.src), 'l\'indirizzo ha perso i parametri di prima: ' + fr.src);
  deve(/&page=anagrafiche/.test(fr.src), 'l\'indirizzo ha perso la pagina chiesta: ' + fr.src);
  deve(/&v=/.test(fr.src), 'l\'indirizzo non porta il contrassegno: ' + fr.src);
  deve(/&v=dlij27a4r702147za/.test(fr.src), 'il contrassegno non viene dall\'etichetta del server: ' + fr.src);
  return '/nuovo-preventivo/?from=iam&page=anagrafiche&v=dlij27a4r702147za';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
