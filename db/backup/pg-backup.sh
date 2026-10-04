#!/usr/bin/env bash
# Nightly logical backup of every database on the shared Postgres container.
# Installed on the VM at /usr/local/sbin/pg-backup.sh and run by pg-backup.timer (see install.sh).
#
# Each dump is checked before it replaces anything: it must be non-trivial in size and
# pg_restore must be able to read its table of contents. A bad dump fails the unit loudly
# (journalctl -u pg-backup) instead of leaving a corrupt file that looks like a backup.
set -euo pipefail

DIR="${BACKUP_DIR:-/var/backups/postgres}"
KEEP_DAYS="${KEEP_DAYS:-7}"
CONTAINER="${PG_CONTAINER:-notera-postgres}"
ADMIN="${PG_ADMIN:-notera_admin}"
DBS="${BACKUP_DBS:-notera jobsearch}"

umask 077
mkdir -p "$DIR"
ts="$(date -u +%Y%m%d_%H%M%S)"

for db in $DBS; do
  out="$DIR/${db}_${ts}.dump"
  tmp="$out.partial"
  docker exec "$CONTAINER" pg_dump -U "$ADMIN" -d "$db" -Fc > "$tmp"

  size="$(stat -c %s "$tmp")"
  if [ "$size" -lt 1024 ]; then
    echo "ERROR: dump of $db is only $size bytes; refusing to keep it" >&2
    rm -f "$tmp"
    exit 1
  fi
  if ! docker exec -i "$CONTAINER" pg_restore --list < "$tmp" > /dev/null; then
    echo "ERROR: dump of $db is not a readable archive" >&2
    rm -f "$tmp"
    exit 1
  fi

  mv "$tmp" "$out"
  echo "ok $db ${size} bytes -> $out"
done

# Roles and their grants (not included in per-database dumps).
docker exec "$CONTAINER" pg_dumpall -U "$ADMIN" --globals-only > "$DIR/globals_${ts}.sql"

# Retention.
find "$DIR" -type f \( -name '*.dump' -o -name 'globals_*.sql' \) -mtime +"$KEEP_DAYS" -delete
find "$DIR" -type f -name '*.partial' -mmin +60 -delete
echo "done; $(find "$DIR" -type f -name '*.dump' | wc -l) dump(s) kept, $(du -sh "$DIR" | cut -f1) total"
