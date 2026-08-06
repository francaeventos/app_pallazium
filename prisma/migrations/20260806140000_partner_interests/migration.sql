-- "Tenho interesse" no perfil do parceiro, sinaliza equipe Pallazium e o parceiro.
CREATE TABLE "partner_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partner_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "interest_status" NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_interests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_interests_unique_event_partner" ON "partner_interests"("client_id", "event_id", "partner_id");

ALTER TABLE "partner_interests" ADD CONSTRAINT "partner_interests_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_interests" ADD CONSTRAINT "partner_interests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_interests" ADD CONSTRAINT "partner_interests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
