import EditorClientWrapper from "@/components/editor/EditorClientWrapper";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "디자인 편집기",
  description:
    "캐릭터, 텍스트, 스티커, AI 이미지로 나만의 키링·스티커를 디자인하세요.",
};

export default function DesignPage() {
  return <EditorClientWrapper />;
}
