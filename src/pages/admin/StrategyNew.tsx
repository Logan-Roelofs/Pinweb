import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import GamePicker from "../../components/GamePicker";
import { createGame } from "../../data/games";
import { createStrategy } from "../../data/strategies";
import { useGames } from "../../hooks/useLive";

export default function StrategyNew() {
  const games = useGames();
  const navigate = useNavigate();
  const [game, setGame] = useState<{ id: string; name: string } | null>(null);
  const [title, setTitle] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!game) return;
    const id = createStrategy({ gameId: game.id, gameName: game.name, title });
    navigate(`/admin/strategies/${id}`, { replace: true });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">New strategy</h1>
      <div>
        <span className="label">Game</span>
        {game && (
          <p className="mb-2">
            Selected: <strong className="text-matrix">{game.name}</strong>
          </p>
        )}
        <GamePicker
          games={games ?? []}
          selectedId={game?.id ?? null}
          onSelect={setGame}
          onCreate={(name) => createGame({ name, manufacturer: null, year: null })}
        />
      </div>
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Castle multiball setup"
          maxLength={200}
        />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={!game}>
        Create draft
      </button>
    </form>
  );
}
