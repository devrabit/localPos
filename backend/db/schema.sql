-- Ejecutar en Supabase: SQL Editor > New query > Run

CREATE TABLE IF NOT EXISTS salidas (
  id          TEXT PRIMARY KEY,
  motivo      VARCHAR(500) NOT NULL,
  suma        NUMERIC(12,2) NOT NULL,
  tipo_pago   TEXT NOT NULL CHECK (tipo_pago IN ('efectivo', 'transferencia_virtual')),
  fecha       TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salidas_fecha ON salidas (fecha DESC);

CREATE TABLE IF NOT EXISTS anotaciones (
  id               TEXT PRIMARY KEY,
  titulo           VARCHAR(255) NOT NULL,
  cliente          VARCHAR(255) NOT NULL DEFAULT '',
  recordar         BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_recordar   VARCHAR(64) NOT NULL DEFAULT '',
  marca            VARCHAR(255) NOT NULL DEFAULT '',
  producto_id      INTEGER NULL,
  producto_nombre  VARCHAR(500) NOT NULL DEFAULT '',
  descripcion      TEXT,
  fecha_creacion   TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anotaciones_fecha_creacion ON anotaciones (fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS anotacion_comentarios (
  id              TEXT PRIMARY KEY,
  anotacion_id    TEXT NOT NULL REFERENCES anotaciones(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL,
  fecha           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comentarios_anotacion ON anotacion_comentarios (anotacion_id);

-- Backend POS: acceso vía API Node (publishable/anon key)
ALTER TABLE salidas DISABLE ROW LEVEL SECURITY;
ALTER TABLE anotaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE anotacion_comentarios DISABLE ROW LEVEL SECURITY;
