# SPEC: Servicio de búsqueda de marcas (anotaciones)

## Objetivo

Al pulsar el botón **Buscar** junto al campo **Marca** en **Agregar Anotación**, la aplicación debe **consumir un endpoint REST** que devuelva las marcas del catálogo WooCommerce que **coincidan** con el texto de búsqueda.

## Contrato API

- **Método y ruta:** `GET /api/marcas`
- **Query:** `q` (o `busqueda`) — texto de búsqueda; si va vacío → `{ "marcas": [] }`.
- **Respuesta:** `{ "marcas": string[] }` — nombres únicos, ordenados, excluye `Sin marca`; filtro **contiene** (insensible a mayúsculas) respecto a `q`.

## Origen de datos

- `woo.fetchProducts()` y extracción de marca con la misma lógica que el resto del POS (`extractMarcaFromWooProduct`).

## Frontend

- La búsqueda de marcas **no** deduce resultados solo del listado local de productos ya cargado en el formulario: debe llamar a `GET /api/marcas?q=...` **al hacer clic** en el botón buscar.
- Estados: cargando, error, lista vacía.

## Estado

Implementación acorde a este SPEC tras requerimiento explícito del usuario.
