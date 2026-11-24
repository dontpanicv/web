// One source for who V is: the homepage renders it and the on-device agent reads it as files.

export const person = {
  name: 'Vojtěch “V” Kurka',
  role: 'Head of R&D & Co-Founder at Meiro',
  place: 'Brno, Czechia',
  bio: [
    'I like knowing how things work — from CPUs and protocols to databases and containers. Almost ten years of building a data platform in production taught me most of it.',
    "Now I spend that curiosity on AI: local models, agentic workflows, and getting it all into production for real customers. If I can't explain it to someone else, I don't understand it yet.",
  ],
  longBio:
    'I want to understand systems end to end — how CPUs execute instructions, how operating systems, programming languages, databases, containers, proxies, and protocols all fit together. Some of that I picked up out of curiosity, the rest by debugging production. Almost ten years of building and operating Meiro taught me the domains: customer data infrastructure, identity resolution, real-time pipelines, and the edge cases that come with running a CDP for enterprise customers. Right now that means AI — running Qwen locally, building agentic workflows, designing self-learning data analysis tools. I bring these to production, not just demos. I am also the person who ends up explaining everything — to engineers, to customers, on stage when the occasion calls for it.',
  githubBio: 'I write code no one wants to read, but everyone needs to have. Data whatever.',
  motto: 'Teaching is how I verify I actually understand something.',
};

export const projects = [
  {
    id: 'mycroft',
    name: 'Mycroft',
    tag: ['Swift · ★ 41', 'open source'],
    lede: 'A self-modifying, durable agent that lives on your iPhone. Brain on the phone, hands on your machines.',
    text: 'The agent loop, its state and its own source code live on the phone. It edits its own behaviour and its own screen, keeps known-good generations, and rolls back when it gets it wrong. A small daemon called hands gives it files, shell and supervised jobs on macOS and Linux. Named after the Holmes brother who stayed in his armchair.',
    url: 'https://github.com/dontpanicv/mycroft',
  },
  {
    id: 'golem',
    name: 'Golem',
    tag: ['TypeScript', 'open source'],
    lede: 'Family AI assistant and second brain on our own machines. No cloud, no central server.',
    text: 'One server at home, one app for the whole family on the web, iPhone and Android. It remembers what was decided, does real work on your machines, and asks before it sends, buys or deletes. In Prague legend, Rabbi Loew shaped the Golem from clay. This one is made from SQLite and Markdown.',
    url: 'https://github.com/dontpanicv/golem',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    tag: ['TypeScript', 'open source'],
    lede: 'A shadow company for your team.',
    text: 'Every employee gets a shadow: an agent that reads their Slack and mail, keeps track of what each conversation asks of them, and helps do the work when asked. It lives in Slack, stays quiet, and runs on your own server — one SQLite database and a pile of Markdown files.',
    url: 'https://github.com/dontpanicv/shadow',
  },
  {
    id: 'meiro',
    name: 'Meiro',
    tag: ['day job', 'since 2018'],
    lede: 'Customer data infrastructure with AI included — that you own, control and audit.',
    text: 'Pipes moves the data: sources, events, identity, destinations. Engage acts on it: audiences, journeys, campaigns. The AI Analyst sits on top — an analytical agent built on bash, a mounted in-memory filesystem and a JSON renderer instead of a tool-calling loop. Self-hostable.',
    url: 'https://meiro.io',
  },
];

export const cv = [
  {
    when: '2024 — now',
    what: 'Head of R&D & Co-Founder, Meiro',
    text: 'Brno. Research that has to survive production: local models, agentic workflows, self-learning data analysis tools.',
  },
  {
    when: '2018 — 2024',
    what: 'CTO & Co-Founder, Meiro',
    text: 'Owned product architecture, development and implementations of the Meiro CDP. Customer data infrastructure, identity resolution, real-time pipelines.',
  },
  {
    when: '2015 — 2018',
    what: 'Head Nerd / Solutions Architect, Keboola',
    text: 'Designed data integrations end to end, partly from Bali, Indonesia. Yes, “Head Nerd” was the title.',
  },
  { when: 'before', what: 'VUT FIT', text: 'Brno University of Technology, Faculty of Information Technology.' },
];

export const contact = [
  { label: 'email', text: 'kurka.vojtech@gmail.com', url: 'mailto:kurka.vojtech@gmail.com' },
  { label: 'github', text: 'github.com/dontpanicv', url: 'https://github.com/dontpanicv' },
  { label: 'x', text: 'x.com/dontpanicv', url: 'https://x.com/dontpanicv' },
  { label: 'linkedin', text: 'linkedin.com/in/kurkavojtech', url: 'https://www.linkedin.com/in/kurkavojtech/' },
];

/** Not published as posts yet. */
export const drawer = [
  {
    kind: 'idea',
    title: 'Gaslighting Coding Agents for Better Security',
    text: 'Tell an agent, as fact, that a pentester already got RCE — and let it work out how.',
  },
];

export const notes = [
  '“Your AI doesn’t need more tools. It needs fewer tools and a filesystem. Possibly also therapy, but we’re starting with the filesystem.”',
  '“Most ‘AI agents’ shipped in 2026 are a streamText() call in a trench coat.”',
  'Jevons paradox vs Engel’s law: will token spend behave like food spend?',
  '“How you prompt still matters. Human creativity still beats AI. For now.”',
];
