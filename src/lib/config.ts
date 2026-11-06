export const APP = {
  nombre: "SITREPE",
  nombreLargo: "Sistema de Trazabilidad de Empresas, Productos y Envases",
  descripcion:
    "Plataforma digital para la gestión de prestadores de servicios de fumigación y control de plagas urbanas",
  municipio: "Municipalidad de San Miguel de Tucumán",
  secretaria: "Secretaría de Ambiente y Desarrollo Sustentable",
  direccion: "Dirección de Salud Ambiental",
  lema: "La ciudad que queremos.",
  contacto: {
    email: "saludambiental@smt.gob.ar",
    domicilio: "San Martín N.º 1009, San Miguel de Tucumán",
    horario: "Lunes a viernes de 8:00 a 13:00",
  },
  enlaces: {
    /** Listado oficial de ANMAT: desinfestantes y plaguicidas de venta profesional. */
    anmatProductos:
      "https://www.argentina.gob.ar/anmat/regulados/productos-de-uso-domestico/productos-desinfestantes-plaguicidas-insecticidas-0",
  },
  zonaHoraria: "America/Argentina/Tucuman",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
