# Repository Guidelines

## Project Structure & Module Organization

- `astro/`: Astro site source (ESM). Plain CSS, no Tailwind.
- `astro/src/pages/`: route pages (`cv.astro` -> `/cv`).
- `astro/src/components/`, `astro/src/layouts/`, `astro/src/styles/`: UI building blocks and design tokens.
- `astro/src/data/profile.ts`: who V is (bio, projects, CV, contact). The homepage and the agent's files both read it.
- `astro/src/agent/`: the on-device agent on the homepage (see `astro/README.md`). `astro/src/lib/agent-files.ts` builds the files it reads, served as `/agent/files.json`.
- `astro/evals/`: browser checks that need Chrome and a running site (model comparison, homepage end to end).
- `astro/src/content/posts/`: blog posts (Astro content collection: `posts`).
- `astro/public/`: static assets (favicons, `brand/`), plus Cloudflare `_headers` and `_redirects`.
- `brief/`: project briefs/specs in Markdown (update these when changing content/IA/design).
- `library/`: long-form drafts and idea backlog (Markdown).
- Generated output (git-ignored): `astro/dist/`.

## Build, Test, and Development Commands

Run commands from `astro/`:

- `npm install`: install dependencies.
- `npm run dev`: start the local dev server.
- `npm run build`: build to `dist/`.
- `npm run preview`: serve the last build locally.
- `npm test`: self-check of the agent's prompt and search logic (`src/agent/route.test.ts`).
- `npm run eval:page` / `npm run eval:models`: the homepage agent end to end, and the downloadable model on real questions. Both need `npm run dev` running and Chrome; the first run downloads the model (about 240 MB).
- `npm run deploy`: build and deploy to Cloudflare with the `cf` CLI (needs `cf auth login` once).

## Coding Style & Naming Conventions

- Indentation: 2 spaces in `.astro` and CSS; keep existing formatting and keep diffs small.
- Styling: plain CSS in `astro/src/styles/trace.css`; use its tokens (`--paper`, `--ink`, `--muted`, `--accent`, `--serif`, `--mono`) over hard-coded values.
- Components: `PascalCase.astro` under `astro/src/components/`.
- Routes: lowercase filenames under `astro/src/pages/` (filename becomes the route).
- Language: the site is English only.
- When adding a new page, use `astro/src/layouts/TraceLayout.astro` and link it from that layout's header nav.
- When a fact about V changes, change `astro/src/data/profile.ts`; when the agent should know something new, add it to `astro/src/lib/agent-files.ts` (the `about` line is what its file search matches on).

## Testing Guidelines

- `npm test` and `npm run build` before opening a PR. After touching `src/agent/` or the agent's files, also run `npm run eval:page`.

## Commit & Pull Request Guidelines

- Commit messages are short and imperative (e.g., `Add ...`, `Split ...`), sometimes scoped (`Brief: ...`, `draft(blog): ...`).
- PRs should include: what changed, why, and screenshots for visual changes.
- Don't commit generated `astro/dist/` output.

## Deployment & Configuration Notes

- Hosted on Cloudflare as a static, assets-only Worker named `dontpanicv` ("Pages on Workers") on the custom domain `dontpanicv.com`; config in `astro/cloudflare.config.ts`.
- Deploy with `npm run deploy` (`astro build && cf deploy ./dist`). It uses the `cf` dev dependency; the `cf` CLI does not support classic Pages projects.
- Response headers live in `astro/public/_headers`, redirects (old `/cs/` URLs) in `astro/public/_redirects`.
