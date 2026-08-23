import { type RouterOutputs } from "~/trpc/react";

export type Species = "bunny" | "frog" | "monkey" | "dumpling";
export type LifeStage = "egg" | "child" | "teen" | "adult";
export type Screen =
  | "home"
  | "decks"
  | "review"
  | "results"
  | "deckDetail"
  | "namePet";
export type Grade = "again" | "hard" | "good" | "easy";

export type DeckSummary = RouterOutputs["deck"]["list"][number];
export type ReviewCard = RouterOutputs["review"]["due"][number];
export type CardItem = RouterOutputs["card"]["listByDeck"][number];
export type RetiredPet = RouterOutputs["pet"]["village"][number];

export interface PetState {
  name: string;
  // False while `name` is still the "{Species} Hatchling" placeholder
  // (see petDisplayName in signed-in-pet-app.tsx) — lets screens avoid
  // redundant phrasing like "Bunny Hatchling the Bunny".
  hasCustomName: boolean;
  // Null only right after graduation, while the replacement pet is waiting
  // on the village screen for the player to hatch a new egg — see
  // `awaitingNewEgg` in signed-in-pet-app.tsx. Every other screen (Decks,
  // Review, Results) is unreachable in that state, so they can assume a
  // real species.
  species: Species | null;
  health: number;
  stage: LifeStage;
  growthPoints: number;
}

export interface SessionResults {
  correct: number;
  total: number;
  accuracy: number;
  healthDelta: number;
  growthDelta: number;
  celebrate: boolean;
  message: string;
  // The pet's own stage at the start of the session — the growth bar shown
  // on the results screen is that stage's own range (e.g. egg's 0-to-1),
  // so a session that finishes it reads as "the bar filled up", regardless
  // of whether the pet has since graduated into something else entirely.
  stageAtStart: LifeStage;
  growthAtStart: number;
  growthAtEnd: number;
  healthAtStart: number;
  healthAtEnd: number;
  // Crossed out of "egg" this session — needs a name, which the results
  // screen offers as a choice rather than forcing it immediately (see
  // signed-in-pet-app.tsx's "namePet" screen).
  hatched: boolean;
  graduated: boolean;
}
