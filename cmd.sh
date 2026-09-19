sleep 100
echo "== commit su /opt/withus-backend"; git log --oneline -1
echo "== M5 nel codice servito"
for k in 'page-foglio-cassa' 'fcExportPdf'; do printf '%s: ' "$k"; grep -c "$k" index.html; done
printf 'foglio-cassa.js: '; test -f tariffe/motore/foglio-cassa.js && echo presente || echo ASSENTE
echo "== md5 index.html"; md5sum index.html | cut -c1-12
