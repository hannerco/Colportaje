# Guía paso a paso para el dueño: cuentas y despliegue

Esta guía está pensada para alguien que **no conoce Supabase ni Vercel**. Sigue los pasos en orden y marca cada casilla. Los nombres de los botones pueden cambiar un poco con el tiempo; si algo no coincide, busca el equivalente o pide ayuda mostrando una captura.

> **Reglas de oro**
> 1. **Nunca pegues claves, contraseñas ni la "service_role" en el chat, en el repositorio ni en capturas.** Se guardan solo en un gestor de contraseñas y en las pantallas de variables de entorno.
> 2. Activa **verificación en dos pasos (2FA)** en las tres cuentas (GitHub, Supabase, Vercel).
> 3. Usa un **correo nuevo dedicado** a este proyecto (por ejemplo uno de Gmail solo para Colportor) y guarda el **código de recuperación**.
> 4. Cuando un paso diga "ejecuta en terminal", puedes hacerlo escribiendo `! ` antes del comando dentro de Claude Code (por ejemplo `! supabase login`).

## Qué vas a tener al final
| Cosa | Para qué |
|---|---|
| Repositorio de GitHub `Colportaje` | Guardar el código |
| Cuenta de Supabase con 2 proyectos: `colportor-prod` y `colportor-staging` | Base de datos, usuarios y fotos |
| Cuenta de Vercel con un proyecto | Publicar la web (la dirección que abren los colportores) |

---

## PARTE 0 — Antes de empezar
- [ ] Crea (o elige) el **correo dedicado** del proyecto.
- [ ] Instala un **gestor de contraseñas** (el del navegador sirve; mejor Bitwarden o 1Password) y crea ahí una carpeta "Colportor".
- [ ] Ten el celular a mano para el 2FA.

---

## PARTE 1 — GitHub: el repositorio (SG-03)
El repositorio ya existe: `https://github.com/hannerco/Colportaje` (cuenta `hannerco`) y la carpeta local ya está conectada a él.

1. Abre `https://github.com/hannerco/Colportaje`. Debes ver los archivos y `docs/`.
2. **Antes de subir código, claves o datos reales**, hazlo privado: *Settings* → *General* → *Danger Zone* → *Change visibility* → *Make private*.
- [ ] El repositorio existe y (antes de subir código) es **privado** (candado junto al nombre).

---

## PARTE 2 — Supabase (base de datos, usuarios y fotos)

### 2.1 Crear la cuenta nueva
1. Entra a **supabase.com** y pulsa **Sign in** → **Sign up** (o "Start your project").
2. Regístrate con el **correo dedicado** (o con GitHub si prefieres usar esa identidad). Revisa tu correo y confirma.
3. Si te pide crear una **Organization**: nombre `Colportor`, tipo **Personal**, plan **Free**. Pulsa **Create organization**.
- [ ] Estás dentro del panel de Supabase y ves la organización "Colportor".
- [ ] Activa 2FA: icono de tu perfil (abajo a la izquierda o arriba a la derecha) → **Account preferences** → **Security** (o similar) → activar verificación en dos pasos.

### 2.2 Crear el proyecto de producción
1. Pulsa **New project**.
2. Rellena:
   - **Organization:** Colportor.
   - **Project name:** `colportor-prod`.
   - **Database password:** pulsa **Generate a password**, **cópiala y guárdala en el gestor de contraseñas** (después no se vuelve a mostrar completa).
   - **Region:** busca **East US (North Virginia)**. **No elijas São Paulo** (medimos y desde Medellín es más lento).
   - **Pricing plan:** Free.
3. Pulsa **Create new project** y espera 1–3 minutos.
- [ ] El proyecto `colportor-prod` está en estado activo (punto verde).

### 2.3 Crear el proyecto de pruebas
Repite 2.2 con el nombre **`colportor-staging`** y **otra contraseña** de base de datos (guárdala también).
- [ ] Hay dos proyectos en la lista de proyectos de la organización.

### 2.4 Dónde está cada dato (solo para que sepas encontrarlos)
Dentro de un proyecto, en el menú lateral izquierdo (iconos):
- **Project Settings** (engranaje, abajo): 
  - **General** → **Reference ID** (una cadena corta de letras: es el "project ref").
  - **API** (o **API Keys**) → **Project URL** (empieza por `https://` y termina en `.supabase.co`) y las claves: la **anon / publishable key** (pública, protegida por reglas) y la **service_role / secret key** (**secretísima**: da acceso total, nunca al navegador, nunca al chat).
- **Authentication** (icono de persona): **Users** (lista de usuarios), **Sign In / Providers** (formas de entrar), **URL Configuration**, **Rate Limits**.
- **Storage** (icono de cubo): buckets de archivos (fotos).
- **Table Editor** (icono de tabla) y **SQL Editor**: ver y consultar datos (el agente los gestiona por migraciones; tú casi no los usarás).

### 2.5 Desactivar el registro público (muy importante) — en **ambos** proyectos
1. Entra al proyecto → **Authentication** → **Sign In / Providers** (a veces **Providers**) → **Email**.
2. Desactiva **Allow new users to sign up** (o "Enable sign ups"). Guarda.
- [ ] En prod y en staging el registro público está **desactivado**. (Así nadie puede crear cuenta sin invitación.)

### 2.6 Conectar la terminal a Supabase
1. En la terminal: `! supabase login`
2. Se abre el navegador: **inicia sesión con la cuenta nueva** y aprueba.
3. Prueba: `! supabase projects list` → deben salir `colportor-prod` y `colportor-staging`.
- [ ] El comando lista los dos proyectos.

> El agente se encarga luego de enlazar el proyecto, crear tablas, reglas de seguridad y buckets con migraciones. **Tú no tienes que tocar la base de datos a mano.**

### 2.7 Guardar los datos que el agente necesitará (sin pegarlos en el chat)
Crea el archivo `.env.local` en la carpeta del proyecto (copiando `.env.example`) y rellena **tú** los valores de **staging** primero (URL, anon key, service_role, contraseña de la BD, project ref). Ese archivo **no se sube a GitHub** (está en `.gitignore`).
- [ ] `.env.local` existe y **no** aparece en `git status`.

---

## PARTE 3 — Vercel (publicar la web)

### 3.1 Crear la cuenta nueva
1. Entra a **vercel.com** → **Sign Up**.
2. Elige el plan **Hobby** (gratis). Acepta que es **uso personal/no comercial**.
3. Regístrate con **Continue with GitHub** (autoriza a Vercel) o con el correo dedicado.
4. Activa 2FA: **Settings → Authentication** (o **Security**).
- [ ] Estás en el panel de Vercel (Dashboard).

### 3.2 Dar acceso al repositorio
1. En Vercel: **Add New…** → **Project**.
2. Pulsa **Adjust GitHub App Permissions** (o **Configure**) y, en GitHub, elige **Only select repositories** → marca **colportor** → **Save**.
- [ ] Vercel ve el repositorio `Colportaje`.

### 3.3 Importar el proyecto
> Este paso se hace **cuando ya exista la primera versión de la app** (hasta entonces no hay nada que publicar). El agente te avisa.
1. **Add New…** → **Project** → junto a `Colportaje` pulsa **Import**.
2. **Framework Preset:** Next.js (lo detecta solo). No cambies nada más.
3. Abre **Environment Variables** y agrega (nombre → valor), copiando los valores desde Supabase (Project Settings → API) de **producción**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` → márcala como **Sensitive** (si ves la casilla).
4. Pulsa **Deploy**. Cuando termine, Vercel te da una dirección tipo `https://colportor-xxxx.vercel.app`.
- [ ] La dirección abre la app (o una pantalla de login).

### 3.4 Comprobar la región
1. En el proyecto de Vercel → **Settings** → **Functions** → **Function Region**.
2. Debe decir **Washington, D.C., USA (East) – iad1** (es la por defecto, la más cercana a Virginia). Si no, cámbiala y vuelve a desplegar.
- [ ] Región iad1.

### 3.5 Decirle a Supabase cuál es la dirección de la web
1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** pega la dirección de Vercel. En **Redirect URLs** agrega la misma dirección con `/**` al final (por ejemplo `https://colportor-xxxx.vercel.app/**`).
3. Repite en staging con la URL de preview que indique el agente.
- [ ] Guardado en ambos proyectos.

### 3.6 Conectar la terminal a Vercel
1. `! vercel login` → se abre el navegador → inicia sesión con la cuenta **nueva** de Vercel.
2. `! vercel whoami` debe mostrar tu usuario nuevo.
- [ ] `vercel whoami` responde con la cuenta nueva.

---

## PARTE 4 — Después de publicar (para el agente y para ti)
1. **Crear tu usuario admin** (única vez): el agente prepara un script; tú solo inicias sesión con tu correo y la contraseña que elijas.
2. **Cargar el catálogo** de Títulos con el script (tú le entregas la lista con nombre, autor, precios y categoría; ver `01-negocio/BUSINESS-RULES.md` §3).
3. **Invitar colportores**: desde la app → modo administrador → **Admin → Usuarios → Invitar** → escribe el correo → **Copiar enlace** → envíalo por **WhatsApp**. La persona abre el enlace y crea su contraseña. **No tocas Supabase para esto.**
4. **Instalar la app en el celular**: abre la dirección en el navegador → menú → **Agregar a pantalla de inicio** (Android: Chrome; iPhone: Safari → Compartir → "Agregar a inicio").

---

## PARTE 5 — Mantenimiento mínimo
| Cuándo | Qué hacer |
|---|---|
| Cada semana | Mirar que el panel de Supabase no muestre **Paused** (el keep-alive lo evita, pero revisa) |
| Cada mes | Revisar el uso: Supabase → **Reports** (almacenamiento) y que el backup se esté generando (pestaña **Actions** de GitHub) |
| Si algo falla | Anota qué pantalla y qué mensaje; pide ayuda con una captura (sin claves visibles) |
| Cuando la app maneje dinero real de varios colportores | Considera **Supabase Pro (~25 USD/mes)**: copias diarias y sin pausa (SG-06) |

## Lista final (marca todo antes de abrir a los demás)
- [ ] 2FA activo en GitHub, Supabase y Vercel; códigos de recuperación guardados.
- [ ] Registro público desactivado en prod y staging.
- [ ] Región us-east-1 (Supabase) e iad1 (Vercel).
- [ ] Variables de entorno cargadas solo en Vercel y `.env.local` (nunca en el repositorio).
- [ ] Backup ejecutado y restauración probada (lo hace el agente; tú verificas que existe).
- [ ] Probaste la app instalada en tu celular, con y sin internet (sin internet solo consultas).
