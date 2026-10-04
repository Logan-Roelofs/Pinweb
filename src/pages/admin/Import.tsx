import { useMemo, useState } from "react";
import { Link } from "react-router";
import { createGame, newGameId } from "../../data/games";
import { useGames } from "../../hooks/useLive";
import { convertPage, docText, IMAGE_PLACEHOLDER, type ConvertedPage, type DocNode } from "../../lib/importer/pageToDoc";
import { newPhotoId } from "../../lib/photos";
import { makeExcerpt } from "../../lib/richTextDoc";
import { enqueuePhoto } from "../../lib/uploadQueue";
import { errorMessage, reportError } from "../../lib/writes";

/**
 * One-time import of the old logansballs.com strategy pages.
 * Pick the folder holding <game>/page.tsx files and a static/ folder of
 * screenshots; each page becomes a draft game with its screenshots placed as
 * photo rows. Nothing is published.
 */

/** Maker and year for the games on the old site, keyed by its folder name. */
const KNOWN: Record<string, { manufacturer: string; year: number }> = {
  abracadabra: { manufacturer: "Gottlieb", year: 1975 },
  attackfrommars: { manufacturer: "Bally", year: 1995 },
  blackhole: { manufacturer: "Gottlieb", year: 1981 },
  cactuscanyon: { manufacturer: "Bally", year: 1998 },
  congo: { manufacturer: "Williams", year: 1995 },
  dinner: { manufacturer: "Williams", year: 1990 },
  harlemglobetrotters: { manufacturer: "Bally", year: 1979 },
  medievalmadness: { manufacturer: "Williams", year: 1997 },
  metallica: { manufacturer: "Stern", year: 2013 },
  sinbad: { manufacturer: "Gottlieb", year: 1978 },
  whitewater: { manufacturer: "Williams", year: 1993 },
};

interface Candidate {
  folder: string;
  page?: ConvertedPage;
  error?: string;
  missing: string[];
  existingId?: string;
  selected: boolean;
  status?: "imported" | "failed";
}

export default function Import() {
  const games = useGames();
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  async function pickFolder(list: FileList | null) {
    const byPath = new Map<string, File>();
    for (const f of Array.from(list ?? [])) byPath.set(f.webkitRelativePath || f.name, f);
    const images = new Map<string, File>();
    for (const [path, f] of byPath) if (/\/static\/[^/]+$/i.test(path)) images.set(path.split("/").pop()!, f);

    const found: Candidate[] = [];
    for (const [path, f] of byPath) {
      const m = path.match(/([^/]+)\/page\.tsx$/);
      if (!m) continue;
      const folder = m[1];
      try {
        const page = convertPage(await f.text());
        const existing = games?.find((g) => g.nameLower === page.name.toLowerCase());
        found.push({
          folder,
          page,
          missing: page.images.filter((img) => !images.has(img)),
          existingId: existing?.id,
          selected: !existing,
        });
      } catch (err) {
        found.push({ folder, error: errorMessage(err), missing: [], selected: false });
      }
    }
    setFiles(images);
    setCandidates(found.sort((a, b) => a.folder.localeCompare(b.folder)));
  }

  const toImport = useMemo(() => candidates.filter((c) => c.selected && c.page && !c.status), [candidates]);

  async function runImport() {
    setBusy(true);
    for (const c of toImport) {
      try {
        const page = c.page!;
        const gameId = newGameId();
        // Real photo ids for each screenshot, swapped into the photo rows.
        const ids = new Map(page.images.filter((img) => files.has(img)).map((img) => [img, newPhotoId()]));
        const doc = swapPhotoIds(page.doc, ids);
        const known = KNOWN[c.folder.toLowerCase()];
        createGame(
          { name: page.name, manufacturer: known?.manufacturer ?? null, year: known?.year ?? null },
          { id: gameId, body: JSON.stringify(doc), excerpt: makeExcerpt(docText(doc)), tags: [] },
        );
        for (const [img, photoId] of ids) await enqueuePhoto(files.get(img)!, { gameId }, photoId);
        update(c.folder, { status: "imported" });
      } catch (err) {
        reportError(`Couldn't import ${c.folder}: ${errorMessage(err)}`, err);
        update(c.folder, { status: "failed" });
      }
    }
    setBusy(false);
  }

  function update(folder: string, patch: Partial<Candidate>) {
    setCandidates((list) => list.map((c) => (c.folder === folder ? { ...c, ...patch } : c)));
  }

  const imported = candidates.filter((c) => c.status === "imported").length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import from the old site</h1>
        <p className="mt-2 text-sm text-muted">
          Choose the <code className="text-matrix-soft">pinballstrat</code> folder (it holds one folder per game with a{" "}
          <code>page.tsx</code>, plus <code>static/</code> with the screenshots). Each game is imported as a{" "}
          <strong className="text-text">draft</strong> with its screenshots placed where they were. Nothing goes public until
          you publish it.
        </p>
      </div>

      <label className="btn btn-primary cursor-pointer">
        Choose folder…
        <input
          type="file"
          className="hidden"
          // @ts-expect-error: non-standard but supported by all major browsers (folder picker)
          webkitdirectory=""
          multiple
          onChange={(e) => pickFolder(e.target.files)}
        />
      </label>

      {candidates.length > 0 && (
        <>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.folder} className="card flex items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-[var(--color-matrix)]"
                  checked={c.selected}
                  disabled={!c.page || !!c.status || busy}
                  onChange={(e) => update(c.folder, { selected: e.target.checked })}
                  aria-label={`Import ${c.page?.name ?? c.folder}`}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">
                    {c.page?.name ?? c.folder}
                    {c.page?.unfinished && <span className="ml-2 font-mono text-xs text-draft">marked unfinished</span>}
                  </div>
                  {c.page && (
                    <div className="text-muted">
                      {sections(c.page.doc)} sections · {c.page.images.length} screenshots
                      {KNOWN[c.folder.toLowerCase()] &&
                        ` · ${KNOWN[c.folder.toLowerCase()].manufacturer} ${KNOWN[c.folder.toLowerCase()].year}`}
                    </div>
                  )}
                  {c.error && <div className="text-red-300">Couldn't read this page: {c.error}</div>}
                  {c.missing.length > 0 && <div className="text-draft">Missing screenshots (skipped): {c.missing.join(", ")}</div>}
                  {c.page?.warnings.map((w) => (
                    <div key={w} className="text-draft">
                      {w}
                    </div>
                  ))}
                  {c.existingId && !c.status && (
                    <div className="text-draft">
                      A game with this name already exists (<Link to={`/admin/games/${c.existingId}`}>open it</Link>), so it's
                      unticked to avoid a duplicate.
                    </div>
                  )}
                </div>
                {c.status === "imported" && <span className="font-mono text-xs text-matrix">✓ imported</span>}
                {c.status === "failed" && <span className="font-mono text-xs text-red-300">failed</span>}
              </li>
            ))}
          </ul>

          <button className="btn btn-primary w-full" disabled={busy || toImport.length === 0} onClick={runImport}>
            {busy ? "Importing…" : `Import ${toImport.length} game${toImport.length === 1 ? "" : "s"} as drafts`}
          </button>

          {imported > 0 && !busy && (
            <p className="card p-4 text-sm">
              ✓ Imported {imported} game{imported === 1 ? "" : "s"} as drafts. Screenshots upload in the background (watch the ⇪
              badge; keep this tab open until it disappears). Review each one under{" "}
              <Link to="/admin/games?status=draft">Games → Drafts</Link>, add tags, and publish when ready.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function sections(doc: DocNode): number {
  return (doc.content ?? []).filter((n) => n.type === "heading" && n.attrs?.level === 2).length;
}

/** Replaces "img:<file>" placeholders in photo rows with real photo ids (dropping missing files). */
function swapPhotoIds(node: DocNode, ids: Map<string, string>): DocNode {
  if (node.type === "photoRow") {
    const photoIds = (node.attrs?.photoIds as string[])
      .map((p) => ids.get(p.slice(IMAGE_PLACEHOLDER.length)))
      .filter((id): id is string => !!id);
    return { ...node, attrs: { photoIds } };
  }
  return node.content ? { ...node, content: node.content.map((c) => swapPhotoIds(c, ids)) } : node;
}
