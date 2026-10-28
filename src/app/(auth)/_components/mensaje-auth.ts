/**
 * Traduce los mensajes de Supabase Auth que `mensajeError` (src/lib/acciones.ts) deja pasar en inglés
 * (contraseña repetida o débil, límites de envío, sesión vencida…). Los demás mensajes quedan igual.
 */
const TRADUCCIONES: { patron: RegExp; mensaje: (m: RegExpMatchArray) => string }[] = [
  {
    patron: /should be different from the old password/i,
    mensaje: () => "La contraseña nueva tiene que ser distinta de la actual.",
  },
  {
    patron: /known to be weak|easy to guess|pwned/i,
    mensaje: () => "Esa contraseña es muy conocida y fácil de adivinar. Elegí otra.",
  },
  {
    patron: /password should contain at least one character of each/i,
    mensaje: () => "La contraseña tiene que combinar minúsculas, mayúsculas, números y símbolos.",
  },
  {
    patron: /password should be at least (\d+)/i,
    mensaje: (m) => `La contraseña tiene que tener al menos ${m[1]} caracteres.`,
  },
  {
    patron: /only request this after (\d+) seconds?/i,
    mensaje: (m) => `Por seguridad, esperá ${m[1]} segundos antes de volver a intentarlo.`,
  },
  {
    patron: /email rate limit exceeded|over_email_send_rate_limit/i,
    mensaje: () => "Enviamos demasiados correos en poco tiempo. Esperá unos minutos y volvé a intentarlo.",
  },
  {
    patron: /rate limit|too many requests/i,
    mensaje: () => "Hiciste demasiados intentos seguidos. Esperá unos minutos y volvé a intentarlo.",
  },
  {
    patron: /auth session missing|session.*(expired|not found)|invalid refresh token/i,
    mensaje: () => "Tu sesión venció. Volvé a ingresar o pedí un enlace nuevo para cambiar la contraseña.",
  },
  {
    patron: /reauthenticat/i,
    mensaje: () => "Por seguridad, cerrá la sesión y volvé a ingresar antes de cambiar la contraseña.",
  },
  {
    patron: /signups? not allowed|signup is disabled/i,
    mensaje: () => "El registro de cuentas está deshabilitado momentáneamente. Comunicate con la Dirección.",
  },
  {
    patron: /unable to validate email address|email address .* is invalid|invalid email/i,
    mensaje: () => "El correo no tiene un formato válido.",
  },
  {
    patron: /failed to fetch|fetch failed|network/i,
    mensaje: () => "No pudimos conectarnos con el servidor. Revisá tu conexión y volvé a intentarlo.",
  },
];

export function mensajeAuth(mensaje: string | undefined): string {
  if (!mensaje) return "";
  for (const t of TRADUCCIONES) {
    const m = mensaje.match(t.patron);
    if (m) return t.mensaje(m);
  }
  return mensaje;
}
