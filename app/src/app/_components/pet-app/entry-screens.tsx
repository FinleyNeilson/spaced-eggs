"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import {
  CARD_BG,
  CARD_LINE,
  INK,
  PAPER,
  SPECIES,
  TERRACOTTA,
} from "~/app/_components/pet-app/constants";
import { PetFace } from "~/app/_components/pet-app/pet-visuals";
import { type Species } from "~/app/_components/pet-app/types";

export function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        fontFamily: "'Nunito', sans-serif",
        color: INK,
        background: PAPER,
      }}
    >
      {children}
    </div>
  );
}

export function SignInScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "'Nunito', sans-serif",
        background: PAPER,
        color: INK,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        <img src="/pets/egg.svg" alt="" style={{ width: 34, height: "auto" }} />
        Spaced Eggs
      </div>
      <div style={{ fontSize: 15, color: "oklch(48% 0.04 255 / 0.7)" }}>
        Sign in to start studying and keep your pet happy.
      </div>
      <button
        onClick={() => signIn("google")}
        style={{
          padding: "14px 28px",
          border: "none",
          borderRadius: 16,
          background: TERRACOTTA,
          color: "oklch(98% 0.01 90)",
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}

export function NamePetScreen({
  species,
  onSubmit,
}: {
  species: Species;
  onSubmit: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const speciesInfo = SPECIES[species];
  const trimmed = name.trim();

  function submit() {
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    void Promise.resolve(onSubmit(trimmed));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "'Nunito', sans-serif",
        background: PAPER,
        color: INK,
        padding: 24,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          animation: "petBounce 2.6s ease-in-out infinite",
        }}
      >
        {/* This screen only ever appears right at the hatch moment — see
        the "stage !== egg && !name" gate in signed-in-pet-app.tsx — so the
        pet is always freshly at the "child" stage here. */}
        <PetFace species={species} size={120} stage="child" />
      </div>
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 26,
          textAlign: "center",
        }}
      >
        Your {speciesInfo.label.toLowerCase()} hatched!
      </div>
      <div
        style={{
          fontSize: 14,
          color: "oklch(48% 0.04 255 / 0.7)",
          textAlign: "center",
          maxWidth: 360,
        }}
      >
        What do you want to name them?
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        maxLength={24}
        placeholder="Pet name"
        disabled={isSubmitting}
        style={{
          width: 260,
          padding: "12px 16px",
          border: `2px solid ${CARD_LINE}`,
          borderRadius: 16,
          background: CARD_BG,
          color: INK,
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          textAlign: "center",
          outline: "none",
        }}
      />
      <button
        onClick={submit}
        disabled={!trimmed || isSubmitting}
        style={{
          padding: "14px 28px",
          border: "none",
          borderRadius: 16,
          background: TERRACOTTA,
          color: "oklch(98% 0.01 90)",
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          cursor: !trimmed || isSubmitting ? "default" : "pointer",
          opacity: !trimmed || isSubmitting ? 0.6 : 1,
        }}
      >
        Confirm name
      </button>
    </div>
  );
}

export function SpeciesPickerScreen({
  onChoose,
}: {
  onChoose: (species: Species) => void | Promise<void>;
}) {
  const [isChoosing, setIsChoosing] = useState(false);
  // Offer a random 3 of all species each time this screen mounts, rather
  // than always all of them or a fixed trio.
  const [offeredSpecies] = useState<Species[]>(() => {
    const all = Object.keys(SPECIES) as Species[];
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: "'Nunito', sans-serif",
        background: PAPER,
        color: INK,
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 26,
          textAlign: "center",
        }}
      >
        Choose your companion
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {offeredSpecies.map((key) => (
          <button
            key={key}
            disabled={isChoosing}
            onClick={() => {
              setIsChoosing(true);
              void Promise.resolve(onChoose(key));
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: 20,
              width: 150,
              border: `2px solid ${CARD_LINE}`,
              borderRadius: 22,
              background: CARD_BG,
              cursor: isChoosing ? "default" : "pointer",
              opacity: isChoosing ? 0.6 : 1,
            }}
          >
            <div style={{ width: 90, height: 90 }}>
              <PetFace species={key} size={90} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {SPECIES[key].label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
