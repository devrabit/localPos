# PLAN: Botón buscar en campo Marca (Agregar Anotación)

**SPEC de referencia:** borrador acordado en chat (`Marca`: texto → botón buscar; panel de coincidencias desde catálogo).

**Condición:** ejecutar solo después de **aprobación explícita del SPEC** por el usuario.

---

## 1. Backend — exponer marca en catálogo POS

**Archivo:** `backend/src/routes/api.js`

- En `mapProductDto(p, variaciones)`, añadir campo **`marca`** usando la misma lógica que agotados (`extractMarcaFromWooProduct(p)` ya existe en el archivo).
- Valor por producto padre (simple o variable): una cadena; coherente con listados existentes (`Sin marca` si no aplica).

**Archivo:** `backend/tests/api.test.js`

- Actualizar el test de `GET /api/productos` que compara el DTO esperado para incluir `marca` (ej. `'Sin marca'` o la que devuelva el mock si se añaden atributos de prueba).

---

## 2. Frontend — UI y datos

**Archivo:** `frontend/src/modules/anotaciones/views/AnotacionNuevaView.vue`

- Reutilizar `productos` ya cargados con `GET /api/productos`.
- **Computed `marcasUnicas`:** a partir de `productos`, conjunto ordenado de `p.marca` no vacío distinto de `Sin marca` (opcional incluir `Sin marca` si se desea; por defecto **excluir** para que la búsqueda sea útil).
- **Computed `mostrarBotonBuscarMarca`:** `marca.trim().length > 0` (igual criterio que Cliente).
- **Botón** junto al input Marca: mismo patrón visual/accesibilidad que el botón de Cliente (lupa, `aria-label` / `title`).
- **Panel desplegable:** al pulsar, filtrar `marcasUnicas` donde el texto incluya lo escrito (case insensitive); lista clickeable que asigna `marca.value` y cierra panel.
- **Blur / foco:** mismo patrón que Cliente (`data-marca-busqueda`, `mousedown.prevent` en ítems, cierre diferido en blur si hace falta).

---

## 3. Verificación manual

- En dev: escribir en Marca → aparece botón → buscar → elegir → campo actualizado.
- Sin texto → sin botón.

---

## 4. Entrega / deploy

- **No** ejecutar `npm run build`, **no** actualizar `dist`, **no** `git push` salvo pedido explícito del usuario (reglas del proyecto).

---

## Orden de commits sugerido (opcional)

1. Backend + tests (`marca` en DTO).
2. Frontend (solo `AnotacionNuevaView.vue`).

---

## Ejecución

- Completado en código local; tests backend pasan (`npm test` en `backend/`).
- Sin `npm run build` ni push salvo solicitud explícita del usuario.
