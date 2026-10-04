import { isMainMachine, searchOpdb } from "./opdb";

/**
 * Links to "Bob's Guide to Classic Pinball Machines" (rules.silverballmania.com)
 * for games this site doesn't cover yet.
 *
 * Bob's Guide addresses each game by its Open Pinball Database (OPDB) id,
 * e.g. /rules/G41yq-MQP65 is Black Hole (Gottlieb, 1981), so we look the name
 * up in OPDB and link straight to the matching game pages. Bob's Guide covers
 * classic machines (1960s to mid-80s); newer games only have empty placeholder
 * pages there, so only machines from 1989 or earlier are offered.
 */
export const BOBS_GUIDE_URL = "https://rules.silverballmania.com/";
export const BOBS_GUIDE_SEARCH_URL = "https://rules.silverballmania.com/search";

const LAST_CLASSIC_YEAR = 1989;

export interface BobsGuideMatch {
  name: string;
  /** e.g. "Gottlieb, 1981" */
  details: string;
  url: string;
}

export async function findOnBobsGuide(query: string, signal?: AbortSignal): Promise<BobsGuideMatch[]> {
  const machines = await searchOpdb(query, signal);
  return machines
    // Variant ids (regional clones etc.) often have no page there.
    .filter((m) => isMainMachine(m.id) && m.year !== null && m.year <= LAST_CLASSIC_YEAR)
    .slice(0, 6)
    .map((m) => ({
      name: m.name,
      details: [m.manufacturer, m.year].filter(Boolean).join(", "),
      url: `${BOBS_GUIDE_URL}rules/${encodeURIComponent(m.id)}`,
    }));
}
