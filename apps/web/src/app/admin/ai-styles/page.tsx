import AiStyleAdminClient from "./style-admin-client";
import { STYLE_FEED_ITEMS } from "@/lib/ai-style-feed";

export const metadata = {
  title: "AI 스타일 관리 | 포켓굿즈",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AiStyleAdminPage() {
  return <AiStyleAdminClient initialItems={STYLE_FEED_ITEMS} />;
}
