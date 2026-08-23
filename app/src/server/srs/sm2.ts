// Classic SM-2 (SM-2 as used by early Anki versions). Ease factor is updated
// on every review regardless of grade; interval/repetitions reset to the
// start of the learning curve on a failing grade (< 3).
//
// grade is 0-5: 0 = complete blackout, 5 = perfect recall.

const MIN_EASE_FACTOR = 1.3;
const PASSING_GRADE = 3;

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  dueAt: Date;
}

export function sm2(
  state: Sm2State,
  grade: number,
  now: Date = new Date(),
): Sm2Result {
  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
  );

  let repetitions: number;
  let intervalDays: number;

  if (grade < PASSING_GRADE) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(state.intervalDays * easeFactor);
    }
  }

  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + intervalDays);

  return { easeFactor, intervalDays, repetitions, dueAt };
}
