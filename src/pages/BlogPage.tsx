import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

const posts = [
  { tag: "BUYING WELL", title: "How to evaluate a digital product before checkout", excerpt: "A practical way to read licenses, delivery promises, reviews, update terms, and seller policies.", time: "6 min", color: "lime" },
  { tag: "SELLER FIELD GUIDE", title: "Writing a product page buyers can actually trust", excerpt: "Specific descriptions reduce disputes. Here’s what to include without turning the page into legal soup.", time: "8 min", color: "violet" },
  { tag: "TRUST & SAFETY", title: "Why HSello does not allow account or credential trading", excerpt: "The practical security, consent, fraud, and ownership problems behind the line we draw.", time: "5 min", color: "coral" },
  { tag: "CREATOR OPERATIONS", title: "A calm versioning strategy for digital downloads", excerpt: "How to ship useful updates while keeping existing customers informed and supported.", time: "7 min", color: "cyan" }
];

export function BlogPage() {
  return <main className="commerce-page"><Seo title="Marketplace field notes" description="Practical guides for buying, selling, licensing, delivery, and trust in digital marketplaces." canonicalPath="/blog" /><MarketHeader /><section className="blog-hero"><BookOpen /><span className="section-index">FIELD NOTES</span><h1>Better digital trade,<br />explained plainly.</h1><p>Guides for buyers, sellers, and people who have read enough vague marketplace advice for one lifetime.</p></section><section className="blog-grid">{posts.map((post, index) => <article className={`blog-card tone-${post.color}`} key={post.title}><span>0{index + 1}</span><small>{post.tag}</small><h2>{post.title}</h2><p>{post.excerpt}</p><footer><span><Clock3 /> {post.time} read</span><Link to="/blog">Read guide <ArrowRight /></Link></footer></article>)}</section><MarketFooter /></main>;
}
