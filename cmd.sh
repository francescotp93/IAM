cd /opt/withus-backend && git log --oneline -1 && grep -o 'app-versione" content="[^"]*"' iam/index.html | head -1 && curl -sI https://iam.withusassicurazioni.it/ | head -1
