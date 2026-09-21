-- ═══════════════════════════════════════════════════════════════════════════
--  IL CODICE PRODUTTORE HA UN PERIODO, E SI PUÒ SOSPENDERE  (21/09/2026)
--  Brief «Anagrafiche e collaboratori», punto 3.
--
--  ┌─ CHE COSA TOCCA ────────────────────────────────────────────────────────┐
--  │ Tre colonne nuove su `quote_codici_collaboratore`. Nessuna riga         │
--  │ riscritta, nessun valore inventato, nessuna colonna esistente toccata.  │
--  │ Misurato prima: 16 righe, tutte di sole evidenze (0 decise), 1 sola     │
--  │ compagnia. Dopo la migrazione dicono esattamente quello che dicevano.   │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ┌─ ROLLBACK ──────────────────────────────────────────────────────────────┐
--  │   alter table quote_codici_collaboratore                                │
--  │     drop column if exists attivo,                                       │
--  │     drop column if exists data_inizio,                                  │
--  │     drop column if exists data_fine;                                    │
--  │                                                                         │
--  │ Il motore torna a non guardarle: un abbinamento vale sempre, che e'     │
--  │ come si comportava fino a oggi.                                         │
--  └─────────────────────────────────────────────────────────────────────────┘
--
--  ── PERCHÉ ESISTE: UN CODICE CAMBIA PADRONE, E NESSUNO AVVISA ────────────
--  Il codice produttore («U25274») e' della COMPAGNIA, non della persona. Un
--  collaboratore se ne va a giugno e la compagnia riassegna quel codice a un
--  altro da luglio: senza un periodo, l'abbinamento deciso una volta
--  continuerebbe ad attribuire a chi e' andato via tutte le polizze prodotte
--  dopo. Non e' un fastidio di interfaccia — sono provvigioni pagate a chi
--  non doveva (CLAUDE.md §19).
--
--  ── LE TRE COLONNE, E CHE COSA VUOL DIRE UN VUOTO ────────────────────────
--  `attivo`   NOT NULL default true. E' l'interruttore: un abbinamento
--             sospeso smette di assegnare lavoro nuovo e RESTA. Il default
--             `true` non perde nessuna informazione, perche' le 16 righe che
--             esistono non le ha sospese nessuno: `false` lo scrive solo una
--             persona, dalla scheda del collaboratore. Chi e quando lo dice
--             il registro dei movimenti (§18), che quella schermata scrive
--             gia': non serve una colonna in piu' per saperlo.
--
--  `data_inizio` / `data_fine`   nullable, senza default. **Vuoto vuol dire
--             «nessuno ha dichiarato un periodo», e allora l'abbinamento vale
--             sempre.** E' l'unica lettura che non inventa niente (§8.1) e
--             l'unica che non cambia il significato delle righe gia' scritte.
--             Leggere un vuoto come «chiuso» spegnerebbe tutti gli
--             abbinamenti in un colpo solo, in silenzio.
--
--  ── QUELLO CHE QUESTA TABELLA NON PUÒ FARE, E VA SAPUTO ──────────────────
--  La chiave primaria e' la coppia (compagnia, codice): **una riga per
--  codice, quindi un padrone per codice.** Il periodo dice fino a quando
--  quell'abbinamento vale, non tiene lo storico dei padroni che si sono
--  succeduti. Quando un codice passa di mano si chiude il periodo del primo e
--  si abbina al secondo: il primo abbinamento non resta scritto, ma le rate e
--  le polizze che aveva gia' assegnato NON tornano indietro — il dato sta su
--  di loro, non qui (§19). Per una storia completa servirebbe una riga per
--  periodo, cioe' un'altra chiave primaria: e' un lavoro a se', e si fa se e
--  quando un codice cambia mano davvero.
-- ═══════════════════════════════════════════════════════════════════════════

alter table quote_codici_collaboratore
  add column if not exists attivo      boolean not null default true,
  add column if not exists data_inizio date,
  add column if not exists data_fine   date;

comment on column quote_codici_collaboratore.attivo is
  $c$L'interruttore dell'abbinamento. false = sospeso: smette di assegnare polizze e rate NUOVE, e quello che ha gia' assegnato resta dov'e'. Non e' una cancellazione: la riga, le evidenze del flusso e la persona restano scritte. Chi l'ha sospeso e quando sta nel registro dei movimenti.$c$;

comment on column quote_codici_collaboratore.data_inizio is
  $c$Da quando questo codice e' di questa persona. NULL = nessuno ha dichiarato un inizio, e allora l'abbinamento vale anche prima. Si confronta con la data di EFFETTO della polizza, non con oggi: una polizza appartiene a chi teneva il codice quando e' stata prodotta.$c$;

comment on column quote_codici_collaboratore.data_fine is
  $c$Fino a quando questo codice e' di questa persona. NULL = nessuna scadenza dichiarata. Una polizza con effetto dopo questa data NON si assegna e lo dice: e' il caso del collaboratore che se ne va e della compagnia che riassegna il suo codice a un altro.$c$;

-- Le politiche non cambiano: chi puo' leggere e scrivere questa tabella e'
-- deciso da prima, e tre colonne in piu' sulla stessa riga non spostano di un
-- millimetro chi la vede.
