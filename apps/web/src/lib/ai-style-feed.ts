/**
 * Curated AI style presets shown in the editor.
 *
 * Maintenance notes:
 * - Reorder this array to reorder the cards.
 * - Add/remove entries to change the visible collection.
 * - Update `preview` to point at a file under `apps/web/public` or another public URL.
 * - Keep `basePrompt` specific and include any shared output constraints it needs.
 */
export type Style = string;

export type StyleFeedItem = {
  id: string;
  title: string;
  style: Style;
  preview: string;
  basePrompt: string;
};

const BACKGROUND_REMOVAL_PROMPT =
  "각 스타일은 최종 결과에서 배경이 제거되어야 하며 투명 PNG처럼 인물/캐릭터만 남겨주세요. 첨부된 이미지를 최대한 적극적으로 활용하고, 헤어스타일·의상·가방·액세서리·로고·문양이 있다면 가능한 한 똑같이 반영해주세요. 고화질로, 발끝까지 보이는 전신 또는 요청한 구도로 완성해주세요.";

export const STYLE_FEED_PAGE_SIZE = 4;

export const STYLE_FEED_ITEMS: StyleFeedItem[] = [
  {
    id: "sylvanian",
    title: "실바니안",
    style: "sylvanian",
    preview: "/prompt-sylvanian.png",
    basePrompt:
      `Transform the person in this photo into a Sylvanian Families (Calico Critters) animal figure. Convert them into a cute anthropomorphic animal & 🗳(choose an animal that best matches their vibe: a tiny cute beige bunny, rabbit, cat, puppy, bear) 🗳wearing a detailed miniature outfit that matches their original clothing. The figure have the signature Sylvanian look: soft flocked fur texture, tiny black dot eyes, a small pink nose, and a gentle expression. The figure should be isolated and centered on a plain, solid white background with neutral studio lighting. No furniture, no background elements, and no dollhouse decor.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "everskies",
    title: "Everskies",
    style: "everskies",
    preview: "/prompt-everskies.png",
    basePrompt:
      `Everskies 스타일의 전신 픽셀 아트 일러스트를 만들어줘. 인물의 체형, 얼굴 표정, 복장과 헤어 스타일의 표현 방식을 모방해줘. 첨부한 이미지 속 인물의 헤어 스타일, 의상, 액세서리를 사용하여 발까지 나오게 인물 일러스트를 그려줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "animal-crossing",
    title: "동물의 숲",
    style: "animal-crossing",
    preview: "/prompt-animal-crossing.png",
    basePrompt:
      `닌텐도 스위치 게임 동물의 숲 스타일의 3D 캐릭터 일러스트 화풍을 공부하고, 그 스타일의 이목구비, 의상. 헤어스타일을 따라 하는 얼굴 표현방식을 따라해. 첨부한 이미지 속 인물의 헤어스타일과 옷, 액세서리로 인물 일러스트를 그려줘. 배경은 투명하게 해줘. 자연광 아래의 밝은 햇빛과 부드러운 그림자 효과를 사용해 따뜻하고 발랄한 분위기로 만들어 줘. 실제 동물의숲 플레이 화면에 등장하는 캐릭터처럼 보여야 해, 3D인 점을 명확하게 보여줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "ios-emoji",
    title: "iOS 이모지",
    style: "ios-emoji",
    preview: "/prompt-ios-emoji.png",
    basePrompt:
      `사진 속 인물을 애플 ios 이모지 스타일의 3D 배경화면 캐릭터로 만들어줘. 이목구비, 피부색, 표정, 표면 질감 등을 모방하고, 헤어 스타일, 머리 장식, 의상, 포즈까지 그대로 반영해줘. 배경은 투명색이며, 최종 이미지가 ios 공식 이모지처럼 보이게 해줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "maplestory",
    title: "메이플",
    style: "maplestory",
    preview: "/prompt-maple.png",
    basePrompt:
      `메이플스토리 인게임 캐릭터의 픽셀 캐릭터 느낌으로 만들어줘. 이목구비, 의상, 헤어스타일을 반영한 얼굴표현을 해줘. 스타일, 옷 액세서리는 첨부한 사진을 그대로 반영해줘. 배경은 흰색으로 이미지를 만들어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "tanning-kitty",
    title: "태닝키티",
    style: "tanning-kitty",
    preview: "/prompt-tanning-kitty.png",
    basePrompt:
      `첨부 사진을 아래 요청 스타일에 맞춰서 2D 캐릭터화해줘. 헬로키티 스타일로 원작의 얼굴과 몸 비율, 윤곽선은 그대로 유지해줘. 피부색은 밝은 라떼색, 햇볕에 건강하게 그을린 느낌으로 변경해줘 (지나치게 어두운 색은 피함). 원래의 리본, 액세서리, 옷은 사진 스타일에 맞게 조정해줘. 사용자 사진을 참고해서 헤어스타일과 옷 스타일은 그대로 반영해줘. 전체적으로 귀엽고 단순한 산리오 스타일 유지해주고 배경은 투명하게 만들어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "snoopy",
    title: "스누피",
    style: "snoopy",
    preview: "/prompt-snoopy.png",
    basePrompt:
      `업로드한 이미지를 Peanuts-style 3d art로 변경해줘. 배경과 옷은 원본 이미지와 비슷하게 표현해주고 스타일만 바꿔줘. png 파일로 저장해주고 그 옆에 스누피 캐릭터 형태도 그대로 그려줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
  {
    id: "snowglobe",
    title: "스노우볼",
    style: "snowglobe",
    preview: "/prompt-snowball.png",
    basePrompt:
      `이미지를 귀엽고 아기같은 차비 스타일의 3D 캐릭터로 만들어줘. 이걸 아이소메트릭 스타일로 만들어줘. 깔끔하고 미니멀한 스타일이어야해. 테마는 첨부 사진의 분위기와 인물에게 가장 잘 어울리는 콘셉트로 최대한 구체적으로 정해줘. 이제 이 사진으로 나만의 3D 스노우볼을 만들어줘. 캐릭터는 스노우볼 중앙에 배치해주고 스노우볼 배경색은 인물의 옷과 가장 잘 어울리는 색으로 해줘. 어울리는 소품도 추가해줘. 귀엽고 고급스럽게 만들어줘. 스노우 볼 안에 물방울처럼 떠다니는 스노우 입자 효과 넣어줘. 오르골 바닥에는 인물에게 어울리는 짧은 이름이나 문구를 필기체로 적어줘.\n\n${BACKGROUND_REMOVAL_PROMPT}`,
  },
];


export function serializeStyleFeedItems(items: readonly StyleFeedItem[] = STYLE_FEED_ITEMS): string {
  return JSON.stringify(items, null, 2);
}
