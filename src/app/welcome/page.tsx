import type { Metadata } from "next";
import Link from "next/link";
import { listRestaurantsResult } from "@/lib/catalog";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatEta } from "@/lib/utils/format";
import { CUSTOMER_LOGIN } from "@/lib/auth/portals";
import { HeroVideo } from "./hero-video";
import "./landing.css";

/**
 * Public landing page for the web: a full-bleed video hero with the order
 * action in it, the kitchens open right now, and plain answers.
 *
 * Platform: WEB-first public page, outside the customer app shell (no phone
 * frame), and reachable without a session — `/welcome` is in the proxy's
 * PUBLIC_PATHS. Every figure on it is read live through the catalog, which
 * uses the RLS-scoped server client, so a visitor sees exactly what the
 * guest feed would show them and nothing more. No admin client here: the
 * page shows no count that RLS does not already let an anonymous visitor read.
 *
 * Hero video: "Jalebi being prepared, Bangalore" by Subhashish Panigrahi,
 * CC BY-SA 3.0, trimmed to 14s and re-encoded; credited in the footer.
 */

export const metadata: Metadata = {
  title: "Deligro: order food from local kitchens",
  description:
    "Order from restaurants in your town and follow your rider to the door.",
  alternates: { canonical: "/welcome" },
};

const OPEN_SHOWN = 8;

export default async function WelcomePage() {
  const { restaurants, ok } = await listRestaurantsResult();
  const open = restaurants.filter((r) => r.open);
  // Kitchens with a cover photo lead: a tile without one is only a loading
  // wash. The order is otherwise the catalogue's own (stable sort).
  const shown = [...open]
    .sort((a, b) => Number(!a.image) - Number(!b.image))
    .slice(0, OPEN_SHOWN);

  return (
    <div className="landing">
      <a className="landing-skip" href="#main">
        Skip to content
      </a>

      <header className="landing-nav">
        <nav className="landing-nav__pill" aria-label="Main">
          <Link href="/welcome" className="landing-nav__brand">
            Deligro
          </Link>
          <ul className="landing-nav__links">
            <li>
              <a href="#open">Open now</a>
            </li>
            <li>
              <a href="#questions">Questions</a>
            </li>
            <li>
              <Link href="/portals">Partners</Link>
            </li>
          </ul>
          <Link href={CUSTOMER_LOGIN} className="landing-btn landing-btn--primary landing-btn--small">
            Order food
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <HeroVideo
            webm="/landing/hero-jalebi.webm"
            mp4="/landing/hero-jalebi.mp4"
            poster="/landing/hero-jalebi.jpg"
          />
          <div className="landing-hero__scrim" aria-hidden="true" />
          <div className="landing-container landing-hero__body">
            <h1 id="hero-title">Your town&rsquo;s kitchens, at your door.</h1>
            <p className="landing-lead">
              Order from local restaurants and follow your rider all the way.
            </p>
            <div className="landing-card landing-hero__card">
              {ok && open.length > 0 ? (
                <p className="landing-hero__live">
                  <strong className="landing-num">{open.length}</strong>{" "}
                  {open.length === 1 ? "kitchen is" : "kitchens are"} taking
                  orders right now.
                </p>
              ) : (
                <p className="landing-hero__live">
                  Sign in with your phone number to start an order.
                </p>
              )}
              <div className="landing-actions">
                <Link href={CUSTOMER_LOGIN} className="landing-btn landing-btn--primary">
                  Order food
                </Link>
                <a href="#open" className="landing-btn landing-btn--card">
                  See what&rsquo;s open
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Everything after the hero. The sticky order bar lives at the end of
            this wrapper, so it only appears once the hero, which already has
            the order action, has scrolled away. */}
        <div className="landing-after">
        <section id="open" className="landing-section" aria-labelledby="open-title">
          <div className="landing-container">
            <h2 id="open-title">Open right now</h2>
            {!ok ? (
              <div className="landing-state">
                <p>We couldn&rsquo;t load the restaurants just now.</p>
                <Link href="/welcome" className="landing-link">
                  Try again
                </Link>
              </div>
            ) : shown.length === 0 ? (
              <div className="landing-state">
                <p>No kitchens are taking orders at the moment. Most open again within a few hours.</p>
                <Link href={CUSTOMER_LOGIN} className="landing-link">
                  Sign in to order later
                </Link>
              </div>
            ) : (
              <ul className="landing-grid" role="list">
                {shown.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/restaurant/${r.slug}`} className="landing-tile">
                      <PhotoTile
                        tint={r.accentTint}
                        src={r.image}
                        alt=""
                        className="landing-tile__photo"
                        sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 340px"
                      />
                      <span className="landing-tile__body">
                        <span className="landing-tile__name">{r.name}</span>
                        <span className="landing-tile__meta">
                          {r.cuisines.slice(0, 3).join(", ")}
                        </span>
                        <span className="landing-tile__facts">
                          <span className="landing-num">{formatEta(r.etaMin, r.etaMax)}</span>
                          {r.ratingCount > 0 && (
                            <span className="landing-num">Rated {r.rating.toFixed(1)}</span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {ok && open.length > shown.length && (
              <p className="landing-more">
                <Link href={CUSTOMER_LOGIN} className="landing-link">
                  See all {open.length} open kitchens
                </Link>
              </p>
            )}
          </div>
        </section>

        {ok && restaurants.length > 0 && (
          <section className="landing-band" aria-labelledby="count-title">
            <div className="landing-container landing-figure-row">
              <p className="landing-figure landing-num" aria-hidden="true">
                {restaurants.length}
              </p>
              <div className="landing-figure-row__text">
                <h2 id="count-title">
                  <span className="landing-visually-hidden">{restaurants.length} </span>
                  kitchens cook on Deligro.
                </h2>
                <p>Every one shows its own delivery time before you order, busy evenings included.</p>
              </div>
            </div>
          </section>
        )}

        <section id="questions" className="landing-section" aria-labelledby="faq-title">
          <div className="landing-container">
            <h2 id="faq-title">Before you order</h2>
            <dl className="landing-faq">
              <div>
                <dt>Do I need an account?</dt>
                <dd>Browse as a guest. To order, sign in with your phone number.</dd>
              </div>
              <div>
                <dt>How do I pay?</dt>
                <dd>Pay online, or cash on delivery where the kitchen accepts it.</dd>
              </div>
              <div>
                <dt>How long will it take?</dt>
                <dd>Each restaurant shows its delivery time before you order.</dd>
              </div>
              <div>
                <dt>Can I see where my order is?</dt>
                <dd>Yes, from the kitchen to your door.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="landing-section landing-section--tight" aria-labelledby="partners-title">
          <div className="landing-container landing-partners">
            <h2 id="partners-title">Run a kitchen, or ride with us?</h2>
            <Link href="/portals" className="landing-btn landing-btn--outline">
              Partner sign-in
            </Link>
          </div>
        </section>

        <div className="landing-sticky" role="region" aria-label="Order">
          <div className="landing-sticky__bar">
            <p>Hungry?</p>
            <Link href={CUSTOMER_LOGIN} className="landing-btn landing-btn--primary">
              Order food
            </Link>
          </div>
        </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <p className="landing-footer__statement">Deligro</p>
          <div className="landing-footer__row">
            <ul className="landing-footer__links">
              <li>
                <Link href={CUSTOMER_LOGIN}>Sign in</Link>
              </li>
              <li>
                <Link href="/portals">Partner sign-in</Link>
              </li>
            </ul>
            <p className="landing-footer__credit">
              Video:{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Jalebi_being_prepared,_Bangalore.webm">
                Jalebi being prepared, Bangalore
              </a>{" "}
              by Subhashish Panigrahi,{" "}
              <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>, trimmed.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
