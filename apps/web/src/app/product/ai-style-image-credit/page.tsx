import { permanentRedirect } from "next/navigation";

export default function LegacyProductRedirect() {
  permanentRedirect("/product/sticker");
}
