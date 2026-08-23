import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const cardTypeSchema = z.enum(["flashcard", "quiz"]);
const quizOptionsSchema = z.array(z.string().min(1).max(500)).min(2).max(4);

function validateQuiz(input: {
  type: "flashcard" | "quiz";
  options?: string[];
  correctIndex?: number;
}) {
  if (input.type === "flashcard") {
    return { type: input.type, optionsJson: null, correctIndex: null };
  }
  const options = quizOptionsSchema.parse(input.options);
  const correctIndex = z
    .number()
    .int()
    .min(0)
    .max(options.length - 1)
    .parse(input.correctIndex);
  return {
    type: input.type,
    optionsJson: JSON.stringify(options),
    correctIndex,
  };
}

async function requireOwnedDeck(
  db: PrismaClient,
  userId: string,
  deckId: string,
) {
  const deck = await db.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new TRPCError({ code: "NOT_FOUND" });
  return deck;
}

async function requireOwnedCard(
  db: PrismaClient,
  userId: string,
  cardId: string,
) {
  const card = await db.card.findFirst({
    where: { id: cardId, deck: { userId } },
  });
  if (!card) throw new TRPCError({ code: "NOT_FOUND" });
  return card;
}

export const cardRouter = createTRPCRouter({
  listByDeck: protectedProcedure
    .input(z.object({ deckId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOwnedDeck(ctx.db, ctx.session.user.id, input.deckId);

      return ctx.db.card.findMany({
        where: { deckId: input.deckId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        deckId: z.string(),
        front: z.string().min(1).max(2000),
        back: z.string().min(1).max(2000),
        type: cardTypeSchema.default("flashcard"),
        options: quizOptionsSchema.optional(),
        correctIndex: z.number().int().min(0).max(3).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedDeck(ctx.db, ctx.session.user.id, input.deckId);

      const { options, correctIndex, ...card } = input;
      return ctx.db.card.create({
        data: {
          ...card,
          ...validateQuiz({ type: card.type, options, correctIndex }),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        front: z.string().min(1).max(2000).optional(),
        back: z.string().min(1).max(2000).optional(),
        type: cardTypeSchema.optional(),
        options: quizOptionsSchema.optional(),
        correctIndex: z.number().int().min(0).max(3).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, options, correctIndex, ...data } = input;
      const existing = await requireOwnedCard(ctx.db, ctx.session.user.id, id);
      const type = data.type ?? (existing.type as "flashcard" | "quiz");
      const quizData =
        data.type !== undefined ||
        options !== undefined ||
        correctIndex !== undefined
          ? validateQuiz({ type, options, correctIndex })
          : {};

      return ctx.db.card.update({
        where: { id },
        data: { ...data, ...quizData },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedCard(ctx.db, ctx.session.user.id, input.id);

      return ctx.db.card.delete({ where: { id: input.id } });
    }),
});
