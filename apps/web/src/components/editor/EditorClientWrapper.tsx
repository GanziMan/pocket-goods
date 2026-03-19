"use client";

import dynamic from "next/dynamic";
import EditorErrorBoundary from "@/components/editor/EditorErrorBoundary";
import { Loader2 } from "lucide-react";

const EditorLayout = dynamic(() => import("@/components/editor/EditorLayout"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <span className="text-sm text-zinc-400">편집기 불러오는 중…</span>
      </div>
    </div>
  ),
});

export default function EditorClientWrapper() {
  return (
    <EditorErrorBoundary>
      <EditorLayout />
    </EditorErrorBoundary>
  );
}
