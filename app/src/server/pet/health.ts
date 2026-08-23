import { type PrismaClient } from "@prisma/client";

// health is computed on-demand, never stored (see docs/architecture.md) so
// overdue debt keeps decaying with the passage of time, not just on review
// events. The exact weights below are a first pass and are meant to be
// tuned once the pet UI exists to see how it feels.

const ACCURACY_WINDOW = 20;
const ACCURACY_LOOKBACK_DAYS = 90;

// A freshly-hatched pet is guaranteed 100 health for this long, no matter
// how bad the account's actual backlog is — otherwise a brand-new pet
// spawned right after a health-triggered death would just inherit the same
// 0 health that killed its predecessor. Also governs death-eligibility
// (see getActivePet in server/pet/growth.ts) — one unified grace window,
// not two unexplained constants.
export const PET_GRACE_HOURS = 24;

export interface PetHealthInputs {
  overdueCount: number;
  overdueDaysSum: number;
  recentAccuracy: number | null;
}

export function computeHealth(inputs: PetHealthInputs): number {
  const { overdueCount, overdueDaysSum, recentAccuracy } = inputs;

  let health = 100;

  // Having any backlog at all costs a bounded amount up front — capped so
  // an account that's just accumulated a lot of decks/cards (or a lot of
  // pets across repeated debug testing) isn't punished for its sheer size,
  // only for actually letting reviews go stale (below). Uncapped raw counts
  // here made accounts with big libraries take near-instant fatal damage
  // regardless of how overdue anything actually was.
  health -= Math.min(20, overdueCount);

  // The real, uncapped decay driver: how overdue cards are *on average*,
  // not their raw total — so decay speed reflects how long reviews have
  // actually been neglected, independent of library size, and can still
  // reach 0 (and, past the death-eligibility grace window, actually kill
  // the pet) given enough sustained neglect.
  const avgOverdueDays = overdueCount > 0 ? overdueDaysSum / overdueCount : 0;
  health -= avgOverdueDays * 10;

  if (recentAccuracy !== null && recentAccuracy < 0.7) {
    health -= (0.7 - recentAccuracy) * 100;
  }

  return Math.round(Math.max(0, Math.min(100, health)));
}

export interface PetStats {
  health: number;
}

export async function getPetStats(
  db: PrismaClient,
  userId: string,
  petCreatedAt: Date,
): Promise<PetStats> {
  const now = new Date();

  const lookbackStart = new Date(now);
  lookbackStart.setDate(lookbackStart.getDate() - ACCURACY_LOOKBACK_DAYS);

  const recentReviews = await db.reviewLog.findMany({
    where: { card: { deck: { userId } }, reviewedAt: { gte: lookbackStart } },
    select: { reviewedAt: true, grade: true },
    orderBy: { reviewedAt: "desc" },
  });

  const ageHours = (now.getTime() - petCreatedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours < PET_GRACE_HOURS) {
    return { health: 100 };
  }

  const overdueCards = await db.card.findMany({
    where: { deck: { userId }, dueAt: { lt: now } },
    select: { dueAt: true },
  });

  const overdueCount = overdueCards.length;
  const overdueDaysSum = overdueCards.reduce(
    (sum, card) =>
      sum + (now.getTime() - card.dueAt.getTime()) / (1000 * 60 * 60 * 24),
    0,
  );

  const accuracyWindow = recentReviews.slice(0, ACCURACY_WINDOW);
  const recentAccuracy =
    accuracyWindow.length > 0
      ? accuracyWindow.filter((r) => r.grade >= 3).length /
        accuracyWindow.length
      : null;

  return {
    health: computeHealth({
      overdueCount,
      overdueDaysSum,
      recentAccuracy,
    }),
  };
}
