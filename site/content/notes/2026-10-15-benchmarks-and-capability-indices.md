---
title: Benchmarks saturate in months; four ways to summarize capability
date: 2026-10-15
summary: Why evaluations stop being useful so quickly, how ECI, the AA Intelligence Index, Arena and LiveBench each compress "capability" into one number, and where to look for benchmark data.
tags: [saturation, indices, IRT]
---

## 1. Capability is outpacing the benchmarks built to measure it

AI capability is outpacing the benchmarks designed to measure it, and in many cases surpassing human-level performance. Frontier models gained 30 percentage points in a single year on Humanity's Last Exam, a benchmark built to be hard for AI and favorable to human experts. Evaluations intended to stay challenging for years are saturated in months, which compresses the window in which a benchmark is useful for tracking progress.

That is the motivation for the [saturation project](../../research/agentic-benchmark-saturation/): if benchmarks expire this fast, we need a way to tell which ones still carry signal.

## 2. Four common ways to summarize capability

By how they compute a score, these fall into three families: a **statistical model that combines many benchmarks** (ECI), a **fixed-weight average** (AA Intelligence Index), and **human votes** (Arena). LiveBench is strictly a single benchmark rather than an index, but it is often used as an overall leaderboard, so I compare it here too.

| | How it is computed | What it covers | What it mainly measures |
|---|---|---|---|
| **ECI** (Epoch) | IRT model that infers a capability value from many benchmark scores | 39 benchmarks, 1,123 evaluations, 147 models (figures from the data-insights page, now about a year old) | Overall capability, leaning math, coding, knowledge, agents |
| **AA Intelligence Index** | Fixed-weight average of 10 evaluations, scaled 0 to 100 | See table below; current version v4.3.2 | Leans toward agents and real work tasks |
| **Arena Elo** | Blind pairwise votes from users, fit with Bradley-Terry | Open-ended chat, separate boards by category | Human preference, not objective correctness |
| **LiveBench** | Average of category averages | 23 tasks in 7 categories, new questions monthly | Objective correctness on general tasks |

### ECI: stitching benchmarks together with a statistical model

**Logic.** It borrows item response theory (IRT) from educational testing. The core formula is

> performance = σ(α · (C − D))

where *C* is the model's capability, *D* the benchmark's difficulty and *α* its slope (how sharply it discriminates). All model and benchmark parameters are fit jointly, so benchmarks of different difficulty and from different years land on one scale. The scale is pinned by two anchors: Claude 3.5 Sonnet = 130 and GPT-5 = 150.

**Properties.**

- When a hard benchmark saturates, models can still be separated through the other benchmarks. That is the point of the design: long-run comparison across benchmark saturation.
- There are domain versions, such as Math ECI and SWE ECI.
- Epoch's own analysis finds benchmark data is dominated by one "general capability" dimension; the first principal component explains about half the variance.
- The code is open source: [epoch-research/eci-public](https://github.com/epoch-research/eci-public).

**Limits.** One secondhand source says ECI groups benchmarks into Coding, Math, Agentic, Knowledge and Writing and weights the five equally. I only confirmed the IRT formula above on the official methods page and in the repository, so I am not treating the five-way split as fact. Also, for models where the benchmarks are all too easy or too hard, the ECI estimate is more uncertain.

### AA Intelligence Index v4.3.2: a weighted average

**Logic.** Ten evaluations with fixed weights, scaled from 0 to 100. According to Artificial Analysis, evaluations with private test sets make up 45% of the weight. It is mainly text-based and English; images, speech and multilingual are measured separately.

| Category | Evaluation | Weight |
|---|---|---|
| Agents (30%) | AA-Briefcase | 15% |
| | GDPval-AA | 10% |
| | AutomationBench-AA | 5% |
| Coding (20%) | Terminal-Bench 4.0 | 10% |
| | SciCode | 10% |
| General (30%) | AA-Omniscience accuracy | 10% |
| | AA-Omniscience non-hallucination rate | 5% |
| | GDP.pdf | 10% |
| | AA-LCR | 5% |
| Scientific reasoning (20%) | Humanity's Last Exam | 10% |
| | CritPt | 10% |

**Properties.** Since v4.0 it deliberately replaced older benchmarks such as MMLU with evaluations closer to real work, and it scores hallucination separately (whether the model answers when it should say it doesn't know).

**Caveats.** I have only confirmed what some components test: SciCode is scientific-computing code, HLE is an expert-level question set, and Omniscience looks at both accuracy and hallucination. I did not check the details of AA-Briefcase, AutomationBench-AA, GDP.pdf or CritPt; the [AA methodology page](https://artificialanalysis.ai/methodology/intelligence-benchmarking) is the place to look. The index also changes fast (v4.0 to v4.3 already), so always cite the version.

### Arena Elo: human preference

**Logic.** A user asks a question, sees answers from two anonymous models and votes for the better one. Many votes are fit with a Bradley-Terry model and converted to an Elo-like score. There is also a **style-controlled** version that adds answer length, number of Markdown headers and number of lists as regression variables, to remove the effect of formatting on the score. A third-party summary puts the July 2026 text board at about 7.15 million votes and 369 models (secondhand figure).

**What it measures.** Which model's answers people prefer in open-ended conversation. It measures preference, not objective correctness, so it does not separate "more pleasant" from "more right". That is the main criticism; the paper *The Leaderboard Illusion* is devoted to its biases.

### LiveBench: a benchmark that keeps changing

**Logic.** Strictly a benchmark, but used like an overall leaderboard. The current version has 23 tasks in 7 categories (reasoning, coding, agentic coding, math, data analysis, language, instruction following). The overall score is the average of the category averages. New questions are released monthly to limit contamination, and answers are graded automatically against objective ground truth, with no LLM judge.

**Properties.** Contamination resistance and objective grading are its selling points. BenchLM displays it but does not include it in its own weighted overall score.

### How to read the differences

- **ECI** answers "where is overall capability, and how does it compare across time?"
- **AA Index** answers "which model should I use for real work tasks right now?"
- **Arena** answers "whose answers do people prefer?"
- **LiveBench** answers "who is objectively right on fresh questions?"

They will not fully agree, and each is shaped by which benchmarks it chose. Epoch itself notes that a different benchmark selection can amplify or shrink a given model's advantage.

## 3. Where to look

- [BenchLM](https://www.benchlm.ai/benchmarks): to see which benchmarks exist and every model's latest scores.
- [Stanford AIMS Measurement Data Bank](https://aims.stanford.edu/measurement-db): to study benchmark quality, saturation, discrimination and what happens at the level of individual items.

The Data Bank has many smaller academic benchmarks (medicine, multilingual, safety, and so on); BenchLM leans toward the mainstream benchmarks that frontier labs report.
