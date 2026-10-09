// ═══════════════════════════════════════════════════════════════════════════════
//  IL MINI PLANNING DI OGGI — l'agenda dentro «Da fare oggi»  (09/10/2026)
//
//  «Nel da fare oggi facciamo semplicemente tipo un mini planning che fa vedere
//  gli appuntamenti in agenda del giorno» — Francesco.
//
//  Si sorveglia che:
//   · si legga SOLO il giorno di oggi, in ora locale (§44);
//   · gli appuntamenti escano in ordine di ora, quelli passati da parte;
//   · «non si è potuto leggere l'agenda» non diventi «oggi è libera» (§12, §18);
//   · il collaboratore veda le sue e quelle condivise, come in loadAgendaDB;
//   · qualcuno la chiami (§1).
//  Questa prova fa GIRARE il codice.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const e = esiti('AGENDA DI OGGI');
const OGGI = '2026-10-09';

function conAgenda(risposta, extra = {}) {
  const chieste = [];
  const db = {
    from(t) {
      const q = { t, filtri: [] };
      chieste.push(q);
      const api = {
        select: (c) => { q.select = c; return api; },
        eq: (k, v) => { q.filtri.push(['eq', k, v]); return api; },
        or: (v) => { q.filtri.push(['or', v]); return api; },
        order: () => api,
        then: (ok, ko) => Promise.resolve(risposta instanceof Error
          ? { data: null, error: { message: risposta.message } }
          : { data: risposta || [], error: null }).then(ok, ko)
      };
      return api;
    }
  };
  const s = stanza(html, ['oggiAgenda', 'oggiAgendaHTML', 'agendaLocale'], {
    db, ...extra,
    altro: { wdsISO: () => OGGI, goTab() {}, ...(extra.altro || {}) }
  });
  return { ...s, chieste };
}
const dentro = (s) => s.browser.elemento('oggi-ag').innerHTML || '';

e.prova('esiste il contenitore, ed è dentro «Da fare oggi» prima del lavoro', () => {
  const a = html.indexOf('id="oggi-ag"'), c = html.indexOf('id="oggi-corpo"'), o = html.indexOf('id="oggi"');
  deve(a > 0, 'manca il contenitore dell’agenda');
  deve(o < a && a < c, 'l’agenda non sta in cima alla scheda «Da fare oggi»');
});

e.prova('la si chiama dal caricamento di «Da fare oggi», prima del freno dei 30 secondi', () => {
  const k = ritaglia(html, 'caricaDaFareOggi');
  const i = k.indexOf('oggiAgenda()'), f = k.indexOf('OGGI_ULTIMO) <');
  deve(i > 0, 'nessuno chiama oggiAgenda');
  deve(f < 0 || i < f, 'l’agenda resta ferma per trenta secondi dopo un appuntamento nuovo');
});

await e.provaAsync('si legge solo oggi, e gli appuntamenti escono in ordine di ora', async () => {
  const s = conAgenda([
    { id: 2, data: OGGI, ora: '15:30:00', titolo: 'Firma Rossi', note: 'portare privacy' },
    { id: 1, data: OGGI, ora: '09:00:00', titolo: 'Telefonata Bianchi' }
  ]);
  await s.ctx.oggiAgenda();
  const q = s.chieste[0];
  deve(q && q.t === 'iam_agenda', 'non legge iam_agenda');
  deve(q.filtri.some(f => f[0] === 'eq' && f[1] === 'data' && f[2] === OGGI), 'non filtra sul giorno di oggi');
  const h = dentro(s);
  deve(h.indexOf('Telefonata Bianchi') > 0 && h.indexOf('Telefonata Bianchi') < h.indexOf('Firma Rossi'), 'l’ordine non è per ora');
  deve(/09:00/.test(h) && !/09:00:00/.test(h), 'l’ora non si legge come hh:mm');
  deve(/2 appuntamenti/.test(h), 'non dice quanti sono');
  deve(/portare privacy/.test(h), 'la nota non si vede');
});

e.prova('i passati si fanno da parte, il prossimo si accende', () => {
  const s = conAgenda([]);
  const ora = new Date(2026, 9, 9, 12, 0);
  const h = s.ctx.oggiAgendaHTML([
    { titolo: 'A', ora: '09:00' }, { titolo: 'B', ora: '14:00' }, { titolo: 'C', ora: '17:00' }
  ], { ora });
  const blocchi = h.split('<button').slice(1);
  deve(/oggi-ag-pass/.test(blocchi[0]), 'quello delle 9 alle 12 non risulta passato');
  deve(/oggi-ag-pross/.test(blocchi[1]), 'quello delle 14 non risulta il prossimo');
  deve(!/oggi-ag-pross|oggi-ag-pass/.test(blocchi[2]), 'quello delle 17 è segnato come qualcos’altro');
});

await e.provaAsync('agenda vuota: lo dice, in parole', async () => {
  const s = conAgenda([]);
  await s.ctx.oggiAgenda();
  deve(/Nessun appuntamento in agenda oggi/.test(dentro(s)), 'un’agenda vuota non lo dice');
});

await e.provaAsync('AGENDA NON LETTA NON VUOL DIRE GIORNATA LIBERA', async () => {
  const s = conAgenda(new Error('permission denied'));
  await s.ctx.oggiAgenda();
  const h = dentro(s);
  deve(/Non si è potuto leggere l'agenda|Non si è potuto leggere l&#39;agenda/.test(h), 'la lettura caduta non si dichiara: ' + h);
  deve(!/Nessun appuntamento/.test(h), 'una lettura caduta si legge come una giornata libera');
});

await e.provaAsync('il collaboratore vede le sue e quelle condivise', async () => {
  const s = conAgenda([], { PROFILO: { ruolo: 'collaboratore' }, ME: { id: 'u-7' } });
  await s.ctx.oggiAgenda();
  const or = s.chieste[0].filtri.find(f => f[0] === 'or');
  deve(or && /utente_id\.eq\.u-7/.test(or[1]) && /condivisi_con\.cs\.\{u-7\}/.test(or[1]), 'il filtro del collaboratore non è quello dell’agenda');
});

e.prova('niente toISOString nel calcolo del giorno (§44)', () => {
  deve(!/toISOString/.test(ritaglia(html, 'oggiAgenda')), 'il giorno si ricava in UTC');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
