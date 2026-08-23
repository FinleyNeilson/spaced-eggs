"use client";

export function LoadingSpinner({
  size = 20,
  label = "Loading",
  light = false,
}: {
  size?: number;
  label?: string;
  light?: boolean;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`loading-spinner${light ? " loading-spinner-light" : ""}`}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
    >
      <span className="loading-spinner-label">{label}</span>
    </span>
  );
}
