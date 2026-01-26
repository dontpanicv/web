// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Default build output goes to preview/, because that's where we iterate.
  // For production builds, use: `npm run build:main` (sets --outDir ../main).
  outDir: '../preview',
});
