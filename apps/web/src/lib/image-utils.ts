/**
 * base64 이미지에 pocket-goods.com 워터마크를 추가합니다.
 */
export function addWatermark(base64Img: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onerror = () => resolve(base64Img);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(base64Img); return; }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(14, Math.floor(img.width * 0.025));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      const text = "pocket-goods.com";
      const padding = fontSize * 0.6;

      const textMetrics = ctx.measureText(text);
      const bgX = img.width - padding - textMetrics.width - 8;
      const bgY = img.height - padding - fontSize - 4;
      const bgW = textMetrics.width + 16;
      const bgH = fontSize + 8;

      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, 4);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(text, img.width - padding, img.height - padding);

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = base64Img;
  });
}

/**
 * base64 이미지 문자열을 Blob으로 변환합니다.
 */
export async function resultToBlob(base64Img: string): Promise<Blob> {
  const res = await fetch(base64Img);
  return res.blob();
}
