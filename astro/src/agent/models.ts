// What every model backend looks like to the agent, and the models the page may download when the browser has none.
import type { ChatMessage } from './route.ts';

export type GenerateOptions = {
  /** Step 1 of a turn: the reply must name files from this list, nothing else. */
  choices?: string[];
  maxTokens: number;
  temperature: number;
  /** Called with the whole text so far. */
  onText?: (text: string) => void;
  signal?: AbortSignal;
};
/** Token counts, and `ms`: the time from the first piece of output to the last, which is what tokens per second is
 *  measured over (0 when the reply did not stream). */
export type Generation = { text: string; input: number; output: number; window: number; ms: number };
export type Backend = {
  label: string;
  /** Whether the model is asked which files to read; tiny models can't, so the harness searches for them. */
  picksFiles: boolean;
  /** Gets the model ready; `onProgress` gets a 0..1 download fraction. */
  load: (onProgress?: (fraction: number) => void) => Promise<void>;
  generate: (system: string, turns: ChatMessage[], options: GenerateOptions) => Promise<Generation>;
};

export type Dtype = 'q4f16' | 'q4';
export type ModelSpec = {
  label: string;
  repo: string;
  /** Pinned, so a change upstream can't change what visitors run. */
  revision: string;
  /** Download size per weight format, from the Hugging Face API for that revision. */
  bytes: Record<Dtype, number>;
  /** Tokens we allow per prompt; decoding slows down past 4K on WebGPU (transformers.js #1741). */
  window: number;
};

// The one model the page offers to download: IBM Granite 4.0 H 350M, Apache-2.0. It is the smallest model that
// still answered from a file correctly in evals/models.mjs (2026-11: 13 of 14; SmolLM2 135M at 118 MB rambled,
// LFM2.5 350M at 255 MB got 8). It cannot choose files itself, so the harness does that for it (route.ts search).
export const MODEL: ModelSpec = {
  label: 'Granite 4.0 350M',
  repo: 'onnx-community/granite-4.0-h-350m-ONNX',
  revision: '06653818ebf090337d196df49a805d83ec0d211b',
  bytes: { q4f16: 244_102_074, q4: 266_470_090 },
  window: 4096,
};

export type Gpu = { webgpu: boolean; f16: boolean };

export async function probeGpu(): Promise<Gpu> {
  const adapter = await (navigator as any).gpu?.requestAdapter().catch(() => null);
  return { webgpu: Boolean(adapter), f16: Boolean(adapter?.features.has('shader-f16')) };
}

/** 16-bit floats need a GPU feature; without it, or without WebGPU (then on the CPU, slowly), the q4 build runs. */
export const dtypeFor = (gpu: Gpu): Dtype => (gpu.webgpu && gpu.f16 ? 'q4f16' : 'q4');

/** Whether the model's weights are already in this browser's Cache Storage (transformers.js keeps them there). */
export async function cached(spec: ModelSpec, dtype: Dtype): Promise<boolean> {
  try {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    return keys.some((r) => r.url.includes(`${spec.repo}/`) && r.url.includes(`model_${dtype}.onnx_data`));
  } catch {
    return false;
  }
}
