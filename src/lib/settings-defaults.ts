import {
  DELIVERY_FEE,
  RIDER_COMMISSION,
  RIDER_MIN_PAYOUT,
  TAX_RATE,
} from "@/lib/pricing";
import type { PlatformSettings } from "@/types";

/**
 * The platform config the app falls back to before any admin has saved settings
 * (and in demo mode / before migration 0015 runs). Money defaults are pulled
 * from `pricing.ts` so there is still exactly one canonical delivery-fee/tax
 * number — the Settings tab overrides it, it doesn't fork it.
 *
 * Pure and client-safe (no `server-only`), so both the billing code and the
 * client cart can share it.
 */
export const DEFAULT_SETTINGS: PlatformSettings = {
  deliveryFee: DELIVERY_FEE,
  taxRate: TAX_RATE,
  freeDeliveryThreshold: 0,
  minOrder: 0,

  businessName: "Deligro",
  supportPhone: "",
  supportEmail: "",
  supportWhatsapp: "",
  businessAddress: "",

  acceptingOrders: true,
  maintenanceMessage: "",
  featureGrocery: true,
  featurePharmacy: true,
  featurePickDrop: true,

  defaultPrepMinutes: 20,
  deliveryRadiusKm: 8,
  riderCommission: RIDER_COMMISSION,
  riderMinPayout: RIDER_MIN_PAYOUT,
};
