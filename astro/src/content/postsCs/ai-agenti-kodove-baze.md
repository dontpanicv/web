---
title: "Přestaňte nechat AI agenty hádat, kam kód patří"
date: 2026-02-10T12:00:00Z
status: published
translationKey: ai-agents-codebases
tags:
  - ai
  - agents
  - architecture
  - codebase
  - typescript
summary: "Refaktor do modulárního monolitu navržený pro AI agenty: předvídatelný layout modulů, centralizovaná autentizace a přísná hranice public.ts, která brání architektonickému driftu."
---

*Napsáno společně s [Adamem Sobotkou](https://www.linkedin.com/in/adamsobotka/).*

![Schéma hranic modulárního monolitu](/posts/ai-agents-codebases/hero.png)

## **Nečekaný poznatek**

Chtěli jsme, aby AI coding agenti přispívali do naší kódové báze. Tenhle cíl, víc než jakýkoli ideal "clean code", nás donutil postavit se čelem ke každé strukturální slabině, se kterou jsme do té doby žili. Výsledek byl modulární monolit, se kterým se lidem pracuje dramaticky lépe, právě proto, že jsme ho navrhli tak, aby byl čitelný pro stroje.

A teď ta ironie: samotnou architekturu navrhla AI. Náš lead developer nepřišel s hotovým receptem, žádné "pojďme na CQRS" ani "potřebujeme hexagonální architekturu". Popsal problémy: nekonzistentní auth, propletené concerns, žádné ownership modulů, agenti píšou kód na špatná místa. AI navrhla strukturu modulárního monolitu, kontrakt layoutu modulů a pravidlo hranice `public.ts`. Lidé to pak zhodnotili, otestovali na tlak a doladili, ale prvotní design přišel ze stejného typu nástroje, který jsme se snažili udělat produktivním.

Tohle je vzorec, který stojí za pozornost. Nevybrali jsme si architekturu z poličky a nedoufali, že se v ní agenti "nějak" zorientují. Popsali jsme AI, co je rozbité, a nechali ji navrhnout strukturu, ve které se dokáže pohybovat. Pro lidi to nakonec funguje lépe také, ale vzniklo to primárně z perspektivy agenta.

Na tomhle se dá snadno spálit: agenti jsou ve skutečnosti často lepší než lidé v tom, jak se vyznat v rozbitém kódu. Progrepují zmatek, najdou, co potřebují, a vyplivnou něco, co funguje. Problém není, že agenti neumí fungovat v nejasnosti. Problém je, že v ní fungují až moc ochotně. Senior engineer narazí na špinavý codebase a zatlačí zpátky: "tohle se musí zrefaktorovat, než se toho dotknu." Agent klidně napíše funkční kód na špatné místo, přizpůsobí se jakýmkoli nekonzistentním patternům, které najde, a dodá něco, co projde testy, zatímco architekturu dál rozleptá. Riziko není, že agenti v messy codebase selžou. Riziko je, že uspějí způsobem, který ten bordel násobí.

Explicitní hranice, mechanická pravidla a předvídatelná struktura agentům nepomáhají *fungovat*. Pomáhají jim fungovat *správně*. A když stavíte codebase s tímhle omezením v hlavě, vedlejším efektem je rychlejší onboarding, méně merge konfliktů a konzistentnější vymáhání politik.

Tohle je příběh, jak jsme se k tomu dostali, jak architektura vypadá a proč jedno jediné pravidlo dělá víc práce než všechna ostatní.

## **Tři problémy, jedna příčina**

Stavěli jsme data infrastructure produkt, Bun, TypeScript, PostgreSQL, jeden Docker kontejner pro lokální vývoj a Kubernetes v produkci. Původní codebase byl vibe-coded: žádný architektonický dokument, žádné hranice modulů, žádné konvence kromě "hlavně ať to funguje". Funkce jsme dodávali rychle.

Pak se současně objevily tři věci a všechny ukazovaly na stejnou díru.

Přišli seniorní inženýři a pojmenovali problémy, které jsme ignorovali. Jejich feedback byl konkrétní a fér: business logika se rozlévala přes route handlery. Auth se vynucoval nekonzistentně, některé endpointy používaly wrappery, některé kontrolovaly session inline, některé na to zapomněly úplně. SQL dotazy ležely vedle konstrukce HTTP odpovědí. Nikdo se nemohl podívat na soubor a říct si, za co je zodpovědný. Nebylo to puntičkářství, byla to zkušenost lidí, kteří už viděli, jak tyhle patterny dělají v produkci reálné škody. Jejich input formoval každé další strukturální rozhodnutí.

Onboarding se stal bottleneckem. Codebase neměl žádné švy. Každá feature sahala do každé jiné. Dva inženýři, kteří pracovali na nesouvisejících doménách, končili v merge konfliktech, protože stejné soubory obsahovaly nesouvisející věci. Nešlo říct: "tohle je tvoje, tohle je moje."

Agenti nemohli přispívat bezpečně. Tohle byl forcing function, který udělal všechno urgentní. Agent umí napsat kód, který projde testy, ale neumí intuitivně odhadnout, kam ten kód v codebase patří, pokud tam není žádný organizační princip. Bez explicitních hranic se agent buď ptá, kam co dát (a tím popírá svůj smysl), nebo hádá špatně (a vy pak ručně uklízíte architektonický drift).

Kritika seniorů a omezení agentů ukazovaly na stejnou opravu: codebase potřeboval explicitní, mechanickou strukturu, která nevyžaduje tribal knowledge k orientaci. A jak se ukázalo, když jsme tyhle problémy popsali AI, navrhla přesně takovou strukturu, ve které umí efektivně fungovat, a kterou seniorní inženýři okamžitě poznali jako zdravou.

## **Předtím: jak vypadá nejasnost v praxi**

Abstraktní popisy "messy code" ten problém nevystihnou. Takhle vypadal typický endpoint před refaktorem:

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

Tenhle handler dělá pět věcí: auth, validaci, business logiku, DB access a cross-domain audit logging. Vynásobte to stovkou endpointů a dostanete codebase, kde každá změna riskuje rozbití něčeho nesouvisejícího, každý nový člověk musí číst všechno, aby pochopil cokoliv, a agent nemá žádný strukturální signál, kam nový kód patří.

## **Potom: modulární monolit se švy**

Refaktorovaná architektura je modulární monolit. Jeden deployovatelný proces. Jedna databáze. Dvacet devět interních modulů s přísnými hranicemi, každý vlastní svůj domain slice end-to-end. Sdílená platform layer pro infrastrukturu. Jedna request pipeline s centralizovaným auth.

Tohle nejsou microservices. Je to monolit s interními švy.

### **Dvě vrstvy**

Platform (`src/server/platform/`) je sdílená infrastruktura: HTTP routing primitives, auth a session management, DB klient a ORM, config, logging a metrics. Měla by být nudná.

Modules (`src/server/modules/`) jsou vertikální domain slices. Dvacet šest modulů s HTTP endpointy (pipes, audiences, profiles, webhook-sdk, scheduled-imports, atd.) a tři interní moduly s background workery (identity resolution, ingestion, rollup). Každý modul vlastní svoje routy, service logiku, DB access a validaci.

Každý modul má stejný layout:

```
src/server/modules/<domain>/
  api/routes.ts        # Route definitions — thin
  service/handlers.ts  # Business logic
  repo/index.ts        # Database access only
  schemas/             # Zod validation
  public.ts            # Cross-module surface
  index.ts             # Re-exports routes + public surface
```

Ten samý endpoint z dřívějška teď vypadá takhle:

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

Auth zmizel z handleru, řeší ho pipeline. Validace používá Zod schema. DB access je izolovaný v repo. Audit log žije ve vlastním modulu. Každá část má jednu práci a agent (nebo nový člověk) pochopí pattern tím, že si přečte jeden modul.

## **Jediné pravidlo, na kterém nejvíc záleží: public.ts**

Ze všeho, co jsme postavili, jedno pravidlo dělá víc práce než všechna ostatní dohromady: veškerý cross-module access jde přes `public.ts`.

Public interfaces nejsou nová myšlenka, je to standardní pattern ve slušně strukturovaném softwaru. Zajímavé je, že když jsme AI popsali naše problémy a požádali ji o návrh architektury, byla to jedna z prvních věcí, po které sáhla. AI ten koncept nevymyslela, jen správně poznala, že přesně tohle řeší náš konkrétní chaos. Věděla, že problém vynucování hranic, kdy kód sahá do interních částí jiných modulů a vytváří neviditelné vazby, je přesně to, co public interface kontrakty řeší. Někdy nejlepší architektonický insight není novinka. Je to schopnost vybrat osvědčený pattern, který sedí na daný problém, a AI se na tenhle trefila okamžitě.

Každý modul má soubor `public.ts`, který explicitně deklaruje, co vystavuje zbytku systému:

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

Žádný modul nesmí importovat z interních adresářů jiného modulu (`service/`, `repo/`, atd.). Pokud něco z jiného modulu potřebujete, musí to být exportované přes `public.ts`, jinak pro vás neexistuje.

Tohle pravidlo je silné kvůli tomu, co umožní:

Je mechanicky vynutitelné. "Jde tenhle import přes `public.ts`?" je otázka ano/ne. Linter to umí zkontrolovat. Agent to umí zkontrolovat. Code review to umí zkontrolovat během pár vteřin. Bez judgmentu.

Dělá z hranic modulů realitu. Bez toho jsou "moduly" jen složky, kdokoli může sahat kamkoli. S tímhle mají moduly reálný API surface. Internals se můžou měnit, pokud zůstane stabilní `public.ts`.

Pro agenty je to nejlepší jediné pravidlo. Když agent pracuje na modulu, přesně ví, co může používat z jiných modulů (přečte si `public.ts`) a co nesmí touchovat (všechno ostatní). Tím mizí celá třída architektonického driftu, kdy agent najde užitečnou funkci v internals jiného modulu a importne ji napřímo, čímž vytvoří vazbu, která je neviditelná až do chvíle, než se to rozbije.

Přenáší se to do jakéhokoli jazyka a frameworku. Není to TypeScript trik. Je to konvence. Python balíčky, Go moduly, Java packages, všude jde použít stejná myšlenka. Jeden soubor deklaruje hranici. Všechno ostatní je private.

Pravidlo `public.ts` bylo přímo inspirované zkušeností seniorů, kteří viděli, co se stane bez něj: codebase, kde všechno závisí na všem, kde změna interní funkce znamená audit všech konzumentů, kde "refactoring" znamená "přepis."

## **Registr rout: centralizovaná politika, ne roztříštěné vymáhání**

Route registry nahradil roztříštěný routing deklarativním systémem, kde se auth vynucuje na jednom místě:

```ts
type Route = {
  method: string;
  path: string;
  handler: (request: Request, params: Record<string, string>) => Promise<Response | null>;
  auth?: 'required' | 'optional' | 'none';
};
```

Auth enforcement proběhne jednou, v `runRouteWithAuth`, ještě před tím, než se spustí handler:

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

Agent, který přidává nový endpoint, si nemusí pamatovat "nezapomeň zkontrolovat auth". Prostě deklaruje `auth: 'required'` v route metadata a pipeline se postará o zbytek. Až přidáme entitlementy, feature gates, usage quotas, per-account overrides, zapadne to do stejné pipeline. Jeden insertion point, ne audit celého codebase.

## **AGENTS.md: pracovní dohoda, která to udrží**

Architektonická rozhodnutí mají smysl jen tehdy, když se dodržují. U lidských týmů to většinou znamená code review, onboarding docs a tribal knowledge. U agentů to znamená `AGENTS.md`, soubor v kořeni repa, který slouží jako vykonatelná pracovní dohoda pro každého přispěvatele, člověka i stroj.

Náš `AGENTS.md` kóduje non-negotiables, které brání architektonickému driftu: kde má kód žít (`src/server/modules/<domain>/{api,service,repo,schemas}` vs `src/server/platform/*`), jak smějí moduly záviset jeden na druhém (cross-module access pouze přes `public.ts`) a kam patří cross-cutting concerns (auth v pipeline, ne v ad hoc wrappech). Zároveň standardizuje workflow, který drží kontribuce bezpečné ve větším měřítku, Bun-only příkazy, strict TypeScript, Zod validace, a lint/typecheck/test gates.

Čistý efekt je, že každý přispěvatel může shipovat změny bez toho, aby se pokaždé znovu vedly debaty o struktuře. Inženýři nediskutují, kam patří nový handler, odpověď je v `AGENTS.md`. Agenti nehádají konvence, přečtou soubor a řídí se jím. Omezení jsou explicitní, lokální a testovatelná, takže porušení vyleze mechanicky, ne až na architektonickém meetingu za tři týdny.

Tady se taky pravidlo `public.ts` stává skutečně vynutitelným. Je rozdíl mít konvenci. A je rozdíl mít ji napsanou v souboru, který si každý agent přečte před generováním kódu, a který linter kontroluje při commitu.

## **Co teď agenti reálně dělají**

Teze o agentech není hypotetická. Takhle se změnila praxe.

Scaffolding modulů funguje mechanicky. Ukážeme agentovi kontrakt layoutu modulů a migrační checklist. Vytvoří strukturu složek, zapojí routy, oddělí service od repo a exportuje přes `public.ts`. Výstup je strukturálně správný, protože pattern je jednoznačný.

Agenti zůstávají uvnitř svého modulu. Před refaktorem agent na "pipes" sahal do souborů v pěti různých adresářích. Teď pracuje v `src/server/modules/pipes/` a importuje z `public.ts` jiných modulů. Blast radius jakéhokoli agent-generated kódu je omezený hranicemi modulu.

Porušení `public.ts` se chytá okamžitě. Když se agent pokusí importovat z internals jiného modulu, a oni to zkouší, je to mechanické porušení pravidla, které se objeví v review. Žádný architektonický soud, jen "tenhle import nejde přes `public.ts`".

Migrační checklist je pro agenta vykonatelný. Sedmikrokový proces migrace domény do modulu je stejný pro člověka i agenta:

1. Vytvoř modulovou složku se standardním layoutem.  
2. Přesuň definice rout do `api/routes.ts`.  
3. Přesuň handler logiku do `service/`.  
4. Přesuň DB access do `repo/`.  
5. Přidej Zod schémata.  
6. Exportuj cross-module surface v `public.ts`.  
7. Zaregistruj modulové routy v router indexu.  

Agenti jsou dobří v opakování, když je pattern stabilní. Tenhle checklist jim dává přesně to.

Kde se agenti pořád trápí: rozhodnutí, která vyžadují doménový judgment. Má být scheduled-imports submodule sources nebo samostatný modul? Je tohle business logika nebo infrastruktura? To jsou otázky, kde je zkušenost seniorů nenahraditelná. Architektura se nesnaží automatizovat judgment. Snaží se minimalizovat, jak často je potřeba.

## **Jak jsme migrovali, aniž bychom zmrazili vývoj**

### **Nejdřív napište plán**

Než jsme se dotkli kódu, napsali jsme krátký refactor plán: cíle, cílová architektura, kontrakt layoutu modulů, migrační strategie, volba prvního modulu. Tenhle plán byl silně ovlivněný feedbackem seniorů, už podobné migrace dělali a věděli, která rozhodnutí udělat hned a která odložit. Plán jsme průběžně aktualizovali. Nebyla to dokumentace po bitvě, byl to řídicí panel.

### **Zaveďte páteř**

Začali jsme route registry a zapojili ho do request handleru. Tři guardrails: zachovat existující API cesty, umožnit fallthrough, aby legacy handlery dál obsluhovaly nemigrované endpointy, a udržet auth centralizovaný. Handlery vrací `Response | null`, `null` znamená "fall through na další handler", díky čemuž šla migrace dělat inkrementálně bez rozbíjení.

### **Migrujte jeden modul a opakujte**

Migrovali jsme jednu doménu kompletně, abychom ověřili pattern. Tím se brzo objevily boundary decisions, například "scheduled imports" jsou konceptuálně subtype sources, ale operativně jsou jiné, mají jinou polling logiku i error modes. Nechali jsme je jako samostatný modul, což se ukázalo jako správné.

Jakmile pattern fungoval, každá další migrace jela podle stejného checklistu. Legacy routing jsme odstranili až ve chvíli, kdy modulový routing pokryl celý API surface.

## **Repo proxy: testovatelnost bez ceremonie**

Jeden detail byl důležitější, než jsme čekali: jak moduly přistupují k databázi. Každý modul v `repo/` exportuje obyčejné funkce, které berou DB client jako poslední argument. Proxy pak auto-injektuje produkční client na call site:

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

V testech prohodíte client za částečnou in-memory implementaci, žádné mocking frameworky, žádné test containery pro unit testy, žádná setup/teardown ceremonie. Handlery berou volitelný `deps` objekt, v produkci je `undefined` a použije se skutečná DB.

Tenhle pattern dává agentům mechanickou šablonu pro testovatelný DB access. Agent nemusí rozhodovat *jak* něco udělat testovatelné, pattern už existuje.

## **Poznámka k volbě jazyka (a k lidem, kteří si myslí, že se jich to netýká)**

Od chvíle, kdy jsme tenhle přístup sdíleli, jsme slyšeli dva typy odmítnutí. První: "skuteční inženýři by nikdy nedovolili, aby se kód dostal do takového stavu." Druhé: "proč bys používal TypeScript na produkční backend."

Oboje míjí pointu tak moc, že stojí za to to říct nahlas.

K prvnímu: každý codebase, který shipoval rychle a pak začal škálovat tým, prošel nějakou verzí tohohle. Jestli ne, buď jste ještě neškálovali, nebo se nedíváte dost zblízka. Otázka nikdy není, jestli se strukturální dluh nahromadí. Otázka je, jestli ho řešíte dřív, než vás začne brzdit, nebo až potom. Postoj "mně by se tohle nikdy nestalo" je luxusní přesvědčení lidí, kteří nikdy nenesli zodpovědnost za codebase s dvaceti přispěvateli a rostoucím feature surfacem.

K druhému: jazyk není pointa a fixace na něj ukazuje zásadní nepochopení toho, kam vývoj míří. Ano, AI-assisted kód jde psát v jakémkoli jazyce. Některé jazyky ale dramaticky zjednodušují využití agentů. TypeScript, Go, Rust, to jsou dobře strukturované, silně typované jazyky s bohatými ekosystémy, skvělým toolingem a typovými systémy, které dávají agentům (a lidem) strukturální guardrails. Agent jen nepíše kód, čte typy, sleduje importy, validuje proti schématům. Jazyk, který tyhle signály dělá explicitní, dělá agenty spolehlivějšími.

Je tu ale hlubší důvod, proč jsme vybrali TypeScript, a nesouvisí s agenty: jeden jazyk přes celý stack zruší bariéru mezi "frontend člověkem" a "backend člověkem". Když jsou API handlery, DB dotazy, validační schémata i UI komponenty v TypeScriptu, kdokoli v týmu může pracovat na jakékoli části produktu. Ne "píše backend". Staví produkt. Tahle změna je ještě důležitější ve světě, kde agenti dělají mechanickou práci a lidé se soustředí na rozhodnutí, design a doménový judgment. Cíl jsou builders, ne code generators, a sdílený jazyk tenhle posun zrychluje.

Lidé, kteří tohle shazují, upřímně optimalizují pro svět, který už mizí. Otázka dnes není "jaký je nejserióznější jazyk na backend". Otázka je "jaké nastavení umožní malému týmu, lidem i agentům dohromady, shipovat nejvíc produktu s nejmenším třením." Jestli je vaše odpověď pořád gatekeeping volby jazyka, řešíte špatný problém.

## **Podstata**

Refaktor byl vyhnaný konvergencí tří sil: seniorní inženýři, kteří ze zkušenosti poznali strukturální problémy, rostoucí tým, který potřeboval jasné hranice ownershipu, a AI agenti, kteří z implicitních konvencí udělali tvrdé blokery. A architektura, která vyřešila všechny tři? Navrhla ji AI, když jí člověk problémy popsal dostatečně jasně, aby o nich mohla uvažovat.

Překvapivé je, jak moc se tyhle tři síly shodly. Každá změna, kterou doporučili senioři, explicitní hranice modulů, centralizovaný auth, separace concerns, dělala agenty efektivnějšími. Každé omezení, které jsme přidali kvůli agentům, mechanická pravidla, předvídatelný layout, vynutitelné hranice, dělalo lidi produktivnějšími. AI nenavrhla nic exotického. Navrhla čistou, dobře ohraničenou architekturu, kterou zkušení inženýři doporučují už dávno. Jen k ní došla z úplně jiné strany.

Nejlepší způsob, jak udělat agenty efektivními, je udělat codebase čitelný. A nejlepší cesta k tomu může být jednodušší, než si myslíte: popište problémy jasně, nechte AI navrhnout strukturu a nechte zkušené inženýry výsledek validovat.

Po refaktoru má backend 29 doménových modulů s předvídatelnou strukturou, centralizované vynucování auth s čistým insertion pointem pro budoucí entitlementy, explicitní cross-module povrchy vynucované přes `public.ts` a routing, který je uniformní a testovatelný. Systém je pořád monolit, schválně. Ale monolit se švy, což je to, co potřebujete, když tým roste, feature surface se rozšiřuje a chcete, aby lidé i agenti přispívali, aniž by se codebase změnil v patchwork.

## **Co bychom od vás rádi slyšeli**

Neprezentujeme to jako vyřešený problém. Tahle architektura nám teď funguje dobře, ale agentic development se hýbe tak rychle, že dnešní "best practice" může za šest měsíců působit archaicky. Už teď vidíme, že agenti jsou lepší v pochopení kontextu, navigaci ve větších codebase a v rozhodování, které dřív vyžadovalo lidský judgment.

Otázky, které pořád řešíme: Kolik struktury je správně, než se z toho stane overhead, který agenti vlastně nepotřebují? S tím, jak se agenti zlepšují, jsou přísné hranice modulů důležitější, nebo naopak méně? Jaké konvence se ostatním týmům osvědčily pro to, aby byl agent-generated kód architektonicky "sound"?

Jestli jedete podobný setup, nebo úplně jiný, který funguje, budeme rádi, když se ozvete. Playbook pro spolupráci lidí a agentů se píše v reálném čase a žádný tým ještě nemá celý obraz.

