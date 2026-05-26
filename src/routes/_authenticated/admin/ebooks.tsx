import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { deleteEbookFn, listEbooksFn, toggleEbookFn } from "@/fns/admin-catalog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/file-base64";
import { saveEbookFn } from "@/fns/save-ebook";

export const Route = createFileRoute("/_authenticated/admin/ebooks")({
  component: Page,
});

type Ebook = Awaited<ReturnType<typeof listEbooksFn>>[number];

type FormState = {
  title: string;
  description: string;
  cover_url: string;
  file_url: string;
};

const emptyForm: FormState = { title: "", description: "", cover_url: "", file_url: "" };

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Page() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ebook | null>(null);
  const [removing, setRemoving] = useState<Ebook | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "file", string>>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!editing;

  const load = async () => {
    setLoading(true);
    try {
      setEbooks(await listEbooksFn());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os ebooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setPendingFile(null);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (eb: Ebook) => {
    setEditing(eb);
    setForm({
      title: eb.title,
      description: eb.description ?? "",
      cover_url: eb.cover_url ?? "",
      file_url: eb.file_url,
    });
    setPendingFile(null);
    setErrors({});
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setPendingFile(null);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = "Título é obrigatório";
    if (!isEditMode && !pendingFile && !form.file_url.trim()) {
      e.file = "Selecione um PDF ou informe a URL do arquivo";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (saving || uploading) return;
    if (!validate()) return;

    setSaving(true);
    setUploading(!!pendingFile);

    try {
      let fileBase64: string | undefined;
      if (pendingFile) {
        fileBase64 = await fileToBase64(pendingFile);
      }

      await saveEbookFn({
        data: {
          id: editing?.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          cover_url: form.cover_url.trim() || undefined,
          externalFileUrl: !pendingFile && !isEditMode ? form.file_url.trim() || undefined : undefined,
          fileName: pendingFile?.name,
          fileBase64,
          contentType: pendingFile?.type || "application/pdf",
        },
      });

      toast.success(isEditMode ? "Ebook atualizado" : "Ebook publicado");
      closeDialog();
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o ebook.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const toggleActive = async (eb: Ebook) => {
    try {
      await toggleEbookFn({ data: { id: eb.id, active: !eb.active } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
    }
    toast.success(eb.active ? "Ebook ocultado dos clientes" : "Ebook visível para clientes");
    load();
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await deleteEbookFn({ data: { id: removing.id } });
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
    toast.success("Ebook removido");
    setRemoving(null);
    load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="font-serif text-4xl text-foreground">Ebooks</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Envie materiais em PDF para os clientes baixarem na Área VIP.
          </p>
        </div>
        <Button
          size="lg"
          className="shadow-soft hover:shadow-luxe transition-shadow rounded-full px-6"
          onClick={openNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo ebook
        </Button>
      </header>

      {/* Lista */}
      <Card className="rounded-2xl shadow-soft border-border/70 overflow-hidden">
        <div className="px-5 sm:px-6 py-5 border-b bg-gradient-to-b from-card to-muted/20">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-xl">Materiais publicados</h2>
            <span className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${ebooks.length} ${ebooks.length === 1 ? "ebook" : "ebooks"}`}
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
              Carregando ebooks...
            </div>
          ) : ebooks.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={BookOpen}
                title="Nenhum ebook ainda"
                description="Publique materiais em PDF para seus clientes acessarem na Área VIP."
                actionLabel="Novo ebook"
                onAction={openNew}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {ebooks.map((eb) => (
                <li
                  key={eb.id}
                  className="px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Capa ou ícone */}
                    <div className="h-14 w-10 shrink-0 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                      {eb.cover_url ? (
                        <img
                          src={eb.cover_url}
                          alt={eb.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-base text-foreground leading-tight truncate">
                          {eb.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            eb.active
                              ? "text-xs bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "text-xs bg-muted text-muted-foreground border-border"
                          }
                        >
                          {eb.active ? "Visível" : "Oculto"}
                        </Badge>
                      </div>
                      {eb.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {eb.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{eb.file_name}</span>
                        {eb.file_size && <span>{formatBytes(eb.file_size)}</span>}
                        <span>Adicionado em {formatDate(eb.created_at)}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle visibilidade */}
                      <div className="hidden sm:flex items-center gap-2">
                        <Switch
                          checked={eb.active}
                          onCheckedChange={() => toggleActive(eb)}
                          aria-label={eb.active ? "Ocultar dos clientes" : "Tornar visível"}
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {eb.active ? "Visível" : "Oculto"}
                        </span>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild>
                            <a href={eb.file_url} target="_blank" rel="noreferrer">
                              <Download className="h-4 w-4 mr-2" /> Abrir PDF
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(eb)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(eb)}>
                            {eb.active ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" /> Ocultar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" /> Tornar visível
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemoving(eb)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Novo / Editar */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-2xl shadow-luxe overflow-hidden border-gold/20">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-card">
            <DialogTitle className="font-serif text-2xl">
              {isEditMode ? "Editar ebook" : "Novo ebook"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Altere as informações ou substitua o arquivo PDF."
                : "Envie um PDF ou informe a URL do arquivo para publicar na Área VIP."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-6 py-6 space-y-5 max-h-[65vh] overflow-y-auto">

              {/* Upload de PDF */}
              <div className="space-y-2">
                <Label>
                  {isEditMode ? "Substituir arquivo PDF" : "Arquivo PDF"}
                </Label>
                <div
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer hover:bg-muted/50 ${errors.file ? "border-destructive" : "border-border"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {pendingFile ? (
                    <>
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{pendingFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Remover
                      </Button>
                    </>
                  ) : isEditMode && editing?.file_name ? (
                    <>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Arquivo atual:</p>
                        <p className="font-medium text-sm">{editing.file_name}</p>
                        {editing.file_size && (
                          <p className="text-xs text-muted-foreground">{formatBytes(editing.file_size)}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Clique para substituir</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">Clique para selecionar</p>
                        <p className="text-xs text-muted-foreground">PDF até 50 MB</p>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.type !== "application/pdf") {
                        toast.error("Selecione um arquivo PDF.");
                        return;
                      }
                      if (file.size > 50 * 1024 * 1024) {
                        toast.error("O arquivo deve ter no máximo 50 MB.");
                        return;
                      }
                      setPendingFile(file);
                      setForm((f) => ({ ...f, file_url: "" }));
                      setErrors((e) => ({ ...e, file: undefined }));
                    }}
                  />
                </div>
                {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
              </div>

              {!isEditMode && (
                <div className="space-y-1.5">
                  <Label>
                    URL do PDF{" "}
                    <span className="text-muted-foreground font-normal">(alternativa ao upload)</span>
                  </Label>
                  <Input
                    value={form.file_url}
                    placeholder="https://..."
                    className="h-11"
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => ({ ...f, file_url: value }));
                      if (value.trim()) {
                        setPendingFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        setErrors((prev) => ({ ...prev, file: undefined }));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use se o upload falhar — cole o link direto do PDF (Google Drive, Dropbox, etc.).
                  </p>
                </div>
              )}

              {/* Título */}
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  maxLength={120}
                  placeholder="Ex: Guia de Decoração para Casamentos"
                  className="h-11"
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea
                  value={form.description}
                  maxLength={400}
                  rows={3}
                  placeholder="Breve descrição do conteúdo do material..."
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* URL da capa */}
              <div className="space-y-1.5">
                <Label>URL da capa <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  value={form.cover_url}
                  placeholder="https://..."
                  className="h-11"
                  onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
                />
                {form.cover_url && (
                  <img
                    src={form.cover_url}
                    alt="Prévia da capa"
                    className="h-28 w-auto rounded-lg object-cover border"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/30 gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving || uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading} className="min-w-[160px] shadow-soft">
                {(saving || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {uploading ? "Enviando PDF..." : saving ? "Salvando..." : isEditMode ? "Salvar alterações" : "Publicar ebook"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ebook?</AlertDialogTitle>
            <AlertDialogDescription>
              O ebook <strong>{removing?.title}</strong> será removido da Área VIP dos clientes.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
