// A downloaded model, run in this tab with transformers.js (ONNX Runtime Web) on WebGPU, or on the CPU without it.
// Loaded only after the visitor agrees to the download: this file pulls in transformers.js, so it is imported lazily.
// Weights come from Hugging Face at a pinned revision and the ONNX Runtime wasm from jsDelivr; the browser keeps
// both in Cache Storage.
import { AutoModelForCausalLM, AutoTokenizer, InterruptableStoppingCriteria, TextStreamer } from '@huggingface/transformers';
import type { Backend, Dtype, Gpu, ModelSpec } from './models.ts';

/** What the visitor may see: some models think in <think> blocks first. */
const visible = (raw: string) => raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart();

// One generation at a time: the GPU belongs to one request.
let queue: Promise<unknown> = Promise.resolve();
const serialized = <T>(job: () => Promise<T>): Promise<T> => (queue = queue.then(job, job)) as Promise<T>;

export function localBackend(spec: ModelSpec, dtype: Dtype, gpu: Gpu): Backend {
  const device = gpu.webgpu ? 'webgpu' : 'wasm';
  let loaded: Promise<{ tokenizer: any; model: any }> | undefined;

  const load = (onProgress?: (fraction: number) => void) => {
    const files = new Map<string, number>(); // bytes per file; the weights come in several files
    const total = spec.bytes[dtype];
    const progress = (p: any) => {
      if (p.status !== 'progress') return;
      files.set(p.file, p.loaded);
      let sum = 0;
      for (const n of files.values()) sum += n;
      onProgress?.(Math.min(1, sum / total));
    };
    loaded ??= Promise.all([
      AutoTokenizer.from_pretrained(spec.repo, { revision: spec.revision, progress_callback: progress }),
      AutoModelForCausalLM.from_pretrained(spec.repo, { revision: spec.revision, dtype, device, progress_callback: progress }),
    ]).then(([tokenizer, model]) => ({ tokenizer, model }));
    loaded.catch(() => (loaded = undefined)); // a failed download can be tried again; finished files are kept
    return loaded;
  };

  return {
    label: `${spec.label} (${device === 'webgpu' ? 'WebGPU' : 'CPU'})`,
    picksFiles: false,
    load: async (onProgress) => void (await load(onProgress)),
    generate: (system, turns, { choices, maxTokens, temperature, onText, signal }) =>
      serialized(async () => {
        const { tokenizer, model } = await load();
        const inputs = tokenizer.apply_chat_template([{ role: 'system', content: system }, ...turns], {
          add_generation_prompt: true,
          return_dict: true,
        });
        const input = inputs.input_ids.dims[1];
        if (input > spec.window) throw new Error(`Prompt is too long: ${input} tokens, over the ${spec.window} this model gets here`);

        let raw = '';
        let first = 0;
        const streamer = new TextStreamer(tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (chunk: string) => {
            first ||= performance.now();
            raw += chunk;
            onText?.(visible(raw));
          },
        });
        const stopper = new InterruptableStoppingCriteria();
        const onAbort = () => stopper.interrupt();
        signal?.addEventListener('abort', onAbort, { once: true });
        // Picking files is a lookup, so it is greedy; the answer follows the temperature setting.
        const sample = !choices && temperature > 0;
        try {
          await model.generate({
            ...inputs,
            max_new_tokens: maxTokens,
            do_sample: sample,
            ...(sample && { temperature, top_p: 0.9, top_k: 40 }),
            streamer,
            stopping_criteria: [stopper],
          });
        } finally {
          signal?.removeEventListener('abort', onAbort);
        }
        if (signal?.aborted) throw new Error('Request was aborted');
        return { text: visible(raw).trim(), input, output: tokenizer.encode(raw).length, window: spec.window, ms: first ? performance.now() - first : 0 };
      }),
  };
}
