---
title: Model evaluation vs. harness evaluation
date: 2026-10-17
summary: What changes when the thing under test is the whole system around the model, why a bad agent result is not always a bad model, and where model and agent evaluation still fall short.
tags: [agents, harness, methodology]
---

## The short version

- **Model evaluation** asks: how good is the model itself?
- **Harness evaluation** asks: how good is the whole system built around the model?

> Model eval measures the capability of the underlying model under a controlled interface, while harness eval measures the end-to-end behavior of the system that orchestrates the model, tools, context, memory and execution environment.

| | Model evaluation | Harness evaluation |
|---|---|---|
| Unit evaluated | The underlying LLM | The agent or system that wraps the model |
| Typical input | Prompt → model response | User request → multi-step system execution |
| What is held fixed | Prompting and tool environment are usually controlled | The model may be fixed while orchestration changes |
| Focus | Reasoning, knowledge, instruction following, safety, coding | Tool use, planning, memory, context management, retries, routing, execution |
| Example failure | The model gives the wrong answer | The model knows what to do, but the system calls the wrong tool |
| Example benchmarks | MMLU, GPQA, HumanEval-style tests | Agent benchmarks, computer-use tasks, end-to-end workflow evaluations |

## An example

> "Find a restaurant near Stanford for Friday night, make sure it has vegetarian options, and book it for four people."

In a **model eval**, you might test whether the LLM understands the constraints, reasons about what information it needs, or produces a sensible plan.

In a **harness eval**, you test whether the complete agent can actually do the job: search restaurants, use the reservation tool correctly, keep the party size and the dietary constraint across steps, recover when a restaurant has no availability, and end with the correct reservation.

## What "harness" means

The harness is the infrastructure around the model:

```
User → Harness → Model → Harness → Tools/environment → Harness → Model → User
```

It can include the system prompt, tool definitions, context construction, memory, tool routing, retry logic, planning loops, state management, output parsing and stopping logic.

## Why the distinction matters

A bad result does not necessarily mean the model is bad. Roughly:

> Agent performance = f(model, harness, tools, environment)

- If the model correctly outputs `search_calendar(date="Friday")` but the harness serializes "Friday" into the wrong date, that is a **harness failure**, not a model failure.
- If the tools and orchestration work correctly but the model decides to search Saturday instead of Friday, that is closer to a **model failure**.

One subtle point: **harness evaluation is not exactly agent evaluation.** The harness is the infrastructure; agent evaluation usually scores the behavior produced by model + harness + tools + environment together.

## Where my research sits

Work on user-request realism and evolving intent ([Do agent benchmarks model real users?](../../research/user-realism-in-agent-benchmarks/), [Simulated users for multi-turn evaluation](../../research/user-agent-eval/)) is mostly system-level evaluation, not pure model evaluation. It asks whether an agent, working through its harness, can interact well with a user over time: clarify uncertainty, notice new constraints, adapt when preferences change, and move the user efficiently toward a useful outcome. Those behaviors depend on both the model and how the harness manages the conversation.

## Open gaps in model and agent evaluation

These are the gaps I keep running into. Each one is a possible research direction.

**1. Leaderboards mix up model and harness.** Agent leaderboards usually report one number per model, but the same model can score very differently depending on the scaffold, prompts, tools and retry budget it runs with. Few benchmarks fix the harness or report results across several harnesses, so a ranking can reflect engineering effort as much as model capability. *What would help:* report the harness as part of every result, and evaluate the same model under a fixed reference harness and under its best available one.

**2. No standard way to attribute failures.** Most agent benchmarks score success or failure, not *where* the failure came from: the model's decision, the harness's parsing or routing, a flaky tool, or the environment. Without trace-level attribution, a failed run teaches you little about what to fix. *What would help:* a shared failure taxonomy (model / harness / tool / environment) and benchmarks that release full trajectories.

**3. Outcome-only scoring.** Most benchmarks check the final state. Two agents can both reach the goal while one takes twice as many turns, asks redundant questions or never clarifies an ambiguous request. My [user simulation demo](../../research/user-agent-eval/) showed exactly this: outcome tied, process clearly separated. *What would help:* explicit process metrics (turns to resolution, clarification quality, recovery from errors) alongside the outcome.

**4. Users are too clean.** Benchmarks that include a user mostly give it a fixed, fully specified goal. Real users start vague, reveal constraints late and change their minds. Model evals skip the user entirely. See [the comparison of five benchmarks](../../research/user-realism-in-agent-benchmarks/).

**5. Reliability and cost are under-reported.** Agents are non-deterministic, yet many results are a single pass@1 run. Consistency across repeats (as in τ-bench's pass^k), cost per task and latency are rarely reported together, even though they decide whether an agent is usable. *What would help:* report variance across runs and cost-normalized scores by default.

**6. Static scores do not predict agent performance well.** Strong knowledge and reasoning scores do not guarantee reliable multi-step execution; capability is jagged, and long-horizon tasks compound small per-step error rates. We still lack a good model of how model-level abilities combine into end-to-end agent success.

**7. Benchmarks expire faster than they are replaced.** Benchmarks saturate in months, and agent benchmarks are no exception ([saturation project](../../research/agentic-benchmark-saturation/)). Fresh, contamination-resistant tasks (as in SWE-bench-Live) help, but environments that change over time also make results harder to reproduce.

**8. Side effects and safety are rarely scored.** Agents act in environments: they send messages, edit files and make bookings. Most benchmarks reward reaching the goal and ignore unnecessary, risky or irreversible actions taken along the way.
