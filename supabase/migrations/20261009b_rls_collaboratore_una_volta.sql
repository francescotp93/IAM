-- La lettura lenta per i collaboratori (09/10/2026): «di chi posso vedere le
-- righe» si chiede una volta per elenco, non per riga.
--
-- MISURATO: dopo la 20261009 lo staff legge sei tabelle in 20 ms, ma un
-- collaboratore ci metteva 2,6 secondi. Per lui il primo pezzo della politica
-- è falso e si arriva a `quote_vede(creato_da)`, che è SECURITY DEFINER e
-- quindi si chiama RIGA PER RIGA: ogni chiamata rilegge `iam_utenti` due o tre
-- volte (sei staff? sei tu? siete nella stessa rete?).
--
-- `quote_proprietari_visibili()` risponde UNA volta alla domanda «quali
-- creatori posso vedere»: me stesso, e chi sta nella mia rete se ne ho una.
-- Dentro la politica sta in un `(select …)`, quindi Postgres la calcola una
-- volta per query (InitPlan) e per ogni riga resta un confronto in un elenco.
--
-- LA REGOLA È LA STESSA DI quote_vede, pezzo per pezzo:
--   owner is not null and owner = auth.uid()          → me stesso nell'elenco
--   owner is not null and stessa rete (me.rete non nulla) → i colleghi di rete
--   un proprietario nullo non è mai visibile: `null = any(...)` non è vero.
-- L'equivalenza è stata provata sul database per ogni utente e ogni possibile
-- proprietario (vedi CLAUDE.md, 09/10/2026), e `quote_vede` resta dov'è: la
-- usano altre politiche e la storage.

create or replace function public.quote_proprietari_visibili()
returns uuid[]
language sql stable security definer
set search_path to 'public'
as $$
  select array(
    select auth.uid() where auth.uid() is not null
    union
    select o.id
      from public.iam_utenti me
      join public.iam_utenti o on o.rete = me.rete
     where me.id = auth.uid() and me.rete is not null
  );
$$;

revoke all on function public.quote_proprietari_visibili() from public;
grant execute on function public.quote_proprietari_visibili() to authenticated;

alter policy pol_select  on public.quote_polizze     using ((select public.iam_is_staff()) or creato_da = any ((select public.quote_proprietari_visibili())::uuid[]));
alter policy anag_select on public.quote_anagrafiche using ((select public.iam_is_staff()) or creato_da = any ((select public.quote_proprietari_visibili())::uuid[]));
alter policy prev_select on public.quote_preventivi  using ((select public.iam_is_staff()) or creato_da = any ((select public.quote_proprietari_visibili())::uuid[]));
alter policy sin_select  on public.quote_sinistri    using ((select public.iam_is_staff()) or creato_da = any ((select public.quote_proprietari_visibili())::uuid[]));
alter policy prat_select on public.quote_pratiche    using ((select public.iam_is_staff()) or creato_da = any ((select public.quote_proprietari_visibili())::uuid[]));
alter policy tit_select  on public.quote_titoli      using ((select public.iam_is_staff()) or exists (
  select 1 from public.quote_polizze p
  where p.id = quote_titoli.polizza_id and p.creato_da = any ((select public.quote_proprietari_visibili())::uuid[])));

-- ROLLBACK (torna alla 20261009: lo staff veloce, il collaboratore riga per riga):
-- alter policy pol_select  on public.quote_polizze     using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
-- alter policy anag_select on public.quote_anagrafiche using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
-- alter policy prev_select on public.quote_preventivi  using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
-- alter policy sin_select  on public.quote_sinistri    using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
-- alter policy prat_select on public.quote_pratiche    using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
-- alter policy tit_select  on public.quote_titoli      using ((select public.iam_is_staff()) or exists (select 1 from public.quote_polizze p
--   where p.id = quote_titoli.polizza_id and public.quote_vede(p.creato_da)));
-- drop function public.quote_proprietari_visibili();
