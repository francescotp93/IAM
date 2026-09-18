-- ═══════════════════════════════════════════════════════════════════════════════
--  IL MEZZO DI PAGAMENTO, E I COLLABORATORI DEL FLUSSO (18/09/2026)
--
--  Tre aggiunte, tutte nate da quello che il flusso delle compagnie porta
--  davvero e che finora si buttava.
--
--  1. COME PAGA IL CLIENTE, SULLA POLIZZA. Il flusso lo dice per ogni polizza
--     e per ogni rata; noi lo tenevamo solo sulle rate. Ma la domanda che si
--     fa in agenzia è «questo cliente come paga?», non «come ha pagato la
--     terza rata»: la colonna sta sulla polizza, e si può correggere.
--
--  2. IL VOCABOLARIO SI ALLARGA A QUELLO CHE ESISTE. `quote_titoli` ammetteva
--     cinque mezzi: contante, assegno, bonifico, POS, carta di credito. Nel
--     file vero ce ne sono altri — PayPal, prepagate, pagamenti passati da
--     fuori — e finivano tutti a NULL. Una rata incassata senza mezzo di
--     pagamento è un buco in contabilità: si sa che è stata pagata e non come.
--     `altro` non è una scorciatoia: è la risposta onesta quando la compagnia
--     manda una lista di modi possibili invece di quello usato.
--
--  3. CHI HA PRODOTTO CHE COSA. Il flusso porta i collaboratori con la loro
--     EMAIL — l'unico campo che corrisponde a qualcosa che abbiamo già, perché
--     i codici della compagnia («U25337») non li conosce nessuno. Il registro
--     del caricamento se li tiene: chi c'era, con quanto prodotto e quante
--     provvigioni.
--
--     NON crea persone e NON aggancia niente da solo. Il registro unico delle
--     persone è un'altra cosa, e agganciarlo a occhio su un'email creerebbe i
--     doppioni che quel lavoro ha appena tolto. Qui si conserva il dato; chi
--     abbinare a chi lo decide una persona.
--
--  SOLO AGGIUNTE, tranne il vincolo di valore che si allarga: i cinque mezzi
--  di prima restano tutti validi.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. IL MEZZO DI PAGAMENTO SULLA POLIZZA ───────────────────────────────────
alter table public.quote_polizze add column if not exists mezzo_pagamento text;

comment on column public.quote_polizze.mezzo_pagamento is
  'Come paga il cliente. Arriva dal flusso della compagnia quando c''e'', e si corregge a mano: un codice che non sappiamo tradurre resta NULL invece di diventare un mezzo inventato.';

-- ── 2. IL VOCABOLARIO, SULLE DUE TABELLE ─────────────────────────────────────
-- Stesso elenco in tutti e due i posti: due vocabolari diversi per la stessa
-- cosa vorrebbero dire una rata che si puo' salvare e una polizza che no.
alter table public.quote_titoli drop constraint if exists quote_titoli_mezzo_pagamento_check;
alter table public.quote_titoli add constraint quote_titoli_mezzo_pagamento_check
  check (mezzo_pagamento is null or mezzo_pagamento in
    ('contante','assegno','bonifico','pos','carta_credito','paypal','prepagata','domiciliazione','altro'));

alter table public.quote_polizze drop constraint if exists quote_polizze_mezzo_pagamento_check;
alter table public.quote_polizze add constraint quote_polizze_mezzo_pagamento_check
  check (mezzo_pagamento is null or mezzo_pagamento in
    ('contante','assegno','bonifico','pos','carta_credito','paypal','prepagata','domiciliazione','altro'));

-- ── 3. I COLLABORATORI DI OGNI CARICAMENTO ───────────────────────────────────
alter table public.quote_importazioni add column if not exists collaboratori jsonb not null default '[]'::jsonb;

comment on column public.quote_importazioni.collaboratori is
  'Chi compare nel flusso: codice della compagnia, nome, EMAIL, RUI, titoli, premi e provvigioni. L''email e'' il ponte verso le persone in agenzia. Qui si conserva soltanto: nessuna persona viene creata o agganciata da sola.';

-- ═══════════════════════════════════════════════════════════════════════════════
--  PER TORNARE INDIETRO
--
--   alter table public.quote_importazioni drop column if exists collaboratori;
--   alter table public.quote_polizze drop constraint if exists quote_polizze_mezzo_pagamento_check;
--   alter table public.quote_polizze drop column if exists mezzo_pagamento;
--   alter table public.quote_titoli drop constraint if exists quote_titoli_mezzo_pagamento_check;
--   alter table public.quote_titoli add constraint quote_titoli_mezzo_pagamento_check
--     check (mezzo_pagamento is null or mezzo_pagamento in
--       ('contante','assegno','bonifico','pos','carta_credito'));
--
--  ATTENZIONE: rimettere il vincolo stretto fallisce se nel frattempo qualche
--  rata ha PayPal o una prepagata. Prima si guardano:
--    select mezzo_pagamento, count(*) from quote_titoli group by 1;
-- ═══════════════════════════════════════════════════════════════════════════════
