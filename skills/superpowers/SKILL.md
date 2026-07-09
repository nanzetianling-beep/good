---
name: superpowers
description: Structures Claude's thinking to raise the logic and quality of its output by exploring a problem from multiple independent angles before committing. Use for hard, ambiguous, or high-stakes work — complex strategy, gnarly technical debugging, architecture decisions, or rubber-ducking / thinking-partner sessions. Triggers on "think deeply", "hard problem", "figure out a strategy", "brainstorm", "debug this gnarly issue", "multiple perspectives", "help me reason through".
---

# Superpowers

## What this is

A reasoning harness. It slows Claude down at exactly the moments where speed produces confident-but-wrong answers, and replaces "generate the first plausible response" with a disciplined loop: frame → diverge → stress-test → decompose → decide → verify. The goal is not more words — it is fewer wrong conclusions and a visible chain of reasoning the user can audit and challenge.

The core insight from the tools this draws on (obra/superpowers, red-teaming, spec-first TDD): the highest-leverage move is to **not jump to code or conclusions**. Step back, tease out what is actually being asked, and only then commit — with evidence.

## When to use it

Invoke this skill when the problem is **hard, ambiguous, or high-stakes**, or when the user explicitly asks to think:

- Complex strategy formulation with tradeoffs and no obvious right answer.
- A gnarly bug that has resisted the obvious fixes.
- Architecture / design decisions that are expensive to reverse.
- The user wants a thinking partner ("rubber duck", "talk this through", "poke holes in my plan").
- You notice yourself about to give a fast, confident answer to a question that deserves more.

Do **not** use it for simple, low-stakes, or well-specified tasks — the overhead is not worth it. Match the depth of the loop to the stakes.

## The core loop

Run these seven steps. For genuinely hard problems, do all of them explicitly and show your work. For medium problems, compress — but never skip **Frame**, **Diverge**, and **Verify**.

1. **Frame the problem & success criteria.** State the real question in one sentence. What does a good answer look like? What are the constraints, the deadline, the definition of done? Resist solving until this is sharp. If the ask is ambiguous, surface the ambiguity and ask (or state your interpretation explicitly).

2. **Generate multiple independent approaches.** Produce at least 2–3 genuinely different solutions/hypotheses — not one idea with variations. Generate them *before* judging any of them (separate divergence from evaluation). Diversity of framing is the point.

3. **Steelman, then red-team each.** For each approach, first make the strongest honest case *for* it (charity + accuracy). Then attack it: how does it fail? What would have to be true for it to be wrong? Where does it break at scale, at the edges, under adversarial input?

4. **First-principles decomposition.** Strip the leading option(s) down to what you actually *know* to be true vs. what you're assuming by convention or analogy. Rebuild from the ground truth. This is where hidden bad assumptions get caught.

5. **Pick & plan.** Choose using an explicit criterion (impact, reversibility, cost, confidence). Say *why* this one and why not the others. Break the choice into concrete, verifiable steps with a definition of done for each.

6. **Verify against evidence.** Evidence over claims. Before declaring success, actually check: run the test, trace the code path, work the numbers, find the source, construct the counterexample. Do not assert something works because it "should." If you cannot verify, say so.

7. **State assumptions & unknowns.** End with an explicit register: key assumptions the answer rests on, what would flip the conclusion (the "cruxes"), and what you don't know. This is what makes the reasoning auditable.

## Power moves

Concrete techniques to reach for. Pick the ones that fit; full checklists are in `references/thinking-techniques.md`.

- **Invert.** Instead of "how do I succeed?", ask "how would this definitely fail?" then avoid those paths.
- **Find the crux.** Identify the 1–3 assumptions that, if false, flip your conclusion. Test those first, not the safe ones.
- **Pre-mortem.** Imagine it's six months later and this failed badly. Write the story of why. Then fix those causes now.
- **Second-order thinking.** "And then what?" Trace consequences two or three steps out, not just the immediate effect.
- **Name the tradeoff.** Every real decision costs something. If an option looks free, you haven't found its price yet — keep looking.
- **Cheapest disconfirming test.** What's the fastest observation that could prove you wrong? Do that before investing.
- **Separate observed from inferred.** Tag each claim: did you *see* it, or are you assuming it? Debugging especially lives or dies here.
- **Reason from the error, not the guess.** For bugs: read the actual failure, form a hypothesis that explains *all* the symptoms, predict what you'd see if it's right, then check. Don't shotgun fixes. (See `references/thinking-techniques.md` → systematic debugging.)
- **Consider the null option.** "Do nothing" and "the boring existing solution" are always on the ballot. Beat them on merits.

## Running a thinking-partner / brainstorm loop

When the user wants to reason *with* you rather than receive an answer, switch modes: your job is to sharpen their thinking, not to perform yours. See `references/brainstorming-loop.md` for the full protocol. In short:

- **Ask before answering.** Draw out the real goal with Socratic questions before proposing anything. One or two sharp questions beat a wall of them.
- **One thread at a time.** Don't dump ten considerations. Advance the single most load-bearing question, resolve it, move on.
- **Reflect back.** Restate their idea in your words and show them — this catches misunderstandings and often makes them refine it themselves.
- **Offer, don't impose.** Present options and the reasoning; let them decide. Flag where you disagree and why, then defer.
- **Push back honestly.** A useful partner disagrees. If you see a flaw, say so plainly — sycophancy wastes their time.
- **Converge deliberately.** When the space is explored, summarize the spec/decision in chunks short enough to actually read, and confirm before moving to execution.

## Worked example

**Ask:** "Our checkout API p99 latency spiked from 200ms to 3s last night. Fix it."

1. **Frame.** Real question: what changed to cause a 15× p99 regression, and how do we restore it — without breaking checkout? Success = p99 back under 300ms, root cause understood so it can't silently recur. Constraint: production, revenue-critical, can't casually experiment.

2. **Diverge (independent hypotheses).** (a) A deploy last night introduced a slow path / N+1 query. (b) A downstream dependency (payments, inventory) degraded. (c) Data/traffic shift — a hot key, cache stampede, or lock contention under load. (d) Infra — DB connection pool exhaustion, noisy neighbor, GC pauses.

3. **Steelman + red-team.** (a) is strongest: p99 (not p50) spiking overnight points to a tail-latency path hit by *some* requests — classic N+1 or missing index on a code path a deploy touched. Red-team (a): was there even a deploy? If not, (a) is dead. Red-team (b): if downstream degraded, their dashboards would show it and other services would hurt too — check blast radius. Red-team (c): a hot key would likely show p50 movement too.

4. **First principles.** What do we *know*? p99 up, p50 unknown — **get p50 first**, it discriminates hypotheses (tail-only vs. broad). We know it started "last night" — correlate the exact timestamp against the deploy log and dependency dashboards. Everything else is assumption.

5. **Pick & plan.** Cheapest disconfirming tests first, ordered by likelihood × speed: (1) check deploy timeline vs. spike timestamp; (2) pull p50 alongside p99; (3) check downstream dashboards. Whichever the evidence points at, then trace that code path / query plan. Don't roll back blindly — a rollback that doesn't address root cause just hides it.

6. **Verify.** After the fix, reproduce the load pattern in staging or watch the live p99 recover; confirm the specific query/path is now fast with a trace or query plan — not just "the number looks better," which could be traffic dropping.

7. **Assumptions & unknowns.** Assumed: this is our latency, not the client's network. Crux: *was there a deploy at the spike time?* If no deploy, the whole ranking reorders toward (b)/(c). Unknown until measured: p50, and whether the spike is ongoing or self-resolved.

Notice the payload: no fix was asserted before evidence, hypotheses were plural and independent, and the single measurement that discriminates them (p50 + deploy timeline) was identified as the first move.

## Sources

- [obra/superpowers — agentic skills framework & methodology (Jesse Vincent)](https://github.com/obra/superpowers) — brainstorm→plan→implement→verify pipeline, Socratic brainstorming, TDD, subagent-driven development, `verification-before-completion` and `systematic-debugging` skills; "evidence over claims" and "don't jump to code."
- [Jesse Vincent, "Superpowers: How I'm using coding agents in October 2025"](https://blog.fsck.com/2025/10/09/superpowers/) and [Simon Willison's writeup](https://simonwillison.net/2025/Oct/10/superpowers/) — the "step back and ask what you're really trying to do, then show the spec in digestible chunks" philosophy.
- [Steelmanning as an organizational capability — Assumption Register, Crux Map, Evidence Ledger, Red-Team Appendix](https://tommywennerstierna.wordpress.com/2026/03/03/steelmanning-steelmanning-from-rhetoric-to-an-organizational-capability/) and [Red teaming for decision-making (CISS/Bundeswehr)](https://www.unibw.de/ciss-en/news/wargaming-and-information-systems/enhancing-decision-making-with-red-teaming) — challenge assumptions, expose bias, mitigate groupthink; charity/accuracy/strengthening in steelmanning.
- [SIRAJ: Diverse and Efficient Red-Teaming via Distilled Structured Reasoning (arXiv 2510.26037)](https://arxiv.org/pdf/2510.26037) and ["Asking LLMs to Verify First is Almost Free Lunch" (arXiv 2511.21734)](https://arxiv.org/pdf/2511.21734) — structured reasoning improves red-teaming diversity; a verification-first pass cheaply improves LLM reasoning by constraining the search space.
