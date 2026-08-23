import { INK } from "~/app/_components/pet-app/constants";

export function Toast({ message }: { message: string | false }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 76,
        right: 40,
        zIndex: 50,
        background: INK,
        color: "oklch(98% 0.01 90)",
        padding: "12px 20px",
        borderRadius: 16,
        fontWeight: 700,
        fontSize: 14,
        boxShadow: "0 6px 20px oklch(30% 0.06 260 / 0.25)",
      }}
    >
      {message}
    </div>
  );
}
