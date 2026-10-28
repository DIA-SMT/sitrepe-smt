-- =============================================================================
-- DATOS DE DEMOSTRACIÓN — NO CARGAR EN PRODUCCIÓN.
-- Genera técnicos, memorias técnicas, establecimientos, 12 meses de servicios,
-- pagos, fiscalización y contenidos del portal para mostrar la plataforma.
-- Los nombres de personas, establecimientos y los registros de productos son
-- ficticios. Requiere haber cargado seed.sql.
-- =============================================================================

create or replace function pg_temp.codigo(p_prefijo text, p_anio integer)
returns text
language plpgsql
as $$
declare
  v integer;
begin
  insert into public.contadores as c (prefijo, anio, ultimo) values (p_prefijo, p_anio, 1)
  on conflict (prefijo, anio) do update set ultimo = c.ultimo + 1
  returning c.ultimo into v;
  return p_prefijo || '-' || p_anio || '-' || lpad(v::text, 6, '0');
end;
$$;

create or replace function pg_temp.pick(p text[])
returns text
language sql
volatile
as $$
  select p[1 + floor(random() * array_length(p, 1))::integer]
$$;

select setseed(0.2026);

-- Productos domisanitarios de demostración ----------------------------------
insert into public.productos (nombre_comercial, principio_activo, concentracion, clase, formulacion, organismo,
  registro_numero, categoria_toxicologica, antidoto, precauciones, plazo_reingreso_horas) values
  ('Cipermetrina 10 CE (demo)', 'Cipermetrina', '10 %', 'insecticida', 'Concentrado emulsionable', 'ANMAT', 'DEMO-0001', 'II',
   'Tratamiento sintomático', 'Usar guantes, máscara y antiparras. No aplicar sobre alimentos.', 4),
  ('Deltametrina 2.5 SC (demo)', 'Deltametrina', '2,5 %', 'insecticida', 'Suspensión concentrada', 'ANMAT', 'DEMO-0002', 'III',
   'Tratamiento sintomático', 'Ventilar el ambiente antes del reingreso.', 2),
  ('Lambdacialotrina 10 CS (demo)', 'Lambdacialotrina', '10 %', 'insecticida', 'Microencapsulado', 'ANMAT', 'DEMO-0003', 'II',
   'Tratamiento sintomático', 'Evitar el contacto con piel y ojos.', 4),
  ('Permetrina 25 CE (demo)', 'Permetrina', '25 %', 'insecticida', 'Concentrado emulsionable', 'ANMAT', 'DEMO-0004', 'III',
   'Tratamiento sintomático', 'No aplicar en presencia de personas o mascotas.', 2),
  ('Imidacloprid gel 2.15 (demo)', 'Imidacloprid', '2,15 %', 'insecticida', 'Gel cucarachicida', 'ANMAT', 'DEMO-0005', 'IV',
   'Tratamiento sintomático', 'Aplicar en grietas, fuera del alcance de niños.', 0),
  ('Fipronil gel 0.05 (demo)', 'Fipronil', '0,05 %', 'insecticida', 'Gel hormiguicida', 'ANMAT', 'DEMO-0006', 'IV',
   'Tratamiento sintomático', 'Aplicar en puntos, fuera del alcance de niños.', 0),
  ('Brodifacoum cebo en bloque (demo)', 'Brodifacoum', '0,005 %', 'rodenticida', 'Bloque parafinado', 'ANMAT', 'DEMO-0007', 'Ib',
   'Vitamina K1 (fitomenadiona)', 'Colocar en cebaderas cerradas y rotuladas.', 0),
  ('Bromadiolona pellet (demo)', 'Bromadiolona', '0,005 %', 'rodenticida', 'Pellet', 'ANMAT', 'DEMO-0008', 'Ib',
   'Vitamina K1 (fitomenadiona)', 'Usar cebaderas a prueba de niños y mascotas.', 0),
  ('Temefos 1 GR (demo)', 'Temefos', '1 %', 'larvicida', 'Granulado', 'ANMAT', 'DEMO-0009', 'III',
   'Atropina (bajo control médico)', 'Para recipientes de agua no potable. Control de Aedes aegypti.', 0),
  ('Amonio cuaternario 10 (demo)', 'Cloruro de benzalconio', '10 %', 'desinfectante', 'Solución', 'ANMAT', 'DEMO-0010', 'III',
   'Lavado con abundante agua', 'Diluir según indicación. No mezclar con otros productos.', 1),
  ('Hipoclorito de sodio 10 (demo)', 'Hipoclorito de sodio', '10 %', 'desinfectante', 'Solución', 'ANMAT', 'DEMO-0011', 'III',
   'Lavado con abundante agua', 'Usar para desinfección de tanques según protocolo.', 1),
  ('Ácido bórico cebo (demo)', 'Ácido bórico', '5 %', 'insecticida', 'Cebo en polvo', 'ANMAT', 'DEMO-0012', 'IV',
   'Tratamiento sintomático', 'Aplicar en zonas no accesibles.', 0)
on conflict (organismo, registro_numero) do nothing;

do $$
declare
  v_nombres text[] := array['María', 'Juan', 'Lucía', 'Carlos', 'Ana', 'Jorge', 'Sofía', 'Diego', 'Valeria', 'Martín',
    'Paula', 'Ricardo', 'Florencia', 'Gustavo', 'Carolina', 'Sebastián', 'Natalia', 'Pablo', 'Gabriela', 'Andrés'];
  v_apellidos text[] := array['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'Gómez', 'Díaz',
    'Sánchez', 'Romero', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Medina', 'Herrera', 'Aguirre', 'Molina'];
  v_titulos text[] := array['Ingeniero/a Agrónomo/a', 'Licenciado/a en Química', 'Técnico/a en Higiene y Seguridad',
    'Bioquímico/a', 'Licenciado/a en Ciencias Biológicas', 'Técnico/a Superior en Saneamiento Ambiental'];
  v_instituciones text[] := array['Universidad Nacional de Tucumán', 'Universidad Tecnológica Nacional - FRT',
    'Universidad del Norte Santo Tomás de Aquino', 'Instituto Superior de Saneamiento Ambiental'];
  v_calles text[] := array['24 de Septiembre', 'San Martín', 'Mendoza', 'Córdoba', 'Laprida', 'Maipú', 'Muñecas',
    'Las Piedras', 'Crisóstomo Álvarez', 'San Juan', 'Santiago del Estero', 'Junín', 'Buenos Aires', 'Catamarca',
    'La Rioja', 'Salta', 'Jujuy', 'Av. Mate de Luna', 'Av. Sarmiento', 'Av. Roca', 'Av. Belgrano', 'Av. Mitre',
    'Av. Alem', 'Av. Aconquija', 'Av. Avellaneda', 'Marco Avellaneda', '25 de Mayo', 'Rivadavia', 'Chacabuco',
    'Lamadrid', 'Congreso', 'General Paz', 'Bolívar', 'Monteagudo', 'Av. Juan B. Justo', 'Av. Independencia'];
  v_sufijos text[] := array['San Martín', 'La Esquina', 'Del Centro', 'El Sol', 'Tucumán', 'Belgrano', 'Los Andes',
    'La Ciudadela', 'El Parque', 'Aconquija', 'Norte', 'Mate de Luna', 'La Plaza', 'Independencia', 'El Bosque',
    'Las Rosas', 'Santa Lucía', 'Los Pinos', 'La Merced', 'Jardín', 'Del Sur', 'Las Heras', '9 de Julio', 'Yerba Buena'];
  v_barrios_centro text[] := array['Centro', 'Plaza Independencia', 'Barrio Sur', 'Barrio Norte'];
  v_barrios_norte text[] := array['Barrio Norte', 'Villa 9 de Julio', 'El Bosque', 'Barrio Jardín'];
  v_barrios_sur text[] := array['Barrio Sur', 'Villa Amalia', 'Ciudadela', 'Los Vázquez'];
  v_barrios_este text[] := array['Parque 9 de Julio', 'Floresta', 'Villa Alem', 'Barrio Ex Aeropuerto'];
  v_barrios_oeste text[] := array['Villa Luján', 'Barrio Oeste II', 'Marcos Paz', 'Mate de Luna'];
  r record;
  e record;
  v_tec uuid;
  v_est record;
  v_mes date;
  v_inicio date := (date_trunc('month', public.hoy()) - interval '11 months')::date;
  v_dec uuid;
  v_pago uuid;
  v_cert uuid;
  v_n integer;
  v_k integer;
  v_num integer;
  v_fecha timestamptz;
  v_tipo public.tipo_servicio;
  v_arancel public.aranceles;
  v_lat double precision;
  v_lng double precision;
  v_zona text;
  v_barrio text;
  v_prod uuid;
  i integer;
  j integer;
begin
  -- Técnicos: un representante técnico por empresa y, en algunas, un asesor más.
  for e in select id, numero_registro from public.empresas order by numero_registro loop
    for i in 1..(case when e.numero_registro % 3 = 0 then 2 else 1 end) loop
      insert into public.tecnicos (empresa_id, nombre, apellido, dni, titulo, institucion, matricula, email,
        es_representante, estado, fecha_alta)
      values (e.id, pg_temp.pick(v_nombres), pg_temp.pick(v_apellidos),
        (20000000 + floor(random() * 22000000))::integer::text, pg_temp.pick(v_titulos), pg_temp.pick(v_instituciones),
        'MP ' || (1000 + floor(random() * 8000))::integer, null, i = 1, 'aprobado',
        public.hoy() - (200 + floor(random() * 900))::integer);
    end loop;

    -- Memoria técnica: productos aprobados.
    insert into public.empresa_productos (empresa_id, producto_id, dosis, concentracion_uso, precauciones, estado, revisado_at)
    select e.id, p.id, 'Según marbete', null, null, 'aprobado', now() - interval '200 days'
    from public.productos p
    where p.registro_numero like 'DEMO-%'
      and (p.clase <> 'desinfectante' or exists (select 1 from public.empresas x where x.id = e.id and x.habilita_tanques)
           or p.registro_numero = 'DEMO-0010')
      and random() < 0.75
    on conflict do nothing;
    -- Garantiza al menos un insecticida y un rodenticida.
    insert into public.empresa_productos (empresa_id, producto_id, dosis, estado, revisado_at)
    select e.id, p.id, 'Según marbete', 'aprobado', now() - interval '200 days'
    from public.productos p where p.registro_numero in ('DEMO-0001', 'DEMO-0007', 'DEMO-0011')
    on conflict do nothing;
  end loop;

  -- Establecimientos de la ciudad.
  for r in
    select * from (values
      ('Supermercados, hipermercados y autoservicios', array['Supermercado', 'Autoservicio'], 6, true),
      ('Almacenes, despensas y minimercados', array['Almacén', 'Despensa', 'Minimercado'], 6, false),
      ('Carnicerías, pollerías y pescaderías', array['Carnicería', 'Pollería'], 5, false),
      ('Panaderías, confiterías y fábricas de pastas', array['Panadería', 'Confitería'], 5, false),
      ('Restaurantes, bares, comedores y rotiserías', array['Restaurante', 'Parrilla', 'Bar', 'Rotisería'], 10, true),
      ('Establecimientos educativos (todos los niveles)', array['Escuela', 'Colegio', 'Instituto'], 8, true),
      ('Jardines maternales y guarderías', array['Jardín Maternal'], 3, true),
      ('Hospitales, sanatorios y clínicas', array['Clínica', 'Sanatorio'], 4, true),
      ('Consultorios y centros de salud', array['Centro Médico', 'Consultorios'], 4, true),
      ('Farmacias y droguerías', array['Farmacia'], 4, false),
      ('Geriátricos y residencias de larga estadía', array['Residencia', 'Hogar'], 3, true),
      ('Hoteles, hostales y alojamientos', array['Hotel', 'Hostel'], 4, true),
      ('Edificios de propiedad horizontal (espacios comunes)', array['Edificio', 'Consorcio'], 6, true),
      ('Clubes, gimnasios y natatorios', array['Gimnasio', 'Club'], 4, true),
      ('Cines, teatros y salas de espectáculos', array['Cine', 'Teatro'], 2, true),
      ('Oficinas, bancos y reparticiones públicas', array['Oficinas', 'Banco'], 4, true),
      ('Estaciones de servicio', array['Estación de Servicio'], 2, false),
      ('Depósitos y distribuidoras de alimentos', array['Distribuidora', 'Depósito'], 3, true),
      ('Terminales y estaciones', array['Terminal'], 1, true)
    ) as t (rubro, prefijos, cantidad, tanque)
  loop
    for i in 1..r.cantidad loop
      v_lat := -26.862 + random() * 0.07;
      v_lng := -65.262 + random() * 0.085;
      v_zona := case
        when v_lat > -26.812 then 'Norte'
        when v_lat < -26.842 then 'Sur'
        when v_lng > -65.198 then 'Este'
        when v_lng < -65.238 then 'Oeste'
        else 'Centro' end;
      v_barrio := case v_zona
        when 'Norte' then pg_temp.pick(v_barrios_norte)
        when 'Sur' then pg_temp.pick(v_barrios_sur)
        when 'Este' then pg_temp.pick(v_barrios_este)
        when 'Oeste' then pg_temp.pick(v_barrios_oeste)
        else pg_temp.pick(v_barrios_centro) end;
      insert into public.establecimientos (nombre, nombre_fantasia, cuit, domicilio, barrio, zona, lat, lng, rubro_id,
        tiene_tanque, afluencia_publico, telefono)
      values (
        case when r.prefijos[1] = 'Escuela' then 'Escuela N.º ' || (10 + floor(random() * 300))::integer
             else pg_temp.pick(r.prefijos) || ' ' || pg_temp.pick(v_sufijos) end,
        null,
        (case when random() < 0.5 then '30-' else '20-' end) || lpad((10000000 + floor(random() * 89999999))::integer::text, 8, '0')
          || '-' || floor(random() * 10)::integer,
        pg_temp.pick(v_calles) || ' ' || (100 + floor(random() * 2400))::integer,
        v_barrio, v_zona, v_lat, v_lng,
        (select id from public.rubros where nombre = r.rubro),
        r.tanque and random() < 0.8,
        true,
        '381 4' || lpad(floor(random() * 999999)::integer::text, 6, '0')
      );
    end loop;
  end loop;

  -- Historial de 12 meses: declaraciones controladas, certificados timbrados y pagos verificados.
  for e in
    select emp.id, emp.numero_registro, emp.habilita_tanques
    from public.empresas emp where emp.numero_registro <= 44 order by emp.numero_registro
  loop
    v_num := 1000 + e.numero_registro * 10;
    for v_k in 0..11 loop
      v_mes := (v_inicio + make_interval(months => v_k))::date;
      foreach v_tipo in array array['fumigacion', 'tanque']::public.tipo_servicio[] loop
        continue when v_tipo = 'tanque' and (not e.habilita_tanques or random() < 0.5);
        v_n := case v_tipo when 'fumigacion' then 1 + floor(random() * 5)::integer else 1 + floor(random() * 2)::integer end;
        v_dec := null;
        v_pago := null;
        for i in 1..v_n loop
          v_fecha := ((v_mes + floor(random() * 27)::integer)::timestamp + make_interval(hours => 8 + floor(random() * 10)::integer))
                     at time zone 'America/Argentina/Tucuman';
          continue when v_fecha > now() - interval '3 days';
          select es.* into v_est from public.establecimientos es
          where (v_tipo = 'fumigacion' or es.tiene_tanque)
            and es.nombre not like '%Los Pinos%' -- algunos establecimientos nunca presentan certificado
          order by random() limit 1;
          continue when v_est.id is null;

          if v_dec is null then
            insert into public.declaraciones (codigo, empresa_id, tipo, estado, presentada_at, controlada_at, created_at)
            values (pg_temp.codigo('DJ', extract(year from v_mes)::integer), e.id, v_tipo, 'controlada',
                    v_fecha - interval '30 hours', v_fecha - interval '20 hours', v_fecha - interval '31 hours')
            returning id into v_dec;
            v_arancel := public.arancel_vigente(case v_tipo when 'fumigacion' then 'TIMBRADO_CERTIFICADO' else 'LIMPIEZA_TANQUE' end);
            insert into public.pagos (codigo, empresa_id, arancel_id, cuenta_id, cantidad, importe_unitario, importe_total,
              medio, estado, numero_operacion, fecha_pago, informado_at, verificado_at, created_at)
            values (pg_temp.codigo('LIQ', extract(year from v_mes)::integer), e.id, v_arancel.id, v_arancel.cuenta_id, 1,
              v_arancel.importe, v_arancel.importe, 'transferencia', 'pendiente',
              lpad(floor(random() * 99999999)::integer::text, 8, '0'), least((v_fecha + interval '2 days')::date, public.hoy()),
              v_fecha + interval '2 days', v_fecha + interval '3 days', v_fecha + interval '1 day')
            returning id into v_pago;
          end if;

          select t.id into v_tec from public.tecnicos t where t.empresa_id = e.id and t.estado = 'aprobado'
          order by t.es_representante desc, random() limit 1;
          v_num := v_num + 1;
          insert into public.certificados (empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, cliente_cuit,
            domicilio, rubro_id, superficie_m2, capacidad_litros, fecha_servicio, tecnico_id, laboratorio,
            analisis_bacteriologico_path, analisis_fisicoquimico_path, estado, firmado_at, firma_hash, pago_id,
            timbrado_at, sello_codigo, created_at)
          values (e.id, v_dec, v_tipo, v_num::text, v_est.id, v_est.nombre, v_est.cuit, v_est.domicilio, v_est.rubro_id,
            case when v_tipo = 'fumigacion' then (50 + floor(random() * 1500))::numeric end,
            case when v_tipo = 'tanque' then (500 + floor(random() * 10) * 500)::numeric end,
            v_fecha, v_tec,
            case when v_tipo = 'tanque' then 'Laboratorio de Aguas (demo)' end,
            case when v_tipo = 'tanque' then 'demo/analisis-bacteriologico.pdf' end,
            case when v_tipo = 'tanque' then 'demo/analisis-fisicoquimico.pdf' end,
            'timbrado', v_fecha - interval '30 hours', md5(random()::text), v_pago,
            v_fecha + interval '3 days', pg_temp.codigo('SA', extract(year from v_fecha)::integer), v_fecha - interval '31 hours')
          returning id into v_cert;

          -- Productos aplicados
          if v_tipo = 'fumigacion' then
            for j in 1..(1 + floor(random() * 2)::integer) loop
              select ep.producto_id into v_prod from public.empresa_productos ep
              join public.productos p on p.id = ep.producto_id
              where ep.empresa_id = e.id and ep.estado = 'aprobado' and p.clase <> 'desinfectante'
              order by random() limit 1;
              insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
              values (v_cert, v_prod, (50 + floor(random() * 900))::numeric, 'ml')
              on conflict do nothing;
            end loop;
          else
            insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
            select v_cert, p.id, (1 + floor(random() * 5))::numeric, 'l' from public.productos p where p.registro_numero = 'DEMO-0011';
          end if;
        end loop;

        if v_pago is not null then
          update public.pagos p
          set cantidad = x.n, importe_total = round(p.importe_unitario * x.n, 2)
          from (select count(*)::integer as n from public.certificados c where c.pago_id = v_pago) x
          where p.id = v_pago;
          -- Se marca verificado directamente (los certificados ya están timbrados con su fecha histórica).
          update public.pagos set estado = 'verificado' where id = v_pago and cantidad > 0;
        end if;
      end loop;
    end loop;
  end loop;

  -- Circuito en curso -----------------------------------------------------
  -- Declaraciones presentadas, a controlar (servicios para mañana).
  for e in select emp.id from public.empresas emp where emp.numero_registro in (3, 7, 12, 22) loop
    insert into public.declaraciones (codigo, empresa_id, tipo, estado, presentada_at, created_at)
    values (pg_temp.codigo('DJ', extract(year from public.hoy())::integer), e.id, 'fumigacion', 'presentada',
            now() - interval '2 hours', now() - interval '3 hours')
    returning id into v_dec;
    select t.id into v_tec from public.tecnicos t where t.empresa_id = e.id order by t.es_representante desc limit 1;
    for i in 1..(2 + floor(random() * 3)::integer) loop
      select es.* into v_est from public.establecimientos es order by random() limit 1;
      insert into public.certificados (empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, domicilio,
        rubro_id, superficie_m2, fecha_servicio, tecnico_id, estado, firmado_at, firma_hash)
      values (e.id, v_dec, 'fumigacion', (5000 + floor(random() * 4000))::integer::text, v_est.id, v_est.nombre,
        v_est.domicilio, v_est.rubro_id, (80 + floor(random() * 800))::numeric,
        date_trunc('hour', now()) + make_interval(hours => 30 + i), v_tec, 'declarado', now() - interval '3 hours', md5(random()::text))
      returning id into v_cert;
      insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
      select v_cert, ep.producto_id, 250, 'ml' from public.empresa_productos ep
      join public.productos p on p.id = ep.producto_id
      where ep.empresa_id = e.id and p.clase = 'insecticida' limit 1;
    end loop;
  end loop;

  -- Certificados controlados pendientes de pago y pagos informados a conciliar.
  for e in select emp.id, emp.numero_registro from public.empresas emp where emp.numero_registro in (1, 5, 15, 31) loop
    insert into public.declaraciones (codigo, empresa_id, tipo, estado, presentada_at, controlada_at, created_at)
    values (pg_temp.codigo('DJ', extract(year from public.hoy())::integer), e.id, 'fumigacion', 'controlada',
            now() - interval '3 days', now() - interval '2 days', now() - interval '3 days')
    returning id into v_dec;
    select t.id into v_tec from public.tecnicos t where t.empresa_id = e.id order by t.es_representante desc limit 1;
    v_pago := null;
    if e.numero_registro in (15, 31) then
      v_arancel := public.arancel_vigente('TIMBRADO_CERTIFICADO');
      insert into public.pagos (codigo, empresa_id, arancel_id, cuenta_id, cantidad, importe_unitario, importe_total, medio,
        estado, numero_operacion, fecha_pago, informado_at, created_at)
      values (pg_temp.codigo('LIQ', extract(year from public.hoy())::integer), e.id, v_arancel.id, v_arancel.cuenta_id, 3,
        v_arancel.importe, v_arancel.importe * 3, 'transferencia', 'informado',
        lpad(floor(random() * 99999999)::integer::text, 8, '0'), public.hoy() - 1, now() - interval '20 hours', now() - interval '1 day')
      returning id into v_pago;
    end if;
    for i in 1..3 loop
      select es.* into v_est from public.establecimientos es order by random() limit 1;
      insert into public.certificados (empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, domicilio,
        rubro_id, superficie_m2, fecha_servicio, tecnico_id, estado, firmado_at, firma_hash, pago_id)
      values (e.id, v_dec, 'fumigacion', (9000 + e.numero_registro * 10 + i)::text, v_est.id, v_est.nombre, v_est.domicilio,
        v_est.rubro_id, (80 + floor(random() * 800))::numeric, now() - interval '1 day' + make_interval(hours => i),
        v_tec, 'controlado', now() - interval '3 days', md5(random()::text), v_pago)
      returning id into v_cert;
      insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
      select v_cert, ep.producto_id, 300, 'ml' from public.empresa_productos ep
      join public.productos p on p.id = ep.producto_id
      where ep.empresa_id = e.id and p.clase = 'insecticida' limit 1;
    end loop;
  end loop;

  -- Empresa demo N.º 1: una declaración observada y un borrador sin firmar.
  select emp.id into e from public.empresas emp where emp.numero_registro = 1;
  select t.id into v_tec from public.tecnicos t
  join public.empresas emp on emp.id = t.empresa_id where emp.numero_registro = 1 order by t.es_representante desc limit 1;
  insert into public.declaraciones (codigo, empresa_id, tipo, estado, presentada_at, controlada_at, observaciones, created_at)
  select pg_temp.codigo('DJ', extract(year from public.hoy())::integer), emp.id, 'fumigacion', 'observada',
         now() - interval '5 hours', now() - interval '1 hour', 'Revisar el rubro declarado en el certificado observado.',
         now() - interval '6 hours'
  from public.empresas emp where emp.numero_registro = 1
  returning id into v_dec;
  select es.* into v_est from public.establecimientos es where es.rubro_id is not null order by random() limit 1;
  insert into public.certificados (empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, domicilio, rubro_id,
    superficie_m2, fecha_servicio, tecnico_id, estado, firmado_at, firma_hash, observaciones)
  select emp.id, v_dec, 'fumigacion', '9101', v_est.id, v_est.nombre, v_est.domicilio, v_est.rubro_id, 320,
    date_trunc('hour', now()) + interval '40 hours', v_tec, 'observado', now() - interval '5 hours', md5(random()::text),
    'El rubro no coincide con la actividad del establecimiento.'
  from public.empresas emp where emp.numero_registro = 1
  returning id into v_cert;
  insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
  select v_cert, p.id, 200, 'ml' from public.productos p where p.registro_numero = 'DEMO-0001';

  insert into public.declaraciones (codigo, empresa_id, tipo, estado, created_at)
  select pg_temp.codigo('DJ', extract(year from public.hoy())::integer), emp.id, 'fumigacion', 'borrador', now() - interval '30 minutes'
  from public.empresas emp where emp.numero_registro = 1
  returning id into v_dec;
  for i in 1..2 loop
    select es.* into v_est from public.establecimientos es order by random() limit 1;
    insert into public.certificados (empresa_id, declaracion_id, tipo, numero, establecimiento_id, cliente, domicilio, rubro_id,
      superficie_m2, fecha_servicio, tecnico_id, estado)
    select emp.id, v_dec, 'fumigacion', (9200 + i)::text, v_est.id, v_est.nombre, v_est.domicilio, v_est.rubro_id, 150 * i,
      date_trunc('hour', now()) + make_interval(hours => 36 + i), v_tec, 'borrador'
    from public.empresas emp where emp.numero_registro = 1
    returning id into v_cert;
    insert into public.certificado_productos (certificado_id, producto_id, cantidad, unidad)
    select v_cert, p.id, 180, 'ml' from public.productos p where p.registro_numero = 'DEMO-0001';
  end loop;

  -- Envases vacíos
  for e in select emp.id from public.empresas emp where emp.numero_registro <= 12 loop
    insert into public.envases_movimientos (empresa_id, producto_id, tipo, cantidad, capacidad, lote, fecha, triple_lavado)
    select e.id, ep.producto_id, 'generado', (5 + floor(random() * 20))::integer, pg_temp.pick(array['1 L', '5 L', '500 ml']),
      'L' || (1000 + floor(random() * 9000))::integer, public.hoy() - (10 + floor(random() * 150))::integer, true
    from public.empresa_productos ep where ep.empresa_id = e.id limit 3;
    insert into public.envases_movimientos (empresa_id, producto_id, tipo, cantidad, fecha, triple_lavado, destinatario, manifiesto)
    select e.id, m.producto_id, 'entregado', greatest(1, m.cantidad - 3), public.hoy() - floor(random() * 9)::integer, true,
      'Centro de acopio de envases (demo)', 'MAN-' || (10000 + floor(random() * 89999))::integer
    from public.envases_movimientos m where m.empresa_id = e.id and m.tipo = 'generado' limit 2;
  end loop;
end;
$$;

-- Fiscalización: notificaciones de tanques (modelo vigente), inspecciones y actas.
insert into public.notificaciones (tipo, establecimiento_id, razon_social, domicilio, orden_trabajo, plazo, notificada_at,
  persona_notificada, dni_notificado, estado, observaciones)
select 'tanques', v.id, v.nombre, v.domicilio, 'OT-' || (500 + row_number() over ()),
  case when row_number() over () % 4 = 0 then 'cuarenta_ocho_horas_habiles' else 'cinco_dias_habiles' end::public.plazo_notificacion,
  case when row_number() over () % 5 = 0 then null else now() - make_interval(days => (row_number() over ())::integer * 2) end,
  case when row_number() over () % 5 = 0 then null else 'Encargado/a del establecimiento' end,
  case when row_number() over () % 5 = 0 then null else (25000000 + (row_number() over ()) * 13711)::text end,
  'emitida', null
from (
  select es.id, es.nombre, es.domicilio from public.v_establecimientos_estado es
  where es.estado_tanque in ('vencido', 'sin_certificado') order by es.nombre limit 10
) v;
update public.notificaciones set estado = 'cumplida' where talonario in (select talonario from public.notificaciones order by talonario limit 2);

insert into public.inspecciones (tipo, estado, empresa_id, establecimiento_id, certificado_id, fecha_programada, realizada_at,
  resultado, observaciones, checklist)
select 'muestreo_servicio', 'realizada', c.empresa_id, c.establecimiento_id, c.id, (c.fecha_servicio at time zone 'America/Argentina/Tucuman')::date,
  c.fecha_servicio + interval '1 hour',
  case when row_number() over () % 6 = 0 then 'no_conforme' else 'conforme' end::public.resultado_inspeccion,
  case when row_number() over () % 6 = 0 then 'El operario no contaba con el equipo de protección completo.' else 'Servicio realizado según lo declarado.' end,
  '{"epp": true, "productos_declarados": true, "envases_rotulados": true, "tecnico_presente": true}'::jsonb
from public.certificados c where c.estado = 'timbrado' order by c.fecha_servicio desc limit 12;

insert into public.inspecciones (tipo, estado, empresa_id, fecha_programada, realizada_at, resultado, observaciones, checklist)
select 'deposito_anual', 'realizada', e.id, public.hoy() - (30 + e.numero_registro * 3), now() - make_interval(days => 30 + e.numero_registro * 3),
  'conforme', 'Depósito con espacio exclusivo, ventilación y productos rotulados.',
  '{"carnet_sanidad": true, "oficina": true, "deposito_exclusivo": true, "mochila_pulverizadora": true, "equipo_seguridad": true}'::jsonb
from public.empresas e where e.numero_registro between 1 and 20;

insert into public.inspecciones (tipo, estado, establecimiento_id, fecha_programada, observaciones)
select 'control_vencimiento', 'programada', v.id, public.hoy() + (row_number() over () % 3)::integer, 'Generada desde la hoja de ruta.'
from (select id from public.v_hoja_ruta where prioridad = 1 order by nombre limit 6) v;

insert into public.actas (establecimiento_id, motivo, descripcion, normativa, fecha, estado)
select v.id,
  case when v.estado_fumigacion = 'vencido' then 'certificado_vencido' else 'sin_certificado' end::public.motivo_acta,
  'Al momento de la inspección no se exhibió certificado de fumigación vigente.',
  'Ord. 2681/98 Art. 1.º; Código de Faltas Ord. 758/82', now() - make_interval(days => (row_number() over ())::integer * 5),
  case when row_number() over () % 2 = 0 then 'elevada' else 'labrada' end::public.estado_acta
from (select id, estado_fumigacion from public.v_hoja_ruta where estado_fumigacion in ('vencido', 'sin_certificado') order by nombre limit 5) v;

insert into public.denuncias (tipo, descripcion, domicilio, empresa_mencionada, denunciante_nombre, denunciante_contacto, anonima, estado, respuesta)
values
  ('empresa_no_habilitada', 'Una camioneta sin identificación ofrece fumigaciones puerta a puerta en el barrio.', 'Av. Roca 1800', null, null, null, true, 'en_curso', null),
  ('envases_descartados', 'Encontramos envases de veneno para ratas tirados junto a un contenedor.', 'Lamadrid 1200', null, 'Vecino/a (demo)', 'vecino.demo@ejemplo.test', false, 'inspeccion_programada', null),
  ('establecimiento_sin_certificado', 'El comedor de la esquina no tiene a la vista el certificado de fumigación.', 'Congreso 450', null, null, null, true, 'recibida', null),
  ('servicio_mal_realizado', 'Fumigaron el edificio sin avisar a los vecinos el plazo de reingreso.', 'Av. Mate de Luna 2100', 'Empresa no identificada', 'Consorcio (demo)', '381 4000000', false, 'cerrada', 'Se intimó a la empresa a informar el plazo de reingreso en cada servicio.'),
  ('tanque_sin_limpieza', 'El agua del colegio sale turbia, creemos que no limpian el tanque.', 'Junín 900', null, null, null, true, 'recibida', null);

-- Trámites en curso
insert into public.empresas (nombre_comercial, titular, tipo_persona, cuit, email, telefono, domicilio_oficina, domicilio_deposito,
  habilitacion_comercial, habilita_fumigacion, habilita_tanques, estado)
values ('NUEVA ERA FUMIGACIONES (demo)', 'Titular demo', 'humana', '20-30111222-3', 'contacto@nuevaera.test', '381 5000000',
  'Av. Sarmiento 1500', 'Pje. Industria 300', '10777/SHN/2026', true, true, 'en_tramite');
insert into public.tramites (empresa_id, tipo, estado, datos, presentado_at)
select id, 'inscripcion', 'presentado', jsonb_build_object('nombre_comercial', nombre_comercial, 'cuit', cuit, 'habilita_tanques', true),
  now() - interval '2 days'
from public.empresas where cuit = '20-30111222-3';
insert into public.tramites (empresa_id, tipo, estado, datos, presentado_at)
select id, 'renovacion', 'presentado', jsonb_build_object('anio', 2026, 'categoria', 'B', 'libre_deuda', true), now() - interval '1 day'
from public.empresas where numero_registro = 2;

-- Avisos a empresas
insert into public.avisos (empresa_id, titulo, cuerpo, nivel) values
  (null, 'Campaña de prevención del dengue', 'Recordamos reforzar el control de larvas de Aedes aegypti en recipientes con agua y declarar los productos larvicidas utilizados.', 'alerta'),
  (null, 'Declaración Jurada Anual 2026', 'La renovación anual se presenta hasta el 31 de marzo de 2027 junto con el libre deuda (Art. 8.º, Ord. 2681/98).', 'info');

-- Portal: noticias y capacitaciones
insert into public.noticias (slug, titulo, resumen, cuerpo, categoria, publicada, publicada_at) values
  ('nueva-plataforma-de-prestadores', 'Nueva plataforma digital para prestadores de fumigación',
   'Las empresas habilitadas podrán declarar servicios, emitir certificados con código QR y pagar el timbrado en línea.',
   'La Dirección de Salud Ambiental pone en marcha la plataforma SITREPE, que reemplaza la planilla en papel por una declaración en línea. Cada certificado tendrá un código QR para que vecinos e inspectores verifiquen su validez y vencimiento.\n\nLas empresas habilitadas recibirán sus credenciales de acceso y una capacitación sobre el nuevo circuito.',
   'Institucional', true, now() - interval '10 days'),
  ('recomendaciones-al-contratar', 'Qué tener en cuenta al contratar un servicio de fumigación',
   'Verificá que la empresa esté habilitada, pedí el detalle de productos con su registro ANMAT o SENASA y consultá el plazo de reingreso.',
   'Antes de contratar, consultá el listado de empresas habilitadas. Exigí el detalle de los productos utilizados con su registro ANMAT o SENASA y la firma del responsable técnico. Consultá el plazo de reingreso al ambiente tratado, controlá que el personal use protección personal y que los envases estén rotulados, y pedí factura a nombre del titular habilitado.',
   'Recomendaciones', true, now() - interval '6 days'),
  ('tanques-cada-180-dias', 'Limpieza de tanques: obligatoria cada 180 días',
   'Los inmuebles con afluencia de público deben limpiar y desinfectar tanques y cisternas cada 180 días con empresas registradas.',
   'La Ordenanza 2004/92 (t.o. Ord. 3098/01) obliga a limpiar y desinfectar cada 180 días los tanques de reserva y cisternas de todo inmueble con afluencia de público. Solo son válidos los certificados de empresas empadronadas, acompañados del análisis bacteriológico y físico-químico del agua.',
   'Normativa', true, now() - interval '3 days'),
  ('dengue-descacharrado', 'Dengue: el control empieza en casa',
   'Eliminá recipientes que acumulen agua y colaborá con los operativos de la Municipalidad.',
   'El mosquito Aedes aegypti se cría en recipientes con agua limpia. Vaciá, cepillá y dalo vuelta: baldes, botellas, cubiertas y macetas. Los establecimientos deben mantener al día su certificado de fumigación.',
   'Salud', true, now() - interval '1 day');

insert into public.capacitaciones (titulo, descripcion, modalidad, lugar, fecha_inicio, duracion_horas, cupo, estado, destinatarios) values
  ('Uso de la plataforma SITREPE para prestadores', 'Declaración de servicios, firma digital de certificados, liquidación del timbrado y renovación anual.',
   'mixta', 'Dirección de Salud Ambiental, San Martín 1009', now() + interval '9 days', 2, 60, 'abierta', 'Titulares y asesores técnicos de empresas habilitadas'),
  ('Manejo seguro de productos domisanitarios y envases vacíos', 'Buenas prácticas, protección personal, triple lavado y trazabilidad de envases.',
   'presencial', 'Campus Educativo Ambiental "Dra. Yolanda Ortiz"', now() + interval '20 days', 3, 40, 'abierta', 'Operarios y asesores técnicos'),
  ('Control integrado de vectores: dengue y roedores', 'Estrategias de control integrado de plagas urbanas y vigilancia de Aedes aegypti.',
   'virtual', 'Plataforma virtual', now() - interval '25 days', 2, null, 'finalizada', 'Público en general');

insert into public.capacitacion_inscripciones (capacitacion_id, nombre, dni, email, empresa_texto, asistio)
select c.id, 'Participante demo ' || g, (30000000 + g * 1117)::text, 'participante' || g || '@ejemplo.test', null, g % 4 <> 0
from public.capacitaciones c, generate_series(1, 12) g
where c.estado = 'finalizada';

-- Sin auditoría de la carga de demostración.
truncate public.auditoria;
