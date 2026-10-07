-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  AREA RISERVATA CONVENZIONATI — due chiusure e un nome      07/10/2026   ║
-- ║  BOZZA PRONTA, NON ANCORA APPLICATA: serve l'ok di Francesco.           ║
-- ╚═════════════════════════════════════════════════════════════════════════╝
--
--  Trovato verificando l'area riservata sul database vero (pg_policies e
--  permessi per colonna letti il 07/10/2026), non ricostruito a memoria.
--
--  1. UN ASSOCIATO PUO' RISCRIVERSI LA PROPRIA RIGA DAL BROWSER.
--     La politica `assoc_update_proprio` (auth_user_id = auth.uid()) gli
--     lascia cambiare, con due righe nella console del browser, QUALUNQUE
--     colonna della sua riga in quote_convenzione_associati, tra cui:
--       · convenzione_id  → si sposta in un'altra convenzione e ne vede
--                           prodotti, offerte e condizioni;
--       · privacy_accettata_il / marketing_accettato / privacy_versione
--                         → un consenso «registrato» senza codice OTP: e'
--                           proprio la prova che l'OTP deve garantire;
--       · otp_hash        → si scrive da solo l'impronta del codice e poi lo
--                           «conferma»;
--       · stato, deve_cambiare_password, email, verificato_da ...
--     Nessuno la usa: la pagina area.html non scrive mai la tabella, e il
--     server (server/convenzionati.js) scrive con la chiave di servizio, che
--     le politiche non le guarda. Lo staff scrive con `assoc_update`, che resta.
--
--  2. IL NOME DELLA CONVENZIONE NON ARRIVA ALL'ASSOCIATO.
--     quote_convenzioni si legge solo se iam_is_staff(): l'associato riceve la
--     propria riga con quote_convenzioni = null, e nell'area il nome mancava.
--     NON si apre la tabella (dentro ci sono token di iscrizione e condizioni
--     riservate): una funzione restituisce SOLO nome ed ente della SUA.
--     area.html la chiama gia' (miaConvenzione) e, finche' non c'e', tace.
--
--  NON INCLUSO, DA DECIDERE A PARTE (vedi DECISIONI.md, 07/10/2026):
--     l'associato puo' ancora LEGGERE `otp_hash` della propria riga. E' uno
--     sha256 di sei cifre + id: si indovina in un attimo provando il milione
--     di combinazioni. Chiuderlo richiede di spostare l'impronta fuori dalla
--     tabella (o di togliere la lettura della colonna) E di cambiare
--     chiEntra() nel server, che oggi legge la riga col token dell'associato.
--     Tocca il server in produzione: e' un lavoro suo.
--
--  ROLLBACK
--    create policy assoc_update_proprio on quote_convenzione_associati
--      for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
--    drop function if exists mia_convenzione();
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Niente piu' scrittura diretta della propria riga.
drop policy if exists assoc_update_proprio on quote_convenzione_associati;

-- 2. Il nome della propria convenzione, e solo quello.
create or replace function mia_convenzione()
returns table (nome text, ente text)
language sql
stable
security definer
set search_path = public
as $$
  select c.nome, c.ente
  from quote_convenzioni c
  join quote_convenzione_associati a on a.convenzione_id = c.id
  where a.auth_user_id = auth.uid()
    and a.stato = 'approvato'
  limit 1
$$;
revoke all on function mia_convenzione() from public;
revoke all on function mia_convenzione() from anon;
grant execute on function mia_convenzione() to authenticated;

commit;

-- VERIFICA DOPO (deve dare: nessuna riga per la prima, una per la seconda)
--   select policyname from pg_policies
--    where tablename = 'quote_convenzione_associati' and policyname = 'assoc_update_proprio';
--   select proname from pg_proc where proname = 'mia_convenzione';
