/**
 * Downloads the Open Pinball Database's daily export and saves the parts the
 * site uses to public/machines.json, which the browser searches directly.
 * OPDB has no search the browser is allowed to call, and its export is too big
 * (and not downloadable) from a web page, so this runs before every build.
 *
 * A list less than a day old is kept as it is. If the download fails, an older
 * list is kept; with no list at all the build stops, and the live site stays up.
 */
import { existsSync, statSync, writeFileSync } from "node:fs";

const EXPORT_URL = "https://mp-data.sfo3.cdn.digitaloceanspaces.com/opdb-v2.json";
const OUTPUT = new URL("../public/machines.json", import.meta.url);
const ONE_DAY = 24 * 60 * 60 * 1000;
// Far below the real ~2,400: a smaller list means the export's format changed.
const MIN_MACHINES = 1000;

interface OpdbEntry {
  opdbId: string;
  name: string;
  shortName: string | null;
  year: number | null;
  physicalMachine: boolean;
  entryType: "machineGroup" | "machine" | "alias";
  manufacturer?: { name: string } | null;
  bobsGuideUrl: string | null;
  pinballPrimerUrl: string | null;
  pinballCardsUrl: string | null;
}

async function download() {
  const r = await fetch(EXPORT_URL);
  if (!r.ok) throw new Error(`OPDB export unavailable (${r.status})`);
  const { entries } = (await r.json()) as { entries: OpdbEntry[] };

  const machines = entries
    .filter((e) => e.entryType !== "machineGroup" && e.physicalMachine)
    .map((e) => ({
      id: e.opdbId,
      name: e.name,
      shortName: e.shortName,
      manufacturer: e.manufacturer?.name ?? null,
      year: e.year,
      bobsGuideUrl: e.bobsGuideUrl,
      pinballPrimerUrl: e.pinballPrimerUrl,
      pinballCardsUrl: e.pinballCardsUrl,
    }));
  if (machines.length < MIN_MACHINES) throw new Error(`OPDB export has only ${machines.length} machines`);

  writeFileSync(OUTPUT, JSON.stringify(machines));
  console.log(`Saved ${machines.length} machines to public/machines.json`);
}

const saved = existsSync(OUTPUT);
if (saved && Date.now() - statSync(OUTPUT).mtimeMs < ONE_DAY) {
  console.log("public/machines.json is up to date");
} else {
  await download().catch((err) => {
    if (!saved) throw err;
    console.warn(`Keeping the existing public/machines.json: ${(err as Error).message}`);
  });
}
