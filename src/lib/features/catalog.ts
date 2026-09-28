/**
 * Every feature the admin can switch off for a role — the one list the admin
 * control panel, the server guards and the UI all read.
 *
 * Core work is deliberately NOT here and cannot be switched off: a vendor
 * accepting and readying orders, a rider accepting and completing deliveries,
 * a manager seeing the live board. Those are the job; turning them off would
 * strand orders, not restrict a feature.
 *
 * Safe for the browser: no server imports. Resolution rules live in
 * `resolve.ts`, database access in `flags.server.ts`.
 */

export type FeatureRole = "vendor" | "manager" | "driver";

/** Who a per-account override attaches to: a vendor's shop, or a person. */
export type FeatureSubjectKind = "restaurant" | "profile";

export interface FeatureDef {
  key: string;
  role: FeatureRole;
  label: string;
  /** Hindi label, shown under the English one in the panel. */
  labelHi: string;
  /** What switching it off does, in words an operator would use. */
  offMeans: string;
}

export const FEATURES = [
  // ---- vendor ----
  { key: "vendor.menu_edit", role: "vendor", label: "Edit menu", labelHi: "मेन्यू बदलना", offMeans: "Menu is read-only: no adding, editing, deleting, pricing or stock changes." },
  { key: "vendor.menu_import", role: "vendor", label: "Menu import / export", labelHi: "मेन्यू इम्पोर्ट / एक्सपोर्ट", offMeans: "No CSV import or export of the menu." },
  { key: "vendor.promotions", role: "vendor", label: "Promotions", labelHi: "ऑफ़र", offMeans: "Promotions page and coupon creation are hidden." },
  { key: "vendor.earnings", role: "vendor", label: "Earnings", labelHi: "कमाई", offMeans: "Earnings and overview pages are hidden." },
  { key: "vendor.busy_mode", role: "vendor", label: "Busy mode (+time)", labelHi: "व्यस्त मोड", offMeans: "No +10 / +20 / +30 minute pace control." },
  { key: "vendor.open_toggle", role: "vendor", label: "Open / close shop", labelHi: "दुकान खोलना / बंद करना", offMeans: "The shop cannot open or close itself; admin controls it." },
  { key: "vendor.shop_profile", role: "vendor", label: "Edit shop profile", labelHi: "दुकान प्रोफ़ाइल", offMeans: "Shop details, logo, photos and map pin are read-only." },
  { key: "vendor.reject_orders", role: "vendor", label: "Reject / cancel orders", labelHi: "ऑर्डर मना करना", offMeans: "The kitchen can accept and ready orders but not reject or cancel them." },
  // ---- manager ----
  { key: "manager.phone_orders", role: "manager", label: "Phone orders", labelHi: "फ़ोन ऑर्डर", offMeans: "Cannot place orders for customers on the phone." },
  { key: "manager.cash", role: "manager", label: "Cash & expenses", labelHi: "नकद और खर्च", offMeans: "Cannot record COD handovers or expenses." },
  { key: "manager.assign_rider", role: "manager", label: "Assign rider", labelHi: "राइडर असाइन करना", offMeans: "Cannot put a rider on an order by hand; dispatch still runs." },
  { key: "manager.move_status", role: "manager", label: "Move order status", labelHi: "ऑर्डर स्टेटस बदलना", offMeans: "No Mark preparing / ready / on the way / delivered buttons." },
  { key: "manager.call_customer", role: "manager", label: "Call customer", labelHi: "ग्राहक को कॉल", offMeans: "Customer phone numbers and Call buttons are hidden." },
  // ---- rider ----
  { key: "driver.history", role: "driver", label: "Delivery history", labelHi: "डिलीवरी इतिहास", offMeans: "History tab is hidden." },
  { key: "driver.earnings", role: "driver", label: "Trips & earnings stats", labelHi: "ट्रिप और कमाई", offMeans: "Trip counts and money totals are hidden." },
  { key: "driver.call_customer", role: "driver", label: "Call customer", labelHi: "ग्राहक को कॉल", offMeans: "Call buttons are hidden; the rider uses the delivery code only." },
  { key: "driver.navigation", role: "driver", label: "Navigation", labelHi: "रास्ता देखें", offMeans: "No Navigate / Google Maps hand-off button." },
  { key: "driver.profile_edit", role: "driver", label: "Edit profile", labelHi: "प्रोफ़ाइल बदलना", offMeans: "Profile is read-only." },
] as const satisfies readonly FeatureDef[];

export type FeatureKey = (typeof FEATURES)[number]["key"];

export const ROLE_SUBJECT: Record<FeatureRole, FeatureSubjectKind> = {
  vendor: "restaurant",
  manager: "profile",
  driver: "profile",
};

export const ROLE_LABEL: Record<FeatureRole, string> = {
  vendor: "Vendors (per shop)",
  manager: "Managers",
  driver: "Riders",
};

export function featuresFor(role: FeatureRole): FeatureDef[] {
  return FEATURES.filter((f) => f.role === role);
}

export function isFeatureKey(value: string): value is FeatureKey {
  return FEATURES.some((f) => f.key === value);
}

export function featureDef(key: FeatureKey): FeatureDef {
  return FEATURES.find((f) => f.key === key)!;
}

/** Every feature on — the state before any switch exists. */
export type FeatureMap = Record<FeatureKey, boolean>;

export function allOn(): FeatureMap {
  return Object.fromEntries(FEATURES.map((f) => [f.key, true])) as FeatureMap;
}

/** Shown wherever a switched-off feature would have been. */
export const FEATURE_OFF_MESSAGE =
  "This feature is turned off by Deligro admin. / यह सुविधा एडमिन ने बंद की है।";
