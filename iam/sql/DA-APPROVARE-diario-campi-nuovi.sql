-- ═══════════════════════════════════════════════════════════════════════════
-- DIARIO DI LAVORO — tre campi nuovi su iam_workdiary
--
-- Da lanciare A MANO nell'editor SQL di Supabase. Non lo esegue nessun
-- programma: gli script di questo progetto li lancia una persona, così chi
-- li lancia vede cosa succede.
--
-- È RILANCIABILE senza danni: se una colonna c'è già, non fa niente.
-- Non tocca dati esistenti, non cancella niente, non modifica le RLS.
--
-- COSA AGGIUNGE, e perché
--
--   ora_fine  L'ora in cui un'attività finisce. Serve per una domanda che
--             oggi non ha risposta: «quanto tempo ho già impegnato domani?».
--             Senza un'ora di fine, una giornata con dieci cose da dieci
--             minuti sembra piena quanto una con tre incontri da due ore.
--
--   cliente   Il nominativo a cui l'attività si riferisce. Il diario oggi
--             sa COSA si fa e QUANDO, ma non PER CHI: cercare tutto quello
--             che è stato fatto per un cliente non è possibile.
--
--   prodotto  Il ramo o la pratica (Auto, Casa, Salute...). Stessa ragione:
--             permette di leggere il carico di lavoro per famiglia di
--             prodotto, non solo per giorno.
--
-- SE NON LA LANCI: l'interfaccia continua a funzionare. I tre campi nuovi
-- vengono mostrati, ma al salvataggio il programma si accorge che le colonne
-- non ci sono e salva lo stesso, senza di loro (stesso comportamento già
-- adottato per la colonna «importante»). Niente si rompe: quei tre valori
-- semplicemente non vengono conservati finché questa migrazione non è stata
-- lanciata.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.iam_workdiary add column if not exists ora_fine text;
alter table public.iam_workdiary add column if not exists cliente  text;
alter table public.iam_workdiary add column if not exists prodotto text;

comment on column public.iam_workdiary.ora_fine is
  'Ora di fine (testo "HH:MM"). Stesso formato di "ora", che è già testo: usare un tipo diverso per i due estremi dello stesso intervallo obbligherebbe a convertire da una parte sola, ed è lì che nascono gli sfasamenti di un''ora.';
comment on column public.iam_workdiary.cliente is
  'Nominativo o ragione sociale a cui l''attività si riferisce. Testo libero: il diario si compila di fretta, spesso prima che il cliente esista in anagrafica.';
comment on column public.iam_workdiary.prodotto is
  'Ramo o pratica (Auto, Casa, Salute, Famiglia, Azienda, Viaggi, Altro).';

-- ── Verifica: dopo il lancio devono uscire tre righe ───────────────────────
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'iam_workdiary'
  and column_name in ('ora_fine', 'cliente', 'prodotto')
order by column_name;
