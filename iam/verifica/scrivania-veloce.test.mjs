// ═══════════════════════════════════════════════════════════════════════════════
//  LA SCRIVANIA NON ASPETTA UNA LETTURA ALLA VOLTA  (09/10/2026)
//
//  «La dashboard si carica troppo lentamente» — Francesco. Misurato: «Da fare
//  oggi» faceva nove conteggi con nove `await` in fila, quindi aspettava la
//  SOMMA dei tempi invece del più lento. Adesso partono insieme.
//
//  Questa prova fa GIRARE `caricaDaFareOggi` con un archivio finto in cui ogni
//  richiesta impiega 60 ms, e misura tre cose:
//   · il tempo: in fila sarebbero più di dieci richieste × 60 ms; insieme, poche;
//   · l'ORDINE delle voci non dipende da quale lettura arriva prima — gli
//     insoluti restano in cima anche se la loro lettura è la più lenta;
//   · una lettura che cade non porta giù le altre e lascia il suo nome (§35).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { stanza, esiti, deve, RADICE } from './banco.mjs';

const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const e = esiti('SCRIVANIA VELOCE');
const ATTESA = 60;
const OGGI = new Date().toISOString().slice(0, 10);

function archivioLento(rotte = {}) {
  let inVolo = 0, picco = 0, richieste = 0;
  const db = {
    from(tabella) {
      const q = {};
      for (const m of ['select', 'eq', 'neq', 'lt', 'gte', 'not', 'or', 'order', 'range', 'in']) q[m] = () => q;
      let opz = null, filtrato = false;
      q.or = () => { filtrato = true; return q; };
      q.select = (_c, o) => { opz = o; return q; };
      q.then = (ris, err) => {
        richieste++; inVolo++; picco = Math.max(picco, inVolo);
        const r = rotte[tabella];
        const quanto = (r && r.attesa) || ATTESA;
        return new Promise(f => setTimeout(f, quanto)).then(() => {
          inVolo--;
          if (r instanceof Error) return { data: null, error: { message: r.message } };
          if (opz && opz.head) return { count: ((r && r.count) || 0) - (filtrato ? 4 : 0), error: null };
          return { data: (r && r.righe) || [], error: null };
        }).then(ris, err);
      };
      return q;
    }
  };
  return { db, stat: () => ({ picco, richieste }) };
}

function conScrivania(rotte) {
  const a = archivioLento(rotte);
  const disegnato = [];
  const s = stanza(html, ['caricaDaFareOggi', 'cntTutte'], {
    db: a.db,
    altro: {
      OGGI_ULTIMO: 0, OGGI_GIRO: 0, CNT_PASSO: 1000, CNT_GIRI: 50,
      SPR_ERR: '', SPR_PARZIALE: false, SPR_ESITO: null,
      wdsISO: (d) => new Date(d).toISOString().slice(0, 10),
      oggiAgenda() {}, oggiApri() {}, goTab() {}, contabPuo: () => true,
      oggiDisegna: (voci, extra) => disegnato.push({ voci, extra }),
      Anagrafica: { VISTE: { con_email: { filtro: 'email.neq.' }, con_consenso: { filtro: 'consenso.eq.true' } } },
      setTimeout, Promise, console: { warn() {}, log() {} }
    }
  });
  const M = {
    righe: ({ polizze, rate }) => ({ righe: [
      ...rate.map(r => ({ tipo: 'rata', giorni: -3, importo: r.importo_lordo })),
      ...polizze.map(p => ({ tipo: 'polizza', fascia: p.fascia, giorni: p.giorni, importo: p.premio }))
    ] }),
    conRinnovo: (r) => r,
    statoLavoro: () => ({ k: 'nessuno' })
  };
  s.browser.elemento('oggi-corpo').querySelector = () => null;
  s.ctx.window.Scadenzario = M;
  s.ctx.window.Contabilita = {};
  s.ctx.sprCarica = async () => {
    await new Promise(f => setTimeout(f, 5));   // la più veloce di tutte
    s.ctx.SPR_ESITO = { righe: 2, totale: 300, da_dichiarare: 0, totale_da_dichiarare: 0 };
  };
  return { ...s, stat: a.stat, disegnato };
}

const rotteBase = () => ({
  quote_titoli: { righe: [{ importo_lordo: 100 }], attesa: 150 },   // la più lenta: insoluti
  quote_scadenzario: { righe: [{ fascia: 'vicine', giorni: 5, premio: 400 }] },
  quote_polizze: { count: 3 },
  quote_preventivi: { righe: [{ creato_il: '2020-01-01', polizza_emessa: false, dati: { stato: 'quotato' } }] },
  quote_anagrafiche: { righe: [{ data_nascita: '1980' + OGGI.slice(4) }], count: 10 }
});

await e.provaAsync('i conteggi partono INSIEME: il tempo è quello del più lento, non la somma', async () => {
  const s = conScrivania(rotteBase());
  const t0 = Date.now();
  await s.ctx.caricaDaFareOggi(true);
  const ms = Date.now() - t0;
  const { picco, richieste } = s.stat();
  deve(s.disegnato.length === 1, 'la Scrivania non si è disegnata');
  /* In fila: più di dieci richieste da 60 ms, oltre 700 ms. Insieme: la catena
     più lunga è titoli (150) + scadenzario (60). */
  deve(richieste >= 10, 'richieste attese almeno 10, fatte ' + richieste);
  deve(picco >= 5, 'al massimo ' + picco + ' richieste in volo insieme: i conteggi si aspettano ancora uno per uno');
  deve(ms < 500, 'la Scrivania ci ha messo ' + ms + ' ms: le letture sono ancora in fila');
});

await e.provaAsync('L\'ORDINE DELLE VOCI non dipende da chi arriva prima', async () => {
  /* I sospesi arrivano in 5 ms, gli insoluti per ultimi: gli insoluti devono
     restare in cima, perché sono soldi già fuori. */
  const s = conScrivania(rotteBase());
  await s.ctx.caricaDaFareOggi(true);
  const voci = s.disegnato[0].voci.map(v => v.l);
  const ins = voci.findIndex(l => /rat[ae] scadut/.test(l));
  const sos = voci.findIndex(l => /sospes/.test(l));
  deve(ins === 0, 'gli insoluti non sono più in cima: ' + voci.join(' · '));
  deve(sos === 1, 'i sospesi non vengono subito dopo: ' + voci.join(' · '));
  const calma = s.disegnato[0].extra.calma.map(c => c.l);
  deve(calma.length >= 1, 'le voci «da sistemare con calma» si sono perse');
});

await e.provaAsync('una lettura che cade non porta giù le altre, e lascia il suo nome', async () => {
  const r = rotteBase();
  r.quote_preventivi = new Error('non risponde');
  const s = conScrivania(r);
  await s.ctx.caricaDaFareOggi(true);
  const d = s.disegnato[0];
  deve(d, 'la Scrivania non si è disegnata');
  deve(d.extra.guasti.includes('i preventivi'), 'il guasto non si dichiara: ' + d.extra.guasti.join(', '));
  deve(d.voci.some(v => /rat[ae] scadut/.test(v.l)), 'gli insoluti sono spariti per colpa dei preventivi');
});

e.stampa();
process.exit(e.ko ? 1 : 0);
