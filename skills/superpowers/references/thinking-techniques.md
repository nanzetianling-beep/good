# Thinking Techniques — Power Move Checklists

Reach for the checklist that matches the situation. These expand the "Power moves" in SKILL.md. Don't run them all — pick the 3–5 that bite hardest for *this* problem.

## Trigger smells — which move, and when

Each power move has a smell that should make your hand reach for it:

- **Verify-first.** Smell: you're about to deliver a fluent, confident answer and nothing has pushed back on it yet — or a plausible answer already exists (yours or the user's) and everyone is nodding.
- **Invert.** Smell: the plan is all happy path; you can list five benefits but not one concrete way it fails.
- **Find the crux.** Smell: a long list of assumptions all treated as equally important — or you notice you're testing the claims you're already sure of, because they're the easy ones.
- **Rotate perspectives.** Smell: consensus arrived fast, everyone in the (real or simulated) room shares one background, and the design has no named adversary or skeptic.
- **Pre-mortem.** Smell: commitment is imminent and every sentence so far has been about how this succeeds; "what could go wrong" got one hand-wave.
- **Second-order thinking.** Smell: the justification stops at the immediate effect ("this makes X faster") with nothing about what the people or systems downstream of X do *next*.
- **Name the tradeoff.** Smell: one option looks strictly dominant — a comparison row with no cons. Free options mean an unpriced cost.
- **Cheapest disconfirming test.** Smell: you're about to spend hours building on a belief you could check in minutes, or the plan's very first step is its most expensive one.
- **Reason from the error, not the guess.** Smell: you caught yourself pattern-matching a bug to a familiar cause before finishing reading the failure output — or wanting to try a fix "just to see if it helps."
- **Consider the null option.** Smell: "do nothing" never appeared on the ballot, and the status quo has only been described by its flaws, never its costs-avoided.

## Framing a hard problem

- [ ] State the real question in one sentence. If you can't, you don't understand it yet.
- [ ] What does a *good* answer look like concretely? Write the success criteria down.
- [ ] What are the hard constraints (time, budget, reversibility, must-not-break)?
- [ ] Who is the answer for, and what will they *do* with it? Fit depth to that.
- [ ] What is the actual question behind the stated question? (The ask is often a symptom.)
- [ ] Put the null option on the ballot — do nothing / the boring existing solution.

## Divergence — generating options (do this BEFORE judging)

- [ ] Force at least 3 *genuinely different* approaches, not one idea with trim variations.
- [ ] Vary the *framing*, not just parameters: different mechanism, scope, actor, timescale.
- [ ] Ask "what would an expert in a *different* field do here?"
- [ ] Ask "what's the version that's 10× cheaper? 10× more ambitious?"
- [ ] Include at least one option you don't currently like — steelman it anyway.
- [ ] Keep evaluation OFF during this phase. Judging early kills the good weird ideas.

## Rotate perspectives (multiple independent angles)

Re-run the problem through distinct lenses; each is blind to what the others catch.
- [ ] **The maintainer** who inherits this in a year with no context. What confuses them?
- [ ] **The adversary** actively trying to break, abuse, or exploit it. Where do they get in?
- [ ] **The skeptic** who thinks the whole premise is wrong. What's their strongest point?
- [ ] **The domain expert from a different field** (a physicist, an accountant, a lawyer).
- [ ] **The user** who doesn't care how it works, only whether it solves their real problem.
- [ ] Where do two lenses disagree? That tension usually marks the real risk or tradeoff.

## Verify-first (critique before you generate)

Checking an answer runs backwards from producing one and recruits critical thinking that forward generation skips. Cheap, and catches logical errors early.
- [ ] Write down a candidate answer — even a rough or deliberately-wrong strawman.
- [ ] Argue *against* it: where does it not hold up? What does it fail to explain?
- [ ] Let that critique reshape the answer you actually give, rather than defending the first draft.
- [ ] For a claimed result, verify it as if a rival produced it and you're paid to falsify it.

## Steelman + red-team (per option)

Steelman first (be fair, then be brutal):
- [ ] Charity: state the option in its strongest, most reasonable form.
- [ ] Accuracy: preserve its actual commitments — don't secretly weaken it.
- [ ] Strengthen: add the best evidence/reasons its proponent would give.

Then red-team:
- [ ] How does this fail? List concrete failure modes, not vague "risks."
- [ ] What must be true for this to be *wrong*? Are those things actually true?
- [ ] Edges & scale: what breaks at 0, at 1, at a million, under adversarial input, under concurrency?
- [ ] Second-order: "and then what?" — trace consequences 2–3 steps out.
- [ ] Who is harmed / who pays a cost that isn't in the happy path?
- [ ] Groupthink check: am I liking this because it's good, or because it's familiar / mine?

## First-principles decomposition

- [ ] List what you actually *know* to be true (measured, sourced, proven).
- [ ] List what you're *assuming* by convention, analogy, or habit.
- [ ] For each assumption: is it load-bearing? Could it be false? How would I check?
- [ ] Rebuild the solution from the known facts only. Does it still look the same?
- [ ] Tag every claim **observed vs. inferred**. Debugging especially lives or dies here.

## Deciding

- [ ] Name the explicit selection criterion (impact, reversibility, cost, confidence, speed).
- [ ] One-way door (hard to reverse): raise the bar, gather more evidence before committing.
- [ ] Two-way door (cheap to reverse): bias to action; the experiment *is* the analysis.
- [ ] Name the tradeoff you're accepting. If it looks free, you haven't found the price.
- [ ] Say why the runner-up loses. If you can't, you haven't really compared them.
- [ ] Pre-mortem: it's 6 months later and this failed. Write why. Fix those causes now.

## Verification (evidence over claims)

- [ ] What's the cheapest disconfirming test — the fastest thing that could prove me wrong?
- [ ] Actually run it / trace it / compute it / find the source. Don't assert "should work."
- [ ] Distinguish "the number improved" from "the number improved *for the reason I claim*."
- [ ] Look for the counterexample before declaring a rule.
- [ ] If you cannot verify, say so explicitly and mark the claim as unverified.

## Systematic debugging (for gnarly bugs)

Adapted from the "read the error, form a real hypothesis, don't shotgun" discipline.
- [ ] Read the *actual* error / failure output fully. Don't pattern-match to a guess.
- [ ] Reproduce it reliably first. An intermittent repro is a clue — what makes it fire?
- [ ] State a hypothesis that explains *all* the symptoms, not just the convenient one.
- [ ] Predict: "if this hypothesis is right, I will also see X." Then go look for X.
- [ ] Change ONE thing at a time. Shotgun fixes destroy the evidence trail.
- [ ] Bisect the search space: what's the last known-good point? Binary-search from there.
- [ ] Question the layer you trust most — the bug often hides where you "know" it can't be.
- [ ] When fixed, confirm you understand *why* the fix works. A fix you can't explain may be masking, not solving.

## Closing register (make reasoning auditable)

- [ ] Key assumptions the answer rests on.
- [ ] Cruxes: the 1–3 assumptions that, if false, flip the conclusion. Flag which are untested.
- [ ] Known unknowns: what you don't know and how it could change things.
- [ ] Confidence level, honestly stated, and the single thing that would most raise it.
