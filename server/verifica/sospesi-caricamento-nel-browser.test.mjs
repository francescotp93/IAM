// ═══════════════════════════════════════════════════════════════════════════════
//  SOSPESI — IL CARICAMENTO SI VEDE, E IL BLOCCO STORICO STA CHIUSO
//
//  30/09/2026, richiesta di Francesco: «questa parte non si deve vedere queste
//  scritte ma semplicemente un caricamento».
//
//  Aprendo i Sospesi c'era, sotto la riga «Carico i sospesi…», un blocco fisso
//  di tre righe: il titolo «Sospesi caricati da file (storico)», la spiegazione
//  del perché non si aggiorna più, e il «nessun sospeso da file». Restava lì
//  sempre — mentre la pagina caricava, e anche quando da file non era mai
//  arrivato niente. Chi apriva la schermata leggeva quelle tre righe come se
//  fossero il contenuto.
//
//  Due cose, quindi, e sono tutt'e due di DISEGNO — in Node non si vedono:
//   1. il blocco storico è chiuso finché non ha dentro qualcosa di vero;
//   2. il caricamento si vede che è un caricamento (la rotella che gira), non
//      una riga di testo uguale a un risultato.
// ═══════════════════════════════════════════════════════════════════════════════
import path from 'path';
import { fileURLToPath } from 'url';
import { apriIam } from './banco-premi.mjs';

const RADICE = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, msg) => { if (!c) throw new Error(msg); };

const banco = await apriIam(RADICE, { dentro: 'sospesi' });
const p = banco.pagina;

/* Che cosa si legge davvero a schermo: `textContent` conta anche quello che
   sta dentro un contenitore spento, e una prova che guarda il testo invece
   della visibilità resta verde con la schermata piena di roba nascosta. */
async function guarda() {
  return p.evaluate(() => {
    const vede = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
      }
      return !!el;
    };
    const st = document.getElementById('spr-storico');
    const car = document.querySelector('#spr-lista .cl-carico');
    const gir = car ? car.querySelector('.cl-carico-g') : null;
    return {
      storicoC: !!st,
      storicoVisibile: st ? vede(st) : null,
      /* Le tre scritte della lagnanza, una per una. */
      titolo: [...document.querySelectorAll('.slbl')]
        .filter(e => /Sospesi caricati da file/i.test(e.textContent)).map(e => vede(e)),
      vuoto: document.getElementById('s-empty') ? vede(document.getElementById('s-empty')) : null,
      caricoC: !!car,
      caricoVisibile: car ? vede(car) : false,
      caricoTesto: car ? car.textContent.trim() : null,
      rotellaC: !!gir,
      /* Una rotella che non gira è un pallino. */
      rotella: gir ? (() => { const s = getComputedStyle(gir);
        return { anim: s.animationName, w: s.width, raggio: s.borderRadius }; })() : null,
    };
  });
}

const allApertura = await guarda();

// ── 1. mentre carica, si vede SOLO il caricamento ────────────────────────────

prova('il blocco «sospesi caricati da file» esiste ma sta chiuso', () => {
  deve(allApertura.storicoC, 'non c\'è nessun contenitore #spr-storico: le scritte sono di nuovo sparse nella pagina');
  deve(allApertura.storicoVisibile === false,
    'il blocco storico è aperto appena si entra: le tre scritte si vedono ancora');
});

prova('nessuna delle tre scritte si vede aprendo la schermata', () => {
  deve(allApertura.titolo.length === 1, 'il titolo del blocco storico non si trova più: ' + JSON.stringify(allApertura.titolo));
  deve(allApertura.titolo.every(v => v === false), 'il titolo «Sospesi caricati da file (storico)» si vede ancora');
  deve(allApertura.vuoto === false, 'la riga «Nessun sospeso da file…» si vede ancora');
});

prova('al suo posto c\'è un caricamento, e si vede che sta caricando', () => {
  deve(allApertura.caricoC, 'non c\'è nessun indicatore di caricamento in #spr-lista');
  deve(allApertura.caricoVisibile, 'l\'indicatore di caricamento c\'è ma non si vede');
  deve(/Carico i sospesi/i.test(allApertura.caricoTesto || ''), 'il caricamento non dice che cosa sta caricando: ' + allApertura.caricoTesto);
});

prova('la rotella gira davvero, non è un pallino fermo', () => {
  /* La regola di stile deve prendere: un selettore sbagliato non dà errore,
     lascia solo un quadratino senza animazione accanto al testo. */
  deve(allApertura.rotellaC, 'manca la rotella: il caricamento è di nuovo solo una riga di testo');
  const r = allApertura.rotella;
  deve(r.anim === 'clCarico', 'la rotella non ha l\'animazione: ' + JSON.stringify(r));
  deve(r.w === '14px', 'il foglio di stile non la riconosce: ' + JSON.stringify(r));
  deve(r.raggio === '50%', 'non è tonda, quindi non sembra una rotella: ' + JSON.stringify(r));
});

// ── 2. quando da file qualcosa c'è, il blocco si apre e si spiega ────────────

prova('con dei sospesi da file veri il blocco si apre', async () => {
  /* La spiegazione («non si aggiorna più») serve, e molto, QUANDO l'elenco
     c'è: un elenco fermo che non dichiara di essere fermo è peggio di un
     elenco che non c'è. Il guasto da evitare era tenerla a schermo anche
     quando l'elenco non esiste. */
  const c = await p.evaluate(() => {
    window.APP = window.APP || {};
    APP.sospesi = [{ nominativo: 'ROSSI MARIO', polizza: 'X1', compagnia: 'PRIMA',
                     produttore: 'ODDO FRANCESCO', importo: 120, gg: 10 }];
    try { buildSospesi(); } catch (e) { /* loadTeam va al database, e qui non c'è */ }
    const st = document.getElementById('spr-storico');
    return { aperto: st ? getComputedStyle(st).display !== 'none' : null };
  });
  deve(c.aperto === true, 'ci sono sospesi da file e il blocco resta chiuso: l\'elenco sarebbe invisibile');
});

prova('e senza niente da file resta chiuso', async () => {
  const c = await p.evaluate(() => {
    const st = document.getElementById('spr-storico');
    if (st) st.style.display = 'none';
    window.APP = window.APP || {};
    APP.sospesi = [];
    try { buildSospesi(); } catch (e) { /* idem */ }
    return { aperto: st ? getComputedStyle(st).display !== 'none' : null };
  });
  deve(c.aperto === false, 'senza sospesi da file il blocco si apre lo stesso, a dire che è vuoto');
});

prova('aprendo IAM non si è rotto niente', () => {
  deve(banco.errori.length === 0, banco.errori.slice(0, 3).join(' | '));
});

// ── esecuzione ───────────────────────────────────────────────────────────────
let ko = 0;
console.log('\nSOSPESI — il caricamento e il blocco storico');
for (const { nome, fn } of esiti) {
  try { await fn(); console.log('  ok  ' + nome); }
  catch (e) { ko++; console.log('  X   ' + nome + '\n        ' + e.message); }
}
await banco.chiudi();
console.log(`\nCARICAMENTO DEI SOSPESI: ${esiti.length - ko} superate, ${ko} fallite\n`);
process.exit(ko === 0 ? 0 : 1);
