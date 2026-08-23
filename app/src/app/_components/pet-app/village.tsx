import { PetFace } from "~/app/_components/pet-app/pet-visuals";
import { type RetiredPet, type Species } from "~/app/_components/pet-app/types";

// Simple deterministic string hash so each retired pet's sprite position is
// stable across refetches instead of jumping around on every re-render.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function RetiredPetPortrait({
  pet,
  size,
}: {
  pet: RetiredPet;
  size: number;
}) {
  // Died pets render as the full ghost sprite — the species portrait is not
  // shown alongside it, whether or not a species was ever chosen.
  if (pet.retirementReason === "died") {
    return (
      <div
        style={{
          width: size,
          height: size,
          opacity: 0.7,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <img
          src="/pets/ghost.svg"
          alt="Ghost"
          style={{
            width: size * 0.7,
            height: size * 0.7,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // Graduated pets always have a species by the time they retire.
  if (!pet.species) return null;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <PetFace species={pet.species as Species} size={size} />
    </div>
  );
}

// Measured position of the study card relative to the scene container it
// shares with RetiredPetSprite (see HomeScreen) — used to keep sprites out
// from behind it regardless of window size, instead of guessing fixed
// pixel bands that only hold up at one viewport height.
export type SceneBounds = {
  containerWidth: number;
  cardTop: number;
  cardBottom: number;
  cardLeft: number;
  cardRight: number;
};

// Ambient background sprite on the home/village scene — deterministically
// scattered (stable per pet.id), subtle enough to read as background
// rather than competing with the current pet in the foreground.
export function RetiredPetSprite({
  pet,
  bounds,
  onClick,
}: {
  pet: RetiredPet;
  bounds: SceneBounds | null;
  onClick: () => void;
}) {
  const h = hashString(pet.id);
  const isGhost = pet.retirementReason === "died";
  const size = 100 + ((h % 1000) / 1000) * 30;

  // Nothing measured yet (pre-layout) — skip this frame rather than flash
  // a sprite in the wrong place.
  if (!bounds) return null;

  let leftPx: number;
  let topPx: number;

  if (isGhost) {
    // Ghosts drift through the sky, above the card, so they're always
    // clear of it regardless of window height.
    const skyBottom = Math.max(120, bounds.cardTop - 40);
    leftPx = 8 + (((h >>> 12) % 1000) / 1000) * (bounds.containerWidth - size - 16);
    topPx = 40 + (((h >>> 18) % 1000) / 1000) * (skyBottom - 40);
  } else {
    // Retired pets only ever spawn in the hill visible directly beside the
    // study card — never above, below, or behind it — because that's the
    // one band guaranteed to be on-screen at any window height: it's part
    // of the card's own row, which the app always has room to show.
    const pad = 12;
    // Cap how far a sprite can drift from the card's edge — on a wide
    // window the gutters are huge, and scattering proportionally across
    // all of it reads as "floating in the corners" instead of "next to
    // the card".
    const maxOffset = 200;
    const leftGutter = bounds.cardLeft - pad * 2;
    const rightGutter = bounds.containerWidth - bounds.cardRight - pad * 2;
    const useRightSide =
      rightGutter >= size && (leftGutter < size || h % 2 === 0);

    if (!useRightSide && leftGutter < size) return null;
    if (useRightSide && rightGutter < size) return null;

    const gutterWidth = useRightSide ? rightGutter : leftGutter;
    const offset = (((h >>> 12) % 1000) / 1000) * Math.min(gutterWidth - size, maxOffset);
    leftPx = useRightSide
      ? bounds.cardRight + pad + offset
      : bounds.cardLeft - pad - size - offset;
    topPx =
      bounds.cardTop +
      (((h >>> 18) % 1000) / 1000) * (bounds.cardBottom - bounds.cardTop - size);
  }

  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: leftPx,
        top: topPx,
        zIndex: 1,
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        width: size,
        height: size,
      }}
    >
      <RetiredPetPortrait pet={pet} size={size} />
    </button>
  );
}
