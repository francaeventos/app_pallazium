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

type QuestionSeed = {
  key: string;
  type: "text" | "email" | "tel" | "choice" | "date";
  label?: string;
  prompt?: string;
  botMessages?: string[];
  placeholder?: string;
  sortOrder: number;
  scoreBonus?: number;
  options?: Array<{ label: string; scorePoints: number; sortOrder: number }>;
};

const bellaQuestions: QuestionSeed[] = [
  {
    key: "nome",
    type: "text",
    label: "NOME COMPLETO",
    prompt: "Vamos começar? Qual é o seu nome?",
    placeholder: "Digite seu nome e sobrenome...",
    botMessages: [
      "Olá! Eu sou a Bella Festa, assistente de atendimento do Espaço Pallazium. 😊",
      "Você acaba de encontrar um espaço completo, no Centro de Santo André, preparado para transformar sua celebração em um momento inesquecível — com excelente atendimento, gastronomia de qualidade e o melhor custo-benefício do ABC.",
      "Para preparar uma proposta personalizada de acordo com o seu evento, preciso conhecer alguns detalhes. É bem rápido e levará apenas alguns minutos!",
      "Vamos começar? Qual é o seu nome?",
    ],
    sortOrder: 0,
  },
  {
    key: "email",
    type: "email",
    label: "E-MAIL",
    prompt: "Qual o seu melhor e-mail?",
    placeholder: "voce@email.com",
    botMessages: ["Prazer, <b>{nome}</b>!"],
    sortOrder: 1,
  },
  {
    key: "whatsapp",
    type: "tel",
    label: "WHATSAPP",
    prompt: "E o seu melhor WhatsApp?",
    placeholder: "(11) 99999-9999",
    sortOrder: 2,
  },
  {
    key: "tipoEvento",
    type: "choice",
    prompt: "Para começar, qual será o tipo da sua celebração?",
    botMessages: [
      "Perfeito! Agora que já nos conhecemos, quero entender um pouco melhor como você imagina o seu evento. 😊",
    ],
    sortOrder: 3,
    options: [
      { label: "Casamento", scorePoints: 20, sortOrder: 0 },
      { label: "Debutante (15 anos)", scorePoints: 15, sortOrder: 1 },
      { label: "Aniversário", scorePoints: 10, sortOrder: 2 },
      { label: "Evento corporativo", scorePoints: 10, sortOrder: 3 },
      { label: "Formatura", scorePoints: 15, sortOrder: 4 },
      { label: "Outro", scorePoints: 5, sortOrder: 5 },
    ],
  },
  {
    key: "convidados",
    type: "choice",
    prompt: "Quantos convidados você espera?",
    sortOrder: 4,
    options: [
      { label: "Abaixo de 80", scorePoints: 5, sortOrder: 0 },
      { label: "90", scorePoints: 8, sortOrder: 1 },
      { label: "100", scorePoints: 10, sortOrder: 2 },
      { label: "120", scorePoints: 15, sortOrder: 3 },
      { label: "150", scorePoints: 20, sortOrder: 4 },
      { label: "170", scorePoints: 22, sortOrder: 5 },
      { label: "200", scorePoints: 25, sortOrder: 6 },
      { label: "230", scorePoints: 30, sortOrder: 7 },
    ],
  },
  {
    key: "dataEvento",
    type: "date",
    label: "DATA DO EVENTO",
    botMessages: [
      "Qual a data do seu evento, <b>{nome}</b>? (se ainda não tiver certeza, escolha uma data aproximada)",
    ],
    sortOrder: 5,
    scoreBonus: 5,
  },
  {
    key: "investimento",
    type: "choice",
    prompt: "Qual o valor estimado que você pretende investir na festa completa?",
    sortOrder: 6,
    options: [
      { label: "De R$ 15 a 20 mil", scorePoints: 0, sortOrder: 0 },
      { label: "De R$ 20 a 25 mil", scorePoints: 10, sortOrder: 1 },
      { label: "De R$ 25 a 30 mil", scorePoints: 20, sortOrder: 2 },
      { label: "De R$ 35 a 40 mil", scorePoints: 35, sortOrder: 3 },
      { label: "Tenho condições de investir acima de R$ 40 mil", scorePoints: 45, sortOrder: 4 },
    ],
  },
];

const bellaRules = [
  {
    title: "Um casamento que merece um buffet à altura",
    body: "Casamentos são o evento em que cada detalhe conta: cardápio, serviço de sala e o tempo certo de cada prato. Pelo seu perfil, dá pra montar uma proposta que encaixa no seu orçamento sem abrir mão da experiência. Vamos alinhar isso numa degustação.",
    matchKey: "tipoEvento",
    matchValue: "Casamento",
    sortOrder: 0,
    isFallback: false,
  },
  {
    title: "Uma festa de 15 inesquecível",
    body: "Festas de debutante pedem equilíbrio entre variedade, apresentação e um serviço impecável, pra você e sua família aproveitarem sem preocupação. Com o número de convidados que você indicou, consigo desenhar um cardápio sob medida.",
    matchKey: "tipoEvento",
    matchValue: "Debutante (15 anos)",
    sortOrder: 1,
    isFallback: false,
  },
  {
    title: "Uma comemoração que os convidados vão lembrar",
    body: "Aniversários combinam melhor quando a comida surpreende e o serviço flui sozinho. Com base no que você contou, consigo montar uma proposta na medida do seu evento e do seu orçamento.",
    matchKey: "tipoEvento",
    matchValue: "Aniversário",
    sortOrder: 2,
    isFallback: false,
  },
  {
    title: "Um evento corporativo impecável",
    body: "Eventos empresariais pedem pontualidade, padrão e uma operação que funciona sozinha. Trabalhamos com formatos flexíveis — coffee break, coquetel, jantar — e atendemos o porte que você descreveu com previsibilidade total.",
    matchKey: "tipoEvento",
    matchValue: "Evento corporativo",
    sortOrder: 3,
    isFallback: false,
  },
  {
    title: "A formatura à altura da conquista",
    body: "Formaturas reúnem muita gente e muita expectativa. Com o número de convidados e o orçamento que você indicou, consigo estruturar um cardápio e um serviço que dão conta do evento com tranquilidade.",
    matchKey: "tipoEvento",
    matchValue: "Formatura",
    sortOrder: 4,
    isFallback: false,
  },
  {
    title: "Uma proposta sob medida para o seu evento",
    body: "Com base no que você compartilhou, consigo montar um caminho personalizado para o seu evento. Vamos alinhar os detalhes numa degustação no Espaço Pallazium.",
    matchKey: null,
    matchValue: null,
    sortOrder: 99,
    isFallback: true,
  },
];

async function seedLeadForm() {
  const form = await db.leadForm.upsert({
    where: { slug: "leads" },
    update: {
      title: "Quiz Bella Festa",
      brandName: "Espaço Pallazium",
      agentName: "Bella Festa",
      agentTitle: "Assistente de atendimento",
      whatsappDestination: process.env.VITE_WHATSAPP_SUPPORT || "5511999999999",
      whatsappMessage: "Quero agendar minha degustação no buffet",
      qualificationThreshold: 60,
      agendaEnabled: false,
      active: true,
    },
    create: {
      slug: "leads",
      title: "Quiz Bella Festa",
      brandName: "Espaço Pallazium",
      agentName: "Bella Festa",
      agentTitle: "Assistente de atendimento",
      whatsappDestination: process.env.VITE_WHATSAPP_SUPPORT || "5511999999999",
      whatsappMessage: "Quero agendar minha degustação no buffet",
      privacyUrl: "#",
      termsUrl: "#",
      qualificationThreshold: 60,
      agendaEnabled: false,
      agendaWeekdays: [1, 2, 3, 4, 5],
      agendaTimes: ["09:00", "11:00", "14:00", "16:00", "19:00"],
      agendaDaysAhead: 21,
      agendaLeadHours: 3,
      agendaSlotsPerSlot: 3,
      active: true,
    },
  });

  await db.leadIntegrationSettings.upsert({
    where: { formId: form.id },
    update: {},
    create: {
      formId: form.id,
      gtmId: process.env.LEAD_GTM_ID || null,
      metaPixelId: process.env.META_PIXEL_ID || null,
      metaAccessToken: process.env.META_CAPI_TOKEN || null,
      webhookUrl: process.env.LEAD_WEBHOOK_URL || null,
      webhookSecret: process.env.LEAD_WEBHOOK_SECRET || null,
    },
  });

  for (const q of bellaQuestions) {
    const question = await db.leadFormQuestion.upsert({
      where: { formId_key: { formId: form.id, key: q.key } },
      update: {
        type: q.type,
        label: q.label ?? null,
        prompt: q.prompt ?? null,
        botMessages: q.botMessages ?? [],
        placeholder: q.placeholder ?? null,
        sortOrder: q.sortOrder,
        scoreBonus: q.scoreBonus ?? 0,
        active: true,
      },
      create: {
        formId: form.id,
        key: q.key,
        type: q.type,
        label: q.label ?? null,
        prompt: q.prompt ?? null,
        botMessages: q.botMessages ?? [],
        placeholder: q.placeholder ?? null,
        sortOrder: q.sortOrder,
        scoreBonus: q.scoreBonus ?? 0,
        required: true,
        active: true,
      },
    });

    if (q.options) {
      for (const opt of q.options) {
        const existing = await db.leadFormOption.findFirst({
          where: { questionId: question.id, label: opt.label },
        });
        if (existing) {
          await db.leadFormOption.update({
            where: { id: existing.id },
            data: { scorePoints: opt.scorePoints, sortOrder: opt.sortOrder, active: true },
          });
        } else {
          await db.leadFormOption.create({
            data: {
              questionId: question.id,
              label: opt.label,
              scorePoints: opt.scorePoints,
              sortOrder: opt.sortOrder,
              active: true,
            },
          });
        }
      }
    }
  }

  const ruleCount = await db.leadFormRule.count({ where: { formId: form.id } });
  if (ruleCount === 0) {
    await db.leadFormRule.createMany({
      data: bellaRules.map((rule) => ({
        formId: form.id,
        title: rule.title,
        body: rule.body,
        matchKey: rule.matchKey,
        matchValue: rule.matchValue,
        sortOrder: rule.sortOrder,
        isFallback: rule.isFallback,
        active: true,
      })),
    });
  }

  console.log(`Lead form seeded: ${form.slug}`);
}

async function main() {
  for (const option of financialStatusOptions) {
    await db.financialStatusOption.upsert({
      where: { label: option.label },
      update: { sortOrder: option.sortOrder },
      create: option,
    });
  }
  await seedLeadForm();
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
