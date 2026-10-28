"use client";

import { ErrorModulo } from "./_components/error-modulo";

export default function ErrorLegajo({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorModulo error={error} retry={retry} titulo="No pudimos cargar el legajo" />;
}
