import type { ReactNode } from "react";
import type { Load } from "../hooks/useLoad";

/** Shows a loading or error message, or renders children with the data. */
export default function LoadState<T>({ state, children }: { state: Load<T>; children: (data: T) => ReactNode }) {
  if (state.status === "loading") {
    return <p className="py-10 text-center font-mono text-sm text-muted">&gt; loading…</p>;
  }
  if (state.status === "error") {
    return (
      <div className="card p-6 text-center">
        <p className="font-mono text-draft">Couldn't load this right now.</p>
        <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}
