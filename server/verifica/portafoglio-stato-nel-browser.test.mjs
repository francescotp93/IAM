// ═══════════════════════════════════════════════════════════════════════════════
//  IL MOTORE DENTRO LA PAGINA, IN UN BROWSER VERO
//
//  Le prove in Node dicono che le regole sono giuste. Non dicono che la pagina
//  le CARICHI: un `<script src>` senza contrassegno, un nome sbagliato, un
//  errore che ferma lo script prima del punto giusto — e in Node non si vede
//  niente, perché in Node quel file lo carica `require`.
//
//  Il 26/09/2026 due apici inversi in un commento hanno spento l'intero script
//  di QUOTO, e nessuna prova in Node se n'era accorta.
//
//  Qui si apre la pagina in Chromium e si chiede alle funzioni vere, quelle
//  attaccate a `window`, di rispondere sui casi che contano. Non serve il login
//  e non si tocca il database: sono funzioni di calcolo.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { apriPreventivatore } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriPreventivatore(RADICE);
const p = banco.pagina;

prova('la pagina carica il motore del portafoglio', async () => {
  const c = await p.evaluate(() => ({
    motore: typeof window.PortafoglioStato === 'object' && window.PortafoglioStato !== null,
    sigla: typeof (window.PortafoglioStato || {}).sigla === 'function',
    stato: typeof (window.PortafoglioStato || {}).statoCliente === 'function',
    dividi: typeof (window.PortafoglioStato || {}).dividiPolizze === 'function',
  }));
  deve(c.motore, 'window.PortafoglioStato non esiste: il tag <script> non c\'è o non si carica');
  deve(c.sigla && c.stato && c.dividi, 'il motore c\'è ma non porta le funzioni che serve: ' + JSON.stringify(c));
});

prova('e le tre funzioni della schermata che lo usano', async () => {
  /* Se una di queste non esiste, il difetto non e` visibile: la scheda si apre
     senza fascia, l'elenco senza colori, la riga del titolo senza sigla — tutto
     «funziona», e nessuno sa che manca qualcosa. */
  const c = await p.evaluate(() => ({
    fascia: typeof window.clkStato === 'function',
    elenco: typeof window.anagStatiCarica === 'function',
    sigla: typeof window.titSigla === 'function',
  }));
  deve(c.fascia && c.elenco && c.sigla, 'funzioni della schermata mancanti: ' + JSON.stringify(c));
});

prova('nel browser una annullata in data NON è attiva, e il cliente è perso', async () => {
  /* Le stesse 34 polizze vere dell'archivio, chieste al codice che gira davvero
     nella pagina. */
  const r = await p.evaluate(() => {
    const P = window.PortafoglioStato;
    const pol = { id: 'x', data_scadenza: '2026-12-31', stato_pagamento: 'annullata',
                  dati: { ssf: { data_annullamento: '2026-07-03' } } };
    const c = P.statoCliente([pol], '2026-09-26');
    return { attiva: P.attiva(pol, '2026-09-26'), stato: c.stato, persoIl: c.persoIl,
             alRinnovo: c.persoAlRinnovo, motivo: c.motivoPerdita };
  });
  deve(r.attiva === false, 'nel browser un\'annullata risulta attiva');
  deve(r.stato === 'perso', 'stato: ' + r.stato);
  deve(r.persoIl === '2026-07-03', 'data della perdita: ' + r.persoIl);
  deve(r.motivo === 'annullata' && r.alRinnovo === false, 'una disdetta passa per mancato rinnovo: ' + JSON.stringify(r));
});

prova('nel browser il prospect è prospect, e non è perso', async () => {
  const r = await p.evaluate(() => window.PortafoglioStato.statoCliente([], '2026-09-26'));
  deve(r.stato === 'mai_avuto' && r.prospect === true && r.perso === false, JSON.stringify(r));
});

prova('la sigla si disegna, e dice quando è una deduzione', async () => {
  const r = await p.evaluate(() => ({
    certa: window.titSigla({ sigla_tipo: 'QR', sigla_dedotta: false }),
    dedotta: window.titSigla({ sigla_tipo: 'QF', sigla_dedotta: true }),
    vuota: window.titSigla({ sigla_tipo: null }),
  }));
  deve(/>QR</.test(r.certa), 'la sigla certa non compare: ' + r.certa);
  deve(/Quietanza di rinnovo/.test(r.certa), 'il riquadro non dice che cos\'è la sigla: ' + r.certa);
  deve(/tit-sigla-ded/.test(r.dedotta), 'una sigla dedotta si presenta come certa: ' + r.dedotta);
  deve(r.vuota === '', 'un titolo senza sigla disegna qualcosa: ' + r.vuota);
});

prova('il CRM chiede lo stato allo stesso motore, non a una sua copia', async () => {
  /* Due definizioni di «perso» darebbero due numeri, e quello sbagliato sarebbe
     quello che nessuno guarda. */
  const r = await p.evaluate(() => {
    const A = window.CrmAnalisi;
    const gente = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const pol = {
      '1': [{ id: 'a', data_scadenza: '2027-01-01', stato_pagamento: 'pagato' }],
      '2': [{ id: 'b', data_scadenza: '2026-06-01', stato_pagamento: 'pagato' }],
    };
    const ctx = { polizzePerCliente: pol, oggi: '2026-09-26' };
    return {
      persi: A.filtra(gente, { stato: 'perso' }, ctx).map(x => x.id),
      prospect: A.filtra(gente, { stato: 'prospect' }, ctx).map(x => x.id),
      rinnovo: A.filtra(gente, { persoAlRinnovo: true }, ctx).map(x => x.id),
    };
  });
  deve(r.persi.join() === '2', 'persi: ' + r.persi.join());
  deve(r.prospect.join() === '3', 'prospect: ' + r.prospect.join());
  deve(r.rinnovo.join() === '2', 'persi al rinnovo: ' + r.rinnovo.join());
});

prova('aprendo la pagina non si è rotto niente', async () => {
  /* Gli errori raccolti dall'apertura in poi. Un errore qui vuol dire che una
     parte dello script non è stata eseguita, e quale parte non si sa. */
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nIL MOTORE DENTRO LA PAGINA — chiesto a un browser vero');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nMOTORE NEL BROWSER: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
