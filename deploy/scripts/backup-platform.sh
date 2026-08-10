#!/usr/bin/env bash
set -euo pipefail

umask 077

BACKUP_DIR="${SUFE_BACKUP_DIR:-/srv/sufe-ai/backups/platform}"
DATA_ROOT="${SUFE_DATA_ROOT:-/srv/sufe-ai/data}"
MYSQL_CREDENTIALS_FILE="${MYSQL_CREDENTIALS_FILE:-/etc/sufe-ai/mysql-backup.cnf}"
DB_NAME="${DB_NAME:-sufe_ai}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ "$BACKUP_DIR" != /* ]]; then
  echo "SUFE_BACKUP_DIR must be an absolute path" >&2
  exit 1
fi
if [[ "$DATA_ROOT" != /* ]]; then
  echo "SUFE_DATA_ROOT must be an absolute path" >&2
  exit 1
fi
case "$BACKUP_DIR/" in
  "$DATA_ROOT/"*)
    echo "SUFE_BACKUP_DIR must not be inside SUFE_DATA_ROOT" >&2
    exit 1
    ;;
esac
if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "RETENTION_DAYS must be a non-negative integer" >&2
  exit 1
fi
if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "DB_NAME contains unsupported characters" >&2
  exit 1
fi
if [[ ! -r "$MYSQL_CREDENTIALS_FILE" ]]; then
  echo "MySQL credentials file is not readable: $MYSQL_CREDENTIALS_FILE" >&2
  exit 1
fi
if [[ ! -d "$DATA_ROOT" ]]; then
  echo "Platform data directory does not exist: $DATA_ROOT" >&2
  exit 1
fi

for command_name in mysqldump gzip tar sha256sum find date; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is not available: $command_name" >&2
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="${DB_NAME}-${timestamp}"
database_target="$BACKUP_DIR/${backup_name}.sql.gz"
data_target="$BACKUP_DIR/${backup_name}.data.tar.gz"
manifest_target="$BACKUP_DIR/${backup_name}.sha256"
database_temporary="${database_target}.tmp"
data_temporary="${data_target}.tmp"
manifest_temporary="${manifest_target}.tmp"
completed=false

cleanup() {
  rm -f -- "$database_temporary" "$data_temporary" "$manifest_temporary"
  if [[ "$completed" != true ]]; then
    rm -f -- "$database_target" "$data_target" "$manifest_target"
  fi
}
trap cleanup EXIT

mysqldump \
  --defaults-extra-file="$MYSQL_CREDENTIALS_FILE" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --events \
  --no-tablespaces \
  --set-gtid-purged=OFF \
  "$DB_NAME" | gzip -9 > "$database_temporary"

tar -C "$DATA_ROOT" -czf "$data_temporary" .

test -s "$database_temporary"
test -s "$data_temporary"
gzip -t "$database_temporary"
tar -tzf "$data_temporary" >/dev/null

mv "$database_temporary" "$database_target"
mv "$data_temporary" "$data_target"
(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$database_target")" "$(basename "$data_target")" > "$manifest_temporary"
)
mv "$manifest_temporary" "$manifest_target"
(
  cd "$BACKUP_DIR"
  sha256sum -c "$(basename "$manifest_target")"
)
completed=true

while IFS= read -r -d '' expired_manifest; do
  expired_prefix="${expired_manifest%.sha256}"
  rm -f -- "${expired_prefix}.sql.gz" "${expired_prefix}.data.tar.gz" "$expired_manifest"
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${DB_NAME}-*.sha256" -mtime "+$RETENTION_DAYS" -print0)

echo "$manifest_target"
