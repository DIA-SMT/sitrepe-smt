/**
 * Valida las migraciones y seeds de Supabase en un Postgres embebido y prueba
 * el circuito completo con la RLS activa:
 *   declaración → firma → presentación → control → liquidación → pago →
 *   verificación → timbrado → verificación pública por QR.
 *
 * Uso: npm run db:validar
 */
import { crearBase, comoServidor, comoUsuario } from "./entorno";
import type { PGlite } from "@electric-sql/pglite";

let fallas = 0;
let pruebas = 0;

async function prueba(nombre: string, fn: () => Promise<void>) {
  pruebas++;
  try {
    await fn();
    console.log(`  ✓ ${nombre}`);
  } catch (error) {
    fallas++;
    console.log(`  ✗ ${nombre}\n      ${(error as Error).message.split("\n").join("\n      ")}`);
  }
}

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

async function debeFallar(fn: () => Promise<unknown>, contiene?: string) {
  try {
    await fn();
  } catch (error) {
    const msg = (error as Error).message;
    if (contiene && !msg.toLowerCase().includes(contiene.toLowerCase())) {
      throw new Error(`Falló con un mensaje inesperado: ${msg}`);
    }
    return;
  }
  throw new Error("Se esperaba un error y la operación se completó");
}

async function uno<T = Record<string, unknown>>(db: Pick<PGlite, "query">, sql: string, params: unknown[] = []) {
  const res = await db.query<T>(sql, params);
  return res.rows[0];
}

async function crearUsuario(db: PGlite, email: string, app: Record<string, unknown>) {
  const fila = await uno<{ id: string }>(
    db,
    `insert into auth.users (email, raw_user_meta_data, raw_app_meta_data) values ($1, $2, $3) returning id`,
    [email, JSON.stringify({ nombre: email.split("@")[0], apellido: "Demo" }), JSON.stringify(app)],
  );
  return fila.id;
}

async function main() {
  console.log("Creando base embebida y aplicando migraciones + seeds…");
  const db = await crearBase({ seedDemo: true });

  const conteos = await uno<Record<string, number>>(
    db,
    `select (select count(*) from empresas)::int as empresas,
            (select count(*) from empresas where habilita_tanques)::int as tanques,
            (select count(*) from rubros)::int as rubros,
            (select count(*) from establecimientos)::int as establecimientos,
            (select count(*) from certificados)::int as certificados,
            (select count(*) from pagos where estado = 'verificado')::int as pagos_verificados,
            (select count(*) from notificaciones)::int as notificaciones,
            (select count(*) from auditoria)::int as auditoria`,
  );
  console.log("Datos cargados:", conteos);

  const empresa1 = await uno<{ id: string }>(db, `select id from empresas where numero_registro = 1`);
  const empresa2 = await uno<{ id: string }>(db, `select id from empresas where numero_registro = 2`);
  const tecnico1 = await uno<{ id: string }>(
    db,
    `select id from tecnicos where empresa_id = $1 order by es_representante desc limit 1`,
    [empresa1.id],
  );
  const admin = await crearUsuario(db, "admin@demo.test", { rol: "admin" });
  const control = await crearUsuario(db, "control@demo.test", { rol: "control" });
  const inspector = await crearUsuario(db, "inspector@demo.test", { rol: "inspector" });
  const usuarioEmpresa = await crearUsuario(db, "empresa@demo.test", { rol: "empresa", empresa_id: empresa1.id });
  const usuarioTecnico = await crearUsuario(db, "tecnico@demo.test", {
    rol: "tecnico",
    empresa_id: empresa1.id,
    tecnico_id: tecnico1.id,
  });
  const usuarioSinEmpresa = await crearUsuario(db, "nuevo@demo.test", {});

  console.log("\nSeguridad");
  await prueba("los perfiles se crean con el rol de app_metadata", async () => {
    const p = await uno<{ rol: string }>(db, `select rol from perfiles where id = $1`, [inspector]);
    afirmar(p.rol === "inspector", `rol = ${p.rol}`);
    const n = await uno<{ rol: string }>(db, `select rol from perfiles where id = $1`, [usuarioSinEmpresa]);
    afirmar(n.rol === "empresa", "un alta sin app_metadata debe ser rol empresa");
  });

  await prueba("anónimo no puede leer tablas operativas", async () => {
    await debeFallar(() => comoUsuario(db, null, (tx) => tx.query(`select * from empresas limit 1`)), "permission denied");
    await debeFallar(() => comoUsuario(db, null, (tx) => tx.query(`select * from certificados limit 1`)), "permission denied");
  });

  await prueba("anónimo accede al portal por RPC", async () => {
    const r = await comoUsuario(db, null, async (tx) => {
      const est = await uno<{ e: { empresas_habilitadas: number } }>(tx, `select portal_estadisticas() as e`);
      const lista = await tx.query(`select * from portal_empresas()`);
      const rubros = await tx.query(`select * from rubros`);
      return { est: est.e, lista: lista.rows.length, rubros: rubros.rows.length };
    });
    afirmar(r.est.empresas_habilitadas === 49, `habilitadas = ${r.est.empresas_habilitadas}`);
    afirmar(r.lista === 49, `portal_empresas = ${r.lista}`);
    afirmar(r.rubros > 30, "rubros públicos");
  });

  await prueba("una empresa solo ve sus propios certificados", async () => {
    const r = await comoUsuario(db, usuarioEmpresa, async (tx) =>
      uno<{ total: number; ajenos: number }>(
        tx,
        `select count(*)::int as total, count(*) filter (where empresa_id <> $1)::int as ajenos from v_certificados`,
        [empresa1.id],
      ),
    );
    afirmar(r.total > 0, "debería ver certificados propios");
    afirmar(r.ajenos === 0, `ve ${r.ajenos} certificados ajenos`);
  });

  await prueba("una empresa no puede escribir el estado de un certificado", async () => {
    await debeFallar(
      () =>
        comoUsuario(db, usuarioEmpresa, (tx) =>
          tx.query(`update certificados set estado = 'timbrado' where empresa_id = $1`, [empresa1.id]),
        ),
      "permission denied",
    );
  });

  await prueba("una empresa no puede crear certificados de otra empresa", async () => {
    await debeFallar(() =>
      comoUsuario(db, usuarioEmpresa, (tx) =>
        tx.query(
          `insert into certificados (empresa_id, numero, cliente, domicilio, rubro_id, superficie_m2, fecha_servicio, tecnico_id)
           values ($1, 'X-1', 'Cliente', 'Calle 1', 1, 10, now() + interval '30 hours', $2)`,
          [empresa2.id, tecnico1.id],
        ),
      ),
    );
  });

  await prueba("una empresa no puede autoaprobar técnicos ni productos", async () => {
    await debeFallar(() =>
      comoUsuario(db, usuarioEmpresa, (tx) =>
        tx.query(
          `insert into tecnicos (empresa_id, nombre, apellido, dni, titulo, estado) values ($1, 'A', 'B', '30111222', 'Lic.', 'aprobado')`,
          [empresa1.id],
        ),
      ),
    );
    await comoUsuario(db, usuarioEmpresa, (tx) =>
      tx.query(
        `insert into tecnicos (empresa_id, nombre, apellido, dni, titulo) values ($1, 'A', 'B', '30111222', 'Lic.')`,
        [empresa1.id],
      ),
    );
  });

  await prueba("staff ve todo; auditoría solo administración", async () => {
    const r = await comoUsuario(db, inspector, async (tx) =>
      uno<{ n: number }>(tx, `select count(distinct empresa_id)::int as n from certificados`),
    );
    afirmar(r.n > 10, "el inspector debería ver certificados de todas las empresas");
    const a = await comoUsuario(db, inspector, (tx) => uno<{ n: number }>(tx, `select count(*)::int as n from auditoria`));
    afirmar(a.n === 0, "el inspector no debería ver auditoría");
  });

  console.log("\nCircuito de declaración, control y timbrado");
  let declaracion = "";
  let certificado = "";
  let codigoQR = "";
  const rubro = await uno<{ id: number }>(db, `select id from rubros where periodicidad = 'mensual' limit 1`);
  const producto = await uno<{ producto_id: string }>(
    db,
    `select ep.producto_id from empresa_productos ep join productos p on p.id = ep.producto_id
     where ep.empresa_id = $1 and ep.estado = 'aprobado' and p.clase = 'insecticida' limit 1`,
    [empresa1.id],
  );
  const productoNoAprobado = await uno<{ id: string }>(
    db,
    `insert into productos (nombre_comercial, principio_activo, clase, organismo, registro_numero)
     values ('Producto sin memoria', 'X', 'insecticida', 'ANMAT', 'PRUEBA-1') returning id`,
  );

  await prueba("la empresa carga una declaración con su certificado", async () => {
    await comoUsuario(db, usuarioEmpresa, async (tx) => {
      const d = await uno<{ id: string; codigo: string }>(
        tx,
        `insert into declaraciones (empresa_id, tipo) values ($1, 'fumigacion') returning id, codigo`,
        [empresa1.id],
      );
      declaracion = d.id;
      afirmar(/^DJ-\d{4}-\d{6}$/.test(d.codigo), `código ${d.codigo}`);
      const c = await uno<{ id: string; fecha_vencimiento: string; codigo_verificacion: string }>(
        tx,
        `insert into certificados (empresa_id, declaracion_id, numero, cliente, domicilio, rubro_id, superficie_m2, fecha_servicio, tecnico_id)
         values ($1, $2, 'T-001', 'Comedor de prueba', 'San Martín 1009', $3, 120, now() + interval '30 hours', $4)
         returning id, fecha_vencimiento::text, codigo_verificacion`,
        [empresa1.id, declaracion, rubro.id, tecnico1.id],
      );
      certificado = c.id;
      codigoQR = c.codigo_verificacion;
      afirmar(c.fecha_vencimiento, "debe calcular el vencimiento");
      await tx.query(`insert into certificado_productos (certificado_id, producto_id, cantidad, unidad) values ($1, $2, 250, 'ml')`, [
        certificado,
        producto.producto_id,
      ]);
    });
  });

  await prueba("no se aceptan productos fuera de la memoria técnica", async () => {
    afirmar(productoNoAprobado, "no hay producto no aprobado para probar");
    await debeFallar(
      () =>
        comoUsuario(db, usuarioEmpresa, (tx) =>
          tx.query(`insert into certificado_productos (certificado_id, producto_id, cantidad) values ($1, $2, 1)`, [
            certificado,
            productoNoAprobado.id,
          ]),
        ),
      "memoria técnica",
    );
  });

  await prueba("no se puede presentar sin la firma del asesor técnico", async () => {
    await debeFallar(
      () => comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select presentar_declaracion($1)`, [declaracion])),
      "firma",
    );
  });

  await prueba("solo el técnico registrado puede firmar", async () => {
    await debeFallar(
      () => comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select firmar_certificados($1)`, [[certificado]])),
      "asesor técnico",
    );
    const r = await comoUsuario(db, usuarioTecnico, (tx) =>
      uno<{ n: number }>(tx, `select firmar_certificados($1) as n`, [[certificado]]),
    );
    afirmar(r.n === 1, `firmó ${r.n}`);
  });

  await prueba("editar un certificado firmado invalida la firma", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) =>
      tx.query(`update certificados set superficie_m2 = 130 where id = $1`, [certificado]),
    );
    const c = await uno<{ firma_hash: string | null }>(db, `select firma_hash from certificados where id = $1`, [certificado]);
    afirmar(c.firma_hash === null, "la firma debería haberse invalidado");
    await comoUsuario(db, usuarioTecnico, (tx) => tx.query(`select firmar_certificados($1)`, [[certificado]]));
  });

  await prueba("cambiar los productos de un certificado firmado invalida la firma", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) =>
      tx.query(`update certificado_productos set cantidad = 300 where certificado_id = $1`, [certificado]),
    );
    const c = await uno<{ firma_hash: string | null }>(db, `select firma_hash from certificados where id = $1`, [certificado]);
    afirmar(c.firma_hash === null, "la firma debería haberse invalidado");
    await comoUsuario(db, usuarioTecnico, (tx) => tx.query(`select firmar_certificados($1)`, [[certificado]]));
  });

  await prueba("no se pueden entregar más envases que los generados", async () => {
    await debeFallar(
      () =>
        comoUsuario(db, usuarioEmpresa, (tx) =>
          tx.query(
            `insert into envases_movimientos (empresa_id, producto_id, tipo, cantidad, destinatario) values ($1, $2, 'entregado', 100000, 'Operador')`,
            [empresa1.id, producto.producto_id],
          ),
        ),
      "saldo",
    );
  });

  await prueba("se rechaza un servicio fuera de la ventana de 24 a 48 h", async () => {
    const otro = await comoUsuario(db, usuarioEmpresa, async (tx) => {
      const d = await uno<{ id: string }>(tx, `insert into declaraciones (empresa_id) values ($1) returning id`, [empresa1.id]);
      const c = await uno<{ id: string }>(
        tx,
        `insert into certificados (empresa_id, declaracion_id, numero, cliente, domicilio, rubro_id, superficie_m2, fecha_servicio, tecnico_id)
         values ($1, $2, 'T-002', 'Cliente', 'Calle 2', $3, 50, now() + interval '5 hours', $4) returning id`,
        [empresa1.id, d.id, rubro.id, tecnico1.id],
      );
      await tx.query(`insert into certificado_productos (certificado_id, producto_id, cantidad) values ($1, $2, 1)`, [
        c.id,
        producto.producto_id,
      ]);
      return { d: d.id, c: c.id };
    });
    await comoUsuario(db, usuarioTecnico, (tx) => tx.query(`select firmar_certificados($1)`, [[otro.c]]));
    await debeFallar(
      () => comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select presentar_declaracion($1)`, [otro.d])),
      "entre 24 y 48 horas",
    );
  });

  await prueba("la empresa presenta la declaración", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select presentar_declaracion($1)`, [declaracion]));
    const c = await uno<{ estado: string }>(db, `select estado from certificados where id = $1`, [certificado]);
    afirmar(c.estado === "declarado", c.estado);
  });

  await prueba("una empresa no habilitada no puede presentar", async () => {
    await db.query(`update empresas set estado = 'suspendida' where id = $1`, [empresa2.id]);
    const u2 = await crearUsuario(db, "empresa2@demo.test", { rol: "empresa", empresa_id: empresa2.id });
    const d = await comoUsuario(db, u2, (tx) =>
      uno<{ id: string }>(tx, `insert into declaraciones (empresa_id) values ($1) returning id`, [empresa2.id]),
    );
    await debeFallar(() => comoUsuario(db, u2, (tx) => tx.query(`select presentar_declaracion($1)`, [d.id])), "no está habilitada");
    await db.query(`update empresas set estado = 'habilitada' where id = $1`, [empresa2.id]);
  });

  await prueba("un inspector no puede controlar declaraciones; control sí", async () => {
    await debeFallar(
      () => comoUsuario(db, inspector, (tx) => tx.query(`select controlar_declaracion($1)`, [declaracion])),
      "No autorizado",
    );
    await comoUsuario(db, control, (tx) => tx.query(`select controlar_declaracion($1, '[]'::jsonb, null)`, [declaracion]));
    const d = await uno<{ estado: string }>(db, `select estado from declaraciones where id = $1`, [declaracion]);
    afirmar(d.estado === "controlada", d.estado);
  });

  let pago = "";
  await prueba("la empresa genera la liquidación del timbrado ($5.497 por certificado)", async () => {
    const r = await comoUsuario(db, usuarioEmpresa, (tx) =>
      uno<{ id: string }>(tx, `select generar_liquidacion($1) as id`, [[certificado]]),
    );
    pago = r.id;
    const p = await uno<{ importe_total: string; cuenta: string }>(
      db,
      `select p.importe_total::text, c.codigo as cuenta from pagos p join cuentas_recaudadoras c on c.id = p.cuenta_id where p.id = $1`,
      [pago],
    );
    afirmar(p.importe_total === "5497.00", p.importe_total);
    afirmar(p.cuenta === "505", p.cuenta);
  });

  await prueba("la empresa informa la transferencia", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) =>
      tx.query(`select informar_pago($1, 'transferencia', '123456', public.hoy(), $2)`, [
        pago,
        `${empresa1.id}/${pago}/comprobante.pdf`,
      ]),
    );
  });

  await prueba("control verifica el pago y el certificado queda timbrado con sello", async () => {
    await comoUsuario(db, control, (tx) => tx.query(`select verificar_pago($1, true, null)`, [pago]));
    const c = await uno<{ estado: string; sello_codigo: string }>(
      db,
      `select estado, sello_codigo from certificados where id = $1`,
      [certificado],
    );
    afirmar(c.estado === "timbrado", c.estado);
    afirmar(/^SA-\d{4}-\d{6}$/.test(c.sello_codigo), c.sello_codigo);
  });

  await prueba("verificación pública por QR", async () => {
    const r = await comoUsuario(db, null, (tx) =>
      uno<{ v: { vigencia: string; empresa: { nombre: string }; productos: unknown[] } }>(tx, `select verificar_certificado($1) as v`, [
        codigoQR.toLowerCase(),
      ]),
    );
    afirmar(r.v?.vigencia === "vigente", JSON.stringify(r.v));
    afirmar(r.v.productos.length === 1, "debe listar los productos aplicados");
  });

  await prueba("un certificado timbrado no puede modificarse", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`update certificados set cliente = 'X' where id = $1`, [certificado]));
    const c = await uno<{ cliente: string }>(db, `select cliente from certificados where id = $1`, [certificado]);
    afirmar(c.cliente !== "X", "la empresa modificó un certificado timbrado");
    // Ni siquiera con privilegios elevados (el trigger lo impide).
    await debeFallar(() => db.query(`update certificados set cliente = 'X' where id = $1`, [certificado]), "timbrado");
  });

  console.log("\nGestión, fiscalización y portal");
  await prueba("trámite de inscripción: solicitud y aprobación", async () => {
    const empresaNueva = await comoUsuario(db, usuarioSinEmpresa, (tx) =>
      uno<{ id: string }>(tx, `select solicitar_inscripcion($1) as id`, [
        JSON.stringify({ nombre_comercial: "Prueba S.R.L.", cuit: "30-12345678-9", habilita_tanques: true }),
      ]),
    );
    const t = await uno<{ id: string }>(db, `select id from tramites where empresa_id = $1`, [empresaNueva.id]);
    await comoUsuario(db, control, (tx) => tx.query(`select resolver_tramite($1, 'aprobar', null, '099/DSA/2026')`, [t.id]));
    const e = await uno<{ estado: string; numero_registro: number; vencimiento_habilitacion: string }>(
      db,
      `select estado, numero_registro, vencimiento_habilitacion::text from empresas where id = $1`,
      [empresaNueva.id],
    );
    afirmar(e.estado === "habilitada" && e.numero_registro > 49, JSON.stringify(e));
  });

  await prueba("notificación con vencimiento en días hábiles", async () => {
    const n = await comoUsuario(db, inspector, async (tx) => {
      const est = await uno<{ id: string }>(tx, `select id from establecimientos where tiene_tanque limit 1`);
      return uno<{ numero: string; estado: string; vence_at: string }>(
        tx,
        `insert into notificaciones (tipo, establecimiento_id, razon_social, domicilio, notificada_at, persona_notificada)
         values ('tanques', $1, '', '', '2026-10-23 10:00-03', 'Encargado') returning numero, estado, vence_at::text`,
        [est.id],
      );
    });
    afirmar(n.estado === "notificada", n.estado);
    // Viernes 23/10/2026 + 5 días hábiles = viernes 30/10/2026
    afirmar(n.vence_at.startsWith("2026-10-30"), n.vence_at);
  });

  await prueba("panel de indicadores y vistas para el staff", async () => {
    const r = await comoUsuario(db, admin, async (tx) => {
      const k = await uno<{ k: Record<string, unknown> }>(tx, `select dashboard_kpis() as k`);
      const hoja = await uno<{ n: number }>(tx, `select count(*)::int as n from v_hoja_ruta`);
      const alertas = await uno<{ n: number }>(tx, `select count(*)::int as n from v_alertas`);
      const informe = await uno<{ i: { total: number } }>(
        tx,
        `select informe_recaudacion(extract(year from public.hoy())::int, extract(month from public.hoy())::int) as i`,
      );
      const vistas = [
        "v_empresas", "v_certificados", "v_declaraciones", "v_pagos", "v_establecimientos_estado", "v_agenda_servicios",
        "v_notificaciones", "v_inspecciones", "v_actas", "v_tramites", "v_documentos", "v_memorias_tecnicas",
        "v_envases_saldo", "v_recaudacion_mensual", "v_planilla_mensual", "v_estadisticas_rubro", "v_estadisticas_zona",
        "v_estadisticas_producto",
      ];
      for (const v of vistas) await tx.query(`select * from ${v} limit 5`);
      return { k: k.k, hoja: hoja.n, alertas: alertas.n, informe: informe.i };
    });
    afirmar(r.k && r.hoja > 0 && r.alertas > 0, JSON.stringify({ hoja: r.hoja, alertas: r.alertas }));
    afirmar(Number(r.informe.total) > 0, "el informe del mes debería tener recaudación");
  });

  await prueba("una empresa no accede al panel del staff", async () => {
    await debeFallar(() => comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select dashboard_kpis()`)), "No autorizado");
  });

  await prueba("denuncias e inscripciones públicas solo por el servidor de la app", async () => {
    const sqlDenuncia = `select crear_denuncia('otro', 'Descripción de prueba de denuncia', null, null, null, null, true) as c`;
    await debeFallar(() => comoUsuario(db, null, (tx) => tx.query(sqlDenuncia)), "permission denied");
    await debeFallar(
      () => comoUsuario(db, usuarioEmpresa, (tx) => tx.query(`select verificar_limite_envio('denuncia', 'x', 5, 60)`)),
      "permission denied",
    );
    const cap = await uno<{ id: string }>(db, `select id from capacitaciones where estado = 'abierta' limit 1`);
    await debeFallar(
      () =>
        comoUsuario(db, null, (tx) =>
          tx.query(`select inscribir_capacitacion($1, 'Ana Demo', '30111222', 'ana@demo.test')`, [cap.id]),
        ),
      "permission denied",
    );
    const r = await comoServidor(db, (tx) =>
      uno<{ r: { ok: boolean } }>(
        tx,
        `select inscribir_capacitacion($1, 'Ana Demo', '30111222', 'ana@demo.test', null, $2) as r`,
        [cap.id, empresa1.id],
      ),
    );
    afirmar(r.r.ok, "la inscripción por el servidor debería funcionar");
  });

  await prueba("código de denuncia no predecible y consulta pública con el código completo", async () => {
    const codigo = await comoServidor(db, async (tx) =>
      (await uno<{ c: string }>(tx, `select crear_denuncia('otro', 'Descripción de prueba de denuncia', null, null, null, null, true) as c`)).c,
    );
    afirmar(/^DEN-\d{4}-\d{6}-[0-9A-F]{8}$/.test(codigo), codigo);
    const correlativo = codigo.slice(0, 15);
    const r = await comoUsuario(db, null, async (tx) => ({
      completo: (await uno<{ q: { estado: string } | null }>(tx, `select consultar_denuncia($1) as q`, [codigo.toLowerCase()])).q,
      solo: (await uno<{ q: unknown }>(tx, `select consultar_denuncia($1) as q`, [correlativo])).q,
    }));
    afirmar(r.completo?.estado === "recibida", "con el código completo se consulta");
    afirmar(r.solo === null, "con el correlativo solo no debería encontrarse");
    const viejas = await uno<{ n: number }>(
      db,
      `select count(*)::int as n from denuncias where codigo !~ '^DEN-\\d{4}-\\d{6}-[0-9A-F]{8}$'`,
    );
    afirmar(viejas.n === 0, `${viejas.n} denuncias sin sufijo`);
  });

  await prueba("límite de envíos por origen", async () => {
    const sqlLimite = `select verificar_limite_envio('denuncia', $1, 3, 60) as ok`;
    const resultados = await comoServidor(db, async (tx) => {
      const out: boolean[] = [];
      for (let i = 0; i < 4; i++) out.push((await uno<{ ok: boolean }>(tx, sqlLimite, ["hash-prueba"])).ok);
      out.push((await uno<{ ok: boolean }>(tx, sqlLimite, ["otro-origen"])).ok);
      return out;
    });
    afirmar(JSON.stringify(resultados) === JSON.stringify([true, true, true, false, true]), JSON.stringify(resultados));
  });

  await prueba("almacenamiento: una empresa solo sube a su carpeta", async () => {
    await comoUsuario(db, usuarioEmpresa, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name) values ('comprobantes', $1)`, [`${empresa1.id}/x/comprobante.pdf`]),
    );
    await debeFallar(() =>
      comoUsuario(db, usuarioEmpresa, (tx) =>
        tx.query(`insert into storage.objects (bucket_id, name) values ('comprobantes', $1)`, [`${empresa2.id}/x/comprobante.pdf`]),
      ),
    );
  });

  await prueba("la auditoría registra las acciones con su usuario", async () => {
    const a = await uno<{ n: number }>(db, `select count(*)::int as n from auditoria where usuario_id = $1`, [usuarioEmpresa]);
    afirmar(a.n > 0, "sin registros de auditoría del usuario empresa");
  });

  console.log(`\n${pruebas - fallas}/${pruebas} pruebas superadas`);
  await db.close();
  if (fallas > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
