---
title: Which agentic benchmarks are saturated?
date: 2026-10-16
summary: A saturation score for 108 agentic benchmarks on BenchLM, combining distance to the ceiling with whether the top five models can still be told apart.
tags: [saturation, agentic, BenchLM]
status: Prototype
app: saturation
---

## Question

Agentic benchmarks (coding agents, computer use, web research, tool calling) are the newest and fastest-moving part of evaluation. Some already look finished; others only look finished because they are too small to separate models. This project asks, for each agentic benchmark on BenchLM: **is it saturated, and how sure can we be?**

## Method

**Data.** BenchLM JSON snapshot of October 15, 2026: 108 agentic benchmark entries with at least one score. Each model family contributes only its best score, so reasoning-effort variants of one model do not fill the top five. Models whose scores BenchLM generated rather than collected are excluded.

**Two questions per benchmark.**

1. *Close to the ceiling?* Headroom = 100 − top score. Close means headroom ≤ 10 points (adjustable).
2. *Can the leaders still be told apart?* Following Akhtar et al. (ICML 2026), compare the first and fifth best scores against their sampling error:

   R = (s₁ − s₅) ÷ √[(s₁(1−s₁) + s₅(1−s₅)) / n_eff], S = exp(−R²), n_eff = n^α

   S near 1 means the top five are statistically indistinguishable. *n* is the benchmark's item count; α discounts for correlated items (α = 1 treats them as independent, α = 0.5 is the paper's default). I use **α = 0.8** and S ≥ 0.7 as "not separable", and flag any label that changes between α = 0.5 and 1.

The two answers give four labels: **Saturated** (close and not separable), **Near ceiling** (close but separable), **Under-powered** (far from the ceiling yet not separable, usually too few items) and **Discriminative**.

**Saturation score.** For a single bar: (top score ÷ 100) × S. It is full only when the leader scores 100% *and* the top five are indistinguishable.

**Item counts.** I collected *n* for 63 of the 108 entries from original papers, official pages and BenchLM's descriptions ([item_counts.csv](https://github.com/EElaineYIN/Eval-Research/blob/main/research/benchlm-saturation/item_counts.csv), with the source of each). Where *n* is unknown, S is estimated from the top-5 gap and the result is marked *est.*

**Families.** Versions, third-party re-runs and alternative metrics of the same benchmark are grouped (e.g. Terminal-Bench 2.1 as reported by labs, by Vals AI and by Artificial Analysis), and one primary entry represents each family.

## First reading (defaults, Oct 15 snapshot)

- 46 benchmark families can be classified. 3 are saturated, 6 near the ceiling, 9 under-powered and 28 still discriminative.
- The saturated three are Harvey LAB, Terminal-Bench 2.0/2.1 and BrowseComp. Only Harvey LAB keeps that label across every α.
- High scores alone are not saturation. CyberGym is 4.9 points from the ceiling, but with 1,507 items its top-five spread is well outside noise.
- Low scores alone are not discrimination either. ResearchClawBench's leader scores 21%, yet with 40 items the top five are indistinguishable: the benchmark is under-powered, not unsolved.

## Limitations

- One snapshot, no history: the pace at which benchmarks approach saturation is not measured yet. Daily snapshots will fix this.
- BenchLM does not mark whether a score is self-reported or independently reproduced.
- The formula assumes the top five were scored on the same items, which is not guaranteed across labs.
- Some entries mix several domains or metrics into one number (τ²-Bench is the clearest case).
- Thresholds and α = 0.8 are judgment calls, not standards. They are adjustable above for that reason.

## Data and code

- Pipeline: [`research/benchlm-saturation/pipeline.py`](https://github.com/EElaineYIN/Eval-Research/tree/main/research/benchlm-saturation) turns a BenchLM snapshot into the dataset used here.
- Data from [BenchLM.ai](https://www.benchlm.ai) under CC BY-NC 4.0; non-commercial use only.
- Method: Akhtar et al., *When AI Benchmarks Plateau: A Systematic Study of Benchmark Saturation*, ICML 2026 ([arXiv 2602.16763](https://arxiv.org/abs/2602.16763)).
