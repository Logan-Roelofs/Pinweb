import { useState } from "react";
import { normalizeTag, SUGGESTED_TAGS } from "../lib/types";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [text, setText] = useState("");
  const toggle = (tag: string) => onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);

  const addTyped = () => {
    const tag = normalizeTag(text);
    if (tag && !tags.includes(tag) && tags.length < 20) onChange([...tags, tag]);
    setText("");
  };

  const options = [...new Set([...SUGGESTED_TAGS, ...tags])];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tag)}
              className={`min-h-9 rounded-full border px-3 font-mono text-xs transition ${
                on ? "border-matrix bg-matrix/15 text-matrix shadow-glow" : "border-line text-muted hover:border-matrix-dim"
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addTyped();
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a tag…"
          aria-label="New tag"
        />
        <button type="submit" className="btn" disabled={!normalizeTag(text)}>
          Add
        </button>
      </form>
    </div>
  );
}
