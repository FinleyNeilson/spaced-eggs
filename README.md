# Spaced Eggs

Spaced repetition works, but nobody sticks with it, because the cost of
skipping a day is invisible. Spaced Eggs makes the cost visible: you study
flashcards on a spaced-repetition schedule, and a pet lives or dies by
whether you're actually keeping up with your reviews. Reaching adulthood
graduates the pet into your village as a permanent resident; letting it go
too long without review kills it. Either way, a new egg starts.

See [docs/vision.md](docs/vision.md) for the full pitch and design
rationale, and [docs/architecture.md](docs/architecture.md) for the stack,
data model, and current implementation status.

## Repo layout

- [`app/`](app/) — the T3 Stack (Next.js, TypeScript, tRPC, Prisma,
  NextAuth) web app. See [`app/README.md`](app/README.md) to get it running
  locally.
- [`docs/`](docs/) — product vision, architecture decisions, and roadmap.

## Status

Phase 0 (foundations) and Phase 1 (MVP) are built; Phase 2 (depth) is in
progress. See [docs/roadmap.md](docs/roadmap.md) for what's done and what's
next.
