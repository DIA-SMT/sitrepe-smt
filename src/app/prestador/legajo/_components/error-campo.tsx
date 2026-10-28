import { CircleAlert } from "lucide-react";

/** Mensaje de error para controles que no usan <Field> (p. ej. <SubirArchivo>). */
export function ErrorCampo({ id, mensaje }: { id?: string; mensaje?: string | null }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="-mt-1 flex items-start gap-1.5 text-[13px] leading-snug font-medium text-danger">
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      {mensaje}
    </p>
  );
}
