---
title: "Stop Letting AI Agents Guess Where Code Goes"
date: 2026-02-10T12:00:00Z
status: published
translationKey: ai-agents-codebases
tags:
  - ai
  - agents
  - architecture
  - codebase
  - typescript
summary: "A modular-monolith refactor designed for AI agents: predictable module layout, centralized auth, and a strict public.ts boundary that prevents architectural drift."
---

*Co-written with [Adam Sobotka](https://www.linkedin.com/in/adamsobotka/).*

![Modular monolith boundary diagram](/posts/ai-agents-codebases/hero.png)

## **The Insight We Didn't Expect**

We wanted AI coding agents to contribute to our codebase. That goal — more than any clean-code ideal — forced us to confront every structural weakness we'd been living with. The result was a modular monolith that is dramatically easier for humans to work in, precisely because we designed it to be legible to machines.

Here's the irony: the architecture itself was suggested by AI. Our lead developer didn't walk in with a prescription — no "let's do CQRS" or "we need hexagonal architecture." He described the problems: inconsistent auth, tangled concerns, no module ownership, agents writing code in the wrong places. The AI proposed the modular monolith structure, the module layout contract, and the public.ts boundary rule. The humans evaluated, pressure-tested, and refined it — but the initial design came from the same kind of tool we were trying to make productive.

That's a pattern worth paying attention to. We didn't pick an architecture off a shelf and hope agents could work within it. We told the AI what was broken and let it design a structure it could navigate. The result works better for humans too — but it was built from the agent's perspective first.

Here's the thing that's easy to get wrong: agents are actually better than humans at navigating messy code. They'll grep through a tangled codebase, find what they need, and produce something that works. The problem isn't that agents can't operate in ambiguity — it's that they operate in it *too willingly*. A senior engineer hits a messy codebase and pushes back: "this needs to be refactored before I touch it." An agent will happily write working code in the wrong place, match whatever inconsistent patterns it finds, and ship you something that passes tests while making the architecture worse. The danger isn't that agents fail in messy codebases — it's that they succeed in ways that compound the mess.

Explicit boundaries, mechanical rules, and predictable structure don't help agents *function* — they help agents function *correctly*. And when you build for that constraint, you end up with a codebase that onboards new hires faster, produces fewer merge conflicts, and enforces policy consistently — almost as a side effect.

This is the story of how we got there, what the architecture looks like, and the one rule that matters more than all the others.

## **Three Problems, One Root Cause**

We were building a data infrastructure product — Bun, TypeScript, PostgreSQL, single Docker container for local development and Kubernetes in production. The initial codebase was vibe-coded: no architecture document, no module boundaries, no conventions beyond "make it work." We shipped features fast.

Then three things surfaced simultaneously, and they all pointed at the same gap.

Senior engineers joined and named the problems we'd been ignoring. Their feedback was specific and fair: business logic bled across route handlers. Auth was enforced inconsistently — some endpoints used wrapper functions, some checked sessions inline, some forgot entirely. Database queries lived next to HTTP response construction. No one could look at a file and know what it was responsible for. This wasn't nitpicking — it was experienced engineers recognizing patterns they'd seen cause real damage at scale. Their input shaped every structural decision that followed.

Onboarding became a bottleneck. The codebase had no seams. Every feature touched every other feature. Two engineers working on unrelated domains would create merge conflicts because the same files contained unrelated concerns. There was no way to say "you own this, I own that."

Agents couldn't contribute safely. This was the forcing function that made everything urgent. An agent can write code that passes tests, but it cannot intuit where that code belongs in a codebase with no organizational principle. Without explicit boundaries, agents either ask you where to put things (defeating the purpose) or guess wrong (creating architectural drift you clean up by hand).

The senior engineers' critique and the agent constraint pointed to the same fix: the codebase needed explicit, mechanical structure that didn't depend on tribal knowledge to navigate. And as it turned out, when we described these problems to AI, it designed exactly the kind of structure it could work within effectively — a structure that senior engineers also immediately recognized as sound.

## **The Before: What Ambiguity Actually Looks Like**

Abstract descriptions of "messy code" don't convey the problem. Here's what a typical endpoint looked like before the refactor:

```ts
app.post('/api/pipes', async (c) => {
  // Auth — inline, easy to forget
  const session = await getSession(c.req);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  // Validation — mixed into the handler
  const body = await c.req.json();
  if (!body.name || !body.sourceId) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  // Business logic — right here in the route
  const source = await db
    .select()
    .from(sources)
    .where(eq(sources.id, body.sourceId));
  if (!source.length) {
    return c.json({ error: 'Source not found' }, 404);
  }

  // Database write — same file, same function
  const pipe = await db
    .insert(pipes)
    .values({
      name: body.name,
      sourceId: body.sourceId,
      accountId: session.accountId,
    })
    .returning();

  // Cross-domain side effect — why is this here?
  await db
    .insert(auditLog)
    .values({ action: 'pipe.created', actorId: session.userId });

  return c.json(pipe[0], 201);
});
```

This handler is doing five things: auth, validation, business logic, database access, and cross-domain audit logging. Multiply this by a hundred endpoints and you get a codebase where every change risks breaking something unrelated, every new hire has to read everything to understand anything, and an agent has no structural signal about where to put new code.

## **The After: A Modular Monolith with Seams**

The refactored architecture is a modular monolith. One deployable process. One database. Twenty-nine internal modules with strict boundaries, each owning a domain slice end-to-end. A shared platform layer for infrastructure. A single request pipeline with centralized auth.

This is not microservices. It is a monolith with internal seams.

### **Two Layers**

Platform (src/server/platform/) is shared infrastructure: HTTP routing primitives, auth and session management, database client and ORM, config, logging, and metrics. It should be boring.

Modules (src/server/modules/) are vertical domain slices. Twenty-six modules with HTTP endpoints (pipes, audiences, profiles, webhook-sdk, scheduled-imports, etc.) and three internal modules running background workers (identity resolution, ingestion, rollup). Each module owns its routes, service logic, database access, and validation.

Every module follows the same layout:

```
src/server/modules/<domain>/
  api/routes.ts        # Route definitions — thin
  service/handlers.ts  # Business logic
  repo/index.ts        # Database access only
  schemas/             # Zod validation
  public.ts            # Cross-module surface
  index.ts             # Re-exports routes + public surface
```

That same endpoint from before now looks like this:

```ts
// api/routes.ts — thin, declarative
{
  method: 'POST',
  path: '/api/pipes',
  auth: 'required',
  handler: (request) => handlePipeCreate(request),
}

// service/handlers.ts — business logic only
async function handlePipeCreate(request: Request) {
  const body = PipeCreateSchema.parse(await request.json());
  const source = await pipesRepo.getSource(body.sourceId);
  if (!source) return notFound('Source not found');
  const pipe = await pipesRepo.create(body);
  return json(pipe, 201);
}

// repo/index.ts — database access only
async function create(input: PipeCreateInput, client = db) {
  return client.insert(pipes).values(input).returning();
}
```

Auth is gone from the handler — it's handled by the pipeline. Validation uses a Zod schema. Database access is isolated in the repo. The audit log lives in its own module. Each piece has one job, and an agent (or a new hire) can understand the pattern by reading a single module.

## **The One Rule That Matters Most: public.ts**

Of everything we built, one rule does more work than all the others combined: all cross-module access goes through public.ts.

Public interfaces aren't a new idea — they're a standard pattern in well-structured software. What's worth noting is that when we described our problems to AI and asked it to design an architecture, this is one of the first things it reached for. The AI didn't invent the concept; it correctly identified it as the right solution for the specific mess we had. It knew that the boundary enforcement problem — code reaching into other modules' internals, creating invisible couplings — is exactly what public interface contracts solve. Sometimes the best architectural insight isn't novel. It's knowing which proven pattern fits the problem, and an AI looking at our codebase zeroed in on this one immediately.

Every module has a public.ts file that explicitly declares what it exposes to the rest of the system:

```ts
// modules/pipes/public.ts
export {
  handlePipeCreate,
  handlePipeDelete,
  handlePipeFunctionTest,
  handlePipeFunctionUpdate,
  handlePipeGet,
  handlePipeSecretsUpdate,
  handlePipesDiagramData,
  handlePipesGet,
  handlePipeToggle,
} from './service/handlers';
```

No module may reach into another module's service/ or repo/ directories. If you need something from another module, it must be exported through public.ts or it doesn't exist to you.

This rule is powerful because of what it makes possible:

It's mechanically enforceable. "Does this import go through public.ts?" is a yes/no question. A linter can check it. An agent can check it. A code reviewer can check it in seconds. No judgment required.

It makes module boundaries real. Without it, "modules" are just folders — anyone can reach into anything. With it, modules have an actual API surface. Internals can change freely as long as public.ts stays stable.

It's the single best rule for agents. When an agent is working on a module, it knows exactly what it can use from other modules (read public.ts) and exactly what it must not touch (everything else). This eliminates an entire class of architectural drift — the kind where an agent finds a useful function buried in another module's internals and imports it directly, creating a coupling that's invisible until it breaks.

It transfers to any language and framework. This isn't a TypeScript trick. It's a convention. Python packages, Go modules, Java packages — the same idea works everywhere. One file declares the boundary. Everything else is private.

The public.ts rule was directly informed by senior engineers who'd seen what happens without it: codebases where everything depends on everything, where changing an internal function requires auditing every consumer, where "refactoring" means "rewriting." Their experience made the case; the agent constraint made it non-negotiable.

## **The Route Registry: Centralized Policy, Not Scattered Enforcement**

The route registry replaced scattered routing with a declarative system where auth is enforced in one place:

```ts
type Route = {
  method: string;
  path: string;
  handler: (request: Request, params: Record<string, string>) => Promise<Response | null>;
  auth?: 'required' | 'optional' | 'none';
};
```

Auth enforcement happens once, in runRouteWithAuth, before any handler runs:

```ts
async function runRouteWithAuth(route, request, params) {
  const authMode = route.auth ?? 'none';
  if (authMode === 'none') return route.handler(request, params);

  const { error, setCookie } = await getSessionFromRequest(request);
  if (error) {
    if (authMode === 'optional' && error === 'unauthenticated') {
      return route.handler(request, params);
    }
    return buildSessionErrorResponse(error);
  }

  const response = await route.handler(request, params);
  if (!response) return null;
  return applySessionCookie(response, setCookie);
}
```

An agent adding a new endpoint doesn't need to remember to check auth. It declares auth: 'required' in the route metadata and the pipeline handles the rest. When we add entitlements — feature gates, usage quotas, per-account overrides — they'll slot into the same pipeline. One insertion point, not a codebase-wide audit.

## **AGENTS.md: The Working Agreement That Makes It Stick**

Architecture decisions only matter if they're followed. For human teams, that usually means code review, onboarding docs, and tribal knowledge. For agents, it means AGENTS.md — a file in the repo root that serves as the executable working agreement for every contributor, human or machine.

Our AGENTS.md encodes the non-negotiables that prevent architectural drift: where code must live (src/server/modules/\<domain\>/{api,service,repo,schemas} vs src/server/platform/\*), how modules are allowed to depend on each other (cross-module access only via public.ts), and where cross-cutting concerns belong (auth enforced in the route pipeline, not ad hoc wrappers). It also standardizes the workflow expectations that keep contributions safe at scale — Bun-only commands, strict TypeScript, Zod validation, lint/typecheck/test gates.

The net effect is that every contributor can ship changes without re-litigating structure. Engineers don't debate where a new handler goes — the answer is in AGENTS.md. Agents don't guess at conventions — they read the file and follow it. The constraints are explicit, local, and testable, which means violations surface mechanically rather than in architecture review meetings three weeks later.

This is also where the public.ts rule gets its teeth. It's one thing to have a convention. It's another to have it written in a file that every agent reads before generating code and every linter checks on commit.

## **What Agents Actually Do Now**

The agent thesis isn't hypothetical. Here's what changed in practice.

Module scaffolding works mechanically. We point an agent at the module layout contract and the migration checklist. It creates the folder structure, wires up routes, separates service from repo, and exports through public.ts. The output is structurally correct because the pattern is unambiguous.

Agents stay inside their module. Before the refactor, an agent working on "pipes" might touch files in five different directories. Now it works in src/server/modules/pipes/ and imports from other modules' public.ts files. The blast radius of any agent-generated code is bounded by the module.

public.ts violations are caught immediately. When an agent tries to import from another module's internals — and they do try — it's a mechanical violation that shows up in review. No architectural judgment required, just "this import doesn't go through public.ts."

The migration checklist is agent-executable. The seven-step process for migrating a domain into a module is the same whether a human or agent does it:

1. Create module folder with the standard layout.  
2. Move route definitions into api/routes.ts.  
3. Move handler logic into service/.  
4. Move database access into repo/.  
5. Add Zod schemas.  
6. Export the cross-module surface in public.ts.  
7. Register module routes in the router index.

Agents are good at repetition when the pattern is stable. This checklist gives them exactly that.

Where agents still struggle: decisions that require domain judgment. Should scheduled-imports be a submodule of sources or its own module? Is this business logic or infrastructure? These are questions where the senior engineers' experience is irreplaceable. The architecture doesn't try to automate judgment — it tries to minimize how often judgment is needed.

## **How We Migrated Without Freezing Development**

### **Write the Plan First**

Before touching code, we wrote a short refactor plan: goals, target architecture, module layout contract, migration strategy, first module choice. This plan was shaped heavily by the senior engineers' feedback — they'd done migrations like this before and knew which decisions to make early and which to defer. We updated the plan as we learned. It was not documentation after the fact — it was the control surface.

### **Introduce the Spine**

We started with the route registry and wired it into the request handler. Three guardrails: preserve existing API paths, allow fallthrough so legacy handlers keep serving unmigrated endpoints, keep auth centralized. Handlers return Response | null — null means "fall through to the next handler," which made incremental migration possible without breaking anything.

### **Migrate One Module, Then Repeat**

We migrated one domain fully to validate the pattern. This surfaced boundary decisions early — "scheduled imports" are conceptually a source subtype but operationally different, with different polling logic and error modes. We kept them as a separate module, which turned out to be the right call.

Once the pattern worked, every subsequent migration followed the same checklist. Legacy routing was removed only after module routing covered the full API surface.

## **The Repo Proxy: Testability Without Ceremony**

One detail that proved more important than expected: how modules access the database. Every module's repo/ exports plain functions that take the database client as their last argument. A proxy auto-injects the production client at the call site:

```ts
export function bindRepo<TRepo>(repo: TRepo, client: typeof db): TRepo {
  return new Proxy(repo, {
    get(target, prop) {
      const value = target[prop as keyof TRepo];
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => (value as RepoFn)(...args, client);
    },
  });
}
```

For tests, you swap in a partial in-memory implementation — no mocking frameworks, no test containers for unit tests, no setup/teardown ceremony. Handlers accept an optional deps object; in production it's undefined and the real database is used.

This pattern gives agents a mechanical template for testable database access. The agent doesn't need to decide *how* to make something testable — the pattern is already there.

## **A Note on Language Choice (and the People Who Think This Doesn't Apply to Them)**

We've heard two flavors of dismissal since sharing this approach. The first: "real engineers would never let code get this messy." The second: "why would you use TypeScript for production backend work."

Both miss the point so completely that they're worth addressing directly.

To the first: every codebase that shipped fast and grew a team has gone through some version of this. If yours hasn't, you either haven't scaled it yet, or you're not looking closely enough. The question is never whether structural debt accumulates — it's whether you address it before or after it's slowing you down. The "this would never happen to me" posture is a luxury belief held by people who haven't been responsible for a codebase with twenty contributors and an expanding feature surface.

To the second: the language is not the point, and fixating on it reveals a fundamental misunderstanding of where development is heading. Yes, you can write AI-assisted code in any language. But some languages make it dramatically easier to leverage agents effectively. TypeScript, Go, Rust — these are well-structured, strongly-typed languages with rich ecosystems, excellent tooling, and type systems that give agents (and humans) structural guardrails to work within. The agent doesn't just write code — it reads types, follows import paths, validates against schemas. A language that makes those signals explicit makes agents more reliable.

But there's a deeper reason we chose TypeScript specifically, and it has nothing to do with agents: one language across the entire stack collapses the barrier between "frontend person" and "backend person." When your API handlers, your database queries, your validation schemas, and your UI components are all TypeScript, any engineer on the team can work on any part of the product. They're not "writing backend code" — they're building product. That shift matters more in a world where agents handle the mechanical parts and humans focus on decisions, design, and domain judgment. The goal is builders, not code generators — and a shared language accelerates that transformation.

The people who scoff at this are, frankly, optimizing for a world that's already receding. The question is no longer "what's the most serious language for backend work." The question is "what setup lets a small team — humans and agents working together — ship the most product with the least friction." If your answer to that question is still gatekeeping language choices, you're solving the wrong problem.

## **The Bigger Point**

The refactor was driven by a convergence: senior engineers who recognized structural problems from experience, a growing team that needed clear ownership boundaries, and AI agents that turned implicit conventions into hard blockers. And the architecture that resolved all three? It was proposed by AI itself — when a human described the problems clearly enough for it to reason about.

The surprising thing is how much these three forces agreed. Every change the senior engineers recommended — explicit module boundaries, centralized auth, separated concerns — also made agents more effective. Every constraint we added for agents — mechanical rules, predictable layout, enforceable boundaries — also made humans more productive. The AI didn't suggest anything exotic. It suggested the kind of clean, well-bounded architecture that experienced engineers have always advocated for — it just arrived at it from a completely different direction.

The best way to make agents effective is to make the codebase legible. And the best way to get there might be simpler than you think: describe your problems clearly, let AI propose the structure, and have experienced engineers validate the result.

After the refactor, the backend has 29 domain modules with predictable structure, centralized auth enforcement with a clean insertion point for future entitlements, explicit cross-module surfaces enforced through public.ts, and routing that is testable and uniform. The system is still a monolith — intentionally. But it's a monolith with seams, which is what you need when the team is growing, the feature surface is expanding, and you want both humans and agents contributing without turning the codebase into a patchwork.

## **What We'd Like to Hear From You**

We're not presenting this as a solved problem. This architecture works well for us right now — but agentic development is moving so fast that what's "best practice" today might look quaint in six months. We're already seeing agents get better at understanding context, navigating larger codebases, and making architectural decisions that used to require human judgment.

The questions we're still working through: How much structure is the right amount before it becomes overhead that agents don't actually need? As agents improve, do strict module boundaries become more or less important? What conventions have other teams found effective for keeping agent-generated code architecturally sound?

If you're running a similar setup — or a completely different one that works — we'd genuinely like to hear about it. The playbook for human-agent collaboration is being written in real time, and no one team has the full picture yet.
