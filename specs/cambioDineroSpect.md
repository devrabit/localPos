# 💵 Extensión Módulo de Pago: Cálculo de Cambio (Efectivo)

## 1. 🎯 Objetivo

Cuando el usuario seleccione **pago en efectivo**, el sistema debe:

* Solicitar el dinero recibido
* Calcular automáticamente el cambio
* Mostrar el resultado en pantalla antes de confirmar la orden

---

## 2. 📌 Alcance (MVP)

* Campo dinámico solo para efectivo
* Cálculo en tiempo real
* Validación de monto suficiente
* Visualización clara del cambio

---

## 3. 🧱 Arquitectura

### Frontend (Vue.js)

* Input dinámico
* Cálculo reactivo
* Validaciones en tiempo real

### Backend

* Validación final del monto
* Persistencia opcional del dinero recibido

---

## 4. 📊 Modelo de datos

Extensión del modelo de orden:

```json id="cash_model"
{
  "order_id": "uuid",
  "payment_method": "EFECTIVO",
  "total": 10000,
  "cash_received": 20000,
  "change": 10000
}
```

---

## 5. ⚙️ Funcionalidades

### 5.1 Mostrar campo de dinero recibido

#### Condición:

```pseudo id="condition_cash"
IF payment_method == EFECTIVO
  SHOW input_cash_received
```

---

### 5.2 Input: Dinero recibido

* Tipo: numérico
* Permitir:

  * Solo números positivos
* Placeholder:

  * "Ingresa el dinero recibido"

---

### 5.3 Cálculo de cambio 🔥

#### Fórmula:

```text id="formula_change"
cambio = dinero_recibido - total_orden
```

---

### 5.4 Cálculo en tiempo real

* Cada vez que el usuario escribe:

  * recalcular cambio automáticamente

---

### 5.5 Visualización

Mostrar:

```text id="ui_change"
Total: $10,000
Recibido: $20,000
Cambio: $10,000
```

---

## 6. 🚨 Validaciones

### 6.1 Campo obligatorio

```pseudo id="validation_required"
IF payment_method == EFECTIVO AND cash_received IS NULL
  BLOCK confirm
```

---

### 6.2 Monto insuficiente

```pseudo id="validation_insufficient"
IF cash_received < total
  SHOW error "El dinero es insuficiente"
  BLOCK confirm
```

---

### 6.3 Cambio negativo

* No permitido
* Mostrar en rojo si ocurre (UX)

---

## 7. 🔌 API (Backend)

### POST /orders

```json id="order_cash_request"
{
  "items": [],
  "total": 10000,
  "payment_method": "EFECTIVO",
  "cash_received": 20000
}
```

---

### Validación backend

```pseudo id="backend_validation"
IF payment_method == EFECTIVO
  IF cash_received IS NULL OR cash_received < total
    RETURN error 400
```

---

## 8. 🖥️ UI/UX

### Flujo visual

```text id="flow_ui"
Selecciona método: EFECTIVO
        ↓
Aparece input dinero recibido
        ↓
Usuario escribe monto
        ↓
Sistema calcula cambio
        ↓
Muestra resultado
```

---

### Estados visuales

| Estado       | UI              |
| ------------ | --------------- |
| Inicial      | Input vacío     |
| Escribiendo  | Cambio dinámico |
| Insuficiente | Error rojo      |
| Correcto     | Cambio en verde |

---

### UX recomendada 🔥

* Formatear moneda automáticamente
* Botones rápidos:

  * $10.000
  * $20.000
  * $50.000

---

## 9. 🧪 Casos de uso

### Caso 1: Pago correcto

* Total: 10.000
* Recibe: 20.000
* Cambio: 10.000

---

### Caso 2: Pago exacto

* Cambio: 0

---

### Caso 3: Dinero insuficiente

* Bloquea confirmación
* Muestra error

---

## 10. ⚡ Performance

* Cálculo en frontend (instantáneo)
* Backend solo valida

---

## 11. 🚀 Roadmap

* Sugerencia automática de cambio
* Redondeo inteligente
* Integración con caja registradora
* Multi-moneda

---

## 12. 🧠 Buenas prácticas

* Usar enteros (evitar floats)
* Ej:

  * 10000 = $10.000
* Centralizar lógica de cálculo

---

## 13. 🧩 Integración con POS

Este módulo impacta:

* Flujo de ventas
* Caja
* Reportes

---

## 14. 🧠 Consejo PRO

👉 Este flujo es CRÍTICO en POS reales

Errores aquí afectan:

* dinero real 💸
* confianza del sistema

💡 Siempre:

* valida en frontend y backend
* muestra números claros
* evita cálculos ambiguos

---
