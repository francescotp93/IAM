// ═══════════════════════════════════════════════════════════════════════════════
//  I SOSPESI E LE MODALITÀ DI PAGAMENTO  (22/09/2026)
//
//  Richiesta di Francesco: una voce di pagamento può essere un COLLABORATORE,
//  e una sezione «Sospesi» deve mostrare, divise per chi li tiene, le polizze
//  da andare a incassare.
//
//  Le regole stanno nel motore (`Contabilita.daIncassare`, `vocabolario`) e
//  hanno le loro prove in `server/verifica/contabilita.test.mjs`. Qui si
//  sorveglia la schermata e la migrazione:
//
//    · il vocabolario è UNA tabella, non sei liste nel codice;
//    · una voce che è una persona non può essere «denaro in casa subito»;
//    · le nove voci di partenza non si cancellano: ci sono appese migliaia di
//      righe fra polizze e rate;
//    · la schermata non ricalcola le regole per conto suo, e non scrive
//      l'incasso: quello lo fa la Fase 2, che è già provata;
//    · «non si è potuto leggere» non diventa «non ce n'è» (§12, §18);
//    · due caricamenti insieme non sommano i contatori (§63-bis).
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(QUI, '..', '..');
const H = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
const Q = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');
const require = createRequire(import.meta.url);
const C = require(path.join(RADICE, 'tariffe', 'motore', 'contabilita.js'));

const MIGR = path.join(RADICE, 'supabase', 'migrations');
function sqlChe(pezzo) {
  const file = fs.readdirSync(MIGR).filter(f => f.endsWith('.sql')).sort()
    .filter(f => fs.readFileSync(path.join(MIGR, f), 'utf8').includes(pezzo));
  if (!file.length) throw new Error('nessuna migrazione contiene ' + pezzo);
  return fs.readFileSync(path.join(MIGR, file[file.length - 1]), 'utf8');
}
const soloSql = s => s.split('\n').filter(r => !/^\s*--/.test(r)).join('\n');
const soloJs = s => s.split('\n').filter(r => !/^\s*(\/\/|\*|\/\*)/.test(r)).join('\n');

const esiti = [];
const prova = (nome, fn) => esiti.push({ nome, fn });
const deve = (c, m) => { if (!c) throw new Error(m); };

function bloccoGrezzo() {
  const i = H.indexOf('/* ═══ I SOSPESI: I PREMI CHE QUALCUNO TIENE (22/09/2026)');
  deve(i >= 0, 'non trovo il blocco spr* in iam/index.html');
  const fine = H.indexOf('/* ═══ LE MODALITÀ DI PAGAMENTO (22/09/2026)', i);
  deve(fine > i, 'non trovo la fine del blocco spr*');
  return H.slice(i, fine);
}
function blocco() { return soloJs(bloccoGrezzo()); }

/* Togliere i commenti riga per riga basta a non far scattare una prova su una
   parola scritta in un commento, ma non basta a leggere le CHIAMATE: una riga
   interna di un commento su piu' righe che comincia con del testo passa lo
   stesso, e le sue parole italiane sembrano funzioni. Si legge carattere per
   carattere, tenendo lo stato «sono dentro un commento» — mai una regex
   globale, che su un documento intero si mangia codice vero. */
/* E le stringhe: dentro un `select` PostgREST o un pezzo di HTML ci sono
   parentesi che sembrano chiamate e non lo sono. */
function senzaStringhe(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      i = j; out += ' '; continue;
    }
    out += c; i++;
  }
  return out;
}

function senzaCommenti(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    out += c; i++;
  }
  return out;
}

/* ═══ LA MIGRAZIONE ════════════════════════════════════════════════════════ */

prova('una voce che è una PERSONA non può essere «denaro in casa subito»', () => {
  /* Se il premio ce l'ha in mano il collaboratore, in cassa dell'agenzia non
     c'è: è un vincolo del database, non una raccomandazione della schermata —
     la schermata è una delle strade, non l'unica. */
  const sql = soloSql(sqlChe('iam_modalita_pagamento'));
  deve(/collaboratore_id is null or contabilizza = 'sospeso'/.test(sql),
    'manca il vincolo che vieta a un collaboratore di essere «subito»');
  deve(/unique index[\s\S]{0,120}collaboratore_id/.test(sql),
    'due voci per la stessa persona sarebbero due elenchi di sospesi, nessuno completo');
  return 'CHECK nel database, e una persona sola per voce';
});

prova('il vincolo CHIUSO a nove valori è diventato una chiave esterna', () => {
  /* Con un CHECK, «Oddo Francesco» non si può nemmeno scrivere. Con la chiave
     esterna il codice deve esistere davvero, e `on delete restrict` impedisce
     di cancellare una voce che ha delle righe appese: «non si cancella, si
     spegne» (§26) smette di essere una raccomandazione. */
  const sql = soloSql(sqlChe('quote_titoli_mezzo_fk'));
  deve(/drop constraint if exists quote_titoli_mezzo_pagamento_check/.test(sql),
    'il CHECK a nove valori è ancora lì: una voce nuova non si potrebbe scrivere');
  deve(/drop constraint if exists quote_polizze_mezzo_pagamento_check/.test(sql), 'idem sulle polizze');
  const fk = (sql.match(/references public\.iam_modalita_pagamento\(codice\)/g) || []).length;
  deve(fk === 2, 'le chiavi esterne dovrebbero essere due (rate e polizze): ' + fk);
  deve(/on delete restrict/.test(sql), 'una voce in uso si potrebbe cancellare');
  /* Senza indice, cancellare una voce leggerebbe per intero migliaia di righe. */
  deve(/quote_titoli_mezzo_idx/.test(sql) && /quote_polizze_mezzo_idx/.test(sql),
    'mancano gli indici sulle colonne che puntano alla tabella');
  return 'CHECK via, due chiavi esterne, due indici';
});

prova('le nove voci di partenza si spengono, non si cancellano', () => {
  const sql = soloSql(sqlChe('iam_modalita_no_delete_sistema'));
  deve(/di_sistema/.test(sql), 'il trigger non guarda se la voce è di sistema');
  deve(/before delete on public\.iam_modalita_pagamento/.test(sql), 'il divieto non è un trigger');
  /* E il seme dice il verso che il motore dichiara da sempre: i contanti sono
     denaro in mano, tutto il resto arriva dopo. Nessun valore inventato. */
  /* Si contano le voci del SEME, non le occorrenze nel file: la parola
     compare anche nel vincolo che elenca i valori ammessi, e una prova che
     conta lì dichiara rotto un seme giusto. */
  const i = sql.indexOf('insert into public.iam_modalita_pagamento');
  deve(i > 0, 'non trovo il seme delle voci di partenza');
  const seme = sql.slice(i, sql.indexOf('on conflict', i));
  const semeSubito = (seme.match(/'subito'/g) || []).length;
  deve(semeSubito === 1, 'più di una voce di partenza è «subito»: solo i contanti lo sono (' + semeSubito + ')');
  deve(/'contante',\s*'Contanti',\s*'subito'/.test(sql), 'i contanti non sono la voce «subito»');
  return '1 sola voce «subito», e il divieto è un trigger';
});

prova('chi legge il vocabolario e chi lo scrive', () => {
  /* Leggere: chiunque abbia un accesso — le tendine che lo usano stanno anche
     nel preventivatore, e tenerlo allo staff vorrebbe dire una tendina vuota
     per un collaboratore (§39). Scrivere: l'admin, perché qui si decide se un
     premio finisce in cassa o in mano a una persona (§26). */
  const sql = soloSql(sqlChe('mod_select on public.iam_modalita_pagamento'));
  deve(/for select to authenticated using \(true\)/.test(sql), 'la lettura non è di tutti');
  deve(/mod_write[\s\S]{0,160}iam_is_admin\(\)/.test(sql), 'la scrittura non è riservata all\'admin');
  return 'tutti leggono, l\'admin scrive';
});

/* ═══ LA SCHERMATA DEI SOSPESI ═════════════════════════════════════════════ */

prova('la schermata non rifà le regole: chiama il motore', () => {
  const b = blocco();
  deve(/Contabilita\.daIncassare\(/.test(b), 'la schermata non chiama il motore');
  /* Nessun raggruppamento fatto a mano: due regole su chi tiene i premi
     sarebbero due elenchi che un giorno direbbero cose diverse (§5). */
  deve(!/mezzo_pagamento\s*===\s*'contante'/.test(b),
    'la schermata decide da sé che cosa è denaro in casa');
  return 'le regole stanno nel motore';
});

prova('quello che la schermata NON riscrive mai: i fatti della rata', () => {
  /* LA REGOLA È CAMBIATA IL 24/09/2026, NON IL NUMERO. Fino a ieri diceva
     «qui non si scrive niente», e l'ha chiesto Francesco: «quando clicco
     scarica le selezionate deve aprirsi una schermata dove posso decidere
     come ho incassato le selezionate, che deve aggiornare il conto per
     aggiornare la quadratura». Quindi adesso un movimento qui nasce.
     Restano vietate le due cose che lo erano per una ragione, e la ragione
     non è cambiata:
       · `quote_titoli` — come il CLIENTE ha pagato è un fatto della
         compagnia, e resta vero anche dopo che il collaboratore ha portato i
         soldi in agenzia. Riscriverlo direbbe una cosa che non è successa.
       · `iam_incassi` — è l'incasso di una rata ANCORA APERTA (Fase 2), e ha
         la sua schermata: rifarlo qui sarebbe la seconda regola su come si
         incassa da un cliente. */
  const b = blocco();
  ['quote_titoli', 'iam_incassi'].forEach(t => {
    deve(!new RegExp("from\\('" + t + "'\\)[\\s\\S]{0,200}\\.(update|insert|upsert|delete)\\(").test(b),
      'la schermata dei sospesi scrive su ' + t);
  });
  /* E il movimento non se lo costruisce da sé: la regola di che cosa si può
     scaricare, su quale conto e con che mezzo sta nel motore, ed è provata in
     Node. Una seconda regola qui sarebbe quella che nessuno guarda. */
  deve(/Contabilita\.pianoScarico\(/.test(b), 'il movimento non passa dal motore');
  const ins = b.slice(b.indexOf('async function sprScaricoRegistra'));
  deve(/from\('iam_movimenti'\)[\s\S]{0,400}\.insert\(/.test(ins),
    'lo scarico non scrive nessun movimento: il conto non si muove e la quadratura non lo sa');
  deve(/selContabTab\('incassa'\)/.test(b), 'il tasto «Incassa» non porta dove si incassa');
  return 'la rata non si riscrive, e il movimento passa dal motore';
});

prova('«non si è potuto leggere» non diventa «non ce n\'è»', () => {
  /* §12, §18: su una lista di soldi da incassare, un elenco vuoto su un
     guasto di lettura è la bugia peggiore. */
  const b = blocco();
  deve(/non vuol dire che non ce ne siano/.test(b), 'un guasto di lettura non si dichiara');
  deve(/SPR_PARZIALE/.test(b), 'non si accorge se la lettura si è fermata a metà');
  deve(/cntTutte\(/.test(b), 'la lettura non è paginata: il server ne manda mille per volta (§50)');
  deve(!/\.limit\(/.test(b), 'c\'è ancora un limite scritto a mano');
  deve(/\.order\(/.test(b), 'la lettura paginata non ha un ordine stabile (§63-bis)');
  return 'paginata, ordinata, e la mancanza dichiarata';
});

prova('due caricamenti insieme non sommano i contatori', () => {
  /* §63-bis: `selContabTab` ne fa partire uno, e chi preme «Aggiorna» mentre
     il primo legge ne fa partire un secondo. */
  const b = blocco();
  deve(/SPR_GIRO/.test(b), 'i giri non sono numerati');
  deve(/mio !== SPR_GIRO/.test(b), 'un giro vecchio può ancora scrivere in schermata');
  return 'ogni giro prende un numero';
});

prova('la linguetta ha il suo inizializzatore', () => {
  /* §6b: una schermata il cui contenuto lo scrive il codice, senza
     inizializzatore, apre un riquadro vuoto. */
  deve(/if \(sub==='sospesi'\) sprCarica\(\);/.test(H), 'la linguetta Sospesi non carica niente');
  /* Il 22/09 questa prova pretendeva che il caricamento da file restasse:
     «una schermata in uso non si spegne perché ne è nata una migliore»
     (§17, §33). Poche ore dopo Francesco ha chiesto di toglierlo, e la sua
     è una decisione, non un difetto. Quello che la regola voleva davvero
     garantire — che togliendolo non si spenga niente — resta, e si misura:
     i dati già caricati si rileggono dalla giornata salvata. */
  deve(!/loadSospesi\(this\)/.test(H), 'il caricamento da file è tornato');
  deve(/Sospesi caricati da file \(storico\)/.test(H),
    'lo storico dei file non si legge più: quei dati sono spariti dalla vista');
  deve(/[Nn]on si aggiorna più/.test(H),
    'un elenco fermo che non dichiara di essere fermo si legge come se fosse vivo');
  return 'la linguetta carica, e lo storico resta leggibile';
});

prova('ogni classe che la schermata scrive ESISTE nel foglio di stile', () => {
  /* Francesco: «si vede tutto un pò confusionario». Non era una scelta
     estetica sbagliata: il blocco scriveva `cl-r`, `cl-main`, `cl-nome`,
     `cnt-pill` e `cnt-card-t/-v/-s`, e NESSUNA di quelle esiste in questo
     foglio di stile. Una classe che non esiste non dà un errore: la regola
     viene ignorata in silenzio e la riga esce nuda, come un gettone che non
     risolve (§44). L'unico modo di accorgersene è misurarlo. */
  const css = (H.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
  const blocco = H.slice(H.indexOf('function sprRender'), H.indexOf('function sprIncassa'));
  const usate = new Set();
  /* Si tengono solo i nomi prefissati (`qualcosa-qualcosa`), che è la regola
     di casa (§26): sono quelli che il blocco scrive davvero, e sono
     esattamente la famiglia dei nomi che erano sbagliati. Le sigle senza
     trattino (`ti`, `entrata`) arrivano da altri fogli o sono modificatori
     annidati, e cercarle qui darebbe un rosso per la strada (§4). */
  for (const m of blocco.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/[^A-Za-z0-9_-]+/)) {
      /* `ti-*` sono i pittogrammi Tabler: vengono da un foglio esterno, e
         cercarli qui darebbe un rosso per la strada (§4). */
      if (/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(c) && !c.startsWith('ti-')) usate.add(c);
    }
  }
  deve(usate.size >= 6, 'la schermata non scrive quasi nessuna classe: la prova non sta misurando');
  const mancanti = [...usate].filter(c => !new RegExp('\\.' + c + '[\\s,.:{]').test(css));
  deve(!mancanti.length,
    'classi che il foglio di stile non conosce, quindi ignorate in silenzio: ' + mancanti.join(', '));
  return usate.size + ' classi, tutte definite';
});

prova('i Sospesi prendono i gettoni del kit come le altre schermate', () => {
  /* Senza, `var(--w1-raggio)` non risolve e la proprietà viene ignorata
     senza un errore: le schede perdono gli angoli e nessuno lo dice (§31). */
  const css = (H.match(/<style[\s\S]*?<\/style>/g) || []).join('\n').replace(/\n/g, ' ');
  deve(/#contab-panel-sospesi\s*[,{][^}]{0,900}--w1-raggio/.test(css),
    'i Sospesi non ricevono i gettoni del kit');
  return 'sul kit come le altre';
});

prova('lo stato è `var`, perché le prove lo iniettano', () => {
  /* §17, §32: con `let` la variabile del blocco e `window.X` sono due cose
     diverse, e una prova che inietta dati finti resterebbe verde senza aver
     misurato niente. */
  ['SPR_RATE', 'SPR_ESITO', 'SPR_ERR', 'SPR_GIRO', 'CNT_MODALITA'].forEach(n => {
    deve(new RegExp('var ' + n + '\\b').test(H), n + ' non è dichiarata con var');
  });
  return 'cinque variabili di stato, tutte var';
});

/* ═══ LE VOCI IN QUOTO ═════════════════════════════════════════════════════ */

prova('le tendine del preventivatore leggono la TABELLA, non una lista chiusa', () => {
  /* Il vocabolario era scritto in sei posti: il CHECK del database, due liste
     nel motore e tre nella pagina. Una voce che si aggiunge toccando sei posti
     è una voce che nessuno aggiunge. */
  const j = soloJs(Q);
  deve(/function mezCarica\(/.test(j), 'QUOTO non legge il vocabolario');
  deve(/from\('iam_modalita_pagamento'\)/.test(j), 'QUOTO non legge la tabella');
  /* Le tendine dove si SCEGLIE devono passare da `mezElenco`: una lista
     scritta a mano non conosce i collaboratori. */
  deve(/mezElenco\(p\.mezzo_pagamento\)/.test(j), 'la scheda del pagamento ha ancora una lista chiusa');
  deve(/function pnuOpzioniMezzo\(\)[\s\S]{0,400}mezElenco\(\)/.test(j),
    '«Nuova polizza» ha ancora una lista chiusa');
  /* E nel markup non devono restare opzioni scritte a mano per la barra dei
     titoli: erano nove, e i collaboratori non c'erano. */
  deve(!/<select id="tit-mezzo"/.test(Q), 'la barra dei titoli ha ancora una tendina scritta nel markup');
  return 'tre tendine sul vocabolario, zero opzioni nel markup';
});

prova('quello che si scrive e non è una voce NON diventa un codice inventato', () => {
  /* §8.1: un nome che non corrisponde a niente resta vuoto, e chi salva lo
     dice. Scriverlo come codice vorrebbe dire una riga di portafoglio che
     punta a una voce che non esiste — e la chiave esterna la rifiuterebbe,
     con un messaggio che nessuno può interpretare. */
  const j = soloJs(Q);
  deve(/function mezScegli\(/.test(j), 'manca la funzione che traduce quello che si scrive');
  deve(/h\.value = m \? m\.k : '';/.test(j), 'un nome che non corrisponde a niente diventa un codice');
  deve(/non è una voce dichiarata/.test(Q), 'salvando non si dice che quel nome non esiste');
  return 'niente voce, niente codice, e lo dice';
});

prova('il vocabolario ha un ripiego: una tendina vuota è peggio di una corta', () => {
  /* Se la tabella non è ancora stata letta — o se la lettura non riesce — le
     nove voci di sempre si vedono lo stesso. E il ripiego NON passa da
     `mezNome`, che chiamerebbe se stesso all'infinito. */
  const j = soloJs(Q);
  deve(/function mezElenco\(/.test(j), 'manca l\'elenco delle voci');
  deve(/return Object\.keys\(TIT_MEZZI\)\.map\(k => \(\{ k, l: TIT_MEZZI\[k\] \}\)\)/.test(j),
    'il ripiego non usa il seme, oppure passa da mezNome e si richiama all\'infinito');
  deve(/MEZ_ERR/.test(j), 'un guasto di lettura del vocabolario non si dichiara');
  return 'nove voci di sempre quando la tabella non risponde';
});


/* ═══ LA PERSONA STA SULLA POLIZZA (22/09/2026) ════════════════════════════
   «se vado in contabilità e sospesi non c'ho nessun tipo di sospeso.
    Realmente lì mi dovrebbe far vedere che Oddo Francesco ha un sospeso, due
    sospesi, tre sospesi, per il valore in euro del totale.»
   Misurato: la voce era su DUE POLIZZE e su ZERO RATE, e la schermata leggeva
   solo la rata — e solo le rate aperte. */

prova('la schermata legge anche il mezzo della POLIZZA, non solo quello della rata', () => {
  const b = blocco();
  deve(/quote_polizze!?[a-z]*\([^)]*mezzo_pagamento/.test(b),
    'non chiede al database il mezzo dichiarato sulla polizza');
  /* Il campo non basta che ci sia: deve portare il valore della POLIZZA.
     Un `mezzo_polizza: null` passa qualunque prova che cerchi solo il nome —
     e la controprova lo ha dimostrato restando verde. */
  deve(/mezzo_polizza: p\.mezzo_pagamento/.test(b),
    'il campo c\'è ma non porta il mezzo dichiarato sulla polizza');
  return 'la polizza dice chi tiene i soldi';
});

prova('le rate GIÀ INCASSATE di chi tiene i premi si leggono, e solo quelle', () => {
  const b = blocco();
  deve(/\.eq\('stato', 'incassato'\)/.test(b), 'le rate incassate non si leggono mai');
  /* Non si scaricano tutte e 2.787: solo quelle di una polizza che una persona
     tiene. Per un mezzo una rata incassata è un accredito in arrivo (§32). */
  deve(/collaboratore_id/.test(b), 'le incassate si leggono senza restringere a chi le tiene');
  deve(/\.in\('quote_polizze\.mezzo_pagamento'/.test(b),
    'non si restringe alle polizze di una persona: scaricherebbe tutto l\'archivio');
  return 'solo le rate di chi le tiene';
});

prova('una rata già in contabilità non ricompare: i posti sono QUATTRO', () => {
  /* §62: guardarne uno solo li dichiara tutti mancanti. */
  const b = blocco();
  ['iam_movimenti', 'iam_movimenti_righe', 'iam_incassi_rate', 'iam_sospesi'].forEach(t => {
    deve(new RegExp("'" + t + "'").test(b), 'non guarda ' + t);
  });
  deve(/in_contabilita/.test(b), 'non dice al motore che quella rata è già entrata');
  /* E se una di queste letture non riesce, la schermata resta in piedi: si
     vedono più sospesi del vero, che è il verso meno pericoloso. */
  deve(/cntMorbida\(/.test(b), 'una tabella che non risponde spegne la schermata');
  return 'quattro strade, e nessuna la fa cadere';
});

prova('le due famiglie si vedono separate, e ognuna porta il suo verbo', () => {
  const b = blocco();
  deve(/spr-fam/.test(b), 'le due famiglie non si distinguono');
  deve(/Il cliente ha gi/.test(b) && /deve ancora pagare/.test(b),
    'non si dice in parole che cosa distingue le due famiglie');
  /* Due azioni diverse: un premio che qualcuno ha in mano si SCARICA dicendo
     su quale conto è arrivato; una rata non pagata si INCASSA. */
  deve(/sprAccredita\(\)/.test(b), 'manca il tasto per scaricare quello che qualcuno tiene');
  deve(/function sprAccredita\(\)\s*\{\s*selContabTab\('incassi'\)/.test(b),
    'scaricare non porta agli incassi da accreditare');
  return 'Scarica e Incassa, e non si confondono';
});

prova('quello che resta fuori si CONTA e si dichiara, con la porta', () => {
  /* §55: un elenco che fa sparire delle righe senza contarle non dice quante
     ne restano e perché. */
  const b = blocco();
  deve(/incassate_fuori/.test(b), 'le rate incassate con un mezzo spariscono senza un numero');
  deve(/Incassi da accreditare/.test(b), 'non dice dove si lavorano');
  return 'il numero, l\'importo e la porta';
});

prova('una PERSONA non è un conto, e l\'incasso si registra lo stesso', () => {
  /* Prima di oggi `destinoIncasso` leggeva la lista di casa: una voce
     aggiunta in schermata risultava «non nel vocabolario», il bottone non
     compariva, e quel premio restava fuori dalla contabilità per sempre. */
  const j = soloJs(H);
  deve(/destinoIncasso\(t, INC_CONTI, INC_MODALITA\)/.test(j),
    'la schermata degli incassi non passa il vocabolario al motore');
  deve(/INC_MODALITA = md\.error \? \[\] : \(md\.data \|\| \[\]\)/.test(j),
    'il vocabolario non si legge, oppure un guasto spegne la schermata');
  deve(/conto_id: d\.conto \? d\.conto\.id : null/.test(j),
    'un sospeso senza conto non si può scrivere: il conto di una persona non esiste');
  return 'il vocabolario arriva, e il conto si sceglie dopo';
});

prova('la schermata disegna DUE SEZIONI, e le persone si aprono da sole', () => {
  /* «ho messo una polizza Carpitella Guido 400 € come pagamento Oddo
     Francesco, quindi dovrebbe andare tra i sospesi... ma non c'è.»
     C'era: era l'ultimo di sette gruppi, sotto 418 righe. */
  const b = blocco();
  deve(/spr-sez/.test(b), 'le due sezioni non hanno un\'intestazione');
  deve(/Chi tiene i premi/.test(b), 'la sezione delle persone non si chiama col suo nome');
  deve(/g\.sezione/.test(b), 'la schermata non usa la sezione decisa dal motore');
  /* I gruppi delle persone sono pochi e sono il lavoro: si aprono da soli
     finché nessuno ha toccato niente. I mezzi no, sono centinaia di righe. */
  deve(/SPR_TOCCATO/.test(b), 'non si distingue l\'apertura automatica da quella a mano');
  deve(/g\.sezione === 'persone'\) SPR_APERTI/.test(b),
    'i gruppi delle persone non si aprono da soli');
  deve(/function sprGruppo\(k\) \{ SPR_TOCCATO = true;/.test(b),
    'aprire o chiudere a mano non spegne l\'apertura automatica');
  /* E il riepilogo in testa dice quante persone tengono dei premi. */
  deve(/Li tiene una persona/.test(b), 'il riepilogo non conta le persone');
  return 'due sezioni, persone in cima e già aperte';
});

/* ═══ IL BANCO CHE FA GIRARE LA SCHERMATA (23/09/2026) ═════════════════════

   Le prove qui sopra leggono il SORGENTE, e per due giorni sono state tutte
   verdi mentre la schermata, aperta da Francesco, era vuota.

   La causa: `sprRender` chiamava una funzione che vive nel preventivatore e
   in questo documento non esiste. Non dava un numero sbagliato — sollevava
   un errore e faceva morire il disegno a metà. Una prova che cerca una
   stringa non può vederlo: la stringa c'è.

   Quindi il banco costruisce un finto database che risponde come PostgREST
   (compreso il filtro sulla tabella agganciata) e fa girare `sprCarica` per
   davvero, sulle due righe vere del 22/09/2026. Se una funzione manca, o se
   la lettura non aggancia, questa prova diventa rossa. */
function bancoSpr(righe, modalita, extra) {
  extra = extra || {};
  const b = bloccoGrezzo();
  const pezzi = ['async function cntTutte(fai)', 'async function cntMorbida(fai)']
    .map(f => {
      const i = H.indexOf(f);
      deve(i >= 0, 'non trovo ' + f);
      const fine = H.indexOf('\n}', i);
      return H.slice(i, fine + 2);
    }).join('\n');
  const elementi = {};
  const nodo = (id) => (elementi[id] = elementi[id] || { id, innerHTML: '', textContent: '', value: '', style: {} });
  ['spr-lista', 'spr-cards', 'spr-avvisi', 'spr-somma', 'spr-mail', 'spr-abbina',
   'spr-ov', 'spr-box', 'spr-sc-mezzo', 'spr-sc-conto', 'spr-sc-data'].forEach(nodo);
  const scaricati = [], mandate = [], scritte = [];
  const doc = {
    getElementById: (id) => elementi[id] || null,
    createElement: () => ({ style: {}, click() {}, remove() {}, setAttribute() {} }),
    body: { appendChild() {}, removeChild() {} }
  };

  /* Il finto PostgREST: quello che conta è che onori il filtro sulla tabella
     agganciata (`quote_polizze.mezzo_pagamento`), che è la strada con cui si
     leggono le rate già incassate di chi tiene i premi. */
  function q(tab) {
    const st = { tab, sel: '', filtri: [], dati: tab === 'quote_titoli' ? righe
      : tab === 'iam_modalita_pagamento' ? modalita
      : tab === 'quote_collaboratori' ? (extra.persone || [])
      : tab === 'iam_conti' ? (extra.conti || [])
      : tab === 'iam_causali' ? (extra.causali || []) : [] };
    const api = {
      update(v) { st.update = v; scritte.push(st); return api; },
      insert(v) { st.insert = v; scritte.push(st); return api; },
      select(x) { st.sel = x || ''; return api; },
      eq(c, v) { st.filtri.push([c, 'eq', v]); return api; },
      in(c, v) { st.filtri.push([c, 'in', v]); return api; },
      not() { return api; }, order() { return api; }, range() { return api; },
      then(res) {
        if (st.insert) {
          if (extra.insertKo) return Promise.resolve(res({ data: null, error: { message: extra.insertKo } }));
          /* IL CASO DI BUG 1 (§47): PostgREST NON dà errore quando la
             scrittura tocca zero righe — `error` è null e `data` è vuoto.
             Senza questo caso nel banco, una prova che crede di misurarlo
             misura solo il ramo dell'errore, e resta verde comunque. */
          if (extra.insertZero) return Promise.resolve(res({ data: [], error: null }));
          const n = Array.isArray(st.insert) ? st.insert.length : 1;
          return Promise.resolve(res({ data: Array.from({ length: n }, (_, i) => ({ id: 'mov' + i })), error: null }));
        }
        if (st.update) return Promise.resolve(res({ data: [{ codice: 'x' }], error: null }));
        let d = st.dati.slice();
        for (const [c, op, v] of st.filtri) {
          if (c.indexOf('.') > 0) {
            const [emb, col] = c.split('.');
            deve(st.sel.indexOf(emb + '!inner(') >= 0,
              'si filtra su ' + c + ' senza !inner: PostgREST non toglierebbe le righe');
            d = d.filter(r => { const e = r[emb] || {}; return op === 'eq' ? e[col] === v : v.indexOf(e[col]) >= 0; });
          } else {
            d = d.filter(r => op === 'eq' ? r[c] === v : v.indexOf(r[c]) >= 0);
          }
        }
        return Promise.resolve(res({ data: d, error: null }));
      }
    };
    return api;
  }
  const src = pezzi + '\n' + b
    + '\nreturn { sprCarica, sprRender, sprApri, sprChiudi, sprSel, sprSelTutte, sprRes,'
    + ' sprExcel, sprMail, sprAbbina, sprScarica, sprDocHTML,'
    + ' sprScaricoApri, sprScaricoRender, sprScaricoRegistra, sprScaricoChiudi,'
    + ' stato: () => ({ esito: SPR_ESITO, err: SPR_ERR, rate: SPR_RATE, dett: SPR_DETT,'
    + ' sel: SPR_SEL, invio: SPR_ESITO_INVIO, scMsg: SPR_SC_MSG, scarico: SPR_SCARICO }) };';
  const f = new Function('document', 'db', 'Contabilita', 'CNT_PASSO', 'CNT_GIRI',
    'esc', 'selContabTab', 'cntOggiIso', 'pntData', 'window', 'mailFetch', 'confirm',
    'logMovimento', 'goTab', 'cntTab', 'Blob', 'URL', 'INCA_PRONTA', 'incaConRate', src);
  const api = f(doc, { from: q }, C, 1000, 50,
    (x) => String(x == null ? '' : x), (t) => scaricati.push(t), () => '2026-09-23',
    (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—'),
    { Contabilita: C },
    (path, opts) => { mandate.push({ path, body: JSON.parse(opts.body) }); return Promise.resolve({}); },
    () => true, () => {}, () => {}, () => {},
    function () { return { size: 0 }; },
    { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    Promise.resolve(), async () => {});
  return { api, el: elementi, scaricati, mandate, scritte };
}

/* Le due righe vere del portafoglio, misurate il 23/09/2026: due polizze la
   cui MODALITÀ è la persona, e le loro rate già incassate. */
const RATE_VERE = [
  { id: 't1', polizza_id: 'p1', tipo: 'quietanza', stato: 'incassato', mezzo_pagamento: null,
    importo_lordo: '262.98', data_decorrenza: '2026-03-16', incassato_il: '2026-09-16',
    quote_polizze: { numero_polizza: 'BLP918634492', cliente: 'SPADA VINCENZO EMANUELE',
      cliente_id: 'c1', compagnia: 'PRIMA', mezzo_pagamento: 'col_oddo_francesco' } },
  { id: 't2', polizza_id: 'p2', tipo: 'premio', stato: 'incassato', mezzo_pagamento: 'carta_credito',
    importo_lordo: '400.00', data_decorrenza: '2026-09-18', incassato_il: '2026-09-18',
    quote_polizze: { numero_polizza: 'BLP831839290', cliente: 'CARPITELLA GUIDO',
      cliente_id: 'c2', compagnia: 'PRIMA', mezzo_pagamento: 'col_oddo_francesco' } },
  { id: 't3', polizza_id: 'p3', tipo: 'quietanza', stato: 'aperto', mezzo_pagamento: 'carta_credito',
    importo_lordo: '100.00', data_decorrenza: '2026-08-01', incassato_il: null,
    quote_polizze: { numero_polizza: 'X1', cliente: 'ROSSI', cliente_id: 'c3',
      compagnia: 'PRIMA', mezzo_pagamento: null } }
];
const MOD_VERE = [
  { codice: 'contante', nome: 'Contanti', contabilizza: 'subito', collaboratore_id: null, attiva: true, giorni_attesi: 0, ordine: 1 },
  { codice: 'carta_credito', nome: 'Carta di credito', contabilizza: 'sospeso', collaboratore_id: null, attiva: true, giorni_attesi: 3, ordine: 5 },
  { codice: 'col_oddo_francesco', nome: 'Oddo Francesco', contabilizza: 'sospeso', collaboratore_id: '33109d90', attiva: true, giorni_attesi: 30, ordine: 99 }
];

prova('LA SCHERMATA GIRA DAVVERO, e Oddo Francesco ci sta dentro', async () => {
  const { api, el } = bancoSpr(RATE_VERE, MOD_VERE);
  await api.sprCarica(true);
  const s = api.stato();
  deve(!s.err, 'la lettura si è fermata: ' + s.err);
  deve(s.rate.length === 3, 'non ha letto tutte le rate: ' + s.rate.length);
  const h = el['spr-lista'].innerHTML;
  /* Il sintomo che Francesco ha segnalato tre volte: la schermata era vuota. */
  deve(h.length > 200, 'la schermata non ha disegnato niente');
  deve(/Oddo Francesco/.test(h), 'Oddo Francesco non compare fra i sospesi');
  deve(/CARPITELLA GUIDO/.test(h) && /SPADA VINCENZO EMANUELE/.test(h),
    'le due polizze non compaiono sotto di lui');
  deve(/662,98/.test(h), 'il totale della persona non è quello delle sue due rate');
  /* E ci sta in CIMA: un gruppo da due righe sotto quattro gruppi da cento,
     per chi guarda, non c'è (§66-bis). */
  deve(h.indexOf('Oddo Francesco') < h.indexOf('Carta di credito'),
    'la persona non viene prima dei mezzi');
  return 'la schermata disegna, e la persona è in cima con € 662,98';
});

prova('LA PAGINA DI UN SOSPESO SI APRE, e prende il posto dell’elenco', async () => {
  const { api, el } = bancoSpr(RATE_VERE, MOD_VERE, {
    persone: [{ id: '33109d90', nome: 'Francesco', cognome: 'Oddo', email: 'f@x.it' }]
  });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  const h = el['spr-lista'].innerHTML;
  deve(api.stato().dett === 'col_oddo_francesco', 'la pagina non risulta aperta');
  /* Prende il POSTO dell'elenco: due liste della stessa cosa aperte insieme
     fanno perdere quale delle due si sta guardando. */
  deve(!/Per mezzo di pagamento/.test(h), 'l’elenco di tutti i gruppi è rimasto sotto');
  deve(/CARPITELLA GUIDO/.test(h) && /SPADA VINCENZO EMANUELE/.test(h),
    'le due rate della persona non ci sono');
  deve(/Tutti i sospesi/.test(h), 'non c’è come tornare indietro');
  /* L'email si precompila con quella della persona ABBINATA: è questo che
     rende vero il «con un semplice click». */
  deve(/value="f@x.it"/.test(h), 'l’indirizzo non si precompila da chi è abbinato');
  /* E i totali di testa sono quelli del resoconto, non di tutto il gruppo. */
  deve(/Da versare in agenzia/.test(el['spr-somma'].innerHTML), 'la testa non separa le due famiglie');
  api.sprChiudi();
  deve(api.stato().dett === null && /Per mezzo di pagamento/.test(el['spr-lista'].innerHTML),
    'chiudendo non si torna all’elenco');
  return 'si apre, mostra le due rate, precompila l’email e si richiude';
});

const SC_CONTI_V = [
  { id: 'cassa', nome: 'CASSA CONTANTI', tipologia: 'cassa', natura: 'premi', attivo: true, ordine: 1 },
  { id: 'debito', nome: 'DEBITO VERSO PRIMA', tipologia: 'debito_compagnia', natura: 'premi', attivo: true, ordine: 2 }
];
const SC_CAUS_V = [{ id: 'ip', codice: 'incasso_premi', nome: 'Incasso premi', natura: 'premi', segno: 'entrata', attiva: true }];

prova('«SCARICA LE SELEZIONATE» APRE LA SCHERMATA, e il conto si muove', async () => {
  /* Francesco: «quando clicco scarica le selezionate, deve aprirsi una
     schermata dove posso decidere come ho incassato le selezionate, che
     ovviamente deve aggiornare il conto per aggiornare la quadratura». */
  const { api, el, scritte } = bancoSpr(RATE_VERE, MOD_VERE,
    { conti: SC_CONTI_V, causali: SC_CAUS_V });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  api.sprSelTutte('tutte');
  await api.sprScarica();
  /* La finestra si apre DAVVERO: `spr-ov` è fuori dai pannelli apposta, una
     finestra dentro un pannello nascosto non si vede (§46). */
  deve(el['spr-ov'].style.display === 'flex', 'la finestra non si apre');
  const h = el['spr-box'].innerHTML;
  deve(/662,98/.test(h), 'la finestra non dice quanto si sta scaricando: ' + h.slice(0, 200));
  deve(/Come sono arrivati/.test(h), 'non chiede come sono arrivati i soldi');
  /* UNA PERSONA NON È UN MODO DI PAGARE: «Oddo Francesco» dice CHI teneva i
     soldi, e in questa tendina non ci va (§64). */
  deve(!/Oddo Francesco<\/option>/.test(h), 'propone una persona come modo di pagare');
  /* E il conto di DEBITO non è un posto dove il denaro c'è: un incasso lì
     direbbe che il debito verso la compagnia è cresciuto incassando. */
  deve(/CASSA CONTANTI<\/option>/.test(h), 'non propone la cassa');
  deve(!/DEBITO VERSO PRIMA<\/option>/.test(h), 'propone un conto su cui il denaro non c’è');

  el['spr-sc-mezzo'].value = 'contante';
  el['spr-sc-conto'].value = 'cassa';
  el['spr-sc-data'].value = '2026-09-24';
  await api.sprScaricoRegistra();

  const mov = scritte.filter(s => s.tab === 'iam_movimenti' && s.insert);
  deve(mov.length === 1, 'non scrive i movimenti: ' + mov.length);
  const righe = mov[0].insert;
  deve(righe.length === 2, 'non scrive un movimento per rata: ' + righe.length);
  deve(righe.every(r => r.conto_id === 'cassa' && r.causale_id === 'ip' && r.data === '2026-09-24'),
    'i movimenti non portano conto, causale e data');
  deve(righe.every(r => r.titolo_id), 'un movimento senza la sua rata non si ritrova più');
  /* LA RATA NON SI RISCRIVE: come ha pagato il cliente è un fatto della
     compagnia, e resta vero anche dopo che il collaboratore ha versato. */
  deve(!scritte.some(s => s.tab === 'quote_titoli'), 'riscrive il mezzo della rata');
  deve(/2 rate scaricate/.test(api.stato().invio), 'non dice che cosa ha fatto: ' + api.stato().invio);
  deve(el['spr-ov'].style.display === 'none', 'la finestra resta aperta dopo aver registrato');
  return '2 movimenti su CASSA CONTANTI, e la rata non si tocca';
});

prova('IL MOTORE VECCHIO IN CACHE NON FA FALLIRE IL TASTO IN SILENZIO', async () => {
  /* Il guasto del 24/09: `iam/index.html` caricava il motore con un
     contrassegno `?v=` di cinque giorni prima. La pagina esce `no-cache`, i
     motori con `max-age=600`: il browser teneva l'HTML nuovo e il motore
     vecchio, dove `pianoScarico` non c'era ancora. La chiamata sollevava e
     basta — il bottone non faceva NIENTE, senza dire niente.
     Un guardiano impedisce che il contrassegno resti indietro
     (`server/verifica/versione-motori.test.mjs`); questo misura che, se
     succede lo stesso, la schermata lo dica invece di tacere. */
  const { api, el, scritte } = bancoSpr(RATE_VERE, MOD_VERE,
    { conti: SC_CONTI_V, causali: SC_CAUS_V });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  api.sprSelTutte('tutte');
  await api.sprScarica();
  el['spr-sc-mezzo'].value = 'contante';
  el['spr-sc-conto'].value = 'cassa';
  el['spr-sc-data'].value = '2026-09-24';
  /* Il motore in memoria è quello di prima: la funzione non c'è. */
  const vera = C.pianoScarico;
  delete C.pianoScarico;
  try { await api.sprScaricoRegistra(); } finally { C.pianoScarico = vera; }
  deve(!scritte.some(s => s.tab === 'iam_movimenti' && s.insert), 'scrive lo stesso');
  deve(api.stato().scMsg.some(m => /ricarica/i.test(m)),
    'non dice che la pagina è da ricaricare: ' + api.stato().scMsg.join(' '));
  deve(el['spr-ov'].style.display === 'flex', 'chiude la finestra e fa ricompilare tutto');
  return 'niente scrittura, e il motivo vero in schermata';
});

prova('il tasto dice CONFERMA', () => {
  /* Francesco: «rinominalo in CONFERMA». */
  const b = blocco();
  deve(/>Conferma</.test(b), 'il tasto non dice Conferma');
  deve(!/Registra l[’']arrivo/.test(b), 'il nome vecchio è rimasto');
  return 'Conferma';
});

prova('lo scarico si ferma, e dice perché: niente conto, niente movimento', async () => {
  const { api, el, scritte } = bancoSpr(RATE_VERE, MOD_VERE,
    { conti: SC_CONTI_V, causali: SC_CAUS_V });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  api.sprSelTutte('tutte');
  await api.sprScarica();
  el['spr-sc-mezzo'].value = 'contante';
  el['spr-sc-conto'].value = '';           /* nessun conto */
  el['spr-sc-data'].value = '2026-09-24';
  await api.sprScaricoRegistra();
  deve(!scritte.some(s => s.tab === 'iam_movimenti' && s.insert), 'scrive lo stesso');
  deve(api.stato().scMsg.some(m => /quale conto/.test(m)), 'non dice perché: ' + api.stato().scMsg.join(' '));
  deve(/quale conto/.test(el['spr-box'].innerHTML), 'il motivo non arriva in schermata');
  return 'niente conto, niente movimento, e il motivo si legge';
});

prova('ZERO RIGHE SCRITTE NON È UN SUCCESSO SILENZIOSO', async () => {
  /* BUG 1 (§47): PostgREST non dà errore quando una scrittura tocca zero
     righe. Dove si toccano dei soldi si guarda quante righe il database ha
     davvero cambiato, e non si fa credere che sia andata. */
  const { api, el } = bancoSpr(RATE_VERE, MOD_VERE,
    { conti: SC_CONTI_V, causali: SC_CAUS_V, insertZero: true });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  api.sprSelTutte('tutte');
  await api.sprScarica();
  el['spr-sc-mezzo'].value = 'contante';
  el['spr-sc-conto'].value = 'cassa';
  el['spr-sc-data'].value = '2026-09-24';
  await api.sprScaricoRegistra();
  deve(!/scaricate/.test(api.stato().invio || ''), 'dice che è andata: ' + api.stato().invio);
  /* E il motivo deve essere QUELLO: un TypeError qualunque farebbe passare
     una prova che crede di misurare il controllo sulle righe scritte. */
  deve(api.stato().scMsg.some(m => /non ha scritto nessun movimento/.test(m)),
    'non dice che il database non ha scritto niente: ' + api.stato().scMsg.join(' '));
  deve(el['spr-ov'].style.display === 'flex', 'chiude la finestra su un guasto, e la correzione si perde');
  return 'il guasto si dice, e la finestra resta aperta';
});

prova('SI FLAGGA PIÙ DI UNA, e quello che esce dichiara che è una SELEZIONE', async () => {
  const { api, el, scaricati } = bancoSpr(RATE_VERE, MOD_VERE, {});
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');

  /* Senza niente di flaggato vale TUTTO il gruppo: chi non ha scelto niente
     vuole il quadro intero, non un foglio vuoto. */
  deve(api.sprRes().righe.length === 2, 'senza selezione non vale tutto il gruppo');

  api.sprSel('t1', true);
  const res = api.sprRes();
  deve(res.righe.length === 1 && res.selezione === true, 'la selezione non restringe');
  /* E il documento LO DICE: un foglio parziale che non si dichiara fa credere
     che quello sia tutto (§50, §53, applicati a un file che esce di casa). */
  const doc = api.sprDocHTML(res);
  deve(/selezione/.test(doc), 'il foglio non dichiara che è una selezione');

  api.sprSelTutte('tutte');
  deve(Object.keys(api.stato().sel).length === 2, '«Tutte» non ne prende due');
  api.sprSelTutte('nessuna');
  deve(Object.keys(api.stato().sel).length === 0, '«Nessuna» non svuota');

  api.sprExcel();
  deve(scaricati.length === 0, 'l’export è passato da selContabTab invece che da un file');
  return 'una su due, e il foglio scrive che è una selezione';
});

prova('LE DUE FAMIGLIE NON SI SCARICANO INSIEME, e lo dice', async () => {
  /* Una rata APERTA si incassa (il cliente non ha ancora pagato), una già
     incassata si porta in contabilità: sono due schermate diverse, e
     mescolarle vorrebbe dire registrare un incasso già avvenuto (§32). */
  const RATE = RATE_VERE.concat([{
    id: 't4', polizza_id: 'p4', tipo: 'quietanza', stato: 'aperto', mezzo_pagamento: null,
    importo_lordo: '50.00', data_decorrenza: '2026-09-01', incassato_il: null,
    quote_polizze: { numero_polizza: 'Z9', cliente: 'NERI', cliente_id: 'c4',
      compagnia: 'PRIMA', mezzo_pagamento: 'col_oddo_francesco' }
  }]);
  const { api } = bancoSpr(RATE, MOD_VERE, {});
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  api.sprSel('t1', true); api.sprSel('t4', true);
  await api.sprScarica();
  deve(/due tipi|tutte e due/.test(api.stato().invio),
    'mescolare le due famiglie passa senza dire niente: ' + api.stato().invio);

  /* E senza niente di scelto non si va da nessuna parte. */
  api.sprSelTutte('nessuna');
  await api.sprScarica();
  deve(/nessuna rata/.test(api.stato().invio), 'scaricare senza scegliere non dice niente');
  return 'le due famiglie restano separate, e il vuoto lo dice';
});

prova('L’EMAIL PARTE DALLA CASELLA DELLA CONTABILITÀ, e porta l’allegato', async () => {
  const { api, el, mandate } = bancoSpr(RATE_VERE, MOD_VERE, {
    persone: [{ id: '33109d90', nome: 'Francesco', cognome: 'Oddo', email: 'f@x.it' }]
  });
  await api.sprCarica(true);
  await api.sprApri('col_oddo_francesco');
  el['spr-mail'].value = 'f@x.it';
  await api.sprMail();
  deve(mandate.length === 1, 'l’email non è partita: ' + api.stato().invio);
  const b = mandate[0].body;
  /* §34: la casella è quella che tiene questi conti, e non si ripiega — una
     risposta che arriva dove quei conti non li tiene nessuno è persa. */
  deve(/contabilita@/.test(b.casella), 'parte dalla casella sbagliata: ' + b.casella);
  deve(b.to === 'f@x.it', 'non va al destinatario scelto');
  deve(b.attachments && b.attachments.length === 1, 'manca il resoconto in allegato');
  /* E l'avviso delle righe fuori dal totale viaggia nel TESTO, non solo a
     schermo: un allegato che nessuno apre non ha detto niente (§17). */
  deve(/non si sommano|DA VERSARE/.test(b.text), 'il corpo non ripete i numeri che contano');

  /* Senza indirizzo non parte, e lo dice. */
  el['spr-mail'].value = '';
  await api.sprMail();
  deve(mandate.length === 1 && /indirizzo/.test(api.stato().invio),
    'parte anche senza destinatario');
  return 'contabilita@, allegato, e il vuoto rifiutato';
});

prova('ABBINARE SI OFFRE SOLO DOVE LA VOCE È GIÀ UNA PERSONA', async () => {
  /* Abbinare un collaboratore al POS vorrebbe dire dire che tutte le rate
     pagate col POS le tiene lui: un numero grande, credibile e falso (§8.1). */
  const { api, el, scritte } = bancoSpr(RATE_VERE, MOD_VERE, {
    persone: [{ id: '33109d90', nome: 'Francesco', cognome: 'Oddo', email: 'f@x.it' }]
  });
  await api.sprCarica(true);
  await api.sprApri('carta_credito');
  deve(!/spr-abbina/.test(el['spr-lista'].innerHTML),
    'un mezzo di pagamento si può abbinare a una persona');
  deve(/Conti e causali/.test(el['spr-lista'].innerHTML),
    'non dice dove si crea la voce di una persona');

  await api.sprApri('col_oddo_francesco');
  deve(/spr-abbina/.test(el['spr-lista'].innerHTML), 'una persona non si può riabbinare');
  el['spr-abbina'].value = '33109d90';
  await api.sprAbbina();
  const w = scritte.filter(x => x.tab === 'iam_modalita_pagamento' && x.update);
  deve(w.length === 1, 'l’abbinamento non scrive: ' + w.length);
  deve(w[0].update.collaboratore_id === '33109d90', 'scrive la persona sbagliata');
  /* E NON tocca nessuna rata: il dato di chi ha prodotto sta sulla polizza. */
  deve(!scritte.some(x => x.tab === 'quote_titoli' && x.update),
    'abbinare una voce riscrive anche le rate');
  return 'sul mezzo no, sulla persona sì, e nessuna rata toccata';
});

prova('NIENTE FUNZIONI DEL PREVENTIVATORE: quelle qui dentro non esistono', () => {
  /* Il difetto del 22/09: `pfEuro` e `pfData` vivono in `index.html` alla
     radice, non in questo documento. Chiamate qui sollevano un errore e
     fanno morire il disegno — e una prova che legge il sorgente non lo vede,
     perché la stringa c'è.
     Le funzioni ammesse si dichiarano: un elenco «tutto tranne» ammetterebbe
     domani un nome che nessuno ha deciso. */
  const b = senzaStringhe(senzaCommenti(bloccoGrezzo()));
  /* I nomi del BROWSER non sono «funzioni prese in prestito»: esistono ovunque
     e non dipendono da quale documento sta girando. Quello che questa prova
     cerca è un nome che vive solo nel preventivatore. */
  const GLOBALI = ['String', 'Number', 'Math', 'Object', 'Array', 'Date', 'Promise',
    'parseInt', 'parseFloat', 'isFinite', 'isNaN', 'alert', 'confirm', 'encodeURIComponent',
    'setTimeout', 'clearTimeout', 'btoa', 'atob', 'unescape', 'fetch', 'Blob', 'URL', 'JSON'];
  /* Le funzioni di casa sono quelle definite in QUESTO documento, non solo nel
     blocco: la schermata ne chiama parecchie delle altre (cntTutte, pntData,
     selContabTab), ed e' giusto. Quello che non deve succedere e' che ne
     chiami una che qui dentro non c'e'. */
  const qui = new Set([...H.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(r => r[1]));
  ['esc'].forEach(n => qui.add(n));
  const fuori = [];
  for (const r of b.matchAll(/(^|[^\w$.])([a-z][A-Za-z0-9_$]{2,})\s*\(/g)) {
    const n = r[2];
    if (qui.has(n) || GLOBALI.indexOf(n) >= 0) continue;
    if (/^(if|for|while|switch|catch|return|typeof|function|await|new|else|do|case|delete|void|in|of|throw|var|let|const|async|try)$/.test(n)) continue;
    if (fuori.indexOf(n) < 0) fuori.push(n);
  }
  deve(!fuori.length, 'il blocco chiama funzioni che in IAM non esistono: ' + fuori.join(', '));
  /* E le due colpevoli non tornano più. */
  deve(!/\bpf[A-Z]/.test(b), 'è tornata una funzione con il prefisso del preventivatore');
  return 'nessuna funzione presa in prestito dal preventivatore';
});

console.log('\n══ SOSPESI E MODALITÀ ══');
let ko = 0;
for (const { nome, fn } of esiti) {
  try { const r = await fn(); console.log('  ok  ' + nome + (r ? '  — ' + r : '')); }
  catch (e) { ko++; console.log('  ❌  ' + nome + '\n      ' + e.message); }
}
console.log('\nSOSPESI E MODALITÀ: ' + (esiti.length - ko) + ' superate, ' + ko + ' fallite');
process.exit(ko ? 1 : 0);
