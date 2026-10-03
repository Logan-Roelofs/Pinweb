import { app, useEmulators } from "../../lib/firebase";

/** Phase 1 placeholder: shows the theme and confirms Firebase config is wired up. */
export default function Home() {
  const projectId = app.options.projectId;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-line bg-surface p-6 shadow-glow sm:p-10">
        <p className="font-mono text-sm text-muted">&gt; booting pinweb...</p>
        <h1 className="mt-3 text-3xl font-bold text-glow sm:text-5xl">Pinball strategy, decoded.</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed">
          Multiball setups, wizard-mode routes, and skill-shot tips for the machines on location.
          Strategies are coming soon.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {["Multiball", "Wizard mode", "Skill shot"].map((tag) => (
          <div key={tag} className="rounded-lg border border-line bg-surface-2 p-4">
            <span className="rounded-full border border-matrix-dim px-3 py-1 font-mono text-xs text-matrix">
              #{tag.toLowerCase().replace(" ", "-")}
            </span>
            <p className="mt-3 text-muted">Guides tagged {tag.toLowerCase()} will show up here.</p>
          </div>
        ))}
      </section>

      <p className="font-mono text-xs text-muted">
        firebase: {projectId ? <span className="text-matrix">{projectId}</span> : <span className="text-draft">not configured (check .env)</span>}
        {useEmulators && " · emulators"}
      </p>
    </div>
  );
}
