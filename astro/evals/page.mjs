// The homepage end to end in a real Chrome: offers the download, loads the model, answers from a file, and the run
// survives a reload (pi-durable + IndexedDB).
//
//   npm run dev                (in another terminal)
//   node evals/page.mjs        (same PROFILE and CHROME variables as evals/models.mjs)
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = process.env.PROFILE ?? join(tmpdir(), 'dontpanicv-agent-eval');
const SITE = process.env.SITE ?? 'http://localhost:4321/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !process.env.HEADFUL,
  userDataDir: PROFILE,
  protocolTimeout: 900_000,
  defaultViewport: { width: 1440, height: 900 },
  args: ['--enable-unsafe-webgpu'],
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  if (process.env.REQUESTS) page.on('request', (r) => /wasm|\.mjs|huggingface|jsdelivr/.test(r.url()) && console.log('  →', r.url().slice(0, 140)));
  const text = (sel) => page.$eval(sel, (el) => el.textContent.trim());
  const steps = () => page.$$eval('#followups > .step', (els) => els.map((el) => el.textContent.replace(/\s+/g, ' ').trim()));

  // A clean start: no chosen model, and the conversation forgotten the way a visitor does it.
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.getElementById('asknote').textContent.startsWith('Looking'), { timeout: 60_000 });
  await page.evaluate(() => localStorage.removeItem('agent.model'));
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.$eval('#newrun', (b) => b.click())]);

  // No built-in model in this profile, so the bar under the headline asks before downloading.
  await page.waitForSelector('#modelbar:not([hidden]) .opts button', { timeout: 30_000 });
  console.log('bar:', await text('#modelbar p'), '|', await page.$$eval('#modelbar .opts button', (b) => b.map((x) => x.textContent)));
  assert.equal(await page.$eval('#q', (el) => el.disabled), true, 'the prompt is off until there is a model');
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-bar.png` });

  const download = await page.evaluateHandle(() => [...document.querySelectorAll('#modelbar .opts button')].find((b) => /Granite/.test(b.textContent)));
  await download.click();
  await page.waitForFunction(() => !document.getElementById('q').disabled, { timeout: 600_000, polling: 500 });
  console.log('model:', await text('[data-model-name]'), '|', await text('#asknote'));

  await page.type('#q', 'Where did V work before Meiro?');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-run-status]').textContent === 'running', { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('[data-run-status]').textContent === 'idle', { timeout: 120_000 });
  const first = await steps();
  console.log(first.join('\n'));
  assert.equal(first.length, 3, 'question, file, answer');
  assert.match(first[1], /cat cv\.md/);
  assert.match(first[2], /Keboola/);
  console.log('context:', await text('#pct'), await text('#tok'), '/', await text('#lim'), await text('#speed'));
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-answer.png` });

  // Reload in the middle of an answer: the run is in IndexedDB and continues, with the model back from the cache.
  await page.type('#q', 'What is Mycroft?');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-run-status]').textContent === 'running', { timeout: 30_000 });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#followups > .step').length >= 6 && document.querySelector('[data-run-status]').textContent === 'idle', { timeout: 180_000, polling: 500 });
  const second = await steps();
  console.log(second.slice(3).join('\n'));
  assert.equal(second.length, 6, 'both exchanges are there after the reload');
  assert.deepEqual(second.slice(0, 3), first, 'the first exchange came back unchanged');
  assert.match(second[5], /iPhone|phone/i);
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-reload.png`, fullPage: true });

  assert.deepEqual(errors, [], 'no errors in the page');
  console.log('\npage: ok');
} finally {
  if (errors.length) console.error('page errors:', errors);
  await browser.close();
}
