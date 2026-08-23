# Architecture notes

Status: stack, SRS scheduling, pet state engine, and the data model are now
decided (see below). Pet visual states are implemented (species art +
egg/ghost sprites, see `vision.md`'s visual style reference); hosting is
still open. See "Known loose ends" below for in-progress work worth
tracking.

## Constraints from the vision

- Pet state must be **derived from** SRS review data (due dates, accuracy,
  streaks), not stored independently as a separate source of truth. The
  review history is canonical; pet stats are a computed/cached view over it.
- Web-first. Whatever we pick should not block a later mobile client reusing
  the backend/API.

## Decisions

### SRS scheduling

**Decided: roll our own SM-2-style scheduler.**

Per-card state lives on `Card` (see data model below): ease factor,
repetition count, and interval, all updated after each review via the
standard SM-2 formula. `submitReview` (tRPC) is the single hook point where a
review event updates this state and appends a `ReviewLog` row.

### Pet state engine

**Implemented: single health stat + a pace-based growth/lifecycle, one
active pet per user at a time, computed on-demand.** (This supersedes the
original "one `Pet` per `User`, unique" decision below — a user now
accumulates a *history* of pets, not a single permanent one.)

- `Pet.userId` is indexed but **not unique** — a user has many `Pet` rows
  over time. The active pet is whichever row has `retiredAt: null`
  (`getActivePet` in `server/pet/growth.ts`); if none exists, one is
  created. Reviewing history from prior pets is retained, not deleted.
- `health` (0-100) is computed at read time from overdue card count/age and
  recent accuracy, aggregated from `ReviewLog` + `Card.dueAt`
  (`server/pet/health.ts`). There is deliberately no daily-login-streak
  bonus/factor anywhere in this formula or the UI (see vision.md's "Bounded
  survival, not infinite streak") — an earlier revision had one and it was
  removed.
- **Growth/lifecycle** is a second, separate axis, added after the original
  decision: a `LifeStage` (`egg | child | teen | adult`) derived from
  "growth points" — `getGrowthPoints` sums, per card reviewed since the
  active pet's `createdAt`, `min(1, intervalDays / MATURE_INTERVAL_DAYS)`
  (`MATURE_INTERVAL_DAYS = 21`) across *all* of the user's decks/cards, not
  scoped per-deck. `stageForMastery` maps total growth points to a stage via
  `STAGE_THRESHOLDS` (adult ≥8, teen ≥3, child ≥1, egg ≥0).
- **Two terminal transitions, both immediately followed by a fresh egg:**
  - `review.submit` checks after each review whether growth points now
    cross into `"adult"`; if so, retires the pet (`retirementReason:
    "graduated"`) and creates a new blank `Pet`.
  - `getActivePet` lazily checks on every read whether the active pet is
    older than `PET_GRACE_HOURS` (24h, `server/pet/health.ts`) **and**
    `health === 0`; if so, retires it (`retirementReason: "died"`) and
    creates a new blank `Pet`. There's no cron — death is only discovered
    when something next reads pet state.
- `species` (nullable until chosen post-hatch via `pet.setSpecies`) and
  `retirementReason` are plain `String` columns, not native Prisma enums
  (SQLite doesn't support them) — validated with `z.enum()` at the tRPC
  boundary instead. `retirementReason` is one of `"graduated" | "died"`.
- A **dev-only** router, `server/api/routers/debug.ts` (gated by
  `assertDevOnly()`), exposes `matureAllCards`, `advanceStage`,
  `forceGraduate`, `forceDie`, and `resetAccount` — lets lifecycle changes
  be tested without waiting out real review history.
- Decks separately show their own progress: `deck.list` computes a per-deck
  level (1-10, via `computeDeckLevel` in `growth.ts`) from that deck's own
  growth points, distinct from the pet's aggregate growth. This is a UI
  progress indicator on individual decks, not a second pet-lifecycle axis.

### Stack

**Decided: [T3 stack](https://create.t3.gg/).**

- **Next.js** — frontend + backend in one app (satisfies the web-first
  constraint; also the most reusable base if we ever want a React Native
  mobile client later, per the vision doc's mobile-stretch goal).
- **TypeScript** — end-to-end types, including through tRPC into the pet
  engine and SRS scheduler.
- **tRPC** — typed API layer between client and server; good fit for the
  review-event → pet-state-recompute flow since the client can call a single
  typed `submitReview` procedure.
- **Prisma** — ORM, maps directly onto the data model below.
- **NextAuth (Auth.js)** — accounts, since `User`/`Deck` ownership implies we
  need auth from the start rather than deferring to local-only storage.
- **Tailwind CSS** — styling, including whatever the pet's visual states
  turn out to be (sprite/CSS-driven, TBD).
- Hosting: TBD (Vercel is the natural default for a T3 app but not decided).

### Data model

- `User` / `Account` / `Session` / `VerificationToken` — standard NextAuth
  tables, unmodified.

- `Deck`
  - `id`, `userId` (FK → `User`), `name`, `description?`, `createdAt`

- `Card` — belongs to a `Deck`
  - `id`, `deckId` (FK → `Deck`), `front`, `back`
  - SM-2 scheduling state: `easeFactor` (float, default 2.5), `intervalDays`
    (int, default 0), `repetitions` (int, default 0), `dueAt` (datetime,
    defaults to now so new cards are immediately due)
  - `createdAt`, `updatedAt`

- `ReviewLog` — one row per review, canonical review history
  - `id`, `cardId` (FK → `Card`), `reviewedAt`, `grade` (0-5, SM-2 style)
  - `previousInterval`, `newInterval`, `previousEase`, `newEase` — snapshot of
    the SM-2 transition, so past scheduling decisions can be inspected/debugged
    without recomputing them

- `Pet` — one row per pet in a user's lineage, not one row per user
  - `id`, `userId` (FK → `User`, **indexed, not unique** — see pet state
    engine above), `name?`, `species?` (nullable until chosen post-hatch),
    `retiredAt?` (null = this is the active pet), `retirementReason?`
    (`"graduated" | "died"`, set only alongside `retiredAt`), `createdAt`
  - No stored `health` column — still computed at read time. Growth/life
    stage is likewise computed on-demand (`getGrowthPoints` +
    `stageForMastery`), not stored.
  - Added across three migrations as the model evolved:
    `add_pet_species` → `pet_lifecycle` (dropped the old unique constraint
    on `userId`, added `retiredAt`) → `pet_retirement_reason`.
  - `Deck` has no deadline/goal-date field — growth is paced purely by
    review activity, not a calendar date (see `vision.md` open questions).

This satisfies the Phase 0 roadmap item "rough data model: users, decks,
cards, review history, pet state." Schema now lives in
`app/prisma/schema.prisma`.

## Known loose ends

- The UI has been split from the original monolithic `pet-app.tsx` into
  `app/src/app/_components/pet-app/` (`index.tsx` entry point,
  `village.tsx`, `screens/*`, etc.) — `page.tsx` now imports from this
  directory and the old single-file version is gone.
