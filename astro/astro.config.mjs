// @ts-check
import { defineConfig } from 'astro/config';

import icon from 'astro-icon';

// onnxruntime-web (under transformers.js, for the on-device agent) makes Vite emit its 27 MB wasm file, which is
// over Cloudflare's 25 MiB limit per asset. It is never requested: transformers.js loads that file from jsDelivr.
const dropOrtWasm = {
  name: 'drop-ort-wasm',
  generateBundle(_, bundle) {
    for (const file in bundle) if (file.endsWith('.wasm')) delete bundle[file];
  },
};

// https://astro.build/config
export default defineConfig({
  integrations: [icon()],

  vite: {
    plugins: [dropOrtWasm],
  },
});
