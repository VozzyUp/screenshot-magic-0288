import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function MoneyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  className,
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder={placeholder}
      className={cn("text-right tabular-nums", className)}
      value={value === null ? "" : "R$ " + fmt.format(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
        onChange(digits ? parseInt(digits, 10) / 100 : null);
      }}
    />
  );
}
