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
3. Crea tablas:
   - `cd backend && npm run db:init`
4. (Opcional) Migra JSON previo a MySQL:
   - `npm run db:migrate-json`
5. Ejecuta:
   - `npm install`
   - `npm run dev`

Servidor por defecto: `http://localhost:3001`

### MySQL (Salidas y Anotaciones)

Los módulos **Salidas** y **Anotaciones** persisten en MySQL (no en archivos JSON).

Variables requeridas en `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=naripos
DB_PASSWORD=secret
DB_NAME=naripos
```

Scripts:

- `npm run db:init` — crea base y tablas desde `backend/db/schema.sql`
- `npm run db:migrate-json` — importa `backend/data/outflows.json` y `Anotaciones.json` si existen

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

- Start command: `npm start`
- Variables minimas:
  - `PORT=3001`
  - `WOO_URL=...`
  - `WOO_CONSUMER_KEY=...`
  - `WOO_CONSUMER_SECRET=...`
  - `DB_HOST=...`
  - `DB_USER=...`
  - `DB_PASSWORD=...`
  - `DB_NAME=...`
- Tras crear la base MySQL en Hostinger, ejecuta `backend/db/schema.sql` (phpMyAdmin) o `npm run db:init`.
- Variable recomendada:
  - `CORS_ORIGIN=https://wheat-raven-739083.hostingersite.com`

## Tests

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
