import { useEffect, useState } from "react";
import { canPromptInstall, isIOS, isStandalone, onInstallChange, promptInstall } from "../lib/install";

/** Offers to install the site as a home-screen app (hidden once installed). */
export default function InstallCard() {
  const [, rerender] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("pinweb:install-dismissed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), []);

  if (dismissed || isStandalone()) return null;
  const ios = isIOS();
  if (!ios && !canPromptInstall()) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("pinweb:install-dismissed", "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <img src="/pwa-64x64.png" alt="" className="size-12 rounded-xl border border-line" />
      <div className="flex-1 text-sm">
        <p className="font-mono text-matrix">Install Pinweb on this device</p>
        {ios ? (
          <p className="mt-1 text-muted">
            In Safari, tap <strong className="text-text">Share</strong> (the square with an arrow), then{" "}
            <strong className="text-text">Add to Home Screen</strong>. It opens full-screen, keeps you signed in, and its
            storage is protected.
          </p>
        ) : (
          <p className="mt-1 text-muted">Opens like an app, full-screen, straight from your home screen.</p>
        )}
      </div>
      <div className="flex gap-2">
        {!ios && (
          <button className="btn btn-sm btn-primary" onClick={promptInstall}>
            Install
          </button>
        )}
        <button className="btn btn-sm" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
