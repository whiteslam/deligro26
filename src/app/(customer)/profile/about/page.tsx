import type { Metadata } from "next";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Deligro — Local Food & Grocery Delivery in Bemetara",
  description:
    "Deligro Delivery is a local food and grocery delivery app in Bemetara by Phoxera Solutions Private Limited, connecting you with nearby restaurants and grocery stores for fast doorstep delivery.",
  keywords: [
    "Deligro",
    "Deligro Delivery",
    "food delivery Bemetara",
    "grocery delivery Bemetara",
    "online food delivery Bemetara",
    "doorstep delivery Bemetara",
    "Phoxera Solutions Private Limited",
    "local restaurants Bemetara",
    "grocery stores Bemetara",
  ],
  alternates: { canonical: "/profile/about" },
  openGraph: {
    title: "About Deligro — Local Food & Grocery Delivery in Bemetara",
    description:
      "A local food and grocery delivery platform serving Bemetara, developed by Phoxera Solutions Private Limited.",
    siteName: "Deligro",
    type: "website",
  },
};

// Structured data so search engines can read who runs Deligro, what it does,
// and where it operates. Keep the copy here in sync with the visible text.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Deligro Delivery",
  alternateName: "Deligro",
  description:
    "Deligro Delivery is a local food and grocery delivery platform serving Bemetara, connecting users with nearby restaurants and grocery stores for doorstep delivery.",
  areaServed: { "@type": "City", name: "Bemetara" },
  parentOrganization: {
    "@type": "Organization",
    name: "Phoxera Solutions Private Limited",
  },
  knowsAbout: [
    "Food delivery",
    "Grocery delivery",
    "Restaurant delivery",
    "Doorstep delivery",
  ],
};

export default async function AboutPage() {
  await requireUser();

  return (
    <ProfileSubpage title="About Deligro">
      <script
        type="application/ld+json"
        // JSON-LD is trusted, static content built above — safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <div className="card space-y-4 p-5">
        <p className="text-[15px] leading-relaxed">
          <span className="font-semibold text-ink">Deligro Delivery</span> is a
          local food and grocery delivery platform developed by{" "}
          <span className="font-semibold text-ink">
            Phoxera Solutions Private Limited
          </span>
          . Operating in Bemetara only, Deligro connects you with nearby
          restaurants and grocery stores for fast, reliable doorstep delivery.
        </p>
        <p className="text-[15px] leading-relaxed text-muted">
          From hot, freshly cooked meals to everyday grocery essentials, order
          online and track every delivery from store to your door — warm, fresh,
          and on time across Bemetara.
        </p>
        <div className="space-y-2 text-sm text-muted">
          <p>
            <span className="font-semibold text-ink">Version</span> 2.6.0
          </p>
          <p>
            <span className="font-semibold text-ink">Service area</span> Bemetara
          </p>
          <p>
            <span className="font-semibold text-ink">Developed by</span> Phoxera
            Solutions Private Limited
          </p>
        </div>
      </div>
      <div className="mt-4 card divide-y divide-line text-sm">
        <a href="/profile/help" className="press block px-4 py-3.5 font-medium">
          Help & support
        </a>
        <a
          href="mailto:support@deligro.app"
          className="press block px-4 py-3.5 font-medium"
        >
          Contact us
        </a>
      </div>
    </ProfileSubpage>
  );
}
