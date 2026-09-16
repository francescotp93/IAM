-- ═══════════════════════════════════════════════════════════════════════════════
--  DA APPROVARE — NON ESEGUITO
--
--  Questo file NON e' stato lanciato sull'archivio. Tocca le regole di accesso
--  in produzione: lo esegue Francesco, o Leo dopo il suo via libera esplicito.
--
--  COSA HO TROVATO
--  Sulla tabella iam_utenti c'e' una regola, u_update_self, che permette a
--  ciascuno di modificare la PROPRIA riga. E' giusto: serve per il tema, la
--  firma, l'email. La regola blocca il cambio di ruolo, di accesso_iam, di
--  accesso_quoto e di attivo — cosi' nessuno puo' promuoversi da solo.
--
--  Non blocca pero' queste colonne:
--    permessi        (jsonb) — le sezioni di IAM che l'utente vede, e da oggi
--                              anche le abilitazioni della scheda KPI
--    lab_abilitato   (bool)  — accesso al modulo Lab
--    responsabile    (bool)  — usato per distinguere chi guida una rete
--    rete            (text)  — a quale rete appartiene
--    moduli          (array) — moduli attivi
--    quoto           (bool)  — vecchio interruttore del modulo QUOTO
--    mail_caselle    (text)  — quali caselle di posta vede
--
--  Vuol dire che un collaboratore, dalla console del proprio browser, puo'
--  riaprirsi da solo le sezioni che gli sono state chiuse, accendersi Lab e
--  intestarsi caselle di posta non sue. Non serve nessuna password in piu':
--  la chiave pubblica di Supabase e' nel browser, com'e' normale che sia — e'
--  proprio per questo che il controllo deve stare nell'archivio.
--
--  NOTA: il problema esisteva gia' prima ed e' indipendente dal lavoro sulle
--  spunte KPI. Le spunte KPI, fino a ieri, stavano soltanto nella memoria del
--  browser: erano modificabili ancora piu' facilmente. Questa riga le rende
--  effettive, questa migrazione le rende inviolabili.
--
--  COSA FA LA MIGRAZIONE
--  Riscrive u_update_self aggiungendo le colonne mancanti all'elenco di quelle
--  che l'utente non puo' cambiare su se stesso. Gli amministratori continuano a
--  poterle cambiare per chiunque, tramite la regola u_update_admin, che resta
--  com'e'. Nessun dato viene toccato: cambiano solo i permessi di scrittura.
--
--  PRIMA DI ESEGUIRE
--   1. Verificare che nessuna schermata faccia cambiare a un utente, su se
--      stesso, una di queste colonne. Il controllo fatto su index.html: le
--      scritture su se stessi riguardano tema, accent, firma ed email; tutte
--      le altre passano dalle funzioni del pannello amministratore.
--   2. Dopo l'esecuzione, provare con un'utenza collaboratore: deve poter
--      ancora cambiare tema e firma, e non deve poter cambiare permessi.
-- ═══════════════════════════════════════════════════════════════════════════════

drop policy if exists u_update_self on public.iam_utenti;

create policy u_update_self on public.iam_utenti
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  -- nessuna di queste colonne puo' essere diversa da com'e' adesso
  and not (ruolo         is distinct from (select ruolo         from public.iam_utenti where id = auth.uid()))
  and not (accesso_iam   is distinct from (select accesso_iam   from public.iam_utenti where id = auth.uid()))
  and not (accesso_quoto is distinct from (select accesso_quoto from public.iam_utenti where id = auth.uid()))
  and not (coalesce(attivo, true) is distinct from (select coalesce(attivo, true) from public.iam_utenti where id = auth.uid()))
  -- aggiunte con questa migrazione
  and not (permessi      is distinct from (select permessi      from public.iam_utenti where id = auth.uid()))
  and not (coalesce(lab_abilitato, false) is distinct from (select coalesce(lab_abilitato, false) from public.iam_utenti where id = auth.uid()))
  and not (coalesce(responsabile,  false) is distinct from (select coalesce(responsabile,  false) from public.iam_utenti where id = auth.uid()))
  and not (coalesce(quoto,         false) is distinct from (select coalesce(quoto,         false) from public.iam_utenti where id = auth.uid()))
  and not (rete          is distinct from (select rete          from public.iam_utenti where id = auth.uid()))
  and not (moduli        is distinct from (select moduli        from public.iam_utenti where id = auth.uid()))
  and not (mail_caselle  is distinct from (select mail_caselle  from public.iam_utenti where id = auth.uid()))
);

-- Per tornare indietro, se qualcosa si inceppa: rimettere la versione di prima
-- togliendo le sette righe marcate "aggiunte con questa migrazione".
