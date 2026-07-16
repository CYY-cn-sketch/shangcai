#!/usr/bin/env bash
set -euo pipefail

umask 077

BACKUP_DIR="${SUFE_BACKUP_DIR:-/srv/sufe-ai/backups/mysql}"
MYSQL_CREDENTIALS_FILE="${MYSQL_CREDENTIALS_FILE:-/etc/sufe-ai/mysql-backup.cnf}"
DB_NAME="${DB_NAME:-sufe_ai}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ "$BACKUP_DIR" != /* ]]; then
  echo "SUFE_BACKUP_DIR must be an absolute path" >&2
  exit 1
fi
if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi
if [[ ! -r "$MYSQL_CREDENTIALS_FILE" ]]; then
  echo "MySQL credentials file is not readable: $MYSQL_CREDENTIALS_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/${DB_NAME}-${timestamp}.sql.gz"
temporary="${target}.tmp"

trap 'rm -f "$temporary"' EXIT
mysqldump \
  --defaults-extra-file="$MYSQL_CREDENTIALS_FILE" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  "$DB_NAME" | gzip -9 > "$temporary"

test -s "$temporary"
mv "$temporary" "$target"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo "$target"
