#!/usr/bin/env bash
# Runs ON the VM as root. Idempotent. Rollback: cp compose backup back, `docker compose up -d postgres`.
set -euo pipefail
D=/home/yc9891966/notera
IP=35.238.183.204
cd "$D"
mkdir -p pgconf
cd pgconf

if [ ! -f server.crt ]; then
  openssl ecparam -name prime256v1 -genkey -noout -out ca.key
  openssl req -x509 -new -key ca.key -sha256 -days 3650 -subj "/CN=jobsearch-db-ca" -out ca.crt
  openssl ecparam -name prime256v1 -genkey -noout -out server.key
  openssl req -new -key server.key -subj "/CN=$IP" -out server.csr
  printf "subjectAltName=IP:%s\nextendedKeyUsage=serverAuth\n" "$IP" > ext.cnf
  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 3650 -sha256 -extfile ext.cnf -out server.crt
  rm -f server.csr ext.cnf
fi
cp /tmp/pg_hba.conf pg_hba.conf
chown 999:999 server.key server.crt pg_hba.conf
chmod 600 server.key ca.key
chmod 644 server.crt ca.crt pg_hba.conf
chown root:root ca.key

cd "$D"
F=docker-compose.prod.yml
[ -f $F.bak-pre-jobsearch ] || cp $F $F.bak-pre-jobsearch
python3 - <<'PY'
import re
p = "/home/yc9891966/notera/docker-compose.prod.yml"
s = open(p).read()
if "hba_file=/pgconf" in s:
    print("compose already patched")
    raise SystemExit
old_cmd = 'command: ["postgres", "-c", "log_connections=on", "-c", "log_disconnections=on"]'
new_cmd = ('command: ["postgres", "-c", "log_connections=on", "-c", "log_disconnections=on",\n'
           '      "-c", "ssl=on", "-c", "ssl_cert_file=/pgconf/server.crt", "-c", "ssl_key_file=/pgconf/server.key",\n'
           '      "-c", "ssl_min_protocol_version=TLSv1.3", "-c", "hba_file=/pgconf/pg_hba.conf"]')
assert old_cmd in s
s = s.replace(old_cmd, new_cmd, 1)
old_port = "    # NO host port mapping — Postgres is reachable ONLY on the private compose network.\n"
assert old_port in s
s = s.replace(old_port, '    # Published for the jobsearch app (Netlify). IPv4 only; pg_hba.conf restricts it to jobsearch_app over TLS.\n    ports:\n      - "0.0.0.0:5432:5432"\n', 1)
old_vol = "      - pgdata:/var/lib/postgresql\n"
assert old_vol in s
s = s.replace(old_vol, old_vol + "      - ./pgconf:/pgconf:ro\n", 1)
open(p, "w").write(s)
print("compose patched")
PY

docker compose -f $F up -d postgres 2>&1 | tail -5
for i in $(seq 1 30); do
  st=$(docker inspect -f '{{.State.Health.Status}}' notera-postgres 2>/dev/null || echo none)
  [ "$st" = healthy ] && break
  sleep 2
done
echo "postgres health: $st"
docker exec notera-postgres psql -U notera_admin -d postgres -Atc "show ssl; show hba_file; show ssl_min_protocol_version"
sleep 5
echo "--- backend"
docker ps --format '{{.Names}} {{.Status}}' | grep notera
docker logs --tail 5 notera-backend 2>&1 | tail -5
