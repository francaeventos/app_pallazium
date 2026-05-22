import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type ClientEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function ClientEmptyState({ icon: Icon, title, description }: ClientEmptyStateProps) {
  return (
    <Card className="border-gold/30 bg-card/95 shadow-soft">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne text-gold">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="font-serif text-2xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
