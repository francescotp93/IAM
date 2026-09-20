cd /opt/withus-backend || exit 1
echo "== quali caselle sono configurate (solo gli INDIRIZZI, mai le password) =="
for f in /etc/withus-backend.env /opt/withus-backend/.env; do
  [ -f "$f" ] && grep -oE '^MAIL_USER(_[0-9])?=.*' "$f" | sed 's/=/ = /'
done
echo "== NOTIFY_FROM / STAFF_EMAIL =="
for f in /etc/withus-backend.env /opt/withus-backend/.env; do
  [ -f "$f" ] && grep -oE '^(NOTIFY_FROM|STAFF_EMAIL|NOTIFY_NAME)=.*' "$f"
done
echo "== commit =="; git log --oneline -1
