# SPEC: Botón buscar en campo Marca (Agregar Anotación)

## Objetivo

En el formulario **Agregar Anotación**, cuando el usuario escriba en el campo **Marca**, debe aparecer un **botón con icono de búsqueda** para elegir una marca conocida del catálogo.

## Alcance

- Pantalla: **Agregar Anotación** (`AnotacionNuevaView`).
- Criterio de visibilidad del botón: al menos **un carácter** en **Marca** (tras `trim`).
- Al pulsar buscar: obtener marcas desde el catálogo de productos expuesto por la API (ver PLAN: campo `marca` en cada producto), **filtrar** por el texto escrito y mostrar **coincidencias** seleccionables.
- Al elegir: rellenar **Marca** y cerrar el panel.
- Patrón UX y accesibilidad **alineado** al campo **Cliente** (lupa, panel, foco).

## Fuera de alcance

- Cambiar el esquema de guardado de anotaciones (`marca` sigue siendo texto).
- Crear/editar marcas en Woo desde esta pantalla.

## Criterios de aceptación

1. Sin texto en Marca → no se muestra el botón de búsqueda.
2. Con texto → botón con icono buscar y etiquetas accesibles.
3. Tras pulsar → lista filtrada o estados cargando / sin coincidencias / error.

## Estado

- SPEC y PLAN aprobados; **implementado** según `AnotacionesMarcaBusquedaPlan.md`.
