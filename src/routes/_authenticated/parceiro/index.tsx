import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getOwnPartnerFn, updateOwnPartnerFn } from "@/fns/partner-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StorageImageInput, StorageImagesTextarea } from "@/components/StorageImageInput";
import { Eye, Handshake, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parceiro/")({ component: Page });

type Partner = Awaited<ReturnType<typeof getOwnPartnerFn>>["partner"];

function Page() {
  const [partner, setPartner] = useState<Partner>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { partner } = await getOwnPartnerFn();
      setPartner(partner);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar seu perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const updated = await updateOwnPartnerFn({
        data: {
          name: String(fd.get("name") || ""),
          category: String(fd.get("category") || ""),
          description: String(fd.get("description") || "") || null,
          phone: String(fd.get("phone") || "") || null,
          whatsapp: String(fd.get("whatsapp") || "") || null,
          instagram: String(fd.get("instagram") || "") || null,
          website_url: String(fd.get("website_url") || "") || null,
          image_url: String(fd.get("image_url") || "") || null,
          logo_url: String(fd.get("logo_url") || "") || null,
          gallery_urls: String(fd.get("gallery_urls") || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 4),
        },
      });
      setPartner(updated);
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Carregando…</div>;
  }

  if (!partner) {
    return (
      <div className="p-6 lg:p-12">
        <ClientEmptyState
          icon={Handshake}
          title="Sua conta ainda não está vinculada"
          description="Fale com a equipe Espaço Pallazium para vincular sua conta ao cadastro do seu negócio. Assim que isso acontecer, você poderá editar seu perfil de parceiro por aqui."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Painel do Parceiro
          </p>
          <h1 className="mt-2 font-serif text-4xl">{partner.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={partner.active ? "default" : "outline"}>
            {partner.active ? "Visível para clientes" : "Oculto"}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/parceiro/preview">
              <Eye className="h-4 w-4" />
              Ver como o cliente vê
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-gold/15 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Meu perfil</CardTitle>
          <CardDescription>
            Essas informações aparecem para os clientes do Espaço Pallazium na vitrine de
            parceiros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input name="name" required defaultValue={partner.name} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input name="category" required defaultValue={partner.category} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea name="description" defaultValue={partner.description ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={partner.phone ?? ""} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input name="whatsapp" defaultValue={partner.whatsapp ?? ""} />
              </div>
            </div>
            <div>
              <Label>Instagram</Label>
              <Input name="instagram" defaultValue={partner.instagram ?? ""} />
            </div>
            <div>
              <Label>Site</Label>
              <Input
                name="website_url"
                type="url"
                placeholder="https://..."
                defaultValue={partner.website_url ?? ""}
              />
            </div>
            <div>
              <StorageImageInput
                bucket="catalogos"
                name="image_url"
                label="Imagem principal"
                defaultValue={partner.image_url ?? ""}
                folder="parceiros"
                recommendedSize="600 x 600 pixels"
                previewClassName="aspect-square w-full max-w-[220px] rounded-xl border bg-muted bg-cover bg-center"
              />
            </div>
            <div>
              <StorageImageInput
                bucket="catalogos"
                name="logo_url"
                label="Logo"
                defaultValue={partner.logo_url ?? ""}
                folder="parceiros/logos"
                recommendedSize="400 x 400 pixels"
                previewClassName="h-28 w-28 rounded-full border bg-muted bg-cover bg-center"
              />
            </div>
            <div>
              <StorageImagesTextarea
                bucket="catalogos"
                name="gallery_urls"
                label="Galeria de fotos"
                defaultValue={(partner.gallery_urls ?? []).join("\n")}
                folder="parceiros/galeria"
                maxImages={4}
                itemClassName="aspect-square rounded-lg bg-muted bg-cover bg-center"
                gridClassName="grid grid-cols-4 gap-2"
                recommendedSize="600 x 600 pixels"
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
