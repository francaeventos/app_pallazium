import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMenusPageDataFn, registerMenuInterestFn, type MenuRow } from "@/fns/menus";
import { useMyEvent } from "@/hooks/use-my-event";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Check, ChevronLeft, ChevronRight, ChefHat, Images, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/cardapios")({ component: Page });

function Page() {
  const { data } = useMyEvent();
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [interests, setInterests] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuRow | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { menus: menuRows, interests: interestRows } = await getMenusPageDataFn();
      setMenus(menuRows);
      setInterests(new Map(interestRows.map((item) => [item.menu_id, item.status])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [data?.client?.id, data?.event?.id]);

  const chooseMenu = async (menuId: string) => {
    if (!data?.client || !data.event) return toast.error("Evento não vinculado.");
    try {
      await registerMenuInterestFn({
        data: { menuId, eventId: data.event.id },
      });
      toast.success("Interesse em cardápio registrado.");
      setInterests((current) => new Map(current).set(menuId, "novo"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar interesse";
      if (message === "DUPLICATE") {
        return toast.info("Este cardápio já está registrado para o seu evento.");
      }
      toast.error(message);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const byCat: Record<string, MenuRow[]> = {};
  menus.forEach((menu) => {
    (byCat[menu.category] ||= []).push(menu);
  });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-6xl mx-auto">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Gastronomia</p>
        <h1 className="font-serif text-4xl mt-2">Cardápios disponíveis</h1>
        <p className="text-muted-foreground mt-2">
          Salve os cardápios que combinam com o seu evento para a equipe comercial acompanhar.
        </p>
      </div>

      {menus.length === 0 && (
        <ClientEmptyState
          icon={ChefHat}
          title="Cardápios em preparação"
          description="A equipe Pallazium publica as opções gastronômicas conforme a curadoria do evento. Assim que houver cardápios ativos, você poderá visualizar os detalhes e registrar interesse por aqui."
        />
      )}

      {Object.entries(byCat).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-serif text-2xl mb-4 capitalize">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((m) => (
              <Card key={m.id} className="overflow-hidden hover:shadow-luxe transition-shadow">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => {
                    setSelectedMenu(m);
                    setSelectedImageIndex(0);
                  }}
                >
                  {menuImages(m)[0] ? (
                    <div
                      className="relative h-40 bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${menuImages(m)[0]})` }}
                    >
                      {menuImages(m).length > 1 && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-background/90 px-3 py-1 text-xs text-foreground shadow-soft">
                          {menuImages(m).length} fotos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-40 bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="h-8 w-8 text-gold" />
                    </div>
                  )}
                </button>
                <CardContent className="p-5 flex min-h-56 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{m.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {m.category}
                    </Badge>
                  </div>
                  {m.description && (
                    <p className="text-sm text-muted-foreground mt-2">{m.description}</p>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-left text-xs text-gold"
                    onClick={() => {
                      setSelectedMenu(m);
                      setSelectedImageIndex(0);
                    }}
                  >
                    Abrir fotos e detalhes
                  </button>
                  {m.items && (
                    <p className="text-xs text-muted-foreground mt-3 border-t pt-3 whitespace-pre-line">
                      {m.items}
                    </p>
                  )}
                  {m.notes && <p className="text-xs text-muted-foreground mt-3">{m.notes}</p>}
                  <div className="mt-auto pt-4">
                    <Button
                      size="sm"
                      className="w-full"
                      variant={interests.has(m.id) ? "outline" : "default"}
                      disabled={interests.has(m.id) || !data?.event}
                      onClick={() => chooseMenu(m.id)}
                    >
                      {interests.has(m.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Registrado
                        </>
                      ) : (
                        "Tenho interesse"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <MenuGalleryDialog
        menu={selectedMenu}
        imageIndex={selectedImageIndex}
        onImageIndexChange={setSelectedImageIndex}
        onClose={() => setSelectedMenu(null)}
        isSelected={selectedMenu ? interests.has(selectedMenu.id) : false}
        canChoose={!!data?.event}
        onChoose={(menuId) => chooseMenu(menuId)}
      />
    </div>
  );
}

function MenuGalleryDialog({
  menu,
  imageIndex,
  onImageIndexChange,
  onClose,
  isSelected,
  canChoose,
  onChoose,
}: {
  menu: MenuRow | null;
  imageIndex: number;
  onImageIndexChange: (index: number) => void;
  onClose: () => void;
  isSelected: boolean;
  canChoose: boolean;
  onChoose: (menuId: string) => void;
}) {
  const images = menu ? menuImages(menu) : [];
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
    <Dialog open={!!menu} onOpenChange={(open) => !open && onClose()}>
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
                        onClick={() => onImageIndexChange(index)}
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

            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                {menu.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {menu.description}
                  </p>
                )}
                {menu.items && (
                  <p className="rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-line text-muted-foreground">
                    {menu.items}
                  </p>
                )}
              </div>
              <Button
                className="lg:self-start"
                variant={isSelected ? "outline" : "default"}
                disabled={isSelected || !canChoose}
                onClick={() => onChoose(menu.id)}
              >
                {isSelected ? (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Registrado
                  </>
                ) : (
                  "Tenho interesse"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function menuImages(menu: MenuRow) {
  return (menu.images?.length ? menu.images : menu.image_url ? [menu.image_url] : []).filter(
    Boolean,
  );
}
