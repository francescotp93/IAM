// ═══════════════════════════════════════════════════════════════════════════════
//  VENDITA A DISTANZA — i prodotti a tariffa venduti dalla landing (09/10/2026)
//
//  Primo prodotto: RISCHI CATASTROFALI ABITAZIONE. Tre cose stanno qui e non
//  nella pagina, perché la pagina la può riscrivere chiunque con la console:
//
//   1. IL PREZZO. Lo calcola lo stesso motore del preventivatore
//      (tariffe/motore/catastrofali.js) sulla stessa tabella dei CAP: il
//      premio della landing, quello a schermo in QUOTO e quello dell'API sono
//      lo stesso numero per costruzione.
//   2. IL CANCELLO. Si incassa solo se `tariffe/vendita-distanza.json` dice
//      vendita_online:true E porta i documenti precontrattuali. Una vendita a
//      distanza senza Set Informativo consegnato PRIMA della conclusione non
//      si fa (art. 120-quater CAP, Reg. IVASS 40/2018 art. 83, D.Lgs.
//      206/2005 artt. 67-quater ss.).
//   3. LA COERENZA CON RICHIESTE ED ESIGENZE (art. 119-bis CAP, art. 58 Reg.
//      IVASS 40/2018). Le risposte del questionario si ricontrollano qui: un
//      contratto non coerente non si incassa, si passa a un consulente.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const RADICE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const richiedi = createRequire(import.meta.url);
const motore = richiedi(path.join(RADICE, 'tariffe/motore/catastrofali.js'));

let caricata = false;
function prepara() {
  if (caricata) return;
  motore.caricaTariffa(JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/catastrofali_cap.json'), 'utf8')));
  caricata = true;
}

/* La configurazione si rilegge a ogni richiesta: accendere la vendita è una
   riga in un file, e non deve servire riavviare il servizio per farlo valere
   (né, peggio, per spegnerla). */
export function configurazione(prodotto) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(RADICE, 'tariffe/vendita-distanza.json'), 'utf8'));
    return c[prodotto] || null;
  } catch (_) { return null; }
}

export const ETICHETTA_CATNAT = 'Rischi Catastrofali Abitazione';
export const VALORE_MIN = motore.VALORE_MIN, VALORE_MAX = motore.VALORE_MAX;

/* Il prezzo. Restituisce { prezzo, etich, dettaglio } oppure { errore }:
   «CAP non in tariffa» non è un guasto, è una risposta da dare in parole. */
export function quotaCatastrofali(p) {
  p = p || {};
  const cap = String(p.cap || '').trim();
  if (!/^\d{5}$/.test(cap)) return { errore: 'Indica il CAP dell\'abitazione (5 cifre).' };
  const valore = Math.round(Number(p.valore));
  if (!Number.isFinite(valore) || valore <= 0) return { errore: 'Indica il valore di ricostruzione dell\'abitazione.' };
  /* Limiti assuntivi della compagnia (nota tecnica HDI P5820): fuori da qui
     la polizza non si emette, quindi non si quota nemmeno. */
  const limite = motore.fuoriLimite(valore);
  if (limite) return { errore: limite };
  prepara();
  /* Al cliente finale si vende SOLO il prodotto completo (decisione di
     Francesco, 09/10/2026): terremoto e alluvione, su fabbricato e contenuto.
     Si impone qui, non nella pagina: quello che arriva dal browser non conta. */
  const terrCont = true, alluFabb = true, alluCont = true;
  const q = motore.calcCatPremio(cap, valore, { terrCont, alluFabb, alluCont, frazionamento: 'Annuale' });
  if (!q) return { errore: 'Per il CAP ' + cap + ' non è disponibile una quotazione online: ti ricontatta un consulente.' };
  return {
    prezzo: Number(q.premio),
    etich: ETICHETTA_CATNAT,
    dettaglio: { cap, valore, terrCont, alluFabb, alluCont, garanzie: q.garanzie.map(g => ({ nome: g.nome, somma: g.somma })) },
  };
}

/* Le domande del questionario richieste ed esigenze e le dichiarazioni che la
   compagnia chiede in emissione (nota tecnica HDI P5820, §2.1 e §2.3), con la
   risposta che rende il contratto coerente. `se`: la domanda vale solo se è
   scelta quella garanzia. Stanno qui e la pagina le riceve da /shop/quote:
   una lista sola, e il server ricontrolla prima di incassare. */
export const ESIGENZE_CATNAT = [
  { k: 'bisogno', serve: true, d: 'Vuoi proteggere la tua abitazione e quello che contiene dai danni causati da terremoto, alluvione, inondazione e bombe d\'acqua?',
    no: 'Il prodotto copre solo terremoto, alluvione e inondazione.' },
  { k: 'abitazione', serve: true, d: 'L\'abitazione si trova in Italia (o a San Marino o nella Città del Vaticano) ed è la tua casa, abituale o saltuaria, oppure è data in affitto?',
    no: 'Il prodotto assicura solo abitazioni civili in Italia, usate come casa o date in affitto.' },
  { k: 'proprietario', serve: true, d: 'Sei tu il proprietario dell\'abitazione, come persona fisica (non come società né con partita IVA)?',
    no: 'Contraente e assicurato devono essere il proprietario, persona fisica: un consulente valuta con te come procedere.' },
  { k: 'valore', serve: true, d: 'Il valore che hai indicato è quanto costerebbe ricostruire l\'abitazione da zero (non il prezzo di mercato)?',
    no: 'La somma da assicurare è il costo di ricostruzione: se è più bassa del vero, in caso di danno l\'indennizzo si riduce in proporzione. Un consulente ti aiuta a stimarla.' },
  { k: 'uso_civile', serve: true, d: 'L\'edificio è usato per almeno 2/3 come abitazioni, uffici o studi professionali?',
    no: 'L\'edificio deve essere adibito per almeno 2/3 a uso civile.' },
  { k: 'statica', serve: true, d: 'L\'edificio è in normali condizioni di statica e manutenzione, e non è in costruzione, in ricostruzione o abbandonato?',
    no: 'Gli edifici in costruzione, abbandonati o in cattive condizioni non si possono assicurare.' },
  { k: 'materiali', serve: true, d: 'Strutture portanti, muri esterni e tetto sono in materiali non combustibili (per esempio cemento, mattoni, pietra) per almeno 2/3?',
    no: 'L\'edificio deve avere le caratteristiche costruttive minime previste dalle condizioni.' },
  { k: 'regolare', serve: true, d: 'L\'abitazione è stata costruita con le autorizzazioni edilizie e non è stata dichiarata inagibile dalle Autorità?',
    no: 'Abitazioni inagibili o costruite senza autorizzazioni non si possono assicurare.' },
  { k: 'sinistri_terremoto', serve: false, d: 'Negli ultimi 3 anni l\'abitazione ha avuto danni da terremoto?',
    no: 'Un\'abitazione colpita da terremoto negli ultimi 3 anni non si può assicurare.' },
  { k: 'sinistri_alluvione', serve: false, se: 'alluFabb', d: 'Negli ultimi 3 anni l\'abitazione ha avuto danni da alluvione o inondazione?',
    no: 'Un\'abitazione colpita da alluvione negli ultimi 3 anni si può assicurare solo per il terremoto, e online vendiamo il prodotto completo: ti ricontatta un consulente.' },
  { k: 'golenale', serve: false, se: 'alluFabb', d: 'L\'edificio si trova in un\'area golenale (fra un fiume e i suoi argini)?',
    no: 'Gli edifici in area golenale non si possono assicurare per l\'alluvione, e online vendiamo il prodotto completo: ti ricontatta un consulente.' },
  { k: 'annullate', serve: false, d: 'Ti è mai stata annullata per sinistro una polizza che copriva questi rischi?',
    no: 'In questo caso la polizza non si attiva online: ti ricontatta un consulente.' },
  { k: 'doppia', serve: false, d: 'Questa abitazione è già assicurata contro terremoto o alluvione con un\'altra polizza?',
    no: 'Una seconda copertura sugli stessi rischi va dichiarata e valutata: ti ricontatta un consulente.' },
];

export function coerenza(esigenze, params) {
  const e = esigenze || {}, p = params || {};
  const fuori = [];
  for (const q of ESIGENZE_CATNAT) {
    if (q.se && !p[q.se]) continue;
    if (e[q.k] !== true && e[q.k] !== false) fuori.push({ k: q.k, motivo: 'Rispondi a tutte le domande.' });
    else if (e[q.k] !== q.serve) fuori.push({ k: q.k, motivo: q.no });
  }
  return { coerente: fuori.length === 0, fuori };
}

/* I dati dell'abitazione che vanno sulla scheda di polizza (nota tecnica
   §3.3.2): non cambiano il premio, ma senza la polizza non si emette. */
export const SCHEDA_CATNAT = {
  tipologia: ['Appartamento in condominio', 'Casa a schiera o villa plurifamiliare', 'Villa monofamiliare'],
  destinazione: ['Abituale', 'Saltuaria', 'Locata a terzi'],
  piano: ['Seminterrato, piano terra o rialzato', 'Piano intermedio', 'Attico o superattico'],
  superficie: ['Meno di 100 mq', 'Fra 100 e 150 mq', 'Più di 150 mq'],
  eta: ['Meno di 5 anni', 'Fra 5 e 15 anni', 'Più di 15 anni', 'Non la conosco'],
};
export function schedaCompleta(a) {
  a = a || {};
  for (const k of ['tipologia', 'destinazione', 'superficie', 'eta']) if (!SCHEDA_CATNAT[k].includes(a[k])) return false;
  if (a.tipologia !== 'Villa monofamiliare' && !SCHEDA_CATNAT.piano.includes(a.piano)) return false;
  if (!(Number.isInteger(a.piani_fuori_terra) && a.piani_fuori_terra >= 1)) return false;
  if (!(Number.isInteger(a.piani_interrati) && a.piani_interrati >= 0)) return false;
  if (!String(a.indirizzo || '').trim() || !String(a.comune || '').trim()) return false;
  return true;
}
/* Maggiorenne alla sottoscrizione (controllo assuntivo della compagnia). */
export function maggiorenne(dataNascita, oggi) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataNascita || ''));
  if (!m) return false;
  const o = oggi || new Date();
  let anni = o.getFullYear() - Number(m[1]);
  if (o.getMonth() + 1 < Number(m[2]) || (o.getMonth() + 1 === Number(m[2]) && o.getDate() < Number(m[3]))) anni--;
  return anni >= 18;
}

/* Il cancello prima di incassare. Vale per i prodotti di questo modulo; gli
   altri prodotti dello shop restano come sono. */
export function cancelloVendita(prodotto, body) {
  return cancelloCon(prodotto === 'catastrofali' ? configurazione('catastrofali') : null, prodotto, body);
}
/* La regola, senza leggere il file: così si prova con una configurazione
   aperta senza aprire davvero la vendita. */
export function cancelloCon(cfg, prodotto, body) {
  if (prodotto !== 'catastrofali') return { ok: true };
  if (!cfg || cfg.vendita_online !== true) {
    return { ok: false, errore: (cfg && cfg.motivo) || 'Prodotto non acquistabile online.' };
  }
  if (!Array.isArray(cfg.documenti) || !cfg.documenti.length) {
    return { ok: false, errore: 'Documentazione precontrattuale non disponibile: il prodotto non si acquista online.' };
  }
  const acc = (body && body.accettazioni) || {};
  const c = coerenza(acc.esigenze, body && body.params);
  if (!c.coerente) return { ok: false, errore: 'Il contratto non risulta coerente con le tue richieste ed esigenze: ti ricontatta un consulente.' };
  if (!schedaCompleta(acc.abitazione)) return { ok: false, errore: 'Mancano i dati dell\'abitazione richiesti per la scheda di polizza.' };
  const cli = (body && body.cliente) || {};
  if (!/^[A-Z0-9]{16}$/i.test(String(cli.cf || ''))) return { ok: false, errore: 'Serve il codice fiscale del proprietario: la polizza non si intesta a una partita IVA.' };
  if (!maggiorenne(cli.dataNascita)) return { ok: false, errore: 'Il contraente deve essere maggiorenne: indica la data di nascita.' };
  if (acc.avvertenze_lette !== true) return { ok: false, errore: 'Prima del pagamento devi prendere atto di carenza, franchigie e limiti della copertura.' };
  if (acc.precontrattuale_letta !== true) {
    return { ok: false, errore: 'Prima del pagamento devi dichiarare di aver ricevuto e letto la documentazione precontrattuale.' };
  }
  return { ok: true };
}
