// ═══════════════════════════════════════════════════════════════════════════════
//  I CODICI COMPAGNIA SULLA SCHEDA DEL COLLABORATORE (19/09/2026)
//
//  La strada inversa: dal codice alla persona si passa da QUOTO (l'anteprima
//  del flusso e il pannello dei Titoli); dalla scheda in IAM si guarda
//  dall'altra parte — «questa persona su quali codici lavora?».
//
//  Quello che si sorveglia qui e' che la strada inversa NON diventi una
//  seconda regola: la riga di decisione la costruisce lo stesso motore che
//  carica QUOTO, e due modi di scrivere la stessa riga sono due modi di
//  decidere chi viene pagato.
//
//  Queste prove leggono il SORGENTE (IAM non si apre in un browser nel banco).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
/* La stanza chiusa del banco: serve a far GIRARE la riga nei due ruoli, non
   solo a leggerla nel sorgente (§1 — una prova che legge una stringa non dice
   se quel codice fa quello che la stringa promette). */
import { stanza } from './banco.mjs';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const IAM = path.join(QUI, '..', 'index.html');
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(IAM, 'utf8');
const Q = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const A = require(path.join(RADICE, 'tariffe', 'motore', 'assegnazione.js'));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('il motore e\' caricato, ed e\' lo STESSO file che carica QUOTO', () => {
  /* CLAUDE.md §1: il codice che arriva e non lo chiama nessuno. E §10: due
     copie dello stesso motore sono due regole della stessa agenzia. */
  const tag = H.match(/<script src="([^"]*assegnazione\.js[^"]*)"/);
  deve(tag, 'IAM non carica tariffe/motore/assegnazione.js');
  deve(tag[1].startsWith('/nuovo-preventivo/tariffe/motore/assegnazione.js'),
    'l\'indirizzo non e\' quello della stessa origine: ' + tag[1]);
  deve(/<script src="[^"]*tariffe\/motore\/assegnazione\.js/.test(Q),
    'QUOTO non carica lo stesso motore: allora non e\' condiviso');
  /* E non ne esiste una copia dentro iam/. */
  deve(!fs.existsSync(path.join(QUI, '..', 'tariffe', 'motore', 'assegnazione.js')),
    'c\'e\' una copia del motore dentro iam/: due vocabolari, e quello sbagliato e\' quello che nessuno guarda');
  return tag[1];
});

prova('la riga di decisione la costruisce il MOTORE, non IAM', () => {
  const blocco = ritaglia('async function ccpScrivi');
  deve(/Assegnazione\.rigaDecisione\(/.test(blocco),
    'IAM si costruisce la riga da se\': tre schermate, tre regole su chi viene pagato');
  /* E non se la ricostruisce a mano da nessuna parte: cercare la CHIAMATA e
     non la parola, perche' un commento che nomina `deciso:` farebbe scattare
     una prova sul testo (la trappola gia' scritta in CLAUDE.md §10 e §12). */
  deve(!/^\s*deciso:\s*(true|!)/m.test(blocco),
    'IAM scrive `deciso` da se\' invece di lasciarlo al motore');
  return 'una riga sola, costruita in un posto solo';
});

prova('si firma con l\'utente vero, non con niente', () => {
  const blocco = ritaglia('async function ccpScrivi');
  deve(/ME\?\.id/.test(blocco), 'la decisione non porta chi l\'ha presa: ' + blocco.slice(0, 200));
  return 'ME.id';
});

prova('decide l\'admin, non lo staff: qui si decide a chi vanno dei soldi', () => {
  deve(/function ccpPuoDecidere\(\)\s*\{\s*return PROFILO\?\.ruolo === 'admin'; \}/.test(H),
    'il cancello non e\' l\'admin');
  /* E il cancello si usa davvero: una funzione di controllo che non chiama
     nessuno e' il guasto numero uno di questo repository. */
  const usi = (H.match(/ccpPuoDecidere\(\)/g) || []).length;
  deve(usi >= 2, 'il cancello e\' dichiarato e non usato: ' + usi + ' occorrenze');
  return usi + ' usi del cancello';
});

prova('togliere un codice toglie la DECISIONE, non le evidenze', () => {
  const blocco = ritaglia('async function ccpTogli');
  deve(/ccpScrivi\([^)]*,\s*''\)/.test(blocco),
    'togliere non passa dal valore vuoto: ' + blocco.slice(0, 300));
  /* Il motore, con valore vuoto, deve lasciare le evidenze e spegnere solo la
     decisione: e' quello che rende la riga riconoscibile la volta dopo. */
  const r = A.rigaDecisione('PRIMA|U100', '', { nome_flusso: 'Chi Sa', rui_flusso: 'E000111111' }, 'u1');
  deve(r.deciso === false && r.collaboratore_id === null, 'la decisione non si spegne: ' + JSON.stringify(r));
  deve(r.nome_flusso === 'Chi Sa' && r.rui_flusso === 'E000111111',
    'togliere l\'abbinamento cancella le evidenze: ' + JSON.stringify(r));
  return 'deciso: false, evidenze intatte';
});

prova('il contenitore c\'e\', e qualcuno lo riempie', () => {
  /* Lo stesso difetto del riquadro della storia: un contenitore che nessuno
     riempie e' una sezione vuota che sembra un guasto. */
  deve(/id="mc-codici"/.test(H), 'manca il contenitore dei codici nella scheda');
  deve(/ccpInstalla\(TEAM_PERSONA\)/.test(H),
    'nessuno riempie il contenitore quando si apre la scheda');
  return '#mc-codici + ccpInstalla';
});

prova('i codici stanno sulla PERSONA, non sulla scheda economica', () => {
  /* Una persona puo' cambiare scheda (`iam_team`) e i suoi codici restano
     suoi: agganciarli alla scheda vorrebbe dire perderli al primo cambio. */
  deve(/ccpInstalla\(TEAM_PERSONA\)/.test(H) && !/ccpInstalla\(TEAM_ID\)/.test(H),
    'i codici sono agganciati alla scheda economica invece che alla persona');
  const blocco = ritaglia('function ccpRender');
  deve(/r\.collaboratore_id === CCP_PERSONA/.test(blocco),
    'il filtro non e\' sulla persona: ' + blocco.slice(0, 200));
  return 'quote_collaboratori.id, non iam_team.id';
});

prova('«non si e\' potuto leggere» non diventa «non ce ne sono»', () => {
  const blocco = ritaglia('async function ccpInstalla');
  deve(/non vuol dire che non ce ne siano/.test(blocco),
    'l\'errore di lettura si legge come un elenco vuoto: e\' il difetto del contatore documentale (§12)');
  return 'l\'errore lo dice in faccia';
});

prova('il RUI discorde si vede, e non e\' un rosso', () => {
  /* Se il RUI della scheda e quello che manda la compagnia non coincidono, o
     l'abbinamento e' sbagliato o uno dei due numeri e' vecchio: in tutti e due
     i casi e' meglio saperlo prima di pagare. Ma non e' un guasto, e un rosso
     che non e' un guasto insegna a ignorare i rossi. */
  /* La riga si e' spostata in `ccpRigaSua` il 21/09/2026, quando ha smesso di
     essere due righe e ne e' diventata una con stato, periodo e nota: la
     regola e' la stessa, il posto no. Si e' aggiornata la regola, non il
     numero (§15, §16, §33, §35). */
  const blocco = ritaglia('function ccpRigaSua');
  deve(/const discorde = ruiScheda && ruiFlusso && ruiScheda !== ruiFlusso;/.test(blocco),
    'il confronto fra i due RUI non c\'e\'');
  deve(/ccp-avviso/.test(blocco), 'l\'avviso non compare nella riga');
  deve(/\.ccp-avviso\{[^}]*--amb-/.test(H), 'l\'avviso non e\' giallo: ' + (H.match(/\.ccp-avviso\{[^}]*/) || [''])[0]);
  /* E i due numeri si confrontano normalizzati, come fa il motore: «E000123»
     e «E 000.123» sono lo stesso intermediario. */
  deve(/replace\(\/\[\\s\.\\-\\\/\]\/g, ''\)\.toUpperCase\(\)/.test(blocco),
    'i due RUI si confrontano come arrivano, e uno spazio li fa risultare diversi');
  return 'avviso giallo, confronto normalizzato';
});

prova('la scheda propone, e la proposta la calcola il MOTORE', () => {
  /* La stessa cucitura dell'altro lato: due schermate che leggono le stesse
     evidenze devono proporre la stessa persona. */
  const blocco = ritaglia('function ccpRender');
  deve(/Assegnazione\.suoi\(/.test(blocco),
    'la scheda non chiede al motore quali codici sembrano suoi: se la regola la scrive di qua, sono due regole');
  /* E il motore fa quello che dice, sul serio: qui si esegue. */
  const righe = [{ compagnia: 'PRIMA', codice: 'U100', rui_flusso: 'E 000.111111' }];
  const persone = [{ id: 'p1', rui_numero: 'E000111111' }, { id: 'p2', rui_numero: 'E000222222' }];
  const s = A.suoi(righe, persone, 'p1');
  deve(s.length === 1 && s[0].motivo === 'rui', 'il motore non propone: ' + JSON.stringify(s));
  return 'la scheda chiede, il motore risponde';
});

prova('si passano TUTTE le persone, non solo quella aperta', () => {
  /* Il difetto che si fa senza accorgersene. La regola «aggancia solo se e'
     una» si puo' applicare soltanto guardando gli altri: con l'elenco ridotto
     alla persona aperta, due colleghi con lo stesso RUI diventerebbero una
     proposta sicura — e sarebbe sicura di niente. */
  const carica = ritaglia('async function ccpInstalla');
  deve(/from\('quote_collaboratori'\)[\s\S]{0,80}rui_numero/.test(carica),
    'la scheda non carica le persone con il loro RUI: ' + carica.slice(0, 400));
  deve(/CCP_PERSONE = /.test(carica), 'l\'elenco delle persone non viene riempito');
  /* E l'elenco arriva al motore INTERO: un `.filter` per strada e la regola
     non ha piu' nessuno con cui confrontare. */
  const disegna = ritaglia('function ccpRender');
  deve(/Assegnazione\.suoi\(CCP_RIGHE,\s*CCP_PERSONE,\s*CCP_PERSONA\)/.test(disegna),
    'le persone arrivano al motore filtrate: ' + (disegna.match(/Assegnazione\.suoi\([^;]*/) || ['—'])[0]);
  /* E il motore lo dimostra: con tutte, niente proposta; con una sola, sì. */
  const righe = [{ compagnia: 'PRIMA', codice: 'U400', rui_flusso: 'E000999999' }];
  const due = [{ id: 'p3', rui_numero: 'E000999999' }, { id: 'p4', rui_numero: 'E000999999' }];
  deve(A.suoi(righe, due, 'p3').length === 0, 'due persone con lo stesso RUI producono una proposta');
  deve(A.suoi(righe, [due[0]], 'p3').length === 1, 'il banco non riproduce il difetto');
  return 'con tutte nessuna proposta, con una sola si — per questo si passano tutte';
});

prova('i suggeriti stanno in cima, e restano suggerimenti', () => {
  const blocco = ritaglia('function ccpRender');
  deve(/const ordinati = liberi\.slice\(\)\.sort\(/.test(blocco),
    'i codici suggeriti non vanno in cima alla tendina');
  /* La tendina parte dal vuoto: nessun codice si abbina da solo aprendo una
     scheda. Il primo `<option>` e' quello che il browser sceglie. */
  deve(/<option value="">— codici ancora da abbinare —<\/option>/.test(blocco),
    'la tendina non parte dal vuoto: un codice si abbinerebbe da solo');
  deve(/Confermali tu/.test(blocco), 'la scheda non dice che l\'abbinamento lo conferma una persona');
  /* E l'abbinamento resta un gesto: nessuna scrittura parte dal disegno. */
  deve(!/ccpScrivi\(/.test(blocco), 'il disegno della scheda scrive nel database');
  return 'in cima, con la spunta, e nessuna scrittura';
});

prova('l\'abbinamento e il distacco lasciano traccia a registro', () => {
  const agg = ritaglia('async function ccpAggiungi');
  const tog = ritaglia('async function ccpTogli');
  deve(/logMovimento\(/.test(agg), 'abbinare un codice non lascia traccia');
  deve(/logMovimento\(/.test(tog), 'togliere un codice non lascia traccia');
  /* Con l'identificativo della persona: cosi' il movimento si ritrova dalla
     sua scheda, che e' dove lo si cerca. */
  deve(/logMovimento\([^;]*CCP_PERSONA\)/.test(agg), 'il movimento non punta alla persona: ' + agg.match(/logMovimento\([^;]*/));
  return 'due movimenti, tutti e due con il puntatore';
});

/* ══ IL PERIODO E LA SOSPENSIONE (21/09/2026, brief Anagrafiche · punto 3) ══ */

prova('LA RIGA DICE SE QUEL CODICE STA ANCORA ASSEGNANDO', () => {
  /* Un abbinamento sospeso, o scaduto, continua a comparire — la persona ce
     l'ha avuto, ed e' storia — ma smette di produrre attribuzioni. Se la riga
     si leggesse uguale nei due casi, si continuerebbe a credere che le polizze
     nuove siano sue, e nessuno andrebbe a guardare. */
  const b = ritaglia('function ccpRigaSua');
  deve(/const sospeso = r\.attivo === false;/.test(b), 'la riga non guarda l\'interruttore');
  /* `attivo === false` e non `!r.attivo`: una colonna mai riempita non vuol
     dire «spento» — e' la stessa distinzione delle anagrafiche che nascono a
     «no» (§42). */
  deve(!/const sospeso = !r\.attivo/.test(b), 'un vuoto si legge come «sospeso»');
  deve(/ccp-off/.test(b) && /ccp-fine/.test(b) && /ccp-on/.test(b),
    'i tre stati non si distinguono nella pastiglia');
  deve(/nessun periodo dichiarato: vale sempre/.test(b),
    'una riga senza periodo non dice che vale sempre: un vuoto si legge come un limite');
  return 'assegna / sospeso / periodo finito';
});

prova('SOSPENDERE E TOGLIERE SONO DUE COSE DIVERSE, e si vede prima di farle', () => {
  /* Sospeso = «non produce piu', ma e' stato suo», e la persona resta scritta.
     Tolto = «non e' suo», e il codice torna fra quelli da abbinare. Un bottone
     solo costringerebbe a scegliere alla cieca. */
  const sos = ritaglia('async function ccpSospendi');
  const tog = ritaglia('async function ccpTogli');
  deve(/ccpScrivi\([^)]*\{ attivo: !sospendi \}\)/.test(sos),
    'sospendere non passa dall\'interruttore: ' + sos.slice(0, 300));
  /* E sospendere NON tocca la persona: si ripassa quella che c'e'. */
  deve(/ccpScrivi\(compagnia, codice, r\.collaboratore_id,/.test(sos),
    'sospendere cambia anche di chi e\' il codice');
  /* Senza la prima lettera: nel testo e' «NON si assegnano piu'», e una regex
     sensibile alle maiuscole dichiarerebbe rotto un codice giusto — la stessa
     trappola gia' costata dieci minuti in §23 e §43. */
  deve(/si assegnano pi[uù]/.test(sos), 'non dice che cosa smette di succedere');
  deve(/restano sue/.test(sos) && /restano sue/.test(tog),
    'non dice che le rate gia\' assegnate non tornano indietro');
  /* E i due gesti si distinguono anche a registro: «sospeso» e «tolto» sono
     due fatti diversi, e mesi dopo si chiede quale dei due e' successo. */
  deve(/logMovimento\(/.test(sos) && /Codice compagnia sospeso/.test(sos) && /riattivato/.test(sos),
    'la sospensione non lascia una traccia sua');
  return 'due bottoni, due conferme, due movimenti';
});

prova('TOGLIERE AZZERA IL PERIODO: il prossimo non nasce gia\' sospeso', () => {
  /* Il difetto che si fa senza accorgersene: un codice si toglie a Tizio
     perche' la compagnia l'ha dato a Caio. Se la sospensione si portasse
     avanti, il codice rinascerebbe sospeso addosso a Caio e le sue polizze non
     si assegnerebbero mai — senza un errore e senza che nessuno capisca
     perche'. Qui si fa girare il motore davvero. */
  const r = A.rigaDecisione('PRIMA|U100', '', {
    attivo: false, data_inizio: '2025-01-01', data_fine: '2026-06-30',
    note: 'subentrato', nome_flusso: 'Chi Sa'
  }, 'u1');
  deve(r.attivo === true, 'il codice tolto resta sospeso');
  deve(r.data_inizio === null && r.data_fine === null, 'il periodo del padrone di prima resta addosso al prossimo');
  deve(r.note === 'subentrato' && r.nome_flusso === 'Chi Sa', 'si perde quello che serve a riconoscerlo');
  /* E la conferma lo dice, invece di farlo di nascosto. */
  deve(/periodo e sospensione si azzerano/.test(ritaglia('async function ccpTogli')),
    'la conferma non dice che periodo e sospensione si azzerano');
  return 'pulito per il prossimo, con la nota di chi c\'era prima';
});

prova('le date vuote restano VUOTE, e non diventano oggi', () => {
  /* Riempirle con una data di comodo scriverebbe una decisione che nessuno ha
     preso (§8.1), e un abbinamento che valeva sempre comincerebbe a valere da
     una data qualunque. */
  const b = ritaglia('async function ccpSalvaPeriodo');
  deve(/value \|\| null/.test(b), 'una data vuota non diventa null: ' + b.slice(0, 300));
  deve(!/new Date\(\)/.test(b), 'la schermata mette una data al posto del vuoto');
  /* Un periodo che finisce prima di cominciare non si salva. */
  deve(/al < dal/.test(b), 'si puo\' salvare un periodo che finisce prima di cominciare');
  /* E una correzione che non cambia niente non scrive niente (§16). */
  deve(/CCP_MOD = null; ccpRender\(\); return;/.test(b),
    'un salvataggio che non cambia niente scrive lo stesso');
  return 'vuoto = nessun periodo dichiarato';
});

prova('la data si confronta con la POLIZZA, non con oggi — e la schermata lo dice', () => {
  /* Con «oggi» un abbinamento chiuso a giugno toglierebbe a quella persona
     anche le polizze di marzo, che sono sue. E' la regola del motore; qui si
     sorveglia che la schermata non la contraddica a parole, perche' «dal/al»
     da solo non fa capire con che cosa si confronta. */
  const b = ritaglia('function ccpRigaSua');
  deve(/l'effetto della polizza|l’effetto della polizza/.test(b),
    'la schermata non dice con che data si confronta il periodo');
  /* La data si scrive tagliando la stringa: una data ISO non ha un fuso, e
     farla passare da `new Date()` gliene da' uno — in Italia torna indietro di
     un giorno (§44). */
  const d = ritaglia('function ccpData');
  deve(/slice\(/.test(d) && !/new Date\(/.test(d), 'la data passa da new Date(): ' + d.slice(0, 200));
  return 'si confronta con l\'effetto, e si scrive senza fusi';
});

prova('DUE RUOLI: l\'admin decide, l\'operatore guarda e basta', () => {
  /* Richiesta del brief: provare con almeno due ruoli. Qui si fa girare la
     riga davvero, nei due casi — una prova che guarda solo che il cancello
     esista non dice se qualcuno lo chiama (§1), e una che guarda solo il
     ramo dell'admin non dice che cosa vede l'altro. */
  const riga = { compagnia: 'PRIMA', codice: 'U100', collaboratore_id: 'p1', deciso: true,
                 attivo: true, data_inizio: '2025-01-01', data_fine: '2026-06-30',
                 nome_flusso: 'NERI ANNA', rui_flusso: 'E000111111', note: 'subentrata' };
  const s = stanza(H, ['ccpRigaSua', 'ccpData'], {
    altro: { CCP_MOD: null, Assegnazione: A, document: { getElementById: () => ({ value: '' }) } }
  });
  if (s.mancanti.length) throw new Error('non trovo nel sorgente: ' + s.mancanti.join(', '));

  const admin = s.ctx.ccpRigaSua(riga, '', true);
  const operatore = s.ctx.ccpRigaSua(riga, '', false);

  /* L'admin ha i tre gesti; l'operatore nessuno. */
  ['ccpModifica(', 'ccpSospendi(', 'ccpTogli('].forEach(f => {
    deve(admin.includes(f), 'all\'admin manca ' + f);
    deve(!operatore.includes(f), 'l\'operatore puo\' chiamare ' + f + ': qui si decide a chi vanno dei soldi');
  });
  /* Ma vede TUTTO il resto: il codice, la persona, il periodo. Nascondere
     anche l'informazione vorrebbe dire che chi lavora non sa perche' una
     polizza non e' sua — e lo chiederebbe a voce, ogni volta. */
  ['U100', 'PRIMA', 'NERI ANNA', '30/06/2026', 'subentrata'].forEach(t => {
    deve(operatore.includes(t), 'l\'operatore non vede «' + t + '»');
  });
  /* E l'editor non si apre nemmeno se qualcuno forza CCP_MOD dalla console:
     il ramo e' dentro `puo`, non accanto. */
  s.ctx.CCP_MOD = 'PRIMA|U100';
  deve(!s.ctx.ccpRigaSua(riga, '', false).includes('ccp-dal'),
    'forzando la variabile di stato l\'operatore apre il modulo delle date');
  deve(s.ctx.ccpRigaSua(riga, '', true).includes('ccp-dal'), 'all\'admin non si apre il modulo delle date');
  return 'admin: 3 gesti · operatore: 0 gesti e tutte le informazioni';
});

prova('da telefono la riga si impila e i bottoni non escono', () => {
  /* La riga e' fatta di due colonne affiancate con tre bottoni in verticale:
     a 360 pixel, senza una regola, i bottoni escono dallo schermo e non si
     premono. Si sorveglia la regola, non la fotografia. */
  const m = H.match(/@media\(max-width:640px\)\{[^}]*\.ccp-r\{[^}]*\}[^{]*\.ccp-az\{[^}]*\}/);
  deve(m, 'manca la regola per il telefono sulla riga dei codici');
  deve(/flex-direction:column/.test(m[0]), 'la riga non si impila sul telefono');
  deve(/width:100%/.test(m[0]), 'i bottoni non si allargano sul telefono');
  /* E il modulo delle date va a capo invece di spingere fuori la riga. */
  deve(/\.ccp-mod\{[^}]*flex-wrap:wrap/.test(H), 'il modulo delle date non va a capo');
  return 'riga impilata, azioni a tutta larghezza, modulo a capo';
});

/* Ritaglia una funzione dal sorgente: dalla firma alla prima graffa che chiude
   a colonna zero. Serve a non far scattare una prova su codice che sta altrove
   — cercare in tutto il documento vorrebbe dire trovare qualunque cosa. */
function ritaglia(firma) {
  const i = H.indexOf(firma);
  if (i < 0) throw new Error('non trovo ' + firma);
  const fine = H.indexOf('\n}\n', i);
  return H.slice(i, fine < 0 ? i + 4000 : fine + 3);
}

console.log('\n══ I CODICI COMPAGNIA SULLA SCHEDA ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCODICI COMPAGNIA: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
