import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getPetStats } from "~/server/pet/health";
import {
  getActivePet,
  getGrowthPoints,
  stageForMastery,
} from "~/server/pet/growth";

const SPECIES = ["bunny", "frog", "monkey", "dumpling"] as const;

export const petRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    // Resolved first since it may itself retire a dead pet and spawn a
    // fresh one — everything below must reflect whichever pet is actually
    // current after that. `diedPet` is included so the client can show a
    // death screen even when death is discovered passively here (e.g. the
    // app was just reopened) rather than via a review/debug action.
    const { pet, diedPet } = await getActivePet(ctx.db, ctx.session.user.id);
    const stats = await getPetStats(ctx.db, ctx.session.user.id, pet.createdAt);
    // Growth (and so life stage) only makes sense once a species has been
    // chosen — a lot of the UI assumes "past the egg stage" implies "has a
    // species" (see e.g. PetFace), so this must hold even though nothing
    // in the review-grading math itself is species-aware.
    const growthPoints = pet.species
      ? await getGrowthPoints(ctx.db, ctx.session.user.id, pet.createdAt)
      : 0;

    return {
      ...pet,
      ...stats,
      growthPoints,
      stage: stageForMastery(growthPoints),
      diedPet,
    };
  }),

  setSpecies: protectedProcedure
    .input(z.object({ species: z.enum(SPECIES) }))
    .mutation(async ({ ctx, input }) => {
      const { pet } = await getActivePet(ctx.db, ctx.session.user.id);
      return ctx.db.pet.update({
        where: { id: pet.id },
        data: { species: input.species },
      });
    }),

  // Called once, right after the pet hatches out of its egg (see the
  // client's name-gate: stage !== "egg" && !name).
  setName: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(24) }))
    .mutation(async ({ ctx, input }) => {
      const { pet } = await getActivePet(ctx.db, ctx.session.user.id);
      return ctx.db.pet.update({
        where: { id: pet.id },
        data: { name: input.name },
      });
    }),

  // Retired pets (graduated or died — see retirementReason), most recent
  // first, for the background sprite layer on the home screen.
  village: protectedProcedure.query(({ ctx }) =>
    ctx.db.pet.findMany({
      where: { userId: ctx.session.user.id, retiredAt: { not: null } },
      orderBy: { retiredAt: "desc" },
    }),
  ),
});
