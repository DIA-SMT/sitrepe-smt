-- =============================================================================
-- Datos iniciales (catálogos y padrón oficial). Seguro para producción.
-- Fuente: Informe preliminar de la Dirección de Salud Ambiental (06/10/2026).
-- =============================================================================

-- Parámetros operativos ------------------------------------------------------
insert into public.parametros (clave, valor, descripcion) values
  ('antelacion_min_horas', '24', 'Antelación mínima para declarar un servicio (Art. 9.º a, Ord. 2681/98)'),
  ('antelacion_max_horas', '48', 'Antelación máxima para declarar un servicio (Art. 9.º a, Ord. 2681/98)'),
  ('vencimiento_tanque_dias', '180', 'Vigencia del certificado de limpieza de tanques (Ord. 2004/92 t.o. Ord. 3098/01)'),
  ('dias_alerta_vencimiento', '15', 'Días previos al vencimiento en que un certificado figura "por vencer"'),
  ('email_contacto', '"saludambiental@smt.gob.ar"', 'Correo de la Dirección de Salud Ambiental'),
  ('domicilio_atencion', '"San Martín N.º 1009"', 'Lugar de presentación'),
  ('horario_atencion', '"Lunes a viernes de 8:00 a 13:00"', 'Horario de atención al público')
on conflict (clave) do nothing;

-- Cuentas recaudadoras (Banco Macro) ----------------------------------------
insert into public.cuentas_recaudadoras (id, codigo, nombre, banco, numero_cuenta, cbu, descripcion, medios_pago) values
  (1, '505', 'Cuenta Bancaria Especial de Salud Ambiental', 'Banco Macro', '3-600-0020002655-0', '2850600130002000265505',
   'Timbrado de certificados y limpieza de tanques. Se paga por transferencia bancaria.', '{transferencia}'),
  (2, '091', 'Cuenta compartida Salud Ambiental, Bromatología y Ambiente', 'Banco Macro', '360000200031709', '2850600130002000317091',
   'Se paga con boleta generada con CUIT/CUIL en el sistema de Rentas o por plataformas electrónicas (Rapipago, Pago Fácil, billeteras virtuales).',
   '{boleta,plataforma_electronica}')
on conflict (codigo) do nothing;
select setval(pg_get_serial_sequence('public.cuentas_recaudadoras', 'id'), (select max(id) from public.cuentas_recaudadoras));

-- Aranceles (Ordenanza Tarifaria N.º 5487) -----------------------------------
insert into public.aranceles (codigo, concepto, ordenanza, articulo, importe, unidad, cuenta_id, vigente_desde) values
  ('TIMBRADO_CERTIFICADO', 'Timbrado de certificados de fumigación', '5487/26', 'Art. 40, inc. b), apartado 4', 5497, 'por certificado', 1, '2026-01-01'),
  ('LIMPIEZA_TANQUE', 'Limpieza de tanque', '5487/26', 'Art. 40, inc. e), apartado 1', 8763, 'por certificado', 1, '2026-01-01'),
  ('REINSPECCION', 'Reinspección de negocios', '5487/25', 'Art. 30, inc. 2)', 6900, 'por trámite', 2, '2025-01-01'),
  ('NOTAS_VARIAS', 'Notas varias', '5487/25', 'Art. 30, inc. 3)', 6900, 'por nota', 2, '2025-01-01'),
  ('PLAZO_REFACCIONES', 'Plazo por refacciones (30 días)', '5487/25', 'Art. 32, inc. 5)', 37260, 'por trámite', 2, '2025-01-01'),
  ('TRANSPORTE_CAMIONES', 'Permiso para transporte – camiones (food truck)', '5487/25', 'Art. 37, inc. 4), apartado 1', 65711, 'por permiso', 2, '2025-01-01'),
  ('TRANSPORTE_CAMIONETAS', 'Permiso para transporte – camionetas', '5487/25', 'Art. 37, inc. 4), apartado 2', 82156, 'por permiso', 2, '2025-01-01')
on conflict (codigo, vigente_desde) do nothing;

-- Feriados (a validar con el calendario oficial de cada año) ----------------
insert into public.feriados (fecha, descripcion) values
  ('2026-01-01', 'Año Nuevo'),
  ('2026-02-16', 'Carnaval'),
  ('2026-02-17', 'Carnaval'),
  ('2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajador'),
  ('2026-05-25', 'Día de la Revolución de Mayo'),
  ('2026-06-15', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes (trasladable)'),
  ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'),
  ('2026-09-24', 'Batalla de Tucumán (feriado provincial)'),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural'),
  ('2026-11-23', 'Día de la Soberanía Nacional (trasladable)'),
  ('2026-12-08', 'Inmaculada Concepción de María'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2027-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2027-05-01', 'Día del Trabajador'),
  ('2027-05-25', 'Día de la Revolución de Mayo'),
  ('2027-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
  ('2027-07-09', 'Día de la Independencia'),
  ('2027-09-24', 'Batalla de Tucumán (feriado provincial)'),
  ('2027-12-08', 'Inmaculada Concepción de María'),
  ('2027-12-25', 'Navidad')
on conflict (fecha) do nothing;

-- Anexo de la Ord. 2681/98: planilla de exigencias según usos y actividades.
-- PROVISORIO: el informe indica que el Anexo debe transcribirse completo y
-- validarse contra el original antes de usarse. Solo están confirmados:
-- Sanidad y Educación mensuales; demoliciones y obras en construcción por única vez.
-- Los demás rubros y periodicidades son una propuesta inicial (validado = false).
insert into public.rubros (grupo, nombre, periodicidad, validado, descripcion) values
  ('Comercio', 'Supermercados, hipermercados y autoservicios', 'mensual', false, null),
  ('Comercio', 'Almacenes, despensas y minimercados', 'bimestral', false, null),
  ('Comercio', 'Carnicerías, pollerías y pescaderías', 'mensual', false, null),
  ('Comercio', 'Panaderías, confiterías y fábricas de pastas', 'mensual', false, null),
  ('Comercio', 'Restaurantes, bares, comedores y rotiserías', 'mensual', false, null),
  ('Comercio', 'Verdulerías y fruterías', 'bimestral', false, null),
  ('Comercio', 'Depósitos y distribuidoras de alimentos', 'mensual', false, null),
  ('Comercio', 'Kioscos y drugstores', 'trimestral', false, null),
  ('Comercio', 'Comercios no alimenticios y galerías', 'trimestral', false, null),
  ('Comercio', 'Mercados y ferias', 'mensual', false, null),
  ('Cultura y esparcimiento', 'Cines, teatros y salas de espectáculos', 'bimestral', false, null),
  ('Cultura y esparcimiento', 'Salones de fiestas y eventos', 'bimestral', false, null),
  ('Cultura y esparcimiento', 'Clubes, gimnasios y natatorios', 'bimestral', false, null),
  ('Cultura y esparcimiento', 'Locales bailables', 'mensual', false, null),
  ('Cultura y esparcimiento', 'Bibliotecas, museos y centros culturales', 'trimestral', false, null),
  ('Educación', 'Establecimientos educativos (todos los niveles)', 'mensual', true, 'Confirmado en el informe: Educación es mensual.'),
  ('Educación', 'Jardines maternales y guarderías', 'mensual', true, 'Confirmado en el informe: Educación es mensual.'),
  ('Educación', 'Comedores escolares', 'mensual', true, 'Confirmado en el informe: Educación es mensual.'),
  ('Residencia', 'Hoteles, hostales y alojamientos', 'bimestral', false, null),
  ('Residencia', 'Edificios de propiedad horizontal (espacios comunes)', 'trimestral', false, null),
  ('Residencia', 'Pensiones y residencias estudiantiles', 'bimestral', false, null),
  ('Residencia', 'Viviendas particulares (casos especiales)', 'anual', false, null),
  ('Sanidad', 'Hospitales, sanatorios y clínicas', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Sanidad', 'Consultorios y centros de salud', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Sanidad', 'Laboratorios de análisis clínicos', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Sanidad', 'Farmacias y droguerías', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Sanidad', 'Geriátricos y residencias de larga estadía', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Sanidad', 'Veterinarias', 'mensual', true, 'Confirmado en el informe: Sanidad es mensual.'),
  ('Servicios', 'Oficinas, bancos y reparticiones públicas', 'trimestral', false, null),
  ('Servicios', 'Estaciones de servicio', 'trimestral', false, null),
  ('Servicios', 'Peluquerías y centros de estética', 'bimestral', false, null),
  ('Servicios', 'Lavaderos y tintorerías', 'trimestral', false, null),
  ('Servicios', 'Industrias y talleres', 'bimestral', false, null),
  ('Servicios', 'Depósitos generales y galpones', 'trimestral', false, null),
  ('Servicios', 'Demoliciones y obras en construcción (al iniciar los trabajos)', 'unica_vez', true, 'Confirmado en el informe: servicio por única vez al iniciar los trabajos.'),
  ('Transporte', 'Ómnibus y transporte urbano de pasajeros', 'mensual', false, null),
  ('Transporte', 'Transporte escolar', 'mensual', false, null),
  ('Transporte', 'Taxis y remises', 'trimestral', false, null),
  ('Transporte', 'Transporte de alimentos', 'mensual', false, null),
  ('Transporte', 'Terminales y estaciones', 'mensual', false, null)
on conflict (grupo, nombre) do nothing;

-- Registro de empresas habilitadas al 17/07/2026 (Anexo II del informe) ------
-- F = fumigación y desinfección · T = limpieza de tanques.
-- Inconsistencias del listado publicado, regularizadas o señaladas:
--  * Res. 070/DSA/2026 figura en SANI-TEC (N.º 33) y FERRARO (N.º 49): la
--    resolución es única por empresa; se conserva en SANI-TEC y FERRARO queda a regularizar.
--  * PAMPA (N.º 26) figura con 100011/SHN/2026 (posible dígito de más): se carga y se observa.
--  * La empresa N.º 39 figuraba como "D&S;": se corrige a "D&S FUMIGACIONES".
insert into public.empresas (
  numero_registro, nombre_comercial, tipo_persona, cuit, habilitacion_comercial, resolucion_dsa,
  habilita_fumigacion, habilita_tanques, estado, vencimiento_habilitacion, observaciones
)
select n, nombre, case when left(cuit, 2) = '30' then 'juridica' else 'humana' end, cuit, shn, dsa,
       true, tanques, 'habilitada', date '2027-03-31', obs
from (values
  (1, 'ALEF GROUP S.A.S.', '30-71696829-0', '6442/SHN/2023', '007/DSA/2026', false, null),
  (2, 'APLICAR', '27-25212300-3', '9256/SHN/2025', '035/DSA/2026', true, null),
  (3, 'BIO-COM', '20-31127262-5', '8480/SHN/2025', '005/DSA/2026', false, null),
  (4, 'CE-GE-CE', '20-13847259-1', '10079/SHN/2026', '055/DSA/2026', true, null),
  (5, 'CHAU BICHO', '20-21334873-7', '8006/SHN/2024', '011/DSA/2026', false, null),
  (6, 'FUMIGACIONES CORREA', '20-22557495-3', '8512/SHN/2025', '021/DSA/2026', true, null),
  (7, 'DCD FUMIGACIONES', '27-04557947-1', '10027/SHN/2026', '026/DSA/2026', true, null),
  (8, 'DIAS FUMIGACIONES', '20-21332994-5', '10078/SHN/2026', '032/DSA/2026', true, null),
  (9, 'DYM FUMIGACIONES', '27-28221171-3', '10468/SHN/2026', '061/DSA/2026', false, null),
  (10, 'VyA', '27-32349858-5', '9757/SHN/2025', '014/DSA/2026', false, null),
  (11, 'ECO-AGRO', '20-34327238-4', '9512/SHN/2025', '022/DSA/2026', true, null),
  (12, 'EMECE FUMIGACIONES', '20-13848998-2', '9740/SHN/2025', '017/DSA/2026', true, null),
  (13, 'FEDE TAXI', '27-27886416-8', '10023/SHN/2025', '053/DSA/2026', false, null),
  (14, 'FUMICENTER', '20-20685446-5', '10699/SHN/2026', '074/DSA/2026', true, null),
  (15, 'FUMICOM S.R.L.', '30-71065007-8', '9569/SHN/2025', '016/DSA/2026', true, null),
  (16, 'FUMIGON', '20-22428816-7', '9835/SHN/2025', '028/DSA/2026', true, null),
  (17, 'FUMIGAN', '20-39728948-7', '9712/SHN/2025', '019/DSA/2026', true, null),
  (18, 'FUMYSER', '20-13803210-9', '9959/SHN/2025', '033/DSA/2026', true, null),
  (19, 'FUSION SERVICIOS', '20-23015702-3', '10041/SHN/2026', '065/DSA/2026', false, null),
  (20, 'GL FUMIGACIONES', '20-20179065-5', '8141/SHN/2024', '044/DSA/2026', true, null),
  (21, 'ISA', '30-70835695-2', '10109/SHN/2026', '067/DSA/2026', false, null),
  (22, 'LINEA BLANCA', '20-13628295-7', '10124/SHN/2026', '030/DSA/2026', true, null),
  (23, 'LIMPIA 2000', '20-14023676-5', '10356/SHN/2026', '043/DSA/2026', false, null),
  (24, 'LP FUMIGACIONES', '20-22263649-4', '7356/SHN/2024', '010/DSA/2026', true, null),
  (25, 'MAC-FER', '27-12508223-3', '9906/SHN/2025', '049/DSA/2026', false, null),
  (26, 'PAMPA', '20-17458633-1', '100011/SHN/2026', '052/DSA/2026', true,
      'El N.º de habilitación 100011/SHN/2026 parece tener un dígito de más: verificar con la habilitación original.'),
  (27, 'FUMIGACIONES PAZ', '20-12869851-6', '9800/SHN/2025', '034/DSA/2026', true, null),
  (28, 'PARANÁ', '20-22263284-7', '10170/SHN/2025', '051/DSA/2026', true, null),
  (29, 'RODENTIA MIP', '20-26013924-0', '9681/SHN/2025', '046/DSA/2026', true, null),
  (30, 'RYG FUMIGACIONES', '27-20759088-1', '10329/SHN/2026', '041/DSA/2026', true, null),
  (31, 'SAN FUMIGACIONES', '20-27206077-1', '9592/SHN/2025', '020/DSA/2026', true, null),
  (32, 'SAN NICOLÁS', '20-17613962-6', '9803/SHN/2025', '048/DSA/2026', true, null),
  (33, 'SANI-TEC', '20-24803771-8', '10052/SHN/2026', '070/DSA/2026', true, null),
  (34, 'SAN MIGUEL', '20-21122084-9', '9639/SHN/2025', '018/DSA/2026', false, null),
  (35, 'SCORPIO', '20-13475369-3', '9811/SHN/2025', '037/DSA/2026', false, null),
  (36, 'SE.CA.SE', '23-17494551-9', '9629/SHN/2025', '036/DSA/2026', true, null),
  (37, 'SERVIKON S.A.S.', '30-71863109-9', '7499/SHN/2024', '045/DSA/2026', true, null),
  (38, 'TUCUMÁN FUMIGACIÓN', '20-35195403-6', '8194/SHN/2025', '057/DSA/2026', true, null),
  (39, 'D&S FUMIGACIONES', '23-29003902-9', '9593/SHN/2025', '029/DSA/2026', true,
      'En el listado publicado figuraba como "D&S;" (carácter sobrante).'),
  (40, 'LIMPIO 2001', '20-14225100-1', '9705/SHN/2025', '009/DSA/2026', true, null),
  (41, 'SOL VERDE', '20-07838672-0', '7352/SHN/2024', '042/DSA/2026', false, null),
  (42, 'QUALITY', '20-21744148-0', '9867/SHN/2025', '062/DSA/2026', true, null),
  (43, 'VECTORIAL', '27-26425287-9', '7241/SHN/2024', '027/DSA/2026', true, null),
  (44, 'CIPLA', '27-22538073-8', '9889/SHN/2025', '050/DSA/2026', false, null),
  (45, 'CIUDADELA SUR', '20-20692412-9', '8487/SHN/2025', '006/DSA/2026', true, null),
  (46, 'MARCOS PAZ FUMIGACIONES', '20-25734623-5', '9708/SHN/2025', '008/DSA/2026', false, null),
  (47, 'BETA S.R.L.', '30-69714957-7', '7578/SHN/2024', '056/DSA/2026', true, null),
  (48, 'JARDÍN DEL NORTE SERVICIOS', '20-32018749-5', '10458/SHN/2026', '066/DSA/2026', false, null),
  (49, 'FERRARO FUMIGACIONES', '20-45962835-6', '10632/SHN/2026', null, true,
      'El listado publicado le asigna la Res. 070/DSA/2026, ya asignada a SANI-TEC (N.º 33): regularizar el número de resolución.')
) as t (n, nombre, cuit, shn, dsa, tanques, obs)
on conflict (cuit) do nothing;
