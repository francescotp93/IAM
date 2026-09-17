-- I numeri di legge del ramo datoriale dell'analisi previdenziale (17/09/2026).
-- Stessa tabella degli altri parametri: chiave, valore, fonte, data, segno
-- «da confermare». Il motore tariffe/motore/tfr-datore.js ne tiene la copia di
-- riserva e la sostituisce con queste righe quando il server le serve
-- (GET /parametri-previdenziali/numeri). Idempotente: se la chiave c'e', non
-- si tocca — i valori in tabella li corregge chi li pubblica, non un rilascio.
insert into public.quote_parametri_previdenziali (chiave, etichetta, valore, unita, fonte, aggiornato_il, chi_pubblica, derivato, da_confermare)
values
  ('tfr_datore_deduzione', 'Deduzione dal reddito d''impresa del TFR conferito', '{"meno50": 0.06, "almeno50": 0.04}', 'frazione del TFR conferito',
   'Art. 10 c. 1 D.Lgs. 252/2005: 4%, elevato al 6% per le imprese con meno di 50 addetti. Art. 1 c. 764 L. 296/2006: spetta anche sul TFR versato al Fondo di Tesoreria.', '2026-09-17', 'Legge', false, false),
  ('tfr_datore_esonero_garanzia', 'Esonero dal contributo al Fondo di garanzia INPS', '{"generale": 0.0020, "dirigenti": 0.0040}', 'frazione della retribuzione imponibile',
   'Art. 10 c. 2 D.Lgs. 252/2005: 0,20% (0,40% per i dirigenti industriali ex INPDAI), nella stessa percentuale di TFR conferito.', '2026-09-17', 'Legge', false, false),
  ('tfr_datore_oneri_impropri', 'Riduzione dei contributi minori (CUAF, maternita'', disoccupazione)', '0.0028', 'frazione della retribuzione imponibile',
   'Art. 10 c. 3 D.Lgs. 252/2005 e art. 1 c. 764 L. 296/2006: 0,19 punti nel 2008, +0,01 l''anno fino a 0,28 dal 2014; proporzionale alla quota di TFR conferita.', '2026-09-17', 'Legge', false, false),
  ('tfr_rivalutazione', 'Rivalutazione del TFR accantonato in azienda', '{"fissa": 0.015, "quotaInflazione": 0.75}', 'frazione annua + frazione dell''inflazione',
   'Art. 2120 c. 4 c.c.: 1,5% fisso piu'' il 75% dell''aumento dell''indice ISTAT dei prezzi al consumo.', '2026-09-17', 'Legge', false, false),
  ('tfr_divisore', 'Quota annua di TFR: retribuzione utile diviso 13,5', '13.5', 'divisore',
   'Art. 2120 c. 1 c.c.', '2026-09-17', 'Legge', false, false),
  ('tfr_soglia_tesoreria', 'Soglia di addetti da cui il TFR non conferito va al Fondo di Tesoreria INPS', '50', 'addetti',
   'Art. 1 c. 755 L. 296/2006: datori di lavoro con almeno 50 addetti (media 2006, o dell''anno di inizio attivita'').', '2026-09-17', 'Legge', false, false),
  ('ires', 'IRES', '0.24', 'frazione',
   'Art. 77 c. 1 TUIR (D.P.R. 917/1986), 24% dal periodo d''imposta 2017 (L. 208/2015 art. 1 c. 61).', '2026-09-17', 'Legge', false, false)
on conflict (chiave) do nothing;
