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

/* Il prezzo. Restituisce { prezzo, etich, dettaglio } oppure { errore }:
   «CAP non in tariffa» non è un guasto, è una risposta da dare in parole. */
export function quotaCatastrofali(p) {
  p = p || {};
  const cap = String(p.cap || '').trim();
  if (!/^\d{5}$/.test(cap)) return { errore: 'Indica il CAP dell\'abitazione (5 cifre).' };
  const valore = Math.round(Number(p.valore));
  if (!Number.isFinite(valore) || valore <= 0) return { errore: 'Indica il valore di ricostruzione dell\'abitazione.' };
  prepara();
  const terrCont = !!p.terrCont, alluFabb = !!p.alluFabb;
  const alluCont = terrCont && alluFabb && !!p.alluCont;
  const q = motore.calcCatPremio(cap, valore, { terrCont, alluFabb, alluCont, frazionamento: 'Annuale' });
  if (!q) return { errore: 'Per il CAP ' + cap + ' non è disponibile una quotazione online: ti ricontatta un consulente.' };
  return {
    prezzo: Number(q.premio),
    etich: ETICHETTA_CATNAT,
    dettaglio: { cap, valore, terrCont, alluFabb, alluCont, garanzie: q.garanzie.map(g => ({ nome: g.nome, somma: g.somma })) },
  };
}

/* Le domande del questionario e la risposta che rende il contratto coerente.
   Stanno qui e la pagina le riceve da /shop/esigenze: una lista sola. */
export const ESIGENZE_CATNAT = [
  { k: 'abitazione', d: 'L\'immobile da assicurare è un\'abitazione civile situata in Italia?', serve: true,
    no: 'Il prodotto assicura solo abitazioni civili in Italia.' },
  { k: 'titolo', d: 'Sei proprietario dell\'abitazione o hai comunque interesse ad assicurarla?', serve: true,
    no: 'Per assicurare l\'abitazione serve averne interesse (proprietà o altro titolo).' },
  { k: 'bisogno', d: 'Vuoi proteggere l\'abitazione dai danni causati da terremoto e, se lo scegli, da alluvione e inondazione?', serve: true,
    no: 'Il prodotto copre solo terremoto, alluvione e inondazione.' },
  { k: 'valore', d: 'Il valore che hai indicato è il costo per ricostruire l\'abitazione (non il prezzo di mercato)?', serve: true,
    no: 'La somma da assicurare è il costo di ricostruzione: se non lo conosci, un consulente ti aiuta a stimarlo.' },
  { k: 'doppia', d: 'Questa abitazione è già assicurata contro terremoto o alluvione con un\'altra polizza?', serve: false,
    no: 'Una seconda copertura sugli stessi rischi può non servirti: un consulente valuta con te se ha senso.' },
];

export function coerenza(esigenze) {
  const e = esigenze || {};
  const fuori = [];
  for (const q of ESIGENZE_CATNAT) {
    if (e[q.k] !== true && e[q.k] !== false) fuori.push({ k: q.k, motivo: 'Rispondi a tutte le domande.' });
    else if (e[q.k] !== q.serve) fuori.push({ k: q.k, motivo: q.no });
  }
  return { coerente: fuori.length === 0, fuori };
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
  const c = coerenza(acc.esigenze);
  if (!c.coerente) return { ok: false, errore: 'Il contratto non risulta coerente con le tue richieste ed esigenze: ti ricontatta un consulente.' };
  if (acc.precontrattuale_letta !== true) {
    return { ok: false, errore: 'Prima del pagamento devi dichiarare di aver ricevuto e letto la documentazione precontrattuale.' };
  }
  return { ok: true };
}
