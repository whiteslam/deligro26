import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Placeholder for the AI ordering assistant (Phase C4). Styled as a quiet
 * invitation now; wired to a Server Action later.
 */
export function AIAssistantBlock() {
  return (
    <div className="press card col-span-2 flex items-center gap-3 border-dashed p-4 opacity-95">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent">
        <Sparkles className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label">Ask Deligro</p>
        <p className="truncate text-[15px] font-semibold text-muted">
          &ldquo;something light &amp; spicy under ₹300&rdquo;
        </p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
        <ArrowRight className="size-4" />
      </span>
    </div>
  );
}
