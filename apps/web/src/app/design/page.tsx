import EditorClientWrapper from "@/components/editor/EditorClientWrapper";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.metadata.editorTitle,
    description: t.metadata.editorDescription,
  };
}

export default function DesignPage() {
  return <EditorClientWrapper />;
}
