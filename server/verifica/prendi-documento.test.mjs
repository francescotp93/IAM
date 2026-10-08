// ═══════════════════════════════════════════════════════════════════════════════
//  IL RACCOGLITORE DEI DOCUMENTI: L'ELENCO DEI DOMINI
//
//  La funzione `prendi-documento` gira su Supabase e scarica i documenti dai
//  siti delle compagnie, perché la rete di chi li legge è chiusa e quella di
//  Supabase no.
//
//  Una funzione così, scritta male, è un PROXY APERTO sull'infrastruttura
//  dell'agenzia: chi riuscisse a chiamarla potrebbe raggiungere qualsiasi
//  indirizzo — una rete interna, un servizio di terzi — e nei log di quel
//  servizio comparirebbe l'agenzia, non lui.
//
//  Il vincolo che lo impedisce è un elenco di domini, e un elenco di domini
//  controllato male non vale niente: «sara.it.male.com» finisce per «sara.it»
//  se si guarda la fine della stringa invece dell'host intero, e un 302 verso
//  un altro host è esattamente il modo in cui un elenco si aggira.
//
//  Qui si prende il codice VERO della funzione e si esegue il suo controllo.
//  Non si può provare lo scaricamento — serve la rete che non c'è — ma la
//  parte che decide CHE COSA si può scaricare sì, e è quella che conta.
//
//      node server/verifica/prendi-documento.test.mjs
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const SRC = fs.readFileSync(path.join(RADICE, 'supabase', 'functions', 'prendi-documento', 'index.ts'), 'utf8');
const CATALOGO = JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe', 'dati', 'note-informative.json'), 'utf8'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

/* Si estrae il controllo dal sorgente vero, invece di riscriverlo qui: una
   copia della regola proverebbe la copia. */
function estrai() {
  const mD = SRC.match(/const DOMINI = \[([\s\S]*?)\]/);
  const mF = SRC.match(/function dentroElenco\(u: URL\): boolean \{([\s\S]*?)\n\}/);
  deve(mD && mF, 'non trovo l\'elenco dei domini o il controllo nel sorgente della funzione');
  /* I COMMENTI SI TOLGONO PRIMA DI TAGLIARE SULLE VIRGOLE. In questa casa i
     commenti stanno dappertutto, anche dentro un elenco, e un commento
     contiene virgole: tagliando prima, un dominio si attacca alla coda del
     commento che lo precede e sparisce dall'elenco letto. È successo
     aggiungendo HDI, e la prova è andata rossa invece di perdere un dominio
     in silenzio — ma meglio che non succeda. */
  const domini = mD[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    .split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  /* Il corpo è TypeScript solo nella firma: dentro è JavaScript. Si toglie
     l'annotazione e si esegue quello che c'è scritto davvero. */
  const corpo = mF[1].replace(/:\s*boolean/g, '');
  const fn = new Function('DOMINI', 'u', corpo);
  return { domini, dentro: (indirizzo) => { try { return !!fn(domini, new URL(indirizzo)); } catch (e) { return false; } } };
}

const { domini, dentro } = estrai();

prova('l\'elenco dei domini non è vuoto, e combacia col catalogo', () => {
  deve(domini.length > 0, 'elenco vuoto: la funzione non scaricherebbe da nessuna parte');
  const delCatalogo = CATALOGO._domini_da_cui_si_prende || [];
  deve(delCatalogo.length > 0, 'il catalogo non dichiara i suoi domini');
  /* Due elenchi della stessa cosa si separano: se un domani il catalogo
     nomina un dominio che la funzione non ha, la raccolta si fermerebbe su
     quella compagnia senza che nessuno capisca perché. */
  const mancanti = delCatalogo.filter((d) => domini.indexOf(d) < 0);
  deve(!mancanti.length, 'il catalogo usa domini che la funzione non accetta: ' + mancanti.join(', '));
  const inPiu = domini.filter((d) => delCatalogo.indexOf(d) < 0);
  deve(!inPiu.length, 'la funzione accetta domini che il catalogo non usa: ' + inPiu.join(', '));
});

prova('ogni URL del catalogo passa il controllo', () => {
  const tutti = [];
  (CATALOGO.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => tutti.push([c.compagnia, d.url])));
  deve(tutti.length >= 20, 'il catalogo ha solo ' + tutti.length + ' documenti: la prova non misura niente');
  tutti.forEach(([chi, u]) => {
    deve(/^https:\/\//.test(u), chi + ': l\'indirizzo non è https — ' + u);
    deve(dentro(u), chi + ': il suo indirizzo NON passa il controllo, quindi non si potrebbe scaricare — ' + u);
  });
});

prova('NIENTE HTTP IN CHIARO', () => {
  /* Un documento preso in chiaro può essere stato cambiato da chiunque stia
     in mezzo, e quello che ne esce finisce su un confronto mostrato a un
     cliente. */
  deve(!dentro('http://www.sara.it/x.pdf'), 'accetta http in chiaro');
  deve(!dentro('ftp://www.sara.it/x.pdf'), 'accetta ftp');
  deve(!dentro('file:///etc/passwd'), 'accetta un indirizzo di file locale');
});

prova('UN DOMINIO CHE SI TRAVESTE NON PASSA', () => {
  /* Il modo classico di aggirare un elenco scritto come «finisce con». */
  ['https://www.sara.it.male.com/x.pdf',
   'https://cdn.groupama.it.male.com/x.pdf',
   'https://malewww.sara.it/x.pdf',
   'https://www.sara.it.evil/x.pdf'].forEach((u) => {
    deve(!dentro(u), 'PASSA un dominio travestito: ' + u);
  });
});

prova('e nemmeno un sottodominio che nessuno ha autorizzato', () => {
  /* `dallbogg.it` è nell'elenco; `qualcosa.dallbogg.it` no, e va bene così:
     il giorno che serve, si aggiunge a mano e si sa che è stato aggiunto. */
  deve(dentro('https://dallbogg.it/wp-content/x.pdf'), 'non accetta il dominio che è nell\'elenco');
  deve(!dentro('https://interno.dallbogg.it/x.pdf'), 'accetta un sottodominio non elencato');
});

prova('LA RETE INTERNA E I SERVIZI DI METADATI NON SI RAGGIUNGONO', () => {
  /* Il danno peggiore di un proxy aperto: farsi leggere le credenziali della
     macchina su cui gira. */
  ['https://localhost/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data/',
   'https://metadata.google.internal/x', 'https://10.0.0.1/x', 'https://192.168.1.1/x',
   'https://[::1]/x'].forEach((u) => {
    deve(!dentro(u), 'RAGGIUNGE un indirizzo interno: ' + u);
  });
});

prova('i reindirizzamenti si seguono a mano, e ogni salto si controlla', () => {
  /* Lasciando seguire i reindirizzamenti alla libreria, l'elenco dei domini
     vale solo per il primo indirizzo: un 302 porta dove vuole. */
  deve(/redirect:\s*'manual'/.test(SRC), 'la funzione lascia seguire i reindirizzamenti da sola');
  deve(/if \(!dentroElenco\(u\)\) throw/.test(SRC), 'il controllo non è dentro il ciclo dei salti');
  const ciclo = SRC.match(/for \(let n = 0; n <= SALTI; n\+\+\) \{([\s\S]*?)\n  \}/);
  deve(ciclo, 'non trovo il ciclo dei reindirizzamenti');
  deve(/dentroElenco/.test(ciclo[1]), 'dentro il ciclo non si ricontrolla il dominio: un 302 scappa');
  deve(/troppi reindirizzamenti/.test(SRC), 'i salti non hanno un tetto: un anello girerebbe per sempre');
});

prova('CHI CHIAMA SI PRESENTA, E CON UN RECAPITO', () => {
  /* Perché c'è questa regola: all'8/10/2026 sedici documenti su 283 tornavano
     403 e cinque 400. Sono documenti che la compagnia pubblica per obbligo:
     era il filtro anti-robot del sito a rifiutare chi non si presentava.

     E perché non basta «c'è un User-Agent»: la tentazione è copiare la riga
     di Chrome e sparire nel mucchio. Qui si pretende il RECAPITO — un
     indirizzo dentro la stringa — perché è quello che permette a una
     compagnia di capire chi sta scaricando e, se vuole, di tenerci fuori.
     Travestirsi da browser vorrebbe dire togliergliela, quella possibilità. */
  const m = SRC.match(/const CHI_CHIAMA = '([^']+)'/);
  deve(m, 'la funzione non dichiara chi sta chiamando');
  const ua = m[1];
  deve(/withusassicurazioni/i.test(ua), 'chi chiama non si nomina: «' + ua + '»');
  deve(/\+https:\/\/\S+/.test(ua), 'chi chiama non lascia un recapito a cui rispondere: «' + ua + '»');
  /* E deve finire nella richiesta VERA, non in una costante che nessuno usa:
     una stringa dichiarata e mai mandata è una presentazione fatta a sé
     stessi. Si guarda l'oggetto che la `fetch` riceve davvero. */
  const quali = SRC.match(/const INTESTAZIONI_DI_CHI_CHIEDE = \{([\s\S]*?)\n\}/);
  deve(quali, 'non trovo le intestazioni della richiesta');
  deve(/'User-Agent':\s*CHI_CHIAMA/.test(quali[1]),
    'la presentazione non è fra le intestazioni della richiesta');
  const chiamata = SRC.match(/await fetch\(qui, \{([^}]*)\}/);
  deve(chiamata, 'non trovo la chiamata che scarica il documento');
  deve(/headers:\s*INTESTAZIONI_DI_CHI_CHIEDE/.test(chiamata[1]),
    'la richiesta non manda quelle intestazioni: ' + chiamata[1].trim());
});

prova('si controlla che sia un PDF guardando i byte, non l\'etichetta', () => {
  /* Un sito che risponde «200 OK» con una pagina di errore e il tipo
     sbagliato farebbe archiviare un HTML come documento di prodotto. */
  deve(/'%PDF-'/.test(SRC), 'non si guarda la firma del file');
  deve(/if \(dove < 0\)/.test(SRC), 'la firma si cerca ma non si usa per rifiutare');
});

prova('L\'INTESTAZIONE PDF SI CERCA NEL PRIMO KILOBYTE, NON AL PRIMO BYTE', () => {
  /* Due regole in una, e tirano in direzioni opposte: larga abbastanza per
     prendere un PDF con qualche byte davanti (due documenti Credem, 08/10/2026),
     strétta abbastanza per rifiutare una pagina HTML. Si esegue il controllo
     vero preso dal sorgente, su byte veri, invece di cercare parole. */
  const m = SRC.match(/const testa = new TextDecoder\('latin1'\)[\s\S]*?const dove = testa\.indexOf\('%PDF-'\)/);
  deve(m, 'non trovo la ricerca dell\'intestazione nel sorgente');
  const quanto = SRC.match(/byte\.slice\(0, (\d+)\)\)\n    const dove/);
  deve(quanto, 'non trovo quanti byte si guardano');
  const finestra = Number(quanto[1]);
  deve(finestra >= 5, 'la finestra è più corta dell\'intestazione stessa: ' + finestra);
  /* IL TETTO SERVE: cercare «%PDF-» in TUTTO il file prenderebbe una pagina
     HTML che per caso nomina un PDF, e un documento di 3 MB si deciderebbe
     guardandone 3 MB. */
  deve(finestra <= 4096, 'la finestra è troppo larga (' + finestra + '): '
    + 'cercando l\'intestazione lontano si prende per documento una pagina che la nomina');

  /* Il controllo, eseguito: tre casi veri. */
  const cerca = (byte) => {
    const testa = new TextDecoder('latin1').decode(byte.slice(0, finestra));
    return testa.indexOf('%PDF-');
  };
  const enc = (s) => new TextEncoder().encode(s);
  deve(cerca(enc('%PDF-1.7\n...')) === 0, 'un PDF normale non viene riconosciuto');
  deve(cerca(new Uint8Array([0xef, 0xbb, 0xbf, 0x20, 0x20, ...enc('%PDF-1.4\n')])) > 0,
    'un PDF con qualche byte davanti viene rifiutato: è il caso Credem');
  deve(cerca(enc('<!DOCTYPE html><html><head><title>Pagina non trovata</title>')) < 0,
    'una pagina HTML passa per documento');
  /* E il caso cattivo che il tetto deve fermare: un HTML che nomina un PDF
     oltre la finestra. */
  const bugiardo = enc('<!DOCTYPE html>' + ' '.repeat(finestra + 50) + '%PDF-1.4');
  deve(cerca(bugiardo) < 0, 'una pagina HTML che nomina un PDF più in là passa per documento');
});

prova('il tetto al peso del file è un numero vero, non una parola', () => {
  /* Cercare la parola «TETTO» nel sorgente non misura niente: la si può
     lasciare lì e metterla a infinito. Si prende il valore e si guarda. */
  const m = SRC.match(/const TETTO = ([^\n]+)/);
  deve(m, 'non c\'è nessun tetto al peso del file');
  let v;
  try { v = Function('return (' + m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim() + ')')(); }
  catch (e) { throw new Error('il tetto non è un numero calcolabile: ' + m[1]); }
  deve(Number.isFinite(v), 'il tetto non è finito: ' + v + ' — un file grande quanto si vuole entra');
  deve(v > 1024 * 1024, 'il tetto è troppo basso (' + v + '): un set informativo vero pesa un paio di MB');
  deve(v <= 100 * 1024 * 1024, 'il tetto è troppo alto: ' + v);
  /* E va usato in tutt'e due i posti: l'intestazione può mentire, quindi si
     ricontrolla sui byte arrivati. */
  deve((SRC.match(/> TETTO/g) || []).length >= 2,
    'il tetto si controlla in un posto solo: l\'intestazione «content-length» può mentire');
});

prova('LA FUNZIONE NON SALVA NIENTE: torna il file e basta', () => {
  /* La prima versione metteva il PDF in un archivio su Supabase, e per farlo
     serviva creare un secchio, decidere chi può leggerlo e tenerlo pulito:
     tre cose da approvare e da curare per un file che a chi lo chiede serve
     subito e una volta sola. L'impronta la calcola già il browser, e il
     documento che vale la pena tenere è quello che una persona ha confermato.

     Meno cose da approvare non è una comodità: è meno superficie su cui
     sbagliare, su un'infrastruttura che tiene i dati dei clienti. */
  deve(!/storage\s*\./.test(SRC), 'la funzione scrive in un archivio di file');
  deve(!/createClient|SERVICE_ROLE/.test(SRC),
    'la funzione usa una chiave di servizio: non le serve, e una chiave in meno in giro è una chiave in meno da perdere');
  deve(/pdf_base64/.test(SRC), 'la funzione non restituisce il file: allora chi l\'ha chiesto non ce l\'ha');
  deve(/Non tocca nessuna tabella/.test(SRC), 'non dichiara di non toccare niente');
});

prova('la funzione non archivia e non decide', () => {
  /* Prende il file e dice che cosa ha preso. Se una garanzia è presente o
     assente lo decide la schermata, con una persona davanti. */
  deve(!/iam_conf_prodotti|iam_conf_garanzie|iam_conf_documenti/.test(SRC),
    'la funzione scrive nell\'archivio: quello lo fa la schermata, dopo che una persona ha confermato');
  deve(!/'assente'/.test(SRC), 'la funzione parla di stati delle garanzie: non è il suo mestiere');
});

prova('un indirizzo scaduto si dichiara per quello che è', () => {
  /* Le compagnie spostano i PDF a ogni edizione: un 404 non è un guasto, è
     il mestiere, e va detto con parole che dicono cosa fare.
     La prova guarda il CAMPO che la funzione restituisce, non la parola nel
     sorgente: «scaduto» compare anche nei commenti, e cercarla là voleva dire
     non accorgersi che il campo era stato tolto. */
  deve(/scaduto:\s*r\.status === 404/.test(SRC),
    'un 404 non si distingue da un errore qualunque: manca il campo «scaduto» nella risposta');
  /* E la spiegazione sta nel messaggio che legge una persona, non in un
     commento che legge solo chi apre il file. */
  /* L'ancora si ferma su `status: 200` e non sull'intera parentesi: quella
     riga cresce ogni volta che si aggiunge qualcosa alla risposta — è già
     successo con le intestazioni CORS — e un'ancora che copia la
     formattazione si rompe per un motivo che non c'entra niente. */
  const msg = SRC.match(/motivo: 'Il sito della compagnia ha risposto[\s\S]*?status: 200/);
  deve(msg, 'non trovo il messaggio che si dà quando il sito risponde male');
  deve(/edizione nuova/.test(msg[0]),
    'il messaggio non spiega che a ogni edizione nuova l\'indirizzo cambia: ' + msg[0].slice(0, 120));
});

prova('UN DOCUMENTO SI DICHIARA «verificato» SOLO SE PORTA LA PROVA', () => {
  /* Questa prova prima diceva un'altra cosa: che nessuna voce poteva
     dichiararsi presa, perché dall'ambiente degli agenti non si riusciva
     nemmeno a chiedere se un indirizzo rispondesse. Poi la funzione su
     Supabase è stata installata, la raccolta è girata, e 32 documenti su 43
     sono stati presi per davvero: la vecchia regola non era sbagliata, era
     superata dai fatti.

     La regola nuova è più forte, non più debole: «verificato» si può scrivere
     soltanto portando la prova — l'impronta del file e il suo peso. Un catalogo
     che si dichiarasse verificato senza impronte sarebbe un catalogo che dice
     di aver visto quello che non ha visto. */
  const tutti = [];
  (CATALOGO.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => tutti.push([c.compagnia, d])));
  deve(tutti.length >= 20, 'il catalogo ha solo ' + tutti.length + ' documenti');

  const ammessi = ['trovato', 'verificato', 'scaduto', 'non_pdf', 'dominio_non_ammesso', 'non_preso'];
  tutti.forEach(([chi, d]) => {
    deve(ammessi.indexOf(d.stato) >= 0, chi + ': stato «' + d.stato + '» che il catalogo non dichiara');
    if (d.stato === 'verificato') {
      deve(typeof d.impronta === 'string' && d.impronta.length === 64,
        chi + ' · ' + d.prodotto + ': si dichiara verificato senza l\'impronta del file — ' + d.impronta);
      deve(typeof d.byte === 'number' && d.byte > 1000,
        chi + ' · ' + d.prodotto + ': si dichiara verificato senza il peso del file — ' + d.byte);
      deve(d.provato_il, chi + ' · ' + d.prodotto + ': si dichiara verificato senza dire quando');
    } else {
      /* E al contrario: un documento che NON è stato preso non può portarsi
         dietro l'impronta di una volta in cui era andata bene, perché quella
         impronta direbbe che il documento c'è quando non c'è più. */
      deve(d.impronta == null, chi + ' · ' + d.prodotto + ': è «' + d.stato +
        '» e si tiene l\'impronta di prima — direbbe che il documento c\'è quando non c\'è più');
    }
  });

  /* E ogni stato che compare va spiegato nel vocabolario del catalogo. */
  const usati = [...new Set(tutti.map(([, d]) => d.stato))];
  usati.forEach((s) => deve(CATALOGO._stati && CATALOGO._stati[s],
    'lo stato «' + s + '» si usa ma il catalogo non dice che cosa vuol dire'));
});

prova('IL CATALOGO DICE CHE UNA VERIFICA INVECCHIA', () => {
  /* La prima versione di questo campo diceva «nessuno di questi URL è stato
     verificato», e dopo la raccolta era diventato FALSO: 32 lo erano. Un
     limite dichiarato male è peggio di un limite non dichiarato, perché chi
     legge si fida della frase e non dei fatti.

     Il limite vero adesso è un altro, e vale per sempre: «verificato» vuol
     dire «quel giorno ha risposto», non «risponde». Le compagnie spostano i
     PDF a ogni edizione, e lo si è visto sul campo — i quattro indirizzi
     DALLBOGG, trovati da un motore di ricerca, oggi consegnano una pagina
     HTML al posto del documento. */
  deve(CATALOGO._IL_LIMITE_DA_SAPERE, 'il catalogo non dichiara il suo limite');
  const L = CATALOGO._IL_LIMITE_DA_SAPERE;
  deve(/invecchia|quel giorno ha risposto/i.test(L),
    'non dice che una verifica invecchia: ' + L.slice(0, 120));
  /* E non deve dire una cosa che i fatti smentiscono. */
  const verificati = [];
  (CATALOGO.compagnie || []).forEach((c) => (c.documenti || []).forEach((d) => {
    if (d.stato === 'verificato') verificati.push(d);
  }));
  if (verificati.length) {
    deve(!/NESSUNO DI QUESTI URL È STATO VERIFICATO/.test(L),
      'il catalogo dichiara che nessun indirizzo è verificato, e invece ne ha ' + verificati.length);
  }
  deve(CATALOGO._verificato_il, 'non dice QUANDO è stato verificato: una verifica senza data non invecchia mai');
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nPRENDI DOCUMENTO — l\'elenco dei domini');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
console.log(`\nPRENDI DOCUMENTO: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
