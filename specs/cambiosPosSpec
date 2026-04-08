# 🔁 Product Variations Support (CRITICAL)

---

# 🎯 Objective

Ensure the POS system correctly handles **variable products** from WooCommerce.

---

# 🧱 Data Model Changes

## Product

```json
{
  "id": 1,
  "nombre": "Camiseta",
  "tipo": "variable", 
  "variaciones": []
}
```

---

## Product Variation

```json
{
  "variationId": 101,
  "productId": 1,
  "nombre": "Camiseta - Roja / M",
  "precio": 25000,
  "stock": 10,
  "atributos": {
    "color": "Rojo",
    "talla": "M"
  }
}
```

---

# 🛒 Cart Item (UPDATED)

```json
{
  "variationId": 101,
  "productId": 1,
  "nombre": "Camiseta - Roja / M",
  "precio": 25000,
  "cantidad": 2
}
```

---

# 🔌 BACKEND CHANGES

## Fetch Products with Variations

### Step 1:

```http
GET /wp-json/wc/v3/products
```

### Step 2 (for variable products):

```http
GET /wp-json/wc/v3/products/{productId}/variations
```

---

## Response Transformation

Backend must merge:

* Product
* Variations

Into a single response for frontend.

---

# 🧠 FRONTEND BEHAVIOR

---

## Product Selection Flow

### IF simple product:

* Add directly to cart

### IF variable product:

* Open variation selector UI
* User must choose:

  * Size
  * Color
* THEN add selected variation to cart

---

# 🎨 UI REQUIREMENTS

* Modal or dropdown for variations
* Show:

  * Attribute options (size, color)
  * Stock per variation
  * Price per variation

---

# 🔄 ORDER CREATION (CRITICAL)

When sending order to backend:

```json
{
  "line_items": [
    {
      "product_id": 1,
      "variation_id": 101,
      "quantity": 2
    }
  ]
}
```

---

# ⚠️ VALIDATIONS

* Do not allow adding product without selecting variation
* Validate stock per variation
* Disable unavailable combinations

---

# ⚡ PERFORMANCE

* Cache variations
* Lazy load variations (optional)
* Avoid fetching all variations at once if large catalog

---

# 🧪 TESTING

Must test:

* Adding variation to cart
* Different prices per variation
* Stock validation
* Order creation with variation_id

---

# 🚀 MVP DEFINITION (UPDATED)

System is DONE when:

* Variable products display correctly
* User can select variations
* Correct variation is added to cart
* Order is created with variation_id

---

# 🧠 PRO IMPLEMENTATION STRATEGY (RECOMMENDED)

## Treat Variations as First-Class Sellable Units

For simplicity, scalability, and fewer bugs:

👉 The frontend MUST treat each variation as an independent product when added to the cart.

---

## Practical Implications

* The cart should NOT store "products", only **variations**
* Each cart item is uniquely identified by `variationId`
* Price, stock, and name must always come from the variation
* UI should display variation name (including attributes)

---

## Example

Instead of:

```json
{
  "productId": 1,
  "cantidad": 2
}
```

Use:

```json
{
  "variationId": 101,
  "nombre": "Camiseta - Roja / M",
  "precio": 25000,
  "cantidad": 2
}
```

---

## Benefits

* Eliminates ambiguity in pricing
* Prevents stock inconsistencies
* Simplifies cart logic
* Simplifies order creation
* Reduces frontend complexity

---

# 💡 IMPORTANT

* Variation is the real sellable unit
* Product is only a container

---
