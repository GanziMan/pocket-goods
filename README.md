<div align="center">
  <img src="apps/web/public/logo.png" alt="Pocket Goods" width="220" />

  <p><strong>Web-based custom sticker design and order intake platform</strong></p>

  <p>
    <a href="https://pocket-goods.com/">Production</a>
    ·
    <a href="apps/web/README.md">Web App</a>
    ·
    <a href="apps/api/README.md">API Server</a>
  </p>
</div>

---

## Overview

Pocket Goods is a split frontend/backend application for designing custom sticker artwork in the browser, generating AI-assisted visual assets, validating print boundaries, and submitting manual production orders.

The repository is organized as a lightweight monorepo:

- `apps/web` — Next.js application for the landing page, editor, preview, cart, and order UI
- `apps/api` — FastAPI service for image generation, print rendering, background removal, order email dispatch, and export endpoints
- `docs` — operational notes, SQL setup, and implementation plans
- `openspec` — product and technical specification references

## Architecture

```txt
Browser / Next.js
  ├─ Fabric.js editor state
  ├─ Supabase auth/session helpers
  ├─ Local + Supabase persistence for drafts and shipping defaults
  └─ Manual order and cart UI

FastAPI service
  ├─ Google GenAI image generation
  ├─ Pillow/OpenCV print renderer
  ├─ Background removal pipeline
  ├─ SMTP order notification
  └─ Optional Supabase integration
```

### Frontend

| Area | Stack |
| --- | --- |
| Framework | Next.js 16 App Router |
| Runtime UI | React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn-style UI primitives, Base UI, Vaul |
| Canvas | Fabric.js 7 |
| Auth / DB client | Supabase SSR / Supabase JS |
| Image utilities | `@imgly/background-removal`, HEIC conversion, browser canvas APIs |

### Backend

| Area | Stack |
| --- | --- |
| API | FastAPI, Uvicorn |
| Image generation | Google GenAI SDK |
| Rendering | Pillow, NumPy, OpenCV headless |
| Background removal | rembg, ONNX Runtime |
| Persistence / Storage | Supabase Python SDK |
| Notifications | SMTP-based order email dispatch |
| Container | Docker / Docker Compose |

## Key Capabilities

### Browser editor

- Fabric.js-based canvas editor for image and text composition
- A4/A5/A6 output sheet switching without scaling placed objects
- Text editing and printable pill-style name labels
- Saved drafts for logged-in users via Supabase, with local fallback
- Order-cart workflow with single output size per design

### Print preview and export

- Server-side 300 DPI PNG rendering through FastAPI
- Fabric text and grouped label rendering in print exports
- Cutline preview analysis in the browser for separated artwork regions
- UI-only cart thumbnails with white preview backgrounds while preserving transparent print payloads

### AI-assisted asset generation

- Curated AI style presets maintained from `apps/web/src/lib/ai-style-feed.ts`
- `/admin/ai-styles` helper page for editing, validating, previewing, copying, and downloading preset JSON
- Upload/canvas-based prompt flow against the FastAPI generation endpoint
- Anonymous/user-aware generation limits based on Supabase session availability

### Manual order intake

- Current production flow uses manual order receipt rather than opening a payment checkout
- Order submission returns immediate UI completion while SMTP/export work continues in the background
- Order email includes order metadata and print-ready artwork attachments without UI overlays or cutline markings

## Project Layout

```txt
pocket-goods/
├─ apps/
│  ├─ web/
│  │  ├─ src/app/                 # Next.js app routes
│  │  ├─ src/components/editor/   # editor, preview, order, cart UI
│  │  ├─ src/components/canvas/   # Fabric.js canvas hooks and view
│  │  ├─ src/lib/                 # API, pricing, persistence, style presets
│  │  └─ public/                  # logo, icons, static preview assets
│  └─ api/
│     ├─ routers/                 # FastAPI route modules
│     ├─ services/                # renderer, storage, fonts, rate limit, rembg
│     └─ requirements.txt
├─ docs/
│  └─ supabase-user-persistence.sql
├─ openspec/
├─ docker-compose.yml
└─ README.md
```

## Local Development

### 1. API service

The API service is typically run with Docker Compose from the repository root.

```bash
docker compose up --build
```

API server:

```txt
http://localhost:8000
```

OpenAPI docs:

```txt
http://localhost:8000/docs
```

The API container reads environment variables from:

```txt
apps/api/.env
```

### 2. Web app

```bash
cd apps/web
npm ci
npm run dev
```

Web app:

```txt
http://localhost:3000
```

When `NEXT_PUBLIC_API_URL` is not set, local browser traffic falls back to `http://localhost:8000`. Production domains use the configured Railway API fallback in `src/lib/api.ts` to avoid calling a user's local machine.

## Environment Variables

### `apps/web/.env` or Vercel project variables

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### `apps/api/.env` or Railway service variables

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

ORDER_EMAIL_SMTP_HOST=smtp.gmail.com
ORDER_EMAIL_SMTP_PORT=587
ORDER_EMAIL_SMTP_USER=
ORDER_EMAIL_SMTP_PASSWORD=
ORDER_EMAIL_FROM=
ORDER_EMAIL_TO=
ORDER_EMAIL_ALLOW_SKIP=0
```

For Gmail SMTP, `ORDER_EMAIL_SMTP_PASSWORD` must be an app password rather than the account password.

## Supabase Setup

The web app uses Supabase for authentication and optional persistence of user-specific order profiles and design drafts.

Apply the SQL in Supabase Dashboard → SQL Editor:

```txt
docs/supabase-user-persistence.sql
```

This creates:

- `public.user_order_profiles`
- `public.user_design_drafts`

Both tables use Row Level Security policies scoped to the authenticated user.

## AI Style Preset Maintenance

Editor style cards are centralized in:

```txt
apps/web/src/lib/ai-style-feed.ts
```

To change the collection:

1. Reorder `STYLE_FEED_ITEMS` to change display order.
2. Add/remove items to change the visible card set.
3. Update `preview` to point to a file under `apps/web/public`.
4. Update `basePrompt` for the generation prompt.

A helper route is available for editing and previewing JSON without writing to the server filesystem:

```txt
/admin/ai-styles
```

The helper page is intentionally export-only. Applying a change still requires updating the repository and redeploying.

## Verification

Frontend checks:

```bash
cd apps/web
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

API syntax check example:

```bash
python -m py_compile apps/api/services/renderer.py
```

The current web regression script covers editor order behavior, production API fallback rules, Supabase persistence hooks, print text rendering contracts, and AI style preset maintainability checks.

## Deployment Notes

- Web frontend: Vercel
- API service: Railway or equivalent Docker-capable host
- Database/Auth: Supabase
- Order email: SMTP provider configured on the API service

Frontend environment changes require a Vercel redeploy. API environment changes require an API service restart/redeploy.

## Operational Notes

- Keep print export rendering server-side; order attachments should not depend on browser screenshots.
- Cart thumbnails may use white backgrounds for visibility, but print payloads must remain transparent unless explicitly changed.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or Vercel public variables.
- If payment checkout is re-enabled later, preserve the current order email/export contract after payment completion.
