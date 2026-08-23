import { useEffect, useState } from "react";

import {
  CARD_LINE,
  INK,
  NEXT_STAGE,
  STAGE_GROWTH_FLOOR,
  STAGE_LABEL,
  TERRACOTTA,
} from "~/app/_components/pet-app/constants";
import { PetPortrait } from "~/app/_components/pet-app/pet-visuals";
import {
  type PetState,
  type SessionResults,
} from "~/app/_components/pet-app/types";
import { ResultTile, Sparkles, StatBar } from "~/app/_components/pet-app/ui";

function growthPct(results: SessionResults, growth: number): number {
  const nextStage = NEXT_STAGE[results.stageAtStart];
  if (!nextStage) return 100;
  const floor = STAGE_GROWTH_FLOOR[results.stageAtStart];
  const ceil = STAGE_GROWTH_FLOOR[nextStage];
  return Math.round(Math.min(1, Math.max(0, (growth - floor) / (ceil - floor))) * 100);
}

export function ResultsScreen({
  results,
  pet,
  onBackHome,
  onNameHatchling,
}: {
  results: SessionResults;
  pet: PetState;
  onBackHome: () => void;
  // Only ever invoked when results.hatched is true — see the button
  // branch below.
  onNameHatchling: () => void;
}) {
  const startGrowthPct = growthPct(results, results.growthAtStart);
  const endGrowthPct = growthPct(results, results.growthAtEnd);
  const nextStage = NEXT_STAGE[results.stageAtStart];

  // Bars render at their session-start value first, then animate up to the
  // session-end value a beat later — StatBar already transitions its own
  // width, this just gives it something to transition from/to instead of
  // popping in already-filled. A hatch or graduation reads as "the bar
  // filled all the way up" for exactly this reason.
  const [growthValue, setGrowthValue] = useState(startGrowthPct);
  const [healthValue, setHealthValue] = useState(results.healthAtStart);
  useEffect(() => {
    const t = setTimeout(() => {
      setGrowthValue(endGrowthPct);
      setHealthValue(results.healthAtEnd);
    }, 300);
    return () => clearTimeout(t);
    // Intentionally only on mount — this is a one-shot reveal animation
    // for whichever results the screen was handed, not a live sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "20px auto 0",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        Session complete!
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          margin: "24px 0",
        }}
      >
        {results.celebrate && <Sparkles />}
        <div
          style={{
            width: 130,
            height: 130,
            animation: "petBounce 1.8s ease-in-out infinite",
          }}
        >
          <PetPortrait pet={pet} size={130} align="center" />
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{results.message}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
        <StatBar
          label={`Growth · ${STAGE_LABEL[results.stageAtStart]}`}
          value={growthValue}
          hue={97}
          rightLabel={
            nextStage
              ? `${results.growthAtEnd.toFixed(1)} / ${STAGE_GROWTH_FLOOR[nextStage]} to ${STAGE_LABEL[nextStage]}`
              : "Max stage"
          }
        />
        <StatBar label="Health" value={healthValue} hue={140} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <ResultTile value={`${results.accuracy}%`} label="Accuracy" />
        <ResultTile
          value={`${results.healthDelta >= 0 ? "+" : ""}${results.healthDelta}`}
          label="Health Δ"
        />
        <ResultTile
          value={`${results.growthDelta >= 0 ? "+" : ""}${results.growthDelta.toFixed(1)}`}
          label="Growth Δ"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 26,
        }}
      >
        {results.hatched ? (
          <>
            <button onClick={onNameHatchling} style={primaryButtonStyle}>
              Name your hatched egg
            </button>
            <button onClick={onBackHome} style={secondaryButtonStyle}>
              Return to village
            </button>
          </>
        ) : (
          <button onClick={onBackHome} style={primaryButtonStyle}>
            Back to {pet.name}
          </button>
        )}
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 16,
  border: "none",
  borderRadius: 20,
  background: TERRACOTTA,
  color: "oklch(98% 0.01 90)",
  fontFamily: "'Baloo 2', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 16,
  border: `2px solid ${CARD_LINE}`,
  borderRadius: 20,
  background: "transparent",
  color: INK,
  fontFamily: "'Baloo 2', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
};
