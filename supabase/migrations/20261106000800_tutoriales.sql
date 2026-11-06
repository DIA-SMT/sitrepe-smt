-- =============================================================================
-- Centro de ayuda: videos tutoriales, subtítulos y manuales de operación.
--   tutoriales/videos/tutorial-NN.mp4 · .vtt · .jpg
--   tutoriales/manuales/{archivo}.pdf
-- Lectura pública (se muestran en el portal y en las áreas internas). Se cargan con la clave
-- secreta (script de despliegue), así que no hay políticas de alta ni de baja para usuarios.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutoriales', 'tutoriales', true, 52428800, array['video/mp4', 'text/vtt', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

create policy "tutoriales_lectura" on storage.objects for select to anon, authenticated
  using (bucket_id = 'tutoriales');
