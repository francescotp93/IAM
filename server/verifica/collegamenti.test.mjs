// ═══════════════════════════════════════════════════════════════════════════════
//  LO STATO DEI COLLEGAMENTI — tariffe/motore/collegamenti.js
//  (Blocco 3 · punto 12-bis, 20/09/2026)
//
//  Le prove che, saltando, producono un monitor credibile e falso: un «da
//  quando» che riparte da capo a ogni giro, un cronometro che si azzera perché
//  un servizio ha smesso di dichiarare la sessione, un elenco di lavori da fare
//  che comprende dei forse.
//
//  Dati tutti inventati (regola di casa §8.3).
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const K = require('../../tariffe/motore/collegamenti.js');
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

const ORA = '2026-09-20T10:00:00.000Z';
const meno = (ms) => new Date(Date.parse(ORA) - ms).toISOString();
const MIN = 60000, ORE = 3600000, GIORNO = 86400000;

/* Le quattro forme in cui il motore di QUOTO descrive una fonte. */
const DENTRO = { id: 'a', nome: 'Alfa', raggiungibile: true, loggato: true };
const FUORI  = { id: 'b', nome: 'Beta', raggiungibile: true, loggato: false };
const SPENTO = { id: 'c', nome: 'Gamma', raggiungibile: false, loggato: null };
const BOH    = { id: 'd', nome: 'Delta', raggiungibile: true, loggato: null };

prova('quattro stati, non due: «non lo dice» non è «non è collegata»', () => {
  deve(K.stato(DENTRO) === 'dentro', 'una fonte dentro non risulta collegata');
  deve(K.stato(FUORI) === 'fuori', 'una fonte che dichiara di essere fuori non risulta da collegare');
  deve(K.stato(SPENTO) === 'spento', 'un servizio irraggiungibile non risulta spento');
  deve(K.stato(BOH) === 'boh', 'un servizio che non dichiara la sessione viene dato per scollegato');
  /* La differenza che conta: uno è un lavoro da fare, l'altro vuol dire che
     non lo sappiamo. Confonderli manda a cercare un guasto dalla parte
     sbagliata. */
  deve(K.stato(BOH) !== K.stato(FUORI), 'i due stati incerti sono stati confusi');
  return 'dentro, fuori, spento, non lo dice';
});

prova('lo stesso stato NON fa ripartire il «da quando»', () => {
  /* È la regola che rende utile tutta la tabella: riscrivere `dal` a ogni
     giro azzererebbe l'unica cosa che questa memoria serve a sapere, e ogni
     compagnia risulterebbe scollegata «da poco» per sempre. */
  const salvati = [{ fonte: 'b', stato: 'fuori', dal: meno(3 * GIORNO), visto_il: meno(MIN), cambi: 2 }];
  const r = K.confronta([FUORI], salvati, ORA).righe[0];
  deve(r.dal === meno(3 * GIORNO), 'il cronometro è ripartito: ' + r.dal);
  deve(r.da_quanto === 'da 3 giorni', 'la durata non si legge: ' + r.da_quanto);
  deve(r.cambiato === false && r.cambi === 2, 'un giro senza cambiamenti conta come un cambio');
  /* E non si riscrive: l'ultima occhiata è di un minuto fa. */
  deve(r.scrivi === false, 'si riscrive la riga anche quando non è cambiato niente');
  return 'da 3 giorni, e nessuna scrittura';
});

prova('un cambio di stato fa ripartire il cronometro, e si conta', () => {
  const salvati = [{ fonte: 'b', stato: 'dentro', dal: meno(3 * GIORNO), visto_il: meno(MIN), cambi: 2 }];
  const r = K.confronta([FUORI], salvati, ORA).righe[0];
  deve(r.cambiato === true, 'il cambio di stato non viene visto');
  deve(r.dal === ORA, 'il cronometro non è ripartito dal cambio');
  deve(r.cambi === 3, 'il cambio non viene contato: ' + r.cambi);
  deve(r.scrivi === true, 'un cambio di stato non viene scritto');
  return 'riparte, e diventa il terzo cambio';
});

prova('la PRIMA volta si dichiara: «da quando» è da quando si guarda', () => {
  /* Di notte non guarda nessuno. Una compagnia caduta alle due risulta caduta
     all'ora in cui qualcuno ha aperto la schermata, e dire «scollegata da
     un'ora» quando lo è da sette è un numero credibile e falso (§8.1). */
  const r = K.confronta([FUORI], [], ORA).righe[0];
  deve(r.nuovo === true, 'la prima osservazione non è marcata');
  deve(r.dal === ORA && r.cambi === 0, 'la prima osservazione inventa una storia');
  deve(r.cambiato === false, 'la prima osservazione viene contata come un cambio');
  deve(r.scrivi === true, 'la prima osservazione non viene scritta');
  return 'marcata, e senza storia inventata';
});

prova('si riscrive ogni tanto anche senza cambiamenti, e NON a ogni giro', () => {
  /* Senza questo freno una schermata aperta scriverebbe una riga per fonte
     ogni due minuti: migliaia di righe al giorno per non dire niente di più.
     Ma «l'ho guardato adesso» va aggiornato, altrimenti «è così da tre
     giorni» e «nessuno la guarda da tre giorni» si leggono uguali. */
  const fresco = [{ fonte: 'b', stato: 'fuori', dal: meno(GIORNO), visto_il: meno(2 * MIN), cambi: 0 }];
  const stanco = [{ fonte: 'b', stato: 'fuori', dal: meno(GIORNO), visto_il: meno(20 * MIN), cambi: 0 }];
  deve(K.confronta([FUORI], fresco, ORA).daScrivere.length === 0, 'si riscrive a ogni giro');
  deve(K.confronta([FUORI], stanco, ORA).daScrivere.length === 1, 'l’ultima occhiata non si aggiorna mai');
  /* E il `dal` non si tocca nemmeno quando si riscrive per l'eco. */
  deve(K.confronta([FUORI], stanco, ORA).righe[0].dal === meno(GIORNO), 'l’eco ha spostato il cronometro');
  return 'niente a 2 minuti, una riga a 20';
});

prova('la durata si legge in una unità sola', () => {
  deve(K.durata(meno(30000), ORA).testo === 'da poco', 'mezzo minuto non si legge');
  deve(K.durata(meno(20 * MIN), ORA).testo === 'da 20 minuti', 'i minuti non si leggono');
  deve(K.durata(meno(5 * ORE), ORA).testo === 'da 5 ore', 'le ore non si leggono');
  deve(K.durata(meno(1 * ORE), ORA).testo === 'da 1 ora', 'il singolare non c’è');
  deve(K.durata(meno(9 * GIORNO), ORA).testo === 'da 9 giorni', 'i giorni non si leggono');
  /* E senza data non si inventa uno zero: «da poco» su una data che non c'è
     direbbe che è appena successo. */
  deve(K.durata(null, ORA).testo === 'da quando non si sa', 'una data mancante diventa «da poco»');
  return 'minuti, ore, giorni, e il non so';
});

prova('il riepilogo NON somma «da collegare» con «non lo dice»', () => {
  /* Un numero di lavori da fare che comprende dei forse è un numero che non si
     può lavorare: si va a sistemare una compagnia che magari è a posto. */
  const e = K.confronta([DENTRO, FUORI, SPENTO, BOH], [], ORA);
  const r = K.riepilogo(e.righe);
  deve(r.totale === 4, 'il totale non è quattro');
  deve(r.dentro === 1 && r.fuori === 1 && r.spente === 1 && r.incerte === 1,
    'i quattro stati non si contano separati: ' + JSON.stringify(r));
  return '1+1+1+1, tenuti distinti';
});

prova('chi è fermo da più tempo viene prima, e chi è a posto per ultimo', () => {
  /* Chi apre questa schermata lo fa per le compagnie da sistemare. Una lista
     che mette per prime quelle già a posto fa scorrere per niente (§19). */
  const salvati = [
    { fonte: 'b', stato: 'fuori', dal: meno(5 * GIORNO), visto_il: meno(MIN), cambi: 1 },
    { fonte: 'd', stato: 'boh', dal: meno(2 * ORE), visto_il: meno(MIN), cambi: 1 }
  ];
  const r = K.confronta([DENTRO, BOH, FUORI, SPENTO], salvati, ORA).righe.map(x => x.fonte);
  deve(r[0] === 'c', 'un servizio spento non viene per primo: ' + r.join(','));
  deve(r[1] === 'b', 'la compagnia da collegare non viene per seconda: ' + r.join(','));
  deve(r[3] === 'a', 'quella a posto non va in fondo: ' + r.join(','));
  /* E il conteggio delle ferme da oltre un giorno prende solo quelle non
     collegate: una compagnia collegata da un mese non è un problema. */
  const ri = K.riepilogo(K.confronta([DENTRO, BOH, FUORI, SPENTO], salvati, ORA).righe);
  deve(ri.ferme_da_oltre_un_giorno === 1, 'le ferme da oltre un giorno non sono una: ' + ri.ferme_da_oltre_un_giorno);
  return 'spento, da collegare, incerta, collegata';
});

prova('IL «DA QUANDO» NON CHIEDE L\'ORA ALLA MACCHINA', () => {
  /* Difetto trovato il 21/09/2026, e si vedeva solo passando un giorno.
     `confronta` passa l'istante di riferimento come NUMERO di millisecondi;
     `quando()` lo dava in pasto a `Date.parse`, che prima lo trasforma in
     stringa — e «1758362400000» non è una data, è NaN. Quindi si prendeva il
     ripiego `Date.now()`: l'etichetta «da quanto» si calcolava sull'orologio
     della macchina invece che sull'istante chiesto.

     In produzione i due coincidono quasi sempre, quindi non si vedeva. Si è
     visto quando una prova scritta ieri, con un istante fisso, è diventata
     rossa oggi — cioè quando la distanza fra i due ha superato un giorno.
     È la stessa famiglia del difetto delle date di §44: una funzione che
     chiede l'ora al computer di chi guarda dà risposte diverse a due persone
     sullo stesso dato. */
  const iso = ORA, num = Date.parse(ORA);
  const a1 = K.durata(meno(2 * ORE), iso);
  const a2 = K.durata(meno(2 * ORE), num);
  deve(a1.testo === a2.testo && a1.ms === a2.ms,
    'con un numero risponde un\'altra cosa: ' + a1.testo + ' / ' + a2.testo);
  deve(a1.testo === 'da 2 ore', 'due ore non sono due ore: ' + a1.testo);
  /* E una riga appena osservata è ferma da ZERO, non da quanto è vecchio il
     campione: `dal` uguale all'istante di riferimento. */
  const r = K.confronta([SPENTO], [], ORA).righe[0];
  deve(r.da_quanto === 'da poco', 'una prima osservazione non è «da poco»: ' + r.da_quanto);
  deve(r.da_quanto_ms === 0, 'i millisecondi non sono zero: ' + r.da_quanto_ms);
  return 'numero e stringa dicono la stessa cosa';
});

prova('il conteggio delle ferme si fa sui MILLISECONDI, non sulla frase', () => {
  /* Il riepilogo contava le ferme da oltre un giorno cercando la parola
     «giorn» dentro l'etichetta. Un numero ricavato da una frase cambia il
     giorno in cui qualcuno riscrive la frase — e nessuno collega le due cose.
     Qui si controlla che il conto venga dal tempo, non dal testo. */
  const righe = [
    { stato: 'fuori',  da_quanto: 'da 5 giorni', da_quanto_ms: 5 * GIORNO },
    { stato: 'boh',    da_quanto: 'da 2 ore',    da_quanto_ms: 2 * ORE },
    { stato: 'dentro', da_quanto: 'da 9 giorni', da_quanto_ms: 9 * GIORNO },
    /* La riga cattiva: la frase non nomina i giorni, il tempo sì. */
    { stato: 'spento', da_quanto: 'da 30 ore',   da_quanto_ms: 30 * ORE }
  ];
  const r = K.riepilogo(righe);
  deve(r.ferme_da_oltre_un_giorno === 2,
    'le ferme da oltre un giorno non sono due: ' + r.ferme_da_oltre_un_giorno);
  /* Una collegata da un mese non è un problema, e resta fuori dal conto. */
  deve(r.dentro === 1, 'la collegata non si conta come collegata');
  return '2 su 4, e la collegata fuori';
});

prova('la tabella della memoria esiste, ed è una riga per fonte, non un registro', () => {
  const sql = readFileSync(join(RADICE, 'supabase/migrations/20260920_collegamenti_stato.sql'), 'utf8');
  /* Solo le righe di CODICE: i commenti di una migrazione spiegano anche
     quello che NON fa, e una prova che cerca quelle parole dichiara rotto un
     file corretto (§10, §12, §41). */
  const codice = sql.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
  deve(/fonte\s+text primary key/.test(codice), 'la chiave non è la fonte: sarebbe un registro, non uno stato');
  deve(/check \(stato in \('dentro', 'fuori', 'spento', 'boh'\)\)/.test(codice),
    'il vocabolario degli stati non è quello del motore');
  deve(/dal\s+timestamptz/.test(codice) && /visto_il\s+timestamptz/.test(codice),
    'mancano le due date, e senza la seconda «è così da tre giorni» e «nessuno la guarda da tre giorni» si leggono uguali');
  deve(/cst_select[\s\S]{0,120}iam_is_staff\(\)/.test(codice), 'la lettura non è dello staff');
  deve(/cst_write[\s\S]{0,160}iam_is_admin\(\)/.test(codice), 'la scrittura non è riservata all’amministrazione');
  /* Nessun seme: una riga scritta da una migrazione direbbe «collegata da tre
     giorni» senza che nessuno l'abbia mai vista. */
  deve(!/insert into iam_collegamenti_stato/i.test(codice), 'la migrazione semina degli stati');
  return 'una riga per fonte, due date, zero seed';
});

console.log('\n══ LO STATO DEI COLLEGAMENTI ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nCOLLEGAMENTI: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
