import { NextResponse, type NextRequest } from "next/server";

/**
 * Language routing without redirects based on cookies or Accept-Language (crawlers send neither,
 * and Google asks for one URL per language):
 *   /movies      -> rendered by app/[locale]/movies with locale "en" (URL stays /movies)
 *   /id/movies   -> served as is
 *   /en/movies   -> 308 to /movies, so English has a single canonical URL
 */
const DEFAULT_LOCALE = "en";
const PREFIX = /^\/(en|id)(?=\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = PREFIX.exec(pathname);

  // Generated Open Graph / Twitter images are addressed by their file-convention path as is.
  if (pathname.includes("opengraph-image") || pathname.includes("twitter-image")) {
    return match ? NextResponse.next() : rewriteTo(request, `/${DEFAULT_LOCALE}${pathname}`);
  }

  if (match) {
    if (match[1] === DEFAULT_LOCALE) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(match[0].length) || "/";
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  return rewriteTo(request, `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`);
}

function rewriteTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and files with an extension (icons, robots.txt, sitemap.xml...).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
