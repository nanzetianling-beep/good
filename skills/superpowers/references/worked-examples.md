# Worked Examples — Complete Runs With Artifacts

Two full runs of the pipeline, with every artifact written out exactly as it should appear in a real session. The latency-spike example in SKILL.md shows the *shape* of a run; these show the *paper trail*. Imitate the shape and the artifact discipline, not the content.

---

## Example A — Strategy: "Should we build or buy our auth system?"

**Ask:** "We're an 8-person B2B SaaS startup. Enterprise prospects keep asking for SSO. Should we build auth ourselves or buy something like Auth0?"

This is a full pass: expensive to reverse (user store migration), real tradeoffs, ambiguity in what "auth" even means.

### 1. Frame

```
QUESTION: How do we get production-grade authentication (SSO, MFA, sessions) with
          8 engineers, given a SOC 2 audit due in 9 months and 2 enterprise deals
          blocked on SAML today?
SUCCESS:  Pipeline customers can SSO via their IdP within a quarter; auth controls
          pass the SOC 2 audit; ongoing maintenance ≤ a fraction of one engineer;
          per-user cost still sane at the 2-year seat forecast.
CONSTRAINTS: audit date is contractual (hard); no dedicated security engineer;
          ~$2k/mo current budget appetite; 5,000 existing users on homegrown
          email+password — avoid a forced password reset if possible.
INTERPRETATION: "auth" = authentication + org/SSO management only. Authorization
          (roles, permissions) stays in-app and is out of scope here.
```

Note the interpretation line: the stated ask ("build or buy auth") silently bundles authn and authz. Splitting them shrinks the problem by half.

### 2. Diverge

```
A) Managed IdP (Auth0 / Clerk class) — vendor hosts the user store, SSO, MFA; we integrate.
B) Self-host open source (Keycloak / Ory class) — we operate it; no per-user fees.
C) Build on libraries — own code for sessions/MFA + a SAML library; maximal control.
D) Hybrid — keep homegrown password auth; buy ONLY enterprise SSO (WorkOS-style SSO bridge).
   differ by: who operates the security-critical surface (vendor vs. us) and
   cost structure (per-user fee vs. flat infra vs. engineering time).
```

D is the "boring null-adjacent option" — smallest change to the status quo. It goes on the ballot even though nobody proposed it.

### 3. Steelman + red-team

```
A) FOR — fastest path to SSO+MFA; vendor's SOC 2 becomes an inherited control at
        audit; near-zero ops for a team with no security engineer.
   BREAKS — per-MAU pricing can turn hostile at scale; vendor outage = nobody can
        log in and we hold no lever; user-store lock-in if they can't export hashes.
   WRONG-IF — pricing at forecast seats is unacceptable, or there is no migration
        path out. (Both checkable this week: pricing page + export policy.)

B) FOR — no per-user fees ever; full data control; Keycloak is genuinely battle-tested.
   BREAKS — we now patch, upgrade, and 24/7-operate a security-critical service with
        zero security engineers; the audit now covers OUR ops instead of a vendor's.
   WRONG-IF — we had spare ops + security capacity. Per the constraints, we do not.

C) FOR — perfect product fit, no fees, no lock-in.
   BREAKS — SAML implementation is a known security minefield (signature-wrapping
        class of bugs); months of engineering; we own every CVE forever; this is
        exactly where auditors probe hardest.
   WRONG-IF — auth were our product's differentiator. It is not; it's table stakes.

D) FOR — smallest change; pay only for the feature that closes deals; the homegrown
        password path already works for 5,000 users.
   BREAKS — two auth code paths maintained forever; the homegrown path STILL has to
        pass SOC 2 on its own (MFA? lockout? reset-token hygiene?); MFA is unbuilt.
   WRONG-IF — the homegrown path is far from audit-ready. (Checkable: run it against
        the audit checklist now, before deciding.)
```

### 4. First principles

```
KNOW (observed/measured/sourced):
  - Audit in 9 months is in a signed customer contract.
  - 0 security engineers; 2 pipeline deals blocked on SAML (per sales CRM).
  - Current auth: bcrypt hashes, NO MFA, NO lockout, reset tokens never expire.
ASSUME (inferred/convention/habit):
  - "We'll have 50k seats in 2 years" [load-bearing for pricing — check: sales
    forecast actually says ~15k. Corrected downward.]
  - "A vendor is more secure than us" [load-bearing — check: vendor SOC 2 report
    + public breach history, not vibes.]
  - "We can migrate off a vendor later" [check: does the vendor export bcrypt
    hashes? Varies by vendor — verify before signing, not after.]
```

The audit checklist run against the homegrown path (from D's WRONG-IF) is the decisive fact: it fails three controls (no MFA, no lockout, non-expiring reset tokens). This kills D's main appeal — the "keep what works" path would need a rebuild anyway.

### 5. Decide

```
PICK: A (managed IdP)   ON: time-to-audit dominates, and we lack security ops capacity.
RUNNER-UP: D loses because the homegrown password path fails 3 audit controls as-is,
        so we would rebuild it anyway — paying the two-code-paths tax and getting
        nothing for it.
TRADEOFF ACCEPTED: ~$800/mo at the 15k-seat forecast (rising with seats), and login
        availability coupled to a vendor we don't control.
STEPS: 1) Verify in writing that the vendor imports bcrypt hashes (no forced reset).
       2) Spike a SAML login against a pipeline customer's IdP in a sandbox — timebox 3 days.
       3) Migrate the 5k users behind a feature flag, staged 1% → 100%.
       4) Map the vendor's SOC 2 controls onto our audit checklist with the auditor.
```

### 6. Verify

```
CHECK: pricing calculator at 15k and 50k MAU → ~$790/mo and ~$4,100/mo (screenshot
       saved; asked for the numbers in the order form). Vendor support confirmed
       bcrypt import. Sandbox SAML spike logged in end-to-end against a test IdP
       org in 2 days.
CAUSAL: the decision rests on "audit deadline dominates" — confirmed with the
       auditor that authentication controls are in scope and the current homegrown
       path fails 3 of them. So A wins for the reason claimed, not just on vibes.
UNVERIFIED: whether 50k-seat pricing is negotiable; the migration-OFF path is
       confirmed on paper only, never executed.
```

### 7. Register

```
ASSUMPTIONS: seat growth stays near the 15k forecast during the contract term;
       vendor uptime ≥ what we'd achieve self-hosting.
CRUXES (flip the conclusion if false):
       1) Hash import works on real production data — if false, a forced reset for
          5k users changes the migration cost class. [UNTESTED until step 3 pilot.]
       2) The audit date is truly immovable — if it slipped a year, option B
          re-enters the race. [Tested: it's contractual.]
UNKNOWNS: an enterprise customer demanding data residency could force partial
       self-hosting later.
CONFIDENCE: high on buy-vs-build; medium on WHICH vendor — most raised by running
       the step-2 spike against a second vendor before signing.
```

**What made this run work:** the interpretation line shrank the problem; the null-adjacent option (D) was forced onto the ballot and killed by a checkable fact rather than taste; the runner-up's loss condition was stated; and both cruxes are things a skeptic can go test.

---

## Example B — Debugging: intermittent double-charges (a race condition)

**Ask:** "About 0.3% of orders get charged twice. Only under load, never reproducible locally. Fix it."

This run uses the **systematic debugging** checklist from `references/thinking-techniques.md`. The pipeline steps compress into: read the failure → hypothesis table → discriminating tests → one fix → verify causally → register.

### 1. Read the actual failure (don't pattern-match yet)

Pull three affected orders and write down what is *observed*:

```
KNOW: two charge rows per affected order, ~30s apart, created by DIFFERENT worker
      hostnames; both rows reference the SAME queue job ID; happens only during
      the evening traffic peak; started (per billing complaints) ~3 weeks ago.
ASSUME (not yet checked): the client sent one request; the job was enqueued once;
      the workers are running the same code version.
```

The "same job ID, different hostnames" detail is load-bearing and easy to skip past. Slow down here.

### 2. Hypothesis table

State hypotheses that are *independent mechanisms*, and for each: does it explain **all** symptoms, what else would be true, and the cheapest test that discriminates it.

| # | Hypothesis | Explains all symptoms? | If true, we'd ALSO see | Cheapest discriminating test |
|---|---|---|---|---|
| H1 | Client double-submit (double-click, retry) | No — two submits would create two jobs, but both charges share one job ID | two POSTs for the order in the API access log | grep access logs for the 3 affected order IDs |
| H2 | Queue redelivery: first attempt exceeds visibility timeout, job re-runs after completion | Partially — the ~30s gap is suspicious (timeout is 30s) | first attempt's duration > 30s in worker logs | pull attempt durations for affected job IDs |
| H3 | Non-atomic job claim: two workers SELECT the same pending job before either marks it running | Yes — same job ID, different hosts, load-dependent | near-simultaneous claim log lines; claim code lacks atomicity | read the claim code path; diff claim timestamps |
| H4 | Producer enqueues the job twice | No — duplicate enqueue would produce two job IDs, not one | duplicate enqueue log lines per order | grep enqueue logs for affected orders |

Note H1 and H4 are already in tension with the observed "same job ID" fact — but run the cheap greps anyway rather than trusting the inference.

### 3. Run the discriminating tests (cheapest first, one at a time)

```
CHECK: access logs → exactly ONE POST per affected order.            H1 dead.
CHECK: enqueue logs → exactly ONE enqueue per affected order.        H4 dead.
CHECK: first-attempt duration for affected jobs → 3–5s, far under
       the 30s visibility timeout.                                   H2 weakened
       (the 30s gap was the SECOND worker's queue-poll interval, not
       a redelivery — coincidence explained).
CHECK: claim timestamps → worker-a claims job at T+0.000s,
       worker-b claims the SAME job at T+0.012s.                     H3 strongly supported.
```

### 4. Confirm the mechanism in the code (observed, not inferred)

Read the claim path. Found:

```sql
-- worker claim path (simplified)
SELECT id FROM jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1;
UPDATE jobs SET status = 'running', claimed_by = :host WHERE id = :id;
```

Check-then-act with no atomicity: between the `SELECT` and the `UPDATE`, a second worker can select the same row. The `UPDATE` has no `AND status = 'pending'` guard, so the second claim silently succeeds. Load-dependence explained: the race window only gets hit when many workers poll simultaneously.

**Predict-then-look (the step that separates a good session from a lucky one):** if H3 is the mechanism, it is not payment-specific — *every* job type should duplicate at ~0.3% under load, we just never noticed the harmless ones. Checked the email-notification jobs: 0.31% duplicate sends during peaks. A symptom nobody reported, predicted in advance and then found. The hypothesis now explains more than it was invented for.

### 5. Fix — ONE change, then measure

```
PICK: make the claim atomic —
        UPDATE jobs SET status='running', claimed_by=:host
        WHERE id = :id AND status = 'pending';
      and treat rowcount 0 as "lost the race, poll again."
ON:   smallest change that removes the mechanism; trivially reviewable.
RUNNER-UP: switch to SELECT ... FOR UPDATE SKIP LOCKED — better under high worker
      counts, but a bigger change to the polling loop; do it later if contention shows.
DELIBERATELY NOT BUNDLED: an idempotency key on the charge call is the right
      defense-in-depth, but shipping it in the SAME change would mask whether the
      claim fix actually worked. Ship the claim fix, measure, THEN add the key.
TRADEOFF ACCEPTED: losing workers burn a wasted poll cycle under contention.
```

### 6. Verify — causally, not just "the number improved"

```
CHECK: load test replaying production-shaped traffic at 3× peak → 0 duplicate
       claims in 200k jobs (the old code produced ~600 at that volume).
CAUSAL: duplicate EMAIL sends — the independent symptom predicted in step 4 —
       also dropped to zero in production the day the fix shipped. Two unrelated
       symptoms recovering from one change is strong evidence the mechanism, not
       the weather, was fixed.
UNVERIFIED: none for the fix itself; historical audit of past double-charges
       still running for refunds.
```

### 7. Register

```
ASSUMPTIONS: production DB isolation level matches staging (read committed) —
       the fix is correct under either, but the load test's fidelity assumes it.
CRUXES: the duplicate-email symptom stopping was the crux — had emails kept
       duplicating, the claim fix was masking the payment path, not solving the
       root cause. [Tested: they stopped.]
UNKNOWNS: how many historical orders were double-charged (audit in progress).
CONFIDENCE: high — the hypothesis explained all symptoms, predicted an unseen
       one, and the disconfirming load test came back clean.
FOLLOW-UP: add the idempotency key on the payment intent anyway, so any FUTURE
       duplicate claim (new bug, new queue) is harmless. Defense in depth,
       shipped as its own change.
```

**What made this run work:** the hypothesis table forced four *mechanisms* (not four guesses at the same mechanism); every kill was a cheap grep, run in cost order; the fix was one change with the tempting second fix explicitly deferred so the evidence stayed clean; and verification hinged on a *predicted* independent symptom, not just the reported number going quiet.
