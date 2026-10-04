import { useEffect, useState, type DependencyList } from "react";

export type Load<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

/** Runs an async load when deps change and tracks loading/error state. */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    load().then(
      (data) => !cancelled && setState({ status: "ready", data }),
      (error) => {
        console.error(error);
        if (!cancelled) setState({ status: "error", error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

/** Sets the browser tab title. */
export function useTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Logan's Balls` : "Logan's Balls · Pinball strategy";
  }, [title]);
}
