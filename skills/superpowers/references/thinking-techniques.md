# Thinking Techniques — Power Move Checklists

Reach for the checklist that matches the situation. These expand the "Power moves" in SKILL.md. Don't run all of them; pick the 3–5 that bite hardest for this problem.

## Framing a hard problem

- [ ] State the real question in one sentence. If you can't, you don't understand it yet.
- [ ] What does a *good* answer look like concretely? Write the success criteria down.
- [ ] What are the hard constraints (time, budget, reversibility, must-not-break)?
- [ ] Who is the answer for, and what will they *do* with it? Fit depth to that.
- [ ] What is the actual question behind the stated question? (Often the ask is a symptom.)
- [ ] What's the null option — do nothing / the boring existing solution? Put it on the ballot.

## Divergence — generating options (do this BEFORE judging)

- [ ] Force at least 3 genuinely different approaches, not one idea with trim variations.
- [ ] Vary the *framing*, not just the parameters: different mechanism, different scope, different actor.
- [ ] Ask "what would an expert in a *different* field do here?"
- [ ] Ask "what's the version that's 10× cheaper? 10× more ambitious?"
- [ ] Include at least one option you don't currently like — steelman it anyway.
- [ ] Keep evaluation OFF during this phase. Judging early kills the good weird ideas.

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
- [ ] Who is harmed / who pays the cost that isn't in the happy path?
- [ ] Groupthink check: am I liking this because it's good, or because it's familiar / mine?

## First-principles decomposition

- [ ] List what you actually *know* to be true (measured, sourced, proven).
- [ ] List what you're *assuming* by convention, analogy, or habit.
- [ ] For each assumption: is it load-bearing? Could it be false? How would I check?
- [ ] Rebuild the solution from the known facts only. Does it still look the same?
- [ ] Separate observed from inferred on every claim — tag each.

## Deciding

- [ ] Name the explicit selection criterion (impact, reversibility, cost, confidence, speed).
- [ ] For a one-way door (hard to reverse): raise the bar, gather more evidence. For a two-way door: bias to action.
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
- [ ] Reproduce it reliably first. An intermittent repro is a clue, not a nuisance — what makes it fire?
- [ ] State a hypothesis that explains *all* the symptoms, not just the convenient one.
- [ ] Predict: "if this hypothesis is right, I will also see X." Then go look for X.
- [ ] Change ONE thing at a time. Shotgun fixes destroy the evidence trail.
- [ ] Bisect the search space: what's the last known-good point? Binary-search from there.
- [ ] Question the layer you trust most — the bug often hides where you "know" it can't be.
- [ ] When fixed, confirm you understand *why* the fix works. A fix you can't explain may be masking, not solving.

## Closing register (make reasoning auditable)

- [ ] Key assumptions the answer rests on.
- [ ] Cruxes: the 1–3 assumptions that, if false, flip the conclusion.
- [ ] Known unknowns: what you don't know and how it could change things.
- [ ] Confidence level, honestly stated, and what would raise it.
