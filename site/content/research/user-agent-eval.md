---
title: Simulated users for multi-turn evaluation
date: 2026-09-05
summary: A harness where a simulated user, distilled from a real conversation, talks to the model under test. The conversations it produces are the evaluation set, and difficulty is six behavioral dials instead of one.
tags: [user simulation, multi-turn, ThoughtTrace]
status: Demo
layout: wide
---

[Code on GitHub](https://github.com/EElaineYIN/user-agent-eval) · [Open the interactive demo](../../static/demos/user-agent-eval/)

## Idea

```
user agent  <-->  system under test  -->  evaluator agent
```

The **user agent** is a simulated user, not a label extractor and not a script player. It gets a persona card distilled from a real conversation and has to pursue that person's goal across turns, deciding what to say next from what it just heard back. Turn 1 is fixed (the real opening message, verbatim) so runs stay comparable. Every later turn is generated, so the benchmark does not go stale the moment the system under test changes its wording.

Ground truth comes from [ThoughtTrace](https://github.com/thoughttrace-project/ThoughtTrace) (Apache-2.0): 2,155 real multi-turn conversations across 20 models, annotated with the users' own *reasons* for each message and *reactions* to each reply. That gives the simulator something most user-simulator work lacks: a target. Every simulated turn can be scored against what the real person actually did at that point, and against the reason they recorded for doing it.

This is a first step toward the gap in [Do agent benchmarks model real users?](../user-realism-in-agent-benchmarks/): users whose goals are vague, revealed late or still changing.

## Generating an evaluation set

The main path: a simulated user talks to a model, and the conversations that come out *are* the evaluation set. Each item carries the conversation, the persona it came from, the difficulty settings that produced it, and the simulated user's own per-turn annotations (why it said each thing, and how it read the reply). The generated corpus therefore has the same annotation structure as the ThoughtTrace conversations it was distilled from.

### Difficulty is six dimensions, not one dial

A user who withholds their budget until turn five is hard in a different way from one who keeps changing their mind, and a model can be good at one and bad at the other.

| Dimension | What `low` means |
|---|---|
| `context_offering` | Terse; makes the assistant work for every detail |
| `satisfiability` | High bar; generic or templated answers are rejected |
| `goal_stability` | Changes direction partway through as their thinking evolves |
| `expression_clarity` | Vague quantifiers, unexplained references, assumed context |
| `constraint_disclosure` | Holds constraints back until a proposal violates one |
| `patience` | Two dead turns and they close the tab |

Easy, medium and hard are bundles of these, and any one can be overridden. Every setting describes *behavior*, never competence: a hard user is a realistic difficult person (terse, impatient, changing their mind), not an adversarial prompt. Conversations no real person would have are worthless as an evaluation set.

### Checking that the dial actually turns

Each corpus comes with a structural signature read straight off the transcripts. If a tier does not move these numbers, the dial is decorative. For 12 personas against `gpt-5.4-mini`:

| Tier | User turns (mean) | User message length (chars) | Resolved | Hit turn cap | Changed direction | Dissatisfied |
|---|---|---|---|---|---|---|
| Easy | 3.7 | 243 | 100% | 0% | 2% | 11% |
| Medium | 4.3 | 152 | 83% | 17% | 2% | 14% |
| Hard | 5.9 | 137 | 58% | 42% | 26% | 62% |

Harder users write shorter messages, need more turns, change direction more often and are far more often dissatisfied, and fewer conversations reach the goal. The dials move behavior in the intended direction.

## Evaluating a model against that set

Optional, and separate from generating the set. One run distills personas, puts the same simulated users in front of two systems, evaluates both and prints the comparison. Two systems on purpose: a run where everything scores 5/5 demonstrates nothing. The question is whether the harness can tell two systems apart.

Twelve simulated users, `gpt-4o-mini` vs `gpt-5.4`, paired (both meet the same users, so per-sample variation cancels):

| Metric | 4o-mini | 5.4 | Diff | 95% CI | | W-L |
|---|---|---|---|---|---|---|
| Goal achieved | 0.92 | 0.92 | +0.00 | | tied | |
| Outcome score (1 to 5) | 4.17 | 4.67 | +0.50 | [-0.29, +1.29] | unresolved | 8W-1L |
| Clarification quality | 3.33 | 4.33 | +1.00 | [+0.39, +1.61] | **resolved** | 9W-1L |
| Instruction following | 3.83 | 4.83 | +1.00 | [+0.28, +1.72] | **resolved** | 8W-1L |
| User turns needed | 5.17 | 3.83 | -1.33 | [-2.28, -0.38] | **resolved** | 8W-1L |

**Outcome ties; process separates.** Both systems eventually get the user what they came for. One takes 5.2 turns with 1.25 redundant ones, the other 3.8 with 0.25. Score only the endpoint and the two models look identical, which is the argument for evaluating the process and not just the result.

The simulated user also behaves differently against each system instead of reading from a script. In the interview-prep sample, `gpt-4o-mini` kept returning templates full of `[Company Name]` placeholders and the user pushed back seven times without getting anywhere; `gpt-5.4` asked for context and then ran an actual mock interview, and the same user engaged and answered.

### What the exported set looks like

**No turns are frozen in it.** One item is an opening message, a persona card (goal, concerns, known constraints, behavior, tone), a success condition and a give-up condition. A multi-turn eval set cannot be a script of turns: freeze the middle turns and the benchmark dies as soon as the system under test words things differently. What survives a model change is the user.

## Two modes, and why both exist

**Teacher mode: is the simulated user behaving like a real one?** At every real user turn, the user agent sees the *real* conversation so far and predicts the next user turn. The prediction is scored against what the person actually wrote, then discarded; the next position starts from the real prefix again. Nothing diverges, so every position is a fair comparison. (Running the simulator freely against a fixed script of assistant replies does not work: it diverges at turn two and the numbers measure the mismatch, not the simulator. The harness first shipped that way, and the first real run made it obvious.)

**Live mode: how does this system do against that user?** A real model on the other side, the conversation goes where it goes, and an evaluator scores the result. Per-turn comparison with the real trajectory is meaningless here, so fidelity is reported as not applicable.

## What gets measured

**Fidelity** (teacher mode), always read against the majority-class baseline because the labels are heavily skewed (about half of real reactions are plain affirmation):

| Metric | Question |
|---|---|
| Reason label accuracy | Did the simulator want what the real user wanted, for the reason they recorded? |
| Reaction label accuracy | Did it read the assistant's reply the way the real user did? |
| Next-message intent match | Is the predicted message doing the same conversational job? (LLM judge) |
| Premature stop rate | Did it declare victory while the real user kept pushing? |
| End detection rate | Did it stop where the real user actually stopped? |

Turn 1 is excluded throughout since it is copied verbatim. Numbers are pooled per scored position.

**Stability** across identical repeats decides whether any model-vs-model comparison means anything: a gap smaller than the spread is user-agent noise. This matters more than usual because current models no longer expose a usable sampling knob, so stability has to be measured, not pinned to zero.

**Evaluation** (live mode) scores outcome (was the success condition met) separately from process (turns to resolution, redundant turns, clarification quality, instruction following).

## Leakage control

By default the persona distiller sees only what was knowable before the conversation unfolded: the opening message, the user's own task summary and expectation, demographics, and their thoughts on the opening message. The rest is held out for scoring. A "full" setting feeds the card everything the person later revealed; that is a ceiling, optimistic by construction, and never reported side by side without saying which is which.

Thoughts alone are not a sufficient ceiling. Concrete constraints ("3 or 4 days", "500 euros", "travelling alone") live in the messages, so the card carries them in `known_constraints`, which the distiller must leave empty rather than invent. A fabricated budget is worse than no budget, because the simulator will then state it as fact.

## Known limits

- The dataset is entirely English.
- Each source conversation was held with one model, so there are no A/B pairs in the data itself; comparisons come from re-running systems under test.
- The recorded assistant side is a plain chat assistant with no tool calls or traces. The harness can validate the user agent and outcome evaluation, but not agent-style process evaluation; that needs traces from a real agent.
- Running the user agent, judge and evaluator on the same model family as the system under test invites self-preference bias. Use different families when the comparison matters.
- At 12 samples most differences are unresolvable; the run reports them as unresolved rather than as results.
