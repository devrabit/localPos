# 🧾 Módulo: Botón “Imprimir Factura” (MVP)

## 1. 🎯 Objetivo

Crear un botón en el POS que permita al usuario imprimir una factura de forma rápida al hacer clic, utilizando diferentes estrategias de impresión según el entorno (navegador o servicio local).

---

## 2. 🧱 Alcance

Incluye:

* Botón UI “Imprimir factura”
* Generación de contenido de factura
* Envío a impresión
* Integración opcional con servicio local

No incluye:

* Facturación electrónica legal (DIAN)
* Firma digital

---

## 3. 🖥️ UI/UX

### 3.1 Botón principal

* Texto: **Imprimir factura**
* Ubicación:

  * Pantalla de venta (checkout)
  * Confirmación de pago

### 3.2 Estados del botón

| Estado   | Comportamiento         |
| -------- | ---------------------- |
| Normal   | Click habilitado       |
| Cargando | Deshabilitado + loader |
| Error    | Mostrar mensaje        |

---

## 4. ⚙️ Flujo funcional

```text
Usuario hace click en "Imprimir factura"
        ↓
Sistema obtiene datos de la venta
        ↓
Genera formato de factura (HTML / PDF / ZPL)
        ↓
Selecciona método de impresión
        ↓
Envía a impresora
        ↓
Confirma resultado
```

---

## 5. 📊 Modelo de datos (Factura)

```json
{
  "id": "string",
  "fecha": "datetime",
  "cliente": {
    "nombre": "string",
    "documento": "string"
  },
  "items": [
    {
      "nombre": "string",
      "cantidad": "number",
      "precio": "number",
      "total": "number"
    }
  ],
  "total": "number",
  "metodo_pago": "string"
}
```

---

## 6. 🧾 Generación de factura

### 6.1 Formatos soportados

| Formato | Uso                  |
| ------- | -------------------- |
| HTML    | Navegador            |
| PDF     | Descarga / impresión |
| ZPL     | Impresora térmica    |

👉 MVP: HTML

---

### 6.2 Ejemplo HTML básico

```html
<div id="factura">
  <h2>Factura</h2>
  <p>Cliente: Juan Perez</p>
  <table>
    <tr><th>Producto</th><th>Cant</th><th>Total</th></tr>
    <tr><td>Producto A</td><td>1</td><td>$10.000</td></tr>
  </table>
  <h3>Total: $10.000</h3>
</div>
```

---

## 7. 🖨️ Métodos de impresión

### 7.1 Método 1: Navegador (MVP)

* Uso de:

```javascript
window.print()
```

✔️ Fácil implementación
❌ Muestra diálogo

---

### 7.2 Método 2: Servicio local (Recomendado)

* Endpoint:

```
POST http://localhost:3001/print
```

* Payload:

```json
{
  "content": "<html>...</html>"
}
```

✔️ Impresión automática
✔️ Sin interacción usuario

---

### 7.3 Método 3: PDF intermedio

* Generar PDF
* Enviar a imprimir

---

## 8. 🔌 API (Opcional)

### POST /print/factura

```json
{
  "factura_id": "123",
  "formato": "html"
}
```

---

## 9. 🧩 Componente Vue (Referencia)

```javascript
methods: {
  async imprimirFactura() {
    this.loading = true;

    try {
      const factura = await this.obtenerFactura();

      const html = this.generarHTML(factura);

      // Opción 1: navegador
      const ventana = window.open('', '_blank');
      ventana.document.write(html);
      ventana.print();

      // Opción 2: servicio local
      /*
      await fetch('http://localhost:3001/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: html })
      });
      */

    } catch (error) {
      console.error(error);
    } finally {
      this.loading = false;
    }
  }
}
```

---

## 10. 🔐 Seguridad

* Validar que exista la factura
* Control de acceso (usuario autenticado)
* Sanitizar HTML

---

## 11. ⚡ Performance

* Cachear factura si ya fue generada
* Evitar regeneración innecesaria
* Minimizar HTML

---

## 12. 🧪 Casos de uso

### Caso 1: Impresión inmediata

1. Usuario finaliza venta
2. Click en “Imprimir factura”
3. Se imprime automáticamente

---

### Caso 2: Reimpresión

1. Usuario busca venta anterior
2. Click en imprimir
3. Se genera nuevamente

---

## 13. 🚀 Roadmap

* Impresión térmica (ZPL)
* Selección de impresora
* Múltiples copias
* Diseño personalizable
* Integración con facturación electrónica

---

## 14. 🧠 Buenas prácticas

* Separar lógica de generación y de impresión
* Usar plantillas reutilizables
* Manejar errores de impresora

---

## 15. 🧩 Integración con POS

El botón debe estar disponible en:

* Checkout
* Historial de ventas

Debe poder:

* Reutilizar datos de venta
* Funcionar offline (si aplica)

---
