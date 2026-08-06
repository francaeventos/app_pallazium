-- Preferências globais do sistema (ex.: menus visíveis na Área VIP)
CREATE TABLE IF NOT EXISTS "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "client_menu_visibility" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
