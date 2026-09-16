// ═══════════════════════════════════════════════════════════════
//  CONFIGURAZIONE IAM — Insurance Agency Management
// ═══════════════════════════════════════════════════════════════
/* La chat con l'assistente AI è stata rimossa il 14/08/2026, e con essa la
   chiave Groq che stava qui in chiaro. Il repository è pubblico: quella
   chiave è rimasta leggibile a chiunque per tutto il tempo in cui è stata
   qui, quindi va REVOCATA su console.groq.com — toglierla dal file non la
   disattiva. Se un domani serve di nuovo una chiave, non torna in questo
   file: va in un secret (Supabase o GitHub) e la chiama il backend. */

// ── SUPABASE ──────────────────────────────────────────────────
window.SUPABASE_URL  = 'https://ekjxrnsfqxnfxzrthdcf.supabase.co';
window.SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVranhybnNmcXhuZnh6cnRoZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MzU4NjcsImV4cCI6MjA5NTAxMTg2N30.2OF2COAcLgM22xbmtqLWXgaDcVLtNh3AuX5MQ4_L02I';

// ── SOGLIE DI ALLERTA ─────────────────────────────────────────
window.CONFIG = {
  SOGLIA_GIORNI_CRITICO:    60,
  SOGLIA_GIORNI_ATTENZIONE: 30,
  SOGLIA_SCARTO_CASSA:    0.50,
};
