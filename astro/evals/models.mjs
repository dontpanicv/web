// Which downloadable model is good enough? Runs the agent's two steps with real questions in a real Chrome with
// WebGPU: the keyword search chooses the files (as it does for a downloaded model), the model answers. Prints a
// score, speed and every answer.
//
//   npm run dev                       (in another terminal)
//   node evals/models.mjs [name...]   (names from CANDIDATES; none = the model the site ships)
//
// Needs Chrome at its usual path (or CHROME=...). Models are downloaded from Hugging Face into a throwaway profile
// under PROFILE, which is kept between runs so they download once.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = process.env.PROFILE ?? join(tmpdir(), 'dontpanicv-agent-eval');
const SITE = process.env.SITE ?? 'http://localhost:4321/';

// What the shipped model (src/agent/models.ts) was chosen against, smallest first. Last run, 2026-11-23, answers
// right out of 14 with the right file given: smollm2-135m unusable, granite-350m 13, lfm2.5-350m 8.
const q4f16 = (label, repo, mb) => ({ label, repo, revision: 'main', bytes: { q4f16: mb * 1e6, q4: mb * 1e6 }, window: 4096 });
const CANDIDATES = {
  'smollm2-135m': q4f16('SmolLM2 135M', 'HuggingFaceTB/SmolLM2-135M-Instruct', 118),
  'granite-350m': q4f16('Granite 4.0 H 350M', 'onnx-community/granite-4.0-h-350m-ONNX', 238),
  'lfm2.5-350m': q4f16('LFM2.5 350M', 'onnx-community/LFM2.5-350M-ONNX', 255),
  'smollm2-360m': q4f16('SmolLM2 360M', 'HuggingFaceTB/SmolLM2-360M-Instruct', 273),
  'gemma-270m': q4f16('Gemma 3 270M', 'onnx-community/gemma-3-270m-it-ONNX', 273),
};

// question, a file the search must find (a|b: either, '': none), words of which one must be in the answer
const QUESTIONS = [
  ['What is Mycroft?', 'projects/mycroft.md', ['iphone', 'phone']],
  ['Where did V work before Meiro?', 'cv.md', ['keboola']],
  ['What does he write about?', 'writing.md', ['agent', 'ai ']],
  ['How can I contact him?', 'contact.md', ['kurka.vojtech@gmail.com']],
  ['Who is V?', 'about.md', ['meiro']],
  ['Who is V and what is he building?', 'about.md', ['meiro']], // the headline question of the homepage
  ['What is his job title?', 'cv.md|about.md', ['head of r&d']],
  ['What is Golem?', 'projects/golem.md', ['famil']],
  ['Where did he study?', 'cv.md', ['brno university', 'vut']],
  ['How does this page work?', 'site.md', ['device', 'browser']],
  ['What is Shadow?', 'projects/shadow.md', ['slack']],
  ['Where does he live?', 'about.md', ['brno']],
  ['What was his role at Keboola?', 'cv.md', ['head nerd', 'solutions architect']],
  ['Does he have any open source projects?', 'projects.md', ['mycroft', 'golem', 'shadow']],
  ['What is the AI Analyst article about?', 'writing.md|posts/ai-analyst-architecture.md', ['bash', 'filesystem', 'tool']],
  ['What is the meaning of life?', '.towel', ['42']],
  ['hi', '', ['']],
];

const names = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !process.env.HEADFUL,
  userDataDir: PROFILE,
  protocolTimeout: 900_000,
  args: ['--enable-unsafe-webgpu'],
});
try {
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.error('  [page]', m.text().slice(0, 300)));
  await page.goto(SITE, { waitUntil: 'load' });
  for (const name of names.length ? names : ['shipped']) {
    const spec = CANDIDATES[name];
    if (!spec && name !== 'shipped') throw new Error(`unknown candidate ${name}; known: ${Object.keys(CANDIDATES).join(', ')}`);
    const result = await page.evaluate(
      async (spec, questions) => {
        const { MODEL, probeGpu, dtypeFor } = await import('/src/agent/models.ts');
        const { localBackend } = await import('/src/agent/local.ts');
        const route = await import('/src/agent/route.ts');
        spec ??= MODEL;
        const gpu = await probeGpu();
        const dtype = dtypeFor(gpu);
        const files = await (await fetch('/agent/files.json')).json();
        const llm = localBackend(spec, dtype, gpu);
        const t0 = performance.now();
        await llm.load();
        const loadMs = performance.now() - t0;
        const rows = [];
        for (const [question] of questions) {
          const turn = { question, history: [], reads: [], decided: false };
          const picked = route.search(question, files);
          turn.reads = picked.map((p) => ({ path: p, text: files.find((f) => f.path === p).text }));
          const b = performance.now();
          const answer = await llm.generate(route.SYSTEM, route.answerMessages(turn), { maxTokens: 320, temperature: 0 });
          const c = performance.now();
          rows.push({ question, picked, answer: answer.text, input: answer.input, output: answer.output, answerMs: c - b });
        }
        return { label: llm.label, dtype, gpu, loadMs, rows };
      },
      spec ?? null,
      QUESTIONS,
    );
    let routed = 0;
    let right = 0;
    console.log(`\n=== ${result.label} · ${result.dtype} · load ${(result.loadMs / 1000).toFixed(1)} s · gpu ${JSON.stringify(result.gpu)}`);
    result.rows.forEach((r, i) => {
      const [, want, words] = QUESTIONS[i];
      const okRoute = want ? want.split('|').some((w) => r.picked.includes(w)) : !r.picked.length;
      const okAnswer = words.some((w) => r.answer.toLowerCase().includes(w));
      routed += okRoute;
      right += okAnswer;
      const speed = r.output ? Math.round(r.output / (r.answerMs / 1000)) : 0;
      console.log(`\n${okRoute ? '✓' : '✗'}${okAnswer ? '✓' : '✗'} ${r.question}   [${r.picked.join(', ')}; ${Math.round(r.answerMs)} ms, ${r.input} in, ${speed} tok/s]`);
      console.log(`   ${r.answer.replace(/\n+/g, ' ').slice(0, 500)}`);
    });
    console.log(`\n--- ${result.label}: files ${routed}/${QUESTIONS.length}, answers ${right}/${QUESTIONS.length}`);
  }
} finally {
  await browser.close();
}
