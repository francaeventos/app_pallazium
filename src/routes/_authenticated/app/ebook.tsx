import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listActiveEbooksFn, type EbookRow } from "@/fns/catalog";
import { ClientEmptyState } from "@/components/ClientEmptyState";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/ebook")({
  component: Page,
});

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Page() {
  const [ebooks, setEbooks] = useState<EbookRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listActiveEbooksFn();
        setEbooks(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
      <header className="space-y-1.5">
        <h1 className="font-serif text-4xl text-foreground">Ebooks</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Materiais exclusivos preparados para você. Baixe gratuitamente.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando materiais...
        </div>
      ) : ebooks.length === 0 ? (
        <ClientEmptyState
          icon={BookOpen}
          title="Nenhum material disponível"
          description="Em breve você terá acesso a guias e materiais exclusivos aqui."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ebooks.map((eb) => (
            <EbookCard key={eb.id} ebook={eb} />
          ))}
        </div>
      )}
    </div>
  );
}

function EbookCard({ ebook }: { ebook: EbookRow }) {
  const size = formatBytes(ebook.file_size);

  return (
    <div className="group rounded-2xl border bg-card shadow-soft overflow-hidden flex flex-col transition-shadow hover:shadow-luxe">
      <div className="relative h-44 bg-muted flex items-center justify-center overflow-hidden">
        {ebook.cover_url ? (
          <img
            src={ebook.cover_url}
            alt={ebook.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-30" />
            <span className="text-xs uppercase tracking-widest opacity-50">PDF</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="space-y-1.5 flex-1">
          <h3 className="font-serif text-lg leading-snug text-foreground">{ebook.title}</h3>
          {ebook.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{ebook.description}</p>
          )}
        </div>

        {size && <p className="text-xs text-muted-foreground">{size} · PDF</p>}

        <Button
          asChild
          className="w-full rounded-xl shadow-soft hover:shadow-luxe transition-shadow mt-auto"
        >
          <a href={ebook.file_url} target="_blank" rel="noreferrer" download>
            <Download className="h-4 w-4 mr-2" />
            Baixar gratuitamente
          </a>
        </Button>
      </div>
    </div>
  );
}
