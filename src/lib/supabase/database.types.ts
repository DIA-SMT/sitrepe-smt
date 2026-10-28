// Archivo generado por scripts/db/tipos.ts a partir de supabase/migrations. No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      actas: {
        Row: {
          id: string
          numero: string | null
          inspeccion_id: string | null
          notificacion_id: string | null
          establecimiento_id: string | null
          empresa_id: string | null
          motivo: Database["public"]["Enums"]["motivo_acta"]
          descripcion: string
          normativa: string | null
          fecha: string
          inspector_id: string | null
          estado: Database["public"]["Enums"]["estado_acta"]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero?: string | null
          inspeccion_id?: string | null
          notificacion_id?: string | null
          establecimiento_id?: string | null
          empresa_id?: string | null
          motivo: Database["public"]["Enums"]["motivo_acta"]
          descripcion: string
          normativa?: string | null
          fecha?: string
          inspector_id?: string | null
          estado?: Database["public"]["Enums"]["estado_acta"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string | null
          inspeccion_id?: string | null
          notificacion_id?: string | null
          establecimiento_id?: string | null
          empresa_id?: string | null
          motivo?: Database["public"]["Enums"]["motivo_acta"]
          descripcion?: string
          normativa?: string | null
          fecha?: string
          inspector_id?: string | null
          estado?: Database["public"]["Enums"]["estado_acta"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actas_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: false
            referencedRelation: "notificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      aranceles: {
        Row: {
          id: number
          codigo: string
          concepto: string
          ordenanza: string
          articulo: string
          importe: number
          unidad: string
          cuenta_id: number
          vigente_desde: string
          vigente_hasta: string | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          codigo: string
          concepto: string
          ordenanza: string
          articulo: string
          importe: number
          unidad?: string
          cuenta_id: number
          vigente_desde?: string
          vigente_hasta?: string | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          codigo?: string
          concepto?: string
          ordenanza?: string
          articulo?: string
          importe?: number
          unidad?: string
          cuenta_id?: number
          vigente_desde?: string
          vigente_hasta?: string | null
          activo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aranceles_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_recaudadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          id: number
          tabla: string
          registro_id: string | null
          accion: string
          usuario_id: string | null
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          created_at: string
        }
        Insert: {
          tabla: string
          registro_id?: string | null
          accion: string
          usuario_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          created_at?: string
        }
        Update: {
          tabla?: string
          registro_id?: string | null
          accion?: string
          usuario_id?: string | null
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      avisos: {
        Row: {
          id: string
          empresa_id: string | null
          titulo: string
          cuerpo: string
          nivel: Database["public"]["Enums"]["nivel_aviso"]
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          titulo: string
          cuerpo: string
          nivel?: Database["public"]["Enums"]["nivel_aviso"]
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          titulo?: string
          cuerpo?: string
          nivel?: Database["public"]["Enums"]["nivel_aviso"]
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_lecturas: {
        Row: {
          aviso_id: string
          perfil_id: string
          leido_at: string
        }
        Insert: {
          aviso_id: string
          perfil_id?: string
          leido_at?: string
        }
        Update: {
          aviso_id?: string
          perfil_id?: string
          leido_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_lecturas_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_lecturas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capacitacion_inscripciones: {
        Row: {
          id: string
          capacitacion_id: string
          nombre: string
          dni: string
          email: string
          empresa_id: string | null
          empresa_texto: string | null
          asistio: boolean
          certificado_codigo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          capacitacion_id: string
          nombre: string
          dni: string
          email: string
          empresa_id?: string | null
          empresa_texto?: string | null
          asistio?: boolean
          certificado_codigo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          capacitacion_id?: string
          nombre?: string
          dni?: string
          email?: string
          empresa_id?: string | null
          empresa_texto?: string | null
          asistio?: boolean
          certificado_codigo?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacitacion_inscripciones_capacitacion_id_fkey"
            columns: ["capacitacion_id"]
            isOneToOne: false
            referencedRelation: "capacitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capacitacion_inscripciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      capacitaciones: {
        Row: {
          id: string
          titulo: string
          descripcion: string
          modalidad: Database["public"]["Enums"]["modalidad_capacitacion"]
          lugar: string | null
          fecha_inicio: string
          duracion_horas: number
          cupo: number | null
          estado: Database["public"]["Enums"]["estado_capacitacion"]
          destinatarios: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion: string
          modalidad?: Database["public"]["Enums"]["modalidad_capacitacion"]
          lugar?: string | null
          fecha_inicio: string
          duracion_horas?: number
          cupo?: number | null
          estado?: Database["public"]["Enums"]["estado_capacitacion"]
          destinatarios?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string
          modalidad?: Database["public"]["Enums"]["modalidad_capacitacion"]
          lugar?: string | null
          fecha_inicio?: string
          duracion_horas?: number
          cupo?: number | null
          estado?: Database["public"]["Enums"]["estado_capacitacion"]
          destinatarios?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacitaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_productos: {
        Row: {
          id: string
          certificado_id: string
          producto_id: string
          cantidad: number
          unidad: string
        }
        Insert: {
          id?: string
          certificado_id: string
          producto_id: string
          cantidad: number
          unidad?: string
        }
        Update: {
          id?: string
          certificado_id?: string
          producto_id?: string
          cantidad?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_productos_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          id: string
          empresa_id: string
          declaracion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"]
          numero: string
          establecimiento_id: string | null
          cliente: string
          cliente_cuit: string | null
          domicilio: string
          rubro_id: number
          superficie_m2: number | null
          capacidad_litros: number | null
          fecha_servicio: string
          fecha_vencimiento: string | null
          tecnico_id: string
          plazo_reingreso_horas: number | null
          laboratorio: string | null
          analisis_bacteriologico_path: string | null
          analisis_fisicoquimico_path: string | null
          estado: Database["public"]["Enums"]["estado_certificado"]
          firmado_at: string | null
          firmado_por: string | null
          firma_hash: string | null
          pago_id: string | null
          timbrado_at: string | null
          timbrado_por: string | null
          sello_codigo: string | null
          codigo_verificacion: string
          observaciones: string | null
          anulado_motivo: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          declaracion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
          numero: string
          establecimiento_id?: string | null
          cliente: string
          cliente_cuit?: string | null
          domicilio: string
          rubro_id: number
          superficie_m2?: number | null
          capacidad_litros?: number | null
          fecha_servicio: string
          fecha_vencimiento?: string | null
          tecnico_id: string
          plazo_reingreso_horas?: number | null
          laboratorio?: string | null
          analisis_bacteriologico_path?: string | null
          analisis_fisicoquimico_path?: string | null
          estado?: Database["public"]["Enums"]["estado_certificado"]
          firmado_at?: string | null
          firmado_por?: string | null
          firma_hash?: string | null
          pago_id?: string | null
          timbrado_at?: string | null
          timbrado_por?: string | null
          sello_codigo?: string | null
          codigo_verificacion?: string
          observaciones?: string | null
          anulado_motivo?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          declaracion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
          numero?: string
          establecimiento_id?: string | null
          cliente?: string
          cliente_cuit?: string | null
          domicilio?: string
          rubro_id?: number
          superficie_m2?: number | null
          capacidad_litros?: number | null
          fecha_servicio?: string
          fecha_vencimiento?: string | null
          tecnico_id?: string
          plazo_reingreso_horas?: number | null
          laboratorio?: string | null
          analisis_bacteriologico_path?: string | null
          analisis_fisicoquimico_path?: string | null
          estado?: Database["public"]["Enums"]["estado_certificado"]
          firmado_at?: string | null
          firmado_por?: string | null
          firma_hash?: string | null
          pago_id?: string | null
          timbrado_at?: string | null
          timbrado_por?: string | null
          sello_codigo?: string | null
          codigo_verificacion?: string
          observaciones?: string | null
          anulado_motivo?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_declaracion_id_fkey"
            columns: ["declaracion_id"]
            isOneToOne: false
            referencedRelation: "declaraciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_firmado_por_fkey"
            columns: ["firmado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_timbrado_por_fkey"
            columns: ["timbrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contadores: {
        Row: {
          prefijo: string
          anio: number
          ultimo: number
        }
        Insert: {
          prefijo: string
          anio: number
          ultimo?: number
        }
        Update: {
          prefijo?: string
          anio?: number
          ultimo?: number
        }
        Relationships: []
      }
      cuentas_recaudadoras: {
        Row: {
          id: number
          codigo: string
          nombre: string
          banco: string
          numero_cuenta: string
          cbu: string
          descripcion: string | null
          medios_pago: Database["public"]["Enums"]["medio_pago"][]
          activo: boolean
        }
        Insert: {
          id?: number
          codigo: string
          nombre: string
          banco: string
          numero_cuenta: string
          cbu: string
          descripcion?: string | null
          medios_pago?: Database["public"]["Enums"]["medio_pago"][]
          activo?: boolean
        }
        Update: {
          id?: number
          codigo?: string
          nombre?: string
          banco?: string
          numero_cuenta?: string
          cbu?: string
          descripcion?: string | null
          medios_pago?: Database["public"]["Enums"]["medio_pago"][]
          activo?: boolean
        }
        Relationships: []
      }
      declaraciones: {
        Row: {
          id: string
          codigo: string | null
          empresa_id: string
          tipo: Database["public"]["Enums"]["tipo_servicio"]
          estado: Database["public"]["Enums"]["estado_declaracion"]
          presentada_at: string | null
          presentada_por: string | null
          controlada_at: string | null
          controlada_por: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          empresa_id: string
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
          estado?: Database["public"]["Enums"]["estado_declaracion"]
          presentada_at?: string | null
          presentada_por?: string | null
          controlada_at?: string | null
          controlada_por?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          empresa_id?: string
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
          estado?: Database["public"]["Enums"]["estado_declaracion"]
          presentada_at?: string | null
          presentada_por?: string | null
          controlada_at?: string | null
          controlada_por?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "declaraciones_controlada_por_fkey"
            columns: ["controlada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaraciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaraciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "declaraciones_presentada_por_fkey"
            columns: ["presentada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      denuncias: {
        Row: {
          id: string
          codigo: string | null
          tipo: Database["public"]["Enums"]["tipo_denuncia"]
          descripcion: string
          domicilio: string | null
          empresa_mencionada: string | null
          empresa_id: string | null
          establecimiento_id: string | null
          denunciante_nombre: string | null
          denunciante_contacto: string | null
          anonima: boolean
          estado: Database["public"]["Enums"]["estado_denuncia"]
          asignada_a: string | null
          respuesta: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          tipo: Database["public"]["Enums"]["tipo_denuncia"]
          descripcion: string
          domicilio?: string | null
          empresa_mencionada?: string | null
          empresa_id?: string | null
          establecimiento_id?: string | null
          denunciante_nombre?: string | null
          denunciante_contacto?: string | null
          anonima?: boolean
          estado?: Database["public"]["Enums"]["estado_denuncia"]
          asignada_a?: string | null
          respuesta?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_denuncia"]
          descripcion?: string
          domicilio?: string | null
          empresa_mencionada?: string | null
          empresa_id?: string | null
          establecimiento_id?: string | null
          denunciante_nombre?: string | null
          denunciante_contacto?: string | null
          anonima?: boolean
          estado?: Database["public"]["Enums"]["estado_denuncia"]
          asignada_a?: string | null
          respuesta?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "denuncias_asignada_a_fkey"
            columns: ["asignada_a"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          id: string
          empresa_id: string
          tecnico_id: string | null
          tramite_id: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          nombre_archivo: string
          path: string
          vence: string | null
          estado: Database["public"]["Enums"]["estado_documento"]
          observaciones: string | null
          revisado_por: string | null
          revisado_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tecnico_id?: string | null
          tramite_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          nombre_archivo: string
          path: string
          vence?: string | null
          estado?: Database["public"]["Enums"]["estado_documento"]
          observaciones?: string | null
          revisado_por?: string | null
          revisado_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          tecnico_id?: string | null
          tramite_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          nombre_archivo?: string
          path?: string
          vence?: string | null
          estado?: Database["public"]["Enums"]["estado_documento"]
          observaciones?: string | null
          revisado_por?: string | null
          revisado_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tramite_id_fkey"
            columns: ["tramite_id"]
            isOneToOne: false
            referencedRelation: "tramites"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_productos: {
        Row: {
          id: string
          empresa_id: string
          producto_id: string
          dosis: string | null
          concentracion_uso: string | null
          precauciones: string | null
          estado: Database["public"]["Enums"]["estado_memoria"]
          revisado_por: string | null
          revisado_at: string | null
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          producto_id: string
          dosis?: string | null
          concentracion_uso?: string | null
          precauciones?: string | null
          estado?: Database["public"]["Enums"]["estado_memoria"]
          revisado_por?: string | null
          revisado_at?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          producto_id?: string
          dosis?: string | null
          concentracion_uso?: string | null
          precauciones?: string | null
          estado?: Database["public"]["Enums"]["estado_memoria"]
          revisado_por?: string | null
          revisado_at?: string | null
          observaciones?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_productos_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          id: string
          numero_registro: number | null
          nombre_comercial: string
          titular: string | null
          tipo_persona: string
          cuit: string
          email: string | null
          telefono: string | null
          domicilio_oficina: string | null
          domicilio_deposito: string | null
          habilitacion_comercial: string | null
          resolucion_dsa: string | null
          habilita_fumigacion: boolean
          habilita_tanques: boolean
          estado: Database["public"]["Enums"]["estado_empresa"]
          fecha_habilitacion: string | null
          vencimiento_habilitacion: string | null
          ultima_inspeccion_deposito: string | null
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero_registro?: number | null
          nombre_comercial: string
          titular?: string | null
          tipo_persona?: string
          cuit: string
          email?: string | null
          telefono?: string | null
          domicilio_oficina?: string | null
          domicilio_deposito?: string | null
          habilitacion_comercial?: string | null
          resolucion_dsa?: string | null
          habilita_fumigacion?: boolean
          habilita_tanques?: boolean
          estado?: Database["public"]["Enums"]["estado_empresa"]
          fecha_habilitacion?: string | null
          vencimiento_habilitacion?: string | null
          ultima_inspeccion_deposito?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_registro?: number | null
          nombre_comercial?: string
          titular?: string | null
          tipo_persona?: string
          cuit?: string
          email?: string | null
          telefono?: string | null
          domicilio_oficina?: string | null
          domicilio_deposito?: string | null
          habilitacion_comercial?: string | null
          resolucion_dsa?: string | null
          habilita_fumigacion?: boolean
          habilita_tanques?: boolean
          estado?: Database["public"]["Enums"]["estado_empresa"]
          fecha_habilitacion?: string | null
          vencimiento_habilitacion?: string | null
          ultima_inspeccion_deposito?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      envases_movimientos: {
        Row: {
          id: string
          empresa_id: string
          producto_id: string
          tipo: Database["public"]["Enums"]["movimiento_envase"]
          cantidad: number
          capacidad: string | null
          lote: string | null
          fecha: string
          triple_lavado: boolean
          destinatario: string | null
          manifiesto: string | null
          comprobante_path: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          producto_id: string
          tipo: Database["public"]["Enums"]["movimiento_envase"]
          cantidad: number
          capacidad?: string | null
          lote?: string | null
          fecha?: string
          triple_lavado?: boolean
          destinatario?: string | null
          manifiesto?: string | null
          comprobante_path?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          producto_id?: string
          tipo?: Database["public"]["Enums"]["movimiento_envase"]
          cantidad?: number
          capacidad?: string | null
          lote?: string | null
          fecha?: string
          triple_lavado?: boolean
          destinatario?: string | null
          manifiesto?: string | null
          comprobante_path?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "envases_movimientos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envases_movimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envases_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      establecimientos: {
        Row: {
          id: string
          nombre: string
          nombre_fantasia: string | null
          cuit: string | null
          domicilio: string
          barrio: string | null
          zona: string | null
          lat: number | null
          lng: number | null
          rubro_id: number | null
          tiene_tanque: boolean
          afluencia_publico: boolean
          telefono: string | null
          email: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          nombre_fantasia?: string | null
          cuit?: string | null
          domicilio: string
          barrio?: string | null
          zona?: string | null
          lat?: number | null
          lng?: number | null
          rubro_id?: number | null
          tiene_tanque?: boolean
          afluencia_publico?: boolean
          telefono?: string | null
          email?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          nombre_fantasia?: string | null
          cuit?: string | null
          domicilio?: string
          barrio?: string | null
          zona?: string | null
          lat?: number | null
          lng?: number | null
          rubro_id?: number | null
          tiene_tanque?: boolean
          afluencia_publico?: boolean
          telefono?: string | null
          email?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establecimientos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          fecha: string
          descripcion: string
        }
        Insert: {
          fecha: string
          descripcion: string
        }
        Update: {
          fecha?: string
          descripcion?: string
        }
        Relationships: []
      }
      inspecciones: {
        Row: {
          id: string
          codigo: string | null
          tipo: Database["public"]["Enums"]["tipo_inspeccion"]
          estado: Database["public"]["Enums"]["estado_inspeccion"]
          empresa_id: string | null
          establecimiento_id: string | null
          certificado_id: string | null
          denuncia_id: string | null
          inspector_id: string | null
          fecha_programada: string
          realizada_at: string | null
          resultado: Database["public"]["Enums"]["resultado_inspeccion"] | null
          checklist: Json
          observaciones: string | null
          lat: number | null
          lng: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          tipo: Database["public"]["Enums"]["tipo_inspeccion"]
          estado?: Database["public"]["Enums"]["estado_inspeccion"]
          empresa_id?: string | null
          establecimiento_id?: string | null
          certificado_id?: string | null
          denuncia_id?: string | null
          inspector_id?: string | null
          fecha_programada?: string
          realizada_at?: string | null
          resultado?: Database["public"]["Enums"]["resultado_inspeccion"] | null
          checklist?: Json
          observaciones?: string | null
          lat?: number | null
          lng?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_inspeccion"]
          estado?: Database["public"]["Enums"]["estado_inspeccion"]
          empresa_id?: string | null
          establecimiento_id?: string | null
          certificado_id?: string | null
          denuncia_id?: string | null
          inspector_id?: string | null
          fecha_programada?: string
          realizada_at?: string | null
          resultado?: Database["public"]["Enums"]["resultado_inspeccion"] | null
          checklist?: Json
          observaciones?: string | null
          lat?: number | null
          lng?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspecciones_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_denuncia_id_fkey"
            columns: ["denuncia_id"]
            isOneToOne: false
            referencedRelation: "denuncias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspecciones_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      limites_envio: {
        Row: {
          id: number
          accion: string
          clave: string
          created_at: string
        }
        Insert: {
          accion: string
          clave: string
          created_at?: string
        }
        Update: {
          accion?: string
          clave?: string
          created_at?: string
        }
        Relationships: []
      }
      noticias: {
        Row: {
          id: string
          slug: string
          titulo: string
          resumen: string
          cuerpo: string
          categoria: string
          imagen_url: string | null
          publicada: boolean
          publicada_at: string | null
          autor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          titulo: string
          resumen: string
          cuerpo: string
          categoria?: string
          imagen_url?: string | null
          publicada?: boolean
          publicada_at?: string | null
          autor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          titulo?: string
          resumen?: string
          cuerpo?: string
          categoria?: string
          imagen_url?: string | null
          publicada?: boolean
          publicada_at?: string | null
          autor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticias_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          id: string
          numero: string | null
          ciclo: number
          talonario: number | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          establecimiento_id: string | null
          empresa_id: string | null
          razon_social: string
          rubro: string | null
          cuit: string | null
          domicilio: string
          orden_trabajo: string | null
          plazo: Database["public"]["Enums"]["plazo_notificacion"]
          notificada_at: string | null
          persona_notificada: string | null
          dni_notificado: string | null
          vence_at: string | null
          estado: Database["public"]["Enums"]["estado_notificacion"]
          cumplida_at: string | null
          inspector_id: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          numero?: string | null
          ciclo?: number
          talonario?: number | null
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          establecimiento_id?: string | null
          empresa_id?: string | null
          razon_social: string
          rubro?: string | null
          cuit?: string | null
          domicilio: string
          orden_trabajo?: string | null
          plazo?: Database["public"]["Enums"]["plazo_notificacion"]
          notificada_at?: string | null
          persona_notificada?: string | null
          dni_notificado?: string | null
          vence_at?: string | null
          estado?: Database["public"]["Enums"]["estado_notificacion"]
          cumplida_at?: string | null
          inspector_id?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero?: string | null
          ciclo?: number
          talonario?: number | null
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          establecimiento_id?: string | null
          empresa_id?: string | null
          razon_social?: string
          rubro?: string | null
          cuit?: string | null
          domicilio?: string
          orden_trabajo?: string | null
          plazo?: Database["public"]["Enums"]["plazo_notificacion"]
          notificada_at?: string | null
          persona_notificada?: string | null
          dni_notificado?: string | null
          vence_at?: string | null
          estado?: Database["public"]["Enums"]["estado_notificacion"]
          cumplida_at?: string | null
          inspector_id?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_establecimiento_id_fkey"
            columns: ["establecimiento_id"]
            isOneToOne: false
            referencedRelation: "establecimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          id: string
          codigo: string | null
          empresa_id: string | null
          contribuyente: string | null
          contribuyente_cuit: string | null
          arancel_id: number
          cuenta_id: number
          cantidad: number
          importe_unitario: number
          importe_total: number
          medio: Database["public"]["Enums"]["medio_pago"]
          estado: Database["public"]["Enums"]["estado_pago"]
          numero_operacion: string | null
          fecha_pago: string | null
          comprobante_path: string | null
          informado_at: string | null
          verificado_por: string | null
          verificado_at: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          empresa_id?: string | null
          contribuyente?: string | null
          contribuyente_cuit?: string | null
          arancel_id: number
          cuenta_id: number
          cantidad?: number
          importe_unitario: number
          importe_total: number
          medio?: Database["public"]["Enums"]["medio_pago"]
          estado?: Database["public"]["Enums"]["estado_pago"]
          numero_operacion?: string | null
          fecha_pago?: string | null
          comprobante_path?: string | null
          informado_at?: string | null
          verificado_por?: string | null
          verificado_at?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          empresa_id?: string | null
          contribuyente?: string | null
          contribuyente_cuit?: string | null
          arancel_id?: number
          cuenta_id?: number
          cantidad?: number
          importe_unitario?: number
          importe_total?: number
          medio?: Database["public"]["Enums"]["medio_pago"]
          estado?: Database["public"]["Enums"]["estado_pago"]
          numero_operacion?: string | null
          fecha_pago?: string | null
          comprobante_path?: string | null
          informado_at?: string | null
          verificado_por?: string | null
          verificado_at?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_arancel_id_fkey"
            columns: ["arancel_id"]
            isOneToOne: false
            referencedRelation: "aranceles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas_recaudadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_verificado_por_fkey"
            columns: ["verificado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros: {
        Row: {
          clave: string
          valor: Json
          descripcion: string | null
          updated_at: string
        }
        Insert: {
          clave: string
          valor: Json
          descripcion?: string | null
          updated_at?: string
        }
        Update: {
          clave?: string
          valor?: Json
          descripcion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          id: string
          email: string | null
          nombre: string
          apellido: string
          dni: string | null
          telefono: string | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          empresa_id: string | null
          tecnico_id: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          nombre?: string
          apellido?: string
          dni?: string | null
          telefono?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          empresa_id?: string | null
          tecnico_id?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          nombre?: string
          apellido?: string
          dni?: string | null
          telefono?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          empresa_id?: string | null
          tecnico_id?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          id: string
          nombre_comercial: string
          principio_activo: string
          concentracion: string | null
          clase: Database["public"]["Enums"]["clase_producto"]
          formulacion: string | null
          organismo: Database["public"]["Enums"]["organismo_registro"]
          registro_numero: string
          categoria_toxicologica: string | null
          antidoto: string | null
          precauciones: string | null
          plazo_reingreso_horas: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre_comercial: string
          principio_activo: string
          concentracion?: string | null
          clase: Database["public"]["Enums"]["clase_producto"]
          formulacion?: string | null
          organismo: Database["public"]["Enums"]["organismo_registro"]
          registro_numero: string
          categoria_toxicologica?: string | null
          antidoto?: string | null
          precauciones?: string | null
          plazo_reingreso_horas?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre_comercial?: string
          principio_activo?: string
          concentracion?: string | null
          clase?: Database["public"]["Enums"]["clase_producto"]
          formulacion?: string | null
          organismo?: Database["public"]["Enums"]["organismo_registro"]
          registro_numero?: string
          categoria_toxicologica?: string | null
          antidoto?: string | null
          precauciones?: string | null
          plazo_reingreso_horas?: number
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      rubros: {
        Row: {
          id: number
          grupo: string
          nombre: string
          periodicidad: Database["public"]["Enums"]["periodicidad"]
          descripcion: string | null
          validado: boolean
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          grupo: string
          nombre: string
          periodicidad: Database["public"]["Enums"]["periodicidad"]
          descripcion?: string | null
          validado?: boolean
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          grupo?: string
          nombre?: string
          periodicidad?: Database["public"]["Enums"]["periodicidad"]
          descripcion?: string | null
          validado?: boolean
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      tecnicos: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          apellido: string
          dni: string
          titulo: string
          institucion: string | null
          matricula: string | null
          email: string | null
          telefono: string | null
          es_representante: boolean
          estado: Database["public"]["Enums"]["estado_tecnico"]
          fecha_alta: string | null
          fecha_baja: string | null
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nombre: string
          apellido: string
          dni: string
          titulo: string
          institucion?: string | null
          matricula?: string | null
          email?: string | null
          telefono?: string | null
          es_representante?: boolean
          estado?: Database["public"]["Enums"]["estado_tecnico"]
          fecha_alta?: string | null
          fecha_baja?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nombre?: string
          apellido?: string
          dni?: string
          titulo?: string
          institucion?: string | null
          matricula?: string | null
          email?: string | null
          telefono?: string | null
          es_representante?: boolean
          estado?: Database["public"]["Enums"]["estado_tecnico"]
          fecha_alta?: string | null
          fecha_baja?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecnicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tramites: {
        Row: {
          id: string
          codigo: string | null
          empresa_id: string
          tipo: Database["public"]["Enums"]["tipo_tramite"]
          estado: Database["public"]["Enums"]["estado_tramite"]
          datos: Json
          presentado_at: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          resolucion: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string | null
          empresa_id: string
          tipo: Database["public"]["Enums"]["tipo_tramite"]
          estado?: Database["public"]["Enums"]["estado_tramite"]
          datos?: Json
          presentado_at?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          resolucion?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          codigo?: string | null
          empresa_id?: string
          tipo?: Database["public"]["Enums"]["tipo_tramite"]
          estado?: Database["public"]["Enums"]["estado_tramite"]
          datos?: Json
          presentado_at?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          resolucion?: string | null
          observaciones?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tramites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tramites_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tramites_resuelto_por_fkey"
            columns: ["resuelto_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_actas: {
        Row: {
          id: string | null
          numero: string | null
          inspeccion_id: string | null
          notificacion_id: string | null
          establecimiento_id: string | null
          empresa_id: string | null
          motivo: Database["public"]["Enums"]["motivo_acta"] | null
          descripcion: string | null
          normativa: string | null
          fecha: string | null
          inspector_id: string | null
          estado: Database["public"]["Enums"]["estado_acta"] | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          establecimiento_nombre: string | null
          establecimiento_domicilio: string | null
          notificacion_numero: string | null
          inspeccion_codigo: string | null
          inspector_nombre: string | null
        }
        Relationships: []
      }
      v_agenda_servicios: {
        Row: {
          id: string | null
          empresa_id: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          numero: string | null
          cliente: string | null
          domicilio: string | null
          fecha_servicio: string | null
          estado: Database["public"]["Enums"]["estado_certificado"] | null
          establecimiento_id: string | null
          superficie_m2: number | null
          empresa_nombre: string | null
          rubro_nombre: string | null
          tecnico_nombre: string | null
          lat: number | null
          lng: number | null
          barrio: string | null
          zona: string | null
          inspeccionado: boolean | null
        }
        Relationships: []
      }
      v_alertas: {
        Row: {
          tipo: string | null
          nivel: string | null
          titulo: string | null
          detalle: string | null
          empresa_id: string | null
          referencia_id: string | null
          fecha: string | null
        }
        Relationships: []
      }
      v_certificados: {
        Row: {
          id: string | null
          empresa_id: string | null
          declaracion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          numero: string | null
          establecimiento_id: string | null
          cliente: string | null
          cliente_cuit: string | null
          domicilio: string | null
          rubro_id: number | null
          superficie_m2: number | null
          capacidad_litros: number | null
          fecha_servicio: string | null
          fecha_vencimiento: string | null
          tecnico_id: string | null
          plazo_reingreso_horas: number | null
          laboratorio: string | null
          analisis_bacteriologico_path: string | null
          analisis_fisicoquimico_path: string | null
          estado: Database["public"]["Enums"]["estado_certificado"] | null
          firmado_at: string | null
          firmado_por: string | null
          firma_hash: string | null
          pago_id: string | null
          timbrado_at: string | null
          timbrado_por: string | null
          sello_codigo: string | null
          codigo_verificacion: string | null
          observaciones: string | null
          anulado_motivo: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          empresa_cuit: string | null
          empresa_numero_registro: number | null
          rubro_nombre: string | null
          rubro_grupo: string | null
          rubro_periodicidad: Database["public"]["Enums"]["periodicidad"] | null
          tecnico_nombre: string | null
          tecnico_titulo: string | null
          tecnico_matricula: string | null
          declaracion_codigo: string | null
          declaracion_estado: Database["public"]["Enums"]["estado_declaracion"] | null
          pago_codigo: string | null
          pago_estado: Database["public"]["Enums"]["estado_pago"] | null
          establecimiento_barrio: string | null
          establecimiento_zona: string | null
          establecimiento_lat: number | null
          establecimiento_lng: number | null
          vigencia: string | null
          productos: Json | null
        }
        Relationships: []
      }
      v_declaraciones: {
        Row: {
          id: string | null
          codigo: string | null
          empresa_id: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          estado: Database["public"]["Enums"]["estado_declaracion"] | null
          presentada_at: string | null
          presentada_por: string | null
          controlada_at: string | null
          controlada_por: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          empresa_cuit: string | null
          cantidad_certificados: number | null
          pendientes_firma: number | null
          observados: number | null
          primer_servicio: string | null
          ultimo_servicio: string | null
        }
        Relationships: []
      }
      v_documentos: {
        Row: {
          id: string | null
          empresa_id: string | null
          tecnico_id: string | null
          tramite_id: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"] | null
          nombre_archivo: string | null
          path: string | null
          vence: string | null
          estado: Database["public"]["Enums"]["estado_documento"] | null
          observaciones: string | null
          revisado_por: string | null
          revisado_at: string | null
          created_by: string | null
          created_at: string | null
          empresa_nombre: string | null
          tecnico_nombre: string | null
        }
        Relationships: []
      }
      v_empresas: {
        Row: {
          id: string | null
          numero_registro: number | null
          nombre_comercial: string | null
          titular: string | null
          tipo_persona: string | null
          cuit: string | null
          email: string | null
          telefono: string | null
          domicilio_oficina: string | null
          domicilio_deposito: string | null
          habilitacion_comercial: string | null
          resolucion_dsa: string | null
          habilita_fumigacion: boolean | null
          habilita_tanques: boolean | null
          estado: Database["public"]["Enums"]["estado_empresa"] | null
          fecha_habilitacion: string | null
          vencimiento_habilitacion: string | null
          ultima_inspeccion_deposito: string | null
          observaciones: string | null
          created_at: string | null
          updated_at: string | null
          estado_efectivo: Database["public"]["Enums"]["estado_empresa"] | null
          dias_para_vencer: number | null
          tecnicos_aprobados: number | null
          productos_aprobados: number | null
          certificados_mes: number | null
          pagos_pendientes: number | null
        }
        Relationships: []
      }
      v_envases_saldo: {
        Row: {
          empresa_id: string | null
          empresa_nombre: string | null
          producto_id: string | null
          producto_nombre: string | null
          organismo: Database["public"]["Enums"]["organismo_registro"] | null
          registro_numero: string | null
          generados: number | null
          entregados: number | null
          saldo: number | null
          ultimo_movimiento: string | null
        }
        Relationships: []
      }
      v_establecimientos_estado: {
        Row: {
          id: string | null
          nombre: string | null
          nombre_fantasia: string | null
          cuit: string | null
          domicilio: string | null
          barrio: string | null
          zona: string | null
          lat: number | null
          lng: number | null
          rubro_id: number | null
          tiene_tanque: boolean | null
          afluencia_publico: boolean | null
          telefono: string | null
          email: string | null
          activo: boolean | null
          created_at: string | null
          updated_at: string | null
          rubro_nombre: string | null
          rubro_grupo: string | null
          rubro_periodicidad: Database["public"]["Enums"]["periodicidad"] | null
          fumigacion_certificado_id: string | null
          fumigacion_numero: string | null
          fumigacion_fecha: string | null
          fumigacion_vencimiento: string | null
          fumigacion_empresa: string | null
          estado_fumigacion: string | null
          tanque_certificado_id: string | null
          tanque_numero: string | null
          tanque_fecha: string | null
          tanque_vencimiento: string | null
          tanque_empresa: string | null
          estado_tanque: string | null
        }
        Relationships: []
      }
      v_estadisticas_producto: {
        Row: {
          mes: string | null
          producto_id: string | null
          producto: string | null
          principio_activo: string | null
          clase: Database["public"]["Enums"]["clase_producto"] | null
          unidad: string | null
          servicios: number | null
          cantidad_total: number | null
        }
        Relationships: []
      }
      v_estadisticas_rubro: {
        Row: {
          mes: string | null
          grupo: string | null
          rubro: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          certificados: number | null
        }
        Relationships: []
      }
      v_estadisticas_zona: {
        Row: {
          mes: string | null
          zona: string | null
          barrio: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          certificados: number | null
        }
        Relationships: []
      }
      v_hoja_ruta: {
        Row: {
          id: string | null
          nombre: string | null
          nombre_fantasia: string | null
          cuit: string | null
          domicilio: string | null
          barrio: string | null
          zona: string | null
          lat: number | null
          lng: number | null
          rubro_id: number | null
          tiene_tanque: boolean | null
          afluencia_publico: boolean | null
          telefono: string | null
          email: string | null
          activo: boolean | null
          created_at: string | null
          updated_at: string | null
          rubro_nombre: string | null
          rubro_grupo: string | null
          rubro_periodicidad: Database["public"]["Enums"]["periodicidad"] | null
          fumigacion_certificado_id: string | null
          fumigacion_numero: string | null
          fumigacion_fecha: string | null
          fumigacion_vencimiento: string | null
          fumigacion_empresa: string | null
          estado_fumigacion: string | null
          tanque_certificado_id: string | null
          tanque_numero: string | null
          tanque_fecha: string | null
          tanque_vencimiento: string | null
          tanque_empresa: string | null
          estado_tanque: string | null
          prioridad: number | null
          proximo_vencimiento: string | null
        }
        Relationships: []
      }
      v_inspecciones: {
        Row: {
          id: string | null
          codigo: string | null
          tipo: Database["public"]["Enums"]["tipo_inspeccion"] | null
          estado: Database["public"]["Enums"]["estado_inspeccion"] | null
          empresa_id: string | null
          establecimiento_id: string | null
          certificado_id: string | null
          denuncia_id: string | null
          inspector_id: string | null
          fecha_programada: string | null
          realizada_at: string | null
          resultado: Database["public"]["Enums"]["resultado_inspeccion"] | null
          checklist: Json | null
          observaciones: string | null
          lat: number | null
          lng: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          establecimiento_nombre: string | null
          establecimiento_domicilio: string | null
          certificado_numero: string | null
          denuncia_codigo: string | null
          inspector_nombre: string | null
        }
        Relationships: []
      }
      v_memorias_tecnicas: {
        Row: {
          id: string | null
          empresa_id: string | null
          producto_id: string | null
          dosis: string | null
          concentracion_uso: string | null
          precauciones: string | null
          estado: Database["public"]["Enums"]["estado_memoria"] | null
          revisado_por: string | null
          revisado_at: string | null
          observaciones: string | null
          created_at: string | null
          empresa_nombre: string | null
          producto_nombre: string | null
          principio_activo: string | null
          clase: Database["public"]["Enums"]["clase_producto"] | null
          organismo: Database["public"]["Enums"]["organismo_registro"] | null
          registro_numero: string | null
          categoria_toxicologica: string | null
          plazo_reingreso_horas: number | null
        }
        Relationships: []
      }
      v_notificaciones: {
        Row: {
          id: string | null
          numero: string | null
          ciclo: number | null
          talonario: number | null
          tipo: Database["public"]["Enums"]["tipo_notificacion"] | null
          establecimiento_id: string | null
          empresa_id: string | null
          razon_social: string | null
          rubro: string | null
          cuit: string | null
          domicilio: string | null
          orden_trabajo: string | null
          plazo: Database["public"]["Enums"]["plazo_notificacion"] | null
          notificada_at: string | null
          persona_notificada: string | null
          dni_notificado: string | null
          vence_at: string | null
          estado: Database["public"]["Enums"]["estado_notificacion"] | null
          cumplida_at: string | null
          inspector_id: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          estado_efectivo: string | null
          inspector_nombre: string | null
        }
        Relationships: []
      }
      v_pagos: {
        Row: {
          id: string | null
          codigo: string | null
          empresa_id: string | null
          contribuyente: string | null
          contribuyente_cuit: string | null
          arancel_id: number | null
          cuenta_id: number | null
          cantidad: number | null
          importe_unitario: number | null
          importe_total: number | null
          medio: Database["public"]["Enums"]["medio_pago"] | null
          estado: Database["public"]["Enums"]["estado_pago"] | null
          numero_operacion: string | null
          fecha_pago: string | null
          comprobante_path: string | null
          informado_at: string | null
          verificado_por: string | null
          verificado_at: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          empresa_cuit: string | null
          arancel_codigo: string | null
          arancel_concepto: string | null
          arancel_ordenanza: string | null
          arancel_articulo: string | null
          cuenta_codigo: string | null
          cuenta_nombre: string | null
          cuenta_cbu: string | null
          cuenta_banco: string | null
          cantidad_certificados: number | null
        }
        Relationships: []
      }
      v_planilla_mensual: {
        Row: {
          empresa_id: string | null
          empresa_nombre: string | null
          empresa_cuit: string | null
          mes: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"] | null
          certificados: number | null
          timbrados: number | null
          en_proceso: number | null
          anulados: number | null
          superficie_total_m2: number | null
        }
        Relationships: []
      }
      v_recaudacion_mensual: {
        Row: {
          mes: string | null
          cuenta_codigo: string | null
          cuenta_nombre: string | null
          arancel_codigo: string | null
          concepto: string | null
          cantidad_pagos: number | null
          cantidad_unidades: number | null
          total: number | null
        }
        Relationships: []
      }
      v_tramites: {
        Row: {
          id: string | null
          codigo: string | null
          empresa_id: string | null
          tipo: Database["public"]["Enums"]["tipo_tramite"] | null
          estado: Database["public"]["Enums"]["estado_tramite"] | null
          datos: Json | null
          presentado_at: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          resolucion: string | null
          observaciones: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          empresa_nombre: string | null
          empresa_cuit: string | null
          empresa_estado: Database["public"]["Enums"]["estado_empresa"] | null
          cantidad_documentos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_actualizar_perfil: {
        Args: {
          p_perfil: string
          p_rol: Database["public"]["Enums"]["rol_usuario"]
          p_empresa: string
          p_tecnico: string
          p_activo: boolean
        }
        Returns: undefined
      }
      anular_certificado: {
        Args: {
          p_certificado: string
          p_motivo: string
        }
        Returns: undefined
      }
      anular_liquidacion: {
        Args: {
          p_pago: string
        }
        Returns: undefined
      }
      arancel_vigente: {
        Args: {
          p_codigo: string
          p_fecha?: string
        }
        Returns: Database["public"]["Tables"]["aranceles"]["Row"]
      }
      calcular_vencimiento: {
        Args: {
          p_tipo: Database["public"]["Enums"]["tipo_servicio"]
          p_rubro_id: number
          p_fecha_servicio: string
        }
        Returns: string
      }
      consultar_denuncia: {
        Args: {
          p_codigo: string
        }
        Returns: Json
      }
      controlar_declaracion: {
        Args: {
          p_declaracion: string
          p_observados?: Json
          p_observaciones?: string
        }
        Returns: undefined
      }
      crear_denuncia: {
        Args: {
          p_tipo: Database["public"]["Enums"]["tipo_denuncia"]
          p_descripcion: string
          p_domicilio?: string
          p_empresa_mencionada?: string
          p_nombre?: string
          p_contacto?: string
          p_anonima?: boolean
        }
        Returns: string
      }
      dashboard_kpis: {
        Args: never
        Returns: Json
      }
      empresa_actual: {
        Args: never
        Returns: string
      }
      empresa_habilitada: {
        Args: {
          p_empresa: string
          p_tipo?: Database["public"]["Enums"]["tipo_servicio"]
        }
        Returns: boolean
      }
      es_admin: {
        Args: never
        Returns: boolean
      }
      es_staff: {
        Args: never
        Returns: boolean
      }
      firmar_certificados: {
        Args: {
          p_ids: string[]
        }
        Returns: number
      }
      generar_codigo_verificacion: {
        Args: never
        Returns: string
      }
      generar_liquidacion: {
        Args: {
          p_certificados: string[]
        }
        Returns: string
      }
      hoy: {
        Args: never
        Returns: string
      }
      informar_pago: {
        Args: {
          p_pago: string
          p_medio: Database["public"]["Enums"]["medio_pago"]
          p_numero_operacion: string
          p_fecha_pago: string
          p_comprobante_path: string
        }
        Returns: undefined
      }
      informe_recaudacion: {
        Args: {
          p_anio: number
          p_mes: number
        }
        Returns: Json
      }
      inscribir_capacitacion: {
        Args: {
          p_capacitacion: string
          p_nombre: string
          p_dni: string
          p_email: string
          p_empresa?: string
          p_empresa_id?: string
        }
        Returns: Json
      }
      parametro_int: {
        Args: {
          p_clave: string
          p_defecto: number
        }
        Returns: number
      }
      portal_capacitaciones: {
        Args: never
        Returns: {
            id: string | null
            titulo: string | null
            descripcion: string | null
            modalidad: Database["public"]["Enums"]["modalidad_capacitacion"] | null
            lugar: string | null
            fecha_inicio: string | null
            duracion_horas: number | null
            cupo: number | null
            estado: Database["public"]["Enums"]["estado_capacitacion"] | null
            destinatarios: string | null
            inscriptos: number | null
          }[]
      }
      portal_empresa: {
        Args: {
          p_id: string
        }
        Returns: Json
      }
      portal_empresas: {
        Args: never
        Returns: {
            id: string | null
            numero_registro: number | null
            nombre_comercial: string | null
            titular: string | null
            cuit: string | null
            telefono: string | null
            email: string | null
            domicilio_oficina: string | null
            habilitacion_comercial: string | null
            resolucion_dsa: string | null
            habilita_fumigacion: boolean | null
            habilita_tanques: boolean | null
            vencimiento_habilitacion: string | null
          }[]
      }
      portal_estadisticas: {
        Args: never
        Returns: Json
      }
      presentar_declaracion: {
        Args: {
          p_declaracion: string
        }
        Returns: undefined
      }
      puede_controlar: {
        Args: never
        Returns: boolean
      }
      rechazar_declaracion: {
        Args: {
          p_declaracion: string
          p_motivo: string
        }
        Returns: undefined
      }
      resolver_tramite: {
        Args: {
          p_tramite: string
          p_decision: string
          p_observaciones?: string
          p_resolucion?: string
        }
        Returns: undefined
      }
      rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      siguiente_codigo: {
        Args: {
          p_prefijo: string
        }
        Returns: string
      }
      siguiente_numero: {
        Args: {
          p_prefijo: string
        }
        Returns: number
      }
      solicitar_inscripcion: {
        Args: {
          p_datos: Json
        }
        Returns: string
      }
      sufijo_aleatorio: {
        Args: never
        Returns: string
      }
      sumar_dias_habiles: {
        Args: {
          p_desde: string
          p_dias: number
        }
        Returns: string
      }
      tecnico_actual: {
        Args: never
        Returns: string
      }
      tiene_rol: {
        Args: {
          p_roles: Database["public"]["Enums"]["rol_usuario"][]
        }
        Returns: boolean
      }
      verificar_certificado: {
        Args: {
          p_codigo: string
        }
        Returns: Json
      }
      verificar_limite_envio: {
        Args: {
          p_accion: string
          p_clave: string
          p_max: number
          p_minutos: number
        }
        Returns: boolean
      }
      verificar_pago: {
        Args: {
          p_pago: string
          p_aprobar: boolean
          p_observaciones?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      clase_producto: "insecticida" | "rodenticida" | "desinfectante" | "larvicida" | "fungicida" | "otro"
      estado_acta: "labrada" | "elevada" | "resuelta" | "anulada"
      estado_capacitacion: "abierta" | "cerrada" | "finalizada" | "cancelada"
      estado_certificado: "borrador" | "declarado" | "observado" | "controlado" | "timbrado" | "anulado"
      estado_declaracion: "borrador" | "presentada" | "observada" | "controlada" | "rechazada"
      estado_denuncia: "recibida" | "en_curso" | "inspeccion_programada" | "cerrada" | "desestimada"
      estado_documento: "pendiente" | "aprobado" | "rechazado"
      estado_empresa: "en_tramite" | "habilitada" | "observada" | "suspendida" | "vencida" | "baja"
      estado_inspeccion: "programada" | "realizada" | "cancelada"
      estado_memoria: "propuesto" | "aprobado" | "rechazado"
      estado_notificacion: "emitida" | "notificada" | "cumplida" | "acta_labrada" | "anulada"
      estado_pago: "pendiente" | "informado" | "verificado" | "rechazado" | "anulado"
      estado_tecnico: "pendiente" | "aprobado" | "rechazado" | "baja"
      estado_tramite: "borrador" | "presentado" | "observado" | "aprobado" | "rechazado"
      medio_pago: "transferencia" | "boleta" | "plataforma_electronica"
      modalidad_capacitacion: "presencial" | "virtual" | "mixta"
      motivo_acta: "certificado_vencido" | "sin_certificado" | "empresa_no_habilitada" | "incumplimiento_notificacion" | "tanque_sin_limpieza" | "servicio_irregular" | "otro"
      movimiento_envase: "generado" | "entregado"
      nivel_aviso: "info" | "alerta" | "urgente"
      organismo_registro: "ANMAT" | "SENASA"
      periodicidad: "mensual" | "bimestral" | "trimestral" | "cuatrimestral" | "semestral" | "anual" | "unica_vez"
      plazo_notificacion: "cinco_dias_habiles" | "cuarenta_ocho_horas_habiles"
      resultado_inspeccion: "conforme" | "no_conforme" | "ausente"
      rol_usuario: "admin" | "control" | "inspector" | "empresa" | "tecnico"
      tipo_denuncia: "empresa_no_habilitada" | "servicio_mal_realizado" | "establecimiento_sin_certificado" | "envases_descartados" | "tanque_sin_limpieza" | "otro"
      tipo_documento: "constancia_cuit" | "dni_titular" | "titulo_tecnico" | "carnet_sanidad" | "memoria_tecnica" | "habilitacion_comercial" | "plano_local" | "ddjj_anual" | "libre_deuda" | "seguro" | "analisis_agua" | "otro"
      tipo_inspeccion: "muestreo_servicio" | "control_vencimiento" | "deposito_anual" | "habilitacion" | "denuncia" | "reinspeccion"
      tipo_notificacion: "tanques" | "fumigacion" | "documentacion" | "general"
      tipo_servicio: "fumigacion" | "tanque"
      tipo_tramite: "inscripcion" | "renovacion" | "cambio_tecnico" | "cambio_domicilio" | "alta_producto" | "baja"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]

export const Constants = {
  public: {
    Enums: {
      clase_producto: ["insecticida", "rodenticida", "desinfectante", "larvicida", "fungicida", "otro"],
      estado_acta: ["labrada", "elevada", "resuelta", "anulada"],
      estado_capacitacion: ["abierta", "cerrada", "finalizada", "cancelada"],
      estado_certificado: ["borrador", "declarado", "observado", "controlado", "timbrado", "anulado"],
      estado_declaracion: ["borrador", "presentada", "observada", "controlada", "rechazada"],
      estado_denuncia: ["recibida", "en_curso", "inspeccion_programada", "cerrada", "desestimada"],
      estado_documento: ["pendiente", "aprobado", "rechazado"],
      estado_empresa: ["en_tramite", "habilitada", "observada", "suspendida", "vencida", "baja"],
      estado_inspeccion: ["programada", "realizada", "cancelada"],
      estado_memoria: ["propuesto", "aprobado", "rechazado"],
      estado_notificacion: ["emitida", "notificada", "cumplida", "acta_labrada", "anulada"],
      estado_pago: ["pendiente", "informado", "verificado", "rechazado", "anulado"],
      estado_tecnico: ["pendiente", "aprobado", "rechazado", "baja"],
      estado_tramite: ["borrador", "presentado", "observado", "aprobado", "rechazado"],
      medio_pago: ["transferencia", "boleta", "plataforma_electronica"],
      modalidad_capacitacion: ["presencial", "virtual", "mixta"],
      motivo_acta: ["certificado_vencido", "sin_certificado", "empresa_no_habilitada", "incumplimiento_notificacion", "tanque_sin_limpieza", "servicio_irregular", "otro"],
      movimiento_envase: ["generado", "entregado"],
      nivel_aviso: ["info", "alerta", "urgente"],
      organismo_registro: ["ANMAT", "SENASA"],
      periodicidad: ["mensual", "bimestral", "trimestral", "cuatrimestral", "semestral", "anual", "unica_vez"],
      plazo_notificacion: ["cinco_dias_habiles", "cuarenta_ocho_horas_habiles"],
      resultado_inspeccion: ["conforme", "no_conforme", "ausente"],
      rol_usuario: ["admin", "control", "inspector", "empresa", "tecnico"],
      tipo_denuncia: ["empresa_no_habilitada", "servicio_mal_realizado", "establecimiento_sin_certificado", "envases_descartados", "tanque_sin_limpieza", "otro"],
      tipo_documento: ["constancia_cuit", "dni_titular", "titulo_tecnico", "carnet_sanidad", "memoria_tecnica", "habilitacion_comercial", "plano_local", "ddjj_anual", "libre_deuda", "seguro", "analisis_agua", "otro"],
      tipo_inspeccion: ["muestreo_servicio", "control_vencimiento", "deposito_anual", "habilitacion", "denuncia", "reinspeccion"],
      tipo_notificacion: ["tanques", "fumigacion", "documentacion", "general"],
      tipo_servicio: ["fumigacion", "tanque"],
      tipo_tramite: ["inscripcion", "renovacion", "cambio_tecnico", "cambio_domicilio", "alta_producto", "baja"],
    },
  },
} as const
