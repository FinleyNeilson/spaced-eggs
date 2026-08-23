# Roadmap

Status: Phase 0 and Phase 1 (MVP) are built; Phase 2 is in progress (pet
lifecycle/growth landed, several other items still open — see below).

## Phase 0 — Foundations

- [x] Pick stack for the web app — [T3 stack](https://create.t3.gg/)
      (Next.js, TypeScript, tRPC, Prisma, NextAuth, Tailwind); see
      [architecture.md](./architecture.md)
- [x] Pick/design the SRS algorithm — roll our own SM-2 (see
      [architecture.md](./architecture.md))
- [x] Decide the pet stat model — single health stat, one pet per user,
      computed on-demand (see [architecture.md](./architecture.md))
- [x] Rough data model: users, decks, cards, review history, pet state (see
      [architecture.md](./architecture.md); pet state model has since
      evolved further, see Phase 2)

## Phase 1 — MVP (web)

Goal: a single user can create a deck, review cards on an SRS schedule, and
watch a pet react to that review history.

- [x] Deck/card CRUD (create, edit, delete decks and cards)
- [x] Review session flow (show due cards, capture pass/fail or graded
      recall, reschedule per SRS algorithm)
- [x] Pet state engine: compute pet stats from review history/overdue state
- [x] Pet UI: at minimum a visual state (sprite/mood) that reflects current
      stats
- [x] Persistence via Prisma + NextAuth accounts (local-only storage is off
      the table now that the stack is decided)

## Phase 2 — Depth

- [x] Pet growth/evolution stages — implemented as egg → child → teen →
      adult, paced by aggregate review-interval maturity rather than
      literal login/review streaks (see architecture.md)
- [ ] Richer stat model if MVP shipped with a single bar
- [~] Neglect/recovery states — death exists (health at 0 past a 24h grace
      window retires the pet and spawns a new egg), but there's no
      warning/rescue mechanic during that window; also no "abandon for
      weeks" state beyond what health/growth already capture
- [ ] Deck import/export or sharing
- [ ] Decide the fate of `app/src/app/_components/pet-app/` (unwired
      modular component split sitting next to the live monolithic
      `pet-app.tsx`) before it drifts further — finish wiring it in or
      delete it
- [ ] Village fixed-building navigation (study hall/decks/stats/settings as
      in-scene links) — not started, still on the table if the tab bar
      turns out not to be enough
- [ ] Decide the optional-deadline-on-top-of-pace question (see
      vision.md open questions)

## Phase 3 — Mobile (stretch)

Only after web MVP is solid. Framework choice (native vs. React
Native/Flutter) deferred until this phase starts.

- [ ] Evaluate reusing web frontend vs. native rebuild
- [ ] Mobile-specific pet engagement (notifications for due reviews /
      neglected pet)

## Non-goals (for now)

- Multiplayer/social features — explicitly deferred, see vision doc open
  questions.
- Per-deck pets — considered, not adopted; a user has one active pet
  (shared across all decks) plus a retired-pet history, see
  [architecture.md](./architecture.md).
