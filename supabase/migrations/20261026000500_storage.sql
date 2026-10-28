-- =============================================================================
-- Migración 5: almacenamiento de archivos (Supabase Storage).
--
-- Convención de rutas (la primera carpeta es siempre el id de la empresa):
--   documentos/{empresa_id}/legajo/{uuid}-{archivo}
--   documentos/{empresa_id}/certificados/{certificado_id}/{uuid}-{archivo}   (análisis de agua)
--   comprobantes/{empresa_id}/{pago_id}/{uuid}-{archivo}
--   envases/{empresa_id}/{uuid}-{archivo}
--   publico/noticias/{uuid}-{archivo}                                        (imágenes del portal)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('comprobantes', 'comprobantes', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('envases', 'envases', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('publico', 'publico', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "privados_lectura" on storage.objects for select to authenticated
  using (
    bucket_id in ('documentos', 'comprobantes', 'envases')
    and (
      (select public.es_staff())
      or (storage.foldername(name))[1] = (select public.empresa_actual())::text
    )
  );

create policy "privados_alta" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('documentos', 'comprobantes', 'envases')
    and (
      (select public.puede_controlar())
      or (storage.foldername(name))[1] = (select public.empresa_actual())::text
    )
  );

create policy "privados_baja" on storage.objects for delete to authenticated
  using (
    bucket_id in ('documentos', 'comprobantes', 'envases')
    and (storage.foldername(name))[1] = (select public.empresa_actual())::text
  );

create policy "publico_lectura" on storage.objects for select to anon, authenticated
  using (bucket_id = 'publico');

create policy "publico_alta" on storage.objects for insert to authenticated
  with check (bucket_id = 'publico' and (select public.puede_controlar()));

create policy "publico_baja" on storage.objects for delete to authenticated
  using (bucket_id = 'publico' and (select public.puede_controlar()));
