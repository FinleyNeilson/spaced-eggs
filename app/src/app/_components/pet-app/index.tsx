"use client";

import { useSession } from "next-auth/react";

// Ported from the "Hatchly" design prototype (Pet-Powered Flashcard App.zip),
// restyled to the cozy sticker look in docs/assets/ (cream body, thick navy
// outline, blush cheeks). Wired to the real backend (deck/card/review/pet
// routers) — see docs/vision.md for the SRS-driven pet loop this implements.
// The home screen's 7-day accuracy figure is still a mock placeholder —
// there's no historical-aggregation endpoint for it yet.

import {
  CenteredMessage,
  SignInScreen,
} from "~/app/_components/pet-app/entry-screens";
import { SignedInPetApp } from "~/app/_components/pet-app/signed-in-pet-app";
import { LoadingSpinner } from "~/app/_components/loading-spinner";

export function PetApp() {
  const { data: session, status } = useSession();

  if (status === "loading")
    return (
      <CenteredMessage>
        <LoadingSpinner size={34} label="Loading your account" />
        Loading…
      </CenteredMessage>
    );
  if (!session) return <SignInScreen />;
  return <SignedInPetApp />;
}
