-- ═══════════════════════════════════════════════════════════════════════════
--  I MEZZI DICHIARATI SUI CONTI PARLANO LA LINGUA DEL DATABASE
--  21/09/2026
--
--  MISURATO PRIMA DI SCRIVERE, sui conti veri dell'agenzia:
--
--    iam_conti.mezzi conteneva       -> bonifico, pos, e la forma al plurale
--                                       della parola che indica il denaro in mano
--    quote_titoli.mezzo_pagamento    -> un vincolo CHECK che quella forma
--    quote_polizze.mezzo_pagamento      NON ammette (usa il singolare)
--
--  Conseguenza, senza nessun errore e senza niente di rosso: la cassa creata
--  stamattina dichiarava di ricevere una parola che su una rata non puo'
--  comparire. Nessun incasso l'avrebbe mai incrociata. La configurazione era
--  fatta bene e inerte per costruzione.
--
--  Il vocabolario che comanda e' quello del vincolo, perche' e' l'unico che
--  non si puo' cambiare senza riscrivere righe gia' scritte (1.720 polizze e
--  55 rate). Il motore e' stato riportato su quello; qui si allineano le
--  poche righe di configurazione gia' salvate.
--
--  NON tocca nessuna polizza e nessuna rata: solo la colonna `mezzi` dei
--  conti, che e' configurazione.
--
--  ── ROLLBACK ──────────────────────────────────────────────────────────────
--    update public.iam_conti
--       set mezzi = array_replace(mezzi, 'contante', 'contanti')
--     where mezzi @> array['contante'];
--    update public.iam_conti
--       set mezzi = array_replace(mezzi, 'domiciliazione', 'rid')
--     where mezzi @> array['domiciliazione'];
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Il denaro in mano: dal plurale al singolare, che e' la forma del vincolo.
update public.iam_conti
   set mezzi = array_replace(mezzi, 'contanti', 'contante')
 where mezzi is not null
   and mezzi @> array['contanti'];

-- La domiciliazione: dalla sigla al nome, per la stessa ragione.
update public.iam_conti
   set mezzi = array_replace(mezzi, 'rid', 'domiciliazione')
 where mezzi is not null
   and mezzi @> array['rid'];

commit;

-- ── CONTROLLO, da leggere dopo ────────────────────────────────────────────
--  Deve tornare zero righe: nessun conto dichiara piu' un mezzo che una rata
--  non puo' portare.
--
--    select id, nome, mezzi from public.iam_conti
--     where mezzi is not null
--       and exists (
--         select 1 from unnest(mezzi) m
--          where m not in ('contante','assegno','bonifico','pos','carta_credito',
--                          'paypal','prepagata','domiciliazione','altro'));
