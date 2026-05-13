#!/bin/sh
set -eu

mkdir -p /backups/postgres
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump -h postgres -U broadcast -d broadcast_erp -Fc > "/backups/postgres/broadcast_erp_${timestamp}.dump"
find /backups/postgres -type f -name '*.dump' -mtime +14 -delete
