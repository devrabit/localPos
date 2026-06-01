# PLAN: Implementación persistencia MySQL (Salidas + Anotaciones)

## Objetivo

Reemplazar almacenamiento JSON por MySQL con el mínimo cambio posible, preservando contratos de API y arquitectura de servicios.

## Paso 1: Dependencia y configuración DB

**Archivos:**
- `backend/package.json` — agregar `mysql2`
- `backend/src/config/env.js` — vars `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `backend/.env.example` — documentar vars DB
- `backend/src/config/db.js` — pool `mysql2/promise` con `getPool()`, `query()`

**Detalle:**
- Pool con límite 10 conexiones.
- Exportar helper reutilizable para servicios.

## Paso 2: Esquema SQL

**Archivo:** `backend/db/schema.sql`

- CREATE TABLE `salidas`
- CREATE TABLE `anotaciones`
- CREATE TABLE `anotacion_comentarios`
- Índice en `salidas.fecha` y `anotaciones.fecha_creacion` para filtros.

**Script npm:** `db:init` → ejecuta schema.sql contra DB configurada.

## Paso 3: Reescribir `outflowsStorage.js`

**Archivo:** `backend/src/services/outflowsStorage.js`

Mantener exports:
- `createOutflow({ motivo, suma, tipoPago })`
- `listOutflows()`

Implementación:
- `INSERT INTO salidas ...`
- `SELECT * FROM salidas ORDER BY fecha DESC`
- Mapear filas DB → formato JSON actual (`tipoPago`, `fecha` ISO).

## Paso 4: Reescribir `annotationsStorage.js`

**Archivo:** `backend/src/services/annotationsStorage.js`

Mantener exports:
- `listAnnotations()`
- `getAnnotation(id)`
- `createAnnotation(payload)`
- `deleteAnnotation(id)`
- `addComment(annotationId, texto)`

Implementación:
- CRUD en `anotaciones`.
- Comentarios en `anotacion_comentarios`.
- `getAnnotation` hace JOIN o query separada de comentarios.
- Mapear columnas snake_case → camelCase de respuesta actual.

## Paso 5: Script de migración JSON → MySQL

**Archivo:** `backend/scripts/migrate-json-to-mysql.js`

- Leer `backend/data/outflows.json`.
- Leer `backend/data/Anotaciones.json` (o `NARIPOS_ANNOTATIONS_FILE`).
- Insertar con `INSERT IGNORE`.
- Log resumen: N salidas, M anotaciones, K comentarios.

**Script npm:** `db:migrate-json`

## Paso 6: Health check (opcional mínimo)

**Archivo:** `backend/src/server.js`

- Extender `GET /health` con `{ ok: true, db: true|false }` haciendo `SELECT 1`.

## Paso 7: Tests

**Archivos:**
- `backend/tests/api.test.js` — adaptar tests de anotaciones (hoy usan archivo tmp).
- Nuevo `backend/tests/outflowsStorage.test.js` y/o mock del pool.

Estrategia mínima:
- Mock de `../src/config/db` en tests de servicios.
- Tests de API existentes siguen pasando con servicios reales mockeados o DB de test si Hostinger no aplica en CI.

Casos:
1. Crear/listar salida.
2. Crear anotación + comentario + eliminar.
3. Migración idempotente.

## Paso 8: Documentación

**Archivo:** `backend/README.md` o sección en README root

- Cómo crear DB en Hostinger.
- Variables `.env`.
- `npm run db:init`
- `npm run db:migrate-json` (una vez).

## Paso 9: Verificación local

1. Configurar `.env` con MySQL local.
2. `npm run db:init`
3. `npm run db:migrate-json` (si hay JSON previo).
4. `npm test`
5. Probar CRUD salidas/anotaciones manualmente.

## Paso 10: Deploy Hostinger

1. Crear base MySQL en panel.
2. Agregar vars `DB_*` al entorno Node.
3. Ejecutar `schema.sql` (phpMyAdmin).
4. Migrar JSON de backup si existe.
5. Redeploy y verificar `/health` + módulos.

## Orden de ejecución

```
Paso 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
```

## Resultado esperado

- Salidas y anotaciones persisten en MySQL.
- Datos sobreviven redeploys en Hostinger.
- API y frontend sin cambios visibles.
- Migración de datos históricos posible desde JSON.

## Estimación de archivos tocados

| Archivo | Acción |
|---------|--------|
| `backend/package.json` | editar |
| `backend/.env.example` | editar |
| `backend/src/config/env.js` | editar |
| `backend/src/config/db.js` | crear |
| `backend/db/schema.sql` | crear |
| `backend/scripts/migrate-json-to-mysql.js` | crear |
| `backend/src/services/outflowsStorage.js` | reescribir |
| `backend/src/services/annotationsStorage.js` | reescribir |
| `backend/src/server.js` | editar (health) |
| `backend/tests/api.test.js` | adaptar |
| `README.md` | editar |

**Frontend:** sin cambios.
