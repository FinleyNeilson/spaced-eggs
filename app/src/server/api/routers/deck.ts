import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { computeDeckLevel, MATURE_INTERVAL_DAYS } from "~/server/pet/growth";

export const deckRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const decks = await ctx.db.deck.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { cards: true } } },
    });

    const dueCounts = await ctx.db.card.groupBy({
      by: ["deckId"],
      where: { deck: { userId }, dueAt: { lte: new Date() } },
      _count: { _all: true },
    });
    const dueByDeck = new Map(dueCounts.map((d) => [d.deckId, d._count._all]));

    // Per-deck growth points and next-due date, fetched in one query and
    // reduced in JS (same "fetch everything, reduce in memory" approach as
    // pet growth — fine at this scale, avoids N+1 per-deck queries). See
    // server/pet/growth.ts for the level/XP math itself.
    const now = new Date();
    const cards = await ctx.db.card.findMany({
      where: { deck: { userId } },
      select: { deckId: true, intervalDays: true, dueAt: true },
    });
    const growthByDeck = new Map<string, number>();
    const nextDueByDeck = new Map<string, Date>();
    for (const card of cards) {
      const contribution = Math.min(
        1,
        card.intervalDays / MATURE_INTERVAL_DAYS,
      );
      growthByDeck.set(
        card.deckId,
        (growthByDeck.get(card.deckId) ?? 0) + contribution,
      );
      if (card.dueAt > now) {
        const current = nextDueByDeck.get(card.deckId);
        if (!current || card.dueAt < current) {
          nextDueByDeck.set(card.deckId, card.dueAt);
        }
      }
    }

    const reviews = await ctx.db.reviewLog.findMany({
      where: { card: { deck: { userId } } },
      select: { reviewedAt: true, card: { select: { deckId: true } } },
      orderBy: { reviewedAt: "desc" },
    });
    const lastStudiedByDeck = new Map<string, Date>();
    for (const review of reviews) {
      if (!lastStudiedByDeck.has(review.card.deckId)) {
        lastStudiedByDeck.set(review.card.deckId, review.reviewedAt);
      }
    }

    return decks.map(({ _count, ...deck }) => {
      const totalCards = _count.cards;
      const growthPoints = growthByDeck.get(deck.id) ?? 0;
      return {
        ...deck,
        totalCards,
        dueCards: dueByDeck.get(deck.id) ?? 0,
        lastStudiedAt: lastStudiedByDeck.get(deck.id) ?? null,
        nextDueAt: nextDueByDeck.get(deck.id) ?? null,
        ...computeDeckLevel(growthPoints, totalCards),
      };
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.deck.create({
        data: { ...input, userId: ctx.session.user.id },
      }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const deck = await ctx.db.deck.findFirst({
        where: { id, userId: ctx.session.user.id },
      });
      if (!deck) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.deck.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deck = await ctx.db.deck.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!deck) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.deck.delete({ where: { id: input.id } });
    }),
});
