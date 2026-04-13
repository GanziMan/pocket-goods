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
const addressSearchFields = read("src/components/editor/AddressSearchFields.tsx");
const orderProfile = read("src/lib/order-profile.ts");
const useOrderProfile = read("src/hooks/useOrderProfile.ts");
const useSaveDesign = read("src/hooks/useSaveDesign.ts");
const useCanvas = read("src/components/canvas/useCanvas.ts");
const cutlinePreview = read("src/lib/cutline-preview.ts");
const outputSize = read("src/lib/output-size.ts");
const orderPricing = read("src/lib/order-pricing.ts");
const api = read("src/lib/api.ts");
const paymentsApi = read("../api/routers/payments.py");
const apiMain = read("../api/main.py");
const rendererApi = read("../api/services/renderer.py");

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
  assert.match(paymentsApi, /PortOne 결제를 임시 비활성화한 수동 주문 접수 엔드포인트/);
  assert.match(paymentsApi, /결제 검증은 의도적으로 타지 않고/);
  assert.doesNotMatch(paymentsApi, /PORTONE_API_SECRET/);
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
  assert.match(paymentsApi, /"A5": 5000/);
  assert.match(paymentsApi, /"A4": 6000/);
  assert.match(orderPricing, /A6:\s*4000/);
  assert.match(orderPricing, /A5:\s*5000/);
  assert.match(orderPricing, /A4:\s*6000/);
  assert.match(paymentsApi, /orderStatus:\s*Literal\["received"\]/);
  assert.match(paymentsApi, /status="ORDER_RECEIVED"/);
});

test("cart and order preview preserve the size that opened the order sheet", () => {
  assert.match(previewDialog, /quantities:\s*createDefaultQuantities\(payload\.outputSize\)/);
  assert.match(previewDialog, /outputSize:\s*payload\.outputSize/);
  assert.doesNotMatch(cartDialog, /outputSize:\s*"A5"/);
  assert.match(cartDialog, /outputSize:\s*primaryOutputSize/);
  assert.match(cartDialog, /output_size:\s*firstSelectedSize\(item\) \?\? "A5"/);
  assert.match(cartDialog, /getPreferredSize\(item\)/);
  assert.match(cartDialog, /처음 선택한 사이즈/);
});

test("production order calls do not fall back to browser localhost", () => {
  assert.match(api, /PRODUCTION_API_URL\s*=\s*"https:\/\/pocket-goods-production\.up\.railway\.app"/);
  assert.match(api, /hostname === "pocket-goods\.com"/);
  assert.match(api, /hostname\.endsWith\("\.vercel\.app"\)/);
  assert.match(api, /readApiError/);
  assert.equal(previewDialog.includes("localhost:8000"), false);
  assert.equal(cartDialog.includes("localhost:8000"), false);
  assert.equal(orderDialog.includes("localhost:8000"), false);
  assert.equal(previewPage.includes("localhost:8000"), false);
  assert.match(apiMain, /allow_origin_regex=r"https:\/\/\.\*\\\.vercel\\\.app"/);
});

test("order shipping address uses searchable postcode flow with detail-only manual entry", () => {
  assert.match(addressSearchFields, /POSTCODE_SCRIPT_SRC/);
  assert.match(addressSearchFields, /window\.kakao\?\.Postcode/);
  assert.match(addressSearchFields, /zonecode/);
  assert.match(addressSearchFields, /roadAddress/);
  assert.match(addressSearchFields, /detailRef\.current\?\.focus/);
  assert.match(addressSearchFields, /readOnly placeholder="주소 검색으로 입력"/);
  assert.match(addressSearchFields, /readOnly placeholder="도로명\/지번 주소"/);
  for (const [name, source] of [
    ["PreviewDialog", previewDialog],
    ["OrderCartDialog", cartDialog],
    ["OrderDialog", orderDialog],
    ["preview-client", previewPage],
  ]) {
    assert.match(source, /AddressSearchFields/, `${name} must use the shared address search component`);
  }
});

test("logged-in users persist shipping defaults and large drafts in Supabase", () => {
  assert.match(orderProfile, /user_order_profiles/);
  assert.match(orderProfile, /saveOrderProfile/);
  assert.match(orderProfile, /loadOrderProfile/);
  assert.match(orderProfile, /localStorage/);
  assert.match(useOrderProfile, /loadOrderProfile/);
  assert.match(useOrderProfile, /saveOrderProfile/);
  for (const [name, source] of [
    ["PreviewDialog", previewDialog],
    ["OrderCartDialog", cartDialog],
    ["OrderDialog", orderDialog],
    ["preview-client", previewPage],
  ]) {
    assert.match(source, /useOrderProfile/, `${name} must load remembered shipping fields`);
    assert.match(source, /rememberProfile\(shipping\)/, `${name} must save shipping fields before order submit`);
  }

  assert.match(useSaveDesign, /user_design_drafts/);
  assert.match(useSaveDesign, /saveRemoteDraft/);
  assert.match(useSaveDesign, /from\(DRAFT_TABLE\)\.upsert/);
  assert.match(useSaveDesign, /loadDraft = useCallback\(async/);
  assert.match(editorLayout, /void loadDraft\(\)\.then/);
});

test("print renderer keeps Fabric text and pill name tags in exports", () => {
  assert.match(rendererApi, /TEXT_OBJECT_TYPES\s*=\s*\{[^}]*"itext"[^}]*"textbox"/s);
  assert.match(rendererApi, /def _is_text_obj/);
  assert.match(rendererApi, /elif _is_text_obj\(obj\):/);
  assert.match(rendererApi, /def _is_name_tag_obj/);
  assert.match(rendererApi, /_obj_type\(obj\) == "group"/);
  assert.match(rendererApi, /def _render_name_tag_obj/);
  assert.match(rendererApi, /_find_group_rect_child/);
  assert.match(rendererApi, /_find_group_text_child/);
  assert.match(useCanvas, /FABRIC_EXPORT_PROPS/);
  assert.match(useCanvas, /pocketGoodsKind/);
  assert.match(useCanvas, /addNameTag/);
});
