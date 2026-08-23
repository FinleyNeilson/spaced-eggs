import {
  CARD_BG,
  CARD_LINE,
  INK,
  TERRACOTTA,
} from "~/app/_components/pet-app/constants";

// Three pulsing dots scattered around a centered pet portrait, used to mark
// a celebratory moment (session results, stage-up, graduation) without a
// full confetti/animation library.
export function Sparkles() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: -6,
          left: "28%",
          width: 10,
          height: 10,
          background: TERRACOTTA,
          borderRadius: "50%",
          animation: "sparklePulse 1.4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 4,
          right: "26%",
          width: 8,
          height: 8,
          background: "oklch(82% 0.15 97)",
          borderRadius: "50%",
          animation: "sparklePulse 1.4s ease-in-out infinite 0.3s",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: "22%",
          width: 7,
          height: 7,
          background: "oklch(76% 0.13 140)",
          borderRadius: "50%",
          animation: "sparklePulse 1.4s ease-in-out infinite 0.6s",
        }}
      />
    </>
  );
}

export function StatBar({
  label,
  value,
  hue,
  rightLabel,
}: {
  label: string;
  value: number;
  hue: number;
  rightLabel?: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>{rightLabel ?? `${value}%`}</span>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 6,
          background: hue === 97 ? "#FFED96" : `oklch(91% 0.03 ${hue})`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: hue === 97 ? "#E4C15B" : `oklch(68% 0.13 ${hue})`,
            borderRadius: 6,
            transition: "width 0.5s",
          }}
        />
      </div>
    </div>
  );
}

export function StatTile({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div
      style={{
        background: "oklch(94% 0.035 230)",
        borderRadius: 20,
        padding: 18,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 24,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "oklch(48% 0.04 255 / 0.6)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function ResultTile({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: CARD_BG,
        borderRadius: 18,
        padding: 16,
        border: `2px solid ${CARD_LINE}`,
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 22,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "oklch(48% 0.04 255 / 0.55)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function DebugButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        border: "none",
        borderRadius: 12,
        background: danger ? "oklch(87% 0.11 350)" : "oklch(91% 0.035 97)",
        color: danger ? "oklch(34% 0.13 350)" : INK,
        fontWeight: 700,
        fontSize: 13,
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
