-- L'opposizione al marketing (08/10/2026).
--
-- Serve alla platea «soft spam» (art. 130 c. 4 Codice Privacy): ai clienti si
-- possono mandare email su prodotti analoghi a quelli acquistati SENZA consenso,
-- a patto che non si siano opposti. Quindi l'opposizione va registrata, e deve
-- valere per sempre e per tutte le strade — una disiscrizione che vive solo su
-- Brevo non la vede la prossima lista costruita qui.
--
-- Una data e non un sì/no: «quando si è opposto» è quello che si chiede il
-- giorno in cui qualcuno contesta un invio. Nessun valore di partenza: nessuno
-- si è opposto finché non lo fa (§8.1).
alter table public.quote_anagrafiche
  add column if not exists opposizione_marketing_il timestamptz;

-- ROLLBACK
-- alter table public.quote_anagrafiche drop column if exists opposizione_marketing_il;
