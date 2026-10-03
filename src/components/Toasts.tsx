import { useEffect, useState } from "react";
import { onWriteError } from "../lib/writes";

/** Shows save/upload errors reported anywhere in the app. */
export default function Toasts() {
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);

  useEffect(
    () =>
      onWriteError((text) => {
        const id = Date.now() + Math.random();
        setMessages((m) => [...m, { id, text }]);
        window.setTimeout(() => setMessages((m) => m.filter((x) => x.id !== id)), 8000);
      }),
    [],
  );

  if (messages.length === 0) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md space-y-2" role="alert">
      {messages.map((m) => (
        <div key={m.id} className="rounded-lg border border-red-800 bg-red-950/95 px-4 py-3 text-sm text-red-100 shadow-lg">
          {m.text}
        </div>
      ))}
    </div>
  );
}
