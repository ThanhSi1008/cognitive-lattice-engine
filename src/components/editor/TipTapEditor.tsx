"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { countWords } from "@/lib/validations";
import { ShieldAlert, Sparkles, Link as LinkIcon, Bold, Italic, List, ListOrdered } from "lucide-react";

export interface TipTapEditorProps {
  content?: string;
  placeholder?: string;
  minWords?: number;
  maxWords?: number;
  blockPaste?: boolean;
  enableZettelAutocomplete?: boolean;
  onChange?: (text: string) => void;
  onPasteBlocked?: () => void;
  onZettelSelected?: (zettel: { zettel_uid: string; atomic_title: string }) => void;
}

export function TipTapEditor({
  content = "",
  placeholder = "Nhập nội dung...",
  minWords = 0,
  maxWords = 99999,
  blockPaste = false,
  enableZettelAutocomplete = false,
  onChange,
  onPasteBlocked,
  onZettelSelected,
}: TipTapEditorProps) {
  const [autocompleteQuery, setAutocompleteQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ zettel_uid: string; atomic_title: string; domain_category?: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showPasteAlert, setShowPasteAlert] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: undefined,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[140px] focus:outline-none text-sm text-slate-100 leading-relaxed font-sans p-4",
      },
      handlePaste: (view, event) => {
        if (blockPaste) {
          event.preventDefault();
          setShowPasteAlert(true);
          onPasteBlocked?.();
          setTimeout(() => setShowPasteAlert(false), 4000);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      onChange?.(text);

      // Detect [[ autocomplete trigger
      if (enableZettelAutocomplete) {
        const { selection } = editor.state;
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, selection.from - 30),
          selection.from,
          "\n"
        );
        const match = textBefore.match(/\[\[([^\]\n]*)$/);
        if (match) {
          const query = match[1] || "";
          setAutocompleteQuery(query);
        } else {
          setAutocompleteQuery(null);
        }
      }
    },
  });

  // Query /api/zettels when autocomplete is active
  useEffect(() => {
    if (autocompleteQuery === null) {
      setSuggestions([]);
      return;
    }

    let isMounted = true;
    setIsLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/zettels?q=${encodeURIComponent(autocompleteQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setSuggestions((data.zettels || []).slice(0, 5));
          }
        }
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      } finally {
        if (isMounted) setIsLoadingSuggestions(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [autocompleteQuery]);

  const handleSelectSuggestion = (z: { zettel_uid: string; atomic_title: string }) => {
    if (!editor) return;
    const { selection } = editor.state;
    const textBefore = editor.state.doc.textBetween(
      Math.max(0, selection.from - 30),
      selection.from,
      "\n"
    );
    const match = textBefore.match(/\[\[([^\]\n]*)$/);
    if (match) {
      const startPos = selection.from - match[0].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: startPos, to: selection.from })
        .insertContent(`[[${z.zettel_uid}]] `)
        .run();
    }
    setAutocompleteQuery(null);
    onZettelSelected?.(z);
  };

  const text = editor ? editor.getText() : content;
  const wordCount = countWords(text);
  const isValid = wordCount >= minWords && (maxWords === 99999 || wordCount <= maxWords);

  return (
    <div className="relative flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-cyan-500/80 transition shadow-inner">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition ${
              editor?.isActive("bold") ? "bg-slate-800 text-cyan-400" : ""
            }`}
            title="Đậm (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition ${
              editor?.isActive("italic") ? "bg-slate-800 text-cyan-400" : ""
            }`}
            title="Nghiêng (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition ${
              editor?.isActive("bulletList") ? "bg-slate-800 text-cyan-400" : ""
            }`}
            title="Danh sách gạch đầu dòng"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-800 hover:text-white transition ${
              editor?.isActive("orderedList") ? "bg-slate-800 text-cyan-400" : ""
            }`}
            title="Danh sách số"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          {enableZettelAutocomplete && (
            <span className="ml-2 text-[11px] font-mono text-purple-400/90 flex items-center gap-1 border-l border-slate-800 pl-2">
              <LinkIcon className="w-3 h-3" /> Gõ [[ để liên kết Zettel
            </span>
          )}
        </div>

        {/* Word count status */}
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border ${
            isValid
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-slate-800 text-amber-400 border-slate-700"
          }`}
        >
          {wordCount} {maxWords !== 99999 ? `/ ${minWords} – ${maxWords} từ` : `/ $\\ge$ ${minWords} từ`}
        </span>
      </div>

      {/* Paste Blocked Alert */}
      {showPasteAlert && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Lệnh Paste bị chặn (Anti-Verbatim Rule):</strong> Không sao chép nguyên văn! Hãy tự diễn giải bằng chính ngôn từ của bạn.
          </span>
        </div>
      )}

      {/* TipTap Editor Content */}
      <EditorContent editor={editor} />

      {/* Autocomplete Dropdown Popover */}
      {autocompleteQuery !== null && (
        <div className="absolute left-6 bottom-12 z-50 w-80 bg-slate-900 border border-purple-500/60 rounded-xl shadow-2xl p-2 flex flex-col gap-1 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-mono text-purple-400 px-2 py-1 border-b border-slate-800 flex justify-between items-center">
            <span>GỢI Ý LIÊN KẾT ZETTEL</span>
            {isLoadingSuggestions && <span className="animate-spin text-slate-400">⟳</span>}
          </div>

          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s.zettel_uid}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left p-2 rounded-lg hover:bg-purple-950/60 hover:border-purple-800/80 border border-transparent transition flex flex-col gap-0.5 group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 line-clamp-1">
                  {s.atomic_title}
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex justify-between">
                  <span>[[{s.zettel_uid}]]</span>
                  {s.domain_category && <span>{s.domain_category}</span>}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 italic">
              {isLoadingSuggestions ? "Đang tìm kiếm Zettels..." : "Không tìm thấy Zettel phù hợp."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
