# Spaced Eggs (app)

A [T3 Stack](https://create.t3.gg/) app — Next.js, TypeScript, tRPC, Prisma (SQLite), NextAuth (Google OAuth). See [docs/architecture.md](../docs/architecture.md) and [docs/vision.md](../docs/vision.md) for the project background.

## Getting started

1. Install dependencies:

   ```
   pnpm install
   ```

2. If pnpm printed a warning about "Ignored build scripts", approve them — this project needs `better-sqlite3`'s native build and Prisma's postinstall to actually run:

   ```
   pnpm approve-builds --all
   ```

3. Copy `.env.example` to `.env` and fill in the values. Ask a teammate for `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` (these are shared dev credentials — don't post them anywhere public).

4. Create your local database (everyone has their own SQLite file — nothing here is shared):

   ```
   pnpm prisma migrate deploy
   ```

5. Run the dev server:

   ```
   pnpm dev
   ```

   It must run on **port 3000** — the Google OAuth client's only authorized redirect URI is `http://localhost:3000/api/auth/callback/google`. If something else is already using port 3000, stop that first rather than letting Next fall back to another port, or Google sign-in will fail.

## Troubleshooting

**"Server error" right after signing in with Google** — almost always one of:

- Step 2 (`pnpm approve-builds --all`) or step 4 (`pnpm prisma migrate deploy`) above was skipped, so the Prisma client can't actually read/write your local database when NextAuth tries to create your user on first sign-in.
- The dev server isn't running on port 3000 (see step 5) — Google rejects the redirect before it ever reaches the app.

## Deploying

Follow the T3 deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify), or [Docker](https://create.t3.gg/en/deployment/docker) — not yet decided for this project (see [docs/architecture.md](../docs/architecture.md)).
