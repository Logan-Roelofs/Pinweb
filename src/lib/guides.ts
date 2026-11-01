import { searchOpdb, type OpdbMachine } from "./opdb";

/**
 * Finds strategy guides for a game on other sites, so the Games search is one
 * place to look for any machine:
 *
 *  • Bob's Guide to Classic Pinball Machines (rules.silverballmania.com)
 *  • The Pinball Primer (pinballprimer.github.io): one tutorial covers a game
 *    and its special editions.
 *  • JLP's Pinball Cards (pinballcards.net)
 *
 * The typed name is looked up in the Open Pinball Database, whose entries list
 * each machine's page on all three sites.
 */
export const BOBS_GUIDE_SEARCH_URL = "https://rules.silverballmania.com/search";
export const PRIMER_LIST_URL = "https://pinballprimer.github.io/gamelist.html";
export const CARDS_URL = "https://pinballcards.net/";

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

/** A site's links for these machines; several machines can share one page. */
function linksOn(machines: OpdbMachine[], pageOf: (m: OpdbMachine) => string | null): GuideLink[] {
  const links = new Map<string, GuideLink>();
  for (const m of machines) {
    const url = pageOf(m);
    if (!url || links.has(url)) continue;
    links.set(url, { title: m.name, details: [m.manufacturer, m.year].filter(Boolean).join(", "), url });
  }
  return [...links.values()].slice(0, PER_SITE);
}

export async function findGuidesElsewhere(query: string, signal?: AbortSignal): Promise<GuidesElsewhere> {
  const machines = await searchOpdb(query, signal);
  return {
    bobs: linksOn(machines, (m) => m.bobsGuideUrl),
    primer: linksOn(machines, (m) => m.pinballPrimerUrl),
    cards: linksOn(machines, (m) => m.pinballCardsUrl),
  };
}
