import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVendorDetail,
  type VendorDetail,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listMenuItems } from "@/lib/data-access/admin-menu";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { listVendorDocuments, type VendorDocument } from "@/lib/data-access/vendor-documents";
import { VendorRowActions } from "../vendor-row-actions";
import { MenuManager } from "./menu-manager";
import { DocumentsManager } from "./documents-manager";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<VendorStatus, string> = {
  active: "pill pill-green",
  pending: "pill pill-pop",
  inactive: "pill pill-muted",
  suspended: "pill pill-deal",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "business", label: "Business" },
  { id: "menu", label: "Menu" },
  { id: "payment", label: "Payment" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fmtDate(iso: string | null): string {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}
function fmtTime(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}
function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "overview";

  const vendor = await getVendorDetail(id);
  if (!vendor) notFound();

  // Only the active tab pays for its data.
  const [menuItems, menuCategories, documents] = await Promise.all([
    active === "menu" ? listMenuItems(id) : Promise.resolve([]),
    active === "menu"
      ? listCategories().then((cs) => cs.map((c) => c.name))
      : Promise.resolve([] as string[]),
    active === "documents" ? listVendorDocuments(id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/vendors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Vendors
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <div className="flex gap-3">
          <div
            className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cover bg-center text-xl font-bold text-white"
            style={
              vendor.imageUrl
                ? { backgroundImage: `url(${vendor.imageUrl})` }
                : { background: vendor.accentTint ?? "var(--accent)" }
            }
          >
            {vendor.imageUrl ? "" : vendor.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-lg font-extrabold tracking-tight">
                {vendor.name}
              </h1>
              <span className={STATUS_PILL[vendor.status]}>{vendor.status}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              /{vendor.slug} · {vendor.category ?? "Uncategorised"}
            </p>
          </div>
          <Link href={`/admin/vendors/${id}/edit`} className="shrink-0 self-start">
            <Button size="sm" variant="secondary">
              <Pencil className="size-4" /> Edit
            </Button>
          </Link>
        </div>
        <div className="mt-3 flex justify-end border-t border-line pt-3">
          <VendorRowActions id={vendor.id} name={vendor.name} status={vendor.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/vendors/${id}?tab=${t.id}`}
            className={
              "press shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold " +
              (t.id === active
                ? "bg-accent text-white"
                : "bg-surface-2 text-muted hover:text-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "overview" ? <OverviewTab v={vendor} /> : null}
      {active === "business" ? <BusinessTab v={vendor} /> : null}
      {active === "menu" ? (
        <MenuManager restaurantId={id} items={menuItems} categories={menuCategories} />
      ) : null}
      {active === "payment" ? <PaymentTab v={vendor} /> : null}
      {active === "documents" ? <DocumentsTab v={vendor} documents={documents} /> : null}
      {active === "activity" ? <ActivityTab v={vendor} /> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-3.5">
      <h2 className="text-label mb-2.5">{title}</h2>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function OverviewTab({ v }: { v: VendorDetail }) {
  return (
    <div className="space-y-3">
      <Card title="Owner">
        <Row label="Owner name" value={v.ownerName} />
        <Row label="Mobile" value={v.ownerMobile} />
        <Row label="Alt. mobile" value={v.ownerAltMobile} />
        <Row label="Email" value={v.ownerEmail} />
      </Card>
      <Card title="Shop">
        <Row label="Category" value={v.category} />
        <Row label="Commission" value={`${v.commissionPct}%`} />
        <Row label="Min order" value={rupees(v.minOrder)} />
        <Row label="Menu items" value={v.menuItemCount} />
        <Row label="Registered" value={fmtDate(v.createdAt)} />
      </Card>
      <Card title="Location">
        <Row label="Address" value={v.address} />
        <Row label="Landmark" value={v.landmark} />
        <Row label="Pincode" value={v.pincode} />
        <Row
          label="Pin"
          value={
            v.lat != null && v.lng != null
              ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`
              : "Not set"
          }
        />
      </Card>
    </div>
  );
}

function BusinessTab({ v }: { v: VendorDetail }) {
  return (
    <div className="space-y-3">
      <Card title="Business details">
        <Row label="Tagline" value={v.tagline} />
        <Row label="Description" value={v.description} />
        <Row label="Cuisines" value={v.cuisines.join(", ")} />
        <Row label="Opening" value={fmtTime(v.openingTime)} />
        <Row label="Closing" value={fmtTime(v.closingTime)} />
        <Row label="Weekly off" value={v.weeklyOff.join(", ")} />
        <Row label="Delivery" value={v.deliveryAvailable ? "Yes" : "No"} />
        <Row label="Self pickup" value={v.selfPickup ? "Yes" : "No"} />
      </Card>
    </div>
  );
}

function PaymentTab({ v }: { v: VendorDetail }) {
  return (
    <div className="space-y-3">
      <Card title="Payout">
        <Row label="Commission" value={`${v.commissionPct}%`} />
        <Row label="UPI ID" value={v.upiId} />
        <Row label="Account name" value={v.bankAccountName} />
        <Row label="Bank" value={v.bankName} />
        <Row label="Account no." value={v.bankAccountNumber} />
        <Row label="IFSC" value={v.bankIfsc} />
      </Card>
    </div>
  );
}

function DocumentsTab({
  v,
  documents,
}: {
  v: VendorDetail;
  documents: VendorDocument[];
}) {
  return (
    <div className="space-y-3">
      <Card title="Legal identifiers">
        <Row label="FSSAI" value={v.fssaiNumber} />
        <Row label="GST" value={v.gstNumber} />
        <Row label="PAN" value={v.panNumber} />
      </Card>
      <DocumentsManager restaurantId={v.id} documents={documents} />
    </div>
  );
}

function ActivityTab({ v }: { v: VendorDetail }) {
  return (
    <div className="space-y-3">
      <Card title="Registration & terms">
        <Row label="Status" value={v.status} />
        <Row label="Registered" value={fmtDate(v.createdAt)} />
        <Row label="T&C accepted" value={fmtDate(v.tcAcceptedAt)} />
        <Row label="T&C version" value={v.tcVersion} />
      </Card>
      <p className="px-1 text-xs text-muted">
        A full activity/audit log arrives in a later phase.
      </p>
    </div>
  );
}
