// ═══════════════════════════════════════════════════════════════════════════
//  TIENI SVEGLIA — un keep-alive che non naviga non tiene sveglio niente
//
//  PERCHE' ESISTE
//    Il censimento del 2 settembre 2026: quattro scraper su dieci avevano un
//    keep-alive che girava regolarmente e non serviva a niente.
//      · prima     → chiamava solo ensurePage(): non navigava MAI;
//      · assieasy  → navigava solo se l'indirizzo non conteneva "assieasy";
//      · kube      → navigava solo se l'indirizzo non conteneva il suo host;
//                    dopo il primo giro la condizione e' falsa per sempre;
//      · moto      → navigava, ma non guardava mai l'esito.
//    Lo stesso errore, riscritto quattro volte. Queste prove tengono ferme le
//    tre cose che un keep-alive deve fare — e la prova finale va a guardare
//    negli scraper veri che nessuno se lo sia riscritto da capo sbagliando.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { creaGiro } from '../comune/tieniSveglia.mjs';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esiti = [];
const prova = async (n, f) => { try { esiti.push([true, n, (await f()) || '']); } catch (e) { esiti.push([false, n, e.message]); } };
const deve = (c, m) => { if (!c) throw new Error(m); };
const subito = async () => {};   // niente attese vere nelle prove

await prova('naviga SEMPRE, non solo quando l\'indirizzo e\' cambiato', async () => {
  // E' il difetto di assieasy e kube: la condizione diventa falsa dopo il primo
  // giro e non si naviga mai piu'. Qui la visita non ha condizioni: si fa.
  let visite = 0;
  const giro = creaGiro({ visita: async () => { visite++; }, dentro: async () => true, aspetta: subito });
  await giro(); await giro(); await giro();
  deve(visite === 3, 'ha navigato ' + visite + ' volte su 3: qualcuno decide di saltare il giro');
  return 'tre giri, tre navigazioni';
});

await prova('senza `visita` non si accende nemmeno', async () => {
  let errore = '';
  try { creaGiro({ dentro: async () => true }); } catch (e) { errore = e.message; }
  deve(/non naviga/.test(errore), 'accetta un keep-alive che non naviga: ' + errore);
  try { creaGiro({ visita: subito }); } catch (e) { errore = e.message; }
  deve(/primo preventivo/.test(errore), 'accetta un keep-alive che non guarda l\'esito: ' + errore);
  return 'i due pezzi indispensabili sono obbligatori';
});

await prova('guarda com\'e\' andata, e lo dice a chi tiene lo stato', async () => {
  // Il difetto di moto: navigava e non controllava. La sessione morta la
  // scopriva il primo preventivo, cioe' un cliente che aspetta.
  const visti = [];
  const giro = creaGiro({ visita: subito, dentro: async () => true, segnala: v => visti.push(v), aspetta: subito });
  deve(await giro() === 'dentro', 'non riconosce una sessione viva');
  deve(visti[0] === true, 'non aggiorna lo stato interno quando e\' dentro');
  return 'la sessione morta non aspetta piu\' un cliente per farsi notare';
});

await prova('se e\' caduta prova a rientrare da sola', async () => {
  let rientri = 0;
  const giro = creaGiro({
    visita: subito, dentro: async () => false, fuori: async () => true,
    rientra: async () => { rientri++; return true; }, aspetta: subito,
  });
  deve(await giro() === 'rientrato', 'non prova a rientrare');
  deve(rientri === 1, 'ha provato ' + rientri + ' volte');
  return 'nessuno viene disturbato per quello che si puo\' fare da soli';
});

await prova('«non lo so» non diventa «sei fuori»', async () => {
  /* Se la pagina non si e' pronunciata, dichiarare la sessione caduta vuol dire
     rifare un login che magari non serviva — e su un 2FA senza seme costa un
     codice a una persona. */
  const visti = [];
  const giro = creaGiro({
    visita: subito, dentro: async () => false, fuori: async () => false,
    rientra: async () => { throw new Error('non doveva rientrare'); },
    segnala: v => visti.push(v), aspetta: subito, tentativi: 4,
  });
  deve(await giro() === 'incerto', 'conclude «fuori» su un silenzio');
  deve(visti.length === 0, 'ha marcato lo stato pur non sapendo niente');
  return 'il silenzio resta silenzio';
});

await prova('molla la pagina se arriva un preventivo', async () => {
  // Competere con la navigazione di un preventivo e' gia' costato preventivi
  // falliti per una corsa fra due pezzi di codice sulla stessa scheda.
  let occupato = false, visite = 0;
  const giro = creaGiro({
    visita: async () => { visite++; occupato = true; },   // il preventivo parte durante la visita
    dentro: async () => false, fuori: async () => true,
    rientra: async () => { throw new Error('non doveva rientrare col preventivo in corso'); },
    occupato: () => occupato, aspetta: subito,
  });
  deve(await giro() === 'occupato', 'tira dritto mentre c\'e\' un preventivo in corso');
  occupato = true;
  deve(await giro() === 'occupato', 'naviga mentre c\'e\' un preventivo in corso');
  deve(visite === 1, 'ha navigato anche a preventivo gia\' avviato');
  return 'il preventivo ha la precedenza sulla pagina';
});

await prova('un motivo che non cambia non si ripete ogni tre minuti', async () => {
  /* Il 2 settembre il log di Allianz aveva dieci righe identiche in mezz'ora, e
     in mezzo non si vedeva piu' niente di utile. */
  const righe = [];
  const giro = creaGiro({
    visita: subito, dentro: async () => false, fuori: async () => true,
    log: r => righe.push(r), aspetta: subito, tentativi: 5,
  });
  await giro(); await giro(); await giro();
  const uguali = righe.filter(r => /non posso rientrare/.test(r));
  deve(uguali.length === 1, 'ha ripetuto lo stesso motivo ' + uguali.length + ' volte');
  deve(/Pannello Fonti/.test(uguali[0]), 'non dice dove si rimedia: ' + uguali[0]);
  return 'lo dice una volta, e si capisce';
});

await prova('un errore non spegne il ciclo', async () => {
  let visite = 0;
  const giro = creaGiro({
    visita: async () => { visite++; if (visite === 1) throw new Error('rete giu\''); },
    dentro: async () => true, aspetta: subito,
  });
  deve(await giro() === 'errore', 'l\'errore non viene classificato');
  deve(await giro() === 'dentro', 'dopo un errore il ciclo non riprende');
  return 'un intoppo non lascia la sessione a morire';
});

// ── E adesso gli scraper veri ──────────────────────────────────────────────
await prova('gli scraper rotti ora usano il pezzo comune', async () => {
  /* HDI si e' aggiunto il 26/09/2026: se lo era riscritto a mano, e quello scritto a mano
     guardava la RADICE NUDA dell'host del login invece dell'app — una pagina senza campo
     password e senza landing pubblica, dove «va tutto bene» e' la risposta anche a sessione
     caduta. In 13 ore di servizio non ha scritto una riga di registro. */
  for (const c of ['prima', 'assieasy', 'kube', 'moto', 'hdi']) {
    const src = senzaCommenti(fs.readFileSync(path.join(RADICE, c, 'quote-service.mjs'), 'utf8'));
    /* Si cerca la CHIAMATA e l'importazione, non la parola: cercando il nome, un commento che
       spiega perche' il pezzo comune si usa bastava a dichiarare a posto uno scraper che non lo
       chiamava. L'ha trovata la controprova, il 26/09/2026, non la rilettura. */
    deve(/from\s+'\.\.\/comune\/tieniSveglia\.mjs'/.test(src), c + ' non importa il keep-alive comune');
    /* Le due porte del modulo valgono uguale: `tieniSveglia` accende il ciclo da se', `creaGiro`
       da' il giro e lascia a chi chiama il momento in cui lanciarlo — serve a chi deve fare
       qualcosa prima e dopo, come HDI col conto del proprio lock. */
    deve(/\b(tieniSveglia|creaGiro)\s*\(/.test(src), c + ' importa il keep-alive comune e non lo chiama: se lo riscrive da capo');
  }
  return 'cinque volte lo stesso errore, una volta sola la soluzione';
});

await prova('nessuno «naviga solo se l\'indirizzo e\' diverso»', async () => {
  /* La forma esatta del difetto: `if (!page.url().includes(...)) goto(...)`.
     Dopo il primo giro l'indirizzo corrisponde gia', la condizione e' falsa per
     sempre, e il keep-alive gira a vuoto per mesi senza che nessuno lo noti. */
  const colpevoli = [];
  for (const c of fs.readdirSync(RADICE).filter(d => !d.startsWith('_') && !['comune', 'verifica'].includes(d))) {
    const f = path.join(RADICE, c, 'quote-service.mjs');
    if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const riga of src.split('\n')) {
      if (!/goto\(/.test(riga)) continue;
      if (/if\s*\(\s*!\s*\/[^/]*\/i?\.test\(page\.url\(\)/.test(riga) || /!\s*\(page\.url\(\)[^)]*\)\.includes\(/.test(riga)) colpevoli.push(c);
    }
  }
  deve(colpevoli.length === 0, 'navigano solo a indirizzo diverso: ' + [...new Set(colpevoli)].join(', '));
  return 'nessuno salta il giro guardandosi l\'indirizzo in mano';
});

await prova('il giro non si tira indietro per il lock che ha preso da solo', async () => {
  /* TROVATO SCRIVENDO, il 26/09/2026, e nessuna prova sul sorgente l'avrebbe preso.
     HDI ha un lock: ogni operazione sul browser ne prende uno, e il conto scende quando finisce.
     Il giro periodico navigava sotto lock e alla domanda «c'e' del lavoro in corso?» rispondeva
     guardando quel conto — cioe' vedeva IL PROPRIO lock e concludeva «occupato», ogni volta.
     Il conto, poi, scende un giro di coda DOPO la fine del lavoro: quindi non basta nemmeno
     guardarlo subito dopo aver finito. Qui si rifa' lo schema con pezzi finti e si chiede al giro
     di fare il suo mestiere tre volte di fila. */
  let BUSY = 0, CHAIN = Promise.resolve(), MIEI = 0;
  const locked = (fn) => {           // lo stesso schema di HDI, meno uno asincrono compreso
    BUSY++;
    const run = CHAIN.then(() => Promise.resolve().then(fn), () => Promise.resolve().then(fn));
    CHAIN = run.then(() => {}, () => {});
    run.then(() => {}, () => {}).finally(() => { BUSY--; });
    return run;
  };
  let preventivoDurante = false;
  const giro = creaGiro({
    occupato: () => (BUSY - MIEI) > 0,
    visita: () => locked(async () => { if (preventivoDurante) locked(async () => new Promise(r => setTimeout(r, 120))); }),
    dentro: async () => true, aspetta: subito,
  });
  const tick = async () => { if (BUSY > 0) return 'salto'; MIEI = 1; const e = await giro(); MIEI = 0; return e; };

  const tre = [await tick(), await tick(), await tick()];
  deve(tre.every(e => e === 'dentro'), 'tre giri a riposo danno ' + tre.join('/') + ': il giro vede il proprio lock');

  // E un preventivo che arriva DURANTE il giro deve avere la precedenza: quella e' la ragione
  // per cui la domanda esiste, e non deve essere stata spenta per far passare il caso sopra.
  preventivoDurante = true;
  deve(await tick() === 'occupato', 'un preventivo arrivato durante il giro non ha la precedenza');
  return 'il giro passa quando e\' libero, e molla la pagina quando arriva un cliente';
});

await prova('in HDI la domanda «c\'e\' lavoro?» sottrae il lock del giro stesso', async () => {
  const src = senzaCommenti(fs.readFileSync(path.join(RADICE, 'hdi', 'quote-service.mjs'), 'utf8'));
  const riga = (src.match(/occupato:\s*\(\)\s*=>[^\n]*/) || [''])[0];
  deve(riga, 'non trovo la domanda sul lavoro in corso');
  deve(/-\s*[A-Z_]*LOCK/.test(riga), 'guarda il conto dei lock senza sottrarre il proprio: ' + riga.trim());
  return 'il conto del giro non si conta addosso';
});

await prova('un solo giro periodico per sessione, altrimenti il piu\' veloce zittisce l\'altro',
async () => {
  /* IL DIFETTO, MISURATO SUL VPS IL 26/09/2026. HDI aveva DUE cicli periodici sullo stesso
     browser: uno ogni 3 minuti che navigava, e uno ogni 4 minuti che controllava la sessione e
     aggiornava lo stato per il Pannello Fonti. Il secondo si tirava indietro se l'ultima
     operazione era di meno di 3 minuti prima — e il primo quell'istante lo rinfrescava ogni 3
     minuti. Quella condizione, con un giro ogni 3 minuti, e' vera SEMPRE: in 13 ore e 24 minuti
     il controllo risultava «mai eseguito» dopo 200 giri. Non era sfortuna, era aritmetica.
     Conseguenza per chi lavora: HDI restava sloggato mezza giornata e il pannello non diceva
     niente — nessun messaggio, stato «idle» — e il primo preventivo se lo trovava rotto.
     Con UN giro solo il problema non si puo' ripresentare: non c'e' nessun altro che rinfreschi
     l'istante contro cui quel giro si misura. */
  const sospetti = [];
  for (const c of fs.readdirSync(RADICE).filter(d => !d.startsWith('_') && !['comune', 'verifica'].includes(d))) {
    const f = path.join(RADICE, c, 'quote-service.mjs');
    if (!fs.existsSync(f)) continue;
    const src = senzaCommenti(fs.readFileSync(f, 'utf8'));
    let giri = (src.match(/\b(?:tieniSveglia|creaGiro)\s*\(/g) || []).length;
    // Ogni setInterval scritto a mano il cui giro naviga sul portale conta come un giro in piu'.
    let i = -1;
    while ((i = src.indexOf('setInterval(', i + 1)) !== -1) {
      const corpo = argomento(src, i + 'setInterval('.length);
      if (naviga(corpo, src)) giri++;
    }
    if (giri > 1) sospetti.push(c + ' (' + giri + ')');
  }
  deve(sospetti.length === 0, 'hanno piu\' di un giro periodico che naviga: ' + sospetti.join(', '));
  return 'nessuno ha due giri sulla stessa scheda';
});

/* Togliere i commenti serve o la prova dichiara rotto un codice giusto: le righe qui sopra
   nominano `setInterval` e `page.goto` per spiegare il difetto. Si toglie a stati, carattere per
   carattere, mai con una ricerca globale: fra `/*` e il suo chiudi ci sono le espressioni
   regolari e il CSS, e una ricerca globale su un file grosso si mangia mezzo file. */
function senzaCommenti(src) {
  let out = '', i = 0, dentro = null;
  while (i < src.length) {
    const due = src.substr(i, 2);
    if (!dentro && due === '//') { dentro = 'riga'; i += 2; continue; }
    if (!dentro && due === '/*') { dentro = 'blocco'; i += 2; continue; }
    if (dentro === 'riga' && src[i] === '\n') { dentro = null; out += '\n'; i++; continue; }
    if (dentro === 'blocco' && due === '*/') { dentro = null; i += 2; continue; }
    if (!dentro) out += src[i];
    i++;
  }
  return out;
}
/* Il primo argomento di una chiamata, contando le parentesi: il corpo di un setInterval puo'
   essere scritto sul posto oppure essere il NOME di una funzione definita altrove — ed era il
   caso di HDI, dove cercare `goto` accanto al `setInterval` non avrebbe trovato niente. */
function argomento(src, da) {
  let liv = 0, i = da;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') liv++;
    else if (c === ')' || c === '}' || c === ']') { if (liv === 0) break; liv--; }
    else if (c === ',' && liv === 0) break;
  }
  return src.slice(da, i).trim();
}
function naviga(corpo, src) {
  if (/\.goto\(/.test(corpo)) return true;
  const nome = corpo.match(/^([A-Za-z_$][\w$]*)$/);
  if (!nome) return false;
  const def = src.match(new RegExp('(?:async\\s+)?function\\s+' + nome[1] + '\\s*\\(|(?:const|let|var)\\s+' + nome[1] + '\\s*=') );
  if (!def) return false;
  return /\.goto\(/.test(src.slice(def.index, def.index + 4000));
}

const ko = esiti.filter(e => !e[0]);
console.log('\n── Tieni sveglia ────────────────────────────────────────────');
for (const [ok, n, d] of esiti) console.log((ok ? '  ✅ ' : '  ❌ ') + n + (d ? ' — ' + d : ''));
console.log(ko.length ? '\n🔴 ' + ko.length + ' prove fallite su ' + esiti.length : '\n🟢 ' + esiti.length + '/' + esiti.length + ' prove superate');
process.exit(ko.length ? 1 : 0);
