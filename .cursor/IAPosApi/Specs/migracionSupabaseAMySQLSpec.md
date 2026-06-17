# SPEC: Migración Supabase → MySQL (Hostinger)

## 1. Problema

Los módulos **Salidas** y **Anotaciones** persisten hoy en **Supabase (PostgreSQL)**. El usuario quiere mover la persistencia a **MySQL en Hostinger**, base de datos:

- **Nombre:** `u505924778_nariPos`

Motivos típicos: consolidar infraestructura en Hostinger, evitar dependencia externa de Supabase, simplificar deploy y backups en un solo proveedor.

## 2. Objetivo

Reemplazar Supabase por **MySQL** (`mysql2`) manteniendo:

- La misma API REST (sin cambios en frontend Vue).
- La misma interfaz de servicios (`outflowsStorage.js`, `annotationsStorage.js`).
- Los datos existentes en Supabase (migración one-shot).

## 3. Alcance

### Incluye

- Configuración de conexión MySQL (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Esquema MySQL equivalente a tablas actuales en Supabase.
- Reescritura de `outflowsStorage.js` y `annotationsStorage.js` para usar MySQL.
- Nuevo `backend/src/config/db.js` (pool `mysql2/promise`).
- Script de migración **Supabase → MySQL** (one-shot).
- Actualizar `db:init`, health check y documentación.
- Eliminar dependencia `@supabase/supabase-js` y `config/supabase.js`.

### No incluye

- ORM (Prisma/Sequelize).
- Cambios en frontend.
- Persistencia de ventas (siguen en WooCommerce).
- Configuración del panel Hostinger (el usuario crea DB y credenciales).

## 4. Estado actual vs destino

| Aspecto | Actual (Supabase) | Destino (MySQL Hostinger) |
|---------|-------------------|---------------------------|
| Motor | PostgreSQL | MySQL 8 / MariaDB |
| Cliente | `@supabase/supabase-js` | `mysql2` |
| Tablas | `salidas`, `anotaciones`, `anotacion_comentarios` | Mismas 3 tablas |
| Auth DB | URL + service role key | Usuario/contraseña Hostinger |
| RLS | Deshabilitado en Supabase | N/A (acceso solo backend) |

## 5. Modelo de datos (MySQL)

### 5.1 Tabla `salidas`

```sql
CREATE TABLE IF NOT EXISTS salidas (
  id          VARCHAR(36) PRIMARY KEY,
  motivo      VARCHAR(500) NOT NULL,
  suma        DECIMAL(12,2) NOT NULL,
  tipo_pago   ENUM('efectivo', 'transferencia_virtual') NOT NULL,
  fecha       DATETIME(3) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_salidas_fecha (fecha DESC)
);
```

### 5.2 Tabla `anotaciones`

```sql
CREATE TABLE IF NOT EXISTS anotaciones (
  id               VARCHAR(36) PRIMARY KEY,
  titulo           VARCHAR(255) NOT NULL,
  cliente          VARCHAR(255) NOT NULL DEFAULT '',
  recordar         TINYINT(1) NOT NULL DEFAULT 0,
  fecha_recordar   VARCHAR(64) NOT NULL DEFAULT '',
  marca            VARCHAR(255) NOT NULL DEFAULT '',
  producto_id      INT NULL,
  producto_nombre  VARCHAR(500) NOT NULL DEFAULT '',
  descripcion      TEXT,
  fecha_creacion   DATETIME(3) NOT NULL,
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_anotaciones_fecha_creacion (fecha_creacion DESC)
);
```

### 5.3 Tabla `anotacion_comentarios`

```sql
CREATE TABLE IF NOT EXISTS anotacion_comentarios (
  id              VARCHAR(36) PRIMARY KEY,
  anotacion_id    VARCHAR(36) NOT NULL,
  texto           TEXT NOT NULL,
  fecha           DATETIME(3) NOT NULL,
  INDEX idx_comentarios_anotacion (anotacion_id),
  FOREIGN KEY (anotacion_id) REFERENCES anotaciones(id) ON DELETE CASCADE
);
```

## 6. Variables de entorno

Reemplazar variables Supabase por:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=u505924778_xxxxx
DB_PASSWORD=tu_password
DB_NAME=u505924778_nariPos
```

En Hostinger, `DB_HOST` suele ser `localhost` si Node y MySQL están en el mismo servidor, o un host remoto tipo `srvXXX.hstgr.io` (según panel).

**Todas requeridas en producción.** Sin DB configurada → error claro al arrancar.

Variables Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) se eliminan del flujo obligatorio.

## 7. Arquitectura backend

```
backend/src/
├── config/
│   ├── env.js          (vars DB en lugar de Supabase)
│   └── db.js           (pool mysql2, nuevo)
├── db/
│   └── schema.sql      (esquema MySQL)
├── scripts/
│   ├── init-db.js      (ejecuta schema + ping)
│   └── migrate-supabase-to-mysql.js  (one-shot, nuevo)
├── services/
│   ├── outflowsStorage.js    (MySQL)
│   └── annotationsStorage.js (MySQL)
└── server.js           (health con ping MySQL)
```

## 8. API (sin cambios de contrato)

Endpoints idénticos; respuestas JSON conservan forma actual (`tipoPago`, `fechaCreacion`, `comentarios[]`, etc.).

## 9. Migración de datos Supabase → MySQL

Script `migrate-supabase-to-mysql.js`:

1. Lee todas las filas de `salidas`, `anotaciones`, `anotacion_comentarios` desde Supabase (requiere credenciales Supabase solo para esta ejecución).
2. Inserta en MySQL con `INSERT IGNORE` o `ON DUPLICATE KEY UPDATE` (idempotente).
3. Log: N salidas, M anotaciones, K comentarios migrados.

Ejecutar **una vez** después de crear tablas en Hostinger.

## 10. Hostinger — pasos del usuario

1. En panel Hostinger → Bases de datos MySQL: confirmar que existe `u505924778_nariPos`.
2. Anotar usuario, contraseña y host.
3. Ejecutar `backend/db/schema.sql` en phpMyAdmin.
4. Configurar `DB_*` en variables de entorno del backend Node.
5. Correr migración Supabase → MySQL (si hay datos en Supabase).
6. Redeploy backend y verificar `/health` + módulos Salidas/Anotaciones.

## 11. Criterios de aceptación

1. Crear salida → persiste en MySQL Hostinger.
2. Crear anotación + comentario → persiste en MySQL.
3. Listar/filtrar salidas funciona igual que con Supabase.
4. Eliminar anotación elimina comentarios (CASCADE).
5. Script migra datos existentes de Supabase sin duplicar.
6. Frontend sin cambios.
7. Tests de API pasan.
8. `/health` reporta `db: true` con MySQL conectado.

## 12. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de datos en Supabase | Migrar antes de apagar Supabase; conservar backup |
| Host incorrecto en Hostinger | Documentar lectura del panel MySQL |
| Diferencias PostgreSQL/MySQL (boolean, timestamps) | Mapeo explícito en servicios y schema |
| Credenciales Supabase aún necesarias para migración | Script one-shot; luego quitar vars Supabase |
