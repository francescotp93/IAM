// ═══════════════════════════════════════════════════════════════════════════════
//  KPI — un solo modulo "posizione", e nessun dato lasciato indietro
//
//  IL PROBLEMA CHE QUESTA PROVA SORVEGLIA.
//  Nella scheda KPI convivevano DUE moduli per inserire una posizione:
//   - quello in uso (openCSPosModal / openREPosModal) che salva nell'ARCHIVIO;
//   - uno piu' vecchio (openPosModal / savePos) che scriveva soltanto nella
//     MEMORIA DEL BROWSER, sotto la voce "iam_perf".
//  Il secondo non era piu' aperto da nessun pulsante: era un doppione muto,
//  pronto a essere ricollegato per sbaglio. Chi lo avesse ricollegato avrebbe
//  visto le posizioni sparire al cambio di computer.
//
//  Cosa si controlla qui:
//   1) il doppione non c'e' piu' (ne il modulo, ne il codice, ne il pulsante);
//   2) non restano richiami a funzioni che non esistono piu' — sarebbero
//      pulsanti che, premuti, non fanno niente e scrivono un errore in console;
//   3) quello che qualcuno aveva scritto nel vecchio modulo NON viene perso:
//      viene mostrato in un avviso dentro la scheda KPI;
//   4) quell'avviso NON scrive da solo nell'archivio: sono numeri che pesano su
//      premi di produzione e bonus, li ricopia una persona;
//   5) "archivia l'avviso" mette da parte, non cancella.
//
//  Come sempre la prova gira due volte: sul codice di adesso (deve passare) e
//  sul codice di prima (deve fallire).
// ═══════════════════════════════════════════════════════════════════════════════
import { sorgenteAttuale, sorgenteA, stanza, esiti, deve } from './banco.mjs';

const NOMI = ['kpiResiduiLocali', 'mostraResiduiKPI', 'archiviaResiduiKPI'];

// Com'era fatta la memoria del vecchio modulo su un computer che l'aveva usato.
const MEMORIA_VECCHIA = {
  iam_perf: {
    cs: [{ nome: 'Rossi Mario', data: '2026-03-04', importo: 1200, tipoCS: 'Riscattato' }],
    re: [{ nome: 'Bianchi Srl', data: '2026-03-11', importo: 850, frz: 4 }],
    gare_rca: [{ nome: 'Verdi Anna', data: '2026-02-20', importo: 430 }],
  },
};

function batteria(sorgente, etichetta) {
  const e = esiti(etichetta);

  // ── 1. il doppione non c'e' piu' ───────────────────────────────────────────
  e.prova('il vecchio modulo "posizione" non esiste piu', () => {
    deve(!/id="modal-pos"/.test(sorgente), 'la finestra modal-pos e ancora nella pagina');
    deve(!/function\s+savePos\s*\(/.test(sorgente), 'savePos() e ancora nel codice');
    deve(!/function\s+openPosModal\s*\(/.test(sorgente), 'openPosModal() e ancora nel codice');
    deve(!/function\s+delPos\s*\(/.test(sorgente), 'delPos() e ancora nel codice');
    deve(!/function\s+openHDIPos\s*\(/.test(sorgente), 'openHDIPos() e ancora nel codice');
  });

  // ── 2. nessun pulsante che chiama il vuoto ─────────────────────────────────
  e.prova('nessun pulsante richiama una funzione che non esiste piu', () => {
    for (const n of ['savePos', 'openPosModal', 'delPos', 'openHDIPos', 'loadPerf', 'savePerf']) {
      const richiami = sorgente.match(new RegExp(`onclick="[^"]*\\b${n}\\s*\\(`, 'g')) || [];
      deve(richiami.length === 0, `c e ancora un pulsante che chiama ${n}(): premuto non farebbe niente`);
      // richiami dal codice, fuori dai commenti
      const dalCodice = (sorgente.match(new RegExp(`(^|[^\\w/*.])${n}\\s*\\(`, 'gm')) || [])
        .filter(r => !/^\s*[/*]/.test(r));
      const definita = new RegExp(`function\\s+${n}\\s*\\(`).test(sorgente);
      deve(definita || dalCodice.length === 0, `${n}() viene ancora chiamata ma non e piu definita`);
    }
  });

  // ── 3. il vecchio dato viene mostrato, non buttato ─────────────────────────
  e.prova('cio che era rimasto nel vecchio modulo viene fatto vedere', () => {
    const s = stanza(sorgente, NOMI, { memoria: MEMORIA_VECCHIA });
    const r = s.ctx.kpiResiduiLocali();
    deve(r.length === 3, `le posizioni ritrovate sono ${r.length} invece di 3`);
    deve(r.some(x => x.nome === 'Rossi Mario' && /CONSAP/.test(x.sezione)), 'la posizione CONSAP non risulta, o senza la sua sezione');
    deve(r.some(x => /RE/.test(x.sezione)), 'la posizione RE non risulta');

    s.ctx.mostraResiduiKPI();
    const avviso = s.browser.elemento('perf-residui').innerHTML;
    deve(/3 posizioni/.test(avviso), "l'avviso non dice quante posizioni sono rimaste");
    deve(/Rossi Mario/.test(avviso), "l'avviso non elenca le posizioni: non si saprebbe cosa ricopiare");
  });

  e.prova('senza residui la scheda KPI resta pulita', () => {
    const s = stanza(sorgente, NOMI);
    deve(s.ctx.kpiResiduiLocali().length === 0, 'trova residui dove non ce ne sono');
    s.ctx.mostraResiduiKPI();
    deve(s.browser.elemento('perf-residui').innerHTML === '', "compare un avviso anche quando non c'e' niente da segnalare");
  });

  // ── 4. l'avviso non tocca l'archivio ───────────────────────────────────────
  e.prova("l'avviso non scrive da solo nell'archivio", () => {
    const s = stanza(sorgente, NOMI, { memoria: MEMORIA_VECCHIA });
    s.ctx.kpiResiduiLocali();
    s.ctx.mostraResiduiKPI();
    deve(s.archivio.stato.upsert.length === 0, `sono state scritte ${s.archivio.stato.upsert.length} righe nell'archivio: i numeri dei premi non si convertono a occhio`);
    deve(s.archivio.stato.delete.length === 0, "l'avviso ha cancellato qualcosa nell'archivio");
  });

  // ── 5. archiviare mette da parte, non cancella ─────────────────────────────
  e.prova("archiviare l'avviso mette da parte il dato, non lo cancella", () => {
    const s = stanza(sorgente, NOMI, { memoria: MEMORIA_VECCHIA });
    s.ctx.archiviaResiduiKPI();
    deve(s.browser.localStorage.getItem('iam_perf') === null, "l'avviso continuerebbe a comparire");
    const messiDaParte = [...s.browser.mem.keys()].filter(k => k.startsWith('iam_perf_archiviato_'));
    deve(messiDaParte.length === 1, 'il vecchio dato non e stato messo da parte: sarebbe perduto');
    const dentro = JSON.parse(s.browser.mem.get(messiDaParte[0]));
    deve(dentro.cs?.[0]?.nome === 'Rossi Mario', 'quello messo da parte non e il dato originale');
    deve(s.browser.detto.confirm.length === 1, "l'avviso viene archiviato senza chiedere conferma");
  });

  return e;
}

// ── il codice di adesso ───────────────────────────────────────────────────────
const adesso = batteria(sorgenteAttuale(), 'KPI DOPPIONI (codice di adesso)');
adesso.stampa();

// ── la controprova sul codice di prima ────────────────────────────────────────
// Commit fisso, non "HEAD": il termine di paragone deve restare il codice con il
// doppione dentro, anche dopo che saranno arrivate altre modifiche.
const PRIMA_DELLA_CORREZIONE = 'aa5be3f';
console.log('');
let contro = null;
try {
  contro = batteria(sorgenteA(PRIMA_DELLA_CORREZIONE), 'KPI DOPPIONI (controprova sul codice di prima)');
  contro.stampa();
} catch (err) {
  console.log('CONTROPROVA non eseguibile: ' + err.message);
}

console.log('');
const problemi = [];
if (adesso.ko) problemi.push(`${adesso.ko} prove fallite sul codice di adesso`);
if (contro && contro.ko === 0) problemi.push('la controprova passa anche sul codice di prima: la prova non dimostra niente');
if (problemi.length) { for (const p of problemi) console.log('  X ' + p); }
console.log(problemi.length === 0
  ? `KPI DOPPIONI: ${adesso.ok} prove superate; sul codice di prima ne fallivano ${contro ? contro.ko : '?'}`
  : `KPI DOPPIONI: ${problemi.length} problemi`);
process.exit(problemi.length === 0 ? 0 : 1);
