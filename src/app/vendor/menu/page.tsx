"use client";

import { useState } from "react";
import { RESTAURANTS } from "@/lib/data";
import { VegMark } from "@/components/shared/veg-mark";
import { SectionTitle } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";

const STORE = RESTAURANTS.find((r) => r.slug === "saffron-kitchen")!;

export default function RestaurantMenuPage() {
  // availability keyed by item id (default: in stock unless soldOut in data)
  const [soldOut, setSoldOut] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STORE.menu.map((m) => [m.id, Boolean(m.soldOut)]))
  );

  const byCategory = STORE.categories
    .map((cat) => ({
      cat,
      items: STORE.menu.filter((m) => m.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Menu</h1>
        <p className="text-sm text-muted">
          Toggle availability instantly — customers see it live.
        </p>
      </div>

      {byCategory.map((group) => (
        <section key={group.cat}>
          <SectionTitle>{group.cat}</SectionTitle>
          <div className="space-y-2">
            {group.items.map((item) => {
              const out = soldOut[item.id];
              return (
                <div
                  key={item.id}
                  className="card flex items-center gap-3 p-3"
                >
                  <VegMark veg={item.veg} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${
                        out ? "text-muted line-through" : ""
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-data text-sm text-muted">
                      {formatINR(item.price)}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {out ? "Sold out" : "In stock"}
                  </span>
                  <button
                    onClick={() =>
                      setSoldOut((s) => ({ ...s, [item.id]: !s[item.id] }))
                    }
                    role="switch"
                    aria-checked={!out}
                    aria-label={`Toggle ${item.name} availability`}
                    className={`press relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      out ? "bg-line" : "bg-green"
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all ${
                        out ? "left-1" : "left-6"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
