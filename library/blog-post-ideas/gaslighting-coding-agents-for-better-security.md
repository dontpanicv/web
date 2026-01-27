# Idea: “Gaslighting” coding agents for better security

## Working title options
- Gaslighting Coding Agents for Better Security
- Adversarial Prompts as a Security Tool (Safely)
- “A pentester got RCE” — What happens when you tell an agent that (and it believes you)?

## Perex (draft)
Testing our application’s security by telling a coding agent (with access to the monorepo) that a pentester was able to achieve RCE on the server using some feature of the product — stated as a fact. It is not true, but the LLM doesn’t know that. Using the latest and smartest models, you let them try to *invent and trace* a plausible attack vector, then you review what they found as hypotheses to harden the system.

## Core concept
A coding agent with repo access can behave like a **motivated attacker** if you seed it with a believable incident report.
Instead of asking “find vulnerabilities,” you give it a *narrative constraint*:
> “We already got popped. Figure out how.”

That pushes the model to:
- enumerate likely trust boundaries
- look for obvious injection points
- reason about deserialization / SSRF / template injection / command execution
- follow data flows more aggressively

## Why this can work
- It bypasses the “nothing is wrong” bias.
- It encourages end-to-end reasoning (“how could this become RCE?”), not just lint-level issues.
- The agent is forced to propose concrete payloads and paths (useful as test cases).

## Method / workflow (safe version)
1) **Set scope**
   - Only test within a dedicated branch + sandbox environment.
   - No production secrets. No real customer data.

2) **Write a fictional incident report**
   - “Pentester achieved RCE via X feature, likely through Y endpoint.”
   - Keep it vague enough to avoid anchoring on one wrong guess.

3) **Ask the agent to generate hypotheses**
   - “List 10 plausible attack chains, rank by likelihood, point to code locations.”

4) **Convert hypotheses into security tests**
   - Add regression tests / fuzz cases.
   - Add guardrails (input validation, sandboxing, allowlists, escaping, auth checks).

5) **Reality check**
   - Reproduce in a controlled environment.
   - Treat model output as *untrusted* until verified.

## Things to emphasize (so it’s not irresponsible)
- This is not “gaslighting people,” it’s **adversarial prompting** or **incident-simulation prompting**.
- The model can hallucinate. Output must be verified.
- Avoid giving the agent tools that can actually exploit live infrastructure.
- Ensure legal/ethical boundaries and explicit authorization.

## Suggested outline
1. The problem: “agents are optimistic auditors”
2. The trick: incident simulation prompting
3. Example prompt template
4. What the agent tends to find (common attack classes)
5. Turning hypotheses into tests + mitigations
6. Failure modes: hallucinations, tunnel vision, overfitting
7. Guardrails + recommended setup
8. Conclusion: treat it as a generator of hypotheses, not a security oracle

## Prompt template (draft)
> We have a report from a pentest: they achieved RCE on the server. Assume this is true.
> Your task is to propose the most plausible attack chain(s) in this codebase.
> Constraints:
> - Do not run any exploits against real systems.
> - Work only from repo code and local reasoning.
> - Provide code pointers (files/functions) and a step-by-step chain.
> - For each hypothesis, propose a mitigation and a regression test.

## Tags / keywords
- llm security
- coding agents
- threat modeling
- rce
- prompt engineering
- adversarial testing

## Notes
- Consider renaming “gaslighting” in the final piece if you want a more professional tone.
- Could pair with a follow-up post: “How to sandbox coding agents (repo access, secrets, permissions)."
