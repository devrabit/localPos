# SPEC: Módulo Agotados

## Objetivo

Permitir consultar desde el POS todos los ítems de catálogo que están sin existencias (stock 0 en WooCommerce), con vista clara para reposición.

## Alcance

- Listado de productos simples con stock 0 (respetando `manage_stock`: stock ilimitado no cuenta como agotado).
- Productos variables: cada variación con stock 0 aparece como fila (nombre compuesto con atributos, como en el POS).
- Agrupación visual por **marca**.

## Marca (origen de datos)

- Se intenta leer en este orden:
  1. Campo REST `brands` (plugins de marcas compatibles con Woo REST).
  2. Atributo global del producto cuyo slug normalizado sea `marca` o `brand` (p. ej. `pa_marca`).
- Si no hay marca reconocible: grupo **Sin marca**.

## API

- `GET /api/productos/agotados`
- Respuesta: `{ total: number, grupos: Array<{ marca: string, items: Array<{ nombre, sku, tipo, productId, variationId }> }> }`
- `tipo`: `simple` | `variacion`
- `variationId` es `null` en simples.

## UI

- Ruta `/agotados`.
- Enlace en el encabezado del POS junto a Historial, Códigos de barras y Salidas.
- Tabla por cada marca (encabezado de sección + tabla: Producto, SKU, Tipo).
- Estados: carga, error, vacío.

## Fuera de alcance

- Edición de stock desde esta pantalla.
- Exportación CSV/impresión.
