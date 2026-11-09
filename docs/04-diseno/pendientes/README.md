# Pendientes de diseño

Qué le falta al diseño de Claude Design y en qué no coincide con los docs, a fecha **2026-11-08** (ronda 26). Sirve para atacar estos puntos cuando haya tokens de diseño, sin perderlos.

**Diseño revisado:** exportación del 05/11/2026 del lienzo `https://claude.ai/artifact/RgxEeQ7BZExzaJVcih3AZV` (`colportor-diseno.zip`). La referencia es **escritorio claro**; en Dinero manda la «Exploración elegida · Por entregar (Cobrado) y Dinero total en una sola tarjeta».

| Archivo | Para qué |
|---|---|
| `CONTRADICCIONES-DISENO-DOCS.md` | Lo que el diseño muestra distinto de los docs. **Mandan los docs** (o la decisión de la ronda 26): hay que corregir el diseño |
| `FALTA-CLIENTES.md` | Lo que el back de Clientes ya cubre (o cubrirá) y no tiene pantalla |
| `FALTA-INVENTARIO.md` | Igual para Inventario |
| `FALTA-DINERO.md` | Igual para Dinero |
| `FALTA-TRANSVERSAL.md` | Módulos completos sin diseño y elementos sin definir que cruzan módulos |

**Regla:** cuando un punto se diseñe, se marca aquí como resuelto (no se borra) con la fecha y la pantalla que lo resolvió. El back no espera a estos diseños: las historias de usuario de `07-historias-usuario/` ya cubren su lógica (ADR-0041), salvo lo que depende de un módulo sin diseño (visitas, minibooks, calendario, Hoy, Hacer inventario), que se pospone.
