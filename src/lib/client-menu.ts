import {
  BookOpen,
  UtensilsCrossed,
  Sparkles,
  Images,
  Users,
  Lightbulb,
  GalleryHorizontalEnd,
  MailCheck,
  ListChecks,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

export type ClientMenuKey =
  | "checklist"
  | "pendencias"
  | "convites"
  | "cardapios"
  | "upgrades"
  | "referencias"
  | "parceiros"
  | "dicas"
  | "ebook"
  | "portfolio";

export type ClientMenuItem = {
  key: ClientMenuKey;
  to: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Itens do menu lateral da Área VIP que podem ser ligados/desligados em
 * ADM → Configurações. "Painel" não entra aqui de propósito: é a home do
 * cliente e deve ficar sempre visível.
 */
export const CLIENT_MENU_ITEMS: ClientMenuItem[] = [
  { key: "checklist", to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { key: "pendencias", to: "/app/pendencias", label: "Pendências", icon: AlertCircle },
  { key: "convites", to: "/app/convites", label: "Convites", icon: MailCheck },
  { key: "cardapios", to: "/app/cardapios", label: "Cardápios", icon: UtensilsCrossed },
  { key: "upgrades", to: "/app/upgrades", label: "Upgrades", icon: Sparkles },
  { key: "referencias", to: "/app/referencias", label: "Referências", icon: Images },
  { key: "parceiros", to: "/app/parceiros", label: "Parceiros", icon: Users },
  { key: "dicas", to: "/app/dicas", label: "Dicas", icon: Lightbulb },
  { key: "ebook", to: "/app/ebook", label: "Ebooks", icon: BookOpen },
  { key: "portfolio", to: "/app/portfolio", label: "Portfólio", icon: GalleryHorizontalEnd },
];

/** Item ausente do mapa = visível (comportamento atual, sem opt-in). */
export function isClientMenuItemVisible(
  visibility: Record<string, boolean>,
  key: ClientMenuKey,
) {
  return visibility[key] !== false;
}
