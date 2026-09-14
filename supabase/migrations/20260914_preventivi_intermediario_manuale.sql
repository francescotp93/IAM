-- ═══════════════════════════════════════════════════════════════════════════
--  L'INTERMEDIARIO SCRITTO A MANO  (14/09/2026)
--
--  La tendina propone i collaboratori che stanno in quote_collaboratori. Ma
--  non tutti ci stanno: un collaboratore nuovo che non ha ancora la scheda,
--  uno di passaggio, o semplicemente un nome che sul documento deve comparire
--  diverso. Finora, in quei casi, l'unica strada era lasciare vuoto — e sul
--  foglio ci finiva l'agenzia, che non e' sempre quello che si vuole.
--
--  Sul documento l'ordine e': collaboratore scelto, poi questi due campi,
--  poi l'agenzia. Uno solo dei tre, e sempre uno: un preventivo senza
--  intermediario iscritto non e' un documento che si consegna.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.quote_preventivi_personalizzati
  add column if not exists intermediario_nome text,
  add column if not exists intermediario_rui  text;

-- O si sceglie dalla tendina, o si scrive a mano: mai tutti e due. Con
-- entrambi valorizzati nessuno saprebbe piu' quale dei due va sul foglio, e
-- la risposta finirebbe per dipendere dall'ordine in cui e' scritto il codice.
alter table public.quote_preventivi_personalizzati
  add constraint pp_intermediario_uno_solo check (
    intermediario_id is null
    or (intermediario_nome is null and intermediario_rui is null)
  );

comment on column public.quote_preventivi_personalizzati.intermediario_nome is
  'Intermediario scritto a mano, quando non si sceglie un collaboratore in elenco. Sul documento vince il collaboratore, poi questo, poi l''agenzia.';
