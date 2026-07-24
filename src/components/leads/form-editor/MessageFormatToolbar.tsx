import { Bold } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wrapWithBoldMarkers } from "@/lib/leads/variables";
import { VariableChips, type VariableToken } from "./VariableChips";

/** Aplica *negrito* na seleção do textarea focado, ou adiciona placeholder. */
export function applyBoldToValue(value: string, onChange: (next: string) => void) {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = wrapWithBoldMarkers(value, start, end);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
    return;
  }
  const next = wrapWithBoldMarkers(value, value.length, value.length);
  onChange(next.value);
}

export function MessageFormatBar({
  value,
  onChange,
  tokens,
}: {
  value: string;
  onChange: (next: string) => void;
  tokens?: readonly VariableToken[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyBoldToValue(value, onChange)}
          title="Negrito (*texto*)"
        >
          <Bold className="h-3.5 w-3.5" />
          Negrito
        </Button>
        {tokens && tokens.length > 0 ? (
          <VariableChips
            tokens={tokens}
            onInsert={(token) => onChange(value ? `${value} ${token}` : token)}
          />
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Selecione um trecho e clique em Negrito, ou escreva <code className="rounded bg-muted px-1">*assim*</code>{" "}
        (estilo WhatsApp).
      </p>
    </div>
  );
}
