import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const previewDialog = read("src/components/editor/PreviewDialog.tsx");
const cartDialog = read("src/components/editor/OrderCartDialog.tsx");
const orderDialog = read("src/components/editor/OrderDialog.tsx");
const previewPage = read("src/app/design/preview/preview-client.tsx");
const editorLayout = read("src/components/editor/EditorLayout.tsx");
const useCanvas = read("src/components/canvas/useCanvas.ts");
const cutlinePreview = read("src/lib/cutline-preview.ts");
const outputSize = read("src/lib/output-size.ts");
const paymentsApi = read("../api/routers/payments.py");

test("PortOne browser checkout is disabled on all editor order entry points", () => {
  for (const [name, source] of [
    ["PreviewDialog", previewDialog],
    ["OrderCartDialog", cartDialog],
    ["OrderDialog", orderDialog],
    ["preview-client", previewPage],
  ]) {
    assert.equal(source.includes("@portone/browser-sdk"), false, `${name} still imports PortOne`);
    assert.equal(source.includes("requestPayment"), false, `${name} still opens a PortOne checkout`);
  }
  assert.match(paymentsApi, /PortOne 결제를 임시 비활성화한 주문 접수 엔드포인트/);
});

test("owner order email is addressed and includes order metadata plus cutline-free image rendering", () => {
  assert.match(paymentsApi, /ORDER_OWNER_EMAIL\s*=\s*"kju7859@gmail\.com"/);
  assert.match(paymentsApi, /_send_owner_order_email/);
  assert.match(paymentsApi, /주문번호:/);
  assert.match(paymentsApi, /주문시간:/);
  assert.match(paymentsApi, /주문자\/배송 정보/);
  assert.match(paymentsApi, /with_cutting_line=False/);
  assert.match(paymentsApi, /canvasJSON/);
  assert.match(previewDialog, /canvasJSON:\s*payload\.canvasJSON/);
  assert.match(cartDialog, /canvasJSON:\s*item\.canvasJSON/);
  assert.match(previewPage, /canvasJSON:\s*payload\.canvasJSON/);
});

test("cutline preview warns for separated cutline regions and draws a solid boundary", () => {
  assert.match(cutlinePreview, /findConnectedComponents/);
  assert.match(cutlinePreview, /cutRegionCount/);
  assert.match(cutlinePreview, /분리 영역/);
  assert.match(previewDialog, /warning\?: string/);
  assert.match(previewPage, /warning\?: string/);
  assert.equal(previewDialog.includes("setLineDash([10, 6])"), false);
  assert.equal(previewPage.includes("setLineDash([10, 6])"), false);
  assert.match(previewDialog, /빨간 실선/);
  assert.match(previewPage, /빨간 실선/);
});

test("A4/A5/A6 sheet resizing changes canvas bounds without scaling placed objects", () => {
  assert.match(outputSize, /OUTPUT_CANVAS_SIZE/);
  assert.match(outputSize, /A4:\s*\{\s*width:\s*595,\s*height:\s*842\s*\}/);
  assert.match(outputSize, /A5:\s*\{\s*width:\s*420,\s*height:\s*595\s*\}/);
  assert.match(outputSize, /A6:\s*\{\s*width:\s*298,\s*height:\s*420\s*\}/);
  assert.match(editorLayout, /setCanvasSize\(OUTPUT_CANVAS_SIZE\[outputSize\]\)/);
  assert.match(useCanvas, /setCanvasSize/);
  assert.match(useCanvas, /originalSizeRef\.current = size/);
  assert.doesNotMatch(useCanvas, /setCanvasSize[\s\S]*scaleX\s*=/, "resize path must not mutate object scaleX");
  assert.doesNotMatch(useCanvas, /setCanvasSize[\s\S]*scaleY\s*=/, "resize path must not mutate object scaleY");
});

test("manual order intake keeps web and API sticker prices aligned", () => {
  assert.match(paymentsApi, /"A6": 4000/);
  assert.match(paymentsApi, /"A5": 4000/);
  assert.match(paymentsApi, /"A4": 4000/);
  assert.match(paymentsApi, /orderStatus:\s*Literal\["received"\]/);
  assert.match(paymentsApi, /status="ORDER_RECEIVED"/);
});
