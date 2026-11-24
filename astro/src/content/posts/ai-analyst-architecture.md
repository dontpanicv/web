---
title: "Beyond the Tool-Calling Loop: How We Built an AI Analyst with Bash, a Mounted Filesystem, and a JSON Renderer"
date: 2026-04-29
status: published
tags:
  - ai
  - agents
  - architecture
  - analytics
  - typescript
summary: "Why the naive AI SDK + tools + markdown loop runs out of room for analytical agents — and the bash + mounted filesystem + JSON renderer architecture that replaced it."
---

Most AI features built today follow the same recipe: take the Vercel AI SDK, register a handful
of tools, write a system prompt, and stream the result into a markdown component. It works. It is
also where most teams stop — and where most AI products start to feel limited.

This article walks through the architecture we ended up with for the **AI Analyst** in Engage,
and contrasts it with the more conventional **Piper chatbot** that lives next door in the same
codebase. Both ship in the same product. They are wildly different inside.

We will start from the naive baseline, identify the two failure modes that pushed us off it
(noisy tool results and metadata bloat), and then introduce the three ideas that replaced them:
**just-bash with an in-memory filesystem**, a **SQL execution layer that mounts results as files**,
and a **JSON renderer with a predefined component manifest**.


## 1. The naive architecture: AI SDK + tools + markdown

The Piper chatbot is the textbook implementation. The server side is essentially a single call:

```ts
const stream = await streamText({
  model: google(CHAT_MODEL),
  system: buildSystemPrompt({ baseUrl, disabledFeatureIds }),
  tools: assistantTools,
  messages: modelMessages,
  stopWhen: stepCountIs(20),
});

return stream.toUIMessageStreamResponse();
```

Each tool is a small object with a Zod schema and an `execute` function:

```ts
const get_dashboard = tool({
  description: 'Fetch workspace health metrics: sources, pipes, destinations.',
  inputSchema: z.object({}),
  execute: async () => fetchDashboard(),
});
```

The frontend is just as simple. Messages stream in, tool calls render as collapsible cards, text
content goes through `react-markdown` with GFM and syntax highlighting. The model writes prose,
the user reads prose.

This works great for *operational* assistants — "create an audience", "show me the last failed
delivery", "explain what this attribute does". The conversation is short, each tool returns a
small, well-shaped object, and the markdown is the answer.

It stops working the moment the model needs to **think with data**.


## 2. Problem one: tool results that flood the context

The first wall you hit is large tool outputs. Imagine a tool that runs a SQL query against the
warehouse:

```ts
const run_query = tool({
  description: 'Run a SQL query against the warehouse.',
  inputSchema: z.object({ sql: z.string() }),
  execute: async ({ sql }) => {
    const { columns, rows } = await warehouse.execute(sql);
    return { columns, rows }; // <-- 50,000 rows of JSON
  },
});
```

Whatever the tool returns goes straight into the model's context as the tool result message.
A query that returns 50k rows is now 50k rows of JSON sitting in the conversation, on every
subsequent turn, paid for in tokens, and pushing earlier reasoning out of the window.

You can paginate. You can truncate. You can summarize. All of these are coping mechanisms — they
either lose information or force the model to make decisions about data it cannot see.

The fundamental problem is that **tool results are a terrible place to put data**. Tool results
are great for *facts the model needs to reason about next*. They are awful for *bulk data the
model needs to slice, group, count, and chart*.


## 3. Problem two: metadata bloat from inventory tools

The second wall is subtler and arrives earlier. To answer almost any analytical question in
Engage, the model needs to know what exists: which event types are tracked, which attributes
are defined, how identity resolution is configured, which audiences and journeys are running,
which warehouse tables are connected.

The naive way to expose this is one tool per entity kind:

```ts
list_event_types();        // returns ~80 event types with schemas
list_attributes();         // returns ~200 attribute definitions
list_audiences();          // returns ~40 audiences with rules
list_identity_resolution(); // returns stitching rules
list_channels();
list_journeys();
list_warehouse_tables();
```

Each call returns a verbose list. The model, being agreeable, calls all of them at the start of
every conversation "to orient itself". Before the user's question is even processed, tens of
thousands of tokens of metadata are sitting in context — most of it irrelevant to whatever
question was actually asked.

The model also can't *search* this metadata efficiently. It has to read every entry, in order,
hoping to find the one attribute named `last_purchase_at`. There is no `grep`.


## 4. The first idea: just-bash with an in-memory filesystem

Here is where the Analyst architecture diverges. Instead of giving the model a dozen
inventory tools, we give it **one tool — `bash` — and a filesystem with the inventory already
written to disk**.

We use [`just-bash`](https://www.npmjs.com/package/just-bash), which exposes a real shell against
an in-memory FS. Each user gets an isolated workspace, persisted across turns:

```ts
import { Bash } from 'just-bash';

const workspace = new Bash();

await workspace.writeFile('/context/inventory.json', JSON.stringify(inventory));
await workspace.writeFile('/context/instructions.md', customInstructions);
await workspace.writeFile('/context/managed-table-schemas.md', schemaDocs);
```

The system prompt then tells the model where to look:

```text
You are the Engage Analyst.

Use the scratchpad_exec tool to run bash commands against your filesystem:
  /context/inventory.json         — event types, audiences, attributes, journeys
  /context/managed-table-schemas.md — warehouse table schemas and dialect notes
  /data                           — query results land here
  /notes                          — your own working notes
```

And the only tool the model needs for orientation is:

```ts
const scratchpad_exec = tool({
  description: 'Run a bash command in your scratchpad.',
  inputSchema: z.object({ command: z.string() }),
  execute: async ({ command }) => workspace.run(command),
});
```

Suddenly the model behaves like an analyst at a terminal:

```bash
jq '.attributes[] | select(.name | test("purchase"))' /context/inventory.json
grep -l "events_ecommerce" /context/managed-table-schemas.md
ls /data
```

Three things change at once. First, **only the relevant slice of metadata enters the context** —
the model `grep`s for what it needs instead of dumping the catalog. Second, **the model can
take notes** in `/notes` that survive across turns without re-occupying the context window.
Third, the toolset shrinks dramatically: one bash tool replaces a sprawl of `list_*` tools, and
the model already knows how to use it.


## 5. The second idea: SQL results as mounted files

The same insight applies to query results. Instead of returning rows, the SQL tool **writes them
to a file and returns the path**:

```ts
const run_managed_warehouse_query = tool({
  description: 'Execute a SQL query. Result is written to /data as JSON.',
  inputSchema: z.object({ sql: z.string() }),
  execute: async ({ sql }) => {
    const { columns, rows } = await executeDataWarehouseQuery(sql);

    const path = `/data/query-${Date.now()}.json`;
    await workspace.writeFile(path, JSON.stringify({ columns, rows }));

    return {
      path,
      rowCount: rows.length,
      columns,
      sample: rows.slice(0, 5),
    };
  },
});
```

The model gets back what it needs to *reason* — the row count, the column list, a five-row
sample — without the context being polluted by the full result set. If it needs to look closer,
it has bash:

```bash
jq '.rows | group_by(.country) | map({country: .[0].country, n: length})' /data/query-1714400000.json
head -100 /data/query-1714400000.json
wc -l /data/query-1714400000.json
```

A 50,000-row query and a 50-row query now cost the same in tokens. The data is *available* to
the agent without being *in* the agent. This is the single highest-leverage change in the whole
architecture.

It also unlocks multi-step analysis. The model can run a wide query, save it, then run smaller
`jq` slices over it across multiple turns. Each slice is cheap; the underlying data never has
to be re-fetched or re-included.


## 6. The third idea: a JSON renderer with a component manifest

So far we have solved input. Output is the other half. If the model only writes markdown, the
best it can do is paste a table of numbers — and now it has to either re-include the data in its
context to write that table, or hallucinate it.

The fix is symmetrical to the SQL one: **let the model emit a declarative spec, and render
predefined components on the frontend with data passed by reference**.

We expose a fixed catalog of components to the model in the system prompt:

```text
Available components:
  AnalystReport, Narrative, MetricGrid, MetricCard,
  TimeSeriesChart, LineChart, BarChart, StackedBarChart,
  DataTable, FunnelChart, InsightList, EntityLinkList,
  QueryCitation, SuggestedQuestions
```

The model emits a fenced ` ```spec ` block containing JSON Patch operations that build up the
report. The crucial trick is that data props are not inlined — they are **bound by file
reference**:

````text
```spec
[
  { "op": "add", "path": "/components/0", "value": {
      "type": "MetricCard",
      "label": "Active customers (30d)",
      "value": 18432
  }},
  { "op": "add", "path": "/components/1", "value": {
      "type": "BarChart",
      "title": "Purchases by country",
      "data": { "$state": "/state/purchases-by-country.json" }
  }}
]
```
````

Before emitting the chart, the model writes the chart-ready rows into `/state/`:

```bash
jq '.rows | group_by(.country) | map({label: .[0].country, value: length})' \
   /data/query-1714400000.json > /state/purchases-by-country.json
```

The server streams the spec to the client via a side channel (`pipeJsonRender`), the client
resolves `$state` references against the workspace, and a small renderer maps each `type` to a
React component:

```tsx
const REGISTRY = {
  MetricCard,
  BarChart,
  TimeSeriesChart,
  DataTable,
  // ...
};

function renderComponent(spec: ComponentSpec, state: StateMap) {
  const Component = REGISTRY[spec.type];
  const props = resolveStateRefs(spec, state);
  return <Component {...props} />;
}
```

Three properties fall out of this design. The model never has to hold chart data in context to
"render" it — it just points at a file. The visual vocabulary is fixed, so the output is
consistent and on-brand instead of a wall of ad-hoc markdown tables. And because the spec is
declarative JSON Patch, the report can be **built up incrementally** across turns: the model
adds a metric card, then a chart, then a narrative, without rewriting the whole thing.


## 7. What this buys us

The shift from naive tool-calling to bash + mounted FS + JSON renderer is not a refactor — it is
a different model of what an AI agent is. The naive agent is a function that maps prompts to
prose. The Analyst is closer to **a junior analyst at a terminal with a notebook and a chart
library**.

Concretely:

- **Context stays small.** Inventory and query results live on disk. The model pulls in only
  what it `grep`s, `jq`s, or samples. Long sessions stay coherent because the window is not
  flooded by tool exhaust.
- **Fewer tools, more capability.** One `bash` tool plus one `sql` tool replace dozens of
  bespoke `list_*` and `get_*` tools. The model already knows shell idioms; we do not have to
  teach it a custom API surface.
- **Data and reasoning are decoupled.** The model reasons about *shapes and samples*; the data
  itself never leaves the file system except to render. A 50k-row query and a 50-row query cost
  the same in tokens.
- **Output is structured by construction.** A fixed component manifest means the UI is
  predictable, branded, and interactive — instead of a markdown table the user cannot click on.
- **State is persistent.** The scratchpad survives across turns. Notes, intermediate query
  results, and partially-built reports are all just files. The model can resume work without
  rebuilding context.
- **The agent is observable.** Every command, every file written, every spec emitted is a
  discrete artifact in the workspace. Debugging an agent run is closer to reading a shell
  history than reverse-engineering a prompt.

The conventional architecture is not wrong — for the chatbot, it is genuinely the right tool.
A short, operational dialogue does not need a filesystem. But the moment your agent has to *do
analysis* — touch real data, build something visual, reason across multiple steps — the naive
loop runs out of room very fast.

The lesson we keep coming back to is small and almost embarrassing in retrospect: **most of what
we were stuffing into the context window did not belong there**. Inventory belongs on disk.
Query results belong on disk. Chart data belongs on disk. The context window is for *reasoning*,
not *storage*. Once you accept that, the rest of the architecture — bash, mounted SQL,
referenced renderer state — is just the obvious shape of the solution.
