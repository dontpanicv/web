// Run: node src/agent/route.test.ts
import assert from 'node:assert/strict';
import { answerMessages, decideMessages, parseTurn, pickPaths, search } from './route.ts';

const paths = ['about.md', 'cv.md', 'projects.md', 'projects/golem.md', 'posts/ai-agents-codebases.md', '.towel'];

assert.deepEqual(pickPaths('["cv.md"]', paths), ['cv.md']);
assert.deepEqual(pickPaths('projects.md, about.md', paths), ['projects.md', 'about.md']); // in the order named
assert.deepEqual(pickPaths('["projects/golem.md"]', paths), ['projects/golem.md']); // not also projects.md
assert.deepEqual(pickPaths('[]', paths), []);
assert.deepEqual(pickPaths('about.md cv.md projects.md', paths), ['about.md', 'cv.md']); // capped
assert.deepEqual(pickPaths('.towel', paths), ['.towel']);

const files = [
  { path: 'about.md', about: 'who V is, where he lives', text: 'V lives in Brno and likes databases.' },
  { path: 'cv.md', about: 'work history, jobs, where he studied', text: 'Meiro, Keboola, Brno University of Technology.' },
  { path: 'projects/golem.md', about: 'project Golem', text: 'A family assistant made from SQLite.' },
  { path: 'contact.md', about: 'contact, email address', text: 'kurka.vojtech@gmail.com' },
];
assert.deepEqual(search('Where did he work before?', files), ['cv.md']); // "work" from "worked"-style stems
assert.deepEqual(search('Where did V study?', files), ['cv.md']); // "study" finds "studied"
assert.deepEqual(search('What is Golem?', files), ['projects/golem.md']);
assert.deepEqual(search('Who is V?', files), ['about.md']); // "who" is a search word, not a stop word
assert.deepEqual(search('his email', files), ['contact.md']);
assert.deepEqual(search('Keboola?', files), ['cv.md']); // only in the text
assert.deepEqual(search('hi', files), []); // a bare greeting reads nothing
assert.deepEqual(search('Hello there!', files), []);
assert.deepEqual(search('hi, what is Golem?', files), ['projects/golem.md']); // a greeting with a question is a question
assert.deepEqual(search('What is his favourite colour?', files), ['about.md']); // nothing matches: the default
assert.deepEqual(search('how to contact him', [...files, { path: 'x.md', about: 'own, control and audit', text: '' }]), ['contact.md']);
assert.equal(answerMessages({ question: 'hi', history: [], reads: [], decided: true }).at(-1)!.content, 'hi');
assert.ok(search('where does he live and where did he study', files).length <= 2);

const text = (t: string) => [{ type: 'text', text: t }];
const transcript = [
  { role: 'system', content: 'ignored' },
  { role: 'user', content: 'hi' },
  { role: 'assistant', content: text('Hello.') },
  { role: 'user', content: 'lost question' }, // never answered: must not break the alternation
  { role: 'user', content: 'Where did he work?' },
  { role: 'assistant', content: [{ type: 'toolCall', id: 'c1', name: 'cat', arguments: { path: 'cv.md' } }] },
  { role: 'toolResult', toolCallId: 'c1', content: text('# CV') },
  { role: 'user', content: ' And projects? ' },
  { role: 'assistant', content: [{ type: 'toolCall', id: 'c2', name: 'cat', arguments: { path: 'projects.md' } }] },
  { role: 'toolResult', toolCallId: 'c2', content: text('# Projects') },
];
const turn = parseTurn(transcript);
assert.equal(turn.question, 'And projects?');
assert.deepEqual(turn.reads, [{ path: 'projects.md', text: '# Projects' }]); // only this question's files
assert.equal(turn.decided, true);
assert.equal(parseTurn(transcript.slice(0, 5)).decided, false);
assert.deepEqual(turn.history, [
  { role: 'user', content: 'hi' },
  { role: 'assistant', content: 'Hello.' },
]);
assert.match(answerMessages(turn).at(-1)!.content, /<file path="projects.md">\n# Projects\n<\/file>/);
assert.match(decideMessages(turn, files).at(-1)!.content, /cv\.md — work history/);
assert.equal(parseTurn([]).question, '');

console.log('route: ok');
