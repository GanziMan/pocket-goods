interface Window {
  ChannelIO?: (...args: unknown[]) => void;
  gtag?: (...args: [string, ...unknown[]]) => void;
  Kakao?: {
    init: (appKey: string) => void;
    isInitialized: () => boolean;
    Share: {
      sendDefault: (options: Record<string, unknown>) => void;
    };
  };
}
