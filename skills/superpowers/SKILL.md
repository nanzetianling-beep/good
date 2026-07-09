---
name: superpowers
disable-model-invocation: true
description: Structures Claude's thinking to raise the logic and quality of its output by attacking a problem from several independent angles before committing. Use for hard, ambiguous, or high-stakes work — complex strategy, gnarly technical debugging, architecture decisions costly to reverse, or thinking-partner / rubber-duck sessions. Triggers on "think deeply", "hard problem", "figure out a strategy", "brainstorm", "debug this gnarly issue", "multiple perspectives", "poke holes in my plan".
---

# Superpowers

## What this is

A reasoning harness. It slows Claude down at exactly the moments where speed produces confident-but-wrong answers, and replaces "emit the first plausible response" with a disciplined loop: **frame → diverge → stress-test → decompose → decide → verify → register**. The output is not more words — it is fewer wrong conclusions and a chain of reasoning the user can audit and challenge.

The load-bearing insight from the sources this draws on (obra/superpowers, red-teaming practice, verification-first prompting): the single highest-leverage move is to **not jump to code or a conclusion**. Step back, tease out what is actually being asked, attack it from angles that could each be right, and only then commit — with evidence.

## When to use it — and how deep to go

Invoke when the problem is **hard, ambiguous, or high-stakes**, or when the user explicitly asks to think. Do **not** use it for simple, well-specified, low-stakes tasks — the overhead outweighs the payoff. Match depth to stakes with a **depth dial**:

- **Quick pass** (medium stakes, some ambiguity): run Frame, Diverge, Verify explicitly; compress the rest in your head. A few sentences.
- **Full pass** (high stakes, gnarly, or one-way-door decisions): run all seven steps explicitly and **show your work** so the user can challenge each link.

Signals to reach for it: no obvious right answer with real tradeoffs; a bug that survived the obvious fixes; an expensive-to-reverse decision; the user says "rubber duck / talk this through / poke holes"; or you catch yourself about to give a fast, confident answer to a question that deserves more.

### Choosing your depth

| Time available | Low stakes | Medium stakes | High stakes / one-way door |
|---|---|---|---|
| **Minutes** | Skip the skill; just answer | Quick pass, artifacts compressed into one paragraph | Quick pass **written down**, plus an explicit flag: "depth was time-capped; a full pass would also stress-test X and Y" |
| **An hour** | Skip the skill; just answer | Quick pass with the Frame and Register artifacts written out | Full pass — all seven artifacts written |
| **A day or more** | Quick pass only if genuinely ambiguous | Full pass | Full pass; revisit the Register as new evidence lands |

"Artifacts" are the per-step outputs specified in the core loop below. The rule of thumb: the more it costs to be wrong, the more of the loop gets written down where the user can audit it.

## The core loop

Each step produces a small written **artifact**. On a full pass, all seven appear in your output (or working notes) so every link in the chain is inspectable; on a quick pass, write artifacts 1, 2, and 6 and compress the rest. Two complete runs with every artifact filled in — a build-vs-buy strategy decision and a race-condition debugging session — are in `references/worked-examples.md`.

1. **Frame the problem & success criteria.** State the real question in one sentence. What does a good answer concretely look like? What are the hard constraints (time, budget, reversibility, must-not-break)? Resist solving until this is sharp. If the ask is ambiguous, surface the ambiguity — ask, or state your interpretation explicitly and proceed.

   ```
   QUESTION: <the real ask, one sentence>
   SUCCESS:  <what a good answer observably looks like>
   CONSTRAINTS: <hard limits>   INTERPRETATION: <stated, if the ask was ambiguous>
   ```

2. **Diverge: generate independent approaches.** Produce at least 2–3 *genuinely different* solutions or hypotheses — different mechanism/scope/actor, not one idea with trim variations. Generate them **before** judging any of them; early evaluation kills the good weird ideas. Diversity of framing is the point.

   ```
   A) <name> — <mechanism, one line>
   B) <name> — <different mechanism/scope/actor>
   C) <name> — <...>            differ by: <the axis that makes them independent>
   ```

3. **Steelman, then red-team each.** First make the strongest honest case *for* each option (charity + accuracy — don't secretly weaken it). Then attack it: how does it fail concretely? What would have to be true for it to be wrong? Where does it break at the edges (0, 1, a million), under adversarial input, under concurrency, at scale?

   ```
   <option>:  FOR — <strongest honest case, one line>
              BREAKS — <concrete failure mode(s), not vague "risks">
              WRONG-IF — <condition that would kill it; is it checkable?>
   ```
   (one block per option still standing)

4. **First-principles decomposition.** Strip the leading option down to what you actually *know* to be true vs. what you're assuming by convention, analogy, or habit. Tag each claim **observed vs. inferred**. Rebuild from ground truth. This is where hidden bad assumptions surface.

   ```
   KNOW (observed/measured/sourced): <facts>
   ASSUME (inferred/convention/habit): <claim> [load-bearing? how to check?] — one per line
   ```

5. **Decide & plan.** Choose on an explicit criterion (impact, reversibility, cost, confidence, speed). Say *why this one and why not the runner-up* — if you can't say why the runner-up loses, you haven't compared them. Name the tradeoff you're accepting. Break the choice into concrete, verifiable steps.

   ```
   PICK: <option>   ON: <criterion>   RUNNER-UP: <option> loses because <specific reason>
   TRADEOFF ACCEPTED: <the cost you're knowingly paying>
   STEPS: 1) <verifiable step>  2) <...>  3) <...>
   ```

6. **Verify against evidence.** Evidence over claims. Before declaring success, actually check: run the test, trace the path, work the numbers, find the source, construct the counterexample. Distinguish "the number improved" from "the number improved *for the reason I claim*." If you cannot verify, say so and mark it unverified.

   ```
   CHECK: <what you actually ran / traced / computed> → SAW: <observed result>
   CAUSAL: improved *because* <claimed mechanism>, shown by <evidence>
   UNVERIFIED: <anything you could not check, and why>
   ```

7. **Register assumptions & unknowns.** Close with: key assumptions the answer rests on; the 1–3 **cruxes** that would flip the conclusion if false; known unknowns; and honest confidence. This is what makes the reasoning auditable — and tells the user exactly where to push.

   ```
   ASSUMPTIONS: <what the answer rests on>
   CRUXES (flip the conclusion if false): <1–3, flag which are untested>
   UNKNOWNS: <known gaps>   CONFIDENCE: <low/med/high> — most raised by <one thing>
   ```

## Power moves

Concrete techniques. Pick the 3–5 that bite hardest; full checklists — plus the "smell" that tells you to reach for each move — in `references/thinking-techniques.md`.

- **Verify-first.** Before generating your own answer, take a candidate answer — even a rough or deliberately wrong strawman — and *critique* it. Checking an answer runs "backwards" from producing one and recruits critical thinking that forward generation skips; it cheaply catches logical errors before you commit. (Backed by the "verify first" research in `## Sources`.)
- **Invert.** Instead of "how do I succeed?", ask "how would this definitely *fail*?" then design the failure paths out.
- **Find the crux.** Identify the 1–3 assumptions that, if false, flip your conclusion. Test *those* first — not the safe ones you're already sure of.
- **Rotate perspectives.** Re-examine the problem through distinct lenses — an expert in a different field, the person who'll maintain this in a year, an adversary trying to break it, the skeptic on the team. Each lens surfaces failure modes the others are blind to. This is the "multiple independent angles" of the whole skill made concrete.
- **Pre-mortem.** It's six months later and this failed badly. Write the story of *why*. Then fix those causes now.
- **Second-order thinking.** "And then what?" Trace consequences two or three steps out, not just the immediate effect.
- **Name the tradeoff.** Every real decision costs something. If an option looks free, you haven't found its price yet — keep looking.
- **Cheapest disconfirming test.** What is the single fastest observation that could prove you wrong? Do that before investing.
- **Reason from the error, not the guess.** For bugs: read the *actual* failure fully, form a hypothesis that explains *all* symptoms, predict what else you'd see if it's right, then look. Change one thing at a time. Don't shotgun fixes. (See `references/thinking-techniques.md` → systematic debugging.)
- **Consider the null option.** "Do nothing" and "the boring existing solution" are always on the ballot. Beat them on merits or take them.

## Running a thinking-partner / brainstorm loop

When the user wants to reason *with* you rather than receive an answer, switch modes: your job is to sharpen *their* thinking, not to perform yours in a monologue. Full protocol in `references/brainstorming-loop.md`. In short:

- **Ask before answering.** Draw out the real goal with one or two sharp Socratic questions before proposing anything. One load-bearing question beats a wall of them.
- **One thread at a time.** Don't dump ten considerations. Advance the single question that unlocks the most, resolve it, then open the next.
- **Reflect back.** Restate their idea in your own words — this catches misunderstandings and often makes them refine it themselves.
- **Push back honestly.** A useful partner disagrees. Steelman their view first, then name the flaw plainly. Sycophancy wastes their time.
- **Converge in digestible chunks.** When the space is explored, summarize the emerging spec/decision in pieces short enough to actually read, and get explicit sign-off before moving to execution.

## Worked example

**Ask:** "Our checkout API p99 latency spiked from 200ms to 3s last night. Fix it."

1. **Frame.** Real question: *what changed* to cause a 15× p99 regression, and how do we restore it without breaking checkout? Success = p99 back under 300ms **and** root cause understood so it can't silently recur. Constraint: production, revenue-critical — can't casually experiment.

2. **Diverge (independent hypotheses).** (a) A deploy last night introduced a slow path / N+1 query. (b) A downstream dependency (payments, inventory) degraded. (c) Data/traffic shift — a hot key, cache stampede, or lock contention under load. (d) Infra — DB connection-pool exhaustion, noisy neighbor, or GC pauses.

3. **Steelman + red-team.** (a) is strongest: p99 (not p50) spiking overnight points to a *tail-latency* path hit by some requests — classic N+1 or a missing index on a code path a deploy touched. Red-team (a): was there even a deploy at that time? If not, (a) is dead. Red-team (b): if a downstream degraded, *its* dashboards would show it and other services would hurt too — check the blast radius. Red-team (c): a hot key would likely move p50 as well, not just the tail.

4. **First principles.** What do we actually *know*? p99 up; p50 **unknown** — so get p50 first, it discriminates tail-only (points to a/c) from broad (points to b/d). We know it started "last night" — correlate the *exact* timestamp against the deploy log and dependency dashboards. Everything else is inference.

5. **Decide & plan.** Cheapest disconfirming tests first, ordered by likelihood × speed: (1) deploy timeline vs. spike timestamp; (2) pull p50 alongside p99; (3) scan downstream dashboards. Then trace whichever the evidence points at (query plan / span waterfall). Do **not** roll back blindly — a rollback that doesn't address root cause just hides it and burns the evidence.

6. **Verify.** After the fix, watch live p99 recover *and* confirm the specific query/path is now fast via a trace or query plan — not just "the number looks better," which could be traffic dropping off. Distinguish recovery from coincidence.

7. **Register.** Assumed: this is *our* latency, not the client's network. Crux: **was there a deploy at the spike time?** — if no deploy, the whole ranking reorders toward (b)/(c). Unknown until measured: p50, and whether the spike is ongoing or already self-resolved. Confidence: medium until step 1's timeline lands.

Note the payload: no fix asserted before evidence, hypotheses plural and independent, and the *single* cheap measurement that discriminates them (p50 + deploy timeline) named as the first move.

Two more complete runs, with every step's artifact written out in full: **a build-vs-buy strategy decision** (full pipeline) and **a race-condition debugging session** (systematic-debugging checklist, hypothesis table, discriminating tests, closing register) — see `references/worked-examples.md`. Imitate their shape, not their content.

## Sources

- [obra/superpowers — agentic skills framework & methodology (Jesse Vincent / Prime Radiant)](https://github.com/obra/superpowers) — real skills incl. `brainstorming` (Socratic design refinement), `writing-plans`, `systematic-debugging` (root-cause phases), `verification-before-completion`, `subagent-driven-development`; core principles "evidence over claims," "systematic over ad-hoc," and "don't jump to code — clarify first."
- [Jesse Vincent, "Superpowers: How I'm using coding agents in October 2025"](https://blog.fsck.com/2025/10/09/superpowers/) and [Simon Willison's writeup (Oct 10, 2025)](https://simonwillison.net/2025/Oct/10/superpowers/) — the brainstorming skill "presents the emerging design in digestible sections for your explicit approval": step back, extract the spec through dialogue, show it in chunks short enough to actually read.
- ["Asking LLMs to Verify First is Almost Free Lunch" — Wu & Yao, arXiv 2511.21734](https://arxiv.org/abs/2511.21734) — prompting a model to verify a candidate answer (even a random one) *before* solving triggers a complementary "reverse reasoning" pass that recruits critical thinking and reduces logical errors at minimal cost. Basis for the **verify-first** power move.
- [SIRAJ: Diverse and Efficient Red-Teaming for LLM Agents via Distilled Structured Reasoning — arXiv 2510.26037](https://arxiv.org/abs/2510.26037) — a structured reasoning format materially improves the *diversity* and efficiency of adversarial probing; support for enforcing multiple independent angles rather than one line of attack.
- [Enhancing Decision-Making with Red Teaming — CISS, Universität der Bundeswehr München](https://www.unibw.de/ciss-en/news/wargaming-and-information-systems/enhancing-decision-making-with-red-teaming) — red teaming as a proven method to challenge assumptions, expose bias, and mitigate groupthink; core principles include applied critical thinking and groupthink mitigation. Basis for the steelman → red-team and rotate-perspectives moves.
