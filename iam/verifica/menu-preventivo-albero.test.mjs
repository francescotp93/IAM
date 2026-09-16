// ═══════════════════════════════════════════════════════════════════════════════
//  IL MENU «NUOVO PREVENTIVO» E' L'ALBERO DECISO IL 14/09/2026
//
//  Il brief «ristrutturazione menu» ha deciso quattro categorie, quali voci
//  spariscono, quali nascono, e come si apre e si chiude il menu. Queste prove
//  tengono ferme quelle decisioni: chi domani rimette «Imbarcazioni» al suo
//  posto, o riattacca il mouseleave che chiudeva il menu spostando il mouse, lo
//  scopre qui e non da un collaboratore.
//
//  Le chiavi `prod` sono contratto con QUOTO (INTERFACCIA-QUOTO-IAM.md §2.6):
//  qui si controlla che ogni foglia ne usi una del contratto; di la',
//  prodotti-diretti.test.mjs controlla che QUOTO le risolva tutte.
//
//  Controprova: W1_SRC=<withus-one.js di prima> W1_CSS=<withus-one.css di prima>
//  fa girare le prove sui file vecchi, che devono diventare rosse.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { RADICE, esiti, deve } from './banco.mjs';

const src = fs.readFileSync(process.env.W1_SRC || path.join(RADICE, 'withus-one.js'), 'utf8');
const css = fs.readFileSync(process.env.W1_CSS || path.join(RADICE, 'withus-one.css'), 'utf8');
/* Il contratto sta UNA volta sola, alla radice del repository unico (dal
   16/09/2026 IAM vive in iam/ dentro il repository di QUOTO). Se questa
   cartella viene provata da sola, si accetta anche una copia accanto. */
const CONTRATTO = ['..', '.'].map(d => path.join(RADICE, d, 'INTERFACCIA-QUOTO-IAM.md')).find(f => fs.existsSync(f));
deve(CONTRATTO, 'non trovo INTERFACCIA-QUOTO-IAM.md ne\' alla radice del repository ne\' in iam/');
const contratto = fs.readFileSync(CONTRATTO, 'utf8');
const e = esiti('MENU «NUOVO PREVENTIVO» — l\'albero deciso, e come si apre e chiude');

/* L'albero, eseguito davvero: MEGA e' un oggetto dentro la scocca, lo si
   ritaglia e lo si legge in una stanza chiusa. */
function ritaglia(inizio, fine) {
  const i = src.indexOf(inizio);
  deve(i >= 0, 'non trovo «' + inizio + '» in withus-one.js');
  const j = src.indexOf(fine, i);
  deve(j > i, 'non trovo la fine di «' + inizio + '»');
  return src.slice(i, j + fine.length);
}
const stanza = vm.createContext({});
vm.runInContext(ritaglia('var MEGA = {', '\n  };'), stanza);
const MEGA = vm.runInContext('MEGA', stanza);

/* Tutte le voci dell'albero, con il loro percorso. */
function voci(lista, percorso, out) {
  for (const v of lista) {
    out.push({ v, percorso });
    if (v.sub) voci(v.sub, percorso.concat([v.l]), out);
  }
  return out;
}
const TUTTE = [];
for (const c of MEGA.cols) voci(c.v, [c.t], TUTTE);
const etichette = TUTTE.map(x => x.v.l);
const foglie = TUTTE.filter(x => !x.v.sub && !x.v.soon);
const trova = (l) => TUTTE.filter(x => x.v.l === l);

/* Le chiavi che il contratto elenca (§2.6). */
function chiaviContratto() {
  const i = contratto.indexOf('### 2.6');
  deve(i >= 0, 'INTERFACCIA-QUOTO-IAM.md non ha la sezione 2.6');
  const sez = contratto.slice(i, contratto.indexOf('\n## 3.', i));
  const tabella = sez.slice(sez.indexOf('| Voce del menu IAM'), sez.indexOf('\n\nLe voci che aprono'));
  const out = new Set();
  for (const riga of tabella.split('\n').slice(2)) {
    const prod = (riga.split('|').map(c => c.trim()))[3] || '';
    for (const m of prod.matchAll(/`([a-z0-9_]+)`/g)) if (m[1] !== 'amt_') out.add(m[1]);
  }
  return out;
}

// ── 1. le quattro categorie ──────────────────────────────────────────────────
e.prova('il primo livello sono ESATTAMENTE le quattro categorie', () => {
  const t = MEGA.cols.map(c => c.t);
  deve(JSON.stringify(t) === JSON.stringify(['Motor', 'Persona', 'Casa e Patrimonio', 'Impresa e Cauzioni']),
    'le categorie sono: ' + t.join(' · '));
  return t.join(' · ');
});

// ── 2. quello che doveva sparire non c'e' piu' ───────────────────────────────
e.prova('le voci eliminate dal brief non sono piu\' nel menu', () => {
  const vietate = ['Imbarcazioni', 'Infortuni al conducente', 'CVT e ARD', "Auto d'epoca",
    'Infortuni famiglia e LTC', 'Infortuni del conducente', 'Malattia', 'Fondo pensione', 'Fondo Pensione', 'TFR',
    'Vita e TCM', 'Beni e oggetti di valore', 'RC rischi diversi', 'Polizza medici'];
  const tornate = vietate.filter(l => etichette.includes(l));
  deve(tornate.length === 0, 'voci eliminate che sono tornate: ' + tornate.join(', '));
  /* E nemmeno per la via di servizio: le loro chiavi e le loro pagine. */
  const prodVietati = ['imbarcazioni', 'conducente', 'storici', 'cvtard'];
  const conProd = foglie.filter(x => prodVietati.includes(x.v.prod)).map(x => x.v.l);
  deve(conProd.length === 0, 'foglie che usano una chiave eliminata: ' + conProd.join(', '));
  const pagVietate = ['cvtard', 'saravintage', 'persona', 'malattia', 'beni', 'tutela'];
  const conPag = TUTTE.filter(x => pagVietate.includes(x.v.p)).map(x => x.v.l + '→' + x.v.p);
  deve(conPag.length === 0, 'voci che aprono una pagina eliminata: ' + conPag.join(', '));
  return vietate.length + ' voci cercate, nessuna trovata';
});

// ── 3. la struttura decisa, ramo per ramo ────────────────────────────────────
e.prova('Motor: tre veicoli, ognuno con la sua chiave', () => {
  const motor = MEGA.cols[0].v.map(v => v.l + '=' + v.prod);
  deve(JSON.stringify(motor) === JSON.stringify(['Autovetture=autovetture', 'Moto e ciclomotori=motocicli', 'Autocarri=autocarri']),
    'Motor e\': ' + motor.join(', '));
});

e.prova('Persona: Infortuni alla circolazione e Vita con TCM e TCM Mutuo, RC vita privata NO', () => {
  const persona = MEGA.cols[1];
  const infc = persona.v.find(v => v.l === 'Infortuni alla circolazione');
  deve(infc && infc.p === 'infcirc', 'Infortuni alla circolazione manca o non apre «infcirc»');
  const vita = persona.v.find(v => v.l === 'Vita');
  deve(vita && vita.sub, 'Vita non e\' una voce con sotto-menu');
  deve(JSON.stringify(vita.sub.map(v => v.l + '=' + v.prod)) === JSON.stringify(['TCM=tcm', 'TCM Mutuo=tcm_mutuo']),
    'sotto Vita c\'e\': ' + vita.sub.map(v => v.l).join(', '));
  deve(!persona.v.some(v => v.l === 'TCM'), 'TCM e\' anche al primo livello: due voci per lo stesso prodotto (decisione: solo dentro Vita)');
  deve(!persona.v.some(v => /vita privata/i.test(v.l)), 'RC vita privata e\' ancora sotto Persona: sta SOLO in Casa e Patrimonio (§8 del brief)');
});

e.prova('Casa e Patrimonio: RC vita privata, Tutela legale a tre voci, Fotovoltaico, catastrofali abitazione', () => {
  const casa = MEGA.cols[2];
  const rcvp = casa.v.find(v => v.l === 'RC vita privata');
  deve(rcvp && rcvp.p === 'rcvp', 'RC vita privata manca o non apre «rcvp»');
  deve(trova('RC vita privata').length === 1, 'RC vita privata compare piu\' di una volta');
  const tl = casa.v.find(v => v.l === 'Tutela legale');
  deve(tl && tl.sub, 'Tutela legale non ha il sotto-menu');
  deve(JSON.stringify(tl.sub.map(v => v.l + '=' + v.prod)) === JSON.stringify(['MyDrive=tl_mydrive', 'MyWay=tl_myway', 'Rimborso utenze=tl_utenze']),
    'sotto Tutela legale c\'e\': ' + tl.sub.map(v => v.l + '=' + v.prod).join(', '));
  deve(tl.sub.every(v => v.p === 'tutelalegale'), 'i prodotti di tutela legale aprono una pagina che non e\' «tutelalegale» (la vecchia «tutela» era un altro modulo)');
  deve(casa.v.some(v => v.l === 'Fotovoltaico' && v.p === 'fotovoltaico'), 'Fotovoltaico manca');
  deve(casa.v.some(v => v.p === 'rcab'), 'Rischi catastrofali abitazione ha perso la strada dal menu (viveva sotto Beni, che e\' sparita)');
});

e.prova('Impresa e Cauzioni: Albergo e Lidi, Multirischi con due «In arrivo», Sanitario a tre voci', () => {
  const imp = MEGA.cols[3];
  deve(imp.v.some(v => v.l === 'Albergo' && v.prod === 'albergo'), 'Albergo manca o non ha la chiave «albergo»');
  deve(imp.v.some(v => v.l === 'Lidi balneari' && v.prod === 'lidi'), 'Lidi balneari manca o non ha la chiave «lidi»');
  const multi = imp.v.find(v => v.l === 'Multirischi Impresa');
  deve(multi && multi.sub, 'Multirischi Impresa non ha il sotto-menu');
  const soon = multi.sub.filter(v => v.soon).map(v => v.l);
  deve(JSON.stringify(soon) === JSON.stringify(['RC Attività', 'Cyber']), '«In arrivo» sono: ' + soon.join(', '));
  deve(multi.sub.filter(v => v.soon).every(v => !v.p && !v.prod), 'una voce «In arrivo» ha una destinazione: sarebbe cliccabile');
  deve(multi.sub.some(v => v.l === 'Rischi Catastrofali' && v.prod === 'imp_catastrofali'), 'Rischi Catastrofali manca');
  deve(multi.sub.some(v => v.l === 'Fotovoltaico' && v.prod === 'imp_fotovoltaico'), 'Fotovoltaico impresa manca');
  const san = imp.v.find(v => v.l === 'Sanitario');
  deve(san && san.sub, '«Sanitario» (ex Polizza medici) manca o non ha il sotto-menu');
  deve(JSON.stringify(san.sub.map(v => v.l)) === JSON.stringify(['Struttura', 'Medici', 'Sanitario non medico']),
    'sotto Sanitario c\'e\': ' + san.sub.map(v => v.l).join(', '));
  deve(san.sub[1].prod === 'rcp_medici' && san.sub[2].prod === 'rcp_paramedici', 'Medici / Sanitario non medico non usano le chiavi rcp_medici / rcp_paramedici');
  const strutt = san.sub[0];
  deve(strutt.sub && strutt.sub.length === 4 && strutt.sub.every(v => /^amt_/.test(v.prod)),
    'Struttura deve aprire le quattro strutture AMTRUST (non c\'e\' un prodotto unico in QUOTO)');
});

e.prova('RC Professionali: Tecnici, Avvocati, Area Fiscale, Varie, non regolamentate, AMTRUST', () => {
  const rcp = MEGA.cols[3].v.find(v => v.l === 'RC Professionali');
  deve(rcp && rcp.sub, 'RC Professionali manca o non ha il sotto-menu');
  const nomi = rcp.sub.map(v => v.l);
  deve(JSON.stringify(nomi) === JSON.stringify(['Tecnici', 'Avvocati', 'Area Fiscale', 'Professioni Varie', 'Professioni non regolamentate', 'AMTRUST']),
    'RC Professionali e\': ' + nomi.join(', '));
  const tec = rcp.sub[0].sub.map(v => v.l);
  deve(JSON.stringify(tec) === JSON.stringify(['Architetti / Ingegneri', 'Geometri', 'Periti', 'Geologi', 'Agronomi', 'Chimici / Fisici']), 'Tecnici: ' + tec.join(', '));
  deve(rcp.sub[1].prod === 'rcp_avvocati', 'Avvocati non apre rcp_avvocati');
  deve(rcp.sub[2].sub.length === 5 && rcp.sub[2].sub[0].l === 'Commercialisti', 'Area Fiscale: le cinque sottocategorie della tariffa, Commercialisti per prima');
  const varie = rcp.sub[3].sub.map(v => v.l);
  deve(varie.length === 6 && varie.includes('DPO') && !varie.includes('DOP'), 'Professioni Varie: ' + varie.join(', ') + ' (la tariffa dice DPO, non DOP)');
  deve(rcp.sub[4].prod === 'rcp_nonreg', 'Professioni non regolamentate non apre rcp_nonreg');
});

e.prova('AMTRUST: tutti gli undici prodotti, con le denominazioni della tariffa', () => {
  /* Le denominazioni sono quelle di tariffe/amtrust.json in QUOTO (tipo
     rc_professionale), lette il 14/09/2026 — comprese le diciture «Conv.». */
  const attesi = ['Commercialista Protetto', 'Ingegno Protetto', 'ProfessionIntellettuali - Avvocati (Conv. 0091)',
    'PubblicoImpiego (Convenzione 0083)', 'Medico Protetto', 'Dentista Protetto', 'Farmacista Protetto',
    'Studi Dentistici', 'Poliambulatori', 'Residenze Sanitarie', 'Farmacie'];
  const amt = MEGA.cols[3].v.find(v => v.l === 'RC Professionali').sub.find(v => v.l === 'AMTRUST');
  deve(amt && amt.sub, 'AMTRUST manca o non ha il sotto-menu');
  const nomi = amt.sub.map(v => v.l);
  deve(JSON.stringify(nomi) === JSON.stringify(attesi), 'AMTRUST e\': ' + nomi.join(' | '));
  deve(amt.sub.every(v => /^amt_[a-z_]+$/.test(v.prod)), 'una voce AMTRUST non usa una chiave amt_*');
  /* La doppia strada verso le strutture sanitarie e' voluta (§8). */
  deve(trova('Poliambulatori').length === 2, 'Poliambulatori deve stare sia sotto AMTRUST sia sotto Sanitario › Struttura');
  return nomi.length + ' prodotti';
});

e.prova('Cauzioni: appalti (3), fra privati (2), Fideiussioni con tutto il resto (8)', () => {
  const imp = MEGA.cols[3].v;
  const app = imp.find(v => v.l === 'Cauzioni appalti');
  const pri = imp.find(v => v.l === 'Cauzioni fra privati');
  const fid = imp.find(v => v.l === 'Fideiussioni');
  deve(app && pri && fid, 'manca una delle tre voci cauzioni');
  deve(JSON.stringify(app.sub.map(v => v.prod)) === JSON.stringify(['cauz_provvisoria', 'cauz_definitiva', 'cauz_anticipazione']), 'appalti: ' + app.sub.map(v => v.prod).join(', '));
  deve(JSON.stringify(pri.sub.map(v => v.prod)) === JSON.stringify(['cauz_provvisoria_privati', 'cauz_definitiva_privati']), 'privati: ' + pri.sub.map(v => v.prod).join(', '));
  const f = fid.sub.map(v => v.prod);
  deve(f.length === 8, 'Fideiussioni ha ' + f.length + ' voci invece di 8');
  const doppie = f.filter(k => /privati|cauz_provvisoria$|cauz_definitiva$|cauz_anticipazione$/.test(k));
  deve(doppie.length === 0, 'in Fideiussioni ci sono cauzioni che hanno gia\' la loro strada: ' + doppie.join(', '));
});

// ── 4. ogni foglia usa una chiave del contratto ──────────────────────────────
e.prova('ogni foglia con «prod» usa una chiave scritta nel contratto §2.6', () => {
  const doc = chiaviContratto();
  const fuori = foglie.filter(x => x.v.prod && !doc.has(x.v.prod)).map(x => x.v.l + '=' + x.v.prod);
  deve(fuori.length === 0, 'chiavi non a contratto: ' + fuori.join(', '));
  const usate = new Set(foglie.filter(x => x.v.prod).map(x => x.v.prod));
  const inutilizzate = [...doc].filter(k => !usate.has(k));
  deve(inutilizzate.length === 0, 'chiavi a contratto che nessuna voce usa: ' + inutilizzate.join(', '));
  const senza = foglie.filter(x => !x.v.p).map(x => x.v.l);
  deve(senza.length === 0, 'foglie senza pagina: ' + senza.join(', '));
  return usate.size + ' chiavi usate, tutte a contratto, nessuna sprecata';
});

// ── 5. come si apre e come si chiude ─────────────────────────────────────────
e.prova('il menu non si chiude spostando il mouse: niente mouseleave, niente hover che apre', () => {
  const corpo = src.replace(/var SPRITE = '[\s\S]*?';/, "var SPRITE = '';");
  deve(!/addEventListener\(\s*'mouseleave'/.test(corpo), 'c\'e\' ancora un mouseleave che chiude le tendine');
  deve(!/addEventListener\(\s*'mouseenter'/.test(corpo), 'c\'e\' un mouseenter che apre le tendine');
  deve(!/:hover\s*>\s*\.w1-(dd|mega)/.test(css), 'nel CSS un sotto-menu si apre ancora al passaggio del mouse (:hover > .w1-dd / .w1-mega)');
  deve(/\.w1-m\.open\s*>\s*\.w1-mega/.test(css), 'il mega-menu non si apre piu\' con la classe .open');
  /* Le due chiusure ammesse: clic fuori (sul documento) ed Esc. */
  deve(/document\.addEventListener\(\s*'click',\s*chiudiTendine\s*\)/.test(corpo), 'manca la chiusura al clic fuori');
  deve(/e\.key === 'Escape'\)\s*\{\s*chiudiTendine\(\)/.test(corpo), 'Esc non chiude le tendine');
});

e.prova('«In arrivo»: si vede in grigio con la scritta, non e\' un link, non prende il fuoco', () => {
  const i = src.indexOf('function voceMegaHTML(');
  deve(i >= 0, 'manca voceMegaHTML');
  const corpo = src.slice(i, src.indexOf('\n  }', i));
  const soon = corpo.slice(corpo.indexOf('if (v.soon)'), corpo.indexOf('if (v.sub)'));
  deve(/<span class="w1-soon"/.test(soon), 'la voce in arrivo non e\' uno <span class="w1-soon">');
  deve(!/<a /.test(soon) && !/tabindex/.test(soon), 'la voce in arrivo e\' un link o e\' focusabile');
  deve(/aria-disabled="true"/.test(soon), 'manca aria-disabled');
  deve(/In arrivo/.test(soon), 'manca la scritta «In arrivo»');
  deve(/\.w1-soon\{[^}]*cursor:default/.test(css), 'il puntatore cambia sopra una voce in arrivo');
});

e.prova('l\'albero si disegna a livelli, e un nodo cliccato apre i figli senza navigare', () => {
  const i = src.indexOf('function costruisciMega() {');
  const corpo = src.slice(i, src.indexOf('\n  }\n', i));
  deve(/closest\('a\.w1-has-sub'\)/.test(corpo), 'il clic su un nodo non e\' gestito');
  const nodo = corpo.slice(corpo.indexOf("closest('a.w1-has-sub')"), corpo.indexOf('return;'));
  deve(!/aprireQuoto/.test(nodo), 'un nodo con figli naviga: deve solo aprire i figli');
  deve(/data-liv="/.test(src), 'le voci non dichiarano il livello (data-liv): il rientro non si vede');
  deve(/data-t="/.test(src), 'le foglie non portano la briciola (data-t)');
});

e.prova('su telefono: un livello alla volta, a schermo intero, con «Indietro»', () => {
  deve(/function apriDrill\(/.test(src) && /function disegnaDrill\(/.test(src), 'manca il drill-down');
  deve(/max-width: 900px/.test(src.slice(src.indexOf('function eTelefono'), src.indexOf('function eTelefono') + 200)), 'il drill-down non si accende sotto i 900px');
  deve(/m\.mega && eTelefono\(\)/.test(src), 'il capo-menu «Nuovo preventivo» non passa dal drill-down su telefono');
  deve(/data-drill="indietro"/.test(src) && /<span>Indietro<\/span>/.test(src), 'manca il tasto «Indietro»');
  deve(/\.w1-drill\{[^}]*position:fixed;\s*inset:0/.test(css), 'il drill-down non occupa tutto lo schermo');
  /* Il gestore GLOBALE di Esc (quello della lente in alto e' un altro, e
     chiude solo i suggerimenti). */
  const esc = src.indexOf("if (e.key === 'Escape') { chiudiTendine()");
  deve(esc >= 0 && /chiudiDrill\(\)/.test(src.slice(esc, esc + 120)), 'Esc non chiude il drill-down');
});

e.stampa();
process.exit(e.ko === 0 ? 0 : 1);
