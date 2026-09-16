// ═══════════════════════════════════════
//  CLICCANDO UN'ATTIVITÀ SI APRE QUELLA
//
//  Il diario ha tre viste — settimana, giorno, mese — e le stesse attività
//  compaiono in tutte e tre. Cliccarne una deve aprire il suo dettaglio, con
//  dentro il pulsante «Apri e modifica». Sempre. In tutte e tre.
//
//  Non era così, e il modo in cui si rompeva è istruttivo: wdsApri() metteva
//  la selezione nella variabile giusta e poi ridisegnava SEMPRE la settimana.
//  Nella vista giorno la settimana è nascosta, quindi il clic sembrava non
//  fare niente — mentre in memoria la selezione era cambiata davvero.
//  Un difetto peggiore di un errore visibile: il programma «ha capito», e
//  chi lo usa no.
//
//  Nel mese i riquadri non erano cliccabili affatto.
// ═══════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const radice = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');

const esiti = [];
const prova = (nome, fn) => {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
};
const deve = (c, msg) => { if (!c) throw new Error(msg); };

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

prova('il clic ridisegna la vista aperta, non sempre la settimana', () => {
  /* La riga incriminata era:  function wdsApri(id){ WDS_SEL=id; renderWDSett(); }
     Nella vista giorno ridisegnava una schermata nascosta. */
  const f = corpoDi('function wdsApri(id)');
  deve(f, 'manca wdsApri');
  deve(/wdVistaAttiva\(\)/.test(f),
    'wdsApri non guarda quale vista è aperta: nel giorno ridisegnerebbe la settimana, che è nascosta');
  deve(/renderWDGiorno\(\)/.test(f), 'wdsApri non sa ridisegnare la vista giorno');
  deve(/renderWDSett\(\)/.test(f), 'wdsApri non sa più ridisegnare la settimana');
});

prova('nel mese le attività si possono cliccare', () => {
  /* Si guarda la riga che COSTRUISCE il riquadro, non i dintorni: la cella
     del giorno ha un onclick suo, e un ritaglio largo lo pescava facendo
     passare la prova su codice rotto. Il browser diceva il contrario. */
  const f = corpoDi('function renderWDCal()');
  deve(f, 'manca renderWDCal');
  const m = f.match(/const chip = [^\n]*\n?[^\n]*/);
  deve(m, 'non trovo la riga che costruisce il riquadro delle attività nel mese');
  deve(/onclick/.test(m[0]), 'nel mese le attività non sono cliccabili: ' + m[0].slice(0, 80));
});

prova('il mese apre il giorno giusto, con l\'attività già scelta', () => {
  /* Nel mese un riquadro è alto otto pixel e il dettaglio non c'è: aprire lì
     dentro un pannello non servirebbe a niente. Si va al giorno, dove c'è
     spazio, con quell'attività già selezionata. */
  const f = corpoDi('function renderWDCal()');
  const m = f.match(/const chip = [^\n]*\n?[^\n]*/);
  deve(m && /wdApriEvento/.test(m[0]),
    'il riquadro del mese non porta al giorno con l\'attività scelta');
  const a = corpoDi('function wdApriEvento(id, ds)');
  deve(a, 'manca wdApriEvento');
  deve(/WDS_SEL/.test(a) && /selWDTab\('giorno'\)|wdApriGiorno/.test(a),
    'wdApriEvento non apre il giorno con quell\'attività selezionata');
});

prova('il dettaglio ha sempre il pulsante per modificare', () => {
  const f = corpoDi('function wdsDettaglio(id, idBox, idStato)');
  deve(f, 'manca wdsDettaglio');
  deve(/openWDModal\(/.test(f), 'dal dettaglio non si può aprire la modifica');
  /* E che il pannello del giorno riceva il suo, di contenitore: se
     wdsDettaglio scrivesse sempre in «wds-det», il giorno resterebbe vuoto. */
  deve(/idBox \|\| 'wds-det'/.test(f), 'il dettaglio scrive sempre nello stesso riquadro');
});

prova('dal dettaglio si completa senza aprire la scheda', () => {
  /* Francesco voleva un tasto rapido: nel dettaglio, oltre a «Apri e
     modifica», un «Completa» che segna fatto al volo. */
  const f = corpoDi('function wdsDettaglio(id, idBox, idStato)');
  deve(f, 'manca wdsDettaglio');
  deve(/wdsCompleta\(/.test(f), 'nel dettaglio non c\'è il tasto rapido «Completa»');
  deve(/Completa/.test(f) && /Riapri/.test(f),
    'il tasto non passa fra «Completa» e «Riapri» a seconda dello stato');
  deve(/canEdit/.test(f), 'chiunque potrebbe segnare fatte attività non sue');
  /* E deve aggiornare QUESTO pannello: toggleWDDone ridisegna elenco e
     calendario, ma il dettaglio aperto resterebbe su «Da fare». */
  const c = corpoDi('async function wdsCompleta(id, idBox, idStato)');
  deve(c, 'manca wdsCompleta');
  deve(/toggleWDDone\(/.test(c), 'il tasto rapido non cambia davvero lo stato');
  deve(/wdsDettaglio\(/.test(c), 'dopo aver completato il dettaglio non si aggiorna: resterebbe «Da fare»');
});

let ko = 0;
console.log('\nDIARIO — cliccando un\'attività si apre quella');
for (const [ok, nome, msg] of esiti) {
  console.log(ok ? '  ok  ' + nome : '  X   ' + nome + ' — ' + msg);
  if (!ok) ko++;
}
console.log(`\nCLIC: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
