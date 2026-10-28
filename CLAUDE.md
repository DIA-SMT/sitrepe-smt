@AGENTS.md

# SITREPE — Plataforma de prestadores de fumigación (Municipalidad de San Miguel de Tucumán)

Plataforma de la Dirección de Salud Ambiental para gestionar el registro de empresas de control de plagas, la
declaración anticipada de servicios (planilla 24–48 h), los certificados con QR, el timbrado (pago + sellado digital),
la fiscalización (hoja de ruta, inspecciones, notificaciones, actas) y los reportes. Requerimiento: `docs/requerimiento-informe.md` (texto del
informe preliminar del 06/10/2026). Normativa: Ord. 2681/98 (t.o. 3737/06), Ord. 2004/92 (t.o. 3098/01), Ord.
Tarifaria 5487, Proyecto SITREPE.

## Stack
- Next.js 16.4 App Router + React 19.3 + TypeScript estricto. **`cacheComponents: false`** (renderizado dinámico
  clásico: las páginas que leen la sesión son dinámicas solas; no hace falta Suspense para cookies).
  `middleware` ahora se llama **`proxy`** (`src/proxy.ts`). `params` y `searchParams` son **Promises**
  (`const { id } = await params`). Tipos globales `PageProps<"/ruta/[id]">` y `LayoutProps<"/ruta">`.
  Ante la duda, leer `node_modules/next/dist/docs/`.
- Tailwind CSS v4 (tokens en `src/app/globals.css`), radix-ui, lucide-react, motion, sonner, recharts, zod 4,
  date-fns, leaflet/react-leaflet.
- Supabase: Postgres + Auth + Storage, con RLS. Cliente tipado con `src/lib/supabase/database.types.ts`
  (generado: `npm run db:tipos`; no editar a mano).

## Idioma y tono
Todo el texto de la interfaz en español rioplatense con voseo ("Ingresá", "Cargá", "Consultá"). Nombres de
variables, funciones y archivos en español (como el resto del código). Fechas en hora de Tucumán.

## Base de datos (supabase/migrations) — es el contrato
- Tablas, vistas (`v_*`, con `security_invoker`: respetan la RLS de quien consulta) y RPC en `public`.
- **Las transiciones de estado se hacen SOLO por RPC** (las columnas de estado no tienen permiso de escritura):
  `solicitar_inscripcion(p_datos)`, `firmar_certificados(p_ids)`, `presentar_declaracion(p_declaracion)`,
  `controlar_declaracion(p_declaracion, p_observados jsonb [{certificado_id, motivo}], p_observaciones)`,
  `rechazar_declaracion`, `anular_certificado`, `generar_liquidacion(p_certificados)`,
  `informar_pago(p_pago, p_medio, p_numero_operacion, p_fecha_pago, p_comprobante_path)`, `anular_liquidacion`,
  `verificar_pago(p_pago, p_aprobar, p_observaciones)` (al aprobar, un trigger timbra los certificados y les asigna
  `sello_codigo`), `resolver_tramite(p_tramite, p_decision 'aprobar'|'observar'|'rechazar', p_observaciones,
  p_resolucion)`, `admin_actualizar_perfil`, `dashboard_kpis()`, `informe_recaudacion(p_anio, p_mes)`.
  Públicas (anon): `portal_empresas()`, `portal_empresa(p_id)`, `portal_estadisticas()`, `portal_capacitaciones()`,
  `verificar_certificado(p_codigo)`, `consultar_denuncia(p_codigo)` (código completo con sufijo aleatorio).
  Solo servidor (clave secreta, tras `permitirEnvio()` de `src/lib/limite-envio.ts`): `crear_denuncia(...)`,
  `inscribir_capacitacion(..., p_empresa_id)`, `verificar_limite_envio(...)`.
- Los errores de reglas de negocio llegan con `code = 'P0001'` y el mensaje ya redactado para el usuario
  (pueden traer varias líneas). Usar `mensajeError(error)` de `src/lib/acciones.ts`.
- Escrituras directas permitidas (por permisos de columna + RLS): ver `20261026000300_seguridad.sql`. Ej.: la empresa
  inserta `declaraciones (empresa_id, tipo, observaciones)` y `certificados` (sin estado/firma/pago), edita
  certificados solo en `borrador`/`observado`; el staff inserta inspecciones, notificaciones, actas, etc.
- El vencimiento de los certificados (`fecha_vencimiento`) lo calcula la base. Para vista previa en la UI usar
  `calcularVencimiento()` de `src/lib/domain/vencimiento.ts`.
- Si un módulo necesita un cambio de esquema, NO editar migraciones existentes: describirlo en el reporte final.
- `npm run db:validar` prueba migraciones + seeds + circuito completo en un Postgres embebido (PGlite).

## Roles
`admin` (Dirección), `control` (Control de Empresas y Timbrado), `inspector` (fiscalización), `empresa`
(administración de la empresa prestadora), `tecnico` (asesor técnico: además firma certificados).
Áreas: `/gestion/*` (staff) y `/prestador/*` (empresa/técnico). Público: portal en `/`.

## Patrones de código
- **Autorización en el servidor**, siempre: en cada página y en cada Server Action llamar a `requerirStaff([...])`,
  `requerirEmpresa()`, `requerirRol([...])` o `requerirSesion()` de `src/lib/auth.ts` (devuelven la `Sesion`:
  `{ userId, email, perfil, empresa }`). Los layouts ya exigen el área, pero las acciones deben re-verificar.
- **Lecturas**: Server Components que llaman funciones de `src/lib/data/<modulo>.ts` (`import "server-only"`),
  que usan `createClient()` de `@/lib/supabase/server`. Preferir las vistas `v_*` para datos con joins.
  Catálogos comunes en `src/lib/data/catalogos.ts` (rubros, productos, aranceles vigentes, cuentas, parámetros).
  Listados: filtros en la URL con `<FiltrosUrl>` y paginación con `rangoPagina()` + `<Paginacion>`
  (`src/components/shared/`), usando `.range(desde, hasta)` y `{ count: "exact" }`.
- **Escrituras**: Server Actions en `actions.ts` junto a la ruta (`"use server"`), validación con zod, retorno
  `EstadoAccion` (`exito()`, `fallo()`, `falloValidacion()` de `src/lib/acciones.ts`), luego `revalidatePath(...)`.
  En el cliente: `useAccion(accion)` de `src/components/shared/use-accion.ts` (muestra toasts) y `<SubmitButton>`.
- **Archivos**: `<SubirArchivo name bucket carpeta>` sube directo a Storage desde el navegador y deja la ruta en un
  input oculto; la acción guarda la ruta. Convención de rutas en `src/lib/storage.ts` (primera carpeta = id de
  empresa). Para ver archivos privados: `urlFirmada(bucket, path)`.
- **Etiquetas y colores de estados**: mapas en `src/lib/domain/etiquetas.ts` + `<EstadoBadge mapa valor>`.
- **Formatos**: `src/lib/domain/formato.ts` (`formatPesos`, `formatFecha`, `formatFechaHora`, `formatRelativo`,
  `fechaHoraLocalAISO` para inputs datetime-local, etc.), `pesosEnLetras()`, `cuitValido()`/`normalizarCuit()`.
- **Impresión**: rutas bajo `src/app/imprimir/*` con `<BarraImpresion>` + `<HojaImpresion>` (encabezado
  institucional con logo oficial) de `src/components/print/`. QR: `<CodigoQR codigo>` (Server Component).
- **UI**: componentes de `src/components/ui/*` y `src/components/shared/*` (ver `/estilo`). `PageHeader` al tope de
  cada página, `SectionCard` para secciones, `StatCard` para indicadores, `EmptyState` para listas vacías,
  `Table` dentro de `SectionCard flush`. Componentes propios de un módulo en una carpeta `_components/` de su ruta.
  Diseño institucional (azul #0066FF, celeste #2EB1FF, sol #F4DC00, noche #020626; Poppins/Inter) pero moderno:
  nada de pantallas grises y aburridas. Mobile first (los inspectores usan el celular en la calle).
- Sin `any`. Sin dependencias nuevas sin necesidad. No usar `localStorage` para datos.

## Comandos
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run db:validar` ·
`npm run db:tipos` · `npm run db:aplicar [-- --seed | --demo]` · `npm run usuarios:demo`
