import { type PrismaClient } from "@prisma/client";

// Seeded once per new user (see the createUser event in server/auth/config.ts)
// so a fresh sign-in has something real to review instead of an empty app.
// Content mirrors the old MOCK_DECKS reference data in pet-app.tsx.
const DEMO_DECKS: { name: string; cards: { front: string; back: string }[] }[] =
  [
    {
      name: "Cell Biology: Ch.4",
      cards: [
        {
          front: "What organelle produces most of a cell's ATP?",
          back: "The mitochondrion.",
        },
        {
          front:
            "What is the semi-fluid substance inside the cell membrane called?",
          back: "Cytoplasm.",
        },
        {
          front: "Which structure controls what enters and exits the cell?",
          back: "The cell membrane (plasma membrane).",
        },
        {
          front:
            "What process do plant cells use to convert light into energy?",
          back: "Photosynthesis.",
        },
        {
          front: "What organelle contains the cell's DNA?",
          back: "The nucleus.",
        },
      ],
    },
    {
      name: "Spanish Vocab: Travel",
      cards: [
        { front: '"El aeropuerto"', back: "The airport." },
        {
          front: '"¿Dónde está la estación de tren?"',
          back: "Where is the train station?",
        },
        { front: '"Una maleta"', back: "A suitcase." },
        { front: '"Reservar una habitación"', back: "To book a room." },
      ],
    },
  ];

export async function seedDemoDataForUser(db: PrismaClient, userId: string) {
  await db.pet.create({ data: { userId, name: "Ember" } });

  for (const deck of DEMO_DECKS) {
    await db.deck.create({
      data: {
        userId,
        name: deck.name,
        cards: { create: deck.cards },
      },
    });
  }
}
