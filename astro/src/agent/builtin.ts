// The model that ships with the browser: the Prompt API (`LanguageModel`), which is Gemini Nano in desktop Chrome
// 148+ and a flagged preview in Edge. Safari, Firefox and mobile browsers expose no model to pages (checked 2026-11).
import type { Backend } from './models.ts';
import { MAX_FILES } from './route.ts';

declare const LanguageModel: any;

// The same options go to availability() and create(); Chrome wants the output language named.
const OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

export type BuiltinStatus = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

/** 'available' means the model is on the device now; 'downloadable' means the browser would fetch gigabytes first. */
export async function builtinStatus(): Promise<BuiltinStatus> {
  if (!('LanguageModel' in globalThis)) return 'unsupported';
  try {
    return await LanguageModel.availability(OPTIONS);
  } catch {
    return 'unavailable';
  }
}

export const builtinLabel = () =>
  /\bEdg\//.test(navigator.userAgent) ? 'Edge built-in model' : 'Gemini Nano (built into Chrome)';

const nextGesture = () =>
  new Promise<void>((resolve) => {
    const done = () => {
      removeEventListener('pointerdown', done, true);
      removeEventListener('keydown', done, true);
      resolve();
    };
    addEventListener('pointerdown', done, true);
    addEventListener('keydown', done, true);
  });

export function builtinBackend(system: string): Backend {
  let base: Promise<any> | undefined;
  // One base session holds the system prompt; each generation runs on a clone, so nothing carries over.
  const session = (onProgress?: (fraction: number) => void) => {
    const create = () =>
      LanguageModel.create({
        ...OPTIONS,
        initialPrompts: [{ role: 'system', content: system }],
        monitor: (m: any) => m.addEventListener('downloadprogress', (e: any) => onProgress?.(e.loaded / (e.total || 1))),
      });
    base ??= create().catch(async (error: any) => {
      // Some versions want a click or key press first, which a run resumed after a reload doesn't have.
      if (error?.name !== 'NotAllowedError') throw error;
      await nextGesture();
      return create();
    });
    base.catch(() => (base = undefined)); // a failed start can be tried again
    return base;
  };

  return {
    label: builtinLabel(),
    picksFiles: true,
    load: async (onProgress) => void (await session(onProgress)),
    async generate(_system, turns, { choices, onText, signal }) {
      const s = await (await session()).clone({ signal });
      try {
        let text = '';
        let first = 0;
        if (choices) {
          // No native tool calls in the shipped API: the reply is constrained to a JSON list of file paths instead.
          const schema = { type: 'array', maxItems: MAX_FILES, items: { type: 'string', enum: choices } };
          text = await s.prompt(turns, { signal, responseConstraint: schema });
        } else {
          for await (const chunk of s.promptStreaming(turns, { signal })) {
            // Chunks are deltas today; early versions sent the whole text each time.
            first ||= performance.now();
            text = text && chunk.startsWith(text) ? chunk : text + chunk;
            onText?.(text);
          }
        }
        const ms = first ? performance.now() - first : 0;
        // The API reports no output count, so the session measures its own reply; four characters per token if it can't.
        const measure = s.measureContextUsage ?? s.measureInputUsage;
        const output = await Promise.resolve(measure?.call(s, text)).catch(() => undefined) ?? Math.round(text.length / 4);
        const used = s.contextUsage ?? s.inputUsage ?? 0; // after the reply, so it includes it
        return { text, input: Math.max(0, used - output), output, window: s.contextWindow ?? s.inputQuota ?? 0, ms };
      } finally {
        s.destroy();
      }
    },
  };
}
