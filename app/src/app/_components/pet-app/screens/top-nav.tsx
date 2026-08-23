"use client";

import { signOut } from "next-auth/react";

import {
  CARD_LINE,
  INK,
  TERRACOTTA_DEEP,
} from "~/app/_components/pet-app/constants";
import { type Screen } from "~/app/_components/pet-app/types";

export function TopNav({
  navItems,
  screen,
  setScreen,
}: {
  navItems: { key: Screen; label: string }[];
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  // Deck detail, review, and results are all part of the Decks flow even
  // though they have their own screen state.
  const activeNavKey =
    screen === "deckDetail" || screen === "review" || screen === "results"
      ? "decks"
      : screen;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "grid",
        // Both outer columns get equal flexible space, so the middle
        // (nav pill) column is always truly centered on the bar — a
        // flex row with justify-content:space-between only centers the
        // middle item when the two outer items happen to be the same
        // width, which the logo and sign-out button aren't.
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 16,
        padding: "12px 24px",
        background: "#FEFEFE",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${CARD_LINE}`,
      }}
    >
      <button
        onClick={() => setScreen("home")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 21,
          color: INK,
          whiteSpace: "nowrap",
          justifySelf: "start",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          // Otherwise a click that lands slightly off the icon/text still
          // selects it as text, which looks like a mis-click rather than
          // navigation.
          userSelect: "none",
        }}
      >
        <img
          src="/pets/egg.svg"
          alt=""
          style={{ width: 48, height: "auto", userSelect: "none" }}
          draggable={false}
        />
        Spaced Eggs
      </button>
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "#E9F7FF",
          padding: 4,
          borderRadius: 16,
          justifySelf: "center",
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setScreen(item.key)}
            style={{
              border: "none",
              background:
                activeNavKey === item.key
                  ? "#4A83A0"
                  : "transparent",
              color:
                activeNavKey === item.key
                  ? "white"
                  : "#7692A0",
              padding: "9px 16px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifySelf: "end",
        }}
      >
        <button
          onClick={() => void signOut()}
          style={{
            border: "none",
            background: "transparent",
            color: "#7692A0",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
