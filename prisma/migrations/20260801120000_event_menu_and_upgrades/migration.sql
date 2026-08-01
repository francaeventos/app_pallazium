-- AlterTable
ALTER TABLE "events" ADD COLUMN "menu_id" UUID;

-- CreateTable
CREATE TABLE "event_upgrades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "upgrade_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_upgrades_event_id_upgrade_id_key" ON "event_upgrades"("event_id", "upgrade_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_upgrades" ADD CONSTRAINT "event_upgrades_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_upgrades" ADD CONSTRAINT "event_upgrades_upgrade_id_fkey" FOREIGN KEY ("upgrade_id") REFERENCES "upgrades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
