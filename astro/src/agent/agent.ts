// The agent: a pi-durable harness whose every turn is kept in IndexedDB, one tool (`cat` over the site's files),
// and a pi-ai provider that answers with whichever on-device model the page has (see builtin.ts and local.ts).
// Reload the tab mid-answer and pi picks the run up again from storage.
import { BACKGROUND_CONTEXT as ctx } from '@earendil-works/chord/context';
import { createModels, createProvider } from '@earendil-works/pi-ai/models';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai/utils/event-stream';
import { createRegistry, defineExtension, defineTool, Harness } from '@earendil-works/pi-durable';
import { IndexedDbStorage } from '@earendil-works/pi-durable/storage/indexeddb';
import type { Backend, Generation } from './models.ts';
import { type AgentFile, answerMessages, decideMessages, parseTurn, pickPaths, search, SYSTEM } from './route.ts';

const DB = 'dontpanicv-agent';
const PROVIDER = 'device';
const MODEL_ID = 'on-device';
const API = 'on-device';
// Low, so answers stay close to the files. The browser's built-in model ignores it: pages can't set its sampling.
const TEMPERATURE = 0.2;

/** Set by the page: the files, and a listener for what each generation cost. */
export const agent = {
  files: [] as AgentFile[],
  onGeneration: (_: Generation & { label: string }) => {},
};

// The provider waits here until the page has a model; a run resumed after a reload waits the same way.
let backend: Backend | undefined;
let waiting: ((b: Backend) => void)[] = [];
export function setBackend(next: Backend) {
  backend = next;
  for (const resolve of waiting) resolve(next);
  waiting = [];
}
const currentBackend = () => (backend ? Promise.resolve(backend) : new Promise<Backend>((resolve) => waiting.push(resolve)));

const cat = defineTool({
  name: 'cat',
  description: 'Read one file about V.',
  // `by` is not used by the tool: it records whether the model or the keyword search chose the file.
  parameters: { type: 'object', properties: { path: { type: 'string' }, by: { type: 'string' } }, required: ['path'] },
  replay: 'safe',
  execute: async ({ path }: { path: string }) => {
    const file = agent.files.find((f) => f.path === path);
    if (!file) throw new Error(`cat: ${path}: No such file or directory`);
    return { output: [{ type: 'text', text: file.text }] };
  },
});

function stream(model: any, context: any, options: any) {
  const out = createAssistantMessageEventStream();
  const message: any = {
    role: 'assistant',
    content: [],
    api: API,
    provider: PROVIDER,
    model: model.id,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: 'pending',
    timestamp: Date.now(),
  };
  const finish = (reason: 'stop' | 'toolUse') => {
    message.usage.totalTokens = message.usage.input + message.usage.output;
    message.stopReason = reason;
    out.push({ type: 'done', reason, message });
    out.end(message);
  };

  (async () => {
    const signal: AbortSignal | undefined = options?.signal;
    const llm = await currentBackend();
    const generate = async (turns: any, extra: any) => {
      const result = await llm.generate(SYSTEM, turns, { temperature: TEMPERATURE, signal, ...extra });
      message.usage.input = result.input;
      message.usage.output += result.output;
      agent.onGeneration({ ...result, label: llm.label });
      return result;
    };
    const turn = parseTurn(context.messages);
    out.push({ type: 'start', partial: message });

    // Step 1, once per question: choose the files, which become tool calls. A model that can't choose, or names
    // nothing, gets them from the keyword search; `by` records who chose, for the trace.
    if (!turn.decided) {
      const paths = agent.files.map((f) => f.path);
      const named = llm.picksFiles ? pickPaths((await generate(decideMessages(turn, agent.files), { choices: paths, maxTokens: 32 })).text, paths) : [];
      const by = named.length ? 'model' : 'search';
      for (const path of named.length ? named : search(turn.question, agent.files)) {
        const block = { type: 'toolCall', id: `call_${crypto.randomUUID()}`, name: cat.name, arguments: { path, by } };
        const index = message.content.push(block) - 1;
        out.push({ type: 'toolcall_start', contentIndex: index, partial: message });
        out.push({ type: 'toolcall_delta', contentIndex: index, delta: JSON.stringify(block.arguments), partial: message });
        out.push({ type: 'toolcall_end', contentIndex: index, toolCall: block, partial: message });
      }
      if (message.content.length) return finish('toolUse');
    }

    // Step 2: the answer, streamed.
    const block = { type: 'text', text: '' };
    message.content.push(block);
    out.push({ type: 'text_start', contentIndex: 0, partial: message });
    const { text } = await generate(answerMessages(turn), {
      maxTokens: 320,
      onText: (shown: string) => {
        // An empty delta makes pi diff the partial, which also covers text that got shorter.
        const delta = shown.startsWith(block.text) ? shown.slice(block.text.length) : '';
        block.text = shown;
        out.push({ type: 'text_delta', contentIndex: 0, delta, partial: message });
      },
    });
    block.text = text;
    out.push({ type: 'text_end', contentIndex: 0, content: text, partial: message });
    finish('stop');
  })().catch((error) => {
    console.error(error);
    const reason = options?.signal?.aborted ? 'aborted' : 'error';
    const failed = { ...message, stopReason: reason, errorMessage: error?.message ?? String(error) };
    out.push({ type: 'error', reason, error: failed });
    out.end(failed);
  });
  return out;
}

const provider = createProvider({
  id: PROVIDER,
  name: 'On this device',
  auth: { apiKey: { name: 'None', resolve: async () => ({ auth: {} }) } },
  models: [
    {
      id: MODEL_ID,
      name: 'On-device model',
      api: API,
      provider: PROVIDER,
      baseUrl: location.origin,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      // Prompts are rebuilt per question from a few files and the last exchanges (route.ts), so they stay far
      // below this and pi never has to compact with a tiny model.
      contextWindow: 32_768,
      maxTokens: 320,
    },
  ],
  api: { stream, streamSimple: stream },
});

export type View = { entries: any[]; docs: Record<string, any> };

/**
 * Opens the stored run and keeps `render` fed. Resolves to `send`, or to undefined when another tab owns the run
 * (one owner per database, or two tabs would corrupt the session).
 */
export function openAgent(render: (view: View) => void): Promise<((text: string) => Promise<unknown>) | undefined> {
  return new Promise((resolve, reject) => {
    navigator.locks
      .request(DB, { ifAvailable: true }, async (lock) => {
        if (!lock) return resolve(undefined);
        const models = createModels();
        models.setProvider(provider);
        const registry = createRegistry();
        registry.install(defineExtension({ name: 'site-files', tools: [cat] }));
        const now = generation();
        if (now > 0) IndexedDbStorage.delete(dbName(now - 1)).catch(() => {}); // the forgotten one, if it is still there
        const storage = await IndexedDbStorage.open(dbName(now));
        const harness = await Harness.open(storage, { models, registry }, ctx);
        // Files are chosen once per question, so a run is two steps; maxTurns is only a backstop.
        const root = await harness.root(ctx, { agent: { model: { provider: PROVIDER, modelId: MODEL_ID }, maxTurns: 4 } });
        harness.resume(); // continues a run that a reload or crash interrupted
        const watch = await root.watch(ctx);
        const safe = (view: View) => {
          try {
            render(view);
          } catch (error) {
            console.error('render failed', error); // a throwing listener would end pi's watch
          }
        };
        safe(watch.value);
        watch.start(async (call: any) => {
          if (call.kind === 'value') safe(call.value);
        });
        resolve((text) => root.submit({ type: 'input', content: text }, ctx));
        await new Promise(() => {}); // hold the lock for the page's lifetime
      })
      .catch(reject);
  });
}

// Each conversation has its own database, named by a counter in localStorage. Forgetting moves on to the next one
// instead of waiting for a delete: deleting waits for every open connection, and a page that is being torn down can
// hold one long enough for the conversation to come back after the reload.
const GENERATION = 'agent.generation';
function generation() {
  try {
    return Number(localStorage.getItem(GENERATION)) || 0;
  } catch {
    return 0; // storage blocked: one database, deleted the slow way
  }
}
const dbName = (n: number) => `${DB}-${n}`;

/** Forgets the stored conversation. Reload the page afterwards. */
export async function forgetRun() {
  const now = generation();
  try {
    localStorage.setItem(GENERATION, String(now + 1));
  } catch {
    await IndexedDbStorage.delete(dbName(now));
  }
}
