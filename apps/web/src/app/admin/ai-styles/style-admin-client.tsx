"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { StyleFeedItem } from "@/lib/ai-style-feed";
import { serializeStyleFeedItems } from "@/lib/ai-style-feed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ValidationResult =
  | { ok: true; items: StyleFeedItem[] }
  | { ok: false; message: string };

function validateStyleItems(raw: string): ValidationResult {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "최상위 값은 배열이어야 합니다." };
    }

    const ids = new Set<string>();
    for (const [index, item] of parsed.entries()) {
      if (!item || typeof item !== "object") {
        return { ok: false, message: `${index + 1}번째 항목이 객체가 아닙니다.` };
      }
      const record = item as Record<string, unknown>;
      for (const key of ["id", "title", "style", "preview", "basePrompt"]) {
        if (typeof record[key] !== "string" || !String(record[key]).trim()) {
          return { ok: false, message: `${index + 1}번째 항목의 ${key} 값이 비어 있습니다.` };
        }
      }
      const id = String(record.id);
      if (ids.has(id)) {
        return { ok: false, message: `중복 id가 있습니다: ${id}` };
      }
      ids.add(id);
    }

    return { ok: true, items: parsed as StyleFeedItem[] };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "JSON 파싱에 실패했습니다.",
    };
  }
}

export default function AiStyleAdminClient({
  initialItems,
}: {
  initialItems: StyleFeedItem[];
}) {
  const [json, setJson] = useState(() => serializeStyleFeedItems(initialItems));
  const [message, setMessage] = useState<string | null>(null);
  const validation = useMemo(() => validateStyleItems(json), [json]);
  const previewItems = validation.ok ? validation.items : initialItems;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setMessage("JSON을 클립보드에 복사했습니다.");
  };

  const handleDownload = () => {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-style-feed-items.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("JSON 파일을 다운로드했습니다.");
  };

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-8 text-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">
            Pocket Goods Admin Helper
          </p>
          <h1 className="mt-2 text-2xl font-black">AI 스타일 카드 관리</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            여기서 스타일 카드 JSON을 편집하면 추가, 삭제, 순서 변경, 썸네일 경로 수정안을
            쉽게 만들 수 있습니다. 보안을 위해 이 페이지는 서버 파일을 직접 수정하지 않습니다.
            반영하려면 JSON 내용을 기준으로 <code className="rounded bg-zinc-100 px-1">src/lib/ai-style-feed.ts</code>
            의 <code className="rounded bg-zinc-100 px-1">STYLE_FEED_ITEMS</code> 배열을 교체한 뒤 배포하세요.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold">편집 JSON</h2>
                <p className="text-xs text-zinc-500">
                  배열 순서가 실제 카드 순서입니다. 썸네일은 <code>/prompt-name.png</code>처럼 public 경로를 넣으세요.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setJson(serializeStyleFeedItems(initialItems))}>
                  기본값 복원
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} disabled={!validation.ok}>
                  복사
                </Button>
                <Button size="sm" onClick={handleDownload} disabled={!validation.ok}>
                  다운로드
                </Button>
              </div>
            </div>
            <Textarea
              value={json}
              onChange={(event) => setJson(event.target.value)}
              spellCheck={false}
              className="min-h-[620px] resize-y font-mono text-xs leading-5"
            />
            <div className="mt-3 rounded-2xl border p-3 text-xs">
              {validation.ok ? (
                <p className="text-emerald-700">유효한 JSON입니다. 현재 {validation.items.length}개 카드가 있습니다.</p>
              ) : (
                <p className="text-red-600">오류: {validation.message}</p>
              )}
              {message && <p className="mt-1 text-zinc-500">{message}</p>}
            </div>
          </div>

          <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-extrabold">카드 미리보기</h2>
            <p className="mt-1 text-xs text-zinc-500">현재 JSON 기준으로 보이는 순서입니다.</p>
            <div className="mt-4 grid gap-3">
              {previewItems.map((item, index) => (
                <article key={`${item.id}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                  <div className="relative h-32 bg-zinc-100">
                    <Image src={item.preview} alt={`${item.title} 썸네일`} fill className="object-contain p-3" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-orange-600">{index + 1}</p>
                      <code className="rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-500">{item.id}</code>
                    </div>
                    <h3 className="mt-1 text-sm font-black">{item.title}</h3>
                    <p className="mt-2 truncate text-[10px] text-zinc-400">{item.preview}</p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
