// ════════════════════════════════════════════════════════════════════════════
//  IAM · Edge Function "utente-email"
//  Cambia l'indirizzo con cui una persona ENTRA nel sistema.
//
//  PERCHE' ESISTE UNA FUNZIONE APPOSTA
//  In iam_utenti l'email e' una COPIA. Quella vera sta in auth.users, e la
//  puo' toccare solo la chiave di servizio — che nel browser non c'e' e non
//  ci deve stare. Cambiare la copia e basta sarebbe il peggiore dei mondi:
//  l'elenco mostrerebbe il nuovo indirizzo, la persona continuerebbe a
//  entrare con il vecchio, e il messaggio per rifare la password andrebbe al
//  vecchio. Qui le due cose si cambiano INSIEME, e in quest'ordine: prima
//  l'accesso, poi la copia. Se la copia fallisse, si entra comunque con
//  l'indirizzo giusto e resta da sistemare una riga di anagrafica — il
//  contrario lascerebbe una persona fuori dal suo account.
//
//  CHI PUO' CHIAMARLA
//  Solo un amministratore ATTIVO, e il controllo si fa QUI: quello che dice
//  il browser non conta niente, perche' chiunque puo' chiamare questo
//  indirizzo con il proprio token. La casella del proprietario la cambia solo
//  lui.
//
//  PERCHE' SENZA CONFERMA (email_confirm: true)
//  Questa funzione serve quando l'indirizzo registrato e' SBAGLIATO: chiedere
//  una conferma a un indirizzo che la persona non ha mai avuto lascerebbe
//  l'account in mezzo al guado. Chi la usa deve sapere che sta cambiando
//  l'accesso all'istante — per questo ogni passaggio lascia una riga in
//  iam_audit, con chi, quando, da quale indirizzo a quale.
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Lista chiusa, come per il canale fra le due app: mai "*". */
const ORIGINI = [
  "https://iam.withusassicurazioni.it",
  "https://quoto.withusassicurazioni.it",
];
const SUPER_ADMIN = (Deno.env.get("SUPER_ADMIN_EMAIL") || "francesco.oddo199307@gmail.com").toLowerCase();
const RUOLI_AMMESSI = ["admin", "top_master"];

function intestazioni(origin: string | null) {
  const permessa = origin && ORIGINI.includes(origin) ? origin : ORIGINI[0];
  return {
    "Access-Control-Allow-Origin": permessa,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = intestazioni(origin);
  const H = { ...cors, "Content-Type": "application/json; charset=utf-8" };
  const no = (status: number, errore: string) =>
    new Response(JSON.stringify({ ok: false, errore }), { status, headers: H });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return no(405, "Metodo non consentito.");

  const url = Deno.env.get("SUPABASE_URL");
  const chiave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chiave) return no(500, "Funzione non configurata.");
  const admin = createClient(url, chiave, { auth: { persistSession: false } });

  try {
    // ── 1. CHI STA CHIEDENDO ────────────────────────────────────────────────
    const intestazione = req.headers.get("Authorization") || "";
    const jwt = intestazione.startsWith("Bearer ") ? intestazione.slice(7).trim() : "";
    if (!jwt) return no(401, "Sessione mancante.");
    const { data: chi, error: erroreChi } = await admin.auth.getUser(jwt);
    if (erroreChi || !chi?.user) return no(401, "Sessione non valida o scaduta.");

    // ── 2. NE HA IL DIRITTO? Si guarda il database, non quello che dice il browser ──
    const { data: profilo } = await admin
      .from("iam_utenti").select("id,email,nome,cognome,ruolo,attivo")
      .eq("id", chi.user.id).maybeSingle();
    if (!profilo) return no(403, "Utente non riconosciuto.");
    if (profilo.attivo === false) return no(403, "Account sospeso.");
    if (!RUOLI_AMMESSI.includes(String(profilo.ruolo || ""))) {
      return no(403, "Solo un amministratore puo' cambiare l'indirizzo di accesso.");
    }

    // ── 3. COSA CHIEDE ──────────────────────────────────────────────────────
    const corpo = await req.json().catch(() => ({}));
    const userId = String(corpo?.userId || "").trim();
    const email = String(corpo?.email || "").trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return no(400, "Utente non indicato.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      return no(400, "L'indirizzo non ha una forma valida.");
    }

    const { data: bersaglio } = await admin
      .from("iam_utenti").select("id,email,nome,cognome").eq("id", userId).maybeSingle();
    if (!bersaglio) return no(404, "Utente non trovato.");
    const vecchia = String(bersaglio.email || "").toLowerCase();

    // ── 4. LA CASELLA DEL PROPRIETARIO LA CAMBIA SOLO LUI ───────────────────
    if (vecchia === SUPER_ADMIN && chi.user.id !== bersaglio.id) {
      return no(403, "L'indirizzo del proprietario puo' cambiarlo soltanto lui.");
    }
    if (vecchia === email) return no(400, "E' gia' questo l'indirizzo.");

    // ── 5. NON DEVE ESSERE DI UN ALTRO ──────────────────────────────────────
    // Meglio dirlo qui con parole chiare che lasciare uscire l'errore grezzo
    // dell'anagrafe degli accessi, che nessuno saprebbe interpretare.
    const { data: gia } = await admin
      .from("iam_utenti").select("id").ilike("email", email).neq("id", userId).limit(1);
    if (gia && gia.length) return no(409, "Questo indirizzo e' gia' di un altro utente.");

    // ── 6. SI CAMBIA DOVE CONTA ─────────────────────────────────────────────
    const { error: erroreAuth } = await admin.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (erroreAuth) {
      return no(400, "L'anagrafe degli accessi ha rifiutato: " + (erroreAuth.message || "errore"));
    }

    // ── 7. E POI LA COPIA ───────────────────────────────────────────────────
    const { error: erroreCopia } = await admin.from("iam_utenti").update({ email }).eq("id", userId);

    // ── 8. A REGISTRO, SEMPRE ───────────────────────────────────────────────
    // Cambiare l'accesso di una persona e' una cosa che si deve poter
    // ricostruire dopo: chi, quando, da quale indirizzo a quale.
    await admin.from("iam_audit").insert({
      utente_id: chi.user.id,
      utente_nome: [profilo.nome, profilo.cognome].filter(Boolean).join(" ") || profilo.email,
      azione: "cambio_email_accesso",
      tabella: "auth.users",
      riferimento: userId,
      dettaglio: {
        da: vecchia,
        a: email,
        su: [bersaglio.nome, bersaglio.cognome].filter(Boolean).join(" ") || null,
        copia_anagrafica: erroreCopia ? "non aggiornata" : "aggiornata",
      },
    }).then(() => {}, () => {});   // il registro non deve far fallire il cambio

    if (erroreCopia) {
      return new Response(JSON.stringify({
        ok: true,
        email,
        avviso: "L'accesso e' stato cambiato, ma la copia in anagrafica no: l'elenco puo' mostrare ancora l'indirizzo vecchio. Riprova a salvare i dati.",
      }), { status: 200, headers: H });
    }
    return new Response(JSON.stringify({ ok: true, email }), { status: 200, headers: H });
  } catch (e) {
    return no(500, "Errore imprevisto: " + (e instanceof Error ? e.message : String(e)));
  }
});
