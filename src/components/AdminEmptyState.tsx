import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type AdminEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
};

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: AdminEmptyStateProps) {
  return (
    <Card className="border-gold/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne text-gold">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-serif text-2xl">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button size="lg" onClick={onAction} disabled={disabled}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
