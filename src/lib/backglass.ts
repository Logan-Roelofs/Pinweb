/**
 * Backglass image search, using the Virtual Pinball Spreadsheet (VPS): an
 * open, community-maintained database of pinball machines on GitHub
 * (https://virtualpinballspreadsheet.github.io). Its entries list backglass
 * images (community-made art and scans) that the browser is allowed to
 * download, so this works without a server.
 *
 * The database (~1.5 MB compressed) is downloaded once per visit, on first search.
 */
const DB_URL = "https://raw.githubusercontent.com/VirtualPinballSpreadsheet/vps-db/main/db/vpsdb.json";

interface VpsGame {
  id: string;
  name: string;
  manufacturer?: string;
  year?: number;
  b2sFiles?: { imgUrl?: string; authors?: string[] }[];
}

export interface BackglassResult {
  key: string;
  gameName: string;
  manufacturer: string | null;
  year: number | null;
  imageUrl: string;
  /** Who made this backglass image. */
  credit: string;
}

let db: Promise<VpsGame[]> | null = null;

function loadDb(): Promise<VpsGame[]> {
  db ??= fetch(DB_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Backglass database unavailable (${r.status})`);
      return r.json() as Promise<VpsGame[]>;
    })
    .catch((err) => {
      db = null; // allow a retry
      throw err;
    });
  return db;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

/**
 * Backglass images for games matching `query` (e.g. "medieval madness",
 * "abracadabra"), best matches first. Fan-made "Original" tables come last.
 */
export async function searchBackglasses(query: string, limit = 48): Promise<BackglassResult[]> {
  const q = norm(query);
  const words = query.split(/\s+/).map(norm).filter(Boolean);
  if (!q) return [];
  const games = await loadDb();

  const rank = (g: VpsGame) => {
    const n = norm(g.name);
    let score = n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : 3;
    if (g.manufacturer === "Original") score += 10;
    return score;
  };

  const matches = games
    .filter((g) => {
      const n = norm(g.name);
      return n.includes(q) || words.every((w) => n.includes(w));
    })
    .sort((a, b) => rank(a) - rank(b) || (a.year ?? 0) - (b.year ?? 0));

  const seen = new Set<string>();
  const results: BackglassResult[] = [];
  for (const g of matches) {
    for (const b of g.b2sFiles ?? []) {
      if (!b.imgUrl || seen.has(b.imgUrl)) continue;
      seen.add(b.imgUrl);
      results.push({
        key: `${g.id}:${b.imgUrl}`,
        gameName: g.name,
        manufacturer: g.manufacturer && g.manufacturer !== "Original" ? g.manufacturer : null,
        year: g.year ?? null,
        imageUrl: b.imgUrl,
        credit: b.authors?.length ? b.authors.join(", ") : "unknown",
      });
      if (results.length >= limit) return results;
    }
  }
  return results;
}

/** Downloads a chosen backglass so it can be compressed and stored as our own cover photo. */
export async function downloadBackglass(result: BackglassResult): Promise<File> {
  const r = await fetch(result.imageUrl);
  if (!r.ok) throw new Error(`Couldn't download the image (${r.status})`);
  const blob = await r.blob();
  return new File([blob], "backglass", { type: blob.type || "image/webp" });
}
