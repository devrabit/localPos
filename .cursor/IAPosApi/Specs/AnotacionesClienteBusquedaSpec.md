# SPEC: Botón buscar en campo Cliente (Agregar Anotación)

## Objetivo

Mejorar el campo opcional **Cliente** para que, al escribir, el usuario pueda **buscar** entre los clientes ya conocidos por el POS.

## Alcance

- Pantalla: formulario **Agregar Anotación** (`AnotacionNuevaView`).
- Cuando el texto del campo **Cliente** tenga al menos un carácter (tras trim), debe mostrarse un **botón con icono de búsqueda** junto al campo.
- Al usar el botón: cargar lista de clientes si hace falta (misma fuente que el POS: API `/clientes` vía store Pinia), filtrar por **nombre** o **teléfono** según el texto escrito y mostrar **coincidencias** seleccionables.
- Al elegir una coincidencia: rellenar el campo **Cliente** con el nombre y cerrar el panel.

## Fuera de alcance

- Crear cliente nuevo desde esta pantalla.
- Cambiar el modelo de datos de anotaciones en backend.

## Criterios de aceptación

1. Sin texto en Cliente → no se muestra el botón de búsqueda.
2. Con texto → se muestra el botón con icono de lupa y etiqueta/accesibilidad clara.
3. Tras pulsar buscar → lista filtrada o mensaje de sin coincidencias / error de carga.

## Estado

- **Aprobado** por product owner (confirmación en chat).
