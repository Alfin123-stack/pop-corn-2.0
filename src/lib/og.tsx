import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

/** Young Serif from the installed Fontsource package (woff, which the renderer reads). Optional: without it the default font is used. */
async function loadFonts() {
  try {
    const file = path.join(
      process.cwd(),
      "node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff",
    );
    const buffer = await readFile(file);
    return [{ name: "Young Serif", data: new Uint8Array(buffer).buffer, weight: 400 as const, style: "normal" as const }];
  } catch {
    return undefined;
  }
}

/** Fetches the backdrop here, so a slow or failing image never breaks the whole card. */
async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

interface OgInput {
  title: string;
  /** Small line next to the logo, e.g. "Movie, 2021". */
  kicker?: string;
  /** Line under the title, e.g. "8.2/10". */
  tagline?: string;
  backdropUrl?: string | null;
}

/** 1200x630 share card: backdrop (or the brand violet), a dark scrim, the title in Young Serif. */
export async function renderOg({ title, kicker, tagline, backdropUrl }: OgInput) {
  const [fonts, backdrop] = await Promise.all([loadFonts(), backdropUrl ? toDataUri(backdropUrl) : null]);
  const fontSize = title.length > 60 ? 54 : title.length > 40 ? 64 : title.length > 22 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#17181b",
          color: "#ffffff",
          fontFamily: '"Young Serif", serif',
        }}
      >
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background: backdrop
              ? "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.82) 100%)"
              : "linear-gradient(135deg, #5433eb 0%, #17181b 85%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "60px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 28, height: 28, borderRadius: 28, background: "#7c5cff", marginRight: 16 }} />
            <div style={{ display: "flex", fontSize: 38 }}>popcorn</div>
            {kicker && <div style={{ display: "flex", fontSize: 28, opacity: 0.75, marginLeft: 24 }}>{kicker}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize, lineHeight: 1.05, maxHeight: 330, overflow: "hidden" }}>{title}</div>
            {tagline && <div style={{ display: "flex", fontSize: 32, opacity: 0.85, marginTop: 20 }}>{tagline}</div>}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
