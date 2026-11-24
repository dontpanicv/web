// Shortlisted design mockups: `./publish.sh` builds ./site and deploys it as an assets-only Worker.
// Plain object instead of defineConfig: the `cf` package lives in ../astro/node_modules, not resolvable from here.
export default {
  worker: {
    name: "dontpanicv-design",
    compatibilityDate: "2026-11-01",
    workersDev: false,
    domains: ["design.dontpanicv.com"],
  },
};
