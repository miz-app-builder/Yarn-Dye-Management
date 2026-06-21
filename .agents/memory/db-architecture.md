---
name: YDMS Database Architecture
description: Where data is stored — Replit Postgres for app data, Supabase for auth only. User wants app data in Supabase.
---

# YDMS Database Architecture

## Current state (as of June 2026)

| Layer | Service | What it stores |
|---|---|---|
| **App data** | Replit built-in PostgreSQL | orders, factories, buyers, yarn_types, colors, lab_dips, deliveries, users, sessions |
| **Auth** | Supabase | User identity / JWT verification only (via supabaseAdmin client) |

**DATABASE_URL** currently points to `postgresql://postgres:password@helium/heliumdb` — Replit's local Postgres.

**SUPABASE_URL** = `https://zxcelcgzpubjnhgwnakd.supabase.co`

## User's intent

The user explicitly said: **"supabase hoby"** (it should be Supabase).  
App data should eventually move to **Supabase's built-in Postgres database**.

## How to migrate app data to Supabase Postgres

1. Get connection string from Supabase dashboard → Project Settings → Database → Connection string (URI mode).
   Format: `postgresql://postgres:[PASSWORD]@db.zxcelcgzpubjnhgwnakd.supabase.co:5432/postgres`
2. Update `DATABASE_URL` secret to the Supabase connection string.
3. Run `pnpm --filter @workspace/db run push` to push Drizzle schema to Supabase Postgres.
4. Done — all data will then live in Supabase.

**Why:** User wants a single cloud platform for both auth and data. Supabase Postgres is the intended persistent store.

**How to apply:** Any time a new developer joins or env vars are reset, `DATABASE_URL` must point to Supabase, NOT the local helium DB.
