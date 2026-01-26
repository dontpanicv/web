# Tech / Implementation Notes

## Current hosting
- Docker Compose in `/root/services`
- Traefik for TLS + routing
- Nginx static container (`services.web`) serves:
  - `main/` for dontpanicv.com
  - `preview/` for preview.dontpanicv.com

## Site generation
Choose one:
- Plain HTML/CSS (hand-built)
- Static site generator (Astro / Eleventy / Hugo)

## Content authoring
- Markdown files committed to git
- Build pipeline can run locally, output to `preview/` then promote to `main/`
