// ═══════════════════════════════════════════════════════════════════════════════
//  I NUMERI DELLA SCRIVANIA — la striscia  (Blocco 3 · punto 10, 21/09/2026)
//
//  L'aritmetica sta nel motore condiviso (`tariffe/motore/kpi.js`, otto prove
//  in `server/verifica/kpi.test.mjs`, con due controprove). Qui si sorveglia
//  che la Scrivania:
//
//   · non RIPETA i numeri di «Da fare oggi» — è la ragione per cui una
//     striscia di indicatori era già stata tolta da questa pagina il
//     4/8/2026 (§13.3);
//   · sia RAGGIUNGIBILE da tutti e tre i percorsi che aprono la Scrivania,
//     perché una funzione che nessuno chiama è il guasto numero uno (§1);
//   · legga una tabella per riquadro, e non si spenga tutta per una lettura
//     che fallisce (§35);
//   · non trasformi «non si è potuto leggere» in uno zero (§12, §18).
//
//  Questa prova fa GIRARE il codice, non solo cercare stringhe.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const Kpi = require(path.join(RADICE, '..', 'tariffe', 'motore', 'kpi.js'));
const e = esiti('KPI SCRIVANIA');

const OGGI = new Date().toISOString().slice(0, 10);
const MESE = OGGI.slice(0, 7);

/* Un archivio finto che risponde tabella per tabella, così si può far cadere
   UNA lettura sola e guardare che cosa succede alle altre. */
function conScrivania(risposte = {}) {
  const chieste = [];
  const db = {
    from(tabella) {
      chieste.push(tabella);
      const r = risposte[tabella];
      const esito = () => (r instanceof Error ? { data: null, error: { message: r.message } }
                                              : { data: r || [], error: null });
      const q = {
        select: () => q,
        gte: () => q,
        then: (ris, err) => Promise.resolve(esito()).then(ris, err)
      };
      return q;
    }
  };
  const s = stanza(html, ['kpiRiquadro', 'kpiEuro', 'caricaKpiScrivania'], {
    db,
    altro: {
      KPI_ULTIMO: 0,
      wdsISO: (d) => new Date(d).toISOString().slice(0, 10),
      Promise, console: { warn() {}, log() {} }
    }
  });
  s.ctx.window.Kpi = Kpi;
  s.ctx.Kpi = Kpi;
  return { ...s, chieste };
}

const dentro = (s) => (s.browser.elemento('kpi-riga').innerHTML || '');

e.prova('la striscia esiste, e NON ripete i numeri di «Da fare oggi»', () => {
  /* Il 4/8/2026 una striscia di quattro indicatori era stata tolta da qui
     perché ripeteva gli stessi conteggi di «Da fare oggi» a cento pixel di
     distanza. Questi rispondono a un'altra domanda: quello elenca il lavoro
     arretrato, questi dicono come sta andando. La prova misura che non si
     rincorrano: nessuno dei conteggi di «Da fare oggi» compare qui. */
  deve(/id="kpi-riga"/.test(html), 'manca il contenitore della striscia');
  const k = ritaglia(html, 'caricaKpiScrivania');
  deve(k, 'manca caricaKpiScrivania');
  deve(!/quote_scadenzario/.test(k), 'i KPI rifanno il conteggio dei rinnovi di «Da fare oggi»');
  deve(!/perfezionata/.test(k), 'i KPI rifanno il conteggio delle polizze da perfezionare');
  deve(!/quote_anagrafiche/.test(k), 'i KPI rifanno i conteggi della rubrica di «Da fare oggi»');
  deve(!/eq\('stato', 'aperto'\)/.test(k), 'i KPI rifanno il conteggio degli insoluti');
});

e.prova('la si chiama da tutti i percorsi che aprono la Scrivania', () => {
  /* §1: il guasto numero uno di questo repository è il codice che arriva e non
     lo chiama nessuno. «Da fare oggi» ha tre agganci perché la Scrivania si
     apre in tre modi; i numeri devono averne altrettanti, o compaiono solo
     ogni tanto — che è peggio di non esserci. */
  const oggi = (html.match(/caricaDaFareOggi\(\)/g) || []).length;
  const kpi = (html.match(/caricaKpiScrivania\(\)/g) || []).length;
  deve(kpi >= oggi, 'i numeri hanno meno agganci del lavoro del giorno: ' + kpi + ' contro ' + oggi);
});

await e.provaAsync('i tre riquadri si riempiono con i numeri del motore', async () => {
  const s = conScrivania({
    quote_polizze: [
      { data_scadenza: '2027-01-01', premio_annuo: 400 },
      { data_scadenza: '2027-02-01', premio_annuo: 220 },
      { data_scadenza: '2027-03-01', premio_annuo: null }
    ],
    quote_preventivi: [
      { creato_il: OGGI, polizza_emessa: true, polizza_il: OGGI },
      { creato_il: OGGI, polizza_emessa: false }
    ],
    quote_titoli: [{ incassato_il: OGGI, importo_lordo: 150 }]
  });
  await s.ctx.caricaKpiScrivania(true);
  const h = dentro(s);
  deve(/620,00 €/.test(h), 'il premio in gestione non è quello del motore: ' + h.slice(0, 300));
  deve(/2 polizze attive|<b>3<\/b> polizze attive/.test(h), 'non dice quante polizze sono attive');
  /* La polizza senza premio non sparisce in silenzio: il totale dichiara di
     essere incompleto (§8.1, §17). */
  deve(/non entra nel totale/.test(h), 'la polizza senza premio sparisce senza dirlo');
  deve(/150,00 €/.test(h), 'l’incassato del mese non arriva nella striscia');
  deve(/conversione <b>50%<\/b>/.test(h), 'la conversione non si legge: ' + h);
});

await e.provaAsync('UNA LETTURA CHE CADE NON SPEGNE LE ALTRE', async () => {
  /* Il 20/09/2026 sette letture in una `Promise.all` che rilancia hanno spento
     Gestione compagnie per una colonna sbagliata: le sei che funzionavano non
     le ha viste nessuno (§35). Qui si misura che non possa ripetersi. */
  const s = conScrivania({
    quote_polizze: new Error('column "boh" does not exist'),
    quote_preventivi: [{ creato_il: OGGI, polizza_emessa: true, polizza_il: OGGI }],
    quote_titoli: [{ incassato_il: OGGI, importo_lordo: 99 }]
  });
  await s.ctx.caricaKpiScrivania(true);
  const h = dentro(s);
  deve(/99,00 €/.test(h), 'la lettura caduta ha portato giù anche le altre');
  /* E la caduta si dichiara col suo nome, invece di mostrare uno zero: uno
     zero su un portafoglio è la bugia più comoda di una scrivania. */
  deve(/Non si è potuto leggere/.test(h), 'la lettura caduta non si dichiara');
  deve(!/Portafoglio<\/div><div class="kpi-v">0,00 €/.test(h), 'il portafoglio non letto vale zero');
  deve(/kpi-ko/.test(h), 'il riquadro caduto non si distingue dagli altri');
});

await e.provaAsync('senza preventivi non esce una percentuale, e nemmeno un +∞', async () => {
  /* La conversione divisa per zero e la crescita calcolata su un mese vuoto
     sono i due numeri enormi e falsi che una scrivania produce da sola. */
  const s = conScrivania({ quote_polizze: [], quote_preventivi: [], quote_titoli: [] });
  await s.ctx.caricaKpiScrivania(true);
  const h = dentro(s);
  deve(/non si calcola/.test(h), 'senza preventivi la conversione esce lo stesso');
  deve(!/%/.test(h.replace(/conversione[^<]*/g, '')), 'da un mese vuoto esce una percentuale: ' + h);
  deve(/come prima/.test(h), 'un mese vuoto contro un mese vuoto non si legge in parole');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
