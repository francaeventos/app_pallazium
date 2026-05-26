import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const financialStatusOptions = [
  { label: "Em aberto", sortOrder: 0 },
  { label: "Sinal pago", sortOrder: 1 },
  { label: "Parcialmente pago", sortOrder: 2 },
  { label: "Pago", sortOrder: 3 },
  { label: "Vencido", sortOrder: 4 },
  { label: "Cancelado", sortOrder: 5 },
];

async function main() {
  for (const option of financialStatusOptions) {
    await db.financialStatusOption.upsert({
      where: { label: option.label },
      update: { sortOrder: option.sortOrder },
      create: option,
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
