import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { createGame } from "../../data/games";
import { useGames } from "../../hooks/useLive";

export default function GameNew() {
  const games = useGames();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");

  // Each game has one page, so point to the existing one instead of making a duplicate.
  const existing = games?.find((g) => g.nameLower === name.trim().toLowerCase());

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || existing) return;
    const id = createGame({ name, manufacturer: manufacturer || null, year: year ? Number(year) : null });
    navigate(`/admin/games/${id}`, { replace: true });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
      <Link to="/admin/games" className="font-mono text-sm">
        ← All games
      </Link>
      <h1 className="text-2xl font-bold">New game</h1>
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Medieval Madness"
          required
          maxLength={100}
          autoFocus
        />
        {existing && (
          <p className="mt-2 text-sm text-draft">
            “{existing.name}” already exists. <Link to={`/admin/games/${existing.id}`}>Open its page →</Link>
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="manufacturer">
            Manufacturer
          </label>
          <input
            id="manufacturer"
            className="input"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            placeholder="Stern, Williams…"
            maxLength={100}
          />
        </div>
        <div>
          <label className="label" htmlFor="year">
            Year
          </label>
          <input
            id="year"
            className="input"
            type="number"
            inputMode="numeric"
            min={1930}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={!name.trim() || !!existing}>
        Create game
      </button>
      <p className="text-sm text-muted">You'll write its strategy on the next screen. It starts as a private draft.</p>
    </form>
  );
}
