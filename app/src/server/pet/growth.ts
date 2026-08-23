import { type PrismaClient } from "@prisma/client";

import { getPetStats, PET_GRACE_HOURS } from "~/server/pet/health";

// A pet's life stage is driven by "growth points" — a sum of mastery
// progress, not a raw review count. Rewarding frequency (+1 per review)
// would reward grinding an easy card just as much as genuinely mastering
// hard material; growth here is a direct function of how close a card is
// to SM-2 "mature" (Anki's own definition of a well-retained card).
//
// Each card that's been reviewed at least once since the current pet
// hatched contributes min(1, intervalDays / MATURE_INTERVAL_DAYS) —
// capped at 1 so grinding a single easy card can't inflate growth past
// that card's own contribution. Fully maturing a whole deck naturally
// contributes one full point per card in it — "a lot," without needing a
// separate discrete bonus.
//
// Thresholds are intentionally low for demoability — tune freely.

export type LifeStage = "egg" | "child" | "teen" | "adult";

export const MATURE_INTERVAL_DAYS = 21;

// Exported so debug.ts's advanceStage can target "just past the next
// threshold" instead of duplicating this list.
export const STAGE_THRESHOLDS: { stage: LifeStage; minGrowth: number }[] = [
  { stage: "adult", minGrowth: 8 },
  { stage: "teen", minGrowth: 3 },
  { stage: "child", minGrowth: 1 },
  { stage: "egg", minGrowth: 0 },
];

export function stageForMastery(growthPoints: number): LifeStage {
  const match = STAGE_THRESHOLDS.find((t) => growthPoints >= t.minGrowth);
  return match?.stage ?? "egg";
}

export async function getGrowthPoints(
  db: PrismaClient,
  userId: string,
  petCreatedAt: Date,
): Promise<number> {
  const cards = await db.card.findMany({
    where: {
      deck: { userId },
      reviewLogs: { some: { reviewedAt: { gte: petCreatedAt } } },
    },
    select: { intervalDays: true },
  });

  return cards.reduce(
    (sum, card) => sum + Math.min(1, card.intervalDays / MATURE_INTERVAL_DAYS),
    0,
  );
}

// Per-deck mastery (Level 1-10, shown on the Decks screen) reuses the same
// "sum of min(1, intervalDays / MATURE_INTERVAL_DAYS)" math as pet growth,
// just scoped to one deck's cards instead of the whole account. Unlike pet
// growth, it isn't scoped to "since some createdAt" — a deck's own cards
// directly reflect its current mastery state, there's no equivalent "before
// this pet existed" boundary to exclude.
export const DECK_MASTERY_LEVEL = 10;
const DECK_XP_PER_CARD = 100;

export interface DeckLevelInfo {
  level: number; // 1-10
  levelsToMastery: number; // 0 once mastered
  xpInLevel: number;
  xpToNextLevel: number; // equals xpInLevel once mastered (bar reads full)
  isMastered: boolean;
}

export async function getDeckGrowthPoints(
  db: PrismaClient,
  deckId: string,
): Promise<number> {
  const cards = await db.card.findMany({
    where: { deckId },
    select: { intervalDays: true },
  });

  return cards.reduce(
    (sum, card) => sum + Math.min(1, card.intervalDays / MATURE_INTERVAL_DAYS),
    0,
  );
}

export function computeDeckLevel(
  growthPoints: number,
  totalCards: number,
): DeckLevelInfo {
  const steps = DECK_MASTERY_LEVEL - 1; // level-ups needed, 1 -> 10

  if (totalCards === 0) {
    return {
      level: 1,
      levelsToMastery: steps,
      xpInLevel: 0,
      xpToNextLevel: DECK_XP_PER_CARD,
      isMastered: false,
    };
  }

  // A fully-mastered deck (every card at intervalDays >= MATURE_INTERVAL_DAYS)
  // has growthPoints === totalCards — that's the ceiling this scales against.
  const fraction = Math.min(1, growthPoints / totalCards);
  const level = 1 + Math.min(steps, Math.floor(fraction * steps + 1e-9));
  const isMastered = level >= DECK_MASTERY_LEVEL;

  const masteryXP = totalCards * DECK_XP_PER_CARD;
  const xpPerLevel = masteryXP / steps;
  const levelFloorXP = Math.round((level - 1) * xpPerLevel);
  const levelCeilXP = isMastered ? masteryXP : Math.round(level * xpPerLevel);
  const totalXP = Math.round(growthPoints * DECK_XP_PER_CARD);

  return {
    level,
    levelsToMastery: DECK_MASTERY_LEVEL - level,
    xpInLevel: isMastered ? levelCeilXP - levelFloorXP : totalXP - levelFloorXP,
    xpToNextLevel: levelCeilXP - levelFloorXP,
    isMastered,
  };
}

// Retires a pet as graduated and spawns its blank replacement — the one
// path all three graduation triggers (a real review crossing into "adult",
// and the debug advanceStage/forceGraduate endpoints) share, so "reaching
// adult" reliably means the same thing everywhere instead of debug tools
// silently doing something different from the real flow.
export async function graduatePet(
  db: PrismaClient,
  userId: string,
  pet: { id: string; name: string | null; species: string | null },
): Promise<{ name: string | null; species: string | null }> {
  await db.pet.update({
    where: { id: pet.id },
    data: { retiredAt: new Date(), retirementReason: "graduated" },
  });
  await db.pet.create({ data: { userId } });
  return { name: pet.name, species: pet.species };
}

// userId isn't unique on Pet (a user accumulates a history of retired
// pets), so "the current pet" is whichever row has retiredAt: null. This
// is also where a pet's death gets discovered — there's no cron job, so
// it's checked lazily every time something resolves the active pet.
//
// Returns `diedPet` alongside the (possibly brand-new) active pet whenever
// *this call* is the one that discovered and retired a death, so callers
// that want to celebrate/mourn the moment (review.submit, debug.skipTime)
// can tell "a pet just died" apart from "some pet died at some point in
// the past" — every other caller can ignore it.
export async function getActivePet(db: PrismaClient, userId: string) {
  const existing = await db.pet.findFirst({
    where: { userId, retiredAt: null },
    orderBy: { createdAt: "desc" },
  });
  const pet = existing ?? (await db.pet.create({ data: { userId } }));

  const ageHours = (Date.now() - pet.createdAt.getTime()) / (1000 * 60 * 60);

  // Gating on age before even calling getPetStats matters, not just for
  // perf: without it, a health-0 backlog would kill every freshly-hatched
  // replacement pet again within moments, cascading into a village full
  // of near-instant ghosts.
  if (ageHours >= PET_GRACE_HOURS) {
    const { health } = await getPetStats(db, userId, pet.createdAt);
    if (health === 0) {
      await db.pet.update({
        where: { id: pet.id },
        data: { retiredAt: new Date(), retirementReason: "died" },
      });
      const replacement = await db.pet.create({ data: { userId } });
      return {
        pet: replacement,
        diedPet: { name: pet.name, species: pet.species },
      };
    }
  }

  return { pet, diedPet: null };
}
