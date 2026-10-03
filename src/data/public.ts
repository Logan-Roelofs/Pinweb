import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Game, Strategy } from "../lib/types";
import { fromSnap } from "./convert";

/**
 * Reads for the public site. Every strategy query filters on
 * status == "published"; the security rules reject any that don't.
 */
const strategies = collection(db, "strategies");
const published = where("status", "==", "published");
const newestFirst = orderBy("updatedAt", "desc");

export async function getRecentStrategies(count = 12): Promise<Strategy[]> {
  const snap = await getDocs(query(strategies, published, newestFirst, limit(count)));
  return snap.docs.map((d) => fromSnap<Strategy>(d));
}

/** Every published strategy. Used for search and per-game counts. Fine for a few hundred. */
export async function getAllPublished(): Promise<Strategy[]> {
  const snap = await getDocs(query(strategies, published, newestFirst));
  return snap.docs.map((d) => fromSnap<Strategy>(d));
}

export async function getPublishedForGame(gameId: string): Promise<Strategy[]> {
  const snap = await getDocs(query(strategies, where("gameId", "==", gameId), published, newestFirst));
  return snap.docs.map((d) => fromSnap<Strategy>(d));
}

/**
 * One strategy, or null if it doesn't exist or isn't visible to this visitor.
 * (Drafts give "permission denied" to the public, which we treat as not found;
 * the signed-in admin can open drafts here as a preview.)
 */
export async function getVisibleStrategy(id: string): Promise<Strategy | null> {
  try {
    const snap = await getDoc(doc(strategies, id));
    return snap.exists() ? fromSnap<Strategy>(snap) : null;
  } catch (err) {
    if ((err as { code?: string }).code === "permission-denied") return null;
    throw err;
  }
}

export async function getAllGames(): Promise<Game[]> {
  const snap = await getDocs(query(collection(db, "games"), orderBy("nameLower")));
  return snap.docs.map((d) => fromSnap<Game>(d));
}

export async function getPublicGame(id: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, "games", id));
  return snap.exists() ? fromSnap<Game>(snap) : null;
}
