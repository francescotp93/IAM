-- ═══════════════════════════════════════════════════════════════════════════════
--  Brief IAM #01, M3.1 (19/09/2026) — la data di nascita ricavata dal codice
--  fiscale, per le anagrafiche che ce l'hanno vuota.
--
--  Nessuna colonna nuova, nessuna politica toccata: è un backfill una tantum.
--  Misurato prima di scrivere: 61 anagrafiche, 39 con data di nascita, 21
--  persone fisiche senza; di queste 20 hanno un codice fiscale «pulito»
--  (sedici caratteri, cifre al posto giusto), 0 sono omocodici.
--
--  La regola è la STESSA del motore (tariffe/motore/anagrafica.js): mese in
--  lettera, giorno +40 per le donne, anno a due cifre con «se non è nel futuro
--  è questo secolo». Qui NON si verifica il carattere di controllo e non si
--  sciolgono le omocodie: chi ha un codice omocodico o un refuso resta vuoto,
--  e la data gliela mette il motore dalla pagina, che il controllo lo fa.
--  Un codice che produce una data inesistente (31/04) non scrive niente:
--  make_date solleva, e lo si evita con il controllo a monte.
--
--  ROLLBACK: non c'è un «prima» da rimettere (erano NULL); per annullare:
--    update quote_anagrafiche set data_nascita = null
--     where data_nascita_origine = 'codice_fiscale';
--  … ma la colonna di origine NON esiste: si annota qui, in `note`, e nel
--  registro. Chi vuole tornare indietro cerca le righe con la nota.
-- ═══════════════════════════════════════════════════════════════════════════════

with da_ricavare as (
  select id, upper(codice_fiscale) as cf
    from public.quote_anagrafiche
   where data_nascita is null
     and coalesce(tipo, 'fisica') <> 'giuridica'
     and upper(codice_fiscale) ~ '^[A-Z]{6}[0-9]{2}[ABCDEHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$'
), calcolo as (
  select id, cf,
         substr(cf, 7, 2)::int as yy,
         case substr(cf, 9, 1)
           when 'A' then 1 when 'B' then 2 when 'C' then 3 when 'D' then 4 when 'E' then 5 when 'H' then 6
           when 'L' then 7 when 'M' then 8 when 'P' then 9 when 'R' then 10 when 'S' then 11 when 'T' then 12 end as mese,
         case when substr(cf, 10, 2)::int > 40 then substr(cf, 10, 2)::int - 40 else substr(cf, 10, 2)::int end as giorno
    from da_ricavare
), date_valide as (
  select id, cf, mese, giorno,
         case when yy <= (extract(year from current_date)::int % 100) then 2000 + yy else 1900 + yy end as anno
    from calcolo
   where giorno between 1 and 31
)
update public.quote_anagrafiche a
   set data_nascita = make_date(d.anno, d.mese, d.giorno),
       note = concat_ws(E'\n', nullif(a.note, ''), 'Data di nascita ricavata dal codice fiscale il ' || to_char(current_date, 'DD/MM/YYYY') || ' (M3.1).')
  from date_valide d
 where a.id = d.id
   and (d.mese in (1,3,5,7,8,10,12) or (d.mese in (4,6,9,11) and d.giorno <= 30)
        or (d.mese = 2 and d.giorno <= 28)
        or (d.mese = 2 and d.giorno = 29 and ((d.anno % 4 = 0 and d.anno % 100 <> 0) or d.anno % 400 = 0)));
