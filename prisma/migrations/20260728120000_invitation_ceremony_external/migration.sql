-- Cerimônia externa: por padrão cerimônia e recepção acontecem no Espaço Pallazium.
-- Quando marcado, o convite usa um local e mapa próprios para a cerimônia.
ALTER TABLE "event_invitations" ADD COLUMN "ceremony_external" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "event_invitations" ADD COLUMN "ceremony_map_url" TEXT;
