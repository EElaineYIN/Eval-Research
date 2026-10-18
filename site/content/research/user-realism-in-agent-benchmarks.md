---
title: Do agent benchmarks model real users?
date: 2026-10-18
summary: A comparison of τ-bench, τ²-bench, REAL, SWE-bench and TheAgentCompany on how realistically they represent the person asking for help. Most still assume the user already knows what they want.
tags: [agents, user simulation, benchmark design]
status: In progress
layout: wide
---

[Download the slides (PDF)](../../static/files/user-realism-in-agent-benchmarks.pdf)

## Question

Agent benchmarks have become much more realistic about *environments*: real websites, real repositories, simulated companies. This project asks whether they are equally realistic about *users*. Real requests are often vague, incomplete or still forming, and they change as the conversation goes on. How much of that do current benchmarks capture?

## Benchmarks compared

| Benchmark | Why it is relevant |
|---|---|
| **τ-bench / τ²-bench** | Directly evaluates multi-turn agent-user interaction. A simulated user reveals information over the conversation. τ-bench was explicitly motivated by the fact that existing benchmarks often fail to test interaction with users. ([τ-bench](https://arxiv.org/abs/2406.12045), [τ²-bench](https://arxiv.org/abs/2506.07982)) |
| **REAL** | Evaluates agents on practical multi-step web tasks using deterministic replicas of real websites. Useful for asking whether a benchmark can have a highly realistic environment and workflow while still giving the agent fairly structured instructions. ([arXiv](https://arxiv.org/abs/2504.11543)) |
| **SWE-bench / SWE-bench-Live** | Uses real GitHub issues and real software repositories, a strong example of a benchmark grounded in real-world tasks. Useful for asking whether a task can come from the real world yet still be well specified, reducing the need for clarification or intent elicitation. ([SWE-bench](https://arxiv.org/abs/2310.06770), [SWE-bench-Live](https://arxiv.org/abs/2505.23419)) |
| **TheAgentCompany** | Simulates a real workplace where agents browse websites, write code, run programs and communicate with coworkers to complete professional tasks. Broadens the analysis beyond one domain. ([arXiv](https://arxiv.org/abs/2412.14161)) |

## τ-bench and τ²-bench

Both try to fix the same weakness: traditional benchmarks give the model all the information upfront and do not require realistic interaction with users. τ-bench introduces multi-turn **Tool-Agent-User** interaction; τ²-bench goes further and lets the **user take actions in the environment**, not just provide information.

| Dimension | τ-bench | τ²-bench |
|---|---|---|
| Overall structure | Simulated user ↔ agent ↔ tools/database. Only the agent has tools; it talks with the user, gathers missing information, follows domain policy and calls tools. | Simulated user ↔ agent, and both sides have tools that act on a shared environment (dual control). |
| Domains | Retail and airline. | Retail, airline, plus telecom troubleshooting. |
| Task construction | Synthetic environment; tasks manually constructed and iteratively refined so each has a unique valid outcome. | Telecom tasks programmatically composed from atomic subtasks, with manual refinement; designed for verifiability and controllable complexity. |
| Task specification | The agent sees only the conversation; the simulated user gets a hidden instruction with identity, intent, preferences and fallback behavior. | Same setup, with more structured instructions: reason for call, known info, unknown info, task instructions. |
| Turns | Multi-turn; the agent must gather information from the user. | Multi-turn, with stronger emphasis on coordination and step-by-step troubleshooting. |
| User type | LLM-simulated user. | LLM-simulated user, more tightly coupled to environment and tool state. |
| Can the user act? | Mostly no. The user provides information; the agent controls tools. | Yes. Agent and user both have tools and modify different parts of the shared world. |
| Clarification | Yes. The agent must gather information rather than receive it upfront. | Yes, and the agent must guide the user through actions and diagnosis. |
| Simulator behavior | Reveals information in natural language but follows a predefined latent goal. | More constrained: follows scenario instructions, discloses information progressively, calls tools only when asked. |
| Personas | No systematic persona framework. | None / Easy / Hard personas, varying technical familiarity and behavior. |
| Success metric | Final database state plus required output information; pass^k for consistency across runs. | DB checks, state assertions, communication checks, natural-language assertions and action matching; telecom mainly uses state assertions. |
| Main finding | Agents struggle with consistency, rule following, compound requests and reasoning over partial information. | Performance drops substantially from no-user mode to dual control: communication and coordination are bottlenecks separate from reasoning. |
| **Still missing vs. real users** | Real users may have ambiguous, evolving, inconsistent or not-yet-formed goals; τ-bench removes ambiguity to keep a unique ground truth. | User behavior stays highly controlled for reliability; users are told not to invent information and to follow a predefined scenario. The expert-novice mental-model gap is not fully modeled. |
| Trade-off | More interaction realism, but ambiguity is intentionally reduced to keep evaluation objective. | More interaction and coordination realism, but a constrained simulator may cost natural behavioral realism. |

## REAL

REAL addresses a different trade-off: web-agent benchmarks often give up realism for reproducibility, while live websites are realistic but unstable and hard to evaluate. It introduces **high-fidelity, deterministic replicas of real websites** and evaluates agents on practical multi-step tasks in them.

| Dimension | REAL |
|---|---|
| Overall structure | Natural-language task → agent → deterministic website replica → evaluation. The agent observes the browser and acts until done. |
| Domains | 11 web environments: e-commerce, travel, communication, scheduling, professional networking, food delivery, property search, freelance marketplaces and more. |
| Task construction | 112 practical tasks mirroring common web workflows. Environments are synthetic replicas with fixed data, timestamps and UI states; some data is AI-generated. |
| Task specification | A natural-language goal given upfront, possibly with several constraints and an environment configuration. |
| Turns | Multi-step environment interaction, but no multi-turn user conversation. |
| User type | No live or simulated user; the user is a fixed instruction. |
| Can the user act? | No. After the task is given, only the agent interacts with the site. |
| Clarification | The agent can look things up on the site but cannot ask the user or elicit preferences. |
| Success metric | Action tasks: programmatic check of final `localStorage` state. Retrieval tasks: rubric-based LLM judge. Combined tasks: both must pass. |
| Main finding | Frontier agents still struggle; best reported end-to-end success is about 41%. Common failures: poor state verification and no recovery from navigation dead ends. |
| **Trade-off** | High environment and workflow realism plus high reproducibility, but low user-interaction realism. |

## SWE-bench and SWE-bench-Live

SWE-bench replaces small self-contained coding problems with **real GitHub issues** paired with repository snapshots; models must produce patches that pass the real tests. SWE-bench-Live keeps that setup but fights staleness and contamination with **continuously updated, recent issues** and an automated pipeline. Its first release has 1,319 tasks from 93 repositories, from issues created since 2024.

| Dimension | SWE-bench | SWE-bench-Live |
|---|---|---|
| Overall structure | Real issue + repo snapshot → model → patch → tests. | Same, with recent issues and executable environments. |
| Domains | 12 popular Python repositories. | Much broader: 93 repositories at launch. |
| Task construction | 2,294 tasks mined from real issues and merged PRs; heavily filtered and execution-validated. | Real, recent issues; automated curation and environment setup for continuous updates. |
| Task specification | Fixed issue text plus codebase. The issue is natural and may be noisy or incomplete. | Same idea; issues are newer and more diverse. |
| Turns | Essentially single-shot issue to patch. | Still an issue-resolution benchmark, not a conversation. |
| User type | None; intent is the issue text. | Same; no interactive issue author. |
| Clarification | Can read code, but cannot ask the issue author anything. | Same limitation. |
| Success metric | Patch applies; FAIL_TO_PASS tests pass and PASS_TO_PASS tests still pass. | Same execution-based approach with reproducible Docker environments. |
| Main finding | Repository-scale issue resolution is much harder than code generation: localization, long context, multi-file reasoning. | Agents do substantially worse on fresh Live tasks than on static SWE-bench, so age and contamination matter. |
| **Still missing vs. real users** | No clarification dialogue, evolving requirements, feedback or iteration with the issue author. | Same. Fresh data improves freshness, not user-interaction realism. |
| **Trade-off** | High task-source realism and objective verification, low interaction realism. | Adds freshness, diversity, scale and lower contamination risk; interaction realism stays low. |

## TheAgentCompany

TheAgentCompany targets benchmarks that test narrow task types or single interfaces, while real work spans roles, tools, long workflows and talking to colleagues. It builds a **self-contained simulated software company** with workplace tools, data and LLM-simulated colleagues, and evaluates **175 professional tasks** across software engineering, project management, data science, HR, admin and finance, with checkpoint-based partial credit. A useful distinction: the *original user* gives the task; *coworkers* help complete it.

| Dimension | TheAgentCompany |
|---|---|
| Overall structure | Task intent → agent → workplace environment, tools and simulated colleagues → checkpoint evaluation. The agent browses internal sites, writes and runs code and may message coworkers. |
| Domains | Software engineering, project management, data science, administration, HR, finance and other. |
| Task construction | 175 hand-curated tasks, not taken from real user logs. Categories partly grounded in the U.S. Department of Labor O*NET database plus domain experts and LLM brainstorming; all designed, implemented and reviewed by the authors and experts. |
| Task specification | An English task intent written to be clear enough that a human worker would not need to ask the original user, though they may need to ask coworkers. |
| Turns | Multi-step and often long-horizon; some tasks include real multi-turn exchanges with simulated colleagues. |
| User type | No persistent user simulator; a fixed instruction plus LLM-simulated coworkers. |
| Can the user act? | The task-giver does not. Colleagues can talk, provide information and negotiate, but they are not τ²-style co-controllers of the environment. |
| Clarification | Yes, but from coworkers rather than the original user. |
| Simulator behavior | Coworkers have predefined profiles (name, role, responsibilities, projects), talk through RocketChat and run on Claude 3.5 Sonnet in the experiments. |
| Personas | No Easy/Hard personas; role-based profiles such as CTO, PM, engineer, finance director, HR manager. |
| Success metric | Weighted checkpoints, reported as full and partial completion. Mostly deterministic evaluators, some rubric-based LLM grading. |
| Main finding | The best agent fully completed only about 30% of tasks; social interaction, complex web UIs, long-horizon coordination and admin/finance work were hardest. |
| **Still missing vs. real users** | The initial intent is deliberately well scoped and clear, so ambiguity in the original request is limited, and tasks are curated rather than sampled from real interactions. The paper itself notes that vaguer intents would better reflect real situations. |
| Trade-off | High workplace realism, multi-tool interaction and coworker communication, but intents are made clear and tasks curated for evaluability. |

## Cross-benchmark comparison

| Dimension | τ-bench | τ²-bench | REAL | SWE-bench | TheAgentCompany |
|---|---|---|---|---|---|
| Primary realism target | User interaction | User interaction + shared control | Web environment and workflow | Real-world task source | Workplace, cross-tool, coworker interaction |
| Task source | Synthetic, manually designed customer-service scenarios | Synthetic / programmatically composed, especially telecom | Researcher-designed web tasks | Real GitHub issues + merged PRs | Hand-curated professional tasks, partly O*NET-grounded |
| Environment realism | Medium | High | High | High for code, not a full workplace | High |
| **User-request realism** | Medium: agent sees incomplete info, but the latent goal is predefined | Medium: goal still predefined, richer interaction because the user acts and troubleshoots | Low to medium: fixed goal given upfront | Medium: real issue text, frozen as a static task | Medium: realistic intent, deliberately made clear |
| Multi-turn user interaction | Yes | Yes | No | No | Not with the user; yes with coworkers |
| Can the agent ask for clarification? | Yes, the simulated user | Yes, the simulated user | No user available | No issue author available | Yes, mainly coworkers |
| User / human agency | Mainly provides information | Can also act via tools | None after task is issued | None after issue is filed | Coworkers respond, negotiate, inform |
| Hidden information / preferences | Yes | Yes | Mostly no | Possible in issue text, not recoverable interactively | Yes, sometimes held by coworkers |
| **Ambiguity allowed?** | Limited; refined toward a unique outcome | Limited, controlled | Limited; goal given upfront | Naturally noisy or incomplete issue text | Limited; intents made clear enough for human workers |
| **Can goals evolve?** | Essentially no | Essentially no | No | No | Very limited; feedback affects execution, intent stays fixed |
| Personas / user variability | None systematic | None / Easy / Hard | None | None | Role-based coworker profiles |
| Long-horizon execution | Moderate | Moderate to high | High | High in code reasoning, one-shot patch | High |
| Cross-tool / cross-app work | Domain tools | Larger shared environment | Website-focused | Repository and execution | Strong: browser, terminal, Python, GitLab, Plane, RocketChat, ownCloud |
| Evaluation style | Final DB state + required info, pass^k | State, action and communication assertions | Programmatic state checks + LLM judge | Execution-based tests | Weighted checkpoints, mostly deterministic |
| **Partial credit** | Limited | More flexible, still success-oriented | Mostly binary | Mostly solved / not solved | Yes, weighted checkpoints |
| Reproducibility | High | High | Very high | High | Very high |
| Main realism strength | Gathering information from a user | Coordinating with an active user | Realistic website operation | Real developer issues at repository scale | Professional workflows, many tools, coworkers |
| Main realism limitation | Latent goal fully predefined | Simulator tightly constrained | No user interaction once the task starts | Real request turned into a static task | Clear initial intent; coworker chat is not unclear user intent |

## Conclusion

**1. User-request realism.** Most benchmarks still assume that **the user already knows what they want**.

*Proposed direction.* Real users may start with partially formed or ambiguous goals and revise them during the interaction. A benchmark could include goal refinement from vague to specific requests, constraints that emerge mid-conversation, preference revision after seeing trade-offs, goal switching when the original plan becomes infeasible, and inconsistent preferences across turns. It would then test whether an agent can not only recover missing information but also help clarify and adapt to the user's intent as it forms and changes.

**2. Interaction-aware evaluation.** Evaluation is still largely **outcome-centric**; benchmarks rarely give explicit credit for good intermediate interaction behavior.

- **τ-bench** mainly evaluates final state and required information.
- **τ²-bench** adds state, action and communication assertions, but remains task-success oriented.
- **REAL** primarily evaluates final environment state or retrieval correctness.
- **SWE-bench** is essentially resolved vs. not resolved through tests.
- **TheAgentCompany** supports weighted checkpoint partial credit, but checkpoints capture execution progress rather than whether the agent asked the right follow-up question, noticed changing intent or clarified ambiguity appropriately.
