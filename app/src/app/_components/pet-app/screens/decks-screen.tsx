"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  CARD_BG,
  CARD_LINE,
  GOLDEN,
  INK,
  MASTERED_GREEN,
  MASTERED_GREEN_BG,
  STUDY_BLUE,
  TERRACOTTA,
} from "~/app/_components/pet-app/constants";
import { type DeckSummary } from "~/app/_components/pet-app/types";
import { LoadingSpinner } from "~/app/_components/loading-spinner";

// Fallback used only before the grid has measured itself (see
// useGridPageSize below) — doesn't need to be exact.
const DEFAULT_PAGE_SIZE = 9;

// Must match the grid's own CSS below (gridTemplateColumns minmax + gap).
const GRID_GAP = 14;
const CARD_MIN_WIDTH = 280;
// A fixed estimate of DeckCard's rendered height, not a measurement of an
// actual rendered card — see the note in useGridPageSize on why measuring
// a real card is a trap. Matches the card's fixed padding/font-size/row
// spacing below; nudge this if that layout changes materially.
const CARD_HEIGHT_ESTIMATE = 130;

type FilterKey = "all" | "due" | "inProgress" | "mastered";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "due", label: "Due today" },
  { key: "inProgress", label: "In progress" },
  { key: "mastered", label: "Mastered" },
];

type SortKey = "recentlyStudied" | "name" | "dueCount" | "level";

// Measures how much space the grid has (itself sized by flexbox to fill
// the page) and reports how many card columns/rows fit in it, so "how many
// decks per page" is always however many fill the screen on any viewport,
// instead of a static guess that's too many on some screens and leaves
// empty space on others.
//
// Deliberately does NOT measure a rendered card's actual width to compute
// columns: gridTemplateColumns uses `1fr`, which stretches cards to fill
// however many columns got chosen. Measuring that stretched width and
// feeding it back is a self-reinforcing trap — fewer columns makes cards
// wider, which (mis)measured, computes even fewer columns next time, until
// it bottoms out. Using the CSS's own fixed minimum (CARD_MIN_WIDTH) is
// exactly the number auto-fill itself uses to decide column count, so it
// can't be thrown off by how the previous render happened to stretch.
function useGridPageSize(gridRef: React.RefObject<HTMLDivElement | null>) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    function recompute() {
      const el = gridRef.current;
      if (!el) return;

      const columns = Math.max(
        1,
        Math.floor((el.clientWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)),
      );
      const rows = Math.max(
        1,
        Math.floor(
          (el.clientHeight + GRID_GAP) / (CARD_HEIGHT_ESTIMATE + GRID_GAP),
        ),
      );
      setPageSize(columns * rows);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gridRef]);

  return pageSize;
}

export function DecksScreen({
  decks,
  isCreatingDeck,
  setIsCreatingDeck,
  newDeckName,
  setNewDeckName,
  onCreateDeck,
  isCreatingDeckPending,
  onStartReview,
  onPractice,
  onManageDeck,
  onCreateWithAi,
}: {
  decks: DeckSummary[];
  isCreatingDeck: boolean;
  setIsCreatingDeck: React.Dispatch<React.SetStateAction<boolean>>;
  newDeckName: string;
  setNewDeckName: React.Dispatch<React.SetStateAction<string>>;
  onCreateDeck: () => Promise<void>;
  isCreatingDeckPending: boolean;
  onStartReview: (deckId: string) => void;
  onPractice: (deckId: string) => void;
  onManageDeck: (deckId: string) => void;
  onCreateWithAi: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recentlyStudied");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const pageSize = useGridPageSize(gridRef);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return decks.filter((d) => {
      if (query && !d.name.toLowerCase().includes(query)) return false;
      if (filter === "due") return d.dueCards > 0;
      if (filter === "mastered") return d.isMastered;
      if (filter === "inProgress") return !d.isMastered && d.level > 1;
      return true;
    });
  }, [decks, search, filter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "dueCount":
        return list.sort((a, b) => b.dueCards - a.dueCards);
      case "level":
        return list.sort((a, b) => b.level - a.level);
      case "recentlyStudied":
      default:
        return list.sort((a, b) => {
          const aTime = a.lastStudiedAt
            ? new Date(a.lastStudiedAt).getTime()
            : -Infinity;
          const bTime = b.lastStudiedAt
            ? new Date(b.lastStudiedAt).getTime()
            : -Infinity;
          return bTime - aTime;
        });
    }
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageDecks = sorted.slice(pageStart, pageStart + pageSize);

  function updateFilter(key: FilterKey) {
    setFilter(key);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const inputStyle = {
    padding: "10px 14px",
    borderRadius: 14,
    border: `2px solid ${CARD_LINE}`,
    fontSize: 14,
    fontFamily: "inherit",
    background: CARD_BG,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // `flex: 1` (not `height: "100%"`) so this actually stretches to
        // fill the parent panel. height:100% here silently resolved to the
        // content's own height instead (percentage heights don't reliably
        // resolve against a flex-grown ancestor unless that ancestor is
        // itself a flex container), so the deck grid below was shrinking to
        // fit however many cards a filter/search left on the page, which
        // fed back into useGridPageSize computing fewer rows — the fewer
        // decks matched a filter, the fewer decks could even fit per page.
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 30,
          }}
        >
          Your decks
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setIsCreatingDeck(true)}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: 16,
              background: "oklch(87% 0.08 140)",
              color: "oklch(32% 0.07 140)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + New deck
          </button>
          <button
            onClick={onCreateWithAi}
            style={{
              padding: "12px 20px",
              border: "none",
              borderRadius: 16,
              background: "#FFED96",
              color: "oklch(30% 0.09 97)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Create with AI
          </button>
        </div>
      </div>

      {isCreatingDeck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-deck-title"
          className="ai-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isCreatingDeckPending
            ) {
              setIsCreatingDeck(false);
              setNewDeckName("");
            }
          }}
        >
          <div
            className="ai-modal-card"
            style={{
              width: "min(460px, 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              <div>
                <div id="new-deck-title" className="ai-modal-title">
                  Create a new deck
                </div>
                <div className="ai-modal-subtitle">
                  Give your deck a name. You’ll add and manage its cards next.
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="ai-close"
                disabled={isCreatingDeckPending}
                onClick={() => {
                  setIsCreatingDeck(false);
                  setNewDeckName("");
                }}
              >
                ×
              </button>
            </div>

            <label
              htmlFor="new-deck-name"
              style={{
                display: "block",
                marginTop: 22,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Deck name
              <input
                id="new-deck-name"
                autoFocus
                maxLength={100}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDeckName.trim()) {
                    void onCreateDeck();
                  }
                }}
                placeholder="e.g. Biology exam review"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                disabled={isCreatingDeckPending}
                onClick={() => {
                  setIsCreatingDeck(false);
                  setNewDeckName("");
                }}
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 12,
                  background: "oklch(91% 0.03 230)",
                  color: INK,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onCreateDeck()}
                disabled={!newDeckName.trim() || isCreatingDeckPending}
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 12,
                  background: TERRACOTTA,
                  color: "oklch(98% 0.01 90)",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {isCreatingDeckPending ? (
                  <span className="loading-button-content">
                    <LoadingSpinner size={16} label="Creating deck" light />
                    Creating…
                  </span>
                ) : (
                  "Create and add cards"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={`Search ${decks.length} deck${decks.length === 1 ? "" : "s"}`}
            style={{
              ...inputStyle,
              width: "100%",
              padding: "10px 14px",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "oklch(94% 0.035 230)",
            padding: 4,
            borderRadius: 14,
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => updateFilter(f.key)}
              style={{
                border: "none",
                background:
                  filter === f.key ? "oklch(88% 0.09 42)" : "transparent",
                color:
                  filter === f.key
                    ? "oklch(50% 0.15 42)"
                    : "oklch(45% 0.04 255 / 0.65)",
                padding: "9px 14px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{ ...inputStyle, fontWeight: 700, cursor: "pointer" }}
        >
          <option value="recentlyStudied">Sort: Recently studied</option>
          <option value="name">Sort: Name (A-Z)</option>
          <option value="dueCount">Sort: Most due</option>
          <option value="level">Sort: Highest level</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            marginTop: 18,
            background: CARD_BG,
            borderRadius: 22,
            padding: 32,
            border: `2px solid ${CARD_LINE}`,
            textAlign: "center",
            color: "oklch(48% 0.04 255 / 0.6)",
            flexShrink: 0,
          }}
        >
          No decks match {search ? `"${search}"` : "this filter"}.
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            alignContent: "start",
            gap: 14,
            marginTop: 18,
            flex: 1,
            minHeight: 0,
          }}
        >
          {pageDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onStudy={() => onStartReview(deck.id)}
              onPractice={() => onPractice(deck.id)}
              onManage={() => onManageDeck(deck.id)}
            />
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
            flexWrap: "wrap",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "oklch(48% 0.04 255 / 0.6)",
            }}
          >
            {pageStart + 1}-{Math.min(pageStart + pageSize, sorted.length)} of{" "}
            {sorted.length} decks
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PageButton
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ‹
              </PageButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PageButton
                  key={p}
                  active={p === currentPage}
                  onClick={() => setPage(p)}
                >
                  {p}
                </PageButton>
              ))}
              <PageButton
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                ›
              </PageButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        border: "none",
        borderRadius: 10,
        background: active ? "oklch(88% 0.09 42)" : "transparent",
        color: active
          ? "oklch(50% 0.15 42)"
          : disabled
            ? "oklch(70% 0.02 255 / 0.5)"
            : INK,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function DeckCard({
  deck,
  onStudy,
  onPractice,
  onManage,
}: {
  deck: DeckSummary;
  onStudy: () => void;
  onPractice: () => void;
  onManage: () => void;
}) {
  const badgeLabel = deck.dueCards > 0 ? `${deck.dueCards} due` : "All done";
  const badgeBg = deck.dueCards > 0 ? "oklch(90% 0.09 42)" : MASTERED_GREEN_BG;
  const badgeColor = deck.dueCards > 0 ? "oklch(46% 0.14 42)" : MASTERED_GREEN;
  const xpPct =
    deck.xpToNextLevel > 0
      ? Math.round((deck.xpInLevel / deck.xpToNextLevel) * 100)
      : 100;

  return (
    <div
      style={{
        background: CARD_BG,
        borderRadius: 16,
        padding: 14,
        border: `2px solid ${CARD_LINE}`,
        boxShadow: "0 6px 18px oklch(35% 0.06 260 / 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {deck.name}
        </div>
        <div
          style={{
            background: badgeBg,
            color: badgeColor,
            fontWeight: 800,
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 10,
            whiteSpace: "nowrap",
          }}
        >
          {badgeLabel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 4,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span style={{ color: "oklch(48% 0.04 255 / 0.6)" }}>
          {deck.totalCards} cards · Level {deck.level}
        </span>
        <span style={{ color: "oklch(48% 0.04 255 / 0.6)" }}>
          {deck.xpInLevel.toLocaleString()}/
          {deck.xpToNextLevel.toLocaleString()} XP
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 4,
          background: "oklch(91% 0.03 230)",
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${xpPct}%`,
            background: deck.isMastered ? MASTERED_GREEN : GOLDEN,
            borderRadius: 4,
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {deck.dueCards > 0 ? (
          <button
            onClick={onStudy}
            style={{
              flex: 1,
              padding: 9,
              border: "none",
              borderRadius: 12,
              background: STUDY_BLUE,
              color: "oklch(98% 0.01 90)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Study
          </button>
        ) : deck.totalCards > 0 ? (
          <button
            onClick={onPractice}
            title="Study these cards even though nothing's due yet, still submits real reviews"
            style={{
              flex: 1,
              padding: 9,
              border: `2px solid ${CARD_LINE}`,
              borderRadius: 12,
              background: "transparent",
              color: INK,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Practice anyway
          </button>
        ) : (
          <button
            disabled
            style={{
              flex: 1,
              padding: 9,
              border: "none",
              borderRadius: 12,
              background: "oklch(91% 0.03 230)",
              color: "oklch(60% 0.02 255 / 0.5)",
              fontWeight: 800,
              fontSize: 13,
              cursor: "default",
            }}
          >
            Study
          </button>
        )}
        <button
          onClick={onManage}
          style={{
            padding: "9px 14px",
            border: `2px solid ${CARD_LINE}`,
            borderRadius: 12,
            background: "transparent",
            color: INK,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Manage
        </button>
      </div>
    </div>
  );
}
