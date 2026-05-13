#!/bin/sh
set -eu

docker compose --profile production config >/tmp/broadcast-compose.yml
docker build -f docker/api.Dockerfile -t broadcast-erp-api:verify .
docker build -f docker/web.Dockerfile -t broadcast-erp-web:verify .
