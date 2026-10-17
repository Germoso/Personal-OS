# PLAN — Vista de calendario con grid horario estilo Google Calendar

Tarea del worktree `calendario-grid` (rama `calendario-grid`, base `main`).
Brief completo definido por el grilling previo (usuario + agente de `prueba-flujo`, 6-ene).

## Decisiones cerradas (grilling)

| Decisión | Resultado |
|---|---|
| Prioridad | **Grid horario semanal** estilo Google. La vista mes NO entra en el MVP. |
| Roturas a resolver | poder editar/borrar · ver horas del día · crear rápido (mes = bonus posterior) |
| Creación | **Click en un hueco del grid → crear** con elección **evento o tarea**; click en un bloque → **editar/borrar** desde la vista |
| Tareas | **Agendables como bloques**: campos opcionales de inicio/duración en la tabla `tasks` (migración drizzle), con **distintivo visual** (p. ej. borde discontinuo) |
| Drag & drop | **Fuera del MVP** (click-to-create + edición por campos) |
| Recurrencia | **Fuera del MVP** (schema sin cambios) |
| Duración | **Un solo día**; **cruce de medianoche** soportado (fin ≤ inicio ⇒ día siguiente en el cálculo). Sin multi-día. |
| Overlaps | **Configurable**: dos algoritmos seleccionables desde una opción de UI — columnas simples **y** posicionamiento top-to-bottom óptimo |
| Zona horaria | **Hora local sin timezones** (mantiene diseño actual del schema) |
| Calidad | Tests actuales **verdes + tests nuevos** del grid |

## Alcance (Target/Change)

1. **`src/app/calendar`**: sustituir la cuadrícula semanal actual por un grid horario estilo Google:
   - filas por hora (día completo),
   - eventos posicionados por `startTime` con altura proporcional a la duración,
   - banda «todo el día» arriba con eventos sin hora y tareas sin agendar.
2. **Interacción**: click en hueco → crear (elección evento o tarea); click en bloque → editar/borrar desde la vista (server actions + `useActionState`, como el `EventForm` existente).
3. **Tareas**: añadir a `tasks` campos opcionales de agendado con migración drizzle; las agendadas se dibujan como bloques horarios con estilo distinto.
4. **Overlap**: algoritmo configurable (columnas simples vs top-to-bottom óptimo).
5. Navegación de semana conservada: anterior / siguiente / hoy.

## Constraints (no tocar)

- Solo: `src/modules/calendar`, `src/modules/tasks` (agendado), `src/db`, `src/app/calendar`, `drizzle/`.
- No tocar otros módulos (`ai`, `finance`, `kitchen`) ni `AGENTS.md`.
- Repo Next.js con breaking changes: leer `node_modules/next/dist/docs/` antes de usar APIs de Next (bloque `nextjs-agent-rules` intacto).
- Mensajes de commit convencionales (`feat:`, `refactor:`, `test:`, `docs:`).

## Aceptación (Definition of Done)

- `npm test` en verde, incluyendo tests nuevos: layout de horas, altura por duración, overlap (ambos algoritmos), cruce de medianoche, agendado de tareas.
- `npm run lint` sin errores y build/typecheck OK.
- Tarjeta del worktree en `in-review` con comment-resumen.
- **Regla de oro: el agente nunca sube al remoto; el humano lo hace.**