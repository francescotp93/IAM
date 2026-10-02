-- ═══════════════════════════════════════════════════════════════════════════
--  LA CARTA HDI È UN FINANZIAMENTO                            28/09/2026
--
--  «Quelli che carico io invece da HDI, come pos, bonifici, carta HDI (questa
--   modalità è finanziamento Agos), questi me li devi dare come sospesi e poi
--   sarò io ad abbinarli una volta incassati.»              — Francesco
--
--  Il vocabolario dei mezzi ne aveva nove e la carta HDI non c'era. Finiva in
--  «carta di credito», che è un'altra cosa: con la carta di credito paga il
--  cliente e l'accredito arriva in tre giorni; col finanziamento Agos il premio
--  lo anticipa una finanziaria e il cliente rimborsa lei. Due incassi con tempi
--  e controparti diverse sotto lo stesso nome vogliono dire che uno dei due non
--  si può seguire.
--
--  `giorni_attesi` resta NULL di proposito: quanto ci metta ad arrivare non
--  l'ha detto nessuno, e un numero inventato su un tempo di accredito diventa
--  un sospeso che si crede scaduto — cioè una telefonata a un cliente che non
--  deve niente.
--
--  Additiva e reversibile: aggiunge una riga a `iam_modalita_pagamento`. La
--  chiave esterna `on delete restrict` impedisce di toglierla quando ci sono
--  righe appese — «non si cancella, si spegne» (attiva = false).
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.iam_modalita_pagamento
  (codice, nome, contabilizza, giorni_attesi, ordine, di_sistema) values
  ('finanziamento', 'Finanziamento Agos (carta HDI)', 'sospeso', null, 85, true)
on conflict (codice) do nothing;

-- ── PER TORNARE INDIETRO ───────────────────────────────────────────────────
--   update public.iam_modalita_pagamento set attiva = false where codice = 'finanziamento';
-- e, solo se nessuna rata la usa:
--   delete from public.iam_modalita_pagamento where codice = 'finanziamento';
