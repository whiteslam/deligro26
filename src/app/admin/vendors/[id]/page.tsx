import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminHero } from "@/components/admin/admin-ui";
import {
  getVendorDetail,
  type VendorDetail,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import { listMenuItems } from "@/lib/data-access/admin-menu";
import { listCategories } from "@/lib/data-access/vendor-categories";
import { listVendorDocuments, type VendorDocument } from "@/lib/data-access/vendor-documents";
import { VendorRowActions } from "../vendor-row-actions";
import { ConsoleOnly } from "@/components/admin/console-only";
import { MenuManager } from "./menu-manager";
import { DocumentsManager } from "./documents-manager";
import { VendorOverview } from "./vendor-overview";
import { Card, Row, fmtDate, fmtTime, rupees } from "./vendor-fields";

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

const DAY_VALUES = [7, 14, 30] as const;

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; days?: string }>;
}) {
  const { id } = await params;
  const { tab, days: daysRaw } = await searchParams;
  const active: TabId = TABS.some((t) => t.id === tab)
    ? (tab as TabId)
    : "overview";
  const requested = Number(daysRaw);
  const days = (DAY_VALUES as readonly number[]).includes(requested)
    ? requested
    : 30;

  const vendor = await getVendorDetail(id);
  if (!vendor) notFound();

  const [menuItems, menuCategories, documents] = await Promise.all([
    active === "menu" ? listMenuItems(id) : Promise.resolve([]),
    active === "menu"
      ? listCategories().then((cs) => cs.map((c) => c.name))
      : Promise.resolve([] as string[]),
    active === "documents" ? listVendorDocuments(id) : Promise.resolve([]),
  ]);

  const tabHref = (tabId: string) =>
    `/admin/vendors/${id}?tab=${tabId}&days=${days}`;

  return (
    <div className="space-y-4">
      <AdminHero
        backHref="/admin/vendors"
        backLabel="Vendors"
        title={vendor.name}
        subtitle={`/${vendor.slug} · ${vendor.category ?? "Uncategorised"} · ${vendor.effectiveCommissionPct}% commission`}
        badge={
          <span className={STATUS_PILL[vendor.status]}>{vendor.status}</span>
        }
        leading={
          <div
            className="grid size-12 place-items-center overflow-hidden rounded-xl bg-cover bg-center text-lg font-bold text-white"
            style={
              vendor.imageUrl
                ? { backgroundImage: `url(${vendor.imageUrl})` }
                : { background: vendor.accentTint ?? "var(--accent)" }
            }
          >
            {vendor.imageUrl ? "" : vendor.name.charAt(0).toUpperCase()}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            <span
              className={`${STATUS_PILL[vendor.status]} hidden shrink-0 @3xl:inline-flex`}
            >
              {vendor.status}
            </span>
            <Link href={`/admin/vendors/${id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="size-3.5" /> Edit
              </Button>
            </Link>
            <VendorRowActions
              id={vendor.id}
              name={vendor.name}
              status={vendor.status}
              showView={false}
              showEdit={false}
              showPasswordReset={false}
              showDelete={false}
            />
          </div>
        }
      />

      <div
        className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5 text-xs"
        role="tablist"
        aria-label="Vendor sections"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={tabHref(t.id)}
            role="tab"
            aria-selected={t.id === active}
            className={
              "press shrink-0 whitespace-nowrap rounded-md px-[11px] py-[5px] transition-colors " +
              (t.id === active
                ? "bg-ink font-semibold text-[color:var(--surface)]"
                : "font-medium text-muted hover:text-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "overview" ? (
        <VendorOverview vendor={vendor} days={days} />
      ) : null}
      {active === "business" ? <BusinessTab v={vendor} /> : null}
      {active === "menu" ? (
        <ConsoleOnly
          variant="page"
          tool="The menu editor"
          why="Every other tab on this shop — overview, business, payment, documents, activity — reads fine here."
        >
          <MenuManager
            restaurantId={id}
            items={menuItems}
            categories={menuCategories}
          />
        </ConsoleOnly>
      ) : null}
      {active === "payment" ? <PaymentTab v={vendor} /> : null}
      {active === "documents" ? (
        <DocumentsTab v={vendor} documents={documents} />
      ) : null}
      {active === "activity" ? <ActivityTab v={vendor} /> : null}
    </div>
  );
}

function BusinessTab({ v }: { v: VendorDetail }) {
  return (
    <div className="grid gap-3 @3xl:grid-cols-2">
      <Card title="About">
        <Row label="Tagline" value={v.tagline} />
        <Row label="Description" value={v.description} />
        <Row label="Cuisines" value={v.cuisines.join(", ")} />
      </Card>
      <Card title="Hours & fulfilment">
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
    <div className="grid gap-3 @3xl:grid-cols-2">
      <Card title="Commission & methods">
        <Row
          label="Commission"
          value={`${v.effectiveCommissionPct}%${
            v.inheritsPlatformRate ? " · platform rate" : ""
          }`}
        />
        <Row label="Accepts COD" value={v.acceptCod ? "Yes" : "No"} />
        <Row label="Accepts online" value={v.acceptOnline ? "Yes" : "No"} />
        <Row
          label="COD max"
          value={v.codMaxOrder > 0 ? rupees(v.codMaxOrder) : "No limit"}
        />
        <Row
          label="Other charges"
          value={
            v.otherChargesPerOrder > 0
              ? `${rupees(v.otherChargesPerOrder)} / order`
              : "None"
          }
        />
        <Row label="Settlement" value={v.settlementCycle} />
      </Card>
      <Card title="Bank account">
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
    <div className="grid gap-3 @3xl:grid-cols-2">
      <Card title="Legal identifiers">
        <Row label="FSSAI" value={v.fssaiNumber} />
        <Row label="GST" value={v.gstNumber} />
        <Row label="PAN" value={v.panNumber} />
      </Card>
      <div className="@3xl:col-span-1">
        <DocumentsManager restaurantId={v.id} documents={documents} />
      </div>
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
