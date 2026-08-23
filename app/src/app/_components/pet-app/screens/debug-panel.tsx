"use client";

import { useState } from "react";

import { CARD_BG, CARD_LINE, INK } from "~/app/_components/pet-app/constants";
import { type PetState } from "~/app/_components/pet-app/types";
import { DebugButton } from "~/app/_components/pet-app/ui";

// Dev/demo-only tools for exercising growth, graduation, and death without
// needing real SM-2 spacing or a real 24h health-grace wait. Renders
// nothing outside development — mirrors the server-side guard in
// server/api/routers/debug.ts.
export function DebugPanel({
  pet,
  onAddTestDecks,
  onClearTestDecks,
  onMatureAllCards,
  onAdvanceStage,
  onForceGraduate,
  onForceDie,
  onSkipTime,
  onResetAccount,
  isAddingTestDecks,
  isClearingTestDecks,
  isMaturing,
  isAdvancing,
  isGraduating,
  isDying,
  isSkippingTime,
  isResetting,
}: {
  pet: PetState;
  onAddTestDecks: () => void;
  onClearTestDecks: () => void;
  onMatureAllCards: () => void;
  onAdvanceStage: () => void;
  onForceGraduate: () => void;
  onForceDie: () => void;
  onSkipTime: (hours: number) => void;
  // Resolves to whether the reset actually happened (the caller shows a
  // confirm() dialog first) — the panel only closes itself on true, so
  // cancelling leaves it open, matching the original inline behavior.
  onResetAccount: () => Promise<boolean>;
  isAddingTestDecks: boolean;
  isClearingTestDecks: boolean;
  isMaturing: boolean;
  isAdvancing: boolean;
  isGraduating: boolean;
  isDying: boolean;
  isSkippingTime: boolean;
  isResetting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  async function handleReset() {
    const proceeded = await onResetAccount();
    if (proceeded) setIsOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Debug tools (dev/demo only)"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 55,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `2px solid ${CARD_LINE}`,
          background: CARD_BG,
          fontSize: 10,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 4px 12px oklch(35% 0.06 260 / 0.2)",
        }}
      >
        DBG
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "oklch(20% 0.05 260 / 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: CARD_BG,
              borderRadius: 22,
              padding: 24,
              border: `2px solid ${CARD_LINE}`,
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 4,
              }}
            >
              Debug tools
            </div>
            <div
              style={{
                fontSize: 12,
                color: "oklch(48% 0.04 255 / 0.6)",
                marginBottom: 14,
              }}
            >
              growth {pet.growthPoints.toFixed(2)} · {pet.stage} · health{" "}
              {pet.health}%
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <DebugButton
                onClick={onAddTestDecks}
                disabled={isAddingTestDecks}
              >
                Add 20 test decks
              </DebugButton>
              <DebugButton
                onClick={onClearTestDecks}
                disabled={isClearingTestDecks}
              >
                Clear test decks
              </DebugButton>
              <DebugButton onClick={onMatureAllCards} disabled={isMaturing}>
                Mature all cards (instant growth)
              </DebugButton>
              <DebugButton onClick={onAdvanceStage} disabled={isAdvancing}>
                Advance to next life stage
              </DebugButton>
              <DebugButton onClick={onForceGraduate} disabled={isGraduating}>
                Force graduate now
              </DebugButton>
              <DebugButton onClick={onForceDie} disabled={isDying}>
                Force death (ghost)
              </DebugButton>
              <DebugButton
                onClick={() => onSkipTime(12)}
                disabled={isSkippingTime}
              >
                Skip 12 hours (health decay)
              </DebugButton>
              <DebugButton
                onClick={() => void handleReset()}
                disabled={isResetting}
                danger
              >
                Reset account to fresh demo state
              </DebugButton>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                marginTop: 14,
                width: "100%",
                border: "none",
                background: "oklch(91% 0.03 230)",
                color: INK,
                fontWeight: 800,
                fontSize: 13,
                padding: "8px 16px",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
