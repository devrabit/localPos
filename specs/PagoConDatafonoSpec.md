# Pago con datafono

## Objetivo

Agregar el medio de pago **Pago con datafono**. Al seleccionarlo, el valor final de la compra suma una comision del 4% sobre el subtotal de productos.

## Regla

- Subtotal = suma de precio x cantidad.
- Comision = redondeo a centavos de `subtotal * 0.04`.
- Total a cobrar = subtotal + comision.
- Efectivo y transferencia no cambian el total.
- La comision se muestra en el carrito antes de confirmar y queda en la orden de WooCommerce como cargo (`fee_line`), en la factura y en el detalle del historial.

## API

`POST /api/orden` acepta `paymentMethod: "DATAFONO"`.

WooCommerce recibe:

- `payment_method`: `datafono`
- `payment_method_title`: `Pago con datafono`
- `fee_lines`: cargo `Comision datafono (4%)` por el 4% del total de la orden antes del cargo.

La respuesta incluye `total` (ya con comision) y `comision`.
