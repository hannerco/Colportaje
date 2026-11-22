# HU-PAN-BASE-01 · Armazón de la app: rutas, navegación, avisos y textos

> **Iteración 1** · **Nivel:** pantalla (raíz de la app) · **Código:** `src/app/(app)/layout.tsx`, `src/ui/platform/`, `src/copy/es.ts` · **Storybook:** `Pantallas/Armazón` · **Depende de:** HU-UI-23, HU-UI-15, HU-UI-16, HU-UI-26, HU-BASE-03, HU-BASE-06 · **Diseño:** «Sistema» §05 (navegación) y Plantilla de lista · **Reglas:** BR-GEN-08, BR-GEN-10, BR-GEN-11, GLOSSARY «Procesos y pantallas», I-36, I-37, I-38

## Historia
**Como** colportor **quiero** abrir la app y moverme entre Clientes, Inventario y Dinero con la navegación del diseño, con avisos y mensajes claros, **para** empezar a usarla en el celular y en el computador.

## Alcance
- **Incluye:**
  1. **Tema y plataforma en `<html>`.** Un script mínimo, antes de pintar, fija `data-platform` con el punto de corte (I-36) y lo actualiza al cambiar el ancho. `data-theme` sigue al sistema (I-38). `PlatformProvider` en la raíz.
  2. **Grupo de rutas `(app)`** con `AppNav`. Están todos los módulos de la app (I-37 revisada, 2026-11-20): los que aún no están terminados abren «Próximamente». Admin solo para quien tiene el rol.
     - `/` redirige a `/clientes` mientras Hoy no tenga diseño.
     - Rutas del glosario y las de cada HU de pantalla: `/clientes`, `/clientes/nuevo`, `/clientes/[id]`, `/inventario`, `/inventario/agregar`, `/inventario/ejemplares`, `/inventario/ejemplares/[id]`, `/dinero`, `/dinero/abonos/[id]`, `/dinero/abibonos`, `/dinero/abibonos/[id]`.
  3. **Sesión.** Las rutas `(app)` exigen sesión (`useSession`). Sin sesión se va a `/entrar`, que espera su diseño (HU-PAN-BASE-02).
  4. `ToastProvider` en la raíz.
  5. **Franja de sin conexión.** `useConnection` (HU-BASE-06) muestra la Franja de sin conexión en toda pantalla y deja disponible `isOnline` para deshabilitar acciones que escriben, con «Necesita conexión».
  6. **`src/copy/es.ts`** con:
     - los textos fijos de los componentes (nombres de estado, «Cerrar», «Deshacer»…);
     - los textos de navegación;
     - la tabla `AppError.code` → mensaje: códigos comunes de `00-REGLAS-COMUNES.md` §3 y los propios de cada HU de back (`*_ERROR_CODES`).
     Una prueba falla si un código exportado por `features/*` no tiene mensaje.
  7. **`useAppErrorMessage(error)`**, que devuelve el texto y si se puede reintentar. Las pantallas lo usan en `Toast` («Reintentar») o en el Campo afectado (`details.field`).
  8. **Fábricas de datos de ejemplo** para las stories de pantallas (`src/test-support/fixtures/`), tipadas con los modelos de vista del back.
- **No incluye:** la pantalla de Iniciar sesión (HU-PAN-BASE-02); Hoy, Minibooks, Calendario, Hacer inventario, Ajustes y Admin.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO la ventana pasa de 800 a 700 px de ancho, la app DEBE cambiar de barra lateral a barra inferior sin recargar.
- **R2.** CUANDO no hay conexión, toda pantalla DEBE mostrar la Franja de sin conexión y toda acción que escribe DEBE verse deshabilitada con «Necesita conexión» (BR-GEN-08).
- **R3.** Ningún texto en español DEBE estar escrito en `features/*/screens` ni en `app/`: todo sale de `copy/es.ts`.
- **R4.** La navegación DEBE mostrar todos los módulos; los que no están terminados DEBEN abrir «Próximamente», y Admin solo DEBE verlo un administrador (I-37 revisada, BR-USR-04).

## Criterios de aceptación
- **CA-1.** **Dado** un celular de 390 px, **cuando** abro `/`, **entonces** llego a `/clientes` con la barra inferior (Clientes, Inventario, Más) y, en «Más», solo Dinero.
- **CA-2.** **Dado** un computador de 1440 px, **entonces** veo la barra lateral con Nuevo cliente, el grupo Trabajo (Clientes, Inventario) y el grupo Dinero (Dinero).
- **CA-3.** **Dado** el sistema en modo oscuro, **cuando** abro la app, **entonces** se ve en oscuro desde el primer pintado, sin destello claro.
- **CA-4.** **Dado** que corto la red, **entonces** aparece «Sin conexión: puedes consultar, pero no registrar» y «Nuevo cliente» queda deshabilitado.
- **CA-5.** **Dado** un código de error nuevo exportado por una feature sin texto en `copy/es.ts`, **cuando** corro `pnpm test`, **entonces** la prueba falla y nombra el código.

## Cambios por iteración
- **2026-11-20 (a pedido del dueño):** la navegación muestra **todos** los módulos, estén listos o no: Hoy, Clientes, Inventario, Minibooks, Calendario, Dinero, Hacer inventario y Ajustes (Admin solo con el rol admin). Hoy, Minibooks, Calendario, Hacer inventario, Ajustes y Admin tienen su ruta (`/hoy`, `/minibooks`, `/calendario`, `/hacer-inventario`, `/ajustes`, `/admin`) con la pantalla «Próximamente» dentro del armazón (`ComingSoonRoute`, «<Módulo> todavía no está listo. Lo verás aquí cuando esté terminado.»). La lista `COMING_SOON` dice cuáles son; al terminar un módulo se quita de ella y su ruta pasa a su pantalla. En móvil la barra inferior queda con Hoy, Clientes, Inventario y Más.
- **2026-11-20:** Ajustes deja «Próximamente» con su versión mínima (formato de hora y cerrar sesión; DECISION-LOG 103).
- **2026-11-22 (#28):** el armazón de escritorio usa la misma tarjeta de contenido que la Plantilla de lista.

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E de HU-BASE-06 (lectura sin conexión) corre en Playwright en móvil y escritorio.
