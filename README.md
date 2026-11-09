# Lunch Order Hub

Aplicación web para hacer pedidos de almuerzo del día, con módulo de administración para cargar el menú diario y gestionar pedidos, pagos y sorteos.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend (BaaS self-hosted)**: Supabase (PostgreSQL, GoTrue Auth, PostgREST) + Deno Edge Functions + Caddy (HTTPS/CORS)

## Desarrollo local

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
cp .env.example .env   # completa las variables de Supabase
npm i
npm run dev
```

Variables de entorno (ver `.env.example`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Backend as a Service (self-hosted)

El backend se despliega en un servidor con Docker. Los archivos de infraestructura están en `../server`.

### Requisitos
- Servidor Linux con Docker y Docker Compose.
- Dominio apuntando al servidor (ej. `lunchppy.134-209-44-216.sslip.io`).
- Caddy para HTTPS y CORS.

### Variables (`server/supabase/.env`)
- `POSTGRES_PASSWORD`, `JWT_SECRET`
- `ANON_KEY`, `SERVICE_ROLE_KEY`
- `SERVER_IP`
- `SITE_URL` (HTTPS del dominio)

### Despliegue inicial
```bash
# Desde tu PC
bash server/deploy-to-server.sh
# o en el servidor
bash /tmp/lunchppy-deploy/setup.sh
```

### Migraciones SQL
Ejecutar en el servidor (contenedor `lunchppy-db`):
```bash
docker exec -i lunchppy-db psql -U postgres -d postgres < server/migrate_admins.sql
docker exec -i lunchppy-db psql -U postgres -d postgres < server/migrate_nequi_winners.sql
docker exec -i lunchppy-db psql -U postgres -d postgres < server/fix_auth_nulls.sql
```

### Restaurar backup
```bash
bash server/restore-backup.sh /ruta/al/almuerzos-mochi_261109.backup
```

### Edge Functions
Las funciones están en `server/lunchppy/functions/` y se montan en el contenedor Deno:
- `push-notifications`
- `late-order-raffle`

Para actualizar:
```bash
scp server/lunchppy/functions/late-order-raffle/index.ts root@<server>:/shareppy/lunchppy/functions/late-order-raffle/index.ts
ssh root@<server> "docker restart lunchppy-fn-late-order-raffle"
```

### CORS
Configurado en `server/Caddyfile`. Cabeceras permitidas incluyen `accept`, `accept-profile`, `authorization`, `apikey`, `content-type`, `content-profile`, `x-supabase-*`, `prefer`, `range`.

### Operación
```bash
# Reiniciar servicios
docker restart lunchppy-auth lunchppy-rest lunchppy-fn-late-order-raffle

# Logs
docker logs lunchppy-fn-late-order-raffle --tail 20

# Backup
docker exec lunchppy-db pg_dump -U postgres -Fc postgres > backup.dump
```

## Build with Lovable

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://almuerzos-mochi.lovable.app

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f90ba03c-3c52-4214-a5f8-15f641736d5a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.