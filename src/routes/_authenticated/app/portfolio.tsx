import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/portfolio")({ component: Page });

type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"];

function Page() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Inspiração real</p>
        <h1 className="font-serif text-4xl mt-2">Portfólio Pallazium</h1>
        <p className="text-muted-foreground mt-2">
          Eventos realizados para inspirar escolhas de decoração, gastronomia e experiência.
        </p>
      </div>

      {items.length === 0 && (
        <ClientEmptyState
          icon={Images}
          title="Portfólio em curadoria"
          description="A seleção de eventos realizados será publicada aqui para inspirar escolhas de estilo, decoração, gastronomia e experiência."
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const cover = item.images?.[0];
          return (
            <Card key={item.id} className="overflow-hidden">
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  setSelectedItem(item);
                  setSelectedImageIndex(0);
                }}
              >
                {cover ? (
                  <div
                    className="h-48 bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url(${cover})` }}
                  />
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <Images className="h-8 w-8 text-gold" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-xl">{item.event_name}</h2>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {item.event_type}
                  </p>
                  <p className="text-xs text-gold">
                    Clique para abrir{" "}
                    {item.images?.length ? `${item.images.length} foto(s)` : "o evento"}
                  </p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.highlights && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      {item.highlights}
                    </p>
                  )}
                  {item.images && item.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-2">
                      {item.images.slice(1, 4).map((image) => (
                        <div
                          key={image}
                          className="h-16 rounded-md bg-muted bg-cover bg-center"
                          style={{ backgroundImage: `url(${image})` }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>

      <PortfolioGalleryDialog
        item={selectedItem}
        imageIndex={selectedImageIndex}
        onImageIndexChange={setSelectedImageIndex}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

function PortfolioGalleryDialog({
  item,
  imageIndex,
  onImageIndexChange,
  onClose,
}: {
  item: PortfolioItem | null;
  imageIndex: number;
  onImageIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const images = item?.images ?? [];
  const activeImage = images[imageIndex] ?? images[0];

  const goToPrevious = () => {
    if (images.length === 0) return;
    onImageIndexChange(imageIndex === 0 ? images.length - 1 : imageIndex - 1);
  };

  const goToNext = () => {
    if (images.length === 0) return;
    onImageIndexChange(imageIndex === images.length - 1 ? 0 : imageIndex + 1);
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl">{item.event_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {item.event_type} • {item.category}
              </p>
            </DialogHeader>

            {activeImage ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border bg-muted">
                  <img
                    src={activeImage}
                    alt={`${item.event_name} - foto ${imageIndex + 1}`}
                    className="max-h-[65vh] w-full object-contain"
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        onClick={goToPrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={goToNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        className={`h-20 overflow-hidden rounded-xl border bg-muted ${
                          index === imageIndex ? "ring-2 ring-gold" : ""
                        }`}
                        onClick={() => onImageIndexChange(index)}
                      >
                        <img
                          src={image}
                          alt={`${item.event_name} miniatura ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                Este evento ainda não tem fotos publicadas.
              </div>
            )}

            {(item.description || item.highlights) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {item.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                {item.highlights && (
                  <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    {item.highlights}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
