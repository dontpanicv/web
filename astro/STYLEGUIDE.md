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
- Dark mode is activated via `html.dark`.

Tailwind is configured to expose these as semantic colors:
- `bg-bg`, `bg-panel`, `text-text`, `text-muted`, `border-border`, `bg-accent`, `text-link`

## Dark mode
- Default: OS preference (`prefers-color-scheme`)
- Optional override: `localStorage.theme = 'light'|'dark'`
- Toggle button: `[data-theme-toggle]` in the header

## Components
Located in `src/components/`:
- `Header.astro` (logo, nav, theme toggle)
- `Footer.astro`
- `Button.astro` (`primary`, `secondary`, `ghost`)
- `Card.astro`
- `Container.astro`

## Layout
- `src/layouts/BaseLayout.astro`:
  - includes meta tags
  - favicon links
  - imports global Tailwind stylesheet
  - injects theme init + minimal toggle JS

## Brand assets
- `public/brand/thumb.svg` (source-of-truth icon)
- `public/favicon.svg` (points to thumb)
- `public/favicon.ico` (existing ICO for broad compatibility)

## Pages
- `/` Home
- `/cv` CV
- `/projects` Projects
- `/blog` Blog index
- `/contact` Contact
- `/404` Not found
