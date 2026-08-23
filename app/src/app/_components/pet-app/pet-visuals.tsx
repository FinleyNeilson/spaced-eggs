import {
  SPECIES,
  SPECIES_IMAGE,
  SPECIES_STAGE_IMAGE,
} from "~/app/_components/pet-app/constants";
import {
  type LifeStage,
  type PetState,
  type Species,
} from "~/app/_components/pet-app/types";

export function Cloud({
  top,
  left,
  scale = 1,
}: {
  top: number;
  left: string;
  scale?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: 70 * scale,
        height: 26 * scale,
        borderRadius: 999,
        background: "oklch(98% 0.03 90 / 0.9)",
        boxShadow: `-${18 * scale}px ${4 * scale}px 0 -${2 * scale}px oklch(98% 0.03 90 / 0.9), ${18 * scale}px ${4 * scale}px 0 -${4 * scale}px oklch(98% 0.03 90 / 0.75)`,
        animation: "cloudDrift 10s ease-in-out infinite",
      }}
    />
  );
}

// Now that each SVG's viewBox is cropped to its actual content (see
// public/pets/*.svg), the art fills its box at "size" — rendering at a
// fraction of that box keeps pets from looking oversized while leaving
// every caller's layout math (which only knows about "size") untouched.
const PET_ART_SCALE = 0.7;

// "bottom" pins the (now smaller) art to the box's bottom edge — for
// spots where something else (a name tag, a label) sits right below and
// should read as touching the pet's feet. "center" is for plain
// standalone avatars, where pinning to the bottom would instead open up
// a gap between the pet and whatever's above it (see review-screen).
type PetArtAlign = "bottom" | "center";

function alignItemsFor(align: PetArtAlign) {
  return align === "bottom" ? "flex-end" : "center";
}

export function Egg({
  size = 108,
  align = "bottom",
}: {
  size?: number;
  align?: PetArtAlign;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: alignItemsFor(align),
        justifyContent: "center",
        animation: "crackShake 3s ease-in-out infinite",
      }}
    >
      <img
        src="/pets/egg.svg"
        alt="Egg"
        style={{
          width: size * PET_ART_SCALE,
          height: size * PET_ART_SCALE,
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export function PetPortrait({
  pet,
  size,
  align,
}: {
  pet: PetState;
  size: number;
  align?: PetArtAlign;
}) {
  if (pet.stage === "egg") return <Egg size={size} align={align} />;
  return (
    // Non-egg stage guarantees a species was already chosen — see the
    // PetState.species comment.
    <PetFace species={pet.species!} size={size} stage={pet.stage} align={align} />
  );
}

// Every species is hand-drawn sprite art (public/pets/*.svg) — no more
// CSS-drawn fallback face, so there's no `color`/`mood` to react to here.
// `stage` is optional because several callers (retired-pet portraits,
// species-picker previews) always want the species' default/grown-up look
// regardless of any particular pet's actual stage — omitting it (or
// passing "adult"/"egg") falls back to SPECIES_IMAGE.
export function PetFace({
  species,
  size,
  stage,
  align = "bottom",
}: {
  species: Species;
  size: number;
  stage?: LifeStage;
  align?: PetArtAlign;
}) {
  const stageImage =
    stage === "child" || stage === "teen"
      ? SPECIES_STAGE_IMAGE[species]?.[stage]
      : undefined;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: alignItemsFor(align),
        justifyContent: "center",
      }}
    >
      <img
        src={stageImage ?? SPECIES_IMAGE[species]}
        alt={`${SPECIES[species].label} pet`}
        style={{
          width: size * PET_ART_SCALE,
          height: size * PET_ART_SCALE,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
