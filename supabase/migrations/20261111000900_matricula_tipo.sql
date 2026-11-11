-- Constancia de matrícula profesional al día del asesor técnico (CIAZT para ingenieros agrónomos).
-- Va en su propia migración: un valor nuevo de enum no puede usarse en la misma transacción que lo crea.
alter type public.tipo_documento add value if not exists 'constancia_matricula' after 'titulo_tecnico';
