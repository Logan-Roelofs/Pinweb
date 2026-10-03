import { useEffect, useState } from "react";
import { subscribeGames } from "../data/games";
import { subscribeAllStrategies } from "../data/strategies";
import type { Game, Strategy } from "../lib/types";
import { reportError } from "../lib/writes";

/** Live list of games; undefined while loading. */
export function useGames(): Game[] | undefined {
  const [games, setGames] = useState<Game[]>();
  useEffect(() => subscribeGames(setGames, (err) => reportError("Couldn't load games", err)), []);
  return games;
}

/** Admin only: live list of all strategies, drafts included; undefined while loading. */
export function useAllStrategies(): Strategy[] | undefined {
  const [list, setList] = useState<Strategy[]>();
  useEffect(() => subscribeAllStrategies(setList, (err) => reportError("Couldn't load strategies", err)), []);
  return list;
}
