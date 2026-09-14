// ═══════════════════════════════════════════════════════════════════════════
//  ALLIANZ — quando il premio non c'è, dire QUALE dei tre guasti è stato
//
//  PERCHE' ESISTE
//    11/09/2026, riga 3 del registro esiti: Allianz lavora 59 secondi e
//    risponde «Premio non disponibile (calcolo non completato o veicolo non
//    quotabile)». Fine. Da quella frase non si decide niente: non si sa se la
//    targa e' rifiutata (e allora quel preventivo non si fa, punto), se il
//    calcolo non e' proprio partito (e allora i dati vanno guardati) o se e'
//    partito e non ha finito in tempo (e allora riprovare ha senso).
//
//    Tre guasti diversi, tre rimedi diversi, una frase sola. La sera della
//    revisione la diagnosi si e' fermata li': «serve una cattura». Una cattura
//    per sapere una cosa che il portale, molto probabilmente, aveva gia' detto
//    a schermo.
//
//  COSA SI PROVA QUI
//    Che i tre casi escano distinti, che le parole del portale — quando ci
//    sono — vincano sulle nostre, e che la frase-valigia non torni.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(RADICE, 'allianz/quote-service.mjs'), 'utf8');

/* Il file vero apre un browser: qui si estrae il pezzo puro e si prova da solo.
   Se la funzione non c'e' (com'era prima del 14/09/2026) le prove devono dire
   COSA manca, non esplodere leggendo il file. */
/* Si parte dalle COSTANTI che la funzione usa, non dalla sua riga: estrarre
   solo il corpo lasciava fuori GIRI_OFFERTA/SECONDI_OFFERTA e la prova moriva
   con «SECONDI_OFFERTA is not defined» — un rosso che non dice niente sul
   comportamento. */
const da = src.indexOf('const GIRI_OFFERTA') > -1 ? src.indexOf('const GIRI_OFFERTA') : src.indexOf('function motivoPremioAssente');
const fine = src.indexOf('\n}', da);
const sorgente = da < 0 ? '' : src.slice(da, fine + 2);
const motivoPremioAssente = da < 0
  ? () => { throw new Error('motivoPremioAssente non esiste: il premio assente esce ancora da una frase sola per tre guasti diversi'); }
  : new Function(sorgente + '\nreturn motivoPremioAssente;')();

const esiti = [];
const prova = (n, f) => { try { esiti.push([true, n, f() || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };

prova('quando il portale dice il perché, si riporta quello', () => {
  /* E' l'unico caso in cui sappiamo davvero cosa e' successo: le parole della
     compagnia valgono piu' di qualunque nostra ipotesi. */
  const m = motivoPremioAssente('Targa non presente in banca dati ANIA', false);
  deve(/ANIA/.test(m), 'la frase del portale si perde per strada: ' + m);
  deve(/«|"/.test(m), 'non si capisce che sono parole del portale e non nostre: ' + m);
  return 'riporta l\'avviso';
});

prova('l\'avviso del portale vince anche se l\'offerta si era aperta', () => {
  const m = motivoPremioAssente('Veicolo non assicurabile', true);
  deve(/non assicurabile/.test(m), 'l\'avviso viene coperto dalla nostra spiegazione: ' + m);
  return 'le parole del portale hanno la precedenza';
});

prova('senza avviso, «non è partito» e «non ha finito» sono frasi diverse', () => {
  const nonPartito = motivoPremioAssente(null, false);
  const nonFinito = motivoPremioAssente(null, true);
  deve(nonPartito !== nonFinito,
    'i due casi dicono la stessa cosa: si torna a non sapere se riprovare ha senso');
  deve(/riprova/i.test(nonFinito), 'nel caso lento non si dice di riprovare: ' + nonFinito);
  deve(/targa|dati/i.test(nonPartito), 'nel caso «non partito» non si dice dove guardare: ' + nonPartito);
  return 'due casi, due rimedi';
});

prova('spazi e righe a capo del portale non entrano nel messaggio', () => {
  // Gli avvisi arrivano dal DOM: vanno a capo e si portano dietro spazi doppi.
  const m = motivoPremioAssente('  Targa   non\n valida  ', false);
  deve(!/\n/.test(m) && !/ {2}/.test(m), 'il messaggio esce sporco di spazi o a capo: ' + JSON.stringify(m));
  return 'una riga pulita';
});

prova('la frase-valigia dell\'11/09 non torna più', () => {
  /* E' la frase che ha fatto finire la diagnosi in un vicolo cieco. Se
     ricompare, ricompare anche il vicolo cieco. */
  deve(!/Premio non disponibile \(calcolo non completato o veicolo non quotabile\)/.test(src),
    'la frase unica per tre guasti diversi e\' tornata nel sorgente');
  return 'sparita dal sorgente';
});

prova('l\'offerta vista si registra davvero durante l\'attesa', () => {
  /* La distinzione (b)/(c) regge solo se qualcuno segna il passaggio: senza
     questo, `offertaVista` resta falso e il caso lento viene raccontato come
     «non e' partito». */
  const da2 = src.indexOf('let offertaVista = false;');
  deve(da2 > -1, 'nessuno tiene traccia dell\'offerta aperta: i casi (b) e (c) tornano indistinguibili');
  const blocco = src.slice(da2, src.indexOf('if (r && r.sintesi && r.soluzioni) data = r;', da2));
  deve(/offertaVista = true;/.test(blocco),
    'la traccia non viene mai messa a vero dentro l\'attesa: resta sempre «non partito»');
  return 'si segna quando l\'offerta compare';
});

prova('l\'attesa dell\'offerta sta dentro il tempo che il backend concede', () => {
  /* 14/09/2026, riga 12 del registro: la chiamata e' durata 96 secondi e si e'
     chiusa dicendo «non ha finito entro 26 secondi». Il backend ne concede 225.
     Si rinunciava dopo un ottavo del tempo disponibile, e il preventivo si
     perdeva mentre il portale stava ancora lavorando. */
  const g = (src.match(/const GIRI_OFFERTA = (\d+);/) || [])[1];
  deve(g, 'l\'attesa dell\'offerta non ha un nome: e\' un numero sparso nel codice e nessuno sa a cosa corrisponde');
  const secondi = Number(g) * 2;
  deve(secondi >= 50, 'si aspetta solo ' + secondi + ' secondi: si rinuncia mentre il portale sta ancora calcolando');
  deve(secondi <= 180, 'si aspetta ' + secondi + ' secondi: si rischia di sfondare il tempo che il backend concede (225)');
  return secondi + ' secondi';
});

prova('il numero nel messaggio viene dall\'attesa vera, non scritto a mano', () => {
  /* Se sono due numeri separati, il giorno che si cambia l'attesa il messaggio
     racconta un'altra cosa — ed e' esattamente il tipo di riga che fa perdere
     tempo a chi legge il registro. */
  const f = src.slice(src.indexOf('function motivoPremioAssente'), src.indexOf('\n}', src.indexOf('function motivoPremioAssente')));
  deve(!/entro \d+ secondi/.test(f), 'il messaggio ha il numero scritto a mano: cambiando l\'attesa direbbe il falso');
  deve(/SECONDI_OFFERTA/.test(f), 'il messaggio non usa il valore vero dell\'attesa');
});

const ko = esiti.filter(e => !e[0]);
console.log('\n── Allianz · perché il premio non c\'è ─────────────────────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : ''));
console.log(ko.length ? '\n🔴 ' + ko.length + ' prove fallite su ' + esiti.length : '\n🟢 ' + esiti.length + '/' + esiti.length + ' prove superate');
process.exit(ko.length ? 1 : 0);
