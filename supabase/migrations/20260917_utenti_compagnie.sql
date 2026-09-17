-- Compagnie visibili su Quoto, per utente (17/09/2026, Lavoro 2 PR 2).
-- null = tutte. La lista dei nomi e' quella di quote_prodotti_catalogo.compagnie:
-- nessuna anagrafica compagnie nuova. La colonna entra nella blindatura di
-- u_update_self: la sceglie l'amministratore, non l'interessato.
alter table public.iam_utenti add column if not exists compagnie text[];
comment on column public.iam_utenti.compagnie is 'Compagnie che l''utente vede nel preventivatore (nomi di quote_prodotti_catalogo.compagnie). null = tutte. La scrive solo IAM → Utenti.';

drop policy if exists u_update_self on public.iam_utenti;
create policy u_update_self on public.iam_utenti
for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and not (ruolo         is distinct from (select ruolo         from public.iam_utenti where id = auth.uid()))
  and not (accesso_iam   is distinct from (select accesso_iam   from public.iam_utenti where id = auth.uid()))
  and not (accesso_quoto is distinct from (select accesso_quoto from public.iam_utenti where id = auth.uid()))
  and not (coalesce(attivo, true) is distinct from (select coalesce(attivo, true) from public.iam_utenti where id = auth.uid()))
  and not (permessi      is distinct from (select permessi      from public.iam_utenti where id = auth.uid()))
  and not (coalesce(lab_abilitato, false) is distinct from (select coalesce(lab_abilitato, false) from public.iam_utenti where id = auth.uid()))
  and not (coalesce(responsabile,  false) is distinct from (select coalesce(responsabile,  false) from public.iam_utenti where id = auth.uid()))
  and not (coalesce(quoto,         false) is distinct from (select coalesce(quoto,         false) from public.iam_utenti where id = auth.uid()))
  and not (rete          is distinct from (select rete          from public.iam_utenti where id = auth.uid()))
  and not (moduli        is distinct from (select moduli        from public.iam_utenti where id = auth.uid()))
  and not (mail_caselle  is distinct from (select mail_caselle  from public.iam_utenti where id = auth.uid()))
  and not (profilo       is distinct from (select profilo       from public.iam_utenti where id = auth.uid()))
  and not (prodotti      is distinct from (select prodotti      from public.iam_utenti where id = auth.uid()))
  and not (compagnie     is distinct from (select compagnie     from public.iam_utenti where id = auth.uid()))
);
