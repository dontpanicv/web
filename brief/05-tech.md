# Tech / Implementation Notes

## Hosting
- **Cloudflare**, static files only: an assets-only Worker named `dontpanicv` ("Pages on Workers")
- Config: `astro/cloudflare.config.ts` (name, custom domain `dontpanicv.com`, 404 page); headers in `astro/public/_headers`; redirects in `astro/public/_redirects`

## Site generation
- **Astro** (static build), plain CSS (`astro/src/styles/trace.css`)

## On-device agent (homepage)
- No backend: the agent runs in the visitor's browser. Details in `astro/README.md`.
- Model: the browser's built-in one first (Chrome's Prompt API, Gemini Nano). Otherwise the page asks before downloading IBM Granite 4.0 H 350M (about 240 MB, Apache-2.0) from Hugging Face and runs it with transformers.js on WebGPU.
- Loop and storage: pi-durable with IndexedDB, so a run survives reloads.
- Third parties the page talks to: Google Fonts; and only after the visitor agrees to the download, huggingface.co (weights) and cdn.jsdelivr.net (ONNX Runtime wasm).

### Layout
- `astro/` — Astro source (layouts, components, pages, content)
- `astro/dist/` — build output (git-ignored)

### Workflow
- Iterate locally:
  - `cd astro && npm run dev`
  - (or) `cd astro && npm run build && npm run preview`
- Deploy:
  - `cd astro && npm run deploy` (build + `cf deploy ./dist`; run `cf auth login` once)

## Content authoring
- Markdown files committed to git (Astro content / pages)

## Language
- English only
- Old Czech URLs under `/cs/` redirect to their English pages
