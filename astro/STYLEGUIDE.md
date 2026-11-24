# Style guide (Don't Panic, V)

The design is "Agent Trace": the homepage reads as an agent run, and every page uses the same paper, ink and one yellow accent.

## Principles
- **Readable first**: body text is a serif at 19–20px, at most about 66 characters wide. Mono type is for labels, never paragraphs.
- **The gimmick lives in the chrome**: the headline prompt, tool cards and the rail sit around normal content, and the content is in the HTML without JavaScript.
- **No decoration that reads as information**: no run ids, fake statuses or invented reasoning. A label on the page means something.
- **Real, not simulated**: what looks like a tool call or a token count on the live part of the page is one.
- **Accessible**: focus outlines, underlined links, `prefers-reduced-motion` respected.

## Tokens
Tokens live in `src/styles/trace.css` (plain CSS, no Tailwind):
- colours: `--paper`, `--card`, `--ink`, `--muted`, `--line`, `--soft`, `--accent` (`#FFD400`)
- type: `--serif` (Newsreader), `--sans` (Instrument Sans), `--mono` (JetBrains Mono), loaded from Google Fonts

## Building blocks
- `src/layouts/TraceLayout.astro`: head, fonts, header with the nav. `layout="layout home"` is the homepage grid (content plus rail); the default is a single reading column.
- `src/components/home/`: the homepage's parts (`Ask`, `Answer`, `Content`, `Instruments`).
- `src/components/Px.astro`: 1-bit pixel glyphs for the project marks.
- `src/components/PostActions.astro`: copy-as-markdown and discussion links on a post.
- The conversation is a numbered run with a dashed leading line (`.convo`, CSS counters), so it reads apart from the page's own content; the prompt box is always its next step.
- Classes worth reusing: `.step` (one step of a conversation), `details.tool` (a tool card), `.article` + `.md` (long-form text), `.cv`, `.contacts`, `.shell`, `.btn`.

## Brand assets
- `public/brand/logo.svg`: the original mark, a thumb in a ringed planet (vector, the source of truth)
- `public/brand/mark.svg` and `public/favicon.svg`: that mark redrawn on a 32 × 32 pixel grid, for the header and the browser tab. Regenerate with `node scripts/pixel-mark.mjs [grid]`; add `--preview out.png` to look first.
- `public/brand/thumb.svg`: the older plain yellow thumb, unused

## Pages
- `/` Home: name, the headline prompt, the written answer about V, then about, projects, writing and CV as cards; context window and model in the rail
- `/posts/<slug>/` Post
- `/cv/` CV
