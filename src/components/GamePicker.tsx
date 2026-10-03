import { useMemo, useState } from "react";
import type { Game } from "../lib/types";

interface Props {
  games: Game[];
  selectedId: string | null;
  onSelect: (game: { id: string; name: string }) => void;
  /** Called with a typed name to create a new game; returns the new game's id. */
  onCreate: (name: string) => string;
}

/** Searchable game list with a one-tap "add new game" option. */
export default function GamePicker({ games, selectedId, onSelect, onCreate }: Props) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  const matches = useMemo(
    () => (q ? games.filter((g) => g.nameLower.includes(q) || g.manufacturer?.toLowerCase().includes(q)) : games),
    [games, q],
  );
  const exact = games.some((g) => g.nameLower === q);
  const selected = games.find((g) => g.id === selectedId);

  return (
    <div className="space-y-2">
      <input
        className="input"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={selected ? `Selected: ${selected.name}. Type to change…` : "Search games…"}
        aria-label="Search games"
      />
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-line bg-surface-2" role="listbox">
        {q && !exact && (
          <li>
            <button
              type="button"
              className="w-full px-3 py-3 text-left font-mono text-sm text-matrix hover:bg-surface"
              onClick={() => {
                const name = search.trim();
                const id = onCreate(name);
                onSelect({ id, name });
                setSearch("");
              }}
            >
              + Add new game “{search.trim()}”
            </button>
          </li>
        )}
        {matches.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              role="option"
              aria-selected={g.id === selectedId}
              onClick={() => {
                onSelect({ id: g.id, name: g.name });
                setSearch("");
              }}
              className={`flex w-full items-baseline justify-between gap-3 px-3 py-3 text-left hover:bg-surface ${
                g.id === selectedId ? "bg-matrix/10 text-matrix" : ""
              }`}
            >
              <span>{g.name}</span>
              <span className="text-xs text-muted">{[g.manufacturer, g.year].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && !q && <li className="px-3 py-3 text-sm text-muted">No games yet. Type a name to add one.</li>}
      </ul>
    </div>
  );
}
