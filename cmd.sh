cd /opt/withus-backend && git log --oneline -1 && grep -o 'app-versione" content="[^"]*"' iam/index.html | head -1 && grep -o 'app-versione" content="[^"]*"' index.html | head -1
