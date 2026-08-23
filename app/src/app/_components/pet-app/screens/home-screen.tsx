import { useLayoutEffect, useRef, useState } from "react";

import {
  CARD_BG,
  CARD_LINE,
  INK,
  STAGE_LABEL,
  STAGE_SIZE,
} from "~/app/_components/pet-app/constants";
import { PetPortrait } from "~/app/_components/pet-app/pet-visuals";
import {
  type PetState,
  type RetiredPet,
} from "~/app/_components/pet-app/types";
import { StatBar, StatTile } from "~/app/_components/pet-app/ui";
import {
  RetiredPetSprite,
  type SceneBounds,
} from "~/app/_components/pet-app/village";

// Stands in for the replacement pet while awaiting a new egg (species
// still null — see PetState.species) — deliberately not just another Egg
// portrait, since there's no species yet to hint at. A featureless void
// instead, doubling as the button into the species picker.
function VoidEgg({ size, onClick }: { size: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Choose your next companion"
      style={{
        width: size,
        height: size,
        padding: 0,
        border: `3px solid ${INK}`,
        borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%",
        background:
          "radial-gradient(circle at 38% 32%, oklch(22% 0.01 260), oklch(4% 0.01 260) 72%)",
        boxShadow: "inset 0 0 22px oklch(0% 0 0 / 0.7)",
        cursor: "pointer",
        // Overrides the pointerEvents:"none" this sits inside (see the
        // wrapping row's comment below) — everything else in that row is
        // purely decorative, but this one thing needs to be clickable.
        pointerEvents: "auto",
      }}
    />
  );
}

export function HomeScreen({
  pet,
  speciesLabel,
  isNeglected,
  growthProgressPct,
  growthRightLabel,
  decksCount,
  weeklyAccuracy,
  retiredPets,
  onSelectRetiredPet,
  onStudyNow,
  onHatchNewEgg,
  onNamePet,
}: {
  pet: PetState;
  speciesLabel: string;
  isNeglected: boolean;
  growthProgressPct: number;
  growthRightLabel: string;
  decksCount: number;
  weeklyAccuracy: number;
  retiredPets: RetiredPet[] | undefined;
  onSelectRetiredPet: (pet: RetiredPet) => void;
  onStudyNow: () => void;
  // Only ever called while pet.species is null — right after graduation,
  // when the player chose "Return to village" over "Find a new egg" and is
  // now looking at the replacement egg waiting to be hatched.
  onHatchNewEgg: () => void;
  // A pet can stay unnamed indefinitely (naming is offered, not forced —
  // see signed-in-pet-app.tsx's "namePet" screen), so this is how the
  // player gets back into that flow whenever they're ready.
  onNamePet: () => void;
}) {
  const hasSpecies = pet.species !== null;
  const needsNaming = hasSpecies && pet.stage !== "egg" && !pet.hasCustomName;
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<SceneBounds | null>(null);

  // Retired-pet sprites are positioned relative to the study card's actual
  // on-screen box (see village.tsx) rather than guessed pixel offsets, so
  // they land beside it correctly at any window size instead of only
  // working at one particular height.
  useLayoutEffect(() => {
    const measure = () => {
      const scene = sceneRef.current;
      const card = cardRef.current;
      if (!scene || !card) return;
      const sceneRect = scene.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      setBounds({
        containerWidth: sceneRect.width,
        cardTop: cardRect.top - sceneRect.top,
        cardBottom: cardRect.bottom - sceneRect.top,
        cardLeft: cardRect.left - sceneRect.left,
        cardRight: cardRect.right - sceneRect.left,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (sceneRef.current) ro.observe(sceneRef.current);
    if (cardRef.current) ro.observe(cardRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      style={{
        position: "relative",
        overflow: "hidden",
        flex: "1 1 auto",
        minHeight: 0,
        backgroundImage: "url(/village-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center 20%",
        backgroundRepeat: "no-repeat",
        paddingBottom: 20,
      }}
    >
      {retiredPets?.map((retired) => (
        <RetiredPetSprite
          key={retired.id}
          pet={retired}
          bounds={bounds}
          onClick={() => onSelectRetiredPet(retired)}
        />
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          // A fixed height (rather than flex-sizing to content) means the
          // study card below always lands in the same place regardless of
          // the current pet's size/stage or the name-tag's height — both
          // are positioned absolutely inside this box instead of pushing
          // on document flow. Kept short enough (plus the reduced
          // paddingBottom above) that the whole village screen fits one
          // viewport without scrolling on ordinary laptop-height windows.
          height: 400,
          // Only the avatar/name-tag (below) has anything to click — the
          // rest of this row is empty space that would otherwise sit above
          // (and swallow clicks meant for) the retired-pet sprites at
          // zIndex 1.
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 140,
            // Centered via left/right/margin instead of the usual
            // left:50%+translateX(-50%) trick — that trick sets `transform`,
            // which the petBounce animation below also drives every frame,
            // silently overwriting the centering offset each tick and
            // dragging the pet off to the right.
            left: 0,
            right: 0,
            margin: "0 auto",
            // Sized to the pet's actual current stage rather than a fixed
            // box big enough for the largest stage — the species art has
            // a lot of built-in padding within its own square already, so
            // an oversized wrapper on top of that doubled up into a big
            // empty gap between the visible character and the name-tag
            // below it.
            width: hasSpecies ? STAGE_SIZE[pet.stage] : STAGE_SIZE.egg,
            height: hasSpecies ? STAGE_SIZE[pet.stage] : STAGE_SIZE.egg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "petBounce 2.6s ease-in-out infinite",
          }}
        >
          {hasSpecies ? (
            <PetPortrait pet={pet} size={STAGE_SIZE[pet.stage]} />
          ) : (
            <VoidEgg size={STAGE_SIZE.egg} onClick={onHatchNewEgg} />
          )}
        </div>

        <div
          style={{
            position: "absolute",
            // The species art has some built-in transparent padding below
            // the character's feet (baked into the source SVG itself), so
            // this sits higher than the avatar box's true bottom edge to
            // land right under the visible character instead of under the
            // empty space beneath it.
            bottom: 98,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4,
            width: "fit-content",
            textAlign: "center",
            background: CARD_BG,
            padding: "6px 14px",
            borderRadius: 14,
            border: `2px solid ${CARD_LINE}`,
            // Naming is optional (see onNamePet) — a hatched-but-unnamed
            // pet can wander the village forever, so this is the one
            // permanent way back into that flow, not just a one-time
            // prompt. Everything else in this row has pointerEvents:none
            // (see the wrapping row above), so this needs its own opt-in.
            pointerEvents: needsNaming ? "auto" : "none",
          }}
        >
          {needsNaming ? (
            <button
              onClick={onNamePet}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "inherit",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textUnderlineOffset: 3,
              }}
            >
              {pet.name}
            </button>
          ) : (
            <div
              style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {hasSpecies
                ? pet.hasCustomName
                  ? `${pet.name} the ${speciesLabel}`
                  : pet.name
                : "A new arrival awaits"}
            </div>
          )}
        </div>
      </div>

      <div
        ref={cardRef}
        style={{
          position: "relative",
          zIndex: 3,
          maxWidth: 520,
          margin: "0 auto",
          background: CARD_BG,
          borderRadius: 28,
          padding: "26px 26px 24px",
          border: `2px solid ${CARD_LINE}`,
          boxShadow: "0 14px 34px oklch(35% 0.06 260 / 0.16)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <StatBar
            label={`Growth · ${STAGE_LABEL[pet.stage]}`}
            value={growthProgressPct}
            hue={97}
            rightLabel={growthRightLabel}
          />
          <StatBar label="Health" value={pet.health} hue={140} />
        </div>

        {isNeglected && hasSpecies && (
          <div
            style={{
              marginTop: 16,
              background: "oklch(90% 0.07 42)",
              color: "oklch(36% 0.1 42)",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 12px",
              borderRadius: 14,
              textAlign: "center",
            }}
          >
            {pet.name} feels neglected, study today to cheer them up.
          </div>
        )}

        <button
          onClick={hasSpecies ? onStudyNow : onHatchNewEgg}
          style={{
            marginTop: 18,
            width: "100%",
            padding: 15,
            border: "none",
            borderRadius: 18,
            background: "#4A83A0",
            color: "oklch(98% 0.01 90)",
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgb(74 131 160 / 0.3)",
          }}
        >
          {hasSpecies ? "Study now" : "Choose your next companion"}
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <StatTile value={decksCount} label="Decks" />
          <StatTile value={`${weeklyAccuracy}%`} label="7-day accuracy" />
        </div>
      </div>
    </div>
  );
}
