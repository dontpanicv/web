// The small read-only filesystem the on-device agent can `cat`. Built at build time, served as /agent/files.json.
import { contact, drawer, notes, person, projects } from '../data/profile';
import { getAllPosts } from './posts';

/** `about` is what the model sees in the file list and what the keyword search weighs most, so it is rich in the
 *  words a visitor would use. */
export type AgentFile = { path: string; about: string; text: string };

const SITE = 'https://dontpanicv.com';
// Small models have small context windows: an article goes in as its opening, not whole.
const POST_WORDS = 450;

const day = (date: Date) => date.toISOString().slice(0, 10);

export async function agentFiles(): Promise<AgentFile[]> {
  const posts = await getAllPosts();
  const published = posts.filter((p) => p.data.status !== 'draft');

  const files: AgentFile[] = [
    {
      path: 'about.md',
      about: 'who V is: introduction, bio, background, what he does now, where he lives, location, city, country, how he thinks, motto',
      text: [
        `# ${person.name}`,
        `${person.role}. Lives in ${person.place}.`,
        ...person.bio,
        person.longBio,
        `His GitHub bio: "${person.githubBio}"`,
        `His motto: "${person.motto}"`,
      ].join('\n\n'),
    },
    {
      path: 'cv.md',
      about: 'CV, resume: work history, career, experience, jobs, job title, role, position, employers, companies he worked at before, years, education, university, school, where he studied',
      // Full sentences, oldest first: a small model reads a timeline better than a table.
      text: [
        '# CV of V',
        'Education: V studied at VUT FIT, the Faculty of Information Technology of Brno University of Technology.',
        'From 2015 to 2018 V worked at Keboola as Head Nerd and Solutions Architect. He designed data integrations end to end, partly from Bali, Indonesia. Keboola was his job before Meiro.',
        'In 2018 V co-founded Meiro. From 2018 to 2024 he was its CTO and Co-Founder: he owned product architecture, development and implementations of the Meiro CDP (customer data infrastructure, identity resolution, real-time pipelines).',
        'Since 2024 his job title is Head of R&D and Co-Founder at Meiro, in Brno. He does research that has to survive production: local models, agentic workflows, self-learning data analysis tools.',
      ].join('\n\n'),
    },
    {
      path: 'projects.md',
      about: 'projects: overview list of everything he builds, open source, side projects, GitHub repositories, day job, products',
      text: [
        '# Projects of V',
        `V works on ${projects.length} projects: ${projects.map((p) => p.name).join(', ')}. ${projects.filter((p) => p.tag.includes('open source')).map((p) => p.name).join(', ')} are open source on GitHub; Meiro is his company and day job.`,
        ...projects.map((p) => `- ${p.name} (${p.tag.join(', ')}): ${p.lede} ${p.url} (details in projects/${p.id}.md)`),
      ].join('\n'),
    },
    ...projects.map((p) => ({
      path: `projects/${p.id}.md`,
      about: `project ${p.name}: what ${p.name} is and how it works`,
      text: `# ${p.name} (${p.tag.join(', ')})\n\n${p.lede}\n\n${p.text}\n\nLink: ${p.url}`,
    })),
    {
      path: 'writing.md',
      about: 'writing: list of his articles, blog posts, essays, drafts and short notes, what he writes about, topics, dates and summaries',
      text: [
        '# Writing of V',
        ...posts.map((p) =>
          p.data.status === 'draft'
            ? `- (draft, not published) "${p.data.title}": ${p.data.summary ?? ''}`
            : `- ${day(p.data.date)} "${p.data.title}": ${p.data.summary ?? ''} Full text: ${SITE}/posts/${p.slug}/ (file posts/${p.slug}.md)`,
        ),
        ...drawer.map((d) => `- (${d.kind}) "${d.title}": ${d.text}`),
        '## Short notes',
        ...notes.map((n) => `- ${n}`),
      ].join('\n'),
    },
    ...published.map((p) => {
      const words = (p.body ?? '').split(/\s+/);
      return {
        path: `posts/${p.slug}.md`,
        about: `article, post: opening of "${p.data.title}". ${(p.data.tags ?? []).join(', ')}`,
        text: [
          `# ${p.data.title}`,
          `Published ${day(p.data.date)} by V. Summary: ${p.data.summary ?? ''}`,
          words.slice(0, POST_WORDS).join(' '),
          words.length > POST_WORDS
            ? `[${words.length - POST_WORDS} more words not loaded. Full article: ${SITE}/posts/${p.slug}/]`
            : '',
        ].join('\n\n'),
      };
    }),
    {
      path: 'contact.md',
      about: 'contact: how to reach, contact, hire or message V, email address, mail, GitHub, X, Twitter, LinkedIn, social links',
      text: ['# How to contact V', ...contact.map((c) => `His ${c.label} is ${c.text} .`), 'Email is the best way to reach him, and he does answer.'].join('\n'),
    },
    {
      path: 'site.md',
      about: 'how this website, site, page, chat and agent work: model, LLM, on-device, browser, privacy, storage, tools, tech stack',
      text: [
        '# How this site works',
        'dontpanicv.com is a static site (Astro) on Cloudflare. There is no backend and no AI service behind it.',
        "The agent on the homepage runs on the visitor's own device. It prefers a language model that is already built into the browser (Gemini Nano through Chrome's Prompt API). If there is none, it asks before downloading a small open model (IBM Granite 4.0 350M, about 240 MB) and runs it with transformers.js on WebGPU.",
        'The agent loop is pi-durable. Every question, tool call and answer is stored in IndexedDB in this browser, so the run survives a reload or a closed tab. Nothing the visitor types leaves the browser.',
        'The agent has one tool, cat, over a small read-only filesystem of Markdown files about V. The built-in model chooses which files to read; for the small downloaded model a keyword search chooses. Fewer tools, and a filesystem.',
      ].join('\n\n'),
    },
    {
      path: '.towel',
      about: 'towel, 42, the answer, meaning of life, hitchhiker, do not panic',
      text: 'Question: What is the meaning of life, the universe and everything? Answer: 42. Nobody wrote down the question. Also in this file: a towel, present and accounted for. A frood always knows where it is.',
    },
  ];
  return files;
}
