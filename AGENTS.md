# Repository Guidelines

## Project Structure & Module Organization

- `astro/`: Astro + Tailwind site source (ESM).
- `astro/src/pages/`: route pages (`cv.astro` -> `/cv`).
- `astro/src/pages/cs/`: Czech routes under `/cs/` (mirror of key pages in `astro/src/pages/`).
- `astro/src/components/`, `astro/src/layouts/`, `astro/src/styles/`: UI building blocks and design tokens.
- `astro/src/content/posts/`: English blog posts (Astro content collection: `posts`).
- `astro/src/content/postsCs/`: Czech blog posts (Astro content collection: `postsCs`).
- `astro/public/`: static assets (favicons, `brand/`).
- `brief/`: project briefs/specs in Markdown (update these when changing content/IA/design).
- `library/`: long-form drafts and idea backlog (Markdown).
- Generated output (git-ignored): `main/` (see `astro/astro.config.mjs`).

## Build, Test, and Development Commands

Run commands from `astro/`:

- `npm install`: install dependencies.
- `npm run dev`: start the local dev server.
- `npm run build`: build to `../main/`.
- `npm run build:main`: build to `../main/` (alias / explicit outDir).
- `npm run preview`: serve the last build locally.

## Coding Style & Naming Conventions

- Indentation: 2 spaces in `.astro` and CSS; keep existing formatting and keep diffs small.
- Styling: prefer Tailwind utilities and tokenized colors (`bg-bg`, `text-muted`) from `astro/src/styles/global.css` over hard-coded hex values.
- Components: `PascalCase.astro` under `astro/src/components/`.
- Routes: lowercase filenames under `astro/src/pages/` (filename becomes the route).
- Localization: the site is bilingual (English + Czech). Any new user-facing content should be added/updated in both languages (including new posts and any new pages under `astro/src/pages/` + `astro/src/pages/cs/`).
- Posts: publish in both languages at the same time.
- Posts: for every EN post in `astro/src/content/posts/`, add a matching CZ post in `astro/src/content/postsCs/`.
- Posts: keep `date`, `status`, and `translationKey` aligned between EN/CZ. Slugs should differ (Astro warns on duplicate ids); language switching matches on `translationKey` (fallback: slug).
- When adding a new page, update navigation in `astro/src/components/Header.astro`.

## Testing Guidelines

- No automated test suite currently. Use `npm run build` as a smoke test before opening a PR.

## Commit & Pull Request Guidelines

- Commit messages are short and imperative (e.g., `Add ...`, `Split ...`), sometimes scoped (`Brief: ...`, `draft(blog): ...`).
- PRs should include: what changed, why, and screenshots for visual changes.
- Don't commit generated `main/` output.

## Deployment & Configuration Notes

- `nginx.conf` serves `main/` for `dontpanicv.com`.
