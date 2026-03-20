export const GA_TRACKING_ID = "G-YYTZZJ7PVD";

type GtagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

export function trackEvent({ action, category, label, value }: GtagEvent) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}

// AI Profile events
export const profileEvents = {
  generate: (style: string) =>
    trackEvent({ action: "profile_generate", category: "ai_profile", label: style }),
  download: (style: string) =>
    trackEvent({ action: "profile_download", category: "ai_profile", label: style }),
  share: (platform: string, style: string) =>
    trackEvent({ action: "profile_share", category: "ai_profile", label: `${platform}_${style}` }),
  uploadPhoto: () =>
    trackEvent({ action: "profile_upload_photo", category: "ai_profile" }),
  selectStyle: (style: string) =>
    trackEvent({ action: "profile_select_style", category: "ai_profile", label: style }),
  rateLimitHit: (type: "anonymous" | "authenticated") =>
    trackEvent({ action: "profile_rate_limit", category: "ai_profile", label: type }),
};

// Pet Profile events
export const petProfileEvents = {
  generate: () =>
    trackEvent({ action: "pet_profile_generate", category: "pet_profile" }),
  download: () =>
    trackEvent({ action: "pet_profile_download", category: "pet_profile" }),
  share: (platform: string) =>
    trackEvent({ action: "pet_profile_share", category: "pet_profile", label: platform }),
  uploadPhoto: (index: number) =>
    trackEvent({ action: "pet_profile_upload_photo", category: "pet_profile", label: `photo_${index}` }),
  rateLimitHit: (type: "anonymous" | "authenticated") =>
    trackEvent({ action: "pet_profile_rate_limit", category: "pet_profile", label: type }),
};
