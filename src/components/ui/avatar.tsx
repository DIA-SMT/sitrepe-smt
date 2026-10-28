import { cn, iniciales } from "@/lib/utils";

const gradientes = [
  "from-azul-600 to-celeste-500",
  "from-noche-700 to-azul-600",
  "from-celeste-600 to-azul-500",
  "from-violet-600 to-azul-600",
  "from-emerald-600 to-celeste-600",
  "from-azul-700 to-violet-500",
];

function hash(texto: string) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
} as const;

export type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Nombre completo: se usa para las iniciales y para elegir un color estable. */
  nombre: string;
  size?: keyof typeof sizes;
  /** Muestra un indicador de estado (en línea). */
  online?: boolean;
};

/** Avatar con iniciales sobre un degradé de marca determinístico. */
export function Avatar({ nombre, size = "md", online, className, ...props }: AvatarProps) {
  const grad = gradientes[hash(nombre) % gradientes.length];
  return (
    <span
      data-slot="avatar"
      role="img"
      aria-label={nombre}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-display font-semibold text-white ring-2 ring-white select-none",
        grad,
        sizes[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden>{iniciales(nombre)}</span>
      {online ? (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
      ) : null}
    </span>
  );
}
