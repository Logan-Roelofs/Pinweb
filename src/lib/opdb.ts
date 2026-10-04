/**
 * The Open Pinball Database (opdb.org) name search. It's public and can be
 * called straight from the browser. Its machine ids (e.g. "G5KXk-MLB9V" for
 * Eight Ball Deluxe) are what PinTips, Match Play, Pinball Videos, and Bob's
 * Guide use to address a machine.
 */
const TYPEAHEAD = "https://opdb.org/api/search/typeahead";

export interface OpdbMachine {
  id: string;
  name: string;
  manufacturer: string | null;
  year: number | null;
  /** e.g. "Eight Ball Deluxe (Bally, 1981)" */
  label: string;
}

/**
 * Main machine ids have two parts ("G5KXk-MLB9V"); variants (regional
 * clones, special editions) add a third ("G5KXk-MLB9V-A96ze").
 */
export const isMainMachine = (id: string) => id.split("-").length === 2;

export async function searchOpdb(query: string, signal?: AbortSignal): Promise<OpdbMachine[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetch(`${TYPEAHEAD}?q=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error(`Machine lookup failed (${r.status})`);
  const items = (await r.json()) as { id: string; name: string; text?: string; supplementary?: string }[];
  return items.map((item) => {
    // supplementary looks like "Bally, 1981"
    const parts = (item.supplementary ?? "").split(",").map((s) => s.trim());
    const year = Number(parts.find((p) => /^\d{4}$/.test(p)));
    const manufacturer = parts.filter((p) => !/^\d{4}$/.test(p)).join(", ") || null;
    return {
      id: item.id,
      name: item.name,
      manufacturer,
      year: year || null,
      label: item.text ?? item.name,
    };
  });
}
