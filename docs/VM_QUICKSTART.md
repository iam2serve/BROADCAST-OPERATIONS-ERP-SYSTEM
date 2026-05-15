# VM Quickstart

Use this checklist after copying project changes to a Linux VM.

## 1. Configure `.env`

Set the VM IP once:

```bash
VM_IP=192.168.2.8
```

The important public values are:

```env
APP_URL=http://192.168.2.8:3000
API_URL=http://192.168.2.8:4000
NEXT_PUBLIC_API_URL=
CORS_ORIGINS=http://192.168.2.8:3000,http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://192.168.2.8:3000,http://localhost:3000
```

Keep `NEXT_PUBLIC_API_URL` empty for VM testing. The web app will call the API on the same host at port `4000`.

## 2. Start infrastructure

```bash
docker compose --profile local up -d postgres redis minio
```

## 3. Prepare database

For a fresh VM/demo database, `db push` is the quickest path while migrations are being stabilized:

```bash
export DATABASE_URL="postgresql://broadcast:broadcast@127.0.0.1:5432/broadcast_erp?schema=public"
export DIRECT_DATABASE_URL="$DATABASE_URL"
export SUPER_ADMIN_EMAIL="admin@example.com"
export SUPER_ADMIN_PASSWORD="ChangeMeNow123!"
export SUPER_ADMIN_NAME="System Administrator"

pnpm db:generate
pnpm db:push
pnpm db:seed
```

Confirm the admin user exists:

```bash
docker exec -it broadcast-erp-postgres psql -U broadcast -d broadcast_erp -c 'SELECT email, "fullName", status FROM "User";'
```

## 4. Build and run app

```bash
docker compose --profile local build --no-cache api web
docker compose --profile local up -d api web
```

## 5. Smoke test

```bash
curl http://localhost:4000/api/v1/health/live

curl -i -X POST "http://192.168.2.8:4000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: http://192.168.2.8:3000" \
  -d '{"email":"admin@example.com","password":"ChangeMeNow123!"}'
```

Then open:

```text
http://192.168.2.8:3000/login
```

Login:

```text
admin@example.com
ChangeMeNow123!
```

## 6. If login says "Failed to fetch"

Check the web API setting:

```bash
docker exec broadcast-erp-web sh -lc 'echo WEB_API=$NEXT_PUBLIC_API_URL'
docker exec broadcast-erp-api sh -lc 'echo CORS=$CORS_ORIGINS; echo CSRF=$CSRF_TRUSTED_ORIGINS'
```

Check CORS:

```bash
curl -i -X OPTIONS "http://192.168.2.8:4000/api/v1/auth/login" \
  -H "Origin: http://192.168.2.8:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

If the API works with `curl`, clear browser site data or use an incognito window.
