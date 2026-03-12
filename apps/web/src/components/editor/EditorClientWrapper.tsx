"use client";

import dynamic from "next/dynamic";

const EditorLayout = dynamic(() => import("@/components/editor/EditorLayout"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-zinc-400 text-sm">
      편집기 불러오는 중…
    </div>
  ),
});

export default function EditorClientWrapper() {
  return <EditorLayout />;
}
