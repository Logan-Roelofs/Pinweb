import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentSnapshot,
} from "firebase/firestore/lite";
import { dbLite as db } from "../lib/dbLite";
import type { Game, Strategy } from "../lib/types";

/**
 * Reads for the public site, using the small "lite" Firestore. Every
 * strategy query filters on status == "published"; the security rules reject
 * any that don't.
 */
const strategies = collection(db, "strategies");
const published = where("status", "==", "published");
const newestFirst = orderBy("updatedAt", "desc");

function fromSnap<T>(snap: DocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T;
}

/** A game with its published strategy page. */
export interface GamePage {
  game: Game;
  strategy: Strategy;
}

/** Every game whose page is published, newest edits first. Fine for a few hundred games. */
export async function getPublishedGamePages(): Promise<GamePage[]> {
  const [strategySnap, gameSnap] = await Promise.all([
    getDocs(query(strategies, published, newestFirst)),
    getDocs(collection(db, "games")),
  ]);
  const gamesById = new Map(gameSnap.docs.map((d) => [d.id, fromSnap<Game>(d)]));
  return strategySnap.docs.flatMap((d) => {
    const strategy = fromSnap<Strategy>(d);
    const game = gamesById.get(strategy.gameId);
    return game ? [{ game, strategy }] : [];
  });
}

/**
 * One game's page, or null if it doesn't exist or isn't visible to this
 * visitor. (Drafts give "permission denied" to the public, which we treat as
 * not found; the signed-in admin can open drafts here as a preview.)
 */
export async function getVisibleGamePage(gameId: string): Promise<GamePage | null> {
  try {
    const [strategySnap, gameSnap] = await Promise.all([getDoc(doc(strategies, gameId)), getDoc(doc(db, "games", gameId))]);
    if (!strategySnap.exists() || !gameSnap.exists()) return null;
    return { game: fromSnap<Game>(gameSnap), strategy: fromSnap<Strategy>(strategySnap) };
  } catch (err) {
    if ((err as { code?: string }).code === "permission-denied") return null;
    throw err;
  }
}
