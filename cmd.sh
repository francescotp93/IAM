echo -n "commit sul VPS: "; git -C /opt/withus-backend log --oneline -1 2>&1
echo -n "contrassegno di versione nella scocca: "; grep -c "versioneQuoto" /opt/withus-backend/iam/withus-one.js 2>&1
echo -n "disinnesco in QUOTO:                   "; grep -c "archDisinnesca" /opt/withus-backend/index.html 2>&1
echo -n "archivio nella scocca di IAM:          "; grep -c "archApri" /opt/withus-backend/iam/index.html 2>&1
echo -n "scocca chiesta con ?v=20260918:        "; grep -c "withus-one.js?v=20260918" /opt/withus-backend/iam/index.html 2>&1
