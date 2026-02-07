# Design

## Theme / concept
**"Don’t Panic, V"** is a deliberate Hitchhiker’s Guide to the Galaxy reference.
The visual identity should nod to the iconic **DON’T PANIC** aesthetic and the **yellow thumbs‑up** motif from the movie, without turning the site into a parody.

Design goal: **brutally simple, readable, professional** — with a small amount of playful HHGTTG flavor.

Primary inspiration: **thebestmotherfucking.website** (light background version) — minimal HTML/CSS, generous whitespace, readable type, no unnecessary UI.

## Key motifs
- **Primary mark / motif:** a simple **yellow thumbs‑up** (flat, high contrast) used as:
  - favicon
  - header logo
  - small accent icon (e.g., next to the site title)
- Optional secondary motif: subtle “space” / “guide” vibes via small star-dots pattern (very low opacity) in hero background.

## Color palette
Keep the site mostly neutral with a strong accent.

- **Primary accent:** Hitchhiker yellow
  - Suggested: `#FFD400` (adjustable)
- **Base background:** off-white
  - Suggested: `#FAFAF7`
- **Text:** near-black
  - Suggested: `#101418`
- **Secondary accents:** muted blues/teals for links, but keep subtle

Rule: use yellow **sparingly** (logo, buttons, small highlights) so it feels intentional.

## Typography
Aim for “guide/manual meets modern web.”

- Hero / display: **Eagle 2** (served locally)
- Body + UI: **Gill Sans 2** (served locally)
- Optional: a monospace for code blocks

Font files live under `astro/public/fonts/` and are referenced via `@font-face` in global CSS.

## Layout
- All pages use the same 2-column split on desktop:
  - Left: **~75%** width (posts)
  - Right: **~25%** width (logo + contact/about)
- Top row reserves **~25% of viewport height** for the headline + logo.
- Only the main (left) content area changes per route (posts list, CV, post detail).

### Header
- Keep navigation minimal and out of the way.
- No “frosted glass”, heavy borders, or ornate UI.

### Home hero
- Huge headline (Eagle 2): **“DONT PANIC, V!”** in the top-left (≈ 3/4 width).
- Top-right: `brand/logo.svg`.
- Under the logo (right column): contact links + one short “about me” paragraph.
- Main content (left column): a simple post list (no heavy card UI, no redundant "Posts/Newest first" labels).

## Components
- Prefer plain typography and spacing over components.
- Use **Cards** sparingly (mostly for non-home pages if needed).
- **Buttons**: simple rounded rectangles; primary uses yellow accent
- **Code blocks**: clean, readable, with copy button optional later

## Icons / assets
- Create simple vector assets in `astro/public/`:
  - `favicon.svg` (yellow thumbs‑up)
  - `favicon.ico` (generated)
  - `brand/logo.svg` (thumbs‑up for header)

Notes:
- Keep the thumb graphic simple (flat fills, minimal detail) for recognizability at small sizes.
- Avoid copyrighted exact replicas; make it an **original** thumb icon with similar vibe.

## Dark mode
No dark mode. Keep the site light-only.

## Accessibility
- Ensure contrast meets WCAG AA, especially yellow-on-light backgrounds.
- Don’t use yellow as the only indicator (links should be underlined or otherwise distinguished).
- Link styling: UI links can be subtle (no underline by default), but should underline on hover/focus; long-form content links should stay obviously link-like.
- Focus styles: visible and consistent.

## Tone in microcopy
- Calm, friendly, slightly witty.
- Small HHGTTG nods allowed (e.g., “Guide notes”), but keep the CV sections professional.
