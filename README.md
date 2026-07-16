# Calibra

Radar de búsqueda de empleo con scoring explicable, pipeline de aplicaciones
persistente y calibración por decisión humana. Integra un flujo con Antigravity
(Gemini) para descubrir vacantes reales sin usar ninguna API de IA propia.

App **independiente**: Next.js + Drizzle sobre libSQL/SQLite. Corre local con un
archivo y se despliega en cualquier host de Node (Vercel, etc.) con Turso.

## Requisitos

- Node.js `>=22.13.0`

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Por defecto la base de datos es un archivo local
`local.db` que se crea solo en el primer arranque. No necesitas configurar nada
más para probarla.

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta según el entorno:

| Variable              | Local            | Producción                        |
| --------------------- | ---------------- | --------------------------------- |
| `DATABASE_URL`        | (vacío → `local.db`) | `libsql://tu-base.turso.io`   |
| `DATABASE_AUTH_TOKEN` | (vacío)          | token de Turso                    |

En local puedes dejar ambas sin definir.

## Despliegue (Vercel + Turso)

1. Crea una base de datos gratis en [Turso](https://turso.tech) y copia su URL
   (`libsql://...`) y un token de autenticación.
2. Importa el repositorio en [Vercel](https://vercel.com).
3. En **Settings → Environment Variables** define `DATABASE_URL` y
   `DATABASE_AUTH_TOKEN`.
4. Deploy. Vercel corre `npm run build` y sirve la app.

Sirve igual en cualquier host de Node: `npm run build && npm run start`.

## Base de datos

El esquema se crea/actualiza solo al arrancar (`ensureSchema` en
[db/index.ts](db/index.ts)). Para generar migraciones de Drizzle tras cambiar
[db/schema.ts](db/schema.ts):

```bash
npm run db:generate
```

## Perfil y filtros

El scoring se basa en el perfil definido en [lib/profile.ts](lib/profile.ts)
(nombre, skills, filtros duros y los cuatro CVs). Edita ese archivo para
adaptar la app a otra persona.

## Flujo Antigravity

- **Exportar paquete:** `Centro Antigravity → Copiar instrucciones` genera el
  contexto (perfil, filtros, CVs, decisiones previas, formato de salida) para
  pegar en Antigravity.
- **Importar lote:** el JSON que devuelve Gemini se valida, deduplica y persiste.
  Solo entra evidencia verificable (protocolo `calibra.antigravity.v1`).
- **Calibrar:** cada decisión humana (`Aplicaría` / `Descartar`, motivo, score)
  queda ligada a la vacante y se incluye en el siguiente paquete.

Sin API de IA propia, sin autoaplicar: toda aplicación requiere aprobación
humana.

## Comandos

- `npm run dev`: desarrollo local
- `npm run build`: build de producción
- `npm run start`: servidor de producción
- `npm test`: build + verificación del render
- `npm run db:generate`: genera migraciones de Drizzle
