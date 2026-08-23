import { cardRouter } from "~/server/api/routers/card";
import { debugRouter } from "~/server/api/routers/debug";
import { deckRouter } from "~/server/api/routers/deck";
import { petRouter } from "~/server/api/routers/pet";
import { reviewRouter } from "~/server/api/routers/review";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  deck: deckRouter,
  card: cardRouter,
  review: reviewRouter,
  pet: petRouter,
  debug: debugRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
