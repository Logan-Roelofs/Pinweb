import { useEffect, useMemo, useState } from "react";
import { subscribeQueue, type QueueItem, type QueueState } from "../lib/uploadQueue";

export function useQueueState(): QueueState {
  const [state, setState] = useState<QueueState>({ items: [], progress: {}, online: navigator.onLine });
  useEffect(() => subscribeQueue(setState), []);
  return state;
}

export interface QueuedPhotoView {
  item: QueueItem;
  /** Local preview of the photo (no network needed). */
  previewUrl: string;
  /** 0–1 while uploading, otherwise undefined. */
  progress?: number;
  label: string;
}

/** Waiting photos matching `filter`, with on-device previews and a status label. */
export function useQueuedPhotos(filter: (item: QueueItem) => boolean, deps: unknown[]): QueuedPhotoView[] {
  const { items, progress, online } = useQueueState();
  const matching = useMemo(() => items.filter(filter), [items, ...deps]);

  // Object URLs must be released when no longer shown.
  const urls = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of matching) {
      const blob = item.thumb ?? item.original;
      if (blob) map.set(item.id, URL.createObjectURL(blob));
    }
    return map;
  }, [matching]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return matching.map((item) => {
    const p = progress[item.id];
    let label: string;
    if (p !== undefined) label = `${Math.round(p * 100)}%`;
    else if (!item.full) label = "Saving…";
    else if (!item.gameId) label = "Pick a game";
    else if (!online) label = "Waiting for signal";
    else if (item.error) label = "Retrying…";
    else label = "Queued";
    return { item, previewUrl: urls.get(item.id) ?? "", progress: p, label };
  });
}
