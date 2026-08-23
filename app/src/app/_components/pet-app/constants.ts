import {
  type Grade,
  type LifeStage,
  type Species,
} from "~/app/_components/pet-app/types";

// Palette sampled from Frame 25.svg: a bright sky, grassy hills, sunshine
// yellow, royal-blue linework, and lilac/pink details.
export const INK = "#101311";
export const PAPER = "#C5EBFA";
export const CARD_BG = "#EAF5FC";
export const CARD_LINE = "#D2E3EC";
export const TERRACOTTA = "#101311";
export const TERRACOTTA_DEEP = "#356F8F";
export const GOLDEN = "#E4C15B";
export const LEAF = "#8CB276";

// Decks-screen-specific accents (matches the "Study" button and
// mastered/done state in the deck-card redesign). Same blue as the
// village screen's "Study now" button, for a consistent accent color.
export const STUDY_BLUE = "#4A83A0";
export const MASTERED_GREEN = "#638B63";
export const MASTERED_GREEN_BG = "#DCEBDD";

export const STAGE_LABEL: Record<LifeStage, string> = {
  egg: "Egg",
  child: "Child",
  teen: "Teen",
  adult: "Adult",
};

export const STAGE_SIZE: Record<LifeStage, number> = {
  egg: 190,
  child: 200,
  teen: 260,
  adult: 300,
};

// Mirrors STAGE_THRESHOLDS in server/pet/growth.ts — needed here purely to
// render a "progress to next stage" bar; keep in sync if those change.
export const STAGE_GROWTH_FLOOR: Record<LifeStage, number> = {
  egg: 0,
  child: 1,
  teen: 3,
  adult: 8,
};
export const NEXT_STAGE: Record<LifeStage, LifeStage | null> = {
  egg: "child",
  child: "teen",
  teen: "adult",
  adult: null,
};

export const SPECIES: Record<Species, { label: string; color: string }> = {
  bunny: { label: "Bunny", color: INK },
  frog: { label: "Frog", color: LEAF },
  monkey: { label: "Monkey", color: TERRACOTTA_DEEP },
  dumpling: { label: "Dumpling", color: GOLDEN },
};

// Every species has hand-drawn sprite art — see PetFace in pet-visuals.tsx.
// This is the "grown up" look — shown for the adult stage, and as the
// fallback for any stage a species doesn't have dedicated art for below
// (bunny doesn't have separate child/teen art yet, so it uses this at
// every stage, same as before per-stage art existed).
export const SPECIES_IMAGE: Record<Species, string> = {
  bunny: "/pets/bunny.svg",
  frog: "/pets/frog.svg",
  monkey: "/pets/monkey.svg",
  dumpling: "/pets/dumpling.svg",
};

// Earlier-growth-stage art overrides — species without an entry (or
// without a specific stage's key) fall back to SPECIES_IMAGE instead.
export const SPECIES_STAGE_IMAGE: Partial<
  Record<Species, Partial<Record<"child" | "teen", string>>>
> = {
  frog: { child: "/pets/frog-child.svg", teen: "/pets/frog-teen.svg" },
  monkey: { child: "/pets/monkey-child.svg", teen: "/pets/monkey-teen.svg" },
  dumpling: {
    child: "/pets/dumpling-child.svg",
    teen: "/pets/dumpling-teen.svg",
  },
};

// SM-2 quality grade (0-5) each review button maps to — see server/srs/sm2.ts.
export const GRADE_TO_SM2: Record<Grade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export const DECK_ACCENT_PALETTE: { bg: string; color: string }[] = [
  { bg: "#FFED96", color: "#0B459D" },
  { bg: "#FBD2C9", color: "#803A3D" },
  { bg: "#D7EBCB", color: "#4E7E3A" },
];
