// PAGAMENTI IAM -> STRIPE  (il lato server dei pagamenti di IAM)
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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function ok(body: unknown, stato = 200) {
  return new Response(JSON.stringify(body), { status: stato, headers: { ...CORS, "Content-Type": "application/json" } });
}
function ko(stato: number, messaggio: string) {
  return new Response(JSON.stringify({ success: false, message: messaggio }), {
    status: stato, headers: { ...CORS, "Content-Type": "application/json" },
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

/* L'importo arriva in EURO (es. 150 o 150,50): lo porto a centesimi interi. */
function aCentesimi(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/\./g, "").replace(",", "."));
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!SB_URL || !SB_SERVICE) return ko(500, "Il ponte non e' configurato.");
  if (!STRIPE_KEY) return ko(500, "Manca STRIPE_SECRET_KEY nei secret della funzione.");

  const url = new URL(req.url);
  const rotta = "/" + url.pathname.replace(/^\/+/, "").split("/").slice(1).join("/"); // /stripe/<resto> -> /<resto>

  const utente = await chiChiama(req.headers.get("Authorization") || "");
  const attivo = !!utente && utente.attivo !== false && utente.accesso_iam !== false;
  if (!attivo) return ko(401, "Sessione non valida: esci e rientra.");

  // POST /link — crea un link di pagamento Stripe per un importo libero.
  if (req.method === "POST" && rotta === "/link") {
    let corpo: Record<string, unknown> = {};
    try { corpo = await req.json(); } catch { /* corpo vuoto */ }
    const cents = aCentesimi(corpo.importo);
    if (!cents) return ko(400, "Importo non valido: metti una cifra maggiore di zero.");
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
    if (!ins.ok) return ko(500, "Non sono riuscito a registrare il pagamento.");
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
      return ok({ success: true, id: riga.id, url: link.url, importo_cents: cents });
    } catch (e) {
      await fetch(SB_URL + "/rest/v1/iam_pagamenti?id=eq." + riga.id, {
        method: "PATCH",
        headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, "Content-Type": "application/json" },
        body: JSON.stringify({ stato: "annullato" }),
      });
      return ko(502, "Stripe: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  // POST /elimina — cancella un link (solo suo, o top_master; mai uno gia' pagato).
  if (req.method === "POST" && rotta === "/elimina") {
    let corpo: Record<string, unknown> = {};
    try { corpo = await req.json(); } catch { /* vuoto */ }
    const id = String(corpo.id || "");
    if (!id) return ko(400, "Manca l'id del pagamento.");

    const r = await fetch(SB_URL + "/rest/v1/iam_pagamenti?select=id,creato_da,stato,stripe_id&id=eq." + encodeURIComponent(id), {
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE, Accept: "application/json" },
    });
    const righe = await r.json().catch(() => []);
    const p = Array.isArray(righe) && righe[0];
    if (!p) return ko(404, "Pagamento non trovato.");

    // Chi puo': chi l'ha creato, oppure un top_master. Come la RLS di lettura.
    const suo = p.creato_da === utente.id;
    const capo = utente.ruolo === "top_master";
    if (!suo && !capo) return ko(403, "Non puoi eliminare questo pagamento.");
    // Un incasso gia' avvenuto NON si cancella: e' un movimento reale.
    if (p.stato === "pagato") return ko(400, "Un pagamento gia' incassato non si puo' eliminare.");

    // Disattivo il link su Stripe, cosi' non e' piu' pagabile anche se qualcuno ce l'ha.
    if (p.stripe_id) { try { await stripeApi("/payment_links/" + p.stripe_id, { active: "false" }); } catch { /* best-effort */ } }
    // Tolgo la riga dall'elenco.
    await fetch(SB_URL + "/rest/v1/iam_pagamenti?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE },
    });
    return ok({ success: true });
  }

  return ko(404, "Rotta non riconosciuta.");
});
