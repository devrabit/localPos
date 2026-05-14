# PLAN: Módulo Agotados

1. **Backend** (`backend/src/routes/api.js`)
   - Función `extractMarcaFromWooProduct` según SPEC.
   - Función async que obtiene `fetchProducts`, recorre simples agotados, para variables obtiene variaciones en lotes concurrentes (mismo criterio que escaneo), arma filas y agrupa por marca ordenado.
   - Ruta `GET /productos/agotados` **antes** de `/productos/:productId/variaciones`.

2. **Tests** (`backend/tests/api.test.js`)
   - Caso con mock: simple agotado + variable con variaciones agotadas y marcas distintas; validar forma de `grupos` y `total`.

3. **Frontend**
   - Vista `frontend/src/modules/agotados/views/AgotadosView.vue` (Tailwind, patrón Historial).
   - Ruta en `frontend/src/router/index.js`: `/agotados`.
   - Enlace en `frontend/src/views/PosView.vue` al POS.

4. **Verificación manual**
   - `npm test` en backend (al menos tests existentes + nuevo).
