"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { VegMark } from "@/components/shared/veg-mark";
import { Button } from "@/components/ui/button";
import { MenuAvailabilityToggle } from "@/components/vendor/menu-availability-toggle";
import { MenuItemFormSheet } from "@/components/vendor/menu-item-form-sheet";
import {
  VendorChip,
  VendorEmptyState,
  VendorHero,
  VendorMetricCard,
  VendorPanel,
} from "@/components/vendor/vendor-ui";
import { deleteMenuItemAction } from "@/app/vendor/actions";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { MenuItem } from "@/types";

type MenuRow = MenuItem & { dbId: string };

export function VendorMenuBoard({
  restaurantName,
  categories,
  items: initialItems,
  live = false,
}: {
  restaurantName: string;
  categories: string[];
  items: MenuRow[];
  live?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{
    mode: "create" | "edit";
    item?: MenuRow;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const allCategories = useMemo(
    () =>
      [
        ...new Set([
          ...categories,
          ...items.map((i) => i.category).filter(Boolean),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
    [categories, items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesCat =
        !activeCategory || item.category === activeCategory;
      return matchesQuery && matchesCat;
    });
  }, [items, query, activeCategory]);

  const inStock = items.filter((i) => !i.soldOut).length;
  const soldOut = items.length - inStock;
  const categoryCount = new Set(items.map((i) => i.category)).size;
  const maxStat = Math.max(items.length, inStock, soldOut, categoryCount, 1);

  const byCategory = allCategories
    .map((cat) => ({
      cat,
      items: filtered.filter((m) => m.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  function handleDelete(item: MenuRow) {
    if (
      !live ||
      !confirm(`Delete “${item.name}”? This cannot be undone.`)
    ) {
      return;
    }
    setDeletingId(item.dbId);
    startTransition(async () => {
      try {
        await deleteMenuItemAction(item.dbId);
        setItems((prev) => prev.filter((i) => i.dbId !== item.dbId));
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <VendorHero
        title="Menu"
        subtitle={
          live
            ? `${restaurantName} — manage dishes, pricing, and availability.`
            : `${restaurantName} · demo catalog`
        }
        action={
          live ? (
            <Button
              size="sm"
              className="hidden lg:inline-flex"
              onClick={() => setSheet({ mode: "create" })}
            >
              <Plus className="size-4" /> Add item
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <VendorMetricCard
          label="Total items"
          value={String(items.length)}
          icon="utensils"
          tone="accent"
          barPct={(items.length / maxStat) * 100}
        />
        <VendorMetricCard
          label="In stock"
          value={String(inStock)}
          icon="package"
          tone="green"
          barPct={(inStock / maxStat) * 100}
        />
        <VendorMetricCard
          label="Sold out"
          value={String(soldOut)}
          icon="package-x"
          tone="muted"
          barPct={(soldOut / maxStat) * 100}
        />
        <VendorMetricCard
          label="Categories"
          value={String(categoryCount)}
          icon="layers"
          tone="blue"
          barPct={(categoryCount / maxStat) * 100}
        />
      </div>

      <VendorPanel>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes or categories…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        {allCategories.length > 0 ? (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <VendorChip
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              count={items.length}
            >
              All
            </VendorChip>
            {allCategories.map((cat) => (
              <VendorChip
                key={cat}
                active={activeCategory === cat}
                onClick={() =>
                  setActiveCategory((c) => (c === cat ? null : cat))
                }
                count={items.filter((i) => i.category === cat).length}
              >
                {cat}
              </VendorChip>
            ))}
          </div>
        ) : null}
      </VendorPanel>

      {items.length === 0 ? (
        <VendorEmptyState
          icon={UtensilsCrossed}
          title="Menu is empty"
          description="Add your first dish to start taking orders."
          action={
            live ? (
              <Button size="sm" onClick={() => setSheet({ mode: "create" })}>
                <Plus className="size-4" /> Add your first item
              </Button>
            ) : null
          }
        />
      ) : byCategory.length === 0 ? (
        <VendorEmptyState
          icon={Search}
          title="No matches"
          description="Try a different search or category filter."
        />
      ) : (
        byCategory.map((group) => (
          <VendorPanel
            key={group.cat}
            title={group.cat}
            subtitle={`${group.items.length} item${group.items.length === 1 ? "" : "s"}`}
          >
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.dbId}
                  className={cn(
                    "vendor-menu-item overflow-hidden",
                    item.soldOut && "opacity-90"
                  )}
                >
                  <div className="flex gap-3 p-3 sm:p-4">
                    <div className="relative shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className={cn(
                            "size-16 rounded-xl object-cover sm:size-[4.5rem]",
                            item.soldOut && "grayscale"
                          )}
                        />
                      ) : (
                        <span
                          className={cn(
                            "grid size-16 place-items-center rounded-xl bg-surface-2 text-2xl sm:size-[4.5rem]",
                            item.soldOut && "grayscale opacity-70"
                          )}
                        >
                          🍽️
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5 shadow-sm">
                        <VegMark veg={item.veg} />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p
                              className={cn(
                                "font-semibold leading-snug",
                                item.soldOut && "text-muted"
                              )}
                            >
                              {item.name}
                            </p>
                            {item.popular ? (
                              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                                Popular
                              </span>
                            ) : null}
                            {item.soldOut ? (
                              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                                Sold out
                              </span>
                            ) : null}
                          </div>
                          <p className="text-data mt-1 text-base font-bold">
                            {formatINR(item.price)}
                          </p>
                        </div>

                        {live ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="size-9 p-0"
                              onClick={() => setSheet({ mode: "edit", item })}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="size-9 p-0"
                              disabled={pending && deletingId === item.dbId}
                              onClick={() => handleDelete(item)}
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {live ? (
                    <div className="border-t border-line bg-surface-2/50 px-3 py-2.5 sm:px-4">
                      <MenuAvailabilityToggle
                        menuItemId={item.dbId}
                        initialAvailable={!item.soldOut}
                        itemName={item.name}
                        layout="row"
                        onChange={(available) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i.dbId === item.dbId
                                ? { ...i, soldOut: !available }
                                : i
                            )
                          )
                        }
                      />
                    </div>
                  ) : (
                    <div className="border-t border-line px-3 py-2 text-xs font-semibold text-muted sm:px-4">
                      {item.soldOut ? "Sold out" : "In stock"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </VendorPanel>
        ))
      )}

      {live ? (
        <Button
          size="lg"
          className="vendor-fab fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-30 size-14 rounded-full p-0 lg:hidden"
          onClick={() => setSheet({ mode: "create" })}
          aria-label="Add menu item"
        >
          <Plus className="size-6" />
        </Button>
      ) : null}

      {sheet ? (
        <MenuItemFormSheet
          key={sheet.mode === "edit" ? sheet.item?.dbId : "new"}
          open
          mode={sheet.mode}
          item={sheet.item}
          categories={allCategories}
          onClose={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
