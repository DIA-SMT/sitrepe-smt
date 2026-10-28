"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";

export type CampoClaveProps = Omit<InputProps, "type" | "leading" | "trailing">;

/**
 * Campo de contraseña con botón para mostrar u ocultar el texto.
 * Reenvía `aria-invalid`/`aria-describedby` (los agrega `<Field>`).
 */
export function CampoClave(props: CampoClaveProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      leading={<LockKeyhole aria-hidden />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="-mr-1.5 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          aria-controls={props.id}
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      }
    />
  );
}
