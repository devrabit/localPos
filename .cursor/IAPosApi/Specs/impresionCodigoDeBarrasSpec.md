# 📦 Módulo de Generación e Impresión de Códigos de Barras (MVP)

## 1. 🎯 Objetivo

Permitir generar, visualizar y enviar a imprimir códigos de barras para productos, con integración opcional a WooCommerce.

---

## 2. 🧱 Arquitectura

### Frontend

* Framework: Vue.js
* Funciones:

  * Generación visual del código
  * Vista previa
  * Configuración de impresión


* Funciones:

  * Generación de imágenes (PNG/SVG)
  * Persistencia
  * Integración con WooCommerce API

---

## 3. 🔢 Tipos de código soportados

| Tipo    | Uso                   |
| ------- | --------------------- |
| CODE128 | General (recomendado) |



👉 MVP: CODE128 + EAN13

---

## 4. 📊 Modelo de datos

```json
{
  "id": "uuid",
  "product_id": "string",
  "sku": "string",
  "barcode": "string",
  "type": "CODE128 | EAN13",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## 5. ⚙️ Funcionalidades

### 5.1 Generar código de barras

* Input:

  * SKU / ID producto / texto manual
  * Tipo de código
* Output:

  * Imagen (SVG o PNG)

### 5.2 Vista previa

* Render en tiempo real
* Opciones:

  * Tamaño
  * Mostrar texto
  * Margen

### 5.3 Impresión

#### Requisitos:

* Compatible con:

  * Impresoras térmicas (Zebra, Epson)
  * Impresoras estándar

#### Modos:

1. Impresión desde navegador

   * `window.print()`
2. Impresión directa (PRO)

   * WebUSB / WebBluetooth
   * Servicio local (Node agent)

---

### 5.4 Lotes (Batch)

* Generar múltiples códigos
* Ejemplo:

  * 50 etiquetas del mismo producto

---

### 5.5 Integración con WooCommerce

* Obtener productos
* Usar:

  * SKU
  * ID
* Guardar barcode en:

  * meta_data

---

## 6. 🔌 API (Backend)

### POST /barcode/generate

```json
{
  "text": "123456789",
  "type": "CODE128"
}
```

Response:

```json
{
  "image": "base64 or url"
}
```

---

### POST /barcode/print

```json
{
  "barcode_id": "uuid",
  "copies": 3,
  "printer": "default"
}
```

---

### GET /barcode/:id

* Obtener barcode generado

---

## 7. 🧩 Librerías recomendadas

### Frontend

* JsBarcode
* qrcode.js (opcional)

### Backend

* bwip-js (Node)
* picqer/php-barcode-generator (Laravel)

---

## 8. 🖥️ UI/UX

### Pantalla principal

* Buscador de producto
* Selector tipo código
* Preview en vivo
* Botones:

  * Generar
  * Imprimir

---

### Modal de impresión

* Número de copias
* Tamaño etiqueta:

  * 50x30 mm
  * 80x40 mm
* Layout:

  * 1x1
  * Grid

---

## 9. 🧪 Casos de uso

### Caso 1: Generar código desde SKU

1. Usuario busca producto
2. Sistema genera CODE128
3. Usuario imprime

### Caso 2: Generación masiva

1. Selección múltiple
2. Generar lote
3. Imprimir etiquetas

---

## 10. 🔐 Seguridad

* Validar inputs (solo caracteres válidos)
* Rate limit en generación
* Autenticación JWT

---

## 11. ⚡ Performance

* Cache de códigos generados
* Evitar regenerar si ya existe
* Uso de SVG para rapidez

---

## 12. 🚀 Roadmap (post-MVP)

* Impresión directa sin diálogo
* Soporte Zebra ZPL
* Plantillas personalizadas
* Escaneo con cámara (POS)
* Sincronización offline

---

## 13. 🧠 Buenas prácticas

* Usar SKU como base del código
* Evitar códigos aleatorios sin control
* Mantener unicidad de códigos

Ejemplo:

```
SC-000123
```

---

## 14. 🖨️ Estrategias de impresión

| Método         | Nivel    | Recomendación |
| -------------- | -------- | ------------- |
| window.print() | MVP      | ✅ Fácil       |
| PDF + print    | Medio    | ✅ Estable     |

---

## 15. 🧩 Integración con POS

Este módulo debe ser:

* Independiente
* Reutilizable

Usos:

* Inventario
* Ventas
* Recepción de productos

---
