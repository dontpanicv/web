# Tech / Implementation Notes

## Current hosting
- Docker Compose in `/root/services`
- Traefik for TLS + routing
- Nginx static container (`services.web`) serves:
  - `main/` for dontpanicv.com

## Site generation (selected)
- **Astro** (static build)

### Proposed layout
- `astro/` — Astro source (layouts, components, pages, content)
- `main/` — build output served on `dontpanicv.com`

### Workflow
- Iterate locally:
  - `cd astro && npm run dev`
  - (or) `cd astro && npm run build && npm run preview`
- Build for prod when ready:
  - `cd astro && npm run build` (outputs to `../main/`)

## Content authoring
- Markdown files committed to git (Astro content / pages)
- Build output lands in `main/` which nginx serves directly

## Language routing
- English is the default at `/`
- Czech routes live under `/cs/`
- Nginx can optionally auto-redirect CZ visitors to `/cs/` using Cloudflare’s `CF-IPCountry` header
  - Respect user choice via `lang=en|cs` cookie
