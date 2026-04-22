---
name: sistema
description: Convierte una idea en un entregable completo con spec tecnico, codigo base y validacion en un pipeline orquestado. Usar cuando el usuario pida pasar de idea a implementacion, generar features end-to-end, o estructurar flujo idea-spec-codigo-validacion.
---

# Sistema: AI Dev Engine

## Objetivo

Transformar una idea de producto en tres salidas reutilizables:

1. `spec` tecnico
2. `code` base inicial
3. `validation` de consistencia y riesgos

Flujo principal: `Idea -> Spec -> Codigo -> Validacion -> Iteracion`.

## Cuando aplicarlo

Aplicar esta skill cuando el usuario pida:

- "crear feature desde una idea"
- "bajar requerimiento a spec y codigo"
- "generar base tecnica para implementar rapido"
- "validar coherencia entre lo pedido y lo generado"

## Entradas requeridas

Solicitar o inferir, como minimo:

- `feature`: nombre corto de la funcionalidad
- `description`: comportamiento esperado
- `constraints`: restricciones (reglas de negocio, limites tecnicos, compliance)

Formato recomendado:

```json
{
  "feature": "cash payment",
  "description": "calcular cambio",
  "constraints": ["solo efectivo"]
}
```

## Flujo operativo

Copiar esta lista y mantener estado:

```markdown
Progreso:
- [ ] 1. Normalizar input
- [ ] 2. Generar spec
- [ ] 3. Generar codigo base
- [ ] 4. Validar consistencia
- [ ] 5. Entregar salida final
```

### 1) Normalizar input

- Convertir descripcion libre en requerimientos verificables.
- Identificar entidades, reglas y casos borde.
- Si falta informacion critica, pedir aclaraciones concretas.

### 2) Generar spec

Entregar un spec breve y accionable con:

- alcance (in/out)
- flujos funcionales
- reglas de negocio
- contratos API o interfaces
- criterios de aceptacion

### 3) Generar codigo base

Producir esqueleto inicial alineado al spec, priorizando:

- estructura de modulos
- endpoints/servicios principales
- validaciones de entrada
- manejo de errores

Si aplica al contexto, generar:

- componentes frontend
- API Node/Express
- modelos o tipos

### 4) Validar consistencia

Revisar:

- cobertura del spec en el codigo
- huecos de validacion
- errores logicos evidentes
- riesgos de seguridad basicos

Reportar por severidad:

- `CRITICO`: rompe flujo o seguridad
- `ALTO`: incumple regla de negocio
- `MEDIO`: deuda tecnica relevante
- `BAJO`: mejora recomendada

### 5) Entregar salida final

Responder en este formato:

```json
{
  "spec": "...",
  "code": "...",
  "validation": "..."
}
```

## Guardrails

- Sanitizar inputs antes de usarlos en prompts o templates.
- Limitar tamano de contexto para evitar respuestas inestables.
- No asumir que codigo generado esta listo para produccion.
- Incluir advertencias explicitas cuando haya supuestos.

## Buenas practicas

- Versionar prompts y cambios de estrategia.
- Guardar outputs relevantes para iteraciones futuras.
- Recomendar revision humana antes de merge/deploy.
- Proponer siguientes pasos: tests, hardening y observabilidad.

## Criterio de calidad minimo

Antes de finalizar, verificar:

- `spec`, `code` y `validation` presentes
- trazabilidad entre requerimiento y codigo
- validaciones clave cubiertas
- riesgos principales documentados
