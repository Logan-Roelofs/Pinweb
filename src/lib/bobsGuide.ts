/**
 * Links to "Bob's Guide to Classic Pinball Machines" (rules.silverballmania.com)
 * for games this site doesn't cover yet.
 *
 * Bob's Guide addresses each game by its Open Pinball Database (OPDB) id,
 * e.g. /rules/G41yq-MQP65 is Black Hole (Gottlieb, 1981). OPDB's public name
 * search can be called from the browser, so we look the name up there and link
 * straight to the matching game pages. Bob's Guide covers classic machines
 * (1960s to mid-80s); newer games only have empty placeholder pages there, so
 * only machines from 1989 or earlier are offered.
 */
export const BOBS_GUIDE_URL = "https://rules.silverballmania.com/";
export const BOBS_GUIDE_SEARCH_URL = "https://rules.silverballmania.com/search";

const OPDB_TYPEAHEAD = "https://opdb.org/api/search/typeahead";
const LAST_CLASSIC_YEAR = 1989;

export interface BobsGuideMatch {
  name: string;
  /** e.g. "Gottlieb, 1981" */
  details: string;
  url: string;
}

interface OpdbTypeaheadItem {
  id: string;
  name: string;
  supplementary?: string;
}

export async function findOnBobsGuide(query: string, signal?: AbortSignal): Promise<BobsGuideMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetch(`${OPDB_TYPEAHEAD}?q=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error(`Game lookup failed (${r.status})`);
  const items = (await r.json()) as OpdbTypeaheadItem[];
  return items
    .filter((item) => {
      // Only main machine ids ("G5KXk-MLB9V"). Variant ids add a third part
      // ("G5KXk-MLB9V-A96ze", e.g. regional clones) and often have no page there.
      if (item.id.split("-").length !== 2) return false;
      const year = Number(item.supplementary?.match(/\b(19|20)\d{2}\b/)?.[0]);
      return year > 0 && year <= LAST_CLASSIC_YEAR;
    })
    .slice(0, 6)
    .map((item) => ({
      name: item.name,
      details: item.supplementary ?? "",
      url: `${BOBS_GUIDE_URL}rules/${encodeURIComponent(item.id)}`,
    }));
}
