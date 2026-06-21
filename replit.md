# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- **500-line file limit:** Any file that exceeds 500 lines must be split. Extract logical sections (components, helpers, hooks, utils) into separate files. Never let a single file grow beyond 500 lines — refactor proactively before hitting the limit.

- **Supabase only:** All backend services, database, auth, and file storage must use Supabase exclusively. No other external services, databases, or storage providers are permitted.

- **English only in code:** All code (variable names, comments, strings, file names) must be written in English only. No Bengali, transliteration, or mixed language anywhere in the codebase.

- **Plan before coding:** Never make code changes without explicit user approval. If a new feature, refactor, or improvement is identified, present a clear plan first and wait for approval before writing any code. For bug fixes, state the plan clearly before acting.

- **Deep analysis before any fix:** Before fixing any error, perform a thorough root-cause analysis — read all relevant files, trace the full code path, and identify the exact cause. Never make edits based on assumptions. Present the analysis and intended fix clearly. Do not touch unrelated code while fixing an error.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
