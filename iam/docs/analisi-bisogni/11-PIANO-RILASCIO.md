# Piano di rilascio

## Fase 0 - Analisi

- mappa dei file;
- verifica ricerca clienti;
- verifica OTP;
- verifica documenti/storage;
- verifica ruoli;
- verifica pattern API e audit;
- checkpoint.

## Fase 1 - Prototipo integrato senza scritture reali

- pagina IAM;
- pagina pubblica con token finto in ambiente locale;
- motore rating puro;
- PDF generato da dati finti;
- test UI e rating.

Obiettivo: validare UX senza toccare dati reali.

## Fase 2 - Persistenza e inviti

- script SQL idempotente;
- esecuzione manuale dopo approvazione;
- API CRUD;
- token hash;
- stati e audit;
- collegamento anagrafica.

## Fase 3 - OTP e documenti

- collegamento OTP esistente;
- consensi versionati;
- PDF server-side;
- archiviazione;
- download autorizzato.

## Fase 4 - Condivisione controllata

- bozza email;
- bozza WhatsApp;
- stato invito;
- revoca;
- notifiche interne senza invio automatico.

## Fase 5 - Pilota

- abilita solo a un gruppo ristretto;
- usa dati reali soltanto dopo approvazione;
- monitora errori, completamenti e tempi;
- raccogli feedback;
- nessun automatismo commerciale.

## Rollback

- feature flag o voce menu disattivabile;
- nuova pagina pubblica rimovibile senza toccare QUOTO;
- API isolate sotto un prefisso;
- tabelle nuove non collegate con cascade distruttive;
- documenti e dati non cancellati durante rollback applicativo.

## Pubblicazione

Frontend IAM:

```text
Agente-sospesi -> main -> GitHub Pages
```

Backend:

```text
QUOTE -> main
QUOTE -> claude/vibrant-tesla-o0glfd -> VPS
```

Finché non viene completata l'unificazione dei rami, una modifica backend presente solo su `main` non arriverà alla VPS.
