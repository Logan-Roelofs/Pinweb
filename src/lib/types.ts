import type { Timestamp } from "firebase/firestore";

export type StrategyStatus = "draft" | "published";

/** A photo stored in Firebase Storage: a full-size image plus a thumbnail. */
export interface Photo {
  id: string;
  path: string;
  url: string;
  thumbPath: string;
  thumbUrl: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Game {
  id: string;
  name: string;
  /** Lowercase copy of name, for sorting and search. */
  nameLower: string;
  manufacturer: string | null;
  year: number | null;
  photo: Photo | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * Each game has exactly one strategy page, stored at strategies/{gameId}
 * (same id as the game; the security rules enforce this). It's kept apart
 * from the game doc so drafts can stay private while game info is public.
 */
export interface Strategy {
  /** Same as gameId. */
  id: string;
  gameId: string;
  /** Copy of the game's name, so lists and search don't need a second lookup. */
  gameName: string;
  /** TipTap document, JSON-encoded. Empty string = no body yet. */
  body: string;
  /** Plain-text preview of the body, for cards and search. */
  excerpt: string;
  /** Display order = array order. */
  photos: Photo[];
  tags: string[];
  status: StrategyStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

export const SUGGESTED_TAGS = ["multiball", "wizard-mode", "skill-shot", "beginner", "advanced"];

/** "Wizard Mode!" → "wizard-mode" */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}
