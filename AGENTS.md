<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Deligro project rules

## Before shipping

Two checklists are the standing gates. Work through the relevant one rather than
re-deriving what matters each time:

- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — run before every release,
  and **always** when a change touches an RLS policy, a `grant`, an auth path,
  an upload, or adds a column to a table that anon/authenticated can read.
- [`docs/DEPLOYMENT_AUDIT.md`](docs/DEPLOYMENT_AUDIT.md) — run before every
  promotion to production.

Both have a log table at the bottom. Fill it in; the history is the point.

## Security rules that are easy to get wrong here

1. **RLS filters rows, not columns.** Adding a column to a publicly-readable
   table is a security change. `restaurants` grants SELECT on an explicit
   column list (migration 0022) — a new column is invisible until granted on
   purpose. If a field doesn't appear in the app, that is the guard working.
2. **Never fail open.** A missing env var, an unreachable service or a failed
   config check must reduce access, never widen it. `requireRole()` returning a
   synthetic admin when Supabase keys are absent was a real bug (H-1).
3. **Server Actions are public HTTP endpoints.** Every exported `"use server"`
   function starts with a role check. No exceptions for "internal" helpers.
4. **Credentials are never stored in reproducible form.** Show once, then drop.
   The single, documented exception is `vendor_login_credentials` (migration
   0039): vendors are onboarded by hand and the admin desk has to read their
   login back to them. It is defensible only because of its containment — own
   table, RLS on with no policies, all privileges revoked from
   `anon`/`authenticated`, `service_role` only, reached through the
   `server-only` `vendor-credentials.ts` behind `requireRole("admin")`. Do not
   extend the exception, and do not put a plaintext credential on a table that
   anon or authenticated can read — that was audit finding C-2.
5. **`createAdminClient()` bypasses RLS.** Every call needs an authorization
   check above it in the same path.
6. **Rate-limit every write endpoint.** `user.id` when authenticated,
   `clientIp(request)` when not.

## Resolving conflicting or duplicated code

When two implementations of the same thing exist — a merge conflict, a leftover
from a refactor, two data-access paths for one concept — do not default to
"newest wins" or "keep both". Judge them, and keep the one that is better
**for this project**, in this order:

1. **Correctness and security.** The version that enforces authorization at the
   database, validates server-side, and fails closed wins outright. This
   outranks everything below it.
2. **Integration.** The version already wired into the rest of the app — the one
   whose types, RLS policies, callers and tests line up — beats the more elegant
   orphan. A better function nobody calls is worse than an adequate one the app
   depends on.
3. **Completeness.** The version that handles the real cases (guest vs user vs
   operator, missing migration, offline SMS provider) beats the happy path.
4. **Clarity.** Only when the above tie.

Then **delete the loser**. Dead alternates are how a codebase acquires two
sources of truth, and the next person cannot tell which one is live. If both
versions have something worth keeping, merge deliberately into one and say so in
the commit message — do not leave the other in place "just in case".

If the better-integrated version is the less secure one, fix its security rather
than swapping in the orphan. Keep the wiring, raise the floor.

## Documentation must match behaviour

`SECURITY.md`, migration comments and doc comments are load-bearing — the audit
found admin MFA documented as enforced in three places while
`MFA_REQUIRED_ROLES` was an empty array. When you change a control, update what
claims it exists. A stale security doc is worse than none, because it stops the
next reviewer from looking.
