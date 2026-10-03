import type { DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";

/**
 * Reads a snapshot into a typed object with its id. Server timestamps that
 * haven't synced yet (offline writes) come back as local estimates instead of null.
 */
export function fromSnap<T extends { id: string }>(snap: QueryDocumentSnapshot | DocumentSnapshot): T {
  return { id: snap.id, ...snap.data({ serverTimestamps: "estimate" }) } as T;
}
