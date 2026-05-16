#!/bin/sh
set -eu

usage() {
  cat <<'EOF'
Usage:
  ./scripts/update-vm-ip.sh [IP_ADDRESS] [--no-restart]

Examples:
  ./scripts/update-vm-ip.sh
  ./scripts/update-vm-ip.sh 192.168.56.104
  ./scripts/update-vm-ip.sh 192.168.56.104 --no-restart

The script updates .env with the current VM IP and restarts api/web containers.
EOF
}

restart_containers=true
ip_address=""

for arg in "$@"; do
  case "$arg" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-restart)
      restart_containers=false
      ;;
    *)
      ip_address="$arg"
      ;;
  esac
done

detect_ip() {
  detected="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
  if [ -n "$detected" ]; then
    printf '%s\n' "$detected"
    return 0
  fi

  hostname -I 2>/dev/null | tr ' ' '\n' | awk '/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ && $0 !~ /^127\./ {print; exit}'
}

if [ -z "$ip_address" ]; then
  ip_address="$(detect_ip)"
fi

if [ -z "$ip_address" ]; then
  echo "Could not detect VM IP. Pass it manually, for example:"
  echo "  ./scripts/update-vm-ip.sh 192.168.56.104"
  exit 1
fi

case "$ip_address" in
  *.*.*.*) ;;
  *)
    echo "Invalid IP address: $ip_address"
    exit 1
    ;;
esac

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    touch .env
  fi
fi

set_env() {
  key="$1"
  value="$2"
  tmp_file=".env.tmp.$$"

  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (found == 0) {
        print key "=" value
      }
    }
  ' .env > "$tmp_file"

  mv "$tmp_file" .env
}

set_env "APP_URL" "http://$ip_address:3000"
set_env "API_URL" "http://$ip_address:4000"
set_env "NEXT_PUBLIC_API_URL" ""
set_env "CORS_ORIGINS" "http://$ip_address:3000,http://localhost:3000"
set_env "CSRF_TRUSTED_ORIGINS" "http://$ip_address:3000,http://localhost:3000"

echo "Updated .env for VM IP: $ip_address"
echo "APP_URL=http://$ip_address:3000"
echo "API_URL=http://$ip_address:4000"
echo "NEXT_PUBLIC_API_URL="

if [ "$restart_containers" = true ]; then
  echo "Restarting api and web containers..."
  docker compose --profile local up -d --force-recreate api web
  echo "Done. Open http://$ip_address:3000/login"
else
  echo "Skipped container restart."
fi
