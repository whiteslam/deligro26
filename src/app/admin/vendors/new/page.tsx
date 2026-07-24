import Link from "next/link";
import { ArrowLeft, FileClock } from "lucide-react";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { loadDraft, listDrafts } from "@/lib/data-access/vendor-registration";
import { RegistrationWizard } from "./registration-wizard";

export const dynamic = "force-dynamic";

const STEP_LABELS = [
  "Basic info",
  "Business",
  "Location",
  "Payment",
  "Legal",
  "Menu",
  "Terms",
  "Review",
];

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft: draftId } = await searchParams;

  const [categories, draft, drafts] = await Promise.all([
    listCategories(),
    draftId ? loadDraft(draftId) : Promise.resolve(null),
    draftId ? Promise.resolve([]) : listDrafts(),
  ]);

  const categoryNames = categories.map((c) => c.name);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Vendors
      </Link>
      <h1 className="text-[22px] font-extrabold tracking-tight">
        {draft ? "Resume registration" : "New vendor"}
      </h1>

      {!draftId && drafts.length > 0 ? (
        <section className="rounded-2xl border border-line bg-surface p-3.5">
          <h2 className="text-label mb-2.5">Resume a draft</h2>
          <ul className="space-y-1.5">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/vendors/new?draft=${d.id}`}
                  className="press flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
                >
                  <FileClock className="size-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {d.shopName}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {STEP_LABELS[Math.min(d.step, STEP_LABELS.length - 1)]} ·{" "}
                      {dateFmt.format(new Date(d.updatedAt))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RegistrationWizard
        initialData={draft?.data ?? {}}
        initialStep={draft?.step ?? 0}
        draftId={draft?.id}
        categories={categoryNames}
      />
    </div>
  );
}
