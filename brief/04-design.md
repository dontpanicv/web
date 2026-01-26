# Design

## Theme / concept
**"Don’t Panic, V"** is a deliberate Hitchhiker’s Guide to the Galaxy reference.
The visual identity should nod to the iconic **DON’T PANIC** aesthetic and the **yellow thumbs‑up** motif from the movie, without turning the site into a parody.

Design goal: **minimal, readable, professional** — with a small amount of playful HHGTTG flavor.

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
  - Suggested: `#0B0F14` (dark mode) / `#FAFAF7` (light mode)
- **Text:** near-black / near-white depending on theme
  - Suggested: `#101418` (light) / `#E9EEF3` (dark)
- **Secondary accents:** muted blues/teals for links, but keep subtle

Rule: use yellow **sparingly** (logo, buttons, small highlights) so it feels intentional.

## Typography
Aim for “guide/manual meets modern web.”

- Body: clean sans-serif (system stack is fine to start)
- Headings: slightly more character (but still readable)
- Optional: a monospace for code blocks / small “guide” labels

Initial suggestion (no external font dependency required):
- Body: `system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

## Layout
- Responsive centered column
- Max content width: **~900px**
- Comfortable line-length for reading
- Generous vertical spacing

### Header
- Left: logo (thumb) + “Don’t Panic, V”
- Right: nav (Home / CV / Projects / Blog / Contact)
- Sticky header optional (nice, but not required)

### Home hero
- Strong headline: “Don’t Panic, V.”
- Short 1–2 sentence intro (what you do)
- 2–3 primary CTAs:
  - “View CV”
  - “Projects”
  - “Blog”

## Components
- **Cards** for projects and posts
- **Callouts** (subtle “Guide note” boxes) for key points
- **Buttons**: simple rounded rectangles; primary uses yellow accent
- **Code blocks**: clean, readable, with copy button optional later

## Icons / assets
- Create simple vector assets in `astro/public/`:
  - `favicon.svg` (yellow thumbs‑up)
  - `favicon.ico` (generated)
  - `logo.svg` (thumbs‑up for header)

Notes:
- Keep the thumb graphic simple (flat fills, minimal detail) for recognizability at small sizes.
- Avoid copyrighted exact replicas; make it an **original** thumb icon with similar vibe.

## Dark mode
Recommended: **yes**, because it fits the “space/manual” feel.

- Default: light mode
- Auto-switch based on OS preference (`prefers-color-scheme`)
- Provide a toggle later if desired

## Accessibility
- Ensure contrast meets WCAG AA, especially yellow-on-light backgrounds.
- Don’t use yellow as the only indicator (links should be underlined or otherwise distinguished).
- Focus styles: visible and consistent.

## Tone in microcopy
- Calm, friendly, slightly witty.
- Small HHGTTG nods allowed (e.g., “Guide notes”), but keep the CV sections professional.
