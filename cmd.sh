echo "== ora"; date '+%F %T %Z'
echo "== come parte il backend"
systemctl show withus-backend -p WorkingDirectory -p ExecStart --no-pager 2>/dev/null | sed -E 's/(PASS|TOKEN|KEY|SECRET)[A-Z_]*=[^ ;]*/\1=***/g'
echo "== dove sta mailparser"
find /opt/withus-backend -maxdepth 4 -type d -name mailparser 2>/dev/null | head -5
echo "== e imapflow"
find /opt/withus-backend -maxdepth 4 -type d -name imapflow 2>/dev/null | head -5
