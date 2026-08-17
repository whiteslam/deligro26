"use client";

import { Monitor } from "lucide-react";
import { EmptyState } from "@/components/admin/admin-ui";
import { useAdminShellMode } from "@/hooks/use-admin-shell-mode";
import { useIsDesktop } from "@/hooks/use-is-desktop";

/**
 * Tools that only work at console width, and an honest note where they aren't.
 *
 * The admin runs in two shells: the console, and a ~370px phone column that a
 * real handset is forced into (see AdminShell). A handful of screens are built
 * for the console and cannot be made to work in that column — a 960px vendor
 * table, an eight-step onboarding wizard, the platform fee form. Rather than
 * ship them broken or delete them silently, they are replaced on the phone with
 * a line saying where they went. Nobody should hunt for a feature they know
 * exists.
 *
 * THIS IS PRESENTATION, NOT AUTHORIZATION. Hiding a tool here changes nothing
 * about who may call it: every exported `"use server"` function starts with its
 * own role check (AGENTS.md rule 3), and that is the only thing keeping it safe.
 * Do not read a hidden button as a control.
 *
 * Note on what the gate actually stops: a *server* child passed as `children`
 * still renders on the server — the parent creates the element eagerly, so the
 * query behind it runs either way. What this stops is the *client mount*, which
 * is the part that costs a phone something: `AutoRefresh` polling, Recharts,
 * one live carousel per campaign card, a 1282-line wizard's autosave. Do not
 * "fix" the server half by converting pages to client components.
 *
 * Prefer the `@3xl:` container query over this component when all three hold:
 * the element is cheap and server-rendered, it needs no explanation, and hiding
 * it at 500px in web mode is *also* correct. This component is for the cases
 * where the operator has to be told, because `@3xl` is false in the web console
 * between 480 and 1024px too — a CSS gate would tell someone standing in the
 * console to go find the console.
 */
export function ConsoleOnly({
  tool,
  why,
  variant = "inline",
  notice = true,
  children,
}: {
  /** The thing that isn't here, named as the operator would name it. */
  tool: string;
  /** Optional extra clause of reason, when "it needs the width" isn't the whole story. */
  why?: string;
  /** `inline` replaces a control mid-page; `page` replaces a whole screen body. */
  variant?: "inline" | "page";
  /**
   * Set `false` when the explanation for this tool already appears elsewhere on
   * the page — a button in a header's `shrink-0` action slot has no room for a
   * notice card, so it drops out and a single `<ConsoleOnly tool={…} />` in the
   * body carries the message once. Never use it to hide something the operator
   * is told nothing about.
   */
  notice?: boolean;
  /** Omit to render the notice alone: nothing in the console, the note on a phone. */
  children?: React.ReactNode;
}) {
  const mode = useAdminShellMode();
  if (mode === "web") return <>{children ?? null}</>;
  if (!notice) return null;
  return <ConsoleOnlyNotice tool={tool} why={why} variant={variant} />;
}

/**
 * The notice on its own, for slots where there is no `children` to gate — a
 * settings menu row that is simply replaced, for instance.
 */
export function ConsoleOnlyNotice({
  tool,
  why,
  variant = "inline",
}: {
  tool: string;
  why?: string;
  variant?: "inline" | "page";
}) {
  // Honest about what *this* device can do. On a real phone the console is not
  // one tap away — it is not reachable at all, because AdminShell forces the
  // phone frame below 480px and `setMode("web")` would change nothing on
  // screen. That is also why neither variant offers a switch button: on a
  // desktop preview the Layout pill is already on screen, bottom-right.
  const isDesktop = useIsDesktop();

  const title = isDesktop ? "Switch to Web to use this" : "Open this on a computer";
  const description = isDesktop
    ? `${tool} needs the console layout — use the Layout switcher, bottom-right.`
    : `${tool} needs the width of the web console. Everything else here works on a phone.`;
  const body = why ? `${description} ${why}` : description;

  if (variant === "page") {
    return (
      <div role="note">
        <EmptyState icon={Monitor} title={title} description={body} />
      </div>
    );
  }

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3"
    >
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-muted">
        <Monitor className="size-4" />
      </span>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">{title}.</span> {body}
      </p>
    </div>
  );
}
