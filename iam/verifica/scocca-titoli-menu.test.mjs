// ═══════════════════════════════════════════════════════════════════════════════
//  SCOCCA — titoli, briciole e capi-menu
//
//  Punti 7, 8, 9 e 10 del collaudo esterno (30/07/2026):
//   · la lente in alto apriva l'elenco clienti buttando via il testo digitato;
//   · «Preventivi salvati» apriva una pagina la cui briciola diceva tutt'altro;
//   · Posta restava «Documenti», Ticket e Agenda restavano «Scrivania», le
//     sottovoci di Contabilità restavano «Contabilità»;
//   · il capo-menu «Clienti» apriva Trattative invece di Anagrafiche.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { RADICE, esiti, deve } from './banco.mjs';

const src = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const e = esiti('SCOCCA — titoli, briciole e capi-menu');

/* Quando è stato modificato l'ultima volta un file, in forma AAAAMMGG —
   la stessa forma delle versioni negli indirizzi, così si confrontano
   come testo senza convertire niente. */
function ultimaModifica(file) {
  try {
    const d = execSync('git log -1 --format=%cd --date=format:%Y%m%d -- ' + file,
      { cwd: RADICE, encoding: 'utf8' }).trim();
    return /^[0-9]{8}$/.test(d) ? d : null;
  } catch { return null; }
}

function superficiale() {
  try {
    return execSync('git rev-parse --is-shallow-repository',
      { cwd: RADICE, encoding: 'utf8' }).trim() === 'true';
  } catch { return true; }
}

/* Le tabelle si leggono dal sorgente: sono dichiarazioni, non logica. */
function tabella(nome) {
  const i = src.indexOf('var ' + nome + ' = {');
  deve(i >= 0, 'tabella ' + nome + ' non trovata');
  const fine = src.indexOf('\n  };', i);
  const corpo = src.slice(i, fine);
  const chiavi = [...corpo.matchAll(/^\s*'?([a-zA-Z-]+)'?:\s*\[/gm)].map(m => m[1]);
  return chiavi;
}

// ── #9: ogni scheda raggiungibile ha il suo titolo ──────────────────────────
e.prova('le sottovoci di Contabilità hanno un titolo proprio', () => {
  const t = tabella('TITOLI');
  ['anomalie', 'sospesi', 'storico', 'conto'].forEach(k =>
    deve(t.includes(k), 'manca il titolo per «' + k + '»: resterebbe quello di prima'));
});

e.prova('Ticket, Posta e Agenda hanno il loro titolo', () => {
  const t = tabella('TITOLI');
  ['ticket', 'posta', 'agenda'].forEach(k =>
    deve(t.includes(k), 'manca il titolo per «' + k + '»'));
});

e.prova('le voci che non passano da vai() dichiarano il titolo da sole', () => {
  /* Posta apre un pannello senza cambiare scheda: se non chiamasse setActive,
     in alto resterebbe scritto il nome della pagina precedente.
     «Agenda» non è più una voce di menu (IAM.md §11.4): la sua funzione l'ha
     assorbita il Diario di lavoro, che passa da vai() e non ha questo problema. */
  ['Posta'].forEach(l => {
    const riga = src.split('\n').find(r => r.includes("l: '" + l + "'"));
    deve(riga && /setActive\(/.test(riga), '«' + l + '» non aggiorna il titolo');
  });
  /* Ticket non ha piu' ne' una voce di menu ne' un pulsante in alto: la coda
     si apre direttamente dalla scrivania (03/08/2026). Il titolo 'ticket'
     resta in tabella perche' la schermata esiste ancora e ci si arriva da li'. */
  deve(!/w1-b-ticket/.test(src), 'il pulsante Ticket e\' tornato nella barra in alto');
  deve(/ticket:\s*\[/.test(src), 'il titolo della schermata Ticket e\' sparito: in alto resterebbe quello di prima');
});

e.prova('senza titolo noto non si lascia quello vecchio', () => {
  const i = src.indexOf('function setActive(');
  const corpo = src.slice(i, i + 1600);
  deve(!/if \(!voce\) return;/.test(corpo),
    'esce senza scrivere niente: in alto resterebbe il titolo della schermata precedente');
  deve(/voce = m \? \[m\.l, m\.l\]/.test(corpo), 'manca il ripiego sul nome della voce di menu');
});

// ── #8: la briciola non contraddice il menu ─────────────────────────────────
e.prova('le scorciatoie del mega-menu portano con sé la loro briciola', () => {
  ['Preventivi salvati', 'Stato collegamenti compagnie'].forEach(l => {
    const riga = src.split('\n').find(r => r.includes("l: '" + l + "'"));
    deve(riga && /titolo:\s*\[/.test(riga), '«' + l + '» non dichiara la briciola: ne mostrerebbe un\'altra');
  });
  deve(/data-t="/.test(src), 'la briciola dichiarata non arriva fino al clic');
});

e.prova('setActive accetta la briciola dichiarata, e ha la precedenza', () => {
  const i = src.indexOf('function setActive(');
  // Finestra ampia: la riga «var voce = titolo ||» puo' stare dopo un commento
  // che documenta il ripiego dei titoli col suffisso (es. anagrafiche:senza-email).
  const corpo = src.slice(i, i + 1800);
  deve(/function setActive\(tab, page, titolo\)/.test(corpo), 'setActive non riceve il titolo');
  deve(/var voce = titolo\s*\n?\s*\|\|/.test(corpo), 'il titolo dichiarato non ha la precedenza');
});

// ── #10: il capo-menu apre la sua prima voce ────────────────────────────────
e.prova('«Clienti» apre Anagrafiche, non Trattative', () => {
  const i = src.indexOf("key: 'clienti'");
  const riga = src.slice(i, i + 200);
  deve(/go:\s*Q\('anagrafiche'\)/.test(riga), 'apre ancora qualcos\'altro: ' + riga.slice(0, 90));
});

// ── #7: la ricerca porta con sé il testo ────────────────────────────────────
e.prova('la lente in alto non butta via quello che hai digitato', () => {
  /* Questa prova cercava «q.addEventListener» dentro costruisciBarra1:
     pretendeva il MEZZO (come si chiamava la variabile e dove stava il
     gestore) invece del FINE (che il testo digitato arrivi alla ricerca
     clienti). Quando il gestore è stato spostato in collegaRicerca — per
     far cercare anche i prodotti — è diventata rossa su codice corretto.
     Ora guarda il fine, e resta rossa se il testo si perde davvero. */
  const i = src.indexOf('function collegaRicerca');
  deve(i > 0, 'la barra di ricerca non è più collegata a niente');
  const corpo = src.slice(i, src.indexOf('function costruisciBarra3'));
  deve(/aprireQuoto\('anagrafiche'/.test(corpo), 'la ricerca non apre più l\'elenco clienti');
  deve(/cerca:\s*(testo|r\.dato)\b/.test(corpo), 'apre l\'elenco senza passare il testo cercato');
});

e.prova('il testo cercato viaggia sul canale, non nell\'indirizzo', () => {
  /* Il testo cercato e' quasi sempre il nome o il codice fiscale di un cliente:
     nell'indirizzo finirebbe nei log del server e nella cronologia. Da oggi
     viaggia nel messaggio postMessage verso il riquadro (quoto-nav, e nella
     risposta quoto-session al primo caricamento), con l'origine dichiarata. */
  deve(!/'q=' \+ encodeURIComponent\(cerca\)/.test(src), 'il testo cercato e\' tornato nell\'indirizzo (q=)');
  deve(/quoto-nav/.test(src) && /q:\s*cerca/.test(src), 'il testo cercato non viaggia sul canale (quoto-nav con q)');
  deve(/function applicaRicerca/.test(src), 'manca la scrittura diretta quando il dominio e\' lo stesso');
});

e.prova('la scheda Fonti ha un titolo fra quelli di IAM', () => {
  /* Ci sono due mappe: TITOLI (le schede di IAM) e TITOLI_QUOTO (le pagine
     del preventivatore). La seconda si legge SOLO quando la scheda aperta è
     il preventivatore. Le Fonti sono passate a IAM: mettere la voce nella
     mappa sbagliata non dà nessun errore — dà una barra del titolo che dice
     «IAM > IAM», ed è esattamente quello che è successo. */
  const i = src.indexOf('var TITOLI = {');
  deve(i > 0, 'manca la mappa TITOLI');
  const mappa = src.slice(i, src.indexOf('};', i));
  deve(/fonti:/.test(mappa), 'la scheda Fonti non ha un titolo fra quelli di IAM');
});

e.prova('i fogli collegati hanno una versione che cambia coi rilasci', () => {
  /* withus-one.css?v=2 e .js?v=2 avevano una versione FISSA: il browser
     teneva la copia vecchia e un rilascio poteva non arrivare mai a chi il
     programma ce l'aveva gia' aperto. Si vedeva come «ho pubblicato ma non
     cambia niente», ed e' il modo piu' rapido di perdere un pomeriggio a
     cercare un guasto che non c'e'.

     Questa prova guardava solo che la versione ESISTESSE e fosse lunga.
     Non bastava: il 14/08/2026 la ricerca dei prodotti e' stata pubblicata
     con la versione ancora ferma al 04/08 — suite tutta verde, e in
     produzione continuava a caricarsi il file vecchio. Adesso si controlla
     anche che la versione non sia PIU' VECCHIA dell'ultima modifica al
     file: e' esattamente il caso che era sfuggito. */
  const iam = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
  for (const f of ['withus-one.css', 'withus-one.js', 'withus-pictograms.css']) {
    /* La versione e' una data AAAAMMGG, con una lettera facoltativa per i
       rilasci successivi dello STESSO giorno. Serve davvero: il 17/08/2026 un
       lavoro e' stato pubblicato e poi annullato in giornata, e riusare
       «20260817» avrebbe lasciato ai browser la copia intermedia — stesso
       indirizzo, nessuna nuova richiesta. La lettera e' l'unico modo di dire
       «stesso giorno, ma non la stessa cosa». */
    const m = iam.match(new RegExp(f.replace('.', '\\.') + '\\?v=([0-9]+[a-z]?)'));
    deve(m, f + ' non ha una versione nell\'indirizzo');
    deve(m[1].length >= 6, f + ' ha una versione fissa e corta: il browser terrà la copia vecchia');

    /* In una copia superficiale (git clone --depth 1) la storia non c'e':
       ogni file risulta modificato dall'unico commit presente, e questa
       verifica direbbe di aggiornare la versione a ogni rilascio anche di
       file mai toccati. Meglio dirlo e saltarla che dare un verdetto
       inventato. */
    if (superficiale()) continue;
    const ultima = ultimaModifica(f);
    if (!ultima) continue;
    deve(m[1].slice(0, 8) >= ultima,
      f + ' è stato modificato il ' + ultima + ' ma nell\'indirizzo c\'è ancora v=' + m[1] +
      ': chi ha il programma aperto continuerà a caricare la copia vecchia');
  }
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
