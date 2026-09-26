// ═══════════════════════════════════════════════════════════════════════════════
//  LO STATO DELL'APPUNTO — APPUNTO, OK, SCOSTAMENTO, FC
//
//  Preso dal manuale di contabilità di AssiEasy che Francesco ha portato come
//  modello (cap. 2A · Appunti incassi). Là questa è la colonna che si guarda
//  ogni mattina, e la regola operativa del manuale è una riga sola:
//
//      «Verificare che in Appunti Incassi non vi siano segnalazioni in rosso
//       (devono avere tutte OK) e sanare eventuali differenze.»
//
//  Finché un incasso non ha uno stato, quella frase non si può eseguire. E un
//  incasso che la compagnia non ha visto è una copertura che il cliente crede
//  di avere.
//
//  Le cose che devono restare vere, e perché:
//
//    1. UN INCASSO CHE LA COMPAGNIA NON HA VISTO NON È «OK». Se lo fosse, la
//       schermata direbbe tutto a posto e nessuno andrebbe a cercare la riga
//       mancante — che è esattamente la scadenza dimenticata senza copertura.
//
//    2. UNA DIFFERENZA DI IMPORTO NON SI ARROTONDA: si dichiara e produce un
//       ABBUONO per la differenza, col suo verso. Passivo = ci rimettiamo noi
//       (costo). Attivo = eccedenza (ricavo). Sono due conti diversi nel
//       manuale, e sbagliare verso vuol dire scrivere un costo al posto di un
//       ricavo.
//
//    3. L'IMPORTO NON ENTRA NELLA CHIAVE DELL'ABBINAMENTO. Se ci entrasse, una
//       differenza di un euro non darebbe uno scostamento da sanare ma due
//       righe orfane — e lo scostamento è proprio la cosa che si vuole vedere.
//
//    4. I DOPPIONI SI DICHIARANO. Due righe con la stessa polizza e lo stesso
//       effetto: abbinarne una e ignorare l'altra dà lo stesso totale e un
//       incasso sparito. Il totale che torna è il modo in cui questo guasto
//       non si vede.
//
//    5. QUELLO CHE NON SI PUÒ ABBINARE NON RISULTA A POSTO. Una riga senza
//       numero di polizza esce dal controllo, e deve dirlo.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const G = require('../../tariffe/motore/contabilita-giornaliera.js');

const esiti = [];
function prova(nome, fn) {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* Una riga come la scrive l'archivio nostro, o come arriva dal foglio cassa. */
const R = (x) => Object.assign({ polizza: 'BLP1', effetto: '2026-09-01', importo: 200 }, x || {});

/* ── 1. i quattro stati ──────────────────────────────────────────────────── */

prova('c\'è da entrambe le parti e gli importi coincidono: OK', () => {
  const s = G.statoAppunto(R({}), R({}));
  deve(s.stato.chiave === 'OK', s.stato.chiave);
  deve(s.abbuono === null, 'ha generato un abbuono dove non serve');
  deve(s.perche === null, 'spiega qualcosa che non c\'è da spiegare: ' + s.perche);
});

prova('da noi c\'è, sul foglio cassa no: APPUNTO, e non è un errore', () => {
  /* Al mattino è la norma. È alla chiusura serale che diventa la cosa da
     sanare — e quella differenza la fa la schermata, non il motore. */
  const s = G.statoAppunto(R({}), null);
  deve(s.stato.chiave === 'APPUNTO', s.stato.chiave);
  deve(s.stato.grave === false, 'un appunto del mattino è marcato grave');
  deve(/non ancora/.test(s.perche), s.perche);
});

prova('sul foglio cassa c\'è e da noi no: FC, e questa è grave', () => {
  const s = G.statoAppunto(null, R({}));
  deve(s.stato.chiave === 'FC', s.stato.chiave);
  deve(s.stato.grave === true, 'una riga che da noi non esiste non è marcata grave');
  deve(/polizza|effetto|direzione/.test(s.perche), s.perche);
});

prova('nessuna delle due parti: non si inventa uno stato', () => {
  deve(G.statoAppunto(null, null) === null, 'ha dato uno stato al niente');
});

/* ── 2. l'abbuono, e il suo verso ────────────────────────────────────────── */

prova('incassato MENO del titolo: abbuono PASSIVO, ci rimettiamo noi', () => {
  const s = G.statoAppunto(R({ importo: 200 }), R({ importo: 195 }));
  deve(s.stato.chiave === 'SCOSTA', s.stato.chiave);
  deve(s.abbuono.verso === 'passivo', s.abbuono.verso);
  deve(s.abbuono.importo === 5, s.abbuono.importo);
  deve(s.scostamento === -5, s.scostamento);
  deve(/rimettiamo/.test(s.abbuono.spiega), s.abbuono.spiega);
});

prova('incassato PIÙ del titolo: abbuono ATTIVO, è un\'eccedenza', () => {
  const s = G.statoAppunto(R({ importo: 200 }), R({ importo: 203.5 }));
  deve(s.abbuono.verso === 'attivo', s.abbuono.verso);
  deve(s.abbuono.importo === 3.5, s.abbuono.importo);
  deve(s.scostamento === 3.5, s.scostamento);
  deve(/eccedenza/.test(s.abbuono.spiega), s.abbuono.spiega);
});

prova('il verso non si confonde: sono due conti diversi nel manuale', () => {
  /* Passivo è un COSTO, attivo un RICAVO. Scambiarli vuol dire scrivere un
     costo al posto di un ricavo sul conto economico, e il totale della
     giornata tornerebbe comunque. */
  const meno = G.statoAppunto(R({ importo: 100 }), R({ importo: 90 }));
  const piu = G.statoAppunto(R({ importo: 100 }), R({ importo: 110 }));
  deve(meno.abbuono.verso !== piu.abbuono.verso, 'i due versi coincidono');
  deve(meno.abbuono.verso === 'passivo' && piu.abbuono.verso === 'attivo',
    'i versi sono scambiati: ' + meno.abbuono.verso + ' / ' + piu.abbuono.verso);
});

prova('i centesimi non si perdono per strada', () => {
  /* Il manuale dice che gli abbuoni di piccolo importo vanno guardati OGNI
     giorno, perché è lì che si nascondono gli ammanchi. Se il motore li
     arrotondasse a zero, quella riga non esisterebbe. */
  const s = G.statoAppunto(R({ importo: 200 }), R({ importo: 199.99 }));
  deve(s.stato.chiave === 'SCOSTA', 'un centesimo di differenza è passato per OK');
  deve(s.abbuono.importo === 0.01, s.abbuono.importo);
});

prova('zero differenza è zero, non un abbuono da zero euro', () => {
  deve(G.abbuonoPer(200, 200) === null, 'ha prodotto un abbuono da zero');
  deve(G.abbuonoPer(0, 0) === null, 'ha prodotto un abbuono dal nulla');
});

/* ── 3. la chiave dell'abbinamento ───────────────────────────────────────── */

prova('la chiave è polizza + effetto, e l\'importo NON ci entra', () => {
  /* Se l'importo entrasse nella chiave, una differenza di un euro darebbe due
     righe orfane invece di uno scostamento da sanare — e lo scostamento è la
     cosa che si vuole vedere. */
  const a = G.chiaveTitolo(R({ importo: 200 }));
  const b = G.chiaveTitolo(R({ importo: 195 }));
  deve(a === b, 'l\'importo entra nella chiave: ' + a + ' ≠ ' + b);
  deve(G.chiaveTitolo(R({ effetto: '2026-10-01' })) !== a, 'la data di effetto non conta');
  deve(G.chiaveTitolo(R({ polizza: 'ALTRA' })) !== a, 'il numero di polizza non conta');
});

prova('senza numero di polizza non si abbina niente', () => {
  deve(G.chiaveTitolo({ effetto: '2026-09-01', importo: 200 }) === null, 'ha costruito una chiave senza polizza');
  deve(G.chiaveTitolo({}) === null, 'ha costruito una chiave dal niente');
});

prova('il numero di polizza si confronta senza badare a spazi e maiuscole', () => {
  deve(G.chiaveTitolo(R({ polizza: ' blp1 ' })) === G.chiaveTitolo(R({ polizza: 'BLP1' })),
    'la stessa polizza scritta in due modi diventa due titoli');
});

/* ── 4. la giornata abbinata ─────────────────────────────────────────────── */

prova('la giornata buona: tutte OK, differenza zero, niente da sanare', () => {
  const mie = [R({ polizza: 'A', importo: 100 }), R({ polizza: 'B', importo: 50 })];
  const a = G.abbinaFoglio(mie, [R({ polizza: 'A', importo: 100 }), R({ polizza: 'B', importo: 50 })]);
  deve(a.ok === 2, 'OK: ' + a.ok);
  deve(a.daSanare === 0, 'da sanare: ' + a.daSanare);
  deve(a.tutteOk === true, 'la giornata perfetta non risulta a posto');
  deve(a.differenza === 0, a.differenza);
  deve(a.avvisi.length === 0, a.avvisi.map(x => x.t).join(' | '));
});

prova('la giornata vera: una OK, una appunto, una scostata, una solo FC', () => {
  const mie = [R({ polizza: 'A', importo: 100 }), R({ polizza: 'B', importo: 50 }),
               R({ polizza: 'C', importo: 200 })];
  const loro = [R({ polizza: 'A', importo: 100 }), R({ polizza: 'C', importo: 190 }),
                R({ polizza: 'D', importo: 70 })];
  const a = G.abbinaFoglio(mie, loro);
  deve(a.ok === 1, 'OK: ' + a.ok);
  deve(a.appunti === 1, 'appunti: ' + a.appunti);
  deve(a.scostamenti === 1, 'scostamenti: ' + a.scostamenti);
  deve(a.soloFoglio === 1, 'solo foglio: ' + a.soloFoglio);
  deve(a.daSanare === 2, 'da sanare: ' + a.daSanare);
  deve(a.tutteOk === false, 'una giornata con tre problemi risulta a posto');
  deve(a.abbuoni.passivo === 10 && a.abbuoni.attivo === 0, JSON.stringify(a.abbuoni));
  deve(a.righe.length === 4, 'righe: ' + a.righe.length);
});

prova('la differenza è quella che si confronta col report della compagnia', () => {
  /* Il manuale: «Verificare che il totale corrisponda esattamente a quanto
     riportato sulla colonna premi del report giornaliero della compagnia». */
  const a = G.abbinaFoglio([R({ polizza: 'A', importo: 100 })], [R({ polizza: 'A', importo: 130 })]);
  deve(a.totaleNostro === 100, a.totaleNostro);
  deve(a.totaleFoglio === 130, a.totaleFoglio);
  deve(a.differenza === 30, a.differenza);
});

prova('un appunto non ancora sul foglio si dice, e col suo importo', () => {
  const a = G.abbinaFoglio([R({ polizza: 'A', importo: 340 })], []);
  deve(a.appunti === 1, a.appunti);
  deve(a.avvisi.some(x => /340,00/.test(x.t)), a.avvisi.map(x => x.t).join(' | '));
  deve(a.tutteOk === false, 'una giornata con un incasso che la compagnia non ha visto risulta chiusa');
});

prova('i doppioni si dichiarano invece di essere ingoiati', () => {
  /* Due righe stessa polizza stesso effetto: abbinarne una e ignorare l'altra
     dà lo stesso totale e un incasso sparito. Il totale che torna è il modo in
     cui questo guasto non si vede. */
  const mie = [R({ polizza: 'A', importo: 100 }), R({ polizza: 'A', importo: 100 })];
  const a = G.abbinaFoglio(mie, [R({ polizza: 'A', importo: 100 })]);
  deve(a.doppioni.length === 1, 'doppioni: ' + a.doppioni.length);
  deve(a.avvisi.some(x => x.g === 'grave' && /due volte|doppia|più di una/.test(x.t)),
    a.avvisi.map(x => x.t).join(' | '));
  /* E la seconda riga non sparisce: resta come appunto da sanare. */
  deve(a.righe.length === 2, 'righe: ' + a.righe.length);
  deve(a.appunti === 1, 'la riga doppia è sparita invece di restare da sanare');
});

prova('fra due candidate si abbina quella con l\'importo più vicino', () => {
  /* Non «la prima e chi se ne frega»: se la compagnia manda 100 e 250 e noi
     abbiamo 250, abbinare 100 produrrebbe uno scostamento di 150 inventato. */
  const a = G.abbinaFoglio([R({ polizza: 'A', importo: 250 })],
                           [R({ polizza: 'A', importo: 100 }), R({ polizza: 'A', importo: 250 })]);
  const abbinata = a.righe.find(x => x.nostro && x.foglio);
  deve(abbinata.foglio.importo === 250, 'abbinata alla riga da ' + abbinata.foglio.importo);
  deve(a.scostamenti === 0, 'ha inventato uno scostamento: ' + a.scostamenti);
});

prova('una riga senza numero di polizza non risulta a posto', () => {
  const a = G.abbinaFoglio([{ effetto: '2026-09-01', importo: 100 }], []);
  deve(a.avvisi.some(x => x.g === 'grave' && /numero di polizza/.test(x.t)),
    a.avvisi.map(x => x.t).join(' | '));
  deve(a.tutteOk === false, 'una riga che non si può controllare risulta controllata');
});

prova('elenchi vuoti: giornata vuota, non giornata a zero problemi inventati', () => {
  const a = G.abbinaFoglio([], []);
  deve(a.righe.length === 0 && a.ok === 0, JSON.stringify(a).slice(0, 120));
  deve(a.tutteOk === true, 'una giornata senza incassi ha dei problemi');
  deve(a.differenza === 0, a.differenza);
  const b = G.abbinaFoglio(null, null);
  deve(b.righe.length === 0, 'elenchi assenti fanno esplodere l\'abbinamento');
});

prova('le righe vuote dentro gli elenchi non diventano incassi', () => {
  const a = G.abbinaFoglio([null, R({ polizza: 'A', importo: 10 }), undefined], [null]);
  deve(a.righe.length === 1, 'righe: ' + a.righe.length);
});

prova('il motore non scrive niente: dice lo stato e l\'abbuono che servirebbe', () => {
  /* Un motore che scrivesse un abbuono da sé farebbe una scrittura contabile
     che nessuno ha guardato. La regola di casa: i numeri li fa il motore, le
     scritture le fa una persona. */
  const mio = R({ polizza: 'A', importo: 100 });
  const suo = R({ polizza: 'A', importo: 90 });
  const copiaMio = JSON.stringify(mio), copiaSuo = JSON.stringify(suo);
  G.abbinaFoglio([mio], [suo]);
  deve(JSON.stringify(mio) === copiaMio && JSON.stringify(suo) === copiaSuo,
    'l\'abbinamento ha scritto dentro le righe che gli sono state date');
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Appunti incassi: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
