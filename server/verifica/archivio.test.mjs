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
import { createRequire } from 'module';
import { percorsoArchivio, SCADENZA } from '../archivio.js';
const require = createRequire(import.meta.url);

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const srcIam = fs.readFileSync(path.join(RADICE, 'iam', 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

/* LE PROVE SUL SORGENTE NON DEVONO LEGGERE I COMMENTI. È la trappola già
   scritta in CLAUDE.md §10: un commento che NOMINA il difetto («qui prima
   c'era M.campi…») fa scattare una prova che cerca quella stringa, e la prova
   dichiara rotto un codice corretto. Si cerca la chiamata, non la parola. */
function codice(testo) {
  /* Si tolgono SOLO i commenti che cominciano a inizio riga. Un «via tutto
     quello che sta fra /* e * /» sembra più furbo e su questo file cancella
     451.714 caratteri e 5.270 righe: `/*` e `*​/` compaiono dentro le
     espressioni regolari e dentro il CSS della pagina, e la ricerca globale
     accoppia pezzi che non sono commenti, mangiandosi il codice in mezzo.
     Una prova che gira su metà file dichiara pulito quello che non ha letto.
     (Misurato il 18/09/2026, scrivendo queste prove.) */
  const righe = String(testo || '').split('\n');
  let dentro = false;
  return righe.map((r) => {
    const t = r.trim();
    if (dentro) { if (/\*\//.test(t)) dentro = false; return ''; }
    if (/^\/\*/.test(t)) { if (!/\*\//.test(t)) dentro = true; return ''; }
    if (/^\/\//.test(t) || /^\*/.test(t)) return '';
    return r;
  }).join('\n');
}

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
  /* Il caricatore comune esiste, restituisce il percorso ed È CHIAMATO: un
     attrezzo che nessuno usa è il guasto §1 di CLAUDE.md, e una prova che lo
     sorveglia senza guardare se qualcuno lo chiama è la prova sbagliata. */
  const f = ritaglia(src, 'archCarica');
  deve(f, 'manca archCarica: il caricamento comune');
  deve(/return path;/.test(f), 'archCarica non restituisce il percorso');
  /* La soglia era 2 finché i caricamenti su Supabase erano due: il documento
     d'identità in anagrafica e il documento del fascicolo. Dal 18/09/2026 il
     fascicolo scrive sull'archivio cifrato del VPS (`archCaricaVps`), e qui
     resta l'anagrafica. Il numero cala perché il lavoro si è spostato, non
     perché qualcosa si è rotto — ma la regola che conta non cambia: un
     attrezzo che nessuno usa è il guasto §1, e vale per TUTTI E DUE i
     caricatori. */
  const chiamate = (src.match(/await archCarica\(/g) || []).length;
  deve(chiamate >= 1, 'archCarica è definita e non la chiama nessuno: codice non collegato');
  const suVps = ritaglia(src, 'archCaricaVps');
  deve(suVps, 'manca archCaricaVps: il caricamento sull\'archivio cifrato');
  const chiamateVps = (src.match(/await archCaricaVps\(/g) || []).length;
  deve(chiamateVps >= 1, 'archCaricaVps è definita e non la chiama nessuno: il fascicolo scriverebbe ancora in chiaro su Supabase');
  return caricamenti + ' caricamenti, nessun indirizzo pubblico, ' + chiamate + ' su Supabase e ' + chiamateVps + ' cifrati';
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

prova('le cartelle della rete di sicurezza sono quelle vere, non i nomi delle funzioni', () => {
  /* Alla prima stesura l'elenco conteneva `pet`, `fv`, `sal`, `sv`, `vg`,
     `cauz`: i nomi delle FUNZIONI che caricano, non delle cartelle
     (`animali/`, `fotovoltaico/`, `salute/`…). Per quei moduli la rete non
     scattava, e il percorso navigava come indirizzo del sito. Nessuna prova
     se n'era accorta, perché guardavano solo i casi che avevo in mente io.
     Questa invece legge i percorsi che il codice usa DAVVERO. */
  const m = src.match(/const ARCH_CARTELLE = \[([\s\S]*?)\];/);
  deve(m, 'manca ARCH_CARTELLE');
  const dichiarate = new Set(m[1].match(/'[^']+'/g).map(x => x.slice(1, -1)));

  /* Si parte dalla riga che COMPONE il percorso e si guarda dove finisce: il
     contenitore lo nomina la riga del caricamento, qualche riga sotto. Serve
     a non contare le cartelle di altri contenitori — «post/» per esempio è
     delle immagini di marketing (contenitore «offerte») e non c'entra. */
  const usate = new Set();
  for (const testo of [src, srcIam]) {
    const righe = testo.split('\n');
    righe.forEach((r, i) => {
      const m = r.match(/\bpath\s*=\s*'([a-z0-9-]+)\//);
      if (!m) return;
      const dopo = righe.slice(i, i + 9).join('\n');
      if (/storage\.from\('documenti'\)\.upload\(/.test(dopo) || /archCarica\(/.test(r)) usate.add(m[1]);
    });
    for (const m of testo.matchAll(/archCarica\(\s*'([a-z0-9-]+)\//g)) usate.add(m[1]);
  }
  /* Le cartelle che scrive solo il server, che nel browser non compaiono. */
  usate.add('shop');
  const mancanti = [...usate].filter(x => !dichiarate.has(x));
  deve(usate.size > 8, 'ho trovato solo ' + usate.size + ' cartelle nel codice: la prova non sta guardando niente');
  deve(!mancanti.length, 'cartelle usate dal codice e non dichiarate nella rete: ' + mancanti.join(', '));
  return usate.size + ' cartelle usate, tutte dichiarate';
});

prova('ogni documento caricato finisce in una cartella, mai nella radice', () => {
  /* Un file salvato come «172_modulo.pdf», senza cartella, non viene
     riconosciuto dalla rete: il link naviga come indirizzo del sito e mostra
     una pagina che non c'è. Succedeva ai documenti di Utility. */
  const nudi = [];
  for (const r of src.matchAll(/const path = ([^;]+);/g)) {
    const espressione = r[1];
    if (/^'[a-z0-9-]+\//.test(espressione.trim())) continue;          // comincia con una cartella
    if (/^\w+ \+ '\//.test(espressione.trim())) continue;             // una cartella in una variabile
    if (/Date\.now\(\)/.test(espressione) && !/\//.test(espressione.split('+')[0])) nudi.push(espressione.trim().slice(0, 60));
  }
  deve(!nudi.length, 'caricamenti senza cartella: ' + nudi.join(' | '));
  return 'nessun file nella radice del contenitore';
});

prova('il fascicolo cerca il tipo documento con la funzione giusta', () => {
  /* `campi()` vuole la POLIZZA, non il ramo: `M.campi('rcauto', null)` non
     trovava mai il campo, e ogni documento dell'operazione finiva in archivio
     segnato «non obbligatorio». Il catalogo si interroga con `definizione`. */
  const f = codice(ritaglia(src, 'pdocCarica'));
  deve(f, 'manca pdocCarica');
  deve(!/M\.campi\(/.test(f), 'pdocCarica chiama ancora campi() con la firma vecchia');
  deve(/M\.definizione\(categoria\)/.test(f), 'pdocCarica non usa definizione() per trovare il tipo documento');
  /* E il motore deve rispondere per i tipi che contano davvero. */
  const F = require(path.join(RADICE, 'tariffe', 'motore', 'fascicolo.js'));
  for (const cat of ['patente', 'libretto_veicolo', 'documento_identita', 'polizza_firmata', 'quietanza']) {
    const d = F.definizione(cat);
    deve(d && d.cat === cat, 'il catalogo non conosce «' + cat + '»');
  }
  deve(F.definizione('documento_identita').fonte === 'anagrafica', 'l\'identità del cliente non risulta dell\'anagrafica');
  deve(F.definizione('inventato_di_sana_pianta') === null, 'il catalogo inventa un tipo che non esiste');
  return 'definizione(), e cinque tipi che rispondono';
});

prova('il contatore di agenzia passa dallo stesso cancello del portafoglio', () => {
  /* Senza `visibleUserIds` un collaboratore vedeva le pratiche di TUTTA
     l'agenzia, con nome del cliente e nome di chi le ha fatte. Un cruscotto
     di controllo non è una scorciatoia per il portafoglio degli altri. */
  const f = codice(ritaglia(src, 'cdocCarica'));
  deve(f, 'manca cdocCarica');
  deve(/visibleUserIds\(\)/.test(f), 'il contatore legge le polizze senza il filtro di visibilità');
  const iPolizze = f.indexOf("from('quote_polizze')");
  const iFiltro = f.indexOf('visibleUserIds()');
  deve(iPolizze > 0 && iFiltro > iPolizze && iFiltro - iPolizze < 500, 'il filtro non è sulla lettura delle polizze');
  deve(/\.in\('creato_da', ids\)/.test(f), 'il filtro non si applica come negli altri elenchi');
  return 'stesso cancello del Portafoglio';
});

prova('se una lettura fallisce il contatore lo dice, e si può riprovare', () => {
  /* Due zeri rassicuranti su un archivio che non è stato letto sono peggio di
     un errore: si conclude che va tutto bene. E `caricato` segnato prima
     della lettura impediva di riprovare. */
  const f = codice(ritaglia(src, 'cdocCarica'));
  const iSegna = f.indexOf('CDOC.caricato = true');
  const iLettura = f.indexOf("from('quote_anagrafiche')");
  deve(iSegna > iLettura, 'si segna «caricato» prima di aver letto: dopo un errore non riprova più');
  deve(/Riprova/.test(f), 'non offre di riprovare');
  deve(/errori\.length/.test(f), 'non guarda se le letture sono andate a buon fine');
  return 'errore detto, riprova offerta';
});

prova('la scheda cliente si apre anche per un cliente che non è in cache', () => {
  /* ANAG_CACHE la riempie solo la schermata Clienti. Dal fascicolo e dal
     contatore delle scadenze si arriva con id che lì non ci sono, e la scheda
     rispondeva «Anagrafica non trovata» su un cliente che esiste. */
  const f = codice(ritaglia(src, 'apriAnagrafica'));
  deve(f, 'manca apriAnagrafica');
  deve(/async function apriAnagrafica/.test(f), 'apriAnagrafica non può leggere: non è asincrona');
  const iCache = f.indexOf('ANAG_CACHE');
  const iLettura = f.indexOf("from('quote_anagrafiche')");
  deve(iLettura > 0 && iLettura > iCache, 'non rilegge il cliente quando non è in cache');
  const iErrore = f.indexOf("alert('Anagrafica non trovata");
  deve(iErrore > iLettura, 'si arrende prima di aver provato a leggere');
  return 'cache, poi archivio, poi l\'errore';
});

prova('la rete di sicurezza intercetta anche i link che nessuno ha convertito', () => {
  /* I punti che mostrano un documento sono decine e ognuno scrive il suo
     `<a href>` a mano. La rete serve a quelli che restano, e a quelli che
     qualcuno scriverà domani copiando il vicino. */
  deve(/addEventListener\('click'/.test(src), 'non c\'è nessun ascoltatore sui clic');
  const f = ritaglia(src, 'archSuoIndirizzo');
  deve(f, 'manca archSuoIndirizzo');
  const cartelle = src.match(/const ARCH_CARTELLE = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g).map(x => x.slice(1, -1));
  const ctx = { console, String, RegExp, ARCH_PREFISSI: new RegExp('^(' + cartelle.join('|') + ')/') };
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

prova('l\'indirizzo morto non resta nell\'attributo: «Apri in una nuova scheda» non lo raggiunge', () => {
  /* Intercettare il clic non basta. Finché l'indirizzo pubblico resta scritto
     nell'`href`, il browser ci arriva per tutte le altre strade: clic con la
     rotella, tasto destro «Apri in una nuova scheda», «Copia indirizzo», il
     trascinamento del link, una scheda ripristinata dopo il riavvio. Nessuna
     di quelle genera un evento `click`. Il rimedio è togliere l'indirizzo
     dall'attributo, non intercettare meglio. */
  for (const [nome, testo] of [['index.html', src], ['iam/index.html', srcIam]]) {
    const f = codice(ritaglia(testo, 'archDisinnesca'));
    deve(f, nome + ': manca archDisinnesca');
    deve(/dataset\.arch = grezzo/.test(f), nome + ': l\'indirizzo non si mette da parte');
    deve(/setAttribute\('href', 'javascript:void\(0\)'\)/.test(f), nome + ': l\'attributo resta l\'indirizzo morto');
    deve(/MutationObserver/.test(codice(testo)), nome + ': nessuno guarda i documenti che compaiono dopo');
    /* E il clic deve leggere `data-arch`, altrimenti dopo il disinnesco non
       troverebbe più niente da firmare. */
    deve(/a\.dataset\.arch \|\| a\.getAttribute\('href'\)/.test(codice(testo)),
      nome + ': il clic non guarda dove il disinnesco ha messo l\'indirizzo');
  }
  return 'due pagine: indirizzo in data-arch, href innocuo';
});

prova('anche la scocca di IAM sa firmare, e apre l\'allegato con un bottone', () => {
  /* Al 18/09/2026 questa pagina non aveva niente dell'archivio, e mostrava
     l'allegato di un documento da firmare con l'indirizzo grezzo di
     `iam_firme.doc_url`: per una riga vecchia un indirizzo pubblico morto,
     per una nuova un PERCORSO che il browser risolve come indirizzo di IAM.
     In tutti e due i casi non si apriva niente. */
  for (const nome of ['archPercorso', 'archFirma', 'archApri', 'archSuoIndirizzo', 'archDisinnesca']) {
    deve(ritaglia(srcIam, nome), 'la scocca di IAM non ha ' + nome);
  }
  const f = codice(ritaglia(srcIam, 'schedaMioDocumento'));
  deve(f, 'manca schedaMioDocumento');
  deve(!/<a href="' \+ esc\(f\.doc_url\)/.test(f), 'l\'allegato è di nuovo un link con l\'indirizzo grezzo');
  deve(/archApri\(/.test(f), 'l\'allegato non passa dalla firma');
  return 'cinque funzioni e un bottone che firma';
});

prova('le due metà dell\'archivio non divergono', () => {
  /* `archPercorso` e `archSuoIndirizzo` vivono in tre posti: il server, QUOTO
     e la scocca di IAM. Non è un doppione da togliere — le due pagine sono
     due programmi separati e nessuna può importare un modulo dell'altra — ma
     è un doppione che può divergere, e allora le tre parti capirebbero tre
     cose diverse dallo stesso valore. Qui si provano INSIEME. */
  const stanza = (sorgente) => {
    const cartelle = sorgente.match(/const ARCH_CARTELLE = \[([\s\S]*?)\];/)[1].match(/'[^']+'/g).map(x => x.slice(1, -1));
    const ctx = { console, String, RegExp, decodeURIComponent, ARCH_PREFISSI: new RegExp('^(' + cartelle.join('|') + ')/') };
    vm.createContext(ctx);
    for (const n of ['archPercorso', 'archSuoIndirizzo']) vm.runInContext(ritaglia(sorgente, n), ctx);
    return ctx;
  };
  const quoto = stanza(src), iam = stanza(srcIam);
  const casi = [PUBBLICO, FIRMATO, PERCORSO, '/' + PERCORSO, '', 'https://quoto.withusassicurazioni.it/docs/dip.pdf',
                'collab/1_mandato.pdf', 'fatture/abc/xyz_f.pdf', '#', 'javascript:void(0)'];
  for (const c of casi) {
    deve(quoto.archPercorso(c) === iam.archPercorso(c),
      'percorso diverso fra QUOTO e IAM per «' + c + '»: «' + quoto.archPercorso(c) + '» vs «' + iam.archPercorso(c) + '»');
    deve(quoto.archPercorso(c) === percorsoArchivio(c),
      'percorso diverso fra la pagina e il server per «' + c + '»');
    deve(quoto.archSuoIndirizzo(c) === iam.archSuoIndirizzo(c),
      'riconoscimento diverso fra QUOTO e IAM per «' + c + '»');
  }
  return casi.length + ' casi, tre parti che dicono la stessa cosa';
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
