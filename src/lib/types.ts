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
  /** Which real machine this is, for links to other pinball sites. */
  machine?: MachineLink | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface MachineLink {
  /** Open Pinball Database id, e.g. "G5KXk-MLB9V". */
  opdbId: string;
  /** Internet Pinball Database number, e.g. 762 (null if unknown). */
  ipdbId: number | null;
  /** The machine's official name, e.g. "Eight Ball Deluxe". */
  name: string;
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
  status: StrategyStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  publishedAt: Timestamp | null;
}

/** A Quick Capture note: strategies/{gameId}/notes/{id}. Admin only. */
export interface Note {
  id: string;
  text: string;
  /** Strategy photo ids taken during this capture. */
  photoIds?: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  /** Set once the note has been added into the strategy text. */
  mergedAt?: Timestamp | null;
}
