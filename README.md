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

## Ejecutable para Windows (.exe)

Se agrego una app de escritorio en `desktop/` con Electron que:

- levanta el backend local en `http://127.0.0.1:3001`
- carga el frontend compilado de `frontend/dist`
- empaqueta instalador `.exe` con `electron-builder`

Pasos:

1. Instalar dependencias en cada modulo:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
   - `cd ../desktop && npm install`
2. Asegurar credenciales en `backend/.env`.
3. Generar instalador Windows:
   - `npm run pack:win`

Salida esperada: archivos en `desktop/dist/` (instalador NSIS `.exe`).
