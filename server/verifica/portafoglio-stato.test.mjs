// ═══════════════════════════════════════════════════════════════════════════════
//  POLIZZE ATTIVE, CLIENTI PERSI, SIGLE DEI TITOLI
//
//  Tre definizioni che decidono chi Francesco chiama e chi no. Sbagliarle non
//  dà errore: dà un portafoglio che sembra sano, o un cliente segnato in rosso
//  che invece è vivo e se ne accorge quando lo chiamiamo per riconquistarlo.
//
//  Quello che deve restare vero, e perché — ogni numero qui è misurato
//  sull'archivio vero il 26/09/2026, non inventato:
//
//    1. ATTIVA NON VUOL DIRE «IN DATA». In archivio ci sono **34 polizze
//       annullate che scadono in futuro**. Contarle fra le attive vuol dire
//       credere coperto un cliente che non lo è.
//
//    2. PERSO VUOL DIRE «NE AVEVA E NON NE HA PIÙ». Le **58 anagrafiche che
//       non hanno mai avuto una polizza** sono contatti, non perdite: segnarle
//       in rosso vorrebbe dire dichiarare un fallimento per un preventivo mai
//       chiuso. (2.547 anagrafiche: 1.925 con almeno una attiva, 564 perse,
//       58 mai clienti.)
//
//    3. LA DATA DELLA PERDITA È QUELLA DELL'ANNULLAMENTO, quando c'è. Nei
//       dati veri c'è una polizza annullata il 03/07/2026 che scadeva il
//       14/09: prendere la scadenza vuol dire cercare il cliente due mesi
//       dopo averlo perso.
//
//    4. QR E QF NON SONO LA STESSA COSA. Una quietanza di RINNOVO non
//       incassata è un cliente che se n'è andato; una di FRAZIONAMENTO non
//       incassata è una rata scoperta di un cliente che c'è ancora. Se si
//       confondessero, ogni rata in ritardo diventerebbe una perdita.
//
//    5. QUELLO CHE NON SI SA NON SI INVENTA. Senza la mappa dei titoli
//       «non ha rinnovato» resta `null`, che non è `false`. Una sigla che il
//       dizionario non conosce torna `null`, non la più probabile.
//
//    6. `copertura_al` NON ENTRA NEL GIUDIZIO. È la colonna «pagata fino
//       al» che il flusso SSF riempie con `SCADENZA_INCASSATO`, e su 574
//       polizze PRIMA è più corta della scadenza. Usarla per decidere chi è
//       attivo farebbe **45 clienti persi che non lo sono**. Misurato.
// ═══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../../tariffe/motore/portafoglio-stato.js');

const OGGI = '2026-09-26';

const esiti = [];
function prova(nome, fn) {
  try { fn(); esiti.push([true, nome, '']); }
  catch (e) { esiti.push([false, nome, e.message]); }
}
function deve(c, msg) { if (!c) throw new Error(msg); }

/* Una polizza come la scrive l'archivio: solo i campi che contano qui. */
function polizza(x) {
  return Object.assign({ id: 'p1', data_effetto: '2025-09-26', data_scadenza: '2026-12-31',
                         stato_pagamento: 'pagato' }, x || {});
}

/* ── 1. attiva non vuol dire «in data» ───────────────────────────────────── */

prova('una polizza in data e non annullata è attiva', () => {
  const s = S.statoPolizza(polizza({ data_scadenza: '2026-12-31' }), OGGI);
  deve(s.attiva === true, 'dichiarata non attiva: ' + s.etichetta);
  deve(s.motivo === 'in_corso', s.motivo);
  deve(s.finitaIl === null, 'una polizza che copre non ha una data di fine: ' + s.finitaIl);
});

prova('una ANNULLATA che scade in futuro NON è attiva — sono 34 in archivio', () => {
  /* Il difetto vero che questa prova chiude: chi filtra `data_scadenza >=
     oggi` e basta si porta dentro 34 polizze annullate, e 34 clienti che
     crede coperti. */
  const p = polizza({ data_scadenza: '2026-12-31', stato_pagamento: 'annullata',
                      dati: { ssf: { data_annullamento: '2026-07-03' } } });
  const s = S.statoPolizza(p, OGGI);
  deve(s.attiva === false, 'un\'annullata è risultata attiva');
  deve(s.motivo === 'annullata', s.motivo);
  deve(/03\/07\/2026/.test(s.etichetta), 'l\'etichetta non dice quando: ' + s.etichetta);
});

prova('vale anche scritto al maschile — «annullato» non è un altro stato', () => {
  deve(S.attiva(polizza({ stato_pagamento: 'annullato' }), OGGI) === false, 'annullato passato per attivo');
  deve(S.attiva(polizza({ stato_pagamento: 'ANNULLATA' }), OGGI) === false, 'maiuscolo passato per attivo');
});

prova('l\'ultimo giorno copre ancora: scadenza = oggi è attiva', () => {
  /* Chi scrive `scadenza > oggi` perde un giorno di copertura, e quel giorno
     è esattamente quello in cui si rinnova. */
  deve(S.attiva(polizza({ data_scadenza: OGGI }), OGGI) === true, 'la scadenza di oggi ha spento la polizza');
});

prova('una scaduta dice quando è finita, e la data è la scadenza', () => {
  const s = S.statoPolizza(polizza({ data_scadenza: '2026-03-14' }), OGGI);
  deve(s.attiva === false && s.motivo === 'scaduta', s.motivo);
  deve(s.finitaIl === '2026-03-14', s.finitaIl);
});

prova('`copertura_al` non entra nel giudizio: 45 clienti non sono persi', () => {
  /* La colonna dice «pagata fino al» (il flusso SSF ci scrive
     `SCADENZA_INCASSATO`) e su 574 polizze PRIMA è più corta della scadenza,
     su 155 è già passata mentre la polizza corre. Se il motore la guardasse,
     45 clienti attivi diventerebbero «persi» e finirebbero in rosso. */
  const p = polizza({ data_scadenza: '2026-12-31', copertura_al: '2025-11-06' });
  deve(S.attiva(p, OGGI) === true, 'una colonna di pagamento ha spento una polizza in corso');
});

prova('senza data di scadenza non si afferma che copre — ma non è «scaduta»', () => {
  const s = S.statoPolizza(polizza({ data_scadenza: null }), OGGI);
  deve(s.attiva === false, 'una polizza senza scadenza è stata dichiarata attiva');
  deve(s.motivo === 'senza_scadenza', s.motivo);
  deve(s.finitaIl === null, 'le ha dato una data di fine che non ha: ' + s.finitaIl);
});

prova('senza sapere che giorno è, non si afferma niente', () => {
  const s = S.statoPolizza(polizza(), null);
  deve(s.attiva === false && s.motivo === 'senza_oggi', s.motivo);
});

/* ── 2. perso vuol dire «ne aveva e non ne ha più» ────────────────────────── */

prova('chi non ha mai avuto una polizza NON è perso: è un prospect — sono 58', () => {
  const c = S.statoCliente([], OGGI);
  deve(c.stato === 'mai_avuto', c.stato);
  deve(c.perso === false, 'un contatto è stato segnato come perso');
  deve(c.prospect === true, 'non è marcato come prospect: ' + c.prospect);
  deve(c.etichetta === 'Prospect', c.etichetta);
  deve(c.persoIl === null, c.persoIl);
});

prova('perso e prospect non si sovrappongono mai: sono due liste diverse', () => {
  /* Uno si richiama per riconquistarlo, l'altro per vendergli la prima
     polizza. Se una scheda potesse essere tutte e due, il colore in elenco
     non vorrebbe dire niente. */
  const casi = [[], [polizza({ data_scadenza: '2026-01-01' })], [polizza({ data_scadenza: '2027-01-01' })],
                [polizza({ data_scadenza: null })]];
  for (const l of casi) {
    const c = S.statoCliente(l, OGGI);
    deve(!(c.perso && c.prospect), 'stato ' + c.stato + ': perso e prospect insieme');
  }
});

prova('un cliente che ha comprato una volta non torna prospect quando la perde', () => {
  const c = S.statoCliente([polizza({ data_scadenza: '2025-12-31' })], OGGI);
  deve(c.stato === 'perso', c.stato);
  deve(!c.prospect, 'un cliente perso è stato riclassificato come prospect: si perderebbe fra i mai clienti');
});

prova('nemmeno con l\'elenco assente si inventa una perdita', () => {
  deve(S.statoCliente(null, OGGI).perso === false, 'elenco null ha prodotto un perso');
  deve(S.statoCliente([null, undefined], OGGI).stato === 'mai_avuto', 'righe vuote contate come polizze');
});

prova('una sola attiva in mezzo a dieci morte e il cliente è vivo', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2024-01-01' }),
             polizza({ id: 'b', data_scadenza: '2025-05-05' }),
             polizza({ id: 'c', data_scadenza: '2027-01-01' })];
  const c = S.statoCliente(l, OGGI);
  deve(c.stato === 'attivo', c.stato);
  deve(c.attive === 1, c.attive);
  deve(c.perso === false, 'un cliente con una polizza attiva è stato segnato perso');
});

prova('un\'annullata in data non tiene in vita il cliente', () => {
  /* È il caso 1 che diventa il caso 2: la polizza sembra attiva, il cliente
     sembra a posto, e nessuno lo richiama. */
  const l = [polizza({ id: 'a', data_scadenza: '2027-06-30', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-05-10' } } })];
  const c = S.statoCliente(l, OGGI);
  deve(c.stato === 'perso', c.stato);
  deve(c.persoIl === '2026-05-10', c.persoIl);
});

prova('la data della perdita è l\'ULTIMA copertura finita, non la prima', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2023-02-02' }),
             polizza({ id: 'b', data_scadenza: '2026-08-31' }),
             polizza({ id: 'c', data_scadenza: '2024-11-11' })];
  const c = S.statoCliente(l, OGGI);
  deve(c.perso === true, 'tutte scadute e non risulta perso');
  deve(c.persoIl === '2026-08-31', 'ha preso ' + c.persoIl + ' invece dell\'ultima copertura');
});

prova('per un\'annullata conta l\'annullamento, non la scadenza — mesi di differenza', () => {
  /* Il caso vero: annullata il 03/07/2026, scadenza originale 14/09/2026. */
  const l = [polizza({ id: 'a', data_scadenza: '2026-09-14', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-07-03' } } })];
  const c = S.statoCliente(l, OGGI);
  deve(c.persoIl === '2026-07-03', 'ha preso ' + c.persoIl + ': due mesi di ritardo su una telefonata');
});

prova('l\'annullamento si legge da tutti i posti dove i flussi lo scrivono', () => {
  /* Tre posti perché in tre posti lo scrivono, e il terzo è l'alias che un
     lettore si fa (`dati->ssf->>data_annullamento`) per non scaricare 5 MB di
     jsonb per una data sola. Se il motore non lo riconoscesse, la scheda
     cliente direbbe «Annullata» senza il giorno — proprio dove serve. */
  deve(S.dataAnnullamento({ dati: { data_annullamento: '2026-01-02' } }) === '2026-01-02', 'radice');
  deve(S.dataAnnullamento({ dati: { ssf: { data_annullamento: '2026-01-03' } } }) === '2026-01-03', 'ssf');
  deve(S.dataAnnullamento({ data_annullamento: '2026-01-04' }) === '2026-01-04', 'colonna piatta o alias');
  deve(S.dataAnnullamento({ dati: {} }) === null, 'ha inventato una data');
  deve(S.dataAnnullamento({}) === null, 'ha inventato una data dal niente');
});

prova('il motivo dello storno si legge dagli stessi tre posti', () => {
  deve(S.motivoStorno({ motivo_storno: 'VENDITA' }) === 'VENDITA', 'piatto');
  deve(S.motivoStorno({ dati: { motivo_storno: 'DISDETTA' } }) === 'DISDETTA', 'radice');
  deve(S.motivoStorno({ dati: { ssf: { motivo_storno: 'FURTO' } } }) === 'FURTO', 'ssf');
  deve(S.motivoStorno({ dati: { ssf: { motivo_storno: '   ' } } }) === null, 'spazi passati per motivo');
  deve(S.motivoStorno({}) === null, 'motivo inventato');
});

prova('la polizza annullata porta il motivo anche quando arriva come alias', () => {
  const s = S.statoPolizza(polizza({ stato_pagamento: 'annullata',
    data_annullamento: '2026-04-01', motivo_storno: 'VENDITA' }), OGGI);
  deve(s.motivoStorno === 'VENDITA', s.motivoStorno);
  deve(s.dataStimata !== true, 'ha creduto di non avere la data che aveva');
  deve(/01\/04\/2026/.test(s.etichetta), s.etichetta);
});

prova('un\'annullata senza data non finge di averla: lo dichiara', () => {
  const s = S.statoPolizza(polizza({ stato_pagamento: 'annullata', data_scadenza: '2027-01-01' }), OGGI);
  deve(s.attiva === false, 'attiva');
  deve(s.dataStimata === true, 'ha spacciato per certa una data di ripiego');
  deve(s.etichetta === 'Annullata', 'l\'etichetta promette una data che non c\'è: ' + s.etichetta);
});

prova('il motivo dello storno arriva in superficie', () => {
  /* Serve a capire se il cliente è recuperabile: una vendita dell\'auto non
     è una disdetta per prezzo. */
  const s = S.statoPolizza(polizza({ stato_pagamento: 'annullata',
    dati: { ssf: { data_annullamento: '2026-04-01', motivo_storno: 'VENDITA' } } }), OGGI);
  deve(s.motivoStorno === 'VENDITA', s.motivoStorno);
});

prova('una polizza senza scadenza non fa un cliente perso: fa un dubbio', () => {
  /* Rosso vuol dire «l\'abbiamo perso». Metterci uno solo perché una data
     manca in archivio è un\'accusa sbagliata: oggi in archivio sono zero, e
     questa prova serve a che restino zero anche domani. */
  const c = S.statoCliente([polizza({ data_scadenza: null })], OGGI);
  deve(c.perso === false, 'un dato mancante ha prodotto un cliente in rosso');
  deve(c.stato === 'da_verificare', c.stato);
});

prova('il perso dice anche perché, polizza per polizza', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2026-01-31' }),
             polizza({ id: 'b', data_scadenza: '2026-08-01', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-06-01' } } })];
  const c = S.statoCliente(l, OGGI);
  deve(c.perche.length === 2, 'spiegazioni: ' + c.perche.length);
  deve(c.perche.some(t => /Scaduta il 31\/01\/2026/.test(t)), c.perche.join(' | '));
  deve(c.perche.some(t => /Annullata il 01\/06\/2026/.test(t)), c.perche.join(' | '));
});

/* ── 3. le sigle: NP, QR, QF, AP, SO ─────────────────────────────────────── */

prova('le cinque sigle sono quelle dell\'agenzia, con il nome per esteso', () => {
  const attese = { NP: 'Nuova polizza', QR: 'Quietanza di rinnovo',
                   QF: 'Quietanza di frazionamento', AP: 'Appendice', SO: 'Sostituzione' };
  for (const k of Object.keys(attese)) {
    deve(S.nomeTipo(k) === attese[k], k + ' → ' + S.nomeTipo(k));
  }
  deve(Object.keys(S.TIPI).length === 5, 'sono ' + Object.keys(S.TIPI).length + ' sigle');
});

prova('ogni sigla cade in un valore che il database ammette davvero', () => {
  /* Il CHECK di `quote_titoli.tipo` ne ammette quattro. Una sigla che mappa
     su un quinto valore fa fallire l\'inserimento a metà importazione. */
  const AMMESSI = ['prima_rata', 'rata', 'quietanza', 'appendice'];
  for (const k of Object.keys(S.TIPI)) {
    deve(AMMESSI.indexOf(S.TIPI[k].tipo) >= 0, k + ' vuole scrivere «' + S.TIPI[k].tipo + '»');
  }
});

prova('NP e SO finiscono nello stesso `tipo`, e restano comunque distinte', () => {
  /* È il motivo per cui la sigla serve: `prima_rata` da sola non dice se era
     una polizza nuova o la sostituzione di una che c\'era. */
  deve(S.TIPI.NP.tipo === S.TIPI.SO.tipo, 'non condividono più il tipo: la prova va riscritta');
  deve(S.sigla('NP') !== S.sigla('SO'), 'le due sigle si sono confuse');
});

prova('il dizionario riconosce come scrivono le compagnie', () => {
  const casi = [['NP', 'NP'], ['PN', 'NP'], ['nuova polizza', 'NP'], ['Polizza Nuova', 'NP'],
                ['QR', 'QR'], ['QZ', 'QR'], ['quietanza di rinnovo', 'QR'], ['RINNOVO', 'QR'],
                ['QF', 'QF'], ['frazionamento', 'QF'], ['rata', 'QF'],
                ['AP', 'AP'], ['Appendice', 'AP'],
                ['SO', 'SO'], ['sostituzione', 'SO'], ['polizza sostituita', 'SO']];
  for (const [dentro, fuori] of casi) {
    deve(S.sigla(dentro) === fuori, '«' + dentro + '» → ' + S.sigla(dentro) + ' invece di ' + fuori);
  }
});

prova('spazi, maiuscole e punteggiatura non cambiano la sigla', () => {
  deve(S.sigla('  q.r.  ') === 'QR', S.sigla('  q.r.  '));
  deve(S.sigla('Quietanza  di   Rinnovo') === 'QR', S.sigla('Quietanza  di   Rinnovo'));
});

prova('quello che non conosce torna `null`: non indovina', () => {
  /* Indovinare qui costa caro: una sigla sbagliata su una quietanza fa un
     cliente «perso» che invece ha rinnovato, o il contrario. */
  for (const v of ['XX', 'ZZ9', 'quietanza di qualcosa', 'prima_rata_bis', '', null, undefined, 0, {}]) {
    deve(S.sigla(v) === null, JSON.stringify(v) + ' → ' + S.sigla(v));
  }
  deve(S.nomeTipo('XX') === null, 'ha dato un nome a una sigla che non esiste');
});

/* ── 4. non ha rinnovato: QR sì, QF no ───────────────────────────────────── */

const persa = [polizza({ id: 'p1', data_scadenza: '2026-06-30' })];

prova('una QR non incassata vuol dire che non ha rinnovato', () => {
  const c = S.statoCliente(persa, OGGI, { p1: [{ tipo: 'quietanza', sigla_tipo: 'QR', stato: 'aperto' }] });
  deve(c.perso === true, c.stato);
  deve(c.nonHaRinnovato === true, 'nonHaRinnovato = ' + c.nonHaRinnovato);
  deve(c.quietanzeDiRinnovoViste === 1, c.quietanzeDiRinnovoViste);
});

prova('una QF non incassata NON è un mancato rinnovo: è una rata scoperta', () => {
  /* Senza questa distinzione ogni rata in ritardo diventa una perdita, e la
     lista dei clienti da riconquistare si riempie di gente che c\'è ancora. */
  const c = S.statoCliente(persa, OGGI, { p1: [{ tipo: 'rata', sigla_tipo: 'QF', stato: 'aperto' }] });
  deve(c.nonHaRinnovato === false, 'una rata scoperta è stata letta come mancato rinnovo');
  deve(c.quietanzeDiRinnovoViste === 0, c.quietanzeDiRinnovoViste);
});

prova('una QR incassata e poi scaduta: ha rinnovato, l\'ha perso dopo', () => {
  const c = S.statoCliente(persa, OGGI, { p1: [{ tipo: 'quietanza', sigla_tipo: 'QR', stato: 'incassato' }] });
  deve(c.perso === true, 'resta perso: la polizza è scaduta');
  deve(c.nonHaRinnovato === false, 'una quietanza incassata ha prodotto un mancato rinnovo');
  deve(c.quietanzeDiRinnovoViste === 1, c.quietanzeDiRinnovoViste);
});

prova('senza la mappa dei titoli resta `null`, che non è `false`', () => {
  /* `false` direbbe «non è un mancato rinnovo». Il vero è «non lo so»: il
     filtro del CRM deve poter distinguere, altrimenti mostra come certezza
     una mancanza di dati. */
  const c = S.statoCliente(persa, OGGI);
  deve(c.nonHaRinnovato === null, 'ha risposto ' + c.nonHaRinnovato + ' senza avere i titoli');
  deve(c.nonHaRinnovato !== false, 'null si è trasformato in false');
});

prova('la mappa vuota per quella polizza è un\'informazione: nessuna QR vista', () => {
  const c = S.statoCliente(persa, OGGI, { p1: [] });
  deve(c.nonHaRinnovato === false, c.nonHaRinnovato);
  deve(c.quietanzeDiRinnovoViste === 0, c.quietanzeDiRinnovoViste);
});

prova('la sigla si legge anche da come la scrive la compagnia', () => {
  /* `sigla_tipo` è la colonna nostra; `tipo_compagnia` è quello che arriva
     dal flusso. Se la nostra manca si guarda quella, PRIMA di ripiegare su
     `tipo`, che le sigle non le distingue.

     Il caso è scelto perché i due si contraddicono: `tipo` dice `rata` (che
     è QF) e la compagnia dice `QZ` (che è QR). Se il motore smettesse di
     guardare la compagnia, la risposta non darebbe errore — direbbe
     tranquillamente «ha solo una rata scoperta» su un cliente che non ha
     rinnovato. Con un campione dove `tipo` è già «quietanza» questa prova
     restava verde anche col guasto dentro: era una frase. */
  const c = S.statoCliente(persa, OGGI, { p1: [{ tipo: 'rata', tipo_compagnia: 'QZ', stato: 'aperto' }] });
  deve(c.quietanzeDiRinnovoViste === 1, 'quietanze di rinnovo viste: ' + c.quietanzeDiRinnovoViste);
  deve(c.nonHaRinnovato === true, 'la sigla della compagnia non è stata letta');
});

prova('la nostra colonna batte quella della compagnia, non il contrario', () => {
  /* `sigla_tipo` è quella che si corregge a mano quando il flusso sbaglia:
     se perdesse contro il flusso, la correzione non servirebbe a niente. */
  const c = S.statoCliente(persa, OGGI, { p1: [{ sigla_tipo: 'QF', tipo_compagnia: 'QR', tipo: 'quietanza', stato: 'aperto' }] });
  deve(c.quietanzeDiRinnovoViste === 0, 'ha letto il flusso al posto della nostra colonna');
  deve(c.nonHaRinnovato === false, c.nonHaRinnovato);
});

prova('una sola QR non incassata basta, in mezzo alle altre incassate', () => {
  const l = [polizza({ id: 'p1', data_scadenza: '2026-06-30' }),
             polizza({ id: 'p2', data_scadenza: '2026-07-31' })];
  const c = S.statoCliente(l, OGGI, {
    p1: [{ sigla_tipo: 'QR', stato: 'incassato' }],
    p2: [{ sigla_tipo: 'QR', stato: 'aperto' }],
  });
  deve(c.nonHaRinnovato === true, 'la QR non incassata si è persa dietro quella incassata');
  deve(c.quietanzeDiRinnovoViste === 2, c.quietanzeDiRinnovoViste);
});

prova('su un cliente attivo non si parla di mancato rinnovo', () => {
  const c = S.statoCliente([polizza({ id: 'p1', data_scadenza: '2027-01-01' })], OGGI,
                           { p1: [{ sigla_tipo: 'QR', stato: 'aperto' }] });
  deve(c.stato === 'attivo', c.stato);
  deve(!('nonHaRinnovato' in c) || c.nonHaRinnovato == null, 'un cliente attivo non è un mancato rinnovo');
});

/* ── 4bis. come l'abbiamo perso: scadenza o disdetta ──────────────────────── */

prova('finita alla sua scadenza: non ha rinnovato — sono 511 in archivio', () => {
  const c = S.statoCliente([polizza({ data_scadenza: '2026-06-30' })], OGGI);
  deve(c.motivoPerdita === 'non_rinnovata', c.motivoPerdita);
  deve(c.persoAlRinnovo === true, 'persoAlRinnovo = ' + c.persoAlRinnovo);
});

prova('annullata a metà: è una disdetta, non un mancato rinnovo — sono 54', () => {
  /* Sono due lavori commerciali diversi: uno si richiama con un preventivo,
     l'altro ha avuto un motivo e prima lo si vuole sapere. */
  const c = S.statoCliente([polizza({ data_scadenza: '2027-01-01', stato_pagamento: 'annullata',
                                      dati: { ssf: { data_annullamento: '2026-05-10' } } })], OGGI);
  deve(c.motivoPerdita === 'annullata', c.motivoPerdita);
  deve(c.persoAlRinnovo === false, 'una disdetta a metà è stata contata come mancato rinnovo');
});

prova('il motivo lo dà l\'ULTIMA polizza finita, non la prima', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2027-01-01', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2024-01-01' } } }),
             polizza({ id: 'b', data_scadenza: '2026-07-31' })];
  const c = S.statoCliente(l, OGGI);
  deve(c.persoIl === '2026-07-31', c.persoIl);
  deve(c.motivoPerdita === 'non_rinnovata', 'ha guardato l\'annullamento di due anni prima');
});

prova('e vale anche al contrario: l\'ultima è una disdetta, la vecchia una scadenza', () => {
  /* Questo caso serve a che la prova di sopra non passi per caso: là la
     risposta giusta e quella sbagliata coincidevano. Qui no — se il motore
     guardasse tutte le polizze finite invece dell'ultima, direbbe «non ha
     rinnovato» di un cliente che ha disdetto due mesi fa. */
  const l = [polizza({ id: 'vecchia', data_scadenza: '2025-03-31' }),
             polizza({ id: 'ultima', data_scadenza: '2027-01-01', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-07-20' } } })];
  const c = S.statoCliente(l, OGGI);
  deve(c.persoIl === '2026-07-20', c.persoIl);
  deve(c.motivoPerdita === 'annullata', 'ha guardato una scadenza di un anno prima: ' + c.motivoPerdita);
  deve(c.persoAlRinnovo === false, 'una disdetta è finita fra i mancati rinnovi');
});

prova('a pari data vince «non rinnovata»: è quella su cui c\'è da lavorare', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2026-06-30' }),
             polizza({ id: 'b', data_scadenza: '2026-09-01', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-06-30' } } })];
  const c = S.statoCliente(l, OGGI);
  deve(c.motivoPerdita === 'non_rinnovata', c.motivoPerdita);
});

prova('una QR non incassata basta da sola, anche su una disdetta', () => {
  /* Se la compagnia ha emesso la quietanza di rinnovo e non è stata
     incassata, quello È un mancato rinnovo detto dalla compagnia: vale più
     di qualunque deduzione dalle date. */
  const c = S.statoCliente([polizza({ id: 'p1', data_scadenza: '2027-01-01', stato_pagamento: 'annullata',
                                      dati: { ssf: { data_annullamento: '2026-05-10' } } })], OGGI,
                           { p1: [{ sigla_tipo: 'QR', stato: 'aperto' }] });
  deve(c.motivoPerdita === 'annullata', 'il motivo resta quello che dicono le date: ' + c.motivoPerdita);
  deve(c.persoAlRinnovo === true, 'la quietanza di rinnovo non incassata è stata ignorata');
});

prova('un cliente che non è perso non ha una data di perdita', () => {
  /* Questa è un'INVARIANTE su cui si appoggia il filtro del CRM: là il filtro
     per date scarta chi non è perso, e se domani `persoIl` comparisse anche su
     un cliente attivo — per dire «l'ultima copertura finita», che è una cosa
     sensata da volere — quel filtro comincerebbe a pescare clienti vivi. Un
     errore che non si vede: la lista esce. Se questa prova diventa rossa, va
     riletta la guardia in `crm-analisi.js`, non aggiustata questa. */
  const casi = [[], [polizza({ data_scadenza: '2027-01-01' })],
                [polizza({ id: 'a', data_scadenza: '2027-01-01' }), polizza({ id: 'b', data_scadenza: '2024-01-01' })],
                [polizza({ data_scadenza: null })]];
  for (const l of casi) {
    const c = S.statoCliente(l, OGGI);
    if (c.stato === 'perso') continue;
    deve(c.persoIl == null, 'stato «' + c.stato + '» con persoIl = ' + c.persoIl);
  }
});

prova('un cliente perso ha SEMPRE una data di perdita', () => {
  /* L'altra metà della stessa invariante: senza la data, un perso non si
     potrebbe collocare nel tempo e sparirebbe da ogni filtro per periodo —
     cioè dall'unico modo che Francesco ha di lavorarli a scaglioni. */
  const casi = [[polizza({ data_scadenza: '2026-01-01' })],
                [polizza({ stato_pagamento: 'annullata', data_scadenza: '2027-01-01',
                           dati: { ssf: { data_annullamento: '2026-02-02' } } })],
                [polizza({ stato_pagamento: 'annullata', data_scadenza: '2026-05-05' })]];
  for (const l of casi) {
    const c = S.statoCliente(l, OGGI);
    deve(c.stato === 'perso', 'il campione non è perso: ' + c.stato);
    deve(!!c.persoIl, 'perso senza data di perdita');
  }
});

prova('un cliente attivo non ha un motivo di perdita', () => {
  const c = S.statoCliente([polizza({ data_scadenza: '2027-01-01' })], OGGI);
  deve(c.motivoPerdita == null, 'ha dato un motivo di perdita a un cliente vivo: ' + c.motivoPerdita);
  deve(!c.persoAlRinnovo, 'lo ha messo fra i persi al rinnovo');
});

/* ── 5. i due mucchi dell'anagrafica ─────────────────────────────────────── */

prova('le attive stanno da una parte, le altre dall\'altra', () => {
  const l = [polizza({ id: 'a', data_scadenza: '2027-03-01' }),
             polizza({ id: 'b', data_scadenza: '2026-02-01' }),
             polizza({ id: 'c', data_scadenza: '2026-11-01' }),
             polizza({ id: 'd', data_scadenza: '2027-01-01', stato_pagamento: 'annullata',
                       dati: { ssf: { data_annullamento: '2026-09-01' } } })];
  const { attive, nonAttive } = S.dividiPolizze(l, OGGI);
  deve(attive.length === 2, 'attive: ' + attive.map(p => p.id).join(','));
  deve(nonAttive.length === 2, 'non attive: ' + nonAttive.map(p => p.id).join(','));
});

prova('le attive ordinate per scadenza più vicina: è la lista delle cose da fare', () => {
  const l = [polizza({ id: 'lontana', data_scadenza: '2027-03-01' }),
             polizza({ id: 'vicina', data_scadenza: '2026-10-01' })];
  const { attive } = S.dividiPolizze(l, OGGI);
  deve(attive[0].id === 'vicina', 'in testa c\'è ' + attive[0].id);
});

prova('le non attive dalla più recente: è la storia, si legge dall\'ultima', () => {
  const l = [polizza({ id: 'vecchia', data_scadenza: '2023-01-01' }),
             polizza({ id: 'recente', data_scadenza: '2026-08-01' })];
  const { nonAttive } = S.dividiPolizze(l, OGGI);
  deve(nonAttive[0].id === 'recente', 'in testa c\'è ' + nonAttive[0].id);
});

prova('ogni riga porta con sé il perché, già scritto', () => {
  const { nonAttive } = S.dividiPolizze([polizza({ id: 'x', data_scadenza: '2026-03-14' })], OGGI);
  deve(nonAttive[0]._stato.motivo === 'scaduta', nonAttive[0]._stato.motivo);
  deve(/14\/03\/2026/.test(nonAttive[0]._stato.etichetta), nonAttive[0]._stato.etichetta);
});

prova('dividere non tocca le polizze di partenza', () => {
  /* Le stesse righe le legge anche il portafoglio: se il motore ci attacca
     roba addosso, se la ritrova una schermata che non l\'ha chiesta. */
  const p = polizza({ id: 'x', data_scadenza: '2026-03-14' });
  S.dividiPolizze([p], OGGI);
  deve(!('_stato' in p), 'ha scritto dentro la polizza originale');
});

/* ── 6. le date, che sono quelle che si sbagliano ─────────────────────────── */

prova('un timestamp resta il suo giorno, non diventa un altro', () => {
  deve(S.giorno('2026-09-26T23:40:00+00:00') === '2026-09-26', S.giorno('2026-09-26T23:40:00+00:00'));
  deve(S.giorno('2026-09-26') === '2026-09-26', 'data secca');
  deve(S.giorno('') === null && S.giorno(null) === null && S.giorno('ieri') === null, 'ha letto una data che non c\'è');
});

prova('le date si scrivono come si leggono in Italia', () => {
  deve(S.italiana('2026-03-14') === '14/03/2026', S.italiana('2026-03-14'));
  deve(S.italiana(null) === '', 'ha scritto qualcosa al posto del niente');
});

prova('un giorno di confine non cambia da un fuso all\'altro', () => {
  /* `new Date()` su una data secca è mezzanotte UTC: in un container UTC la
     differenza non si vede, sul portatile di Francesco sì. Il motore lavora
     sulle stringhe proprio per questo, e questa prova lo tiene fermo. */
  const p = polizza({ data_scadenza: '2026-09-26' });
  const fusi = ['UTC', 'Europe/Rome', 'Pacific/Auckland', 'America/Los_Angeles'];
  const prima = process.env.TZ;
  const risposte = fusi.map(tz => { process.env.TZ = tz; return String(S.attiva(p, '2026-09-26')); });
  process.env.TZ = prima;
  deve(new Set(risposte).size === 1, 'risposte diverse per fuso: ' + fusi.map((t, i) => t + '=' + risposte[i]).join(' '));
});

/* ── esecuzione ─────────────────────────────────────────────────────────── */
let ok = 0;
for (const [passata, nome, msg] of esiti) {
  if (passata) { ok++; console.log('  ✅ ' + nome); }
  else console.log('  ❌ ' + nome + '  — ' + msg);
}
console.log('\n' + (ok === esiti.length ? '🟢' : '🔴') + ' Portafoglio stato: ' + ok + '/' + esiti.length);
process.exit(ok === esiti.length ? 0 : 1);
