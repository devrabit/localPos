-- MySQL schema for NariPos (Salidas + Anotaciones + Pedidos)
-- Ejecutar en phpMyAdmin o: npm run db:init
-- Pedidos: solo MySQL local; NO se sincronizan con WordPress/WooCommerce.

CREATE TABLE IF NOT EXISTS salidas (
  id          VARCHAR(36) PRIMARY KEY,
  motivo      VARCHAR(500) NOT NULL,
  suma        DECIMAL(12,2) NOT NULL,
  tipo_pago   ENUM('efectivo', 'transferencia_virtual') NOT NULL,
  fecha       DATETIME(3) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_salidas_fecha (fecha DESC)
);

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

CREATE TABLE IF NOT EXISTS anotacion_comentarios (
  id              VARCHAR(36) PRIMARY KEY,
  anotacion_id    VARCHAR(36) NOT NULL,
  texto           TEXT NOT NULL,
  fecha           DATETIME(3) NOT NULL,
  INDEX idx_comentarios_anotacion (anotacion_id),
  CONSTRAINT fk_comentarios_anotacion
    FOREIGN KEY (anotacion_id) REFERENCES anotaciones(id) ON DELETE CASCADE
);

-- Pedidos internos del POS (NO se sincronizan con WordPress/WooCommerce)
CREATE TABLE IF NOT EXISTS pedidos (
  id              VARCHAR(36) PRIMARY KEY,
  dirigido_a      VARCHAR(255) NOT NULL,
  estado          ENUM(
                    'en_proceso',
                    'enviado_al_proveedor',
                    'recibido',
                    'subido_al_sitio'
                  ) NOT NULL DEFAULT 'en_proceso',
  fecha_creacion  DATETIME(3) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_pedidos_fecha_creacion (fecha_creacion DESC)
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id               VARCHAR(36) PRIMARY KEY,
  pedido_id        VARCHAR(36) NOT NULL,
  nombre_producto  VARCHAR(500) NOT NULL,
  referencia       VARCHAR(255) NOT NULL,
  cantidad         INT NOT NULL,
  descripcion      TEXT NULL,
  INDEX idx_pedido_items_pedido (pedido_id),
  CONSTRAINT fk_pedido_items_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);
