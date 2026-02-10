---
title: "Claude Code vs Codex: Stejná AI, jiní lidé"
date: 2026-02-05
status: draft
translationKey: claude-code-vs-codex-different-people
tags:
  - ai
  - devtools
  - prompting
  - workflow
summary: "Proč Claude Code a Codex nejsou zaměnitelné: styl promptování a tolerance k nejednoznačnosti určují výsledek."
---

Pokud jste vyzkoušeli víc kódovacích asistentů, třeba **Claude Code** a **Codex**, pravděpodobně jste si všimli něčeho zvláštního:

Nejsou zaměnitelní.

A není to (jen) o kvalitě modelu. Je to o shodě: o tom, jaký jste člověk, jak přemýšlíte a jak komunikujete záměr.

## Pythonovská lež (a proč tady nefunguje)

U "normálních" programovacích nástrojů, Pythonu, kompilátoru, linteru, platí uklidňující pravidlo:

> Stejný vstup → stejný výstup.

Dva inženýři mohou napsat stejný program v Pythonu a bude se chovat stejně (modulo chyby). Nástroj je deterministický a výsledek je pevně svázaný s kódem.

Kódovací agenti takto nefungují.

U Claude Code a Codexu je obrovská část "vstupu" něco jiného než kód. Jste to vy: váš styl promptování, vaše tolerance k nejednoznačnosti, jak strukturujete úkoly, jak reagujete na dílčí pokrok a jak řídíte proces.

Takže i když dva lidé požádají o "stejnou funkci," často dostanou různé výsledky, protože ve skutečnosti dávají různé instrukce.

## Promptování je programovací jazyk (ať se vám to líbí nebo ne)

Když používáte kódovacího agenta, nepíšete jen kód. Píšete specifikaci v reálném čase.

Ta specifikace se skládá z:

- toho, co řeknete explicitně,
- toho, co považujete za samozřejmé,
- toho, co si všimnete a opravíte,
- a toho, co nezmíníte (ale agent odhadne).

Dva lidé budou:

- zdůrazňovat jiné omezení ("minimální JS", "nesahej na backend", "přísné typy"),
- dbát na jinou estetiku ("čisté UI" vs "rychlé dodání"),
- zastavovat na jiných místech ("dost dobré" vs "kvalita na produkci").

Proto se výsledky rozcházejí.

## Různé nástroje odměňují různé styly

### Claude Code odměňuje "kolaborativní řízení"

Často vyniká, když:

- iterujete jako při pair-programmingu,
- kontrolujete diffy,
- usměrňujete architekturu,
- přidáváte omezení, jak je postupně objevujete,
- udržujete těsnou zpětnou vazbu.

Může to působit jako řízení schopného kolegy: nejlepší výsledky dostanete, když zůstanete zapojení.

### Codex odměňuje "přesné zadání úkolu"

Codex často působí nejsilněji, když:

- zadáte jasné, ohraničené úkoly,
- specifikujete rozsah souborů,
- přesně definujete "hotovo",
- pustíte ho v krátkých cyklech ("udělej změnu X, pusť testy, reportuj").

Může to působit jako vysokorychlostní vykonavatel: pohybuje se rychle, když je cíl jednoznačný.

Ani jeden není "lepší." Jsou optimalizované pro různé pracovní rytmy a různé osobnosti.

## Skutečná proměnná: tolerance k nejednoznačnosti

Užitečný mentální model:

- Pokud rádi prozkoumáváte řešení a upřesňujete požadavky za pochodu, preferujete agenta, který je dobrý v konverzaci, kompromisech a refaktorech.
- Pokud nesnášíte nejednoznačnost a chcete předvídatelný pokrok, preferujete agenta, který dobře reaguje na přísná omezení a checklisty.

Většina frustrace s kódovacími agenty pochází z nesouladu právě tady:

- Myslíte si, že jste požádali o hřebík.
- Agent si myslí, že jste chtěli knihovnu.
- Teď jste oba naštvaní.

## Proč dva lidé dostanou dva různé výsledky

I kdyby dva lidé zkopírovali stejný prompt, nezkopírují stejný proces.

Jeden člověk:

- přijme první řešení,
- nasadí,
- jde dál.

Druhý člověk:

- požádá o čistší typy,
- chce menší diff,
- odmítne změny v UI,
- trvá na přístupnosti,
- přidá okrajové případy.

Za 5–10 iterací se tato řídící rozhodnutí skládají jako malé commity, které přetváří repo.

Takže "stejný nástroj" produkuje různé výsledky, protože člověk je součástí systému.

## Praktické závěry

1. **Zacházejte s prompty jako s kódem.** Verzujte je, vylepšujte, znovupoužívejte. Prompt debt je reálný.
2. **Definujte "hotovo" včas.** Pokud nespecifikujete úspěch, dostanete překvapivý scope creep.
3. **Vyberte si agenta, který odpovídá vašemu stylu práce.** Nenuťte se do workflow, který vám nesedí.
4. **Krátké cykly porazí heroické prompty.** Malé diffy, review, spuštění, opakování.

## Závěr

Claude Code a Codex nejsou jako Python, deterministické nástroje, kde výstup závisí jen na kódu.

Jsou spíš jako hudební nástroje.

Stejné noty, jiní muzikanti, jiný výkon.

A jakmile to přijmete, přestanete hledat "nejlepší kódovací AI" a začnete budovat nejlepší workflow pro sebe.
