"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createMenuItemAction,
  updateMenuItemAction,
} from "@/app/vendor/actions";
import type { MenuItem } from "@/types";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export type MenuFormValues = {
  name: string;
  description: string;
  price: string;
  category: string;
  veg: boolean;
  available: boolean;
  popular: boolean;
  bestseller: boolean;
  imageUrl: string;
};

type MenuRow = MenuItem & { dbId: string };

const EMPTY: MenuFormValues = {
  name: "",
  description: "",
  price: "",
  category: "",
  veg: true,
  available: true,
  popular: false,
  bestseller: false,
  imageUrl: "",
};

function toFormValues(item?: MenuRow): MenuFormValues {
  if (!item) return { ...EMPTY };
  return {
    name: item.name,
    description: item.description ?? "",
    price: String(item.price),
    category: item.category,
    veg: item.veg,
    available: !item.soldOut,
    popular: Boolean(item.popular),
    bestseller: Boolean(item.bestseller),
    imageUrl: item.image ?? "",
  };
}

export function MenuItemFormSheet({
  open,
  mode,
  item,
  categories,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  item?: MenuRow;
  categories: string[];
  onClose: () => void;
}) {
  const [values, setValues] = useState<MenuFormValues>(() => toFormValues(item));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function set<K extends keyof MenuFormValues>(key: K, value: MenuFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(values.price);
    if (!values.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price in rupees.");
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      price,
      category: values.category || "Popular",
      veg: values.veg,
      available: values.available,
      popular: values.popular,
      bestseller: values.bestseller,
      imageUrl: values.imageUrl,
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createMenuItemAction(payload);
        } else if (item) {
          await updateMenuItemAction(item.dbId, payload);
        }
        onClose();
      } catch {
        setError("Could not save item. Try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className="card w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl p-4 sm:rounded-2xl sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-form-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="menu-form-title" className="text-lg font-bold">
            {mode === "create" ? "Add menu item" : "Edit menu item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="press rounded-full p-2 text-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT}
              placeholder="Paneer Butter Masala"
              required
            />
          </Field>

          <Field label="Category" required>
            <input
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              className={INPUT}
              list="menu-categories"
              placeholder="Burgers"
              required
            />
            <datalist id="menu-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Price (₹)" required>
            <input
              type="number"
              min={0}
              step={1}
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              className={INPUT}
              placeholder="199"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className={`${INPUT} min-h-20 resize-y`}
              placeholder="Short description for customers"
            />
          </Field>

          <Field label="Image URL">
            <input
              value={values.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              className={INPUT}
              placeholder="https://…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ToggleRow
              label="Vegetarian"
              checked={values.veg}
              onChange={(v) => set("veg", v)}
            />
            <ToggleRow
              label="In stock"
              checked={values.available}
              onChange={(v) => set("available", v)}
            />
            <ToggleRow
              label="Popular"
              checked={values.popular}
              onChange={(v) => set("popular", v)}
            />
            <ToggleRow
              label="Bestseller"
              checked={values.bestseller}
              onChange={(v) => set("bestseller", v)}
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Saving…" : mode === "create" ? "Add item" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-label">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--accent)]"
      />
    </label>
  );
}
