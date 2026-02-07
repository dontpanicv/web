# Style guide (Don’t Panic, V)

## Principles
- **Static-first** (Astro pages, minimal JS)
- **Readable** typography and spacing
- **HHGTTG vibe**, subtle (yellow accent + calm microcopy)
- **Accessible** (focus styles, contrast, underline links)

## Tokens
Tokens live in `src/styles/global.css`.

- Colors are expressed as RGB triplets:
  - `--c-bg`, `--c-panel`, `--c-text`, `--c-muted`, `--c-border`, `--c-accent`, `--c-link`

Tailwind is configured to expose these as semantic colors:
- `bg-bg`, `bg-panel`, `text-text`, `text-muted`, `border-border`, `bg-accent`, `text-link`

## Components
Located in `src/components/`:
- `Header.astro` (site title, minimal nav, language switch)
- `Footer.astro`
- `Button.astro` (`primary`, `secondary`, `ghost`)
- `Card.astro`
- `Container.astro`

## Layout
- `src/layouts/BaseLayout.astro`:
  - includes meta tags
  - favicon links
  - imports global Tailwind stylesheet

## Brand assets
- `public/brand/thumb.svg` (source-of-truth icon)
- `public/favicon.svg` (points to thumb)
- `public/favicon.ico` (existing ICO for broad compatibility)

## Pages
- `/` Home (posts list, newest first)
- `/page/<n>` Posts pagination
- `/posts/<slug>` Post detail
- `/cv` CV
- `/cs/` Czech home
- `/cs/page/<n>` Czech posts pagination
- `/cs/posts/<slug>` Czech post detail
- `/cs/cv` Czech CV
- `/404` Not found
