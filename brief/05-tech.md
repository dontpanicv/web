# Tech / Implementation Notes

## Current hosting
- Docker Compose in `/root/services`
- Traefik for TLS + routing
- Nginx static container (`services.web`) serves:
  - `main/` for dontpanicv.com
  - `preview/` for preview.dontpanicv.com

## Site generation (selected)
- **Astro** (static build)

### Proposed layout
- `astro/` — Astro source (layouts, components, pages, content)
- `preview/` — build output served on `preview.dontpanicv.com`
- `main/` — build output served on `dontpanicv.com`

### Workflow
- Iterate on preview:
  - `cd astro && npm run build:preview`
  - verify on `https://preview.dontpanicv.com`
- Promote to prod when ready:
  - `cd astro && npm run build:main` (or copy `preview/ → main/`)

## Content authoring
- Markdown files committed to git (Astro content / pages)
- Build outputs land in `preview/` and `main/` which nginx serves directly
