-- Il consenso marketing dato nel modulo del sito arriva sulla scheda del
-- cliente (10/10/2026).
--
-- Dalla 0.78.0 il modulo «Richiedi preventivo» (landing e widget) raccoglie il
-- consenso alle offerte commerciali e il server lo registra sulla richiesta,
-- in quote_preventivi.dati.privacy. Le campagne però leggono
-- quote_anagrafiche.consenso_marketing: finché nessuno ce lo porta, il
-- consenso c'è e non serve a niente.
--
-- Il momento giusto è quello in cui l'operatore COLLEGA la richiesta a
-- un'anagrafica (dati.clienteId, scritto da pvSave). La regola sta qui e non
-- nella schermata perché le strade che collegano un cliente sono più di una,
-- e una regola su chi può ricevere offerte scritta in una schermata sola è
-- una regola che la schermata accanto non rispetta.
--
-- LE REGOLE, in ordine:
--   1. La registrazione privacy la scrive SOLO il server. Da un account
--      qualunque `dati.privacy` non si crea e non si cambia: si rimette com'era.
--      Senza questo, chi può modificare una richiesta potrebbe scriversi un
--      consenso e attaccarlo alla scheda di chiunque.
--   2. Si porta solo un consenso VERO (`true`), e solo da una richiesta del
--      sito (modulo 'lead').
--   3. Il contatto deve combaciare: l'email della richiesta, o il suo
--      telefono, deve essere quello della scheda. Il consenso è di chi ha
--      compilato il modulo, non della scheda a cui per sbaglio la si collega.
--   4. Non si scavalca una volontà successiva: un'opposizione o una privacy
--      firmata DOPO il modulo valgono di più (sono più recenti).
--   5. Un consenso che c'è già non si tocca (data e origine restano quelle).
--   L'esito si scrive sulla richiesta (dati.consenso_portato): «portato»
--   oppure il motivo per cui no. Un consenso che non arriva in silenzio è un
--   consenso che nessuno sa di aver perso.

create or replace function public.quote_lead_consenso()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_servizio boolean := coalesce(auth.role(), '') = 'service_role'
                        or current_user in ('postgres', 'service_role', 'supabase_admin');
  v_cli text; v_prima text; v_il timestamptz; a record; v_esito text;
  v_mail text; v_tel text;
begin
  -- 1. la registrazione privacy è del server
  if not v_servizio then
    if tg_op = 'UPDATE' and coalesce(old.dati, '{}'::jsonb) ? 'privacy' then
      new.dati := jsonb_set(coalesce(new.dati, '{}'::jsonb), '{privacy}', old.dati->'privacy');
    elsif coalesce(new.dati, '{}'::jsonb) ? 'privacy' then
      new.dati := new.dati - 'privacy';
    end if;
  end if;

  -- 2. solo un consenso vero, solo da una richiesta del sito
  if new.modulo is distinct from 'lead'
     or (new.dati->'privacy'->>'consenso_marketing') is distinct from 'true' then
    return new;
  end if;
  v_cli := new.dati->>'clienteId';
  v_prima := case when tg_op = 'UPDATE' then old.dati->>'clienteId' end;
  if v_cli is null or v_cli !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or v_cli is not distinct from v_prima then
    return new;
  end if;

  v_il := coalesce(nullif(new.dati->'privacy'->>'consenso_marketing_il', '')::timestamptz, now());
  select id, email, cellulare, telefono, consenso_marketing, opposizione_marketing_il, privacy_firma
    into a from quote_anagrafiche where id = v_cli::uuid;

  v_mail := lower(nullif(trim(new.dati->'contatto'->>'email'), ''));
  v_tel  := right(regexp_replace(coalesce(new.dati->'contatto'->>'telefono', ''), '\D', '', 'g'), 9);

  if not found then
    v_esito := 'scheda non trovata';
  elsif a.consenso_marketing is true then
    v_esito := 'già presente sulla scheda';
  elsif not ( (v_mail is not null and lower(trim(coalesce(a.email, ''))) = v_mail)
           or (length(v_tel) = 9 and v_tel in (
                 right(regexp_replace(coalesce(a.cellulare, ''), '\D', '', 'g'), 9),
                 right(regexp_replace(coalesce(a.telefono, ''), '\D', '', 'g'), 9))) ) then
    v_esito := 'contatti diversi da quelli della scheda';
  elsif a.opposizione_marketing_il is not null and a.opposizione_marketing_il >= v_il then
    v_esito := 'opposizione successiva al modulo';
  elsif nullif(a.privacy_firma->>'firmato_il', '') is not null
        and (a.privacy_firma->>'firmato_il')::timestamptz >= v_il then
    v_esito := 'privacy firmata dopo il modulo';
  else
    update quote_anagrafiche
       set consenso_marketing = true, consenso_marketing_il = v_il,
           consenso_marketing_origine = 'modulo sito'
     where id = a.id;
    v_esito := 'portato';
  end if;

  new.dati := jsonb_set(coalesce(new.dati, '{}'::jsonb), '{consenso_portato}',
    jsonb_build_object('esito', v_esito, 'cliente_id', v_cli, 'il', now()));
  return new;
end $$;

revoke all on function public.quote_lead_consenso() from public;

drop trigger if exists quote_lead_consenso on public.quote_preventivi;
create trigger quote_lead_consenso before insert or update on public.quote_preventivi
  for each row execute function public.quote_lead_consenso();

-- ROLLBACK:
-- drop trigger if exists quote_lead_consenso on public.quote_preventivi;
-- drop function if exists public.quote_lead_consenso();
