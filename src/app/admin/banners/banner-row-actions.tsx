"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Pause,
  Pencil,
  Play,
  Archive,
  Trash2,
} from "lucide-react";
import type { BannerStatus } from "@/types";
import {
  deleteBannerAction,
  duplicateBannerAction,
  setBannerStatusAction,
} from "./actions";

/**
 * The per-campaign controls on the Admin list. Each button calls a server
 * action and refreshes the row; pause/resume flips on the current status.
 */
export function BannerRowActions({
  id,
  status,
}: {
  id: string;
  status: BannerStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });

  const btn =
    "press grid size-9 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/admin/banners/${id}`}
        className={btn}
        aria-label="Edit campaign"
        title="Edit"
      >
        <Pencil className="size-4" />
      </Link>

      {status === "active" ? (
        <button
          type="button"
          className={btn}
          disabled={pending}
          title="Pause"
          aria-label="Pause campaign"
          onClick={() => run(() => setBannerStatusAction(id, "paused"))}
        >
          <Pause className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          className={btn}
          disabled={pending}
          title="Set live"
          aria-label="Activate campaign"
          onClick={() => run(() => setBannerStatusAction(id, "active"))}
        >
          <Play className="size-4" />
        </button>
      )}

      <button
        type="button"
        className={btn}
        disabled={pending}
        title="Duplicate"
        aria-label="Duplicate campaign"
        onClick={() => run(() => duplicateBannerAction(id))}
      >
        <Copy className="size-4" />
      </button>

      {status !== "archived" ? (
        <button
          type="button"
          className={btn}
          disabled={pending}
          title="Archive"
          aria-label="Archive campaign"
          onClick={() => run(() => setBannerStatusAction(id, "archived"))}
        >
          <Archive className="size-4" />
        </button>
      ) : null}

      <button
        type="button"
        className={`${btn} hover:bg-deal/10 hover:text-deal`}
        disabled={pending}
        title="Delete"
        aria-label="Delete campaign"
        onClick={() => {
          if (window.confirm("Delete this campaign permanently?")) {
            run(() => deleteBannerAction(id));
          }
        }}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
