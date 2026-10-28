import { asistenteHabilitado, type AmbitoAsistente } from "@/lib/asistente/config";
import { AsistenteChat } from "./asistente-chat";

/** Chat flotante de Migue. No se muestra si el servidor no tiene configurada la clave de OpenRouter. */
export function Asistente({ ambito }: { ambito: AmbitoAsistente }) {
  if (!asistenteHabilitado()) return null;
  return <AsistenteChat ambito={ambito} />;
}
