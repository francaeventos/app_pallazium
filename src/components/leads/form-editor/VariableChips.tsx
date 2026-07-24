import { Variable } from "lucide-react";
import { toast } from "sonner";

export type VariableToken = { token: string; label: string };

export function VariableChips({
  tokens,
  onInsert,
  className,
}: {
  tokens: readonly VariableToken[];
  onInsert: (token: string) => void;
  className?: string;
}) {
  const handleClick = async (token: string) => {
    onInsert(token);
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`${token} inserido e copiado`);
    } catch {
      toast.message(`Use: ${token}`);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className || ""}`}>
      {tokens.map((t) => (
        <button
          key={t.token}
          type="button"
          onClick={() => handleClick(t.token)}
          title={`Inserir ${t.token}`}
          className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-champagne/30 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-gold/60 hover:bg-champagne/50"
        >
          <Variable className="h-3 w-3" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
