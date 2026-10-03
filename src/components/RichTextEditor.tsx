import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { parseBody, richTextExtensions } from "../lib/richText";

interface Props {
  /** Initial body (JSON string). Later changes to this prop are ignored. */
  initialBody: string;
  onChange: (body: string, plainText: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ initialBody, onChange }: Props) {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: parseBody(initialBody) ?? "",
    editorProps: {
      attributes: {
        class: "rich-text min-h-60 px-4 py-3 focus:outline-none",
        "aria-label": "Strategy text",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : JSON.stringify(editor.getJSON()), editor.getText());
    },
  });

  return (
    <div className="card overflow-hidden focus-within:border-matrix-dim">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      quote: editor.isActive("blockquote"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const buttons: { label: string; title: string; active?: boolean; disabled?: boolean; run: () => void }[] = [
    { label: "H2", title: "Heading", active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Subheading", active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { label: "B", title: "Bold", active: state.bold, run: () => chain().toggleBold().run() },
    { label: "I", title: "Italic", active: state.italic, run: () => chain().toggleItalic().run() },
    { label: "•", title: "Bullet list", active: state.bullet, run: () => chain().toggleBulletList().run() },
    { label: "1.", title: "Numbered list", active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { label: "❝", title: "Quote", active: state.quote, run: () => chain().toggleBlockquote().run() },
    { label: "↶", title: "Undo", disabled: !state.canUndo, run: () => chain().undo().run() },
    { label: "↷", title: "Redo", disabled: !state.canRedo, run: () => chain().redo().run() },
  ];

  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-b border-line bg-surface-2 p-2">
      {buttons.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.active}
          disabled={b.disabled}
          // Keep the editor's selection when tapping a toolbar button.
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
          className={`min-h-10 min-w-10 rounded-md border font-mono text-sm transition disabled:opacity-30 ${
            b.active
              ? "border-matrix bg-matrix/15 text-matrix shadow-glow"
              : "border-transparent text-text hover:border-line"
          } ${b.label === "B" ? "font-bold" : ""} ${b.label === "I" ? "italic" : ""}`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
