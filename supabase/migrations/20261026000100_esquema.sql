-- =============================================================================
-- SITREPE · Plataforma Digital para la Gestión de Prestadores de Servicios de
-- Fumigación — Municipalidad de San Miguel de Tucumán, Dirección de Salud Ambiental
--
-- Migración 1: tipos enumerados y tablas.
-- Base normativa: Ord. 2681/98 (t.o. Ord. 3737/06), Ord. 2004/92 (t.o. Ord. 3098/01),
-- Ordenanza Tarifaria 5487 y Proyecto de Ordenanza SITREPE (Título V).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.rol_usuario as enum ('admin', 'control', 'inspector', 'empresa', 'tecnico');
create type public.estado_empresa as enum ('en_tramite', 'habilitada', 'observada', 'suspendida', 'vencida', 'baja');
create type public.tipo_servicio as enum ('fumigacion', 'tanque');
create type public.periodicidad as enum ('mensual', 'bimestral', 'trimestral', 'cuatrimestral', 'semestral', 'anual', 'unica_vez');
create type public.estado_tecnico as enum ('pendiente', 'aprobado', 'rechazado', 'baja');
create type public.estado_memoria as enum ('propuesto', 'aprobado', 'rechazado');
create type public.clase_producto as enum ('insecticida', 'rodenticida', 'desinfectante', 'larvicida', 'fungicida', 'otro');
create type public.organismo_registro as enum ('ANMAT', 'SENASA');
create type public.estado_declaracion as enum ('borrador', 'presentada', 'observada', 'controlada', 'rechazada');
create type public.estado_certificado as enum ('borrador', 'declarado', 'observado', 'controlado', 'timbrado', 'anulado');
create type public.medio_pago as enum ('transferencia', 'boleta', 'plataforma_electronica');
create type public.estado_pago as enum ('pendiente', 'informado', 'verificado', 'rechazado', 'anulado');
create type public.tipo_tramite as enum ('inscripcion', 'renovacion', 'cambio_tecnico', 'cambio_domicilio', 'alta_producto', 'baja');
create type public.estado_tramite as enum ('borrador', 'presentado', 'observado', 'aprobado', 'rechazado');
create type public.tipo_documento as enum (
  'constancia_cuit', 'dni_titular', 'titulo_tecnico', 'carnet_sanidad', 'memoria_tecnica',
  'habilitacion_comercial', 'plano_local', 'ddjj_anual', 'libre_deuda', 'seguro', 'analisis_agua', 'otro'
);
create type public.estado_documento as enum ('pendiente', 'aprobado', 'rechazado');
create type public.tipo_inspeccion as enum ('muestreo_servicio', 'control_vencimiento', 'deposito_anual', 'habilitacion', 'denuncia', 'reinspeccion');
create type public.estado_inspeccion as enum ('programada', 'realizada', 'cancelada');
create type public.resultado_inspeccion as enum ('conforme', 'no_conforme', 'ausente');
create type public.motivo_acta as enum (
  'certificado_vencido', 'sin_certificado', 'empresa_no_habilitada', 'incumplimiento_notificacion',
  'tanque_sin_limpieza', 'servicio_irregular', 'otro'
);
create type public.estado_acta as enum ('labrada', 'elevada', 'resuelta', 'anulada');
create type public.tipo_notificacion as enum ('tanques', 'fumigacion', 'documentacion', 'general');
create type public.plazo_notificacion as enum ('cinco_dias_habiles', 'cuarenta_ocho_horas_habiles');
create type public.estado_notificacion as enum ('emitida', 'notificada', 'cumplida', 'acta_labrada', 'anulada');
create type public.movimiento_envase as enum ('generado', 'entregado');
create type public.tipo_denuncia as enum (
  'empresa_no_habilitada', 'servicio_mal_realizado', 'establecimiento_sin_certificado',
  'envases_descartados', 'tanque_sin_limpieza', 'otro'
);
create type public.estado_denuncia as enum ('recibida', 'en_curso', 'inspeccion_programada', 'cerrada', 'desestimada');
create type public.estado_capacitacion as enum ('abierta', 'cerrada', 'finalizada', 'cancelada');
create type public.modalidad_capacitacion as enum ('presencial', 'virtual', 'mixta');
create type public.nivel_aviso as enum ('info', 'alerta', 'urgente');

-- -----------------------------------------------------------------------------
-- Funciones utilitarias que necesitan existir antes de las tablas
-- -----------------------------------------------------------------------------

-- Fecha "de hoy" en la zona horaria de Tucumán (la base trabaja en UTC).
create or replace function public.hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Tucuman')::date
$$;

-- Código corto y no adivinable para el QR de cada certificado (XXXX-XXXX-XXXX).
create or replace function public.generar_codigo_verificacion()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4))
  from (select replace(gen_random_uuid()::text, '-', '') as h) s
$$;

-- -----------------------------------------------------------------------------
-- Configuración y catálogos
-- -----------------------------------------------------------------------------
create table public.parametros (
  clave text primary key,
  valor jsonb not null,
  descripcion text,
  updated_at timestamptz not null default now()
);
comment on table public.parametros is 'Parámetros operativos editables (plazos de antelación, vencimiento de tanques, datos de contacto).';

create table public.feriados (
  fecha date primary key,
  descripcion text not null
);
comment on table public.feriados is 'Feriados para el cómputo de días hábiles de las notificaciones.';

create table public.contadores (
  prefijo text not null,
  anio integer not null,
  ultimo integer not null default 0,
  primary key (prefijo, anio)
);
comment on table public.contadores is 'Numeradores anuales de códigos (DJ, LIQ, SA, TRA, INS, ACTA, NOT, DEN, CAP).';

create table public.cuentas_recaudadoras (
  id integer generated by default as identity primary key,
  codigo text not null unique,
  nombre text not null,
  banco text not null,
  numero_cuenta text not null,
  cbu text not null check (cbu ~ '^\d{22}$'),
  descripcion text,
  medios_pago public.medio_pago[] not null default '{transferencia}',
  activo boolean not null default true
);
comment on table public.cuentas_recaudadoras is 'Cuentas del Banco Macro: 505 (Cuenta Bancaria Especial de Salud Ambiental) y 091 (compartida con Bromatología y Ambiente).';

create table public.aranceles (
  id integer generated by default as identity primary key,
  codigo text not null,
  concepto text not null,
  ordenanza text not null,
  articulo text not null,
  importe numeric(14, 2) not null check (importe >= 0),
  unidad text not null default 'por trámite',
  cuenta_id integer not null references public.cuentas_recaudadoras (id),
  vigente_desde date not null default public.hoy(),
  vigente_hasta date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (codigo, vigente_desde),
  check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);
comment on table public.aranceles is 'Importes parametrizables según la Ordenanza Tarifaria vigente (Art. 11.º Ord. 2681/98).';

create table public.rubros (
  id integer generated by default as identity primary key,
  grupo text not null check (grupo in (
    'Comercio', 'Cultura y esparcimiento', 'Educación', 'Residencia', 'Sanidad', 'Servicios', 'Transporte', 'No tipificada'
  )),
  nombre text not null,
  periodicidad public.periodicidad not null,
  descripcion text,
  validado boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (grupo, nombre)
);
comment on table public.rubros is 'Anexo de la Ord. 2681/98: planilla de exigencias según usos y actividades. Define la periodicidad y por ende el vencimiento de cada certificado.';
comment on column public.rubros.validado is 'Verdadero cuando el rubro fue cotejado contra el texto original del Anexo.';

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  principio_activo text not null,
  concentracion text,
  clase public.clase_producto not null,
  formulacion text,
  organismo public.organismo_registro not null,
  registro_numero text not null,
  categoria_toxicologica text check (categoria_toxicologica in ('Ia', 'Ib', 'II', 'III', 'IV')),
  antidoto text,
  precauciones text,
  plazo_reingreso_horas integer not null default 2 check (plazo_reingreso_horas >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organismo, registro_numero)
);
comment on table public.productos is 'Catálogo de productos domisanitarios con registro ANMAT o SENASA.';

-- -----------------------------------------------------------------------------
-- Registro de prestadores (Arts. 4.º a 8.º; SITREPE Arts. 5.º y 6.º)
-- -----------------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  numero_registro integer unique,
  nombre_comercial text not null check (length(trim(nombre_comercial)) > 0),
  titular text,
  tipo_persona text not null default 'humana' check (tipo_persona in ('humana', 'juridica')),
  cuit text not null unique check (cuit ~ '^\d{2}-\d{8}-\d$'),
  email text,
  telefono text,
  domicilio_oficina text,
  domicilio_deposito text,
  habilitacion_comercial text check (habilitacion_comercial is null or habilitacion_comercial ~ '^\d+/SHN/\d{4}$'),
  resolucion_dsa text unique check (resolucion_dsa is null or resolucion_dsa ~ '^\d+/DSA/\d{4}$'),
  habilita_fumigacion boolean not null default true,
  habilita_tanques boolean not null default false,
  estado public.estado_empresa not null default 'en_tramite',
  fecha_habilitacion date,
  vencimiento_habilitacion date,
  ultima_inspeccion_deposito date,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.empresas.habilitacion_comercial is 'Habilitación comercial N.º/SHN/año.';
comment on column public.empresas.resolucion_dsa is 'Resolución de autorización de la Dirección N.º/DSA/año (única por empresa).';
comment on column public.empresas.vencimiento_habilitacion is 'Renovación anual por DDJJ de Categorización y libre deuda (Art. 8.º).';

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre text not null default '',
  apellido text not null default '',
  dni text,
  telefono text,
  rol public.rol_usuario not null default 'empresa',
  empresa_id uuid references public.empresas (id) on delete set null,
  tecnico_id uuid,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.perfiles is 'Usuarios de la plataforma. Los roles de staff solo se asignan desde administración.';

create table public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null,
  apellido text not null,
  dni text not null,
  titulo text not null,
  institucion text,
  matricula text,
  email text,
  telefono text,
  es_representante boolean not null default false,
  estado public.estado_tecnico not null default 'pendiente',
  fecha_alta date,
  fecha_baja date,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, dni)
);
comment on table public.tecnicos is 'Representantes y asesores técnicos con título terciario o universitario (Art. 5.º). Firman los certificados.';

alter table public.perfiles
  add constraint perfiles_tecnico_id_fkey foreign key (tecnico_id) references public.tecnicos (id) on delete set null;

create table public.empresa_productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  dosis text,
  concentracion_uso text,
  precauciones text,
  estado public.estado_memoria not null default 'propuesto',
  revisado_por uuid references public.perfiles (id),
  revisado_at timestamptz,
  observaciones text,
  created_at timestamptz not null default now(),
  unique (empresa_id, producto_id)
);
comment on table public.empresa_productos is 'Memoria técnica: productos autorizados por empresa (Art. 5.º).';

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tecnico_id uuid references public.tecnicos (id) on delete set null,
  tramite_id uuid,
  tipo public.tipo_documento not null,
  nombre_archivo text not null,
  path text not null,
  vence date,
  estado public.estado_documento not null default 'pendiente',
  observaciones text,
  revisado_por uuid references public.perfiles (id),
  revisado_at timestamptz,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
comment on table public.documentos is 'Legajo digital. Los archivos viven en el bucket privado "documentos" bajo {empresa_id}/...';

create table public.tramites (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo public.tipo_tramite not null,
  estado public.estado_tramite not null default 'presentado',
  datos jsonb not null default '{}',
  presentado_at timestamptz default now(),
  resuelto_at timestamptz,
  resuelto_por uuid references public.perfiles (id),
  resolucion text,
  observaciones text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documentos
  add constraint documentos_tramite_id_fkey foreign key (tramite_id) references public.tramites (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Establecimientos (clientes de los servicios y sujetos de fiscalización)
-- -----------------------------------------------------------------------------
create table public.establecimientos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  nombre_fantasia text,
  cuit text check (cuit is null or cuit ~ '^\d{2}-\d{8}-\d$'),
  domicilio text not null check (length(trim(domicilio)) > 0),
  barrio text,
  zona text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  rubro_id integer references public.rubros (id),
  tiene_tanque boolean not null default false,
  afluencia_publico boolean not null default true,
  telefono text,
  email text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index establecimientos_domicilio_idx on public.establecimientos (lower(domicilio));
create index establecimientos_nombre_idx on public.establecimientos (lower(nombre));

-- -----------------------------------------------------------------------------
-- Declaración anticipada de servicios y certificados (Arts. 9.º y 10.º)
-- -----------------------------------------------------------------------------
create table public.declaraciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  empresa_id uuid not null references public.empresas (id),
  tipo public.tipo_servicio not null default 'fumigacion',
  estado public.estado_declaracion not null default 'borrador',
  presentada_at timestamptz,
  presentada_por uuid references public.perfiles (id),
  controlada_at timestamptz,
  controlada_por uuid references public.perfiles (id),
  observaciones text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.declaraciones is 'Planilla de trabajos a realizar, presentada entre 24 y 48 horas antes del servicio (Art. 9.º a).';
create index declaraciones_empresa_idx on public.declaraciones (empresa_id, created_at desc);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  empresa_id uuid references public.empresas (id),
  contribuyente text,
  contribuyente_cuit text,
  arancel_id integer not null references public.aranceles (id),
  cuenta_id integer not null references public.cuentas_recaudadoras (id),
  cantidad integer not null default 1 check (cantidad > 0),
  importe_unitario numeric(14, 2) not null check (importe_unitario >= 0),
  importe_total numeric(14, 2) not null,
  medio public.medio_pago not null default 'transferencia',
  estado public.estado_pago not null default 'pendiente',
  numero_operacion text,
  fecha_pago date,
  comprobante_path text,
  informado_at timestamptz,
  verificado_por uuid references public.perfiles (id),
  verificado_at timestamptz,
  observaciones text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (importe_total = round(importe_unitario * cantidad, 2)),
  check (empresa_id is not null or contribuyente is not null)
);
comment on table public.pagos is 'Liquidaciones de aranceles y su conciliación. Un pago de timbrado agrupa los certificados que paga.';
create index pagos_empresa_idx on public.pagos (empresa_id, created_at desc);
create index pagos_estado_idx on public.pagos (estado);

create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  declaracion_id uuid references public.declaraciones (id) on delete cascade,
  tipo public.tipo_servicio not null default 'fumigacion',
  numero text not null check (length(trim(numero)) > 0),
  establecimiento_id uuid references public.establecimientos (id),
  cliente text not null check (length(trim(cliente)) > 0),
  cliente_cuit text check (cliente_cuit is null or cliente_cuit ~ '^\d{2}-\d{8}-\d$'),
  domicilio text not null check (length(trim(domicilio)) > 0),
  rubro_id integer not null references public.rubros (id),
  superficie_m2 numeric(12, 2) check (superficie_m2 is null or superficie_m2 > 0),
  capacidad_litros numeric(12, 2) check (capacidad_litros is null or capacidad_litros > 0),
  fecha_servicio timestamptz not null,
  fecha_vencimiento date,
  tecnico_id uuid not null references public.tecnicos (id),
  plazo_reingreso_horas integer,
  laboratorio text,
  analisis_bacteriologico_path text,
  analisis_fisicoquimico_path text,
  estado public.estado_certificado not null default 'borrador',
  firmado_at timestamptz,
  firmado_por uuid references public.perfiles (id),
  firma_hash text,
  pago_id uuid references public.pagos (id) on delete set null,
  timbrado_at timestamptz,
  timbrado_por uuid references public.perfiles (id),
  sello_codigo text unique,
  codigo_verificacion text not null unique default public.generar_codigo_verificacion(),
  observaciones text,
  anulado_motivo text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo, numero),
  check (tipo <> 'fumigacion' or superficie_m2 is not null)
);
comment on table public.certificados is 'Certificado de fumigación o de limpieza de tanques. Un certificado por servicio, identificado por empresa + número (Art. 9.º b).';
comment on column public.certificados.fecha_vencimiento is 'Calculada automáticamente: periodicidad del rubro (Anexo) o 180 días para tanques (Ord. 2004/92).';
comment on column public.certificados.codigo_verificacion is 'Código del QR para la verificación pública.';
create index certificados_empresa_idx on public.certificados (empresa_id, fecha_servicio desc);
create index certificados_declaracion_idx on public.certificados (declaracion_id);
create index certificados_establecimiento_idx on public.certificados (establecimiento_id, tipo, fecha_vencimiento desc);
create index certificados_estado_idx on public.certificados (estado);
create index certificados_pago_idx on public.certificados (pago_id);

create table public.certificado_productos (
  id uuid primary key default gen_random_uuid(),
  certificado_id uuid not null references public.certificados (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad numeric(12, 3) not null check (cantidad > 0),
  unidad text not null default 'ml' check (unidad in ('ml', 'l', 'g', 'kg', 'unidades')),
  unique (certificado_id, producto_id)
);
comment on table public.certificado_productos is 'Productos y cantidades aplicadas en cada servicio.';

-- -----------------------------------------------------------------------------
-- Trazabilidad de envases vacíos (SITREPE Art. 5.º)
-- -----------------------------------------------------------------------------
create table public.envases_movimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id),
  producto_id uuid not null references public.productos (id),
  tipo public.movimiento_envase not null,
  cantidad integer not null check (cantidad > 0),
  capacidad text,
  lote text,
  fecha date not null default public.hoy(),
  triple_lavado boolean not null default false,
  destinatario text,
  manifiesto text,
  comprobante_path text,
  observaciones text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (tipo <> 'entregado' or destinatario is not null)
);
create index envases_empresa_idx on public.envases_movimientos (empresa_id, fecha desc);

-- -----------------------------------------------------------------------------
-- Fiscalización (Art. 10.º; Ord. 2004/92)
-- -----------------------------------------------------------------------------
create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  tipo public.tipo_denuncia not null,
  descripcion text not null check (length(descripcion) between 10 and 4000),
  domicilio text,
  empresa_mencionada text,
  empresa_id uuid references public.empresas (id),
  establecimiento_id uuid references public.establecimientos (id),
  denunciante_nombre text,
  denunciante_contacto text,
  anonima boolean not null default false,
  estado public.estado_denuncia not null default 'recibida',
  asignada_a uuid references public.perfiles (id),
  respuesta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inspecciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  tipo public.tipo_inspeccion not null,
  estado public.estado_inspeccion not null default 'programada',
  empresa_id uuid references public.empresas (id),
  establecimiento_id uuid references public.establecimientos (id),
  certificado_id uuid references public.certificados (id),
  denuncia_id uuid references public.denuncias (id),
  inspector_id uuid references public.perfiles (id),
  fecha_programada date not null default public.hoy(),
  realizada_at timestamptz,
  resultado public.resultado_inspeccion,
  checklist jsonb not null default '{}',
  observaciones text,
  lat double precision,
  lng double precision,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estado <> 'realizada' or resultado is not null),
  check (empresa_id is not null or establecimiento_id is not null)
);
create index inspecciones_fecha_idx on public.inspecciones (fecha_programada desc);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  ciclo integer not null default extract(year from now())::integer,
  talonario integer,
  tipo public.tipo_notificacion not null default 'tanques',
  establecimiento_id uuid references public.establecimientos (id),
  empresa_id uuid references public.empresas (id),
  razon_social text not null,
  rubro text,
  cuit text,
  domicilio text not null,
  orden_trabajo text,
  plazo public.plazo_notificacion not null default 'cinco_dias_habiles',
  notificada_at timestamptz,
  persona_notificada text,
  dni_notificado text,
  vence_at timestamptz,
  estado public.estado_notificacion not null default 'emitida',
  cumplida_at timestamptz,
  inspector_id uuid references public.perfiles (id),
  observaciones text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ciclo, talonario)
);
comment on table public.notificaciones is 'Notificaciones con plazo (modelo vigente de limpieza de tanques): 5 días hábiles, o 48 horas hábiles si el servicio se hizo y no se registró.';

create table public.actas (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  inspeccion_id uuid references public.inspecciones (id),
  notificacion_id uuid references public.notificaciones (id),
  establecimiento_id uuid references public.establecimientos (id),
  empresa_id uuid references public.empresas (id),
  motivo public.motivo_acta not null,
  descripcion text not null,
  normativa text,
  fecha timestamptz not null default now(),
  inspector_id uuid references public.perfiles (id),
  estado public.estado_acta not null default 'labrada',
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (establecimiento_id is not null or empresa_id is not null)
);
comment on table public.actas is 'Actas de infracción (Art. 2.º; Código de Faltas Ord. 758/82). Se elevan al Tribunal Municipal de Faltas.';

-- -----------------------------------------------------------------------------
-- Comunicación institucional
-- -----------------------------------------------------------------------------
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas (id) on delete cascade,
  titulo text not null,
  cuerpo text not null,
  nivel public.nivel_aviso not null default 'info',
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
comment on column public.avisos.empresa_id is 'Nulo = aviso para todas las empresas.';

create table public.avisos_lecturas (
  aviso_id uuid not null references public.avisos (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade default auth.uid(),
  leido_at timestamptz not null default now(),
  primary key (aviso_id, perfil_id)
);

create table public.noticias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  resumen text not null,
  cuerpo text not null,
  categoria text not null default 'Novedades',
  imagen_url text,
  publicada boolean not null default false,
  publicada_at timestamptz,
  autor_id uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capacitaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null,
  modalidad public.modalidad_capacitacion not null default 'presencial',
  lugar text,
  fecha_inicio timestamptz not null,
  duracion_horas numeric(5, 1) not null default 2 check (duracion_horas > 0),
  cupo integer check (cupo is null or cupo > 0),
  estado public.estado_capacitacion not null default 'abierta',
  destinatarios text,
  created_by uuid references public.perfiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.capacitacion_inscripciones (
  id uuid primary key default gen_random_uuid(),
  capacitacion_id uuid not null references public.capacitaciones (id) on delete cascade,
  nombre text not null,
  dni text not null check (dni ~ '^\d{7,8}$'),
  email text not null,
  empresa_id uuid references public.empresas (id),
  empresa_texto text,
  asistio boolean not null default false,
  certificado_codigo text unique,
  created_at timestamptz not null default now(),
  unique (capacitacion_id, dni)
);

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  created_at timestamptz not null default now()
);
create index auditoria_tabla_idx on public.auditoria (tabla, registro_id);
create index auditoria_fecha_idx on public.auditoria (created_at desc);
comment on table public.auditoria is 'Registro inmutable de altas, modificaciones y bajas en las tablas operativas.';
