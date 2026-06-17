# PLAN: Migración Supabase → MySQL (Hostinger)

## Objetivo

Reemplazar `@supabase/supabase-js` por `mysql2` apuntando a `u505924778_nariPos` en Hostinger, sin cambiar contratos de API ni frontend.

## Paso 1: Dependencia y configuración DB

**Archivos:**
- `backend/package.json` — agregar `mysql2`, quitar `@supabase/supabase-js`
- `backend/src/config/env.js` — vars `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; quitar validación Supabase
- `backend/.env.example` — documentar vars DB Hostinger
- `backend/src/config/db.js` — pool `mysql2/promise` con `getPool()`, `query()`, `ping()`

**Detalle:**
- Pool límite 10 conexiones.
- `DB_NAME=u505924778_nariPos` por defecto en ejemplo.

## Paso 2: Esquema SQL MySQL

**Archivo:** `backend/db/schema.sql`

- Reemplazar sintaxis PostgreSQL por MySQL (ENUM, DATETIME, TINYINT, índices).
- Quitar `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.

**Script:** `npm run db:init` ejecuta schema contra DB configurada.

## Paso 3: Reescribir `outflowsStorage.js`

- `INSERT INTO salidas ...`
- `SELECT ... ORDER BY fecha DESC`
- Mapeo filas → `{ tipoPago, fecha ISO }`

## Paso 4: Reescribir `annotationsStorage.js`

- CRUD en `anotaciones` + `anotacion_comentarios`
- Misma interfaz exportada que hoy

## Paso 5: Script migración Supabase → MySQL

**Archivo:** `backend/scripts/migrate-supabase-to-mysql.js`

- Usa Supabase solo para leer datos (vars temporales o flag `--from-supabase`).
- Inserta en MySQL con `INSERT IGNORE`.
- Log resumen.

**Script npm:** `db:migrate-supabase`

## Paso 6: Actualizar servidor y scripts

- `backend/src/server.js` — health check con `db.ping()` en lugar de Supabase
- `backend/scripts/init-db.js` — ejecutar schema + ping MySQL
- Eliminar `backend/src/config/supabase.js`
- Eliminar o archivar `migrate-json-to-supabase.js`

## Paso 7: Tests

- Adaptar mocks: `config/db` en lugar de `config/supabase`
- Verificar tests de salidas/anotaciones en `backend/tests/`

## Paso 8: Documentación

- `README.md` — sección MySQL Hostinger en lugar de Supabase
- `.cursor/IAPosApi/Memory/Context.md` — DB: MySQL

## Paso 9: Verificación local (opcional)

Si el usuario tiene MySQL local o túnel a Hostinger:

1. Configurar `.env` con credenciales.
2. `npm run db:init`
3. `npm run db:migrate-supabase` (si hay datos en Supabase).
4. `npm test`
5. Probar CRUD manual.

## Paso 10: Deploy Hostinger

1. Ejecutar `schema.sql` en phpMyAdmin (`u505924778_nariPos`).
2. Variables `DB_*` en entorno Node del backend.
3. Migrar datos desde Supabase (una vez).
4. Redeploy.
5. Verificar `/health` y módulos Salidas/Anotaciones.
6. (Opcional) Desactivar proyecto Supabase cuando todo esté validado.

## Orden de ejecución

```
Paso 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
```

## Archivos tocados

| Archivo | Acción |
|---------|--------|
| `backend/package.json` | editar |
| `backend/.env.example` | editar |
| `backend/src/config/env.js` | editar |
| `backend/src/config/db.js` | crear |
| `backend/src/config/supabase.js` | eliminar |
| `backend/db/schema.sql` | reescribir (MySQL) |
| `backend/scripts/init-db.js` | reescribir |
| `backend/scripts/migrate-supabase-to-mysql.js` | crear |
| `backend/src/services/outflowsStorage.js` | reescribir |
| `backend/src/services/annotationsStorage.js` | reescribir |
| `backend/src/server.js` | editar |
| `backend/tests/*` | adaptar |
| `README.md` | editar |
| `.cursor/IAPosApi/Memory/Context.md` | editar |

**Frontend:** sin cambios.

## Datos que necesito de ti para el deploy

Para configurar `.env` en Hostinger:

1. **DB_HOST** (ej. `localhost` o `srv123.hstgr.io`)
2. **DB_USER** (ej. `u505924778_naripos`)
3. **DB_PASSWORD**
4. (Opcional) Credenciales Supabase actuales — solo para migrar datos existentes
