---
name: Supabase Auth Architecture
description: How Supabase Auth is wired into the YDMS stack (frontend + backend)
---

## Architecture

Frontend (`@workspace/ydms`) authenticates directly with Supabase using `signInWithPassword` / `signUp` / `signOut`. The Supabase access_token is attached to every API request via `setAuthTokenGetter` from `@workspace/api-client-react`.

Backend (`@workspace/api-server`) verifies the token using `supabaseAdmin.auth.getUser(token)` in `authMiddleware.ts`, then upserts the user into the local `users` table and sets `req.user`.

**Why:** Supabase handles password hashing, email confirmation, and token refresh. We don't need server-side sessions for web auth.

**How to apply:**
- Frontend: `artifacts/ydms/src/hooks/useAuth.ts` wraps Supabase auth + `artifacts/ydms/src/lib/supabase.ts` creates the client
- `artifacts/ydms/src/lib/api.ts` registers `setAuthTokenGetter(async () => session?.access_token)`
- Backend: `artifacts/api-server/src/lib/supabaseAdmin.ts` + `artifacts/api-server/src/middlewares/authMiddleware.ts`
- `req.user` type (in Express global) includes `id, email, firstName, lastName, profileImageUrl, role`
- `usersTable` has `role: varchar("role").notNull().default("operator")`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (backend secret)
