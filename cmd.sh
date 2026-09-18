echo "== che codice serve il VPS =="
echo -n "commit di /opt/withus-backend: "; git -C /opt/withus-backend log --oneline -1 2>&1
echo -n "md5 di index.html servito sotto /nuovo-preventivo/: "; md5sum /opt/withus-backend/index.html 2>&1 | cut -d' ' -f1
echo -n "md5 di iam/index.html: "; md5sum /opt/withus-backend/iam/index.html 2>&1 | cut -d' ' -f1
echo
echo "== il codice nuovo c'e'? =="
echo -n "archSuoIndirizzo in index.html: "; grep -c "archSuoIndirizzo" /opt/withus-backend/index.html 2>&1
echo -n "ARCH_CARTELLE in index.html:    "; grep -c "ARCH_CARTELLE" /opt/withus-backend/index.html 2>&1
echo -n "motore fascicolo.js presente:   "; ls -la /opt/withus-backend/tariffe/motore/fascicolo.js 2>&1 | wc -l
echo
echo "== autopull =="
systemctl is-active withus-autopull.timer 2>&1
journalctl -u withus-autopull.service --since "-30 min" --no-pager 2>&1 | tail -15
