/**
 * Name search over the Open Pinball Database (opdb.org). OPDB has no search the
 * browser can call, so scripts/fetch-machines.ts saves its daily export to
 * /machines.json at build time and it's searched here (~70 KB compressed,
 * downloaded once per visit, on first search). Its machine ids (e.g.
 * "G5KXk-MLB9V" for Eight Ball Deluxe) are what PinTips, Match Play, and
 * Pinball Videos use to address a machine.
 */
const MACHINES_URL = "/machines.json";
const MAX_RESULTS = 30;

export interface OpdbMachine {
  id: string;
  name: string;
  /** e.g. "MM" for Medieval Madness */
  shortName: string | null;
  manufacturer: string | null;
  year: number | null;
  bobsGuideUrl: string | null;
  pinballPrimerUrl: string | null;
  pinballCardsUrl: string | null;
}

/**
 * Main machine ids have two parts ("G5KXk-MLB9V"); variants (regional
 * clones, special editions) add a third ("G5KXk-MLB9V-A96ze").
 */
export const isMainMachine = (id: string) => id.split("-").length === 2;

let machines: Promise<OpdbMachine[]> | null = null;

function loadMachines(): Promise<OpdbMachine[]> {
  machines ??= fetch(MACHINES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Machine list unavailable (${r.status})`);
      return r.json() as Promise<OpdbMachine[]>;
    })
    .catch((err) => {
      machines = null; // allow a retry
      throw err;
    });
  return machines;
}

/** Lowercase words only: "Bram Stoker's Dracula" → "bram stokers dracula". */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** How well a machine matches the query: lower is better, null is no match. */
function matchRank(m: OpdbMachine, q: string): number | null {
  const name = norm(m.name);
  if (name === q || norm(m.shortName ?? "") === q) return 0;
  if (name.startsWith(q)) return 1;
  const words = name.split(" ");
  if (q.split(" ").every((w) => words.some((n) => n.startsWith(w)))) return 2;
  // Spacing varies: "fun house" finds "FunHouse", "pinbot" finds "PIN*BOT".
  return name.replaceAll(" ", "").includes(q.replaceAll(" ", "")) ? 3 : null;
}

/** Best matches first; within a rank, main machines before variants, oldest first. */
export async function searchOpdb(query: string, signal?: AbortSignal): Promise<OpdbMachine[]> {
  const q = norm(query);
  if (q.length < 2) return [];
  const all = await loadMachines();
  signal?.throwIfAborted();
  return all
    .flatMap((m) => {
      const rank = matchRank(m, q);
      return rank === null ? [] : [{ m, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(isMainMachine(b.m.id)) - Number(isMainMachine(a.m.id)) ||
        (a.m.year ?? 9999) - (b.m.year ?? 9999),
    )
    .slice(0, MAX_RESULTS)
    .map(({ m }) => m);
}
