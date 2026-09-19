cd /opt/withus-backend
git log --oneline -1
echo "--- contabilita.js ---"
ls -l tariffe/motore/contabilita.js 2>&1 | tail -1
echo "--- pannello conti in iam/index.html ---"
grep -c 'panel-conti\|cntPuoScrivere' iam/index.html
echo "--- voce di menu ---"
grep -c "Conti e causali" iam/withus-one.js
echo "--- impronta scocca servita ---"
md5sum iam/withus-one.js | cut -c1-8
