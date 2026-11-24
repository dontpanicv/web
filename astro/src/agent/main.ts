// The page side of the live agent: find a model on this device (or ask before downloading one), then render the
// durable run as trace steps under the recorded one.
import { agent, forgetRun, openAgent, setBackend, type View } from './agent.ts';
import { builtinBackend, builtinLabel, builtinStatus, type BuiltinStatus } from './builtin.ts';
import { type Backend, cached, dtypeFor, type Gpu, MODEL, probeGpu } from './models.ts';
import { SYSTEM } from './route.ts';

type Choice = 'builtin' | 'local';
const CHOICE = 'agent.model';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
// Storage can be blocked (private windows); the page then simply forgets between visits.
const saved = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
const mb = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

let gpu: Gpu = { webgpu: false, f16: false };
let builtin: BuiltinStatus = 'unsupported';
let current: Backend | undefined;
let send: ((text: string) => Promise<unknown>) | undefined;
let ownsRun = true;

/* ---------- model: header, rail, and the bar at the top ---------- */

const fill = (attribute: string, text: string) => document.querySelectorAll(`[${attribute}]`).forEach((node) => (node.textContent = text));
const showModel = (label: string) => fill('data-model-name', label);

function refreshForm(note?: string) {
  const ready = Boolean(current && send);
  $<HTMLInputElement>('q').disabled = !ready;
  $<HTMLButtonElement>('send').disabled = !ready;
  const box = $('asknote');
  if (note) return void (box.textContent = note);
  if (!ownsRun) return void (box.textContent = 'This conversation is open in another tab. Close that one, then reload this page.');
  if (ready) return void (box.textContent = ''); // the rail says which model and where it runs
  const pick = el('button', 'btn quiet', 'Choose a model');
  pick.type = 'button';
  pick.addEventListener('click', () => showBar(false));
  box.replaceChildren('No model is loaded, so the agent is asleep. ', pick);
}

function adopt(backend: Backend) {
  current = backend;
  setBackend(backend);
  showModel(backend.label);
  $('modelbar').hidden = true;
  document.documentElement.classList.add('agent-ready'); // the example questions, and on a phone the instruments, show from here on
  refreshForm();
}

async function make(choice: Choice): Promise<Backend> {
  if (choice === 'builtin') return builtinBackend(SYSTEM);
  const { localBackend } = await import('./local.ts'); // transformers.js, loaded only now
  return localBackend(MODEL, dtypeFor(gpu), gpu);
}

/** The bar at the top: asks before anything is downloaded. `first` is the automatic showing when nothing is on the device. */
async function showBar(first: boolean) {
  const bar = $('modelbar');
  const opts = el('div', 'opts');
  const progress = el('progress');
  progress.hidden = true;
  progress.max = 1;
  const state = el('p', 'state');
  state.setAttribute('role', 'status');

  const start = async (choice: Choice, downloading: boolean) => {
    for (const b of opts.querySelectorAll('button')) b.disabled = true;
    state.className = 'state';
    state.textContent = downloading ? 'Starting the download…' : 'Loading the model…';
    progress.hidden = !downloading;
    progress.value = 0;
    if (downloading) navigator.storage?.persist?.(); // ask the browser not to evict the model when space runs low
    try {
      const backend = await make(choice);
      await backend.load((fraction) => {
        progress.value = fraction;
        state.textContent = fraction < 1 ? `Downloading… ${Math.round(fraction * 100)}%` : 'Preparing the model on your device…';
      });
      save(CHOICE, choice);
      adopt(backend);
    } catch (error: any) {
      console.error(error);
      state.className = 'state bad';
      state.textContent = `That did not work: ${error?.message ?? error}. Finished files are kept, so you can try again.`;
      progress.hidden = true;
      for (const b of opts.querySelectorAll('button')) b.disabled = false;
    }
  };
  const option = (title: string, detail: string, onClick: () => void, primary = false) => {
    const b = el('button', primary ? 'btn primary' : 'btn');
    b.type = 'button';
    b.append(title, el('small', '', detail));
    b.addEventListener('click', onClick);
    opts.append(b);
  };

  if (builtin === 'available') {
    option(builtinLabel(), 'already on this device · no download', () => start('builtin', false), true);
  } else if (builtin === 'downloadable' || builtin === 'downloading') {
    option(builtinLabel(), 'your browser downloads it once, several GB, for all sites', () => start('builtin', true));
  }
  const dtype = dtypeFor(gpu);
  const have = await cached(MODEL, dtype);
  option(
    have ? MODEL.label : `Download ${MODEL.label}`,
    have ? 'already downloaded to this browser' : `${mb(MODEL.bytes[dtype])} download${gpu.webgpu ? '' : ' · slow here: no WebGPU, runs on the CPU'}`,
    () => start('local', !have),
    builtin !== 'available',
  );
  const later = el('button', 'btn quiet', first ? 'Not now' : 'Close');
  later.type = 'button';
  later.addEventListener('click', () => (bar.hidden = true));
  opts.append(later);

  bar.replaceChildren(
    ...(first ? [] : [el('h2', '', 'Choose a model')]),
    el(
      'p',
      '',
      first
        ? 'Want to ask your own question? A small language model can run on your device. It is a one-time download, and nothing you type leaves this browser.'
        : 'The agent on this page runs on your own device, not on a server. A downloaded model is stored in this browser, and nothing you type leaves it.',
    ),
    opts,
    progress,
    state,
  );
  bar.hidden = false;
  if (!first) bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function findModel() {
  [gpu, builtin] = await Promise.all([probeGpu(), builtinStatus()]);
  const choice = saved(CHOICE) as Choice | null;
  // A model the visitor downloaded earlier wins, as long as the browser still has it.
  if (choice === 'local' && (await cached(MODEL, dtypeFor(gpu)))) {
    showModel(`${MODEL.label} (loading…)`);
    refreshForm('Loading the model you downloaded earlier…');
    try {
      const backend = await make('local');
      await backend.load();
      return adopt(backend);
    } catch (error) {
      console.error(error);
    }
  }
  if (builtin === 'available') return adopt(builtinBackend(SYSTEM)); // created on first use
  showModel('none');
  refreshForm();
  showBar(true);
}

/* ---------- the run ---------- */

const textOf = (content: any): string =>
  typeof content === 'string'
    ? content
    : content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
const opened = new Set<string>(); // file results the visitor expanded survive re-renders

function step(cls: string, ...children: Node[]) {
  const s = el('section', `step done ${cls}`);
  s.append(...children);
  return s;
}

function toolStep(toolCall: any, result?: { text: string; failed: boolean }) {
  const id: string = toolCall.id;
  const card = el('details', 'tool');
  const summary = el('summary');
  const call = el('span', 'call');
  call.append(el('span', 'hl', 'cat'), el('span', 'arg', ` ${toolCall.arguments?.path}`));
  const chosen = toolCall.arguments?.by === 'model' ? 'chosen by the model' : 'found by keyword search';
  const meta = result
    ? result.failed
      ? 'failed'
      : `${new TextEncoder().encode(result.text).length.toLocaleString('en-US')} bytes · ${chosen}`
    : 'running…';
  summary.append(el('i', 'spin'), call, el('span', 'meta', meta), el('i', 'chev'));
  card.append(summary);
  if (result) {
    const body = el('div', 'result');
    body.append(el('pre', 'filetext', result.text));
    card.append(body);
  }
  card.open = opened.has(id);
  card.addEventListener('toggle', () => (card.open ? opened.add(id) : opened.delete(id)));
  const s = step(result ? '' : 'running', card);
  if (!result) s.classList.remove('done');
  return s;
}

function answerStep(text: string, kind: string, cls = '') {
  const body = el('div', `answer ${cls}`);
  for (const para of text.split(/\n{2,}/)) body.append(el('p', '', para));
  return step('final', el('p', 'kind', kind), body);
}

function render(view: View) {
  const log = $('followups');
  const wasEmpty = !log.childElementCount;
  const out: HTMLElement[] = [];
  const results = new Map<string, any>();
  for (const e of view.entries) if (e.kind === 'pi.tool-result') results.set(e.model[0].toolCallId, e.model[0]);
  for (const e of view.entries) {
    const m = e.model?.[0];
    if (e.kind === 'pi.user') {
      out.push(step('user', el('p', 'kind', 'User'), el('p', 'fu-user', textOf(m.content))));
    } else if (e.kind === 'pi.assistant') {
      for (const call of m.content.filter((b: any) => b.type === 'toolCall')) {
        const r = results.get(call.id);
        out.push(toolStep(call, r && { text: textOf(r.content), failed: Boolean(r.isError) }));
      }
      const text = textOf(m.content).trim();
      const usage = m.usage?.totalTokens ? ` · ${m.usage.totalTokens.toLocaleString('en-US')} tokens` : '';
      if (text) out.push(answerStep(text, `Answer${usage}`));
      if (m.stopReason === 'error' || m.stopReason === 'aborted') out.push(answerStep(m.errorMessage ?? m.stopReason, 'Error', 'err'));
    }
  }
  const live = view.docs['pi.live'] ?? {};
  const partial = live.generation?.message;
  const partialText = partial ? textOf(partial.content) : '';
  if (partialText) out.push(answerStep(partialText, 'Answer', 'live'));
  else if (live.run && !(live.tools ?? []).some((t: any) => t.status !== 'done')) {
    out.push(answerStep(current ? '' : 'Waiting for a model…', current ? 'Thinking' : 'Paused', 'live'));
  }
  if (live.runFailure) out.push(answerStep(`Run ended: ${live.runFailure.reason ?? live.runFailure.kind ?? ''} ${live.runFailure.detail ?? ''}`, 'Error', 'err'));

  log.replaceChildren(...out);
  // After the first question the prompt box is for the next one: no headline question to fall back on.
  const q = $<HTMLTextAreaElement>('q');
  if (out.length && q.dataset.default) {
    q.placeholder = q.dataset.next ?? '';
    delete q.dataset.default;
  }
  log.setAttribute('aria-busy', String(Boolean(live.run))); // screen readers wait for the finished answer
  fill('data-run-status', live.run ? 'running' : out.length ? 'idle' : '');
  // Follow the answer while it is being written, but don't yank the page on load.
  if (live.run || (wasEmpty && out.length && location.hash === '#ask')) out.at(-1)?.scrollIntoView({ block: 'nearest' });
}

/* ---------- rail: context meter ---------- */

const CELLS = 160;
$('grid').append(...Array.from({ length: CELLS }, () => el('i')));
// The last reading is kept, so the meter is not empty after a reload.
const USAGE = 'agent.usage';
function showUsage({ input, output, window, ms }: { input: number; output: number; window: number; ms: number }) {
  const used = input + output;
  const p = window ? Math.min(1, used / window) : 0;
  const head = Math.round(p * CELLS);
  [...$('grid').children].forEach((c, i) => (c.className = i < head - 1 ? 'f' : i === head - 1 ? 'head' : ''));
  $('pct').textContent = `${Math.round(p * 100)}%`;
  $('tok').textContent = used.toLocaleString('en-US');
  $('lim').textContent = window ? window.toLocaleString('en-US') : '—';
  if (output > 8 && ms > 0) $('speed').textContent = `${Math.round(output / (ms / 1000))} tok/s`;
  ($('ctxbar').firstElementChild as HTMLElement).style.width = `${p * 100}%`;
}
agent.onGeneration = (usage) => {
  showUsage(usage);
  save(USAGE, JSON.stringify(usage));
};
try {
  showUsage(JSON.parse(saved(USAGE) ?? ''));
} catch {} // nothing stored yet

/* ---------- start ---------- */

$('changemodel').addEventListener('click', () => showBar(false));
$('newrun').addEventListener('click', () => {
  save(USAGE, '');
  forgetRun().finally(() => location.reload());
});
$('ask').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>('q');
  const text = input.value.trim() || input.dataset.default || ''; // empty sends the headline question
  if (!text || !send) return;
  input.value = '';
  try {
    await send(text);
  } catch (error: any) {
    console.error(error);
    refreshForm(`Could not send: ${error?.message ?? error}`);
  }
});
// The prompt box is a textarea: Enter sends, Shift+Enter makes a new line.
$('q').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  $<HTMLFormElement>('ask').requestSubmit();
});
for (const chip of document.querySelectorAll<HTMLButtonElement>('.chips [data-q]')) {
  chip.addEventListener('click', () => {
    if ($<HTMLInputElement>('q').disabled) return showBar(false);
    $<HTMLInputElement>('q').value = chip.dataset.q!;
    $<HTMLFormElement>('ask').requestSubmit();
  });
}

async function main() {
  agent.files = await (await fetch('/agent/files.json')).json();
  findModel().catch((error) => (console.error(error), refreshForm(`Could not look for a model: ${error?.message ?? error}`)));
  send = await openAgent(render);
  ownsRun = Boolean(send);
  refreshForm();
}
main().catch((error) => {
  console.error(error);
  refreshForm(`The agent could not start: ${error?.message ?? error}`);
});
