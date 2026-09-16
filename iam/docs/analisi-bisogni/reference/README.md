# File di riferimento

- `analisi-bisogni-rating.mjs`: motore rating puro, da adattare al backend reale.
- `analisi-bisogni-rating.test.mjs`: test eseguibili con il test runner integrato di Node.
- `analisi-bisogni-schema-proposta.sql`: proposta prudenziale, da adattare e non eseguire automaticamente.
- `report-data.example.json`: esempio dello snapshot usato per rating e PDF.
- `pdf-visual-source-reportlab.py`: sorgente che ha generato i PDF campione; riferimento grafico.

Il codice di riferimento non sostituisce l'analisi del repository reale.
- `inviti-sicuri.mjs` e relativo test: token opachi, hash, scadenza e revoca.
- `genera-pdf-playwright.mjs`: helper minimale per il PDF server-side.
