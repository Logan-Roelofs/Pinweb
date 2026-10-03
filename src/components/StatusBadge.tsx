import type { StrategyStatus } from "../lib/types";

export default function StatusBadge({ status }: { status: StrategyStatus }) {
  return status === "published" ? (
    <span className="rounded-full border border-matrix-dim bg-matrix/10 px-2 py-0.5 font-mono text-xs text-matrix">
      published
    </span>
  ) : (
    <span className="rounded-full border border-draft/40 bg-draft/10 px-2 py-0.5 font-mono text-xs text-draft">draft</span>
  );
}
