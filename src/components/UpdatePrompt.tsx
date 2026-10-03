import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registers the service worker (offline app shell) and, after a deploy,
 * offers to switch to the new version. It never reloads by itself, so an
 * update can't interrupt a capture. Typed text is backed up anyway.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version every hour while the app stays open.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-matrix-dim bg-surface/95 p-3 shadow-glow backdrop-blur"
    >
      <span className="flex-1 font-mono text-sm">&gt; new version available</span>
      <button className="btn btn-sm" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
      <button className="btn btn-sm btn-primary" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
    </div>
  );
}
