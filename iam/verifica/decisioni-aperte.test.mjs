// ═══════════════════════════════════════════════════════════════════════════════
//  DECISIONI APERTE — la schermata  (21/09/2026)
//
//  Le regole stanno nel motore condiviso (`tariffe/motore/decisioni.js`, dieci
//  prove in Node con tre controprove). Qui si sorveglia che la schermata:
//
//   · sia RAGGIUNGIBILE — una schermata che raccoglie quello che manca e che
//     nessuno apre è il guasto numero uno di questo repository, al quadrato;
//   · legga una tabella per voce e non si spenga tutta (§35);
//   · non trasformi una lettura fallita in una voce «a posto» — su questa
//     schermata è la bugia peggiore possibile, perché è il posto dove si va a
//     vedere se manca qualcosa (§12, §18);
//   · non PROPONGA mai un valore da accettare, solo la misura su cui decidere.
//
//  Questa prova fa GIRARE il codice, non solo cercare stringhe.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { ritaglia, stanza, esiti, deve, RADICE } from './banco.mjs';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const scocca = fs.readFileSync(path.join(RADICE, 'withus-one.js'), 'utf8');
const D = require(path.join(RADICE, '..', 'tariffe', 'motore', 'decisioni.js'));
const e = esiti('DECISIONI APERTE');

/* Un archivio finto che risponde tabella per tabella, così si può far cadere
   UNA lettura sola e guardare che cosa succede alle altre. */
function conSchermata(risposte = {}) {
  const chieste = [];
  const db = {
    from(tabella) {
      chieste.push(tabella);
      const r = risposte[tabella];
      const esito = () => (r instanceof Error ? { data: null, error: { message: r.message } }
                                              : { data: r === undefined ? [] : r, error: null });
      const q = {
        select: () => q, order: () => q, limit: () => q, eq: () => q,
        then: (ris, err) => Promise.resolve(esito()).then(ris, err)
      };
      return q;
    }
  };
  const s = stanza(html, ['decVaiA', 'decCarica', 'decRender', 'decHTML'], {
    db,
    altro: {
      DEC_DATI: {}, DEC_ULTIMO: 0,
      Promise, console: { warn() {}, log() {} },
      goTab: (t) => { chieste.push('goTab:' + t); }
    }
  });
  s.ctx.window.Decisioni = D;
  s.ctx.Decisioni = D;
  return { ...s, chieste };
}

const lista = (s) => (s.browser.elemento('dec-lista').innerHTML || '');
const somma = (s) => (s.browser.elemento('dec-somma').innerHTML || '');

e.prova('la schermata è RAGGIUNGIBILE: menu, titolo, rotta e scorciatoia', () => {
  /* §1 al quadrato: una schermata che raccoglie tutto quello che manca, e che
     nessuno apre, è la cosa più inutile che si possa scrivere. */
  deve(/id="panel-decisioni"/.test(html), 'manca il pannello');
  deve(/if \(t === 'decisioni'\)\s*\{ decCarica\(true\); \}/.test(html), 'goTab non avvia la schermata: sarebbe un riquadro vuoto (§6b)');
  deve(/act: 'decisioni', go: function\(\)\{ vai\('decisioni'\); \}/.test(scocca), 'la scocca non ha la voce');
  deve(/decisioni:\s*\['Decisioni aperte', 'Strumenti'\]/.test(scocca), 'manca il titolo della pagina: la briciola direbbe un posto in cui non sei');
  deve(/decisioni: 'strumenti'/.test(scocca), 'la voce non è agganciata a un menu');
  /* E una scorciatoia dalla Scrivania, che è dove si atterra la mattina. */
  deve(/goTab\('decisioni'\)[^>]*><i[^>]*><\/i><span>Decisioni aperte/.test(html.replace(/\s+/g, ' ')),
    'dalla Scrivania non si raggiunge');
  return 'menu + titolo + goTab + Scrivania';
});

await e.provaAsync('le voci si riempiono, e una decisione A METÀ non è fatta', async () => {
  /* Il caso vero del 21/09/2026: un conto su tre dichiara i suoi mezzi. */
  const s = conSchermata({
    iam_conti: [
      { id: 'a', nome: 'Aziendale', tipologia: 'banca', attivo: true, mezzi: [], saldo_iniziale: 0 },
      { id: 'b', nome: 'Pluri', tipologia: 'conto_assicurativo', attivo: true, mezzi: [], saldo_iniziale: 0 },
      { id: 'c', nome: 'HDI', tipologia: 'conto_assicurativo', attivo: true, mezzi: ['pos'], saldo_iniziale: 0 }
    ],
    quote_titoli: [{ mezzo_pagamento: 'carta_credito' }, { mezzo_pagamento: null }],
    sessioni_giornaliere: [{ data_riferimento: '2026-09-16', fondo_cassa: 276 }],
    quote_collaboratori: [{ id: 'p1', fido: null, attivo: true }],
    quote_compagnie: [{ id: 'k1', sospensione_giorni_max: null }]
  });
  await s.ctx.decCarica(true);
  const h = lista(s);
  deve(/1 su 3/.test(h), 'i conti che dichiarano i mezzi non sono 1 su 3: ' + h.slice(0, 300));
  deve(/a metà/.test(h), 'una decisione presa a metà risulta fatta');
  /* E la voce dice che cosa resta spento: è la ragione per cui qualcuno si
     alzerà a farla (§33, «le anomalie hanno il verbo»). */
  deve(/Finché manca:/.test(h), 'le voci non dicono che cosa resta spento');

  /* E QUESTA È LA PARTE CHE SI ROMPE IN SILENZIO. I tre conti hanno
     `saldo_iniziale: 0` e nessuno ha una data di dichiarazione: ZERO NON È
     UNA DECISIONE. Guardando la sola cifra, «il saldo è zero» e «nessuno
     l'ha mai scritto» si leggono uguali — ed è il difetto misurato lo stesso
     giorno sulle anagrafiche che nascono a «no» (§42). Qui si è potuto
     rimediare perché la colonna della data nasce adesso, e questa riga è
     quello che impedisce di tornare indietro. */
  const saldi = D.elenco(s.ctx.DEC_DATI).find(v => v.k === 'saldi_iniziali');
  deve(saldi.fatte === 0 && saldi.su === 3,
    'uno zero mai dichiarato conta come saldo deciso: ' + saldi.fatte + ' su ' + saldi.su);
  deve(saldi.stato === 'aperta', 'i saldi mai dichiarati non risultano da decidere: ' + saldi.stato);
  return '1 su 3 sui mezzi, 0 su 3 sui saldi, e il verbo';
});

await e.provaAsync('UNA LETTURA CHE CADE NON DIVENTA UNA VOCE A POSTO', async () => {
  /* Su questa schermata è la bugia peggiore possibile: è il posto dove si va
     a vedere se manca qualcosa, e un «tutto deciso» che non è vero fa smettere
     di guardare proprio dove c'è il buco (§12, §18). */
  const s = conSchermata({
    iam_conti: [{ id: 'a', nome: 'X', tipologia: 'cassa', attivo: true, mezzi: ['contanti'],
                  iban: 'IT60X0542811101000000123456', rimesse: true, saldo_dichiarato_il: '2026-09-21' }],
    quote_collaboratori: new Error('permission denied'),
    quote_compagnie: [{ id: 'k1', sospensione_giorni_max: 90 }],
    quote_titoli: [{ mezzo_pagamento: 'contanti', collaboratore_id: 'p' }]
  });
  await s.ctx.decCarica(true);
  const h = lista(s), sm = somma(s);
  deve(/non si sa/.test(h), 'la voce non letta non si marca');
  deve(/[Nn]on vuol dire che sia deciso/.test(h), 'non lo dice in faccia');
  /* E il riepilogo smette di poter dire «tutto deciso». */
  deve(!/Tutte le decisioni che il sistema stava aspettando/.test(h),
    'con una voce cieca dice lo stesso che è tutto deciso');
  deve(/Finché ce n’è anche una/.test(sm), 'il riepilogo non avverte che non ha potuto guardare dappertutto');
  /* Le altre voci ci sono comunque: una lettura caduta non porta giù le altre. */
  deve(/Quanti giorni di sospensione/.test(h), 'la lettura caduta ha spento anche le altre voci');
  return 'ignota, dichiarata, e le altre in piedi';
});

await e.provaAsync('la PROVA è una misura, non un valore precompilato', async () => {
  /* «L'ultimo foglio cassa dice 276,00 €» si può controllare e smentire; un
     campo precompilato con 276,00 diventa il fondo cassa vero dopo due
     settimane, e nessuno saprà che l'aveva scritto un programma (§8.1). */
  const s = conSchermata({
    iam_conti: [{ id: 'a', nome: 'Banca', tipologia: 'banca', attivo: true, mezzi: ['bonifico'] }],
    quote_titoli: [{ mezzo_pagamento: 'carta_credito' }, { mezzo_pagamento: 'carta_credito' }],
    sessioni_giornaliere: [{ data_riferimento: '2026-09-16', fondo_cassa: 276 }]
  });
  await s.ctx.decCarica(true);
  const h = lista(s);
  deve(/276,00/.test(h), 'la misura del fondo cassa non arriva nella schermata');
  deve(/non un valore da accettare/.test(h), 'la misura si presenta come un valore da scrivere');
  /* E il mezzo che nessun conto riceve è la prova che fa muovere. */
  deve(/carta_credito/.test(h) && /nessun conto dichiara di riceverlo/.test(h),
    'il mezzo scoperto non si segnala: ' + h.slice(0, 400));
  /* Nessun campo precompilato: da qui non si salva niente. */
  const b = ritaglia(html, 'decCarica') + ritaglia(html, 'decRender') + ritaglia(html, 'decHTML');
  deve(!/\.update\(|\.insert\(|\.upsert\(|\.delete\(/.test(b), 'dalla schermata delle decisioni si scrive');
  return 'due misure, e zero scritture';
});

await e.provaAsync('«non c’è ancora niente da decidere» non è «deciso»', async () => {
  /* Il caso vero: `quote_codici_collaboratore` è vuota perché le righe da
     decidere le scrive l'importazione di un flusso. Contarla come decisa
     direbbe che quel lavoro è finito; contarla come aperta manderebbe a
     cercare una decisione che non esiste. È una terza cosa. */
  const s = conSchermata({
    iam_conti: [{ id: 'a', nome: 'X', tipologia: 'cassa', attivo: true, mezzi: ['contanti'] }],
    quote_codici_collaboratore: []
  });
  await s.ctx.decCarica(true);
  const h = lista(s);
  deve(/le righe da decidere le scrive l’importazione/.test(h), 'non spiega perché non c’è niente');
  deve(/non serve/.test(h), 'la voce senza oggetto non si marca come inerte');
  return 'inerte, con la ragione';
});

e.prova('le voci di QUOTO non promettono di portarti dove non ti portano', () => {
  /* Aprire una pagina PRECISA del preventivatore vorrebbe dire toccare la
     scocca, che è contratto (INTERFACCIA-QUOTO-IAM.md §2.6). Un tasto che
     dice «Apri» e ti lascia altrove è peggio di un tasto che ti porta alla
     porta e ti dice la stanza. */
  const b = ritaglia(html, 'decVaiA');
  deve(/quoto:/.test(b), 'le voci di QUOTO non sono distinte');
  deve(/goTab\('quoto'\)/.test(b), 'non si apre il preventivatore');
  /* E ogni voce porta il suo riferimento, che è la stanza. */
  for (const v of D.VOCI) deve(v.rif && v.rif.length > 8, 'la voce «' + v.k + '» non dice dove si decide');
  return 'porta + stanza scritta';
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
