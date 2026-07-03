"use client";

import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  PaintBucket,
  Strikethrough,
  Type,
  Underline,
  Video,
} from "lucide-react";

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded p-1.5 text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  name,
  defaultValue = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);

  function exec(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    if (editorRef.current) {
      setValue(editorRef.current.innerHTML);
    }
  }

  function handleInput() {
    if (editorRef.current) {
      setValue(editorRef.current.innerHTML);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        <ToolbarButton label="Kalın" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="İtalik" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Altı çizili" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Üstü çizili" onClick={() => exec("strikeThrough")}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Biçimi temizle" onClick={() => exec("removeFormat")}>
          <Eraser className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarButton label="Boyut" onClick={() => exec("fontSize", "3")}>
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Arka plan" onClick={() => exec("hiliteColor", "#fef08a")}>
          <PaintBucket className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Görsel"
          onClick={() => {
            const url = window.prompt("Görsel URL");
            if (url) exec("insertImage", url);
          }}
        >
          <Image className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarButton label="Madde işaretli liste" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numaralı liste" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bağlantı"
          onClick={() => {
            const url = window.prompt("Bağlantı URL");
            if (url) exec("createLink", url);
          }}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarButton label="Paragraf" onClick={() => exec("formatBlock", "p")}>
          <span className="text-xs font-semibold">P</span>
        </ToolbarButton>
        <ToolbarButton label="Başlık 1" onClick={() => exec("formatBlock", "h1")}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Başlık 2" onClick={() => exec("formatBlock", "h2")}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Başlık 3" onClick={() => exec("formatBlock", "h3")}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarButton label="Sola hizala" onClick={() => exec("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Ortala" onClick={() => exec("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Sağa hizala" onClick={() => exec("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="İki yana yasla" onClick={() => exec("justifyFull")}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="YouTube"
          onClick={() => {
            const url = window.prompt("YouTube embed URL");
            if (url) {
              exec(
                "insertHTML",
                `<iframe src="${url}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`
              );
            }
          }}
        >
          <Video className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        className="min-h-[220px] px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
