---
title: "Za hranicí tool-callingu: Jak jsme postavili AI Analytika s Bashem, mountovaným filesystémem a JSON rendererem"
date: 2026-04-29
status: published
translationKey: ai-analyst-architecture
tags:
  - ai
  - agents
  - architecture
  - analytics
  - typescript
summary: "Proč naivní smyčka AI SDK + tooly + markdown na analytické agenty nestačí — a jaká architektura postavená na bashi, mountovaném filesystému a JSON rendereru ji nahradila."
---

Většina AI feature, které dnes vznikají, jede podle stejné kuchařky: vezme se Vercel AI SDK, zaregistruje se hrstka toolů, napíše se systémový prompt a výsledek se nastreamuje do markdown komponenty. Funguje to. A je to taky místo, kde většina týmů končí — a kde většina AI produktů začíná narážet na své limity.

Tenhle článek prochází architekturou, ke které jsme došli u **AI Analytika** v Engage, a porovnává ji s konvenčnějším **chatbotem Piper**, který sídlí ve stejné kódové bázi vedle. Oba jsou součástí stejného produktu. Uvnitř jsou ale úplně jiné.

Začneme od naivního základu, identifikujeme dva problémy, které nás z něj vyhnaly (zahlcené tool výstupy a balast v metadatech), a představíme tři myšlenky, které je nahradily: **just-bash s in-memory filesystémem**, **SQL vrstva, která výsledky mountuje jako soubory**, a **JSON renderer s předdefinovaným katalogem komponent**.

## 1. Naivní architektura: AI SDK + tooly + markdown

Chatbot Piper je učebnicová implementace. Server side je v podstatě jediné volání:

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

Každý tool je malý objekt se Zod schématem a funkcí `execute`:

```ts
const get_dashboard = tool({
  description: 'Fetch workspace health metrics: sources, pipes, destinations.',
  inputSchema: z.object({}),
  execute: async () => fetchDashboard(),
});
```

Frontend je stejně jednoduchý. Zprávy se streamují, tool calls se renderují jako sbalitelné karty, textový obsah jde přes `react-markdown` s GFM a syntax highlightingem. Model píše prózu, uživatel čte prózu.

Pro *operativní* asistenty to funguje skvěle — „založ audience“, „ukaž mi poslední neúspěšnou delivery“, „vysvětli, co tenhle atribut dělá“. Konverzace je krátká, každý tool vrací malý, dobře tvarovaný objekt a markdown je odpověď.

Přestane to fungovat ve chvíli, kdy model potřebuje **přemýšlet nad daty**.

## 2. Problém první: tool výstupy, které zahltí kontext

První zeď, do které narazíte, jsou velké tool výstupy. Představte si tool, který spouští SQL dotaz proti warehouse:

```ts
const run_query = tool({
  description: 'Run a SQL query against the warehouse.',
  inputSchema: z.object({ sql: z.string() }),
  execute: async ({ sql }) => {
    const { columns, rows } = await warehouse.execute(sql);
    return { columns, rows }; // <-- 50 000 řádků JSONu
  },
});
```

Cokoliv tool vrátí, jde rovnou do kontextu modelu jako tool result message. Dotaz, který vrátí 50 tisíc řádků, je teď 50 tisíc řádků JSONu sedících v konverzaci — v každém dalším tahu, placené v tokenech a vytlačující dřívější uvažování ven z okna.

Můžete paginovat. Můžete oříznout. Můžete sumarizovat. Všechno to jsou jen úhybné manévry — buď ztratíte informaci, nebo nutíte model rozhodovat se nad daty, která nevidí.

Ten zásadní problém je, že **tool výstupy jsou děsně špatné místo na data**. Tool výstupy se hodí na *fakta, nad kterými má model dál uvažovat*. Hodí se mizerně na *bulk data, která má model krájet, seskupovat, počítat a vykreslovat*.

## 3. Problém druhý: balast metadat z inventory toolů

Druhá zeď je subtilnější a přijde dřív. Aby model odpověděl na skoro jakoukoliv analytickou otázku v Engage, musí vědět, co existuje: jaké event typy se trackují, jaké atributy jsou nadefinované, jak je nastavená identity resolution, jaké audiences a journeys běží, jaké warehouse tabulky jsou připojené.

Naivní způsob, jak to vystavit, je jeden tool na typ entity:

```ts
list_event_types();        // vrátí ~80 event typů se schématy
list_attributes();         // vrátí ~200 definic atributů
list_audiences();          // vrátí ~40 audiences s pravidly
list_identity_resolution(); // vrátí stitching pravidla
list_channels();
list_journeys();
list_warehouse_tables();
```

Každé volání vrátí mnohomluvný seznam. Model, ochotný jak je, je všechny zavolá hned na začátku konverzace „aby se zorientoval“. Ještě než se vůbec dostane k uživatelské otázce, sedí v kontextu desetitisíce tokenů metadat — většina z nich irelevantní pro to, na co se uživatel doopravdy ptal.

Model navíc tato metadata neumí efektivně *prohledávat*. Musí číst položku po položce a doufat, že najde ten jeden atribut jménem `last_purchase_at`. Žádný `grep` neexistuje.

## 4. Myšlenka první: just-bash s in-memory filesystémem

Tady se Analystova architektura odděluje. Místo tuctu inventory toolů dáme modelu **jeden tool — `bash` — a filesystém s inventářem už zapsaným na disku**.

Používáme [`just-bash`](https://www.npmjs.com/package/just-bash), který nad in-memory FS vystavuje skutečný shell. Každý uživatel dostane izolovaný workspace, který přežívá mezi tahy:

```ts
import { Bash } from 'just-bash';

const workspace = new Bash();

await workspace.writeFile('/context/inventory.json', JSON.stringify(inventory));
await workspace.writeFile('/context/instructions.md', customInstructions);
await workspace.writeFile('/context/managed-table-schemas.md', schemaDocs);
```

Systémový prompt pak modelu řekne, kam se má dívat:

```text
You are the Engage Analyst.

Use the scratchpad_exec tool to run bash commands against your filesystem:
  /context/inventory.json         — event typy, audiences, atributy, journeys
  /context/managed-table-schemas.md — schémata warehouse tabulek a poznámky k dialektu
  /data                           — sem padají výsledky dotazů
  /notes                          — tvoje pracovní poznámky
```

A jediný tool, který model k orientaci potřebuje, je:

```ts
const scratchpad_exec = tool({
  description: 'Run a bash command in your scratchpad.',
  inputSchema: z.object({ command: z.string() }),
  execute: async ({ command }) => workspace.run(command),
});
```

Model najednou vystupuje jako analytik u terminálu:

```bash
jq '.attributes[] | select(.name | test("purchase"))' /context/inventory.json
grep -l "events_ecommerce" /context/managed-table-schemas.md
ls /data
```

Změní se tři věci najednou. Za prvé, **do kontextu se dostane jen relevantní výsek metadat** — model si grepne, co potřebuje, místo aby vysypal celý katalog. Za druhé, **model si může psát poznámky** v `/notes`, které přežijí mezi tahy bez toho, aby znovu obsazovaly kontextové okno. Za třetí, sada toolů se dramaticky scvrkne: jeden bash tool nahradí celou hromadu `list_*` toolů a model už shellové idiomy dávno umí.

## 5. Myšlenka druhá: SQL výsledky jako mountované soubory

Stejná myšlenka platí pro výsledky dotazů. Místo toho, aby SQL tool vracel řádky, **zapíše je do souboru a vrátí cestu**:

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

Model dostane zpátky to, co potřebuje k *uvažování* — počet řádků, seznam sloupců, pětiřádkový vzorek — bez toho, aby mu kontext zaplevelila celá výsledková sada. Když se chce podívat blíž, má bash:

```bash
jq '.rows | group_by(.country) | map({country: .[0].country, n: length})' /data/query-1714400000.json
head -100 /data/query-1714400000.json
wc -l /data/query-1714400000.json
```

Dotaz na 50 000 řádků a dotaz na 50 řádků teď stojí stejně v tokenech. Data jsou agentovi *dostupná*, ale ne *uvnitř* něj. Tohle je jediná nejvíc pákově působící změna v celé architektuře.

Otevírá to taky multi-step analýzu. Model může pustit jeden široký dotaz, uložit ho a v dalších tazích nad ním pouštět menší `jq` řezy. Každý řez je levný; podkladová data se nikdy nemusí znovu fetchovat ani znovu vkládat.

## 6. Myšlenka třetí: JSON renderer s katalogem komponent

Doteď jsme řešili input. Output je druhá polovina problému. Pokud model píše jen markdown, nejlepší, co dokáže, je nalepit tabulku čísel — a teď musí buď znovu vtáhnout data do kontextu, aby tabulku napsal, nebo halucinovat.

Řešení je symetrické k tomu SQL: **nechte model emitovat deklarativní spec a renderujte na frontendu předem připravené komponenty s daty předanými referencí**.

V systémovém promptu modelu vystavíme pevný katalog komponent:

```text
Available components:
  AnalystReport, Narrative, MetricGrid, MetricCard,
  TimeSeriesChart, LineChart, BarChart, StackedBarChart,
  DataTable, FunnelChart, InsightList, EntityLinkList,
  QueryCitation, SuggestedQuestions
```

Model emituje fenced ` ```spec ` blok s JSON Patch operacemi, které report postupně staví. Klíčový trik je, že data props nejsou inlinovaná — jsou **vázaná souborovou referencí**:

````text
```spec
[
  { "op": "add", "path": "/components/0", "value": {
      "type": "MetricCard",
      "label": "Aktivní zákazníci (30d)",
      "value": 18432
  }},
  { "op": "add", "path": "/components/1", "value": {
      "type": "BarChart",
      "title": "Nákupy podle země",
      "data": { "$state": "/state/purchases-by-country.json" }
  }}
]
```
````

Předtím, než graf emituje, zapíše model chart-ready řádky do `/state/`:

```bash
jq '.rows | group_by(.country) | map({label: .[0].country, value: length})' \
   /data/query-1714400000.json > /state/purchases-by-country.json
```

Server posílá spec klientovi vedlejším kanálem (`pipeJsonRender`), klient si reference `$state` resolvne proti workspace a malý renderer mapuje každý `type` na React komponentu:

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

Z toho návrhu padají tři vlastnosti. Model nikdy nemusí držet data grafu v kontextu, aby je „vyrenderoval“ — jen ukáže na soubor. Vizuální slovník je pevný, takže výstup je konzistentní a v brandu místo zdi ad-hoc markdown tabulek. A protože spec je deklarativní JSON Patch, report se dá **stavět inkrementálně** napříč tahy: model přidá metric card, pak graf, pak narrative, bez toho aby cokoliv přepisoval.

## 7. Co tím získáváme

Posun od naivního tool-callingu k bashi + mountovanému FS + JSON rendereru není refaktor — je to jiný model toho, čím AI agent vlastně je. Naivní agent je funkce, která mapuje prompty na prózu. Analyst je blíž **juniornímu analytikovi u terminálu s notesem a knihovnou na grafy**.

Konkrétně:

- **Kontext zůstává malý.** Inventář a výsledky dotazů žijí na disku. Model si vtahuje jen to, co `grep`ne, `jq`ne nebo navzorkuje. Dlouhé sezení zůstávají koherentní, protože okno není zaplaveno tool výstupy.
- **Méně toolů, větší schopnosti.** Jeden `bash` tool plus jeden `sql` tool nahradí desítky vlastních `list_*` a `get_*` toolů. Model už shellové idiomy ovládá; nemusíme ho učit naši vlastní API plochu.
- **Data a uvažování jsou oddělená.** Model uvažuje nad *tvary a vzorky*; samotná data nikdy neopustí filesystém kromě renderování. Dotaz na 50 tisíc řádků a dotaz na 50 řádků stojí v tokenech stejně.
- **Output je strukturovaný už ze své podstaty.** Pevný katalog komponent znamená, že UI je předvídatelné, brandové a interaktivní — místo markdown tabulky, na kterou uživatel nemůže kliknout.
- **Stav je perzistentní.** Scratchpad přežívá mezi tahy. Poznámky, mezivýsledky dotazů a rozpracované reporty jsou prostě soubory. Model může pokračovat v práci bez toho, aby si znovu skládal kontext.
- **Agent je pozorovatelný.** Každý příkaz, každý zapsaný soubor, každý emitovaný spec je samostatný artefakt ve workspace. Debugovat běh agenta se podobá víc čtení shellové historie než reverse-engineeringu promptu.

Konvenční architektura není špatně — pro chatbota je to ten správný nástroj. Krátký operativní dialog filesystém nepotřebuje. Ale ve chvíli, kdy má agent *dělat analýzu* — sahat na reálná data, stavět něco vizuálního, uvažovat napříč více kroky — naivní smyčce velmi rychle dojde místo.

Lekce, ke které se pořád vracíme, je drobná a v retrospektivě skoro trapná: **většina toho, co jsme cpali do kontextového okna, tam nepatřila**. Inventář patří na disk. Výsledky dotazů patří na disk. Data grafů patří na disk. Kontextové okno je na *uvažování*, ne na *uložení*. Jakmile to přijmete, zbytek architektury — bash, mountované SQL, referencovaný state rendereru — je jen ten zjevný tvar řešení.
