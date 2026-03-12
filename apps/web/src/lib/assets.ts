export type ProductType = "keyring" | "sticker";

export interface CharacterAsset {
  id: string;
  name: string;
  src: string; // public 경로 or data URI
}

export interface StickerAsset {
  id: string;
  name: string;
  emoji: string;
}

export interface FontOption {
  label: string;
  value: string;
}

// 캐릭터 자산 — public/assets/characters/ 에 실제 파일 추가 예정
// 현재는 SVG placeholder 사용
function makePlaceholderSvg(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="90" fill="${color}" opacity="0.9"/>
    <text x="100" y="115" font-family="Arial" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export const CHARACTER_ASSETS: CharacterAsset[] = [
  {
    id: "nano-basic",
    name: "나노바나나 기본",
    src: makePlaceholderSvg("#FFD700", "🍌"),
  },
  {
    id: "nano-happy",
    name: "나노바나나 기쁨",
    src: makePlaceholderSvg("#FF8C00", "😄"),
  },
  {
    id: "nano-sleepy",
    name: "나노바나나 졸림",
    src: makePlaceholderSvg("#9B59B6", "😴"),
  },
  {
    id: "nano-cool",
    name: "나노바나나 쿨",
    src: makePlaceholderSvg("#3498DB", "😎"),
  },
  {
    id: "nano-angry",
    name: "나노바나나 화남",
    src: makePlaceholderSvg("#E74C3C", "😠"),
  },
  {
    id: "nano-love",
    name: "나노바나나 사랑",
    src: makePlaceholderSvg("#FF69B4", "🥰"),
  },
];

export const STICKER_ASSETS: StickerAsset[] = [
  { id: "heart", name: "하트", emoji: "❤️" },
  { id: "star", name: "별", emoji: "⭐" },
  { id: "sparkle", name: "반짝", emoji: "✨" },
  { id: "crown", name: "왕관", emoji: "👑" },
  { id: "rainbow", name: "무지개", emoji: "🌈" },
  { id: "flower", name: "꽃", emoji: "🌸" },
  { id: "moon", name: "달", emoji: "🌙" },
  { id: "sun", name: "해", emoji: "☀️" },
  { id: "lightning", name: "번개", emoji: "⚡" },
  { id: "fire", name: "불꽃", emoji: "🔥" },
  { id: "diamond", name: "다이아", emoji: "💎" },
  { id: "ribbon", name: "리본", emoji: "🎀" },
  { id: "music", name: "음표", emoji: "🎵" },
  { id: "clover", name: "클로버", emoji: "🍀" },
  { id: "butterfly", name: "나비", emoji: "🦋" },
  { id: "balloon", name: "풍선", emoji: "🎈" },
  { id: "gem", name: "보석", emoji: "💍" },
  { id: "candy", name: "사탕", emoji: "🍬" },
  { id: "bear", name: "곰돌이", emoji: "🐻" },
  { id: "cat", name: "고양이", emoji: "🐱" },
];

export const FONT_OPTIONS: FontOption[] = [
  { label: "기본 (Geist)", value: "Geist, Arial, sans-serif" },
  { label: "고딕", value: "Nanum Gothic, Malgun Gothic, sans-serif" },
  { label: "명조", value: "Nanum Myeongjo, Georgia, serif" },
  { label: "손글씨", value: "Nanum Pen Script, cursive" },
  { label: "귀여운", value: "Jua, sans-serif" },
];

// 제품 타입별 캔버스 크기 (인쇄 비율 기준)
export const PRODUCT_CANVAS_SIZE: Record<
  ProductType,
  { width: number; height: number }
> = {
  keyring: { width: 420, height: 595 }, // A5 (148×210mm)
  sticker: { width: 420, height: 595 }, // A5 (148×210mm)
};
