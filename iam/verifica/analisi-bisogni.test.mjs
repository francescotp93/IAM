// ═══════════════════════════════════════
//  ANALISI DEI BISOGNI — motore, innesto e confini
//
//  Queste prove sorvegliano una cosa sola, ed è la più delicata di tutta la
//  funzione: che il punteggio non menta.
//
//  Un'analisi dei bisogni finisce in un PDF che il cliente firma con OTP. Se
//  il motore dice «verde, nessuna criticità» dove in realtà non sapeva niente,
//  o dice «coperto» perché il cliente ha spuntato «ho una polizza casa» senza
//  che nessuno l'abbia letta, l'errore non resta sullo schermo: esce di qui
//  come consulenza scritta, con una firma sotto.
//
//  Perciò tre regole sono provate una per una, e non come dettagli:
//   - dati mancanti fanno GRIGIO, mai verde;
//   - prodotto dichiarato fa BLU «da verificare», mai verde;
//   - l'indice complessivo non pesa le categorie grigie.
//
//  L'ultima è la differenza fra il modulo di riferimento del pacchetto e il
//  prototipo nel browser: il prototipo pesava sempre 50/30/20 sulle prime tre
//  categorie, comprese quelle senza dati, e stampava un numero anche quando
//  non c'era niente su cui calcolarlo. Vale il modulo.
// ═══════════════════════════════════════
import fs from 'fs';
import { createHash } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(radice, 'withus-one.js'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { const m = fn(); esiti.push([true, nome, m || '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

// Il motore è un modulo vero, non una funzione dentro index.html: si prova
// facendolo girare, non cercando stringhe. È l'unico pezzo di IAM che si può
// interrogare davvero, ed è anche quello dove un errore si vede di meno.
let M = null;
try {
  M = await import(path.join(radice, 'analisi-bisogni-rating.js'));
} catch (e) {
  esiti.push([false, 'il motore di rating esiste ed è caricabile', e.message]);
}

const oggi = new Date('2026-08-04T12:00:00Z');
const base = () => ({
  anagrafica: { nascita: '1984-06-14' },
  famiglia: 'figli',
  dipendenzaReddito: 'totale',
  casa: 'mutuo',
  patrimonio: ['prima_casa'],
  coperture: [],
  copertureConfermate: true,
  interessi: [],
});
const cat = (dati, chiave) => M.calcolaNecessita(dati, { dataRiferimento: oggi }).find(n => n.chiave === chiave);

if (M) {
  // ── 1. Le tre regole che impediscono al punteggio di mentire ────────────
  prova('senza risposte le categorie sono grigie, mai verdi', () => {
    /* Il verde è un'affermazione: «ho guardato e va bene». Su un questionario
       vuoto nessuno ha guardato niente. Il prototipo qui dava verde, perché
       il punteggio di partenza è basso e la soglia bassa vuol dire verde. */
    const r = M.calcolaNecessita({ anagrafica: {}, coperture: [], interessi: [] }, { dataRiferimento: oggi });
    deve(r.every(n => n.colore !== 'verde'), 'un questionario vuoto ha prodotto un verde');
    deve(r.find(n => n.chiave === 'famiglia').colore === 'grigio', 'famiglia senza risposte non è grigia');
    deve(r.find(n => n.chiave === 'casa').colore === 'grigio', 'casa senza risposte non è grigia');
  });

  prova('un prodotto dichiarato diventa blu «da verificare», non verde', () => {
    /* «Ho la polizza casa» non vuol dire «sono coperto»: massimali, esclusioni
       e franchigie non le ha lette nessuno. Chiudere l'area in verde qui
       significa toglierla dal colloquio proprio dove servirebbe aprirlo. */
    for (const [copertura, chiave] of [['casa', 'casa'], ['tcm', 'famiglia'], ['salute', 'salute'], ['previdenza', 'previdenza'], ['rcfam', 'responsabilita']]) {
      const d = base(); d.coperture = [copertura];
      const r = cat(d, chiave);
      deve(r.colore === 'blu', `${copertura} dichiarata non produce blu su ${chiave}: dà ${r.colore}`);
      deve(r.stato === 'Da verificare', `${chiave} in blu non dice «Da verificare»`);
      deve(r.punteggio > 0, `${chiave} in blu ha perso il punteggio: resta visibile`);
    }
  });

  prova('l\'indice complessivo non pesa le categorie grigie', () => {
    /* Se una categoria è grigia non sappiamo niente di lei: farla entrare
       nella media con punteggio basso abbassa l'indice come se fosse una
       buona notizia. Le grigie si escludono e i pesi si ridistribuiscono. */
    const conGrigio = M.calcolaIndiceComplessivo([
      { punteggio: 100, colore: 'rosso' },
      { punteggio: 50, colore: 'ambra' },
      { punteggio: 10, colore: 'grigio' },
    ]);
    const senza = M.calcolaIndiceComplessivo([
      { punteggio: 100, colore: 'rosso' },
      { punteggio: 50, colore: 'ambra' },
    ]);
    deve(conGrigio === senza, 'la categoria grigia ha spostato l\'indice: ' + conGrigio + ' invece di ' + senza);
    deve(M.calcolaIndiceComplessivo([{ punteggio: 40, colore: 'grigio' }]) === null,
      'con sole categorie grigie l\'indice non è nullo: stampa un numero senza dati');
  });

  // ── 2. Che le regole del pacchetto siano davvero quelle ─────────────────
  prova('mutuo, figli e reddito totale senza TCM sono priorità alta', () => {
    const r = cat(base(), 'famiglia');
    deve(r.colore === 'rosso', 'famiglia non è rossa: ' + r.colore);
    deve(r.motivi.some(m => m.includes('TCM')), 'non viene detto che manca la TCM');
  });

  prova('ogni categoria porta le sue motivazioni, non solo un numero', () => {
    /* Un rating senza il perché non è consulenza: è un oroscopo con la
       partita IVA. Il pacchetto lo chiede esplicitamente (06 §8). */
    for (const n of M.calcolaNecessita(base(), { dataRiferimento: oggi })) {
      deve(Array.isArray(n.motivi) && n.motivi.length, 'categoria senza motivi: ' + n.chiave);
      deve(n.prossimoPasso && n.prossimoPasso.length > 10, 'categoria senza prossimo passo: ' + n.chiave);
      deve(n.versioneRegole, 'categoria senza versione delle regole: ' + n.chiave);
    }
  });

  prova('lo snapshot è versionato e riproducibile', () => {
    /* Il PDF è una fotografia: se lo stesso questionario, riletto domani con
       regole nuove, desse un altro risultato, la firma sotto non varrebbe
       niente. Versione e data devono stare dentro il risultato. */
    const s = M.creaSnapshotRating(base(), { dataRiferimento: oggi });
    deve(s.versioneRegole === M.VERSIONE_REGOLE, 'lo snapshot non porta la versione delle regole');
    deve(s.generatoIl === oggi.toISOString(), 'lo snapshot non porta la data di generazione');
    deve(s.bisognoPrincipale === 'famiglia', 'il bisogno principale non è famiglia: ' + s.bisognoPrincipale);
    const b = M.creaSnapshotRating(base(), { dataRiferimento: oggi });
    deve(JSON.stringify(s) === JSON.stringify(b), 'due calcoli sugli stessi dati danno risultati diversi');
  });

  prova('le regole sono identiche a quelle del motore', () => {
    /* Questo file calcola l'ANTEPRIMA che l'operatore vede mentre compila; il
       punteggio che finisce nel documento firmato lo calcola il motore
       (QUOTE/server/analisiBisogniRating.js). Sono due copie perché stanno in
       due repository e IAM non ha un passo di costruzione.

       Se divergessero, l'operatore leggerebbe un numero mentre parla col
       cliente e il PDF ne porterebbe un altro — e non se ne accorgerebbe
       nessuno, perché nessuno mette i due numeri accanto.

       L'impronta si calcola sul CODICE delle funzioni come lo vede il motore
       JavaScript: commenti e spaziatura non contano, contano le regole. Lo
       stesso valore è inchiodato nella prova gemella lato motore. Se questa
       diventa rossa: cambia anche l'altro file, alza VERSIONE_REGOLE e
       aggiorna il valore in tutte e due. */
    const IMPRONTA_ATTESA = 'f378179307977aa8';
    const pezzi = [
      M.VERSIONE_REGOLE, M.VERSIONE_QUESTIONARIO, JSON.stringify(M.META_CATEGORIE),
      M.calcolaNecessita.toString(), M.calcolaIndiceComplessivo.toString(), M.creaSnapshotRating.toString(),
    ].join(' ');
    const impronta = createHash('sha256').update(pezzi.replace(/\s+/g, ' ')).digest('hex').slice(0, 16);
    deve(impronta === IMPRONTA_ATTESA,
      'le regole dell\'anteprima sono cambiate (impronta ' + impronta + ' invece di ' + IMPRONTA_ATTESA + '): '
      + 'l\'anteprima mostrerebbe un punteggio diverso da quello archiviato nel PDF');
  });

  prova('il bisogno principale non può essere una categoria grigia', () => {
    const s = M.creaSnapshotRating({ anagrafica: {}, coperture: [], interessi: [] }, { dataRiferimento: oggi });
    deve(s.bisognoPrincipale === null, 'senza dati viene indicato un bisogno principale: ' + s.bisognoPrincipale);
  });
}

// ── 3. L'innesto in IAM ───────────────────────────────────────────────────
prova('la voce sta in Marketing', () => {
  /* Analisi dei bisogni è passata da Strumenti a Marketing (IAM.md §10).
     Si taglia fino alla voce successiva ('strumenti', subito dopo): il blocco
     Marketing ha un '] }' interno (l'array titolo di Campagne email) che
     troncherebbe uno slice basato su quel marcatore. */
  const i = scocca.indexOf("key: 'marketing'");
  deve(i > 0, 'non trovo il gruppo Marketing');
  const gruppo = scocca.slice(i, scocca.indexOf("key: 'strumenti'", i));
  deve(/Analisi dei bisogni/.test(gruppo), 'la voce non è dentro Marketing');
  deve(/vai\('analisi'\)/.test(gruppo), 'la voce non apre la scheda analisi');
});

prova('il titolo sta in TITOLI e non in TITOLI_QUOTO', () => {
  /* Sbagliare mappa non rompe niente e non si vede: la barra resta
     semplicemente a «IAM > IAM», perché TITOLI_QUOTO si legge solo quando la
     scheda aperta è il preventivatore. È già successo con le Fonti. */
  /* Si cerca la DICHIARAZIONE «var TITOLI_QUOTO», non la parola: il nome
     compare prima dentro un commento che spiega perché le Fonti non vanno
     lì, e tagliare la mappa su quello la troncava a metà. È lo stesso
     inciampo per cui ritaglia() in banco.mjs salta i commenti. */
  const t = scocca.indexOf('var TITOLI = {');
  const tq = scocca.indexOf('var TITOLI_QUOTO');
  const mappa = scocca.slice(t, tq > t ? tq : scocca.length);
  deve(/analisi:\s*\[/.test(mappa), 'la scheda analisi non ha titolo in TITOLI');
  deve(/analisi:\s*\['[^']*',\s*'Marketing'\]/.test(mappa), 'la briciola non dice Marketing');
});

prova('la scheda evidenzia la sua voce di menu', () => {
  const i = scocca.indexOf('var TAB2MENU = {');
  deve(i > 0, 'non trovo TAB2MENU');
  const mappa = scocca.slice(i, scocca.indexOf('};', i));
  deve(/analisi:\s*'marketing'/.test(mappa), 'aprendo l\'analisi nessuna voce resta accesa');
});

prova('la schermata esiste in index.html', () => {
  deve(html.includes('id="panel-analisi"'), 'manca il pannello dell\'analisi dei bisogni');
});

// ── 4. Confini: la tavolozza non deve uscire ──────────────────────────────
prova('i colori del disegno restano dentro la schermata', () => {
  /* Il disegno consegnato è su fondo chiaro; IAM è scuro. Lasciare i token
     liberi sfonderebbe il tema in tutto il resto del gestionale — è
     esattamente quello che è successo col diario, dove una classe chiamata
     «oggi» ha ereditato lo stile di un riquadro della scrivania. */
  const i = html.indexOf('#panel-analisi{');
  deve(i > 0, 'i token dell\'analisi non sono confinati in #panel-analisi');
  const blocco = html.slice(i, html.indexOf('}', i));
  deve(/--ab-/.test(blocco), 'i token non sono dichiarati dentro il confine');
  /* Ogni classe nuova porta il suo prefisso: «ab-». Senza, prima o poi una
     collide con qualcosa di globale e il difetto sembra venire da un'altra
     parte del programma. */
  deve(!/class="(choice|panel-head|multi-card|need-ring|badge) /.test(html),
    'una classe del prototipo è entrata senza prefisso: collide col resto di IAM');
});

prova('l\'indicatore non può uscire dallo schermo', () => {
  /* Questa è la lezione di tre tentativi falliti, ed è il motivo per cui la
     prova guarda la STRUTTURA e non un accorgimento.

     Ho provato due volte con position:sticky e ha prodotto due difetti
     diversi: ancorato al contrario quando l'elemento è più alto della
     finestra (misurato: colonna 552px in 500px, titolo a y=-73, anello
     tagliato), e una fessura da cui passava il contenuto, perché gli
     scostamenti si contano dal riquadro interno del contenitore.

     Ora la colonna sta ferma per COSTRUZIONE: il pannello non scorre, i due
     riquadri dentro scorrono per conto loro. L'indicatore non ha dove
     andare. Rimettere lo scorrimento sul pannello rifarebbe il difetto. */
  const pan = html.slice(html.indexOf('#panel-analisi{'), html.indexOf('}', html.indexOf('#panel-analisi{')));
  deve(/overflow:\s*hidden/.test(pan), 'il pannello è tornato a scorrere: la colonna scorrerebbe via con lui');
  /* Il display sta su .act, non sull'id: vedi la prova sui pannelli che si
     coprono, qui sotto. Cercarlo nel blocco dell'id rimetterebbe in piedi
     proprio l'errore che ha bloccato il gestionale. */
  const att = html.slice(html.indexOf('#panel-analisi.act{'), html.indexOf('}', html.indexOf('#panel-analisi.act{')));
  deve(/display:\s*flex/.test(att), 'il pannello non è più una colonna flessibile: le viste non possono riempirlo');
  for (const [sel, nome] of [['#panel-analisi .ab-lato{', 'la colonna'], ['#panel-analisi .ab-lato-cima{', 'la testa della colonna']]) {
    const b = html.slice(html.indexOf(sel), html.indexOf('}', html.indexOf(sel)));
    deve(!/position:\s*sticky/.test(b), nome + ' è tornata sticky: è la strada che ha già fallito due volte');
  }
  deve(/#panel-analisi #ab-vista-quest \.ab-riq,#panel-analisi #ab-vista-quest \.ab-lato\{overflow-y:auto\}/.test(html),
    'i due riquadri delle domande non scorrono per conto loro');
  /* Su schermo stretto si impilano e scorre la vista: due scorrimenti
     annidati dentro un telefono sono ingestibili. */
  deve(/#panel-analisi > #ab-vista-quest\{display:block;overflow-y:auto\}/.test(html),
    'su schermo stretto restano due scorrimenti annidati');
});

prova('niente dati dimostrativi del prototipo', () => {
  /* Il prototipo gira su quattro clienti finti. Un gestionale che mostra
     Mario Rossi accanto ai clienti veri non è una demo: è un errore che
     qualcuno prima o poi chiama al telefono. */
  const senzaCommenti = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const finto of ['RSSMRA84H14H501X', 'BNCGLI79C51F205K', 'm.rossi@example.it', 'Dati dimostrativi']) {
    deve(!senzaCommenti.includes(finto), 'è rimasto un dato dimostrativo del prototipo: ' + finto);
  }
});

prova('il documento ufficiale non nasce nel browser', () => {
  /* COS'È CAMBIATO, E PERCHÉ (14/09/2026).
     Fino a oggi questa prova diceva: nessuna libreria PDF nel browser, punto.
     La ragione era, ed è, giusta — un documento che il cliente firma con OTP
     non può dipendere da un CDN che non controlliamo, e soprattutto la fonte
     autorevole è il server: se il PDF nasce nel browser, nasce da dati che il
     browser può aver cambiato.

     Però il motore che produce quel documento oggi non risponde, e finché non
     risponde dalla schermata del risultato non esce NIENTE: si finisce il
     colloquio col cliente seduto lì e non gli si può lasciare in mano niente.
     Da qui il foglio disegnato nel browser (abPdfBlob).

     La regola non è stata tolta, è stata spostata dove sta il rischio vero.
     Quello che il browser non può fare resta: produrre il documento
     AUTOREVOLE, quello archiviato e quello che si firma. Quel documento
     continua a passare dal motore (abApriReport), e nessuna riga qui dentro
     lo genera in locale.
     Quello che il browser può fare è una COPIA DI LAVORO, e deve dire di
     esserlo su ogni pagina — vedi la prova qui sotto, che è la condizione a
     cui questa è stata allentata. Se un giorno quella marcatura sparisce,
     i due fogli tornano indistinguibili e questo allentamento non ha più
     nessuna giustificazione.

     Font e icone del prototipo NON sono controllati qui apposta: Inter e le
     Tabler le carica già IAM da prima (index.html righe 19-23), sono le
     stesse, e riusarle non aggiunge nessuna dipendenza nuova. */
  const senzaCommenti = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  /* Queste due restano vietate del tutto: servono a fotografare lo schermo e
     farne un documento, che è esattamente il modo di spacciare per atto
     quello che è un'immagine di una pagina modificabile. */
  for (const esterna of ['html2canvas', 'pdfmake']) {
    deve(!senzaCommenti.includes(esterna), 'è entrata una libreria PDF nel browser: ' + esterna);
  }
  /* Il documento che si firma continua a chiedersi al motore. */
  deve(/abApriReport/.test(senzaCommenti) && /analisi-bisogni\/'\s*\+\s*encodeURIComponent\(AB_ANALISI_ID\)\s*\+\s*'\/report/.test(senzaCommenti),
    'il report ufficiale non si chiede più al motore: se lo genera il browser, non è più autorevole');
});

prova('il foglio fatto nel browser dice di essere una copia di lavoro', () => {
  /* È LA CONDIZIONE dell'allentamento qui sopra, non un dettaglio di stile.
     Stessa carta intestata, stesso RUI, stesso marchio: senza una riga che li
     distingua, il foglio composto dal browser e il documento archiviato dal
     motore sono la stessa cosa in mano a chi li riceve. */
  const senzaCommenti = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  deve(/copiaDiLavoro:/.test(senzaCommenti), 'il documento non porta più la marcatura di copia di lavoro');
  deve((senzaCommenti.match(/COPIA DI LAVORO/g) || []).length >= 3,
    'la marcatura non è più su banda, filigrana e piede: basta girare pagina per perderla');
  /* La banda si disegna PRIMA delle schede di cliente e consulente: in calce
     la leggerebbe solo chi arriva in fondo. */
  const i = senzaCommenti.indexOf('d.copiaDiLavoro');
  const j = senzaCommenti.indexOf("scrivi('CLIENTE'");
  deve(i > 0 && j > i, 'la banda non viene più prima del resto del foglio');
});

// ── 5. Il questionario ────────────────────────────────────────────────────
function corpoDi(firma) {
  const i = html.indexOf(firma);
  if (i < 0) return null;
  let liv = 0, j = html.indexOf('{', i);
  const inizio = j;
  for (; j < html.length; j++) {
    if (html[j] === '{') liv++;
    else if (html[j] === '}') { liv--; if (liv === 0) return html.slice(inizio, j + 1); }
  }
  return null;
}

prova('i sette passi sono quelli della specifica', () => {
  /* «7 passaggi al massimo oltre all'anagrafica precompilata» (02 §4). Non è
     un vezzo: un questionario lungo si abbandona a metà, e un'analisi
     abbandonata a metà non produce niente — né consulenza né dato. */
  const i = html.indexOf('const AB_PASSI');
  deve(i > 0, 'manca l\'elenco dei passi');
  const passi = html.slice(i, html.indexOf('];', i));
  for (const t of ['I tuoi dati', 'Famiglia', 'Casa e patrimonio', 'Coperture', 'approfondire', 'Osservazioni', 'Privacy']) {
    deve(passi.includes(t), 'manca il passo: ' + t);
  }
  deve((passi.match(/titolo:/g) || []).length === 7, 'i passi non sono sette');
});

prova('l\'anteprima usa il motore vero, non una copia', () => {
  /* Una seconda copia delle regole dentro index.html divergerebbe dalla
     prima al primo ritocco, e l'anteprima mostrerebbe un punteggio diverso
     da quello che poi viene archiviato. Si chiama il modulo. */
  const f = corpoDi('function abRicalcola()');
  deve(f, 'manca abRicalcola');
  deve(/ABRating/.test(f), 'l\'anteprima non chiama il motore');
  deve(!/punteggio\s*\+=|\+=\s*28|>=\s*65/.test(html.replace(/\/\*[\s\S]*?\*\//g, '')),
    'le soglie o i pesi del rating sono stati ricopiati dentro index.html');
});

prova('non si va avanti senza le risposte necessarie', () => {
  const f = corpoDi('function abValida()');
  deve(f, 'manca abValida');
  deve(/famiglia/.test(f) && /dipendenzaReddito/.test(f), 'il passo famiglia si può saltare vuoto');
  deve(/casa/.test(f), 'il passo casa si può saltare vuoto');
});

prova('non si dà per archiviata un\'analisi che non lo è', () => {
  /* Il caso peggiore di tutta la funzione: l'operatore chiude la scheda
     convinto di aver lasciato una traccia sul cliente, e non c'è niente. Un
     lavoro che si crede fatto è peggio di un lavoro non fatto.

     Perciò il risultato NON dice mai «archiviata» finché il motore non ha
     risposto: parte da «verifico», e diventa una delle due cose solo dopo. */
  const e = corpoDi('function abEsito()');
  deve(e, 'manca abEsito');
  deve(/Verifico se/.test(e), 'il risultato non parte da uno stato di attesa');
  deve(!/archiviata sulla scheda/i.test(e), 'il risultato si dichiara archiviato prima di saperlo');
  deve(/abChiudiSulMotore\(\)/.test(e), 'il risultato non verifica mai se l\'analisi è stata archiviata');

  const c = corpoDi('async function abChiudiSulMotore()');
  deve(c, 'manca abChiudiSulMotore');
  deve(/!AB_ANALISI_ID/.test(c), 'senza pratica sul motore non viene detto niente');
  deve(/non è stata salvata/i.test(c), 'quando il motore non risponde non si dice che nulla è stato salvato');
  deve(/non è stata archiviata/i.test(c), 'se l\'archiviazione fallisce a metà, l\'errore non viene detto');
  /* E che la buona notizia arrivi solo dopo aver davvero archiviato. */
  const i = c.indexOf('/report'), j = c.indexOf('Analisi archiviata');
  deve(i > 0 && j > i, 'si dichiara archiviata prima di aver generato i documenti');
});

prova('la scheda interna è marcata come da non consegnare', () => {
  /* Contiene valutazioni operative, dati non verificati e la traccia del
     colloquio. Basta un clic di troppo per mandarla al cliente. */
  const c = corpoDi('async function abChiudiSulMotore()');
  deve(c && /non va consegnata al cliente/i.test(c),
    'la schermata non avverte che la scheda interna non si consegna');
});

prova('non indica una necessità principale se nessuna area la merita', () => {
  /* Con la sola anagrafica compilata l'area previdenza esce verde — bassa
     priorità — e chiamarla «necessità principale» accanto a «non sono emersi
     elementi sufficienti» faceva dire alla schermata due cose opposte nella
     stessa riga. Letto di corsa, il primo pezzo suona come un consiglio di
     vendita: esattamente quello che questo strumento non deve fare. */
  const f = corpoDi('function abPrincipale(necessita)');
  deve(f, 'manca abPrincipale');
  deve(/AB_DA_AGIRE/.test(f), 'la necessità principale non è filtrata sugli stati che richiedono un\'azione');
  const lista = html.slice(html.indexOf('const AB_DA_AGIRE'), html.indexOf('\n', html.indexOf('const AB_DA_AGIRE')));
  for (const c of ['rosso', 'ambra', 'blu']) deve(lista.includes(c), 'manca lo stato ' + c);
  for (const c of ['verde', 'grigio']) deve(!lista.includes(c), 'lo stato ' + c + ' non può essere una necessità principale');
  /* E che nessuna delle due schermate torni a pescare la prima non-grigia. */
  for (const fn of ['function abRicalcola()', 'function abEsito()']) {
    const b = corpoDi(fn);
    deve(b && !/colore\s*!==\s*'grigio'/.test(b), fn + ' sceglie ancora la prima area non grigia');
  }
});

prova('il risultato mostra i perché, non solo i numeri', () => {
  const f = corpoDi('function abEsito()');
  deve(f && /motivi/.test(f), 'il risultato non stampa le motivazioni');
  deve(f && /prossimoPasso/.test(f), 'il risultato non dice che cosa verificare');
  /* Il colore da solo non basta: stampato in bianco e nero, o letto da chi
     non distingue rosso e verde, resterebbe muto (08 §6). */
  deve(f && /stato/.test(f), 'lo stato non è scritto a parole accanto al colore');
});

let ko = 0;
console.log('\nANALISI DEI BISOGNI — motore, innesto e confini');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome + (msg ? ' — ' + msg : '') : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nANALISI DEI BISOGNI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
