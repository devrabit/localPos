# SPEC: Persistencia MySQL para Salidas y Anotaciones

## 1. Problema

Los módulos **Salidas** y **Anotaciones** persisten datos en archivos JSON:

- `backend/data/outflows.json`
- `backend/data/Anotaciones.json`

En entornos como Hostinger, cada deploy puede **sobrescribir el directorio de la aplicación**, provocando pérdida de información. Esto ya ocurre en producción.

## 2. Objetivo

Migrar la persistencia de **Salidas** y **Anotaciones** a **MySQL**, manteniendo:

- La misma API REST existente (sin cambios en frontend).
- La arquitectura modular actual (`services/` + `routes/api.js`).
- Cambios estrictamente necesarios.

## 3. Alcance

### Incluye

- Conexión MySQL en backend (`mysql2`).
- Esquema de tablas para salidas y anotaciones.
- Reemplazo de `outflowsStorage.js` y `annotationsStorage.js` por implementación MySQL.
- Script de migración one-shot desde JSON existente (si hay datos).
- Variables de entorno para conexión DB.
- Tests de regresión en endpoints afectados.

### No incluye

- ORM (Prisma/Sequelize) — innecesario para 2 módulos.
- Cambios en frontend Vue.
- Persistencia de ventas/órdenes (siguen en WooCommerce).
- Panel de administración de base de datos.

## 4. Causa raíz

| Aspecto | JSON actual | MySQL propuesto |
|---------|-------------|-----------------|
| Supervivencia al deploy | ❌ Se pierde | ✅ Persistente |
| Concurrencia | ❌ Race conditions en escritura | ✅ Transacciones |
| Backup | Manual | Hostinger/DB nativo |
| Escalabilidad | Limitada | Adecuada para POS |

## 5. Modelo de datos

### 5.1 Tabla `salidas`

```sql
CREATE TABLE salidas (
  id          VARCHAR(36) PRIMARY KEY,
  motivo      VARCHAR(500) NOT NULL,
  suma        DECIMAL(12,2) NOT NULL,
  tipo_pago   ENUM('efectivo', 'transferencia_virtual') NOT NULL,
  fecha       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
```

Mapeo desde JSON actual:

| Campo JSON | Columna DB |
|------------|------------|
| `id` | `id` |
| `motivo` | `motivo` |
| `suma` | `suma` |
| `tipoPago` | `tipo_pago` |
| `fecha` | `fecha` |

### 5.2 Tabla `anotaciones`

```sql
CREATE TABLE anotaciones (
  id               VARCHAR(36) PRIMARY KEY,
  titulo           VARCHAR(255) NOT NULL,
  cliente          VARCHAR(255) DEFAULT '',
  recordar         TINYINT(1) NOT NULL DEFAULT 0,
  fecha_recordar   VARCHAR(64) DEFAULT '',
  marca            VARCHAR(255) DEFAULT '',
  producto_id      INT NULL,
  producto_nombre  VARCHAR(500) DEFAULT '',
  descripcion      TEXT,
  fecha_creacion   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
```

### 5.3 Tabla `anotacion_comentarios`

```sql
CREATE TABLE anotacion_comentarios (
  id              VARCHAR(36) PRIMARY KEY,
  anotacion_id    VARCHAR(36) NOT NULL,
  texto           TEXT NOT NULL,
  fecha           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (anotacion_id) REFERENCES anotaciones(id) ON DELETE CASCADE
);
```

Mapeo comentarios embebidos en JSON → filas en tabla hija.

## 6. Variables de entorno

Agregar a `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=naripos
DB_PASSWORD=secret
DB_NAME=naripos
```

Todas requeridas en producción. Sin DB configurada → error claro al arrancar o al primer uso (no fallback silencioso a JSON).

## 7. Arquitectura backend

```
backend/src/
├── config/
│   ├── env.js          (+ vars DB)
│   └── db.js           (pool mysql2, nuevo)
├── db/
│   └── schema.sql      (CREATE TABLE, nuevo)
├── scripts/
│   └── migrate-json-to-mysql.js  (one-shot, nuevo)
├── services/
│   ├── outflowsStorage.js    (reescribir → MySQL)
│   └── annotationsStorage.js (reescribir → MySQL)
└── routes/
    └── api.js          (sin cambios de contrato)
```

**Principio:** los servicios mantienen la misma interfaz exportada (`createOutflow`, `listOutflows`, `listAnnotations`, etc.) para no tocar rutas ni frontend.

## 8. API (sin cambios de contrato)

Los endpoints existentes se mantienen idénticos:

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| GET | `/api/salidas` | Lista salidas (filtro fecha) |
| POST | `/api/salidas` | Crea salida |
| GET | `/api/anotaciones` | Lista anotaciones |
| POST | `/api/anotaciones` | Crea anotación |
| GET | `/api/anotaciones/:id` | Detalle con comentarios |
| DELETE | `/api/anotaciones/:id` | Elimina anotación |
| POST | `/api/anotaciones/:id/comentarios` | Agrega comentario |

Respuestas JSON conservan la misma forma (`tipoPago`, `fechaCreacion`, `comentarios[]`, etc.).

## 9. Migración de datos existentes

Script `migrate-json-to-mysql.js`:

1. Lee `outflows.json` y `Anotaciones.json` si existen.
2. Inserta en MySQL con `INSERT IGNORE` (idempotente).
3. Comentarios embebidos → `anotacion_comentarios`.
4. Log de registros migrados / omitidos.

Ejecutar **una vez** después de crear tablas, antes o después del deploy.

## 10. Inicialización de esquema

Al arrancar el servidor (o script separado `npm run db:init`):

- Ejecutar `schema.sql` si las tablas no existen.
- Alternativa mínima: script manual documentado en README.

## 11. Validaciones

- Backend valida conexión DB al iniciar (health check opcional en `/health`).
- Errores de DB → HTTP 500 con mensaje genérico (no exponer credenciales).
- Tests usan DB en memoria o mock del pool (mantener tests actuales de API con mock de servicios o SQLite no — usar mock de mysql2 para simplicidad).

## 12. Criterios de aceptación

1. Crear salida → persiste en MySQL y sobrevive redeploy.
2. Crear anotación + comentario → persiste en MySQL.
3. Listar/filtrar salidas por fecha funciona igual que antes.
4. Eliminar anotación elimina comentarios (CASCADE).
5. Script de migración importa JSON existente sin duplicar.
6. Frontend no requiere cambios.
7. Tests de API de salidas/anotaciones pasan.

## 13. Hostinger

- Crear base MySQL en panel Hostinger.
- Configurar variables `DB_*` en el entorno Node.
- Ejecutar `schema.sql` vía phpMyAdmin o script.
- Correr migración JSON si hay backup de datos previos.

## 14. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de JSON previo sin backup | Ejecutar migración antes del deploy final |
| DB no configurada en local | Documentar `.env.example` |
| Latencia vs JSON | Pool de conexiones (`mysql2/promise`) |
