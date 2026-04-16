# 💳 Módulo: Selección de Método de Pago (Pre-confirmación de Orden)

## 1. 🎯 Objetivo

Agregar un paso obligatorio antes de confirmar una orden donde el usuario debe seleccionar un método de pago.
Este dato es **netamente informativo** (no procesa pagos), pero es requerido para completar la venta.

---

## 2. 📌 Alcance (MVP)

* Selección obligatoria de método de pago
* Dos opciones disponibles:

  * Transferencia virtual
  * Pago en efectivo
* Bloquear confirmación de orden si no hay selección
* Persistir el método seleccionado en la orden

---

## 3. 🧱 Arquitectura

### Frontend (Vue.js)

* UI de selección (radio buttons / cards)
* Validación antes de confirmar
* Manejo de estado (Pinia/Vuex)

### Backend

* Recibir y almacenar método de pago
* Validar que venga en la request

---

## 4. 📊 Modelo de datos

Agregar campo a la orden:

```json id="payment_model"
{
  "order_id": "uuid",
  "payment_method": "TRANSFERENCIA | EFECTIVO"
}
```

---

## 5. ⚙️ Funcionalidades

### 5.1 Selección de método de pago

#### UI:

* Opciones visibles:

  * Transferencia virtual
  * Pago en efectivo

#### Comportamiento:

* Solo una opción seleccionable (radio)
* Valor por defecto: ninguno

---

### 5.2 Validación obligatoria 🚨

#### Regla:

* NO permitir confirmar orden si:

  * `payment_method == null`

#### Acción:

* Mostrar mensaje:

  * "Debes seleccionar un método de pago"

---

### 5.3 Persistencia

* Guardar método en:

  * estado global (frontend)
  * request al backend
  * base de datos

---

### 5.4 Visualización

* Mostrar método seleccionado en:

  * Resumen de la orden
  * Historial de ventas
  * Ticket (opcional)

---

## 6. 🔌 API (Backend)

### POST /orders

Request:

```json id="order_request"
{
  "items": [],
  "total": 10000,
  "payment_method": "EFECTIVO"
}
```

---

### Validación backend

```pseudo id="validation_rule"
IF payment_method IS NULL
  RETURN error 400 "Payment method required"
```

---

## 7. 🖥️ UI/UX

### Ubicación

Antes del botón:
👉 "Confirmar orden"

---

### Diseño sugerido

#### Opción 1 (simple)

* Radio buttons

#### Opción 2 (recomendado 🔥)

* Cards seleccionables:

```text id="ui_example"
[ 💵 Efectivo ]
[ 💳 Transferencia ]
```

---

### Estados

| Estado          | Comportamiento      |
| --------------- | ------------------- |
| No seleccionado | Botón deshabilitado |
| Seleccionado    | Botón habilitado    |

---

## 8. 🔄 Flujo

```text id="flow_payment"
Usuario arma orden
      ↓
Selecciona método de pago
      ↓
[SI seleccionado]
      ↓
Confirmar orden
      ↓
Guardar orden
```

---

## 9. 🧪 Casos de uso

### Caso 1: Usuario olvida seleccionar

* Presiona "Confirmar"
* Sistema bloquea acción
* Muestra error

---

### Caso 2: Flujo correcto

* Selecciona "Efectivo"
* Confirma orden
* Orden se guarda con método

---

## 10. 🔐 Validaciones

### Frontend

* Campo obligatorio
* UI bloquea acción

### Backend

* Validación redundante (OBLIGATORIA)
* Evita inconsistencias

---

## 11. ⚡ Performance

* Sin impacto relevante
* Campo ligero

---

## 12. 🚀 Roadmap (futuro)

* Más métodos:

  * Tarjeta
  * QR
  * Wallet
* Integración con pasarela de pagos
* División de pagos (split payment)

---

## 13. 🧠 Buenas prácticas

* Usar ENUM para métodos
* No hardcodear strings en frontend
* Centralizar constantes

Ejemplo:

```js id="enum_example"
export const PAYMENT_METHODS = {
  CASH: 'EFECTIVO',
  TRANSFER: 'TRANSFERENCIA'
}
```

---

## 14. 🧩 Integración con POS

Este módulo impacta:

* Flujo de ventas
* Reportes
* Auditoría

---

## 15. 🧠 Consejo PRO

👉 Aunque es informativo, este campo es CLAVE para:

* Cuadre de caja
* Reportes financieros
* Trazabilidad

💡 Desde ya diseña esto pensando en:

* expansión futura (pagos reales)
* conciliación contable

---
