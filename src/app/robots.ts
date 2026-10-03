import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// /search and /watched are kept out of the index with a noindex meta tag, not here: a page blocked in
// robots.txt can never have its noindex read. Only the API routes are off limits.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
