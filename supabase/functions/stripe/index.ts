// PAGAMENTI IAM -> STRIPE  (il lato server dei pagamenti di IAM)
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ QUESTO FILE NON E' QUELLO INSTALLATO.                        (06/10/2026)  │
// │                                                                            │
// │ Su Supabase gira ancora la versione 2 — il commit precedente a questo.     │
// │ Installare lo decide Francesco: sono soldi veri su un conto suo.           │
// │ Finche' non si installa non si rompe niente, perche' la pagina manda        │
// │ ENTRAMBI i campi: `importo_cents` (che questa versione pretende) e          │
// │ `importo` in forma canonica senza punti (che la versione installata legge   │
// │ in modo esatto). La correzione dell'importo vale quindi GIA' OGGI, perche'  │
// │ la parte che conta sta nel browser.                                        │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ L'IMPORTO ARRIVA IN CENTESIMI INTERI, E QUI NON SI INTERPRETA NIENTE.      │
// └─────────────────────────────────────────────────────────────────────────────┘
// La versione 2 prendeva l'importo in EURO come stringa e lo leggeva cosi':
// toglieva TUTTI i punti (trattandoli da separatore delle migliaia) e poi
// cambiava la virgola in punto. Misurato il 06/10/2026: «170.00» diventava
// 17.000,00 €. Il campo nella pagina ha il tastierino decimale, e sul telefono
// il tasto che esce e' il PUNTO. Nessuno se ne accorgeva, perche' l'elenco
// mostrava la stessa cifra mandata a Stripe: il solo a vedere l'importo
// sbagliato era il cliente, sulla pagina di pagamento.
//
// La regola adesso e' una riga: `importo_cents` dev'essere un intero positivo.
// Interpretare come e' scritto un numero e' mestiere del browser, che ha davanti
// la persona a cui si puo' CHIEDERE — il motore `tariffe/motore/importo.js`
// rifiuta quello che ha due letture invece di indovinarlo. Qui no: qui se non e'
// un intero si rifiuta e basta.
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ QUESTA FUNZIONE NON SCRIVE MAI CHE UN PAGAMENTO E' «pagato».               │
// └─────────────────────────────────────────────────────────────────────────────┘
// Chi ha pagato lo sa Stripe, non noi. Quello stato puo' scriverlo solo
// qualcosa che l'abbia sentito da Stripe — un webhook con la firma verificata,
// oppure una lettura su richiesta — e il 06/10/2026 nessuna delle due esiste.
// Finche' non esiste, la schermata lo DICE all'operatore invece di lasciargli
// credere che lo stato si aggiorni da solo.
//
// Perche' esiste. IAM gira nel browser e il repo e' pubblico: la chiave segreta
// di Stripe non puo' stare li'. Questa funzione e' il pezzo di server: riceve la
// richiesta dell'operatore (con la sua sessione IAM, gia' verificata da Supabase),
// ci mette la chiave Stripe (dai secret della funzione) e crea il pagamento.
//
// La chiave sta in STRIPE_SECRET_KEY (secret della Edge Function), MAI nel codice.
//
// CHI PUO' FARE COSA. Creare una richiesta di pagamento e' mestiere di ogni utente
// IAM attivo. Il ruolo si legge da iam_utenti, non dal token (un ruolo nel token
// resterebbe valido fino alla scadenza anche dopo aver tolto i permessi).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB_URL = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE = "https://api.stripe.com/v1";

/* Il tetto e' lo STESSO del motore nel browser (Importo.TETTO_CENTS), e una
   prova lo verifica leggendo i due file: due tetti diversi vorrebbero dire che
   la pagina lascia passare un importo che il server poi rifiuta, o il
   contrario. */
const TETTO_CENTS = 999999999; /* 9.999.999,99 € */

/* Le origini da cui IAM chiama. La versione 2 rispondeva "*": con `verify_jwt`
   davanti non e' un buco (serve comunque la sessione di un utente IAM attivo),
   ma "*" vuol dire che qualunque pagina aperta nel browser dell'operatore puo'
   provarci con la sua sessione. Un elenco costa una riga. */
const ORIGINI = [
  "https://iam.withusassicurazioni.it",
  "https://quoto.withusassicurazioni.it",
  "https://www.withusassicurazioni.it",
];
function intestazioni(origine: string | null): Record<string, string> {
  const buona = origine && ORIGINI.includes(origine) ? origine : ORIGINI[0];
  return {
    "Access-Control-Allow-Origin": buona,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/* Le due risposte prendono le intestazioni della richiesta a cui rispondono.
   Tenerle in una variabile di modulo riscritta a ogni giro sarebbe un guaio
   silenzioso: due richieste insieme condividono quella variabile, e la seconda
   risponderebbe con le intestazioni della prima. */
function ok(cors: Record<string, string>, body: unknown, stato = 200) {
  return new Response(JSON.stringify(body), { status: stato, headers: { ...cors, "Content-Type": "application/json" } });
}
function ko(cors: Record<string, string>, stato: number, messaggio: string) {
  return new Response(JSON.stringify({ success: false, message: messaggio }), {
    status: stato, headers: { ...cors, "Content-Type": "application/json" },
  });
}

/* Chi sta chiamando: il token l'ha gia' verificato Supabase (verify_jwt); il
   ruolo si va a leggere in tabella, l'unico posto aggiornato. */
async function chiChiama(auth: string) {
  const pezzo = (auth || "").replace(/^Bearer\s+/i, "").split(".")[1];
  if (!pezzo) return null;
  let dati: Record<string, unknown>;
  try { dati = JSON.parse(atob(pezzo.replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
  const id = String(dati.sub || "");
  if (!id) return null;
  const r = await fetch(SB_URL + "/rest/v1/iam_utenti?select=id,email,nome,cognome,ruolo,attivo,accesso_iam&id=eq." + encodeURIComponent(id), {
    headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, Accept: "application/json" },
  });
  if (!r.ok) return null;
  const righe = await r.json();
  return (Array.isArray(righe) && righe[0]) || null;
}

/* Chiamata a Stripe: form-encoded (le API di Stripe non parlano JSON). */
async function stripeApi(path: string, form: Record<string, string>) {
  const body = new URLSearchParams(form).toString();
  const r = await fetch(STRIPE + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d && d.error && d.error.message) || ("Stripe HTTP " + r.status));
  return d;
}

/* L'IMPORTO: un intero di centesimi, o niente.
   Non c'e' nessuna conversione da fare — e' proprio il punto. Qui si controlla
   soltanto che sia quello che dice di essere. */
function centesimi(v: unknown): { ok: true; cents: number } | { ok: false; motivo: string } {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    return { ok: false, motivo: "L'importo va mandato in centesimi interi (campo importo_cents)." };
  }
  if (v <= 0) return { ok: false, motivo: "L'importo deve essere maggiore di zero." };
  if (v > TETTO_CENTS) return { ok: false, motivo: "Importo fuori scala." };
  return { ok: true, cents: v };
}

Deno.serve(async (req: Request) => {
  const CORS = intestazioni(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!SB_URL || !SB_SERVICE) return ko(CORS, 500, "Il ponte non e' configurato.");
  if (!STRIPE_KEY) return ko(CORS, 500, "Manca STRIPE_SECRET_KEY nei secret della funzione.");

  const url = new URL(req.url);
  const rotta = "/" + url.pathname.replace(/^\/+/, "").split("/").slice(1).join("/"); // /stripe/<resto> -> /<resto>

  const utente = await chiChiama(req.headers.get("Authorization") || "");
  const attivo = !!utente && utente.attivo !== false && utente.accesso_iam !== false;
  if (!attivo) return ko(CORS, 401, "Sessione non valida: esci e rientra.");

  // POST /link — crea un link di pagamento Stripe per un importo libero.
  if (req.method === "POST" && rotta === "/link") {
    let corpo: Record<string, unknown> = {};
    try { corpo = await req.json(); } catch { /* corpo vuoto */ }
    /* Una pagina vecchia rimasta aperta manda solo `importo` in euro. Non si
       prova a leggerlo — e' esattamente la lettura che sbagliava: si dice di
       ricaricare. Un rifiuto chiaro costa un giro; un importo indovinato costa
       una telefonata a un cliente. */
    if (corpo.importo_cents === undefined && corpo.importo !== undefined) {
      return ko(CORS, 400, "Questa pagina e' una versione vecchia: ricaricala (Ctrl+R) e riprova.");
    }
    const letto = centesimi(corpo.importo_cents);
    if (!letto.ok) return ko(CORS, 400, letto.motivo);
    const cents = letto.cents;
    const descrizione = String(corpo.descrizione || "Pagamento Withus Assicurazioni").slice(0, 200);
    const cliente = corpo.cliente ? String(corpo.cliente).slice(0, 200) : null;

    // 1) registro la richiesta (mi serve l'id per collegarci il pagamento Stripe)
    const ins = await fetch(SB_URL + "/rest/v1/iam_pagamenti", {
      method: "POST",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        importo_cents: cents, descrizione, cliente, metodo: "stripe", stato: "creato",
        creato_da: utente.id, creato_da_email: utente.email || null,
      }),
    });
    if (!ins.ok) return ko(CORS, 500, "Non sono riuscito a registrare il pagamento.");
    const riga = (await ins.json())[0];

    // 2) prezzo al volo + 3) payment link (con l'id nostro nei metadata, per il webhook)
    try {
      const prezzo = await stripeApi("/prices", {
        unit_amount: String(cents), currency: "eur", "product_data[name]": descrizione,
      });
      const link = await stripeApi("/payment_links", {
        "line_items[0][price]": prezzo.id, "line_items[0][quantity]": "1",
        "metadata[pagamento_id]": riga.id,
      });
      // 4) salvo id/URL del link sulla riga
      await fetch(SB_URL + "/rest/v1/iam_pagamenti?id=eq." + riga.id, {
        method: "PATCH",
        headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_id: link.id, stripe_url: link.url }),
      });
      return ok(CORS, { success: true, id: riga.id, url: link.url, importo_cents: cents });
    } catch (e) {
      await fetch(SB_URL + "/rest/v1/iam_pagamenti?id=eq." + riga.id, {
        method: "PATCH",
        headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "annullato" }),
      });
      return ko(CORS, 502, "Stripe: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  // POST /elimina — cancella un link (solo suo, o top_master; mai uno gia' pagato).
  if (req.method === "POST" && rotta === "/elimina") {
    let corpo: Record<string, unknown> = {};
    try { corpo = await req.json(); } catch { /* vuoto */ }
    const id = String(corpo.id || "");
    if (!id) return ko(CORS, 400, "Manca l'id del pagamento.");

    const r = await fetch(SB_URL + "/rest/v1/iam_pagamenti?select=id,creato_da,stato,stripe_id&id=eq." + encodeURIComponent(id), {
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, Accept: "application/json" },
    });
    const righe = await r.json().catch(() => []);
    const p = Array.isArray(righe) && righe[0];
    if (!p) return ko(CORS, 404, "Pagamento non trovato.");

    // Chi puo': chi l'ha creato, oppure un top_master. Come la RLS di lettura.
    const suo = p.creato_da === utente.id;
    const capo = utente.ruolo === "top_master";
    if (!suo && !capo) return ko(CORS, 403, "Non puoi eliminare questo pagamento.");
    // Un incasso gia' avvenuto NON si cancella: e' un movimento reale.
    if (p.stato === "pagato") return ko(CORS, 400, "Un pagamento gia' incassato non si puo' eliminare.");

    // Disattivo il link su Stripe, cosi' non e' piu' pagabile anche se qualcuno ce l'ha.
    if (p.stripe_id) { try { await stripeApi("/payment_links/" + p.stripe_id, { active: "false" }); } catch { /* best-effort */ } }
    // Tolgo la riga dall'elenco.
    await fetch(SB_URL + "/rest/v1/iam_pagamenti?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE },
    });
    return ok(CORS, { success: true });
  }

  return ko(CORS, 404, "Rotta non riconosciuta.");
});
