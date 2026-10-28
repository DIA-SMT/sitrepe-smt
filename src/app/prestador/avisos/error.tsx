"use client";

import { ErrorModulo } from "../legajo/_components/error-modulo";

export default function ErrorAvisos({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorModulo error={error} retry={retry} titulo="No pudimos cargar los avisos" />;
}
