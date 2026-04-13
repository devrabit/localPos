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
   - `cp .env.example .env`
2. Completa credenciales WooCommerce en `.env`.
3. Ejecuta:
   - `npm install`
   - `npm run dev`

Servidor por defecto: `http://localhost:3001`

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
- Variable recomendada:
  - `CORS_ORIGIN=https://wheat-raven-739083.hostingersite.com`

## Tests

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
