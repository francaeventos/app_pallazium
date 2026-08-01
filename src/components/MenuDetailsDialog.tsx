import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

export type MenuDetails = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  items: string | null;
  image_url: string | null;
  images: string[];
};

function menuImages(menu: MenuDetails) {
  return (menu.images?.length ? menu.images : menu.image_url ? [menu.image_url] : []).filter(
    Boolean,
  );
}

export function MenuDetailsDialog({
  menu,
  onClose,
}: {
  menu: MenuDetails | null;
  onClose: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = menu ? menuImages(menu) : [];
  const activeImage = images[imageIndex] ?? images[0];

  const goToPrevious = () => {
    if (images.length === 0) return;
    setImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const goToNext = () => {
    if (images.length === 0) return;
    setImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  return (
    <Dialog
      open={!!menu}
      onOpenChange={(open) => {
        if (!open) {
          setImageIndex(0);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        {menu && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl">{menu.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{menu.category} • Cardápio Pallazium</p>
            </DialogHeader>

            {activeImage ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border bg-muted">
                  <img
                    src={activeImage}
                    alt={`${menu.name} - foto ${imageIndex + 1}`}
                    className="max-h-[62vh] w-full object-contain"
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
                        onClick={() => setImageIndex(index)}
                      >
                        <img
                          src={image}
                          alt={`${menu.name} miniatura ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                <Images className="mx-auto mb-3 h-8 w-8 text-gold" />
                Este cardápio ainda não tem fotos publicadas.
              </div>
            )}

            <div className="space-y-3">
              {menu.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{menu.description}</p>
              )}
              {menu.items && (
                <p className="rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-line text-muted-foreground">
                  {menu.items}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
