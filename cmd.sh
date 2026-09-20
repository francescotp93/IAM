echo "== da dove prende l'ambiente il backend =="
systemctl show withus-backend -p EnvironmentFiles -p Environment 2>/dev/null | sed -E 's/(PASS|KEY|SECRET|TOKEN|CHIAVE)=[^ ]*/\1=***/g' | cut -c1-400
echo
echo "== indirizzi delle caselle configurate (mai le password) =="
for f in $(systemctl show withus-backend -p EnvironmentFiles --value 2>/dev/null | tr ' ' '\n' | sed 's/^-//'); do
  [ -f "$f" ] && { echo "-- $f"; grep -oE '^(MAIL_USER(_[0-9])?|NOTIFY_FROM|STAFF_EMAIL|NOTIFY_NAME|MAIL_ALLOWED_EMAILS)=.*' "$f"; }
done
