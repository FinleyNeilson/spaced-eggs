import { CARD_BG, CARD_LINE, INK } from "~/app/_components/pet-app/constants";
import { RetiredPetPortrait } from "~/app/_components/pet-app/village";
import { type RetiredPet } from "~/app/_components/pet-app/types";

export function RetiredPetPopup({
  pet,
  onClose,
}: {
  pet: RetiredPet;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
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
          minWidth: 220,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RetiredPetPortrait pet={pet} size={72} />
        </div>
        <div
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            marginTop: 12,
          }}
        >
          {pet.name ?? "Unnamed"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "oklch(48% 0.04 255 / 0.6)",
            marginTop: 4,
          }}
        >
          {pet.retirementReason === "died"
            ? `Passed away${pet.retiredAt ? ` ${new Date(pet.retiredAt).toLocaleDateString()}` : ""}`
            : `Graduated${pet.retiredAt ? ` ${new Date(pet.retiredAt).toLocaleDateString()}` : ""}`}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
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
  );
}
