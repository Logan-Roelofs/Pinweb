import type { MachineLink } from "./types";

/**
 * Links to other pinball sites for one machine (the same set Bob's Guide
 * shows). Most are addressed by the machine's OPDB id; IPDB needs its own
 * number; YouTube and the flyer archive work from the name.
 */
export interface ResourceLink {
  label: string;
  url: string;
}

/** "Bram Stoker's Dracula" → "bram-stokers-dracula" (the flyer archive's style). */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resourceLinks(gameName: string, machine: MachineLink | null | undefined): ResourceLink[] {
  const name = machine?.name || gameName;
  const youtube = {
    label: "YouTube",
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} pinball`)}`,
  };
  if (!machine) return [youtube];

  const id = encodeURIComponent(machine.opdbId);
  return [
    { label: "PinTips", url: `https://pintips.net/opdb/${id}` },
    { label: "PinVideos", url: `https://pinballvideos.com/m/?q=${id}` },
    { label: "Match Play", url: `https://next.matchplay.events/pintips/${id}` },
    youtube,
    { label: "OPDB", url: `https://opdb.org/search?q=${id}` },
    ...(machine.ipdbId ? [{ label: "IPDB", url: `https://www.ipdb.org/machine.cgi?id=${machine.ipdbId}` }] : []),
    { label: "Flyer", url: `https://nypinball.com/flyers/${slug(name)}` },
  ];
}
