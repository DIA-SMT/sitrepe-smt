# SITREPE · Plataforma de prestadores de fumigación

Plataforma digital de la **Dirección de Salud Ambiental** (Secretaría de Ambiente y Desarrollo Sustentable,
Municipalidad de San Miguel de Tucumán) para la gestión de prestadores de servicios de fumigación, control de
plagas urbanas y limpieza de tanques. Desarrollada por la Dirección de Inteligencia Artificial a partir del
[informe preliminar](docs/requerimiento-informe.md) del 06/10/2026.

Reemplaza el circuito presencial y en papel de **Control de Empresas** y **Timbrado** por un circuito digital de
punta a punta:

```
Empresa declara servicios (24–48 h antes) → asesor técnico firma → Control verifica la planilla
→ empresa liquida y paga el timbrado → Tesorería/Control concilia → certificado timbrado con QR
→ vecinos e inspectores verifican → hoja de ruta de fiscalización → notificaciones y actas
```

## Módulos

| Área | Qué resuelve | Normativa |
| --- | --- | --- |
| Portal público | Listado de empresas habilitadas, verificación de certificados por QR, normativa y aranceles, noticias, capacitaciones, denuncias | Arts. 9.º b, 12.º |
| Registro de prestadores | Inscripción y renovación anual, legajo digital, asesores técnicos, documentación | Arts. 4.º a 8.º · SITREPE Arts. 5.º y 6.º |
| Productos y envases | Memoria técnica por empresa, productos ANMAT/SENASA, trazabilidad de envases vacíos | Art. 5.º · SITREPE Art. 5.º |
| Declaración de servicios | Planilla en línea con validación de plazo, rubro del Anexo, firma del técnico | Art. 9.º a |
| Certificados | Numeración por empresa, vencimiento automático por rubro o 180 días (tanques), original/duplicado/triplicado digitales con QR | Arts. 1.º y 9.º b · Ord. 2004/92 |
| Pagos y timbrado | Liquidación por certificado, comprobantes, conciliación por cuenta (505 y 091), sellado digital | Arts. 9.º b y 11.º · Ord. Tarifaria 5487 |
| Fiscalización | Hoja de ruta (vencidos y no presentados), agenda para muestreo, inspecciones, notificaciones con plazos hábiles, actas | Arts. 2.º y 10.º · Ord. 2004/92 |
| Reportes | Planilla mensual por empresa, informe mensual de recaudación a Ingresos Municipales, estadísticas | Art. 10.º c |
| Administración | Aranceles parametrizables, Anexo de rubros, usuarios y roles, auditoría | — |

## Tecnología

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript + Tailwind CSS 4.
- [Supabase](https://supabase.com): Postgres con seguridad a nivel de fila (RLS), Auth y Storage.
- Las reglas de negocio críticas viven en la base (triggers y funciones RPC), así valen para cualquier cliente.

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Crear el proyecto en Supabase** (supabase.com → New project) y copiar `.env.example` como `.env.local`,
   completando `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y
   `SUPABASE_DB_URL` (Project Settings → API / Database).

3. **Aplicar las migraciones y los datos iniciales** (catálogos, aranceles, cuentas y las 49 empresas del listado
   oficial al 17/07/2026):

   ```bash
   npm run db:aplicar -- --seed
   ```

   Para un entorno de **demostración** (12 meses de servicios, establecimientos, fiscalización y contenidos
   ficticios), en lugar del comando anterior:

   ```bash
   npm run db:aplicar -- --demo
   ```

   y crear las cuentas de prueba (admin, control, inspector, empresa y técnico; todas usan la contraseña
   que definas en `USUARIOS_DEMO_CLAVE` de `.env.local`):

   ```bash
   npm run usuarios:demo
   ```

4. **Configurar Auth** en Supabase: Authentication → URL Configuration → *Site URL* con la URL de la app y
   `…/auth/confirmar` en *Redirect URLs*.

5. **Levantar la app**

   ```bash
   npm run dev
   ```

## Validación de la base sin Docker

`npm run db:validar` levanta un Postgres embebido (PGlite) con los mínimos de Supabase, aplica migraciones y seeds,
y prueba con la RLS activa el circuito completo: permisos por rol, firma del técnico, ventana de 24–48 h,
memoria técnica, liquidación, verificación del pago, timbrado, verificación pública por QR, trámites,
notificaciones en días hábiles, almacenamiento y auditoría.

`npm run db:tipos` regenera `src/lib/supabase/database.types.ts` desde las migraciones.

## Pendientes de validar con la Dirección

- **Anexo de la Ord. 2681/98**: la tabla de rubros cargada es provisoria (solo Sanidad y Educación mensuales y
  obras por única vez están confirmados). Debe transcribirse y validarse contra el original; cada rubro tiene la
  marca `validado`.
- **Texto ordenado por la Ord. 3737/06**: cotejar los artículos modificados.
- **Correo de recepción de comprobantes** (punto a confirmar del informe).
- **Inconsistencias del listado oficial**: Res. 070/DSA/2026 duplicada (SANI-TEC y FERRARO), habilitación de PAMPA
  con un dígito de más; quedaron señaladas en las observaciones de cada empresa.
- **Feriados**: cargados 2026–2027 a validar con el calendario oficial (afectan los plazos hábiles).
- **Alojamiento y respaldo**: definir con la Dirección de IA (plan de Supabase, backups, dominio).
