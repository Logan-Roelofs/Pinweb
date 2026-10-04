import { isMainMachine, searchOpdb, type OpdbMachine } from "./opdb";

/**
 * Finds strategy guides for a game on other sites, so the Games search is one
 * place to look for any machine:
 *
 *  • Bob's Guide to Classic Pinball Machines (rules.silverballmania.com):
 *    pages are addressed by OPDB machine id. Only classics (≤1989) have real
 *    write-ups; newer machines get empty placeholder pages, so those are skipped.
 *  • The Pinball Primer (pinballprimer.github.io): its game list links each
 *    tutorial to an OPDB *group* id (the first part of a machine id), e.g.
 *    "addams_G4ODR.html".
 *  • JLP's Pinball Cards (pinballcards.net): one card per machine at
 *    "/<name>-<year>"; the full list comes from its sitemap.
 *
 * The typed name is looked up once in the Open Pinball Database, and each
 * matching machine is checked against the three sites. All three allow this
 * from the browser; their lists are downloaded once per visit (~75 KB + ~80 KB).
 */
export const BOBS_GUIDE_URL = "https://rules.silverballmania.com/";
export const BOBS_GUIDE_SEARCH_URL = "https://rules.silverballmania.com/search";
export const PRIMER_LIST_URL = "https://pinballprimer.github.io/gamelist.html";
export const CARDS_URL = "https://pinballcards.net/";

const PRIMER_BASE = "https://pinballprimer.github.io/";
const CARDS_SITEMAP = "https://pinballcards.net/sitemap.xml";
const LAST_CLASSIC_YEAR = 1989;
const PER_SITE = 6;

export interface GuideLink {
  title: string;
  /** e.g. "Bally, 1981" */
  details: string;
  url: string;
}

export interface GuidesElsewhere {
  bobs: GuideLink[];
  primer: GuideLink[];
  cards: GuideLink[];
}

// ---------------------------------------------------------- site lists (cached)

function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () =>
    (promise ??= load().catch((err) => {
      promise = null; // allow a retry
      throw err;
    }));
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** OPDB group id → Pinball Primer tutorial. */
const loadPrimer = cached(async () => {
  const html = await fetch(PRIMER_LIST_URL).then((r) => {
    if (!r.ok) throw new Error(`Pinball Primer list unavailable (${r.status})`);
    return r.text();
  });
  const byGroup = new Map<string, { file: string; text: string }>();
  for (const m of html.matchAll(/<a href="([\w-]+_(G[A-Za-z0-9]{4})\.html)">([^<]+)<\/a>/g)) {
    if (!byGroup.has(m[2])) byGroup.set(m[2], { file: m[1], text: decode(m[3]) });
  }
  return byGroup;
});

/** Pinball Cards pages, keyed by loosely-normalised name + year. */
const loadCards = cached(async () => {
  const xml = await fetch(CARDS_SITEMAP).then((r) => {
    if (!r.ok) throw new Error(`Pinball Cards list unavailable (${r.status})`);
    return r.text();
  });
  const byKey = new Map<string, string>();
  for (const m of xml.matchAll(/<loc>(https:\/\/pinballcards\.net\/([a-z0-9-]+)-((?:19|20)\d{2}))<\/loc>/g)) {
    byKey.set(`${looseName(m[2])}|${m[3]}`, m[1]);
  }
  return byKey;
});

/**
 * Name compared loosely: lowercase, no punctuation, and without "the"/"and"
 * (Pinball Cards writes "The Addams Family" as "addams-family-the" and
 * "Dungeons & Dragons" as "dungeons-dragons").
 */
function looseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && w !== "the" && w !== "and")
    .join("");
}

// ------------------------------------------------------------------- search

const detailsOf = (m: OpdbMachine) => [m.manufacturer, m.year].filter(Boolean).join(", ");

export async function findGuidesElsewhere(query: string, signal?: AbortSignal): Promise<GuidesElsewhere> {
  const machines = await searchOpdb(query, signal);
  // A site that can't be reached just shows no results; the others still work.
  const [primer, cards] = await Promise.all([loadPrimer().catch(() => null), loadCards().catch(() => null)]);

  const bobs = machines
    .filter((m) => isMainMachine(m.id) && m.year !== null && m.year <= LAST_CLASSIC_YEAR)
    .slice(0, PER_SITE)
    .map((m) => ({ title: m.name, details: detailsOf(m), url: `${BOBS_GUIDE_URL}rules/${encodeURIComponent(m.id)}` }));

  // One Primer tutorial covers a whole group (e.g. a game and its special editions).
  const primerLinks: GuideLink[] = [];
  const seenGroups = new Set<string>();
  for (const m of machines) {
    const group = m.id.split("-")[0];
    const entry = primer?.get(group);
    if (!entry || seenGroups.has(group)) continue;
    seenGroups.add(group);
    // The list's text looks like "Black Hole (Gottlieb, SS, 1981)".
    const [, title = entry.text, rest = ""] = entry.text.match(/^(.*?)\s*\((.*)\)\s*$/) ?? [];
    // "Addams Family, The" → "The Addams Family"
    const display = title.replace(/^(.*), (The|A|An)$/, "$2 $1");
    primerLinks.push({ title: display, details: rest, url: PRIMER_BASE + entry.file });
  }

  const cardLinks: GuideLink[] = [];
  const seenCards = new Set<string>();
  for (const m of machines) {
    // OPDB names remakes like "Attack from Mars (Remake)"; the card is just "attack-from-mars-2017".
    const names = [m.name, m.name.replace(/\s*\([^)]*\)\s*$/, "")];
    const url = m.year
      ? names.map((n) => cards?.get(`${looseName(n)}|${m.year}`)).find(Boolean)
      : undefined;
    if (!url || seenCards.has(url)) continue;
    seenCards.add(url);
    cardLinks.push({ title: m.name, details: detailsOf(m), url });
  }

  return { bobs, primer: primerLinks.slice(0, PER_SITE), cards: cardLinks.slice(0, PER_SITE) };
}
