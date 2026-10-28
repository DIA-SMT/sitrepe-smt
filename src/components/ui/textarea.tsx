import { cn } from "@/lib/utils";
import { controlClasses } from "./input";

export function Textarea({ className, rows = 4, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(controlClasses, "field-sizing-content min-h-24 resize-y px-3 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}
