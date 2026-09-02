# Nari POS MVP

MVP de punto de venta web con frontend en Vue 3 y backend Node.js/Express para integracion con WooCommerce.

## Estructura

- `frontend`: App POS (productos, carrito, clientes, checkout).
- `backend`: API intermediaria con WooCommerce.

## Requisitos

- Node.js 20+
- Una tienda WooCommerce con API REST habilitada

## Backend

1. Copia variables de entorno:
   - `cp backend/.env.example backend/.env`
2. Completa credenciales WooCommerce y MySQL en `backend/.env`.
3. Crea tablas con `cd backend && npm run db:init`.
4. (Opcional) Migra datos previos desde Supabase:
   - `npm run db:migrate-supabase`
5. Ejecuta:
   - `npm install`
   - `npm run dev`

Servidor por defecto: `http://localhost:3001`

### MySQL (Salidas y Anotaciones)

Los módulos **Salidas** y **Anotaciones** persisten en MySQL (Hostinger).

Variables requeridas en `backend/.env`:

```env
DB_HOST=195.35.61.93
DB_PORT=3306
DB_USER=u505924778_acarreno
DB_PASSWORD=your_mysql_password
DB_NAME=u505924778_nariPos
```

Scripts:

- `npm run db:init` — aplica schema y verifica conexión MySQL
- `npm run db:migrate-supabase` — importa datos desde Supabase (one-shot)

## Frontend

1. Ejecuta:
   - `npm install`
   - `npm run dev`

App por defecto: `http://localhost:5173`

El frontend consume `/api` y Vite hace proxy al backend local.

## Deploy en Hostinger (web)

### Frontend (Vue)

- Root del proyecto: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Variables:
  - `VITE_STORE_NAME=Nari Universe`
  - `VITE_API_BASE_URL=https://wheat-raven-739083.hostingersite.com/api` (o dominio del backend)

### Backend (Node)

- **Raiz de la aplicacion en Hostinger:** la carpeta **raiz del repositorio** (donde esta `server.js` y `package.json` con `"start": "node server.js"`), no solo `backend/`. Si el panel usa `backend` como raiz, se ejecuta otro `npm start` sin copiar el frontend y reaparecen 404 en `/assets/` y errores de MIME.
- Start command: `npm start` (desde esa raiz)
- Variables minimas:
  - `PORT=3001`
  - `WOO_URL=...`
  - `WOO_CONSUMER_KEY=...`
  - `WOO_CONSUMER_SECRET=...`
  - `DB_HOST=...`
  - `DB_USER=...`
  - `DB_PASSWORD=...`
  - `DB_NAME=nariPos`
- Ejecuta `npm run db:init` antes del deploy (o `backend/db/schema.sql` en phpMyAdmin).
- Variable recomendada:
  - `CORS_ORIGIN=https://wheat-raven-739083.hostingersite.com`

## Tests

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
