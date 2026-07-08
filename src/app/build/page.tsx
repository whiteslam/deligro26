import type { Metadata } from "next";
import { Check, Circle, Loader2, MinusCircle } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  MILESTONES,
  PROJECT,
  STATUS_META,
  planProgress,
  type TaskStatus,
} from "@/lib/build-plan";

export const metadata: Metadata = {
  title: "Deligro · Build tracker",
  description: "1-month delivery plan and live progress.",
};

const ICON: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  done: Check,
  active: Loader2,
  todo: Circle,
  blocked: MinusCircle,
};

export default function BuildTrackerPage() {
  const p = planProgress();

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main max-w-[820px]">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-display">Build tracker</p>
            <p className="text-sm text-muted">
              {PROJECT.name} v1 · {PROJECT.durationLabel} · ship by {PROJECT.ship}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Progress summary */}
        <section className="card p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-label">Overall progress</p>
              <p className="mt-1 font-serif text-3xl font-medium">
                {p.pct}%
              </p>
            </div>
            <p className="text-sm text-muted">
              <span className="font-semibold text-[color:var(--green)]">{p.done} done</span>
              {" · "}
              <span className="font-semibold text-accent">{p.active} active</span>
              {" · "}
              {p.total} total
            </p>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${p.pct}%` }}
            />
          </div>
        </section>

        {/* Milestones — each task gets a global running "build number" so it can
            be referenced as "build 2", "build 7", etc. */}
        <div className="mt-4 space-y-4">
          {MILESTONES.map((m, mi) => {
            const doneCount = m.tasks.filter((t) => t.status === "done").length;
            // Running count of tasks in all earlier milestones.
            const startNo =
              MILESTONES.slice(0, mi).reduce((n, x) => n + x.tasks.length, 0) + 1;
            return (
              <section key={`${m.week}-${m.title}`} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-label">
                      {m.week === 0 ? "Foundation" : `Week ${m.week}`} · {m.range}
                    </p>
                    <h2 className="mt-0.5 font-serif text-xl font-medium">
                      {m.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{m.goal}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                    {doneCount}/{m.tasks.length}
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {m.tasks.map((t, ti) => {
                    const meta = STATUS_META[t.status];
                    const Icon = ICON[t.status];
                    const buildNo = startNo + ti;
                    return (
                      <li key={t.title} className="flex items-start gap-3">
                        <span
                          className="text-data mt-0.5 w-8 shrink-0 text-right text-xs font-semibold text-muted"
                          aria-label={`Build ${buildNo}`}
                        >
                          #{buildNo}
                        </span>
                        <span
                          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
                          style={{
                            background: "var(--surface-2)",
                            color: meta.tint,
                          }}
                        >
                          <Icon
                            className={
                              "size-3.5" +
                              (t.status === "active" ? " animate-spin" : "")
                            }
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              "block text-[15px] font-medium" +
                              (t.status === "done"
                                ? " text-muted line-through decoration-1"
                                : "")
                            }
                          >
                            {t.title}
                          </span>
                          {t.detail ? (
                            <span className="mt-0.5 block text-xs text-muted">
                              {t.detail}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="shrink-0 text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: meta.tint }}
                        >
                          {meta.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Live from <code>src/lib/build-plan.ts</code> — flip a task&apos;s{" "}
          <code>status</code> to update this board.
        </p>
      </main>
    </div>
  );
}
