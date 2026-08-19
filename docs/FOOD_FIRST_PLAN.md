# Food-first Deligro — Home, ranking, cart/order, Stores

Plan for moving the customer app from restaurant-first to food-first discovery
(the Zomato/Swiggy model), including the multi-vendor same-dish ranking problem,
a cart/order-pipeline audit, and the Stores tab under the same model.

Status: **phase 1 (ranking) implemented and tested. Phases 2–5 not started.**
See §8 for what shipped, what changed against this plan, and why.

---

## 0. What already exists

This is not a rewrite. The food-first engine is built and shipped on two
surfaces; Home's browse state and the Stores tab are the parts still running the
old model.

| Piece | Where | State |
|---|---|---|
| Dish index over the catalog | `buildDishIndex` — `lib/search/dishes.ts` | ✅ done |
| Token scoring, dish name > category > cuisine > shop | `scoreToken` | ✅ done |
| 17 food categories with Indian vocabulary (thali, momos, paratha, egg, mithai…) | `FOOD_CATEGORIES` | ✅ done |
| Honest category fallback + captioning | `filterCategory`, `categoryBasis` | ✅ done |
| Dish result card with inline ADD | `components/search/dish-card.tsx` | ✅ done |
| Dish-level filters + sorts | `SearchFilters`, `DishSort` | ✅ done |
| One-kitchen-per-cart, with a confirm dialog built *for* dish-first | `stores/cart-switch-store.ts` | ✅ done |
| Server-authoritative pricing at order time | `createOrder` — `lib/data-access/orders.ts` | ✅ done |

`lib/search/dishes.ts` states the thesis in its own header:

> *"The catalog is modelled as restaurants that own menus, but a hungry person
> searches for food … and wants the dish, with the shop as an attribute of it."*

**Home's search field already does this.** Home's *browse* state (below the
field) does not — it is two `RestaurantCard` lists. The Stores tab does not at
all.

---

## 1. The ranking problem: same dish, many vendors

### 1.1 What happens today

`searchDishes` returns a **flat list with no grouping and no dedup**. Two vendors
selling "Paneer Butter Masala" are two independent rows. Because the token score
is identical for identical names, the entire ordering collapses onto `baseScore`:

```
baseScore =
  + 14                              popular / bestseller flag
  + min(unitsSold, 100) × 0.15      →  0 … +15
  + rating × 2                      →  0 … +10
  − min(etaMin, 60) × 0.15          →  0 …  −9
  − 60  if the dish is sold out
  − 45  if the shop is closed
```

Effective weight order: **units sold (15) > popular flag (14) > rating (10) > ETA (9)**.

### 1.2 Five defects in that ordering

**D1 — Price is not a factor at all.**
The same dish at ₹120 and ₹180 ranks purely on the seller's history. In a
price-sensitive small-city market this is the wrong default and the single
biggest miss.

**D2 — Distance is not a factor at all.**
`baseScore` is a pure function with no location input. `distanceToShop` exists
and Home already uses it for the *restaurant* list, but dish ranking is entirely
location-blind. For a hyperlocal app distance should outrank rating.

**D3 — Rating ignores rating count.**
`rating × 2` treats a 5.0 from 1 review as better than a 4.6 from 200. The seed
makes this concrete: `groceries-kirana-132`, `raw-meat-121` and several others
are seeded `rating 5, rating_count 0` — full marks on zero evidence.

**D4 — One vendor can flood the results.**
No per-vendor cap. A shop with six paneer variants owns the top of "paneer" and
pushes every other kitchen below the fold.

**D5 — Structural incumbency.**
`unitsSold` is the heaviest term and a new vendor starts at 0, so a newly
onboarded shop can never surface, so it never sells, so it never surfaces. There
is no exploration path out of this.

### 1.3 Proposed model — group, then champion

Match what Swiggy/Zomato actually do: **one row per dish, with the best vendor as
the champion and the rest collapsed behind it.**

```
Paneer Butter Masala                          ₹120
Sharma Bhojnalaya · 4.3 ★ · 1.2 km · 25 min      [ADD]
└ Also at 3 more places — from ₹120            ▸
```

**Step 1 — normalize the name.** Conservative for v1: lowercase, strip
punctuation, collapse whitespace, strip size/quantity qualifiers
(`half`, `full`, `regular`, `medium`, `large`, `8 piece`, `plate`). Exact match
on the normalized string only. *Do not* token-set match in v1 — "Butter Paneer
Masala" vs "Paneer Butter Masala" is tempting and "Chicken Roll" vs "Roll
Chicken Kathi" is how you get false merges. Add an explicit synonym map later,
driven by real query logs.

**Step 2 — score each vendor within the group.**

```
vendorScore =
    availability   open ? 0 : −1000        never champion a closed shop
                                            when an open one has the dish
  + proximity      − distanceKm × 8         hyperlocal: the heaviest term
  + speed          − etaMin × 0.4
  + price          − ((price − groupMinPrice) / groupMinPrice) × 25
                                            relative, so it works at any price point
  + trust          + bayesRating × 3
  + traction       + min(unitsSold, 100) × 0.10
  + newcomer       + 6   for the vendor's first 30 days
```

**Bayesian rating** fixes D3:

```
bayes = (C × m + rating × ratingCount) / (C + ratingCount)
        C = 20 (prior weight), m = 4.0 (platform mean)
```
A 5.0 from 0 reviews scores 4.0. A 4.6 from 200 scores 4.55. Correct.

**Step 3 — diversity cap** (fixes D4): at most **2 dishes per vendor** in the
first 10 results, then the rest interleave.

**Step 4 — fairness rotation** (fixes D5): when two vendors are within ~3 points,
break the tie with a deterministic hash of `(userId ?? deviceId) + dayOfYear`.
The champion rotates day to day among genuinely comparable vendors, and never at
the cost of price or distance. Deterministic, so it is testable and a refresh
doesn't reshuffle under the customer's thumb.

**Step 5 — sponsored slot, labelled.** `restaurants.promoted` and `offer`
already exist. If promotion is monetized, it gets its **own labelled row**
("Promoted") — never a silent thumb on the organic scale. That is both the
honest design and the one that survives a customer noticing.

### 1.4 Why "Also at N more places" is the feature to build

Nobody in this market does cross-vendor price comparison on a dish. You have the
index for it already. It is the strongest differentiator on this whole plan and
it falls out of the grouping work for free.

### 1.5 Where distance comes from

`baseScore` is pure and framework-free by design. Keep it that way — pass origin
in explicitly:

```ts
searchDishes(index, query, filters, sort, { origin })
```
`origin` = `useLocation().coords ?? PINNED_LOCATION.coords`, same source Home
already uses. Vendors with no pin get `distanceKm = null` → proximity term 0 (not
a penalty, not a bonus) so an unpinned shop is neither buried nor falsely
promoted.

---

## 2. Home screen — food-first

### 2.1 Today

| Zone | Model |
|---|---|
| Search field | **food-first** ✅ (`searchDishes` + `DishCard`) |
| Category strip | food categories, but every chip **navigates away** to `/search?category=` |
| "Popular right now" | restaurant carousel |
| Promo banners | `home_hero` ✅ |
| "Restaurants near you" | restaurant list |

So Home is food-first only while you are typing. The moment you stop, it is a
restaurant directory.

### 2.2 Proposed

```
┌──────────────────────────────────────┐
│ Deliver to ▾              🔔  👤     │
│ [ Search for a dish…            ]    │   ← already works
├──────────────────────────────────────┤
│ 🍛 🍕 🥟 🍗 🥚 🍨   food categories   │   ← filters IN PLACE, no navigation
├──────────────────────────────────────┤
│ Order again          (signed in)     │   ← dish rail, from order history
├──────────────────────────────────────┤
│ Popular near you                     │   ← DishCard rail, not RestaurantCard
├──────────────────────────────────────┤
│ [ promo banner carousel ]            │   ← unchanged
├──────────────────────────────────────┤
│ Under ₹100                           │   ← maxPrice filter, pre-filled
├──────────────────────────────────────┤
│ Restaurants near you                 │   ← KEEP, demoted below the dish rails
└──────────────────────────────────────┘
```

Three deliberate calls:

1. **Category chips filter in place** rather than navigating to `/search`. Today
   tapping "Biryani" on Home leaves Home. `HomeView` already holds the index and
   the deferred-query machinery; a `category` state alongside `query` is a small
   change and removes a whole navigation.
2. **Keep the restaurant list.** Zomato and Swiggy both still show restaurant
   cards — they lead with food and back it with shops. Deleting it would break
   the "I want *that* shop" errand, which is common in a town where people know
   the vendors by name. Demote, don't remove.
3. **"Order again" is the highest-intent rail in the app** and it does not exist
   yet. `cart.reorder()` is already implemented and `getOrdersPageData()` already
   loads history.

### 2.3 The index-cost question

The dish index is built client-side over the whole catalog-with-menus. That is
why `restaurantSelect` joins `menu_items`, and why my earlier audit note calling
that join "wasted work" was wrong for these surfaces — under food-first it is
**required**.

But it does not scale forever: ~62 shops with thousands of items, shipped to the
client on every request, `force-dynamic`, uncached. `dishes.ts` names the seam:

> *"If the catalog outgrows that, the seam to move is `buildDishIndex` — swap it
> for a server query and the ranking below is unchanged."*

**Recommendation:** keep the client index for now (it is what makes typing
instant), but add a lighter `listCatalogForIndex()` that selects only the menu
columns search actually reads (`id, external_id, name, category, price, veg,
available, popular, bestseller`) and drops `description`/`image_url` from the
list payload. Revisit the server-side seam at ~150 vendors.

---

## 3. Cart and order pipeline — audit

### 3.1 Already correct, no change needed

**The cart was built for this.** `cart-switch-store.ts` says so outright:

> *"Dish-first search puts food from six kitchens in one list, so the same tap
> now wipes a cart the customer is still building, with no warning and nothing
> to undo. So every Add goes through `request`."*

Verified: **no surface calls `useCart.add` directly.** All three add paths —
`item-sheet.tsx`, `menu-item-row.tsx`, `dish-card.tsx` — go through
`useCartSwitch.request`, which commits straight away when there is no conflict
and parks the intent behind the confirm sheet when there is. This is exactly the
Zomato/Swiggy behaviour and it is done.

**Order placement is server-authoritative and does not need to change.**
`createOrder` re-decides everything the client previewed:

- accepting-orders gate re-checked
- restaurant must exist, be `approved` and `is_open`
- delivery radius re-checked against the address actually being sent
- **line prices re-read from `menu_items` scoped to that restaurant** — the
  client sends items and a tip, never an amount
- `available` re-checked per line
- minimum order enforced against the server's own subtotal
- coupon evaluated before any write
- online-payment availability re-checked, refused loudly rather than
  silently downgraded to COD

Nothing about food-first discovery touches this. One order = one restaurant,
enforced at `input.restaurantSlug`.

### 3.2 Needs attention under food-first

**C1 — `itemId` is only unique within one menu.**
`MenuItem.id = external_id ?? row.id`. Two shops can both have `veg-1`.
`DishCard` already guards it (`qty` counted only when `cartSlug === restaurant.slug`)
and `IndexedDish.key` is `${slug}:${item.id}`. **Keep this discipline in every
new food-first surface** — any rail that renders dishes from multiple vendors
must key on the composite, and must not read cart quantity without the slug
check. This is the single easiest bug to reintroduce.

**C2 — sold-out and closed dishes rank but must not be addable.**
`baseScore` deliberately demotes rather than hides them ("they have it, just not
now" is a useful answer). Confirm the ADD control is genuinely disabled — not
just dimmed — on every new rail.

**C3 — the switch dialog will fire far more often.**
Today you must walk out of a shop to trigger it. On a food-first Home, every
cross-vendor tap does. Two mitigations worth building:
  - When a conflict is detected, check whether the *current* cart's restaurant
    also sells a matching dish, and offer "Add Sharma's instead — ₹130" as a
    third button. Turns a destructive prompt into a choice.
  - Group-aware ADD: from a grouped result, prefer the vendor already in the
    cart when the price gap is small. Silently avoids most conflicts.

**C4 — price parity between rail and bill.**
The rail quotes `item.price` from the client index; `createOrder` bills from the
DB. Same source, one render apart, and the layout is `force-dynamic`, so drift
is bounded by page lifetime. Acceptable — but the grouped "from ₹120" label must
quote the *champion's* price, not the group minimum, or the ADD button and the
label will disagree.

---

## 4. Stores tab under the same model

Stores becomes the **product/grocery** counterpart of Home's prepared-food
surface — same engine, different taxonomy.

### 4.1 The blocking constraint

Menu-item counts on the store-type vendors, from the seed:

| Shop | Items |
|---|---|
| `groceries-kirana-132` | **1** |
| `raw-meat-121` | **3** |
| `jharna-dairy-77` | **13** |

Restaurants have thousands. **No ranking work fixes an empty catalog.** Whatever
is built here shows a near-blank screen until products are loaded. This is a
vendor-onboarding problem and it gates the entire tab.

### 4.2 Also: `menu_items.category` is unusable raw

The legacy import has `'Roti & Paratha'`, `'Roti/Breads'` and `'Roti / Paratha'`
as three spellings of one thing, and `'Veg Main Course'` vs `'Main Course Veg'`.
Hundreds of variants. This is precisely why `FOOD_CATEGORIES` keyword-matches
against dish names instead of trusting that column — **extend the keyword layer,
never switch to raw categories.**

### 4.3 Plan

**Phase A — swap the engine.** Add `StoresView` mirroring `HomeView`:
`buildDishIndex` → `searchDishes` → `DishCard`. Wire the header's
`query`/`onQueryChange`, which also fixes the dead search field (see §5).
Replace `StoreCategoryStrip` (shop types) with product categories. Use
`categoryBasis()` so an empty category explains itself.

**Phase B — product categories.** Extend `FOOD_CATEGORIES`, same shape:

```ts
{ id: "dairy",   label: "Milk & Dairy",
  keywords: ["milk", "paneer", "curd", "dahi", "ghee", "butter", "cheese", "lassi"],
  cuisines: ["Dairy"] },
{ id: "meat",    label: "Chicken & Fish",
  keywords: ["chicken", "mutton", "fish", "egg", "keema", "prawn"], cuisines: [] },
{ id: "staples", label: "Atta & Rice",
  keywords: ["atta", "rice", "dal", "sugar", "oil", "masala", "namak", "chini"],
  cuisines: [] },
```

JHARNA DAIRY's 13 items get picked up by keyword with **zero re-tagging** — the
whole point of the keyword layer.

**Phase C — fill the catalog.** Bulk product import for kirana/dairy/meat
vendors. The food photo library with folder upload (commit `ff1f758`) is the same
ingestion path. Alternative: ship a starter kirana catalogue vendors toggle
availability on.

**Phase D — resolve the taxonomy fork.** `vendor_categories` (DB, admin-managed,
RLS, orderable) vs hardcoded `STORE_CATEGORIES` disagree on spelling
(Chowpatty/Chowpaty, Grocery/Groceries) and membership. `restaurants.category`
exists and Stores ignores it. Per `AGENTS.md`: judge, keep one, **delete the
loser**.

---

## 5. Bugs this plan happens to fix

Found during the audit, all on the current Stores tab:

1. **The search field on `/stores` accepts keystrokes and renders nothing.**
   `HomeHeader`'s input is controlled (`value={query}`, default `""`) and
   `/stores` passes no handlers. Fixed for free by Phase A.
2. **Four of six category tiles are guaranteed empty.** Matching is exact
   `cuisines` tag equality, but every seeded shop carries only food cuisines —
   `JHARNA DAIRY`, `Groceries/Kirana` and `Raw Meat` are all
   `cuisines = ARRAY['Fast Food']` with the real category in the *tagline*.
   Bakery works only by accident (its tags include `Desserts`).
3. **`stores_top` / `grocery_top` banner placements render nowhere.** Fully built
   admin-side — type, validator, form — and `listActiveBanners` is only ever
   called with `"home_hero"`.
4. **Groceries shows a hero and "No groceries yet" simultaneously**, and the
   empty-state template produces "a groceries" / "a raw meat".
5. **Admin pin order is computed then discarded** — `applyVendorOrder`
   (migration 0021) runs in the data layer, then the page re-sorts by rating and
   `etaMin`.

---

## 6. Extra features worth adding

Called out because they change the plan's shape, not just its polish.

| Feature | Why | Cost |
|---|---|---|
| **"Also at N more places — from ₹X"** | Falls out of §1.3 grouping for free. Nobody local does cross-vendor price comparison. Strongest differentiator here. | Low |
| **"Order again" rail on Home** | Highest-intent surface in any delivery app. `cart.reorder()` and order history both already exist. | Low |
| **Veg mode toggle** | Zomato's is a top-level switch, not a filter chip. `item.veg` and `passesFilters({veg})` exist. Matters a great deal in this market. | Low |
| **Smart cart-conflict resolution** (C3) | Turns the most destructive dialog in the app into a choice. | Medium |
| **Search query logging** | You cannot tune ranking, build the synonym map, or know what customers want that no vendor sells, without it. Should ship *with* phase 1, not after. | Low |
| **Newcomer boost + rotation** (§1.3 steps 4–5) | Without it the ranking is a ratchet: incumbents win, new vendors starve, and vendor churn goes up. | Medium |
| **Dish-level availability hours** | Chowpaty stalls open at 5pm; thali is lunch-only. Currently a closed shop just reads "Closed" all day with no schedule anywhere in the data model. | Medium–High |
| **Item-level images at scale** | Food-first rails are visual. Most legacy items have no `image_url`. The photo library exists; this is a content push, not a code one. | High (content) |

---

## 7. Suggested phasing

| Phase | Scope | Notes |
|---|---|---|
| **1** | Ranking: grouping + champion scoring + bayes rating + distance + diversity cap. Query logging. | Pure `lib/search/dishes.ts` work. No UI change. Independently testable. |
| **2** | Home: in-place category filtering, dish rails, "Order again", restaurant list demoted. | Consumes phase 1. |
| **3** | Stores phase A + B, and bugs §5.1–5.4 fall out. | Consumes phases 1–2. |
| **4** | Catalog fill (§4.1) + taxonomy fork (§4.3 phase D). | Content and data, mostly not code. Can run in parallel from day one — it is the long pole. |
| **5** | UI/UX redesign pass. | Deliberately last: redesigning before the information architecture settles means designing it twice. |

Phase 4 is the long pole and the one with no code shortcut. Start recruiting
product data now, in parallel with phase 1.

---

## 8. Phase 1 — shipped

`npm run test:ranking` — 46 assertions, all passing. `tsc --noEmit`, `eslint`
and `next build` all clean.

### What landed

| Change | Where |
|---|---|
| `RankContext` — optional origin + rotation seed, threaded through ranking | `lib/search/dishes.ts` |
| `bayesRating()` — D3 | same |
| Distance term in `baseScore`, capped at 10 km — D2 | same |
| `groupByDish()` + `DishGroup` — one row per dish, champion + alternatives | same |
| `championScore()` — proximity 8/km, relative price 25, speed 0.4, trust 3, traction 0.1 — D1 | same |
| `capPerVendor()` — 2 per vendor in the opening rows, deferred not dropped — D4 | same |
| `rotationJitter()` + `ROTATION_BAND` — bounded daily rotation — D5 | same |
| `normalizeDishName()` | same |
| `dailyRotationSeed()` — server-computed, no hydration mismatch | `lib/search/rotation.ts` |
| Context wired into live ranking | `home-view.tsx`, `search-view.tsx`, and their pages |
| Ranking suite | `scripts/qa/dish-ranking.ts`, `npm run test:ranking` |

`bayesRating` is also now used by the `"rating"` sort and by `groupByShop`'s
menu-less-shop branch, both of which compared raw stars before.

### Deviations from this plan, and why

**1. Name normalization is more conservative than §1.3 step 1 specified.**
The plan said to strip size and quantity qualifiers (`half`, `full`, `8 piece`).
Implemented, that merges "Thali (Half)" with "Thali (Full)" — two different
products at two different prices — and the cross-vendor comparison then reports
the gap between a half plate at one shop and a full plate at another as a
saving. A missed merge costs one extra row; a false merge quotes a price that
isn't real. Normalization is now case, punctuation and spacing only. Widening it
should be an explicit synonym map built from query logs.

**2. The newcomer boost (§1.3 step 4) is not implemented.**
It needs the vendor's `created_at` on the `Restaurant` type, and `restaurants`
has column-level SELECT grants (migration 0022) — putting a new column into the
publicly-readable payload is a security change under `AGENTS.md` rule 1, not a
casual addition. It needs a deliberate decision and a `SECURITY_AUDIT.md` entry.
The rotation jitter covers part of D5 in the meantime; the ratchet is loosened,
not removed.

**3. Query logging has not been built.** It is the other half of phase 1 and
needs a migration, a write endpoint and a rate limit. It should land before
phase 2, because ranking cannot be tuned and the synonym map cannot be built
without it.

### Not yet consuming the new grouping

`groupByDish` and `capPerVendor` are implemented, tested and **not yet rendered
anywhere** — they are the primitives phase 2's Home rails and phase 3's Stores
tab will consume. The live ranking improvements (distance, Bayesian rating,
rotation) *are* active on Home and Search now.

This is deliberate — the engine is independently testable and shipping it
separately keeps the UI change reviewable — but it is exactly the shape of the
`stores_top` bug in §5.3, so it should not sit unconsumed for long.

---

## Open decisions

1. **Grouped or flat results?** Grouped ("one row per dish, champion + N more")
   is the recommendation. Flat is what exists. Grouping is more work and much
   better.
2. **Is promotion monetized?** Decides whether §1.3 step 5 is a labelled slot or
   nothing at all.
3. **Does Home keep the restaurant list?** Recommendation: yes, demoted.
4. **Stores tab: purely product-first, or hybrid?** Recommendation: hybrid, same
   as Home — `groupByShop` already returns the shop view with no new code.
