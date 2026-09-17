-- ═══════════════════════════════════════════════════════════════════════════════
--  REGISTRO UNICO DELLE PERSONE — 17/09/2026 (Lavoro 2, PR 1)
--
--  Prima: tre registri di persone quasi scollegati. quote_collaboratori
--  (anagrafica, candidati, black list: 3 righe), iam_team (l'economia del
--  collaboratore attivo: IBAN, provvigioni, fatture, RUI verificato: 12 righe,
--  collab_id vuoto su tutte), iam_utenti (gli account: 5 righe, 4 senza scheda).
--
--  Dopo: OGNI persona ha una riga sola in quote_collaboratori. iam_team resta
--  come allegato economico della persona, agganciato da collab_id, mai piu'
--  come secondo registro. Gli utenti sono persone con un account: l'aggancio
--  e' quote_collaboratori.iam_id.
--
--  Il riscontro e' prudente: si aggancia per codice fiscale, poi per email, e
--  solo quando la corrispondenza e' UNA. Se sono due, non si sceglie: la riga
--  resta scollegata e la si guarda a mano. Idempotente: rilanciata, non trova
--  piu' niente da agganciare.
--
--  In coda: la blindatura di iam_utenti (u_update_self) scritta il 10/09 e
--  approvata da Francesco il 17/09/2026, con in piu' profilo e prodotti.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. iam_team → una persona per ogni scheda economica ──────────────────────
do $$
declare
  t record;
  cid uuid;
  n int;
  cf_norm text;
  em_norm text;
begin
  for t in select * from public.iam_team where collab_id is null loop
    cid := null;
    cf_norm := upper(regexp_replace(coalesce(t.cf, ''), '[^A-Za-z0-9]', '', 'g'));
    em_norm := lower(trim(coalesce(t.email, '')));

    if cf_norm <> '' then
      select count(*), (array_agg(id))[1] into n, cid from public.quote_collaboratori
        where upper(regexp_replace(coalesce(codice_fiscale, ''), '[^A-Za-z0-9]', '', 'g')) = cf_norm;
      if n <> 1 then cid := null; end if;
    end if;
    -- Per email solo se quell'email in iam_team e' di UNA scheda: due schede
    -- economiche con la stessa email sono due persone finche' qualcuno non dice
    -- il contrario (trovate il 17/09/2026: 1780477740576 e 1780477939669).
    if cid is null and em_norm <> ''
       and (select count(*) from public.iam_team where lower(trim(coalesce(email, ''))) = em_norm) = 1 then
      select count(*), (array_agg(id))[1] into n, cid from public.quote_collaboratori
        where lower(trim(coalesce(email, ''))) = em_norm;
      if n <> 1 then cid := null; end if;
    end if;

    if cid is null then
      insert into public.quote_collaboratori
        (nome, cognome, email, telefono, codice_fiscale, rui_numero, rui_sezione, veste,
         stato, attivo, creato_da, creato_il, fonte, confermato_il, contatto_il)
      values
        (nullif(trim(coalesce(t.nome, '')), ''), nullif(trim(coalesce(t.cogn, '')), ''),
         nullif(em_norm, ''), nullif(trim(coalesce(t.tel, '')), ''), nullif(cf_norm, ''),
         nullif(trim(coalesce(t.rui, '')), ''), nullif(trim(coalesce(t.rui_sezione, '')), ''), nullif(trim(coalesce(t.tipo, '')), ''),
         'attivo', true, t.creato_da, coalesce(t.creato_il, now()), 'iam_team', coalesce(t.dinizio::timestamptz, t.creato_il, now()), t.dinizio)
      returning id into cid;
    else
      -- la scheda esisteva: se le mancano RUI o codice fiscale, li prende dall'economia
      update public.quote_collaboratori set
        rui_numero = coalesce(nullif(rui_numero, ''), nullif(trim(coalesce(t.rui, '')), '')),
        rui_sezione = coalesce(nullif(rui_sezione, ''), nullif(trim(coalesce(t.rui_sezione, '')), '')),
        codice_fiscale = coalesce(nullif(codice_fiscale, ''), nullif(cf_norm, '')),
        telefono = coalesce(nullif(telefono, ''), nullif(trim(coalesce(t.tel, '')), '')),
        stato = case when stato in ('candidato', 'in_valutazione') then 'attivo' else stato end,
        attivo = case when stato in ('candidato', 'in_valutazione', 'attivo') then true else attivo end
      where id = cid;
    end if;

    update public.iam_team set collab_id = cid where id = t.id;
  end loop;
end $$;

-- ── 2. iam_utenti → ogni account e' una persona ───────────────────────────────
do $$
declare
  u record;
  cid uuid;
  n int;
  em_norm text;
begin
  for u in select * from public.iam_utenti loop
    if exists (select 1 from public.quote_collaboratori where iam_id = u.id) then continue; end if;
    em_norm := lower(trim(coalesce(u.email, '')));
    cid := null;
    if em_norm <> '' then
      select count(*), (array_agg(id))[1] into n, cid from public.quote_collaboratori
        where iam_id is null and lower(trim(coalesce(email, ''))) = em_norm;
      if n <> 1 then cid := null; end if;
    end if;
    if cid is not null then
      update public.quote_collaboratori set iam_id = u.id where id = cid;
    else
      insert into public.quote_collaboratori
        (nome, cognome, email, stato, attivo, iam_id, creato_da, creato_il, fonte, confermato_il)
      values
        (nullif(trim(coalesce(u.nome, '')), ''), nullif(trim(coalesce(u.cognome, '')), ''), nullif(em_norm, ''),
         'attivo', coalesce(u.attivo, true), u.id, u.id, coalesce(u.creato_il, now()), 'iam_utenti', coalesce(u.creato_il, now()));
    end if;
  end loop;
end $$;

-- ── 3. i vincoli che tengono unico il registro ───────────────────────────────
-- Un account e' di UNA persona; una scheda economica e' di UNA persona.
create unique index if not exists quote_collaboratori_iam_id_uidx on public.quote_collaboratori (iam_id) where iam_id is not null;
create unique index if not exists iam_team_collab_id_uidx on public.iam_team (collab_id) where collab_id is not null;
create index if not exists quote_collaboratori_email_idx on public.quote_collaboratori (lower(email));

comment on column public.quote_collaboratori.iam_id is 'L''account IAM di questa persona (iam_utenti.id). Una persona, un account: indice unico.';
comment on column public.iam_team.collab_id is 'La persona di questa scheda economica (quote_collaboratori.id). Dal 17/09/2026 iam_team e'' un allegato del registro, non un registro.';

-- ── 4. la blindatura di iam_utenti (approvata il 17/09/2026) ─────────────────
-- Ciascuno modifica la PROPRIA riga solo per tema, accent, firma, email, nome:
-- ruoli, accessi, permessi, profilo, prodotti, moduli, rete, caselle restano
-- come sono. Gli amministratori passano da u_update_admin, che non cambia.
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
);
