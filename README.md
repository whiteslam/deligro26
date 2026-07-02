# Deligro — Customer App

**Phase 1 · Static UI/UX** (no backend yet — all data is mock, cart/theme run client-side).

The customer surface from the Deligro spec: warm-minimalism, bento home, glassmorphic
persistent cart, time-aware dark mode, and live order tracking.

## Run

```bash
npm install
npm run dev     # http://localhost:3000 (or next free port)
npm run build   # production build
```

Open in a desktop browser and it renders inside a centered phone frame; on mobile it's
full-screen. Toggle light/dark from the header or Profile → Appearance (it also
auto-switches by local time: dark 19:00–06:00).

## Screens (all wired to navigation)

| Route | Screen |
|---|---|
| `/` | Home — asymmetric bento discovery (hero promo, live order, reorder, AI stub, categories, nearby-by-ETA) |
| `/search` | Search with keyword + cuisine/price/rating filters, empty state |
| `/restaurant/[slug]` | Restaurant menu, category tabs, add-to-cart |
| `/checkout` | Cash-on-Delivery checkout (address, timing, bill) |
| `/orders` | Active + past orders, track / reorder / rate |
| `/orders/[id]` | Live tracking — map, ETA, stage stepper, rider card |
| `/profile` | Profile, addresses, appearance, settings |

The **glass cart** is a persistent sheet (peek bar → expandable overlay), not a tab — the
"two-tap rule" from the UX doc. One-tap **reorder** pre-fills it from history.

## Design system

Tokens live in `src/app/globals.css` (`--bg --surface --ink --muted --accent --green
--blue --line`, light + dark). Type scale: Fraunces (display serif), Inter (sans),
JetBrains Mono (data). Orange is reserved for one job — the primary action and the live moment.

## Structure

Follows the Folder Structure doc, under `src/`:

```
src/
├─ app/(customer)/   # route group — all customer screens + shell layout
├─ components/       # ui/ bento/ glass/ layout/ shared/ + per-screen folders
├─ stores/          # zustand: cart-store, ui-store
├─ lib/             # data.ts (mock), utils/
└─ types/           # domain types
```

## Not in this phase

Backend/Supabase, real auth (Hostinger OTP), live payments, real maps, and the AI
assistant are later phases (C2–C4). The groundwork — feature folders, cart state,
COD checkout flow — is in place for them to plug into.
