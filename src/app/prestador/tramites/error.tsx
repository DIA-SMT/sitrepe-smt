"use client";

import { ErrorModulo } from "../legajo/_components/error-modulo";

export default function ErrorTramites({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorModulo error={error} retry={retry} titulo="No pudimos cargar tus trámites" />;
}
