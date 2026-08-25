import { ImageIcon } from "lucide-react";
import { AdminHero, EmptyState, PreviewNotice } from "@/components/admin/admin-ui";
import {
  foodImagesReady,
  listFoodImages,
  type FoodImage,
} from "@/lib/data-access/food-images";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FoodImageLibrary } from "./food-image-library";

/**
 * Admin → Photo storage.
 *
 * One photo per dish, uploaded once and reused by every shop that sells it.
 * When a shop adds "Chicken Biryani" to its menu the right photo is attached by
 * itself — see src/lib/images/match.ts for how "Chicken", "Egg", "Veg" and
 * "Mutton" Biryani are kept apart, which is the whole difficulty.
 */
export const dynamic = "force-dynamic";

export default async function FoodImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let images: FoodImage[] = [];
  let ready = false;

  if (isSupabaseConfigured) {
    ready = await foodImagesReady().catch(() => false);
    if (ready) {
      images = await listFoodImages({ query: query || undefined, limit: 120 }).catch(
        () => []
      );
    }
  }

  return (
    <>
      <AdminHero
        title="Photo storage"
        tag={ready ? `${images.length} photo${images.length === 1 ? "" : "s"}` : undefined}
        subtitle="One shared picture per dish — shops get the right one automatically"
      />

      {isSupabaseConfigured && !ready ? (
        <PreviewNotice>
          Not set up yet — apply migration{" "}
          <code className="rounded bg-surface-2 px-1">
            0035_food_image_library.sql
          </code>{" "}
          to store food photos. Until then shops upload their own pictures as
          before.
        </PreviewNotice>
      ) : null}

      {!isSupabaseConfigured ? (
        <EmptyState
          icon={ImageIcon}
          title="Connect Supabase"
          description="Food photos are stored in Supabase. Connect it to start building the library."
        />
      ) : (
        <FoodImageLibrary images={images} query={query} disabled={!ready} />
      )}

      <div className="rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        <p className="font-semibold text-ink">How the matching works</p>
        <p className="mt-1">
          Name each photo the way the dish is written on a menu — “Chicken
          Biryani”, “Egg Biryani”, “Veg Biryani”. When a shop adds an item, the
          name is matched word by word, and a photo is only used when the kind of
          dish agrees: a chicken dish will never be given a vegetarian photo, and
          a plain “Biryani” is left for a person to choose. Common spellings are
          understood too — “Murgh Biryani” finds the chicken photo, “Anda
          Biryani” finds the egg one.
        </p>
      </div>
    </>
  );
}
