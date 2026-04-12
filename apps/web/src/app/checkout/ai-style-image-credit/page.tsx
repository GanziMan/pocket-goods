import { permanentRedirect } from "next/navigation";

export default function LegacyCheckoutRedirect() {
  permanentRedirect("/checkout/sticker");
}
