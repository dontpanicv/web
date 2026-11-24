import { defineConfig } from "cf/config";

// Static site: `cf deploy ./dist` uploads the Astro build as an assets-only Worker.
export default defineConfig({
  worker: {
    name: "dontpanicv",
    compatibilityDate: "2026-11-01",
    workersDev: false,
    domains: ["dontpanicv.com"],
    assets: { notFoundHandling: "404-page" },
  },
});
