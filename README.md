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

## Tests

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`
