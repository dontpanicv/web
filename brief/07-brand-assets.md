# Brand assets (HHGTTG-inspired)

## Goal
Define a small, consistent set of **original** brand assets so implementation is straightforward in Astro.

> Note: We want the *vibe* of the Hitchhiker’s Guide / movie thumbs‑up motif, but the artwork should be **original**, not a 1:1 copy of any copyrighted logo.

## Required assets

### 1) Logo mark (primary)
- **Name:** Yellow thumbs‑up
- **Format:** SVG (primary), optional PNG exports
- **Style:** flat, high-contrast, minimal detail, readable at small sizes
- **Usage:** header logo + small accent icon

**Files**
- `astro/public/brand/thumb.svg` (source of truth)
- `astro/public/brand/thumb-256.png` (optional)

### 2) Favicon set
Generate from the same thumb mark.

**Files**
- `astro/public/favicon.svg`
- `astro/public/favicon.ico`
- Optional extras (nice-to-have):
  - `astro/public/apple-touch-icon.png` (180×180)
  - `astro/public/favicon-32x32.png`
  - `astro/public/favicon-16x16.png`

### 3) Wordmark / site title lockup (optional)
- Text-based “Don’t Panic, V” (can just be HTML/CSS)
- Optionally a combined SVG later, but not required day 1

## Color specs
- Primary yellow accent: `#FFD400` (tweakable)
- Ensure contrast is accessible:
  - Yellow is mostly for accents on dark backgrounds or as border/underline

## Placement rules
- Header: thumb icon left of site title
- Footer: smaller thumb, optional
- Do not overuse the icon; keep it intentional

## Implementation notes for Claude Code
When implementing assets:
1. Create `astro/public/brand/` and store the source SVG there.
2. Use the same SVG to generate the favicon set.
3. Update Astro layout/head to reference `favicon.svg` + `favicon.ico`.
4. Keep SVG simple (no external fonts, no embedded rasters).

## Acceptance criteria
- Favicon looks recognizable at 16×16
- Header logo looks crisp on retina screens
- Works in both light and dark mode
