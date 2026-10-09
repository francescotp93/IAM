-- La Scrivania lenta (09/10/2026): il permesso si chiede una volta, non per riga.
--
-- MISURATO: `quote_vede(creato_da)` è SECURITY DEFINER, quindi Postgres non
-- lo può sciogliere dentro la query e lo chiama RIGA PER RIGA — e ogni
-- chiamata rilegge `iam_utenti` per sapere se chi legge è staff. Una pagina
-- di mille polizze dello scadenzario, da admin: 580 ms. Con la domanda
-- «sei staff?» fatta una volta sola (`(select iam_is_staff())` diventa un
-- InitPlan, calcolato una volta per query): 13 ms.
--
-- LA REGOLA NON CAMBIA. `quote_vede` comincia già con `iam_is_staff()`:
-- per lo staff la risposta era «sì» ed è «sì», per un collaboratore il
-- primo pezzo è falso e si passa a `quote_vede` come prima. Si cambia solo
-- QUANTE VOLTE si fa la stessa domanda.
--
-- ALTER POLICY e non DROP/CREATE: la politica resta al suo posto, e lo
-- strumento delle migrazioni si blocca sui DROP POLICY (§75).

alter policy pol_select  on public.quote_polizze     using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
alter policy anag_select on public.quote_anagrafiche using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
alter policy prev_select on public.quote_preventivi  using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
alter policy sin_select  on public.quote_sinistri    using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
alter policy prat_select on public.quote_pratiche    using ((select public.iam_is_staff()) or public.quote_vede(creato_da));
alter policy tit_select  on public.quote_titoli      using ((select public.iam_is_staff()) or exists (
  select 1 from public.quote_polizze p
  where p.id = quote_titoli.polizza_id and public.quote_vede(p.creato_da)));

-- ROLLBACK (riporta il controllo riga per riga, identico nel risultato):
-- alter policy pol_select  on public.quote_polizze     using (public.quote_vede(creato_da));
-- alter policy anag_select on public.quote_anagrafiche using (public.quote_vede(creato_da));
-- alter policy prev_select on public.quote_preventivi  using (public.quote_vede(creato_da));
-- alter policy sin_select  on public.quote_sinistri    using (public.quote_vede(creato_da));
-- alter policy prat_select on public.quote_pratiche    using (public.quote_vede(creato_da));
-- alter policy tit_select  on public.quote_titoli      using (exists (select 1 from public.quote_polizze p
--   where p.id = quote_titoli.polizza_id and public.quote_vede(p.creato_da)));
