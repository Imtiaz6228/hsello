import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

export function NotFoundPage() {
  return (
    <main className="commerce-page">
      <Seo title="Page not found" description="The requested HSello page does not exist." robots="noindex,follow" />
      <MarketHeader />
      <section className="not-found-page">
        <span className="section-index">404</span>
        <h1>This page has moved or never existed.</h1>
        <p>Check the address, return to the marketplace, or browse the current catalog.</p>
        <div><Link to="/"><ArrowLeft /> Marketplace home</Link><Link to="/catalog">Browse catalog</Link></div>
      </section>
      <MarketFooter />
    </main>
  );
}
