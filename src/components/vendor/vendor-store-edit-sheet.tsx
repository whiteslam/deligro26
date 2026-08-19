"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalToShell } from "@/components/shared/portal-to-shell";
import { updateVendorRestaurantAction } from "@/app/vendor/actions";
import { createClient } from "@/lib/supabase/client";
import type { VendorRestaurantDetail } from "@/lib/data-access/vendor-profile";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const TINTS = [
  { id: "", label: "Default" },
  { id: "from-orange-500/40 to-rose-600/30", label: "Warm" },
  { id: "from-emerald-600/40 to-teal-800/30", label: "Fresh" },
  { id: "from-sky-500/40 to-indigo-700/30", label: "Cool" },
  { id: "from-amber-500/40 to-stone-700/40", label: "Spice" },
];

type FormValues = {
  name: string;
  tagline: string;
  cuisines: string;
  imageUrl: string;
  accentTint: string;
  etaMin: string;
  etaMax: string;
  prepMinutes: string;
  costForTwo: string;
  priceTier: string;
};

function toForm(r: VendorRestaurantDetail): FormValues {
  return {
    name: r.name,
    tagline: r.tagline ?? "",
    cuisines: r.cuisines.join(", "),
    imageUrl: r.imageUrl ?? "",
    accentTint: r.accentTint ?? "",
    etaMin: r.etaMin != null ? String(r.etaMin) : "",
    etaMax: r.etaMax != null ? String(r.etaMax) : "",
    prepMinutes: r.prepMinutes != null ? String(r.prepMinutes) : "",
    costForTwo: r.costForTwo != null ? String(r.costForTwo) : "",
    priceTier: String(r.priceTier || 2),
  };
}

async function uploadCover(restaurantId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Use JPEG, PNG, or WebP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 2 MB.");
  }
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${restaurantId}/cover-${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
}

export function VendorStoreEditSheet({
  open,
  restaurant,
  onClose,
}: {
  open: boolean;
  restaurant: VendorRestaurantDetail;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(() => toForm(restaurant));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Re-seed the form when the sheet (re)opens or the restaurant changes. Done
  // during render, not in an effect (react-hooks/set-state-in-effect).
  const [seed, setSeed] = useState({ open, restaurant });
  if (seed.open !== open || seed.restaurant !== restaurant) {
    setSeed({ open, restaurant });
    if (open) {
      setValues(toForm(restaurant));
      setError(null);
    }
  }

  if (!open) return null;

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handlePick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCover(restaurant.id, file);
      set("imageUrl", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Store name is required.");
      return;
    }
    const etaMin = values.etaMin.trim() ? Number(values.etaMin) : null;
    const etaMax = values.etaMax.trim() ? Number(values.etaMax) : null;
    const costForTwo = values.costForTwo.trim()
      ? Math.round(Number(values.costForTwo))
      : null;
    if (etaMin != null && (!Number.isFinite(etaMin) || etaMin < 0)) {
      setError("Invalid ETA min.");
      return;
    }
    if (etaMax != null && (!Number.isFinite(etaMax) || etaMax < 0)) {
      setError("Invalid ETA max.");
      return;
    }
    if (etaMin != null && etaMax != null && etaMax < etaMin) {
      setError("ETA max must be ≥ min.");
      return;
    }
    if (costForTwo != null && (!Number.isFinite(costForTwo) || costForTwo < 0)) {
      setError("Invalid cost for two.");
      return;
    }
    // Blank means "inherit the platform default", which is a real choice — so
    // it stays null rather than being coerced to a number.
    const prepMinutes = values.prepMinutes.trim()
      ? Math.round(Number(values.prepMinutes))
      : null;
    if (
      prepMinutes != null &&
      (!Number.isFinite(prepMinutes) || prepMinutes < 1 || prepMinutes > 180)
    ) {
      setError("Kitchen time must be between 1 and 180 minutes.");
      return;
    }

    const cuisines = values.cuisines
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await updateVendorRestaurantAction({
          name: values.name,
          tagline: values.tagline,
          cuisines,
          imageUrl: values.imageUrl,
          accentTint: values.accentTint || null,
          etaMin,
          etaMax,
          prepMinutes,
          costForTwo,
          priceTier: Number(values.priceTier) || 2,
        });
        onClose();
      } catch {
        setError("Could not save. Try again.");
      }
    });
  }

  return (
    <PortalToShell>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className="card flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-edit-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h2 id="store-edit-title" className="text-lg font-bold">
            Edit storefront
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

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
          <label className="block space-y-1.5">
            <span className="text-label">Store name *</span>
            <input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT}
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-label">Tagline</span>
            <input
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              className={INPUT}
              placeholder="Homestyle North Indian"
            />
          </label>

          <div className="space-y-2">
            <span className="text-label">Cover photo</span>
            <div className="flex items-start gap-3">
              {values.imageUrl ? (
                <img
                  src={values.imageUrl}
                  alt=""
                  className="h-20 w-28 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-20 w-28 place-items-center rounded-xl bg-surface-2 text-muted">
                  <ImagePlus className="size-6" />
                </span>
              )}
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void handlePick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                {values.imageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set("imageUrl", "")}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <input
              value={values.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              className={INPUT}
              placeholder="Or paste image URL"
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-label">Cuisines</span>
            <input
              value={values.cuisines}
              onChange={(e) => set("cuisines", e.target.value)}
              className={INPUT}
              placeholder="North Indian, Chinese, Fast Food"
            />
            <p className="text-[11px] text-muted">Comma-separated</p>
          </label>

          {/* The promo badge used to be a free-text field here. It was a
              claim with nothing behind it: a customer who read "20% off above
              ₹299" had no code to type and nothing applied at checkout. It is
              now derived from this shop's own promo codes (migration 0041) and
              the column refuses writes from anywhere else — so the way to
              advertise an offer is to run one. */}
          <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
            <p className="text-label">Promo offer</p>
            <p className="mt-1 text-[12px] text-muted">
              Set by your promo codes, not typed here.{" "}
              <Link
                href="/vendor/promotions"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                Manage promotions
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-label">ETA min</span>
              <input
                type="number"
                min={0}
                value={values.etaMin}
                onChange={(e) => set("etaMin", e.target.value)}
                className={INPUT}
                placeholder="25"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-label">ETA max</span>
              <input
                type="number"
                min={0}
                value={values.etaMax}
                onChange={(e) => set("etaMax", e.target.value)}
                className={INPUT}
                placeholder="40"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-label">Kitchen time (min)</span>
            <input
              type="number"
              min={1}
              max={180}
              value={values.prepMinutes}
              onChange={(e) => set("prepMinutes", e.target.value)}
              className={INPUT}
              placeholder="Platform default"
            />
            <span className="block text-xs text-muted">
              How long your kitchen takes, before the ride. Splits the band above
              into cooking and delivery so live tracking can tell them apart.
              Leave blank to use the platform default.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-label">Cost for two (₹)</span>
              <input
                type="number"
                min={0}
                value={values.costForTwo}
                onChange={(e) => set("costForTwo", e.target.value)}
                className={INPUT}
                placeholder="500"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-label">Price tier</span>
              <select
                value={values.priceTier}
                onChange={(e) => set("priceTier", e.target.value)}
                className={INPUT}
              >
                <option value="1">₹ · Budget</option>
                <option value="2">₹₹ · Mid</option>
                <option value="3">₹₹₹ · Premium</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-label">Accent mood</span>
            <div className="flex flex-wrap gap-2">
              {TINTS.map((t) => (
                <button
                  key={t.id || "default"}
                  type="button"
                  onClick={() => set("accentTint", t.id)}
                  className={`press rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    values.accentTint === t.id
                      ? "border-accent bg-accent text-[var(--on-accent)]"
                      : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={pending || uploading}
            >
              {pending ? "Saving…" : "Save storefront"}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </PortalToShell>
  );
}
