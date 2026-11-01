---
title: "📖【Paper Deep Dive】IntentDelta and Evolving User Intentions"
date: 2026-10-31
summary: "A close reading of IntentDelta: human-authored intention updates, priority-aware evaluation, and the gap between recovering requirements and executing them."
tags: [agent evaluation, user intent, multi-turn interaction, paper notes]
---

## At a glance

IntentDelta asks whether agents can keep track of what a user currently wants as requirements change across a conversation, and then act on that understanding. The key challenge is cumulative: an agent must incorporate new instructions, preserve earlier requirements that still apply, and recognize changes in their relative importance.

These notes organize the paper's research question, benchmark construction, evaluation protocol, findings, and limitations. The final section separates my own interpretation from the reported results.

**Paper:** [IntentDelta on arXiv](https://arxiv.org/abs/2610.33806) · [PDF](https://arxiv.org/pdf/2610.33806)

## 1. Research question

Users may revise their requirements after observing concrete results. A shopping request can change when available products reveal a conflict between performance and budget. A travel request can change when a user sees the cost of insisting on nonstop flights.

The evaluation question is therefore: **Can an agent maintain and execute the user's evolving intention, including both constraints and priorities, over multiple turns?**

This requires three related abilities:

1. Update the current intention without dropping earlier requirements that remain valid.
2. Distinguish essential constraints from preferences that can be relaxed.
3. Translate the resulting intention into a suitable action or plan.

## 2. Research gap

The paper identifies three limitations in existing benchmarks.

- **Limited human grounding.** Synthesized intention updates and simulated interactions alone provide limited evidence that requirement changes reflect plausible human decisions.
- **Limited coverage of decision making.** Benchmarks do not consistently capture how users weigh competing requirements or why they revise their intentions.
- **Missing turn-specific human references.** Without a human execution for the current intention at each turn, it is harder to compare agent behavior with human execution as requirements evolve.

IntentDelta addresses these gaps with human-authored trajectories that pair evolving intentions with user utterances and reference executions.

## 3. Benchmark and dataset construction

IntentDelta contains **638 trajectories and 3,766 turns** across two existing task environments:

- **TravelPlanner:** 304 trajectories and 1,946 turns.
- **WebShop:** 334 trajectories and 1,820 turns.

The benchmark reuses the environments and original user requests from WebShop and TravelPlanner. Members of the author team manually construct the multi-turn trajectories, spending approximately 5–10 minutes per trajectory.

### Three annotations at every turn

Each turn contains:

1. **A structured intention:** the current constraints and their priorities, including trade-offs informed by previous task outcomes.
2. **A natural-language utterance:** a user-facing expression of the updated intention.
3. **A human reference execution:** a search, selection, or plan that reflects the current intention in the task environment.

For example, a user might raise a travel budget to $1,800 while changing nonstop flights from a requirement to a preference. The structured annotation must capture both the new budget and the revised priority of the flight constraint.



<figure style="margin: 1.5rem 0;">
<a href="/Eval-Research/static/files/intentdelta-constraint-example.png" target="_blank" rel="noopener"><img src="/Eval-Research/static/files/intentdelta-constraint-example.png" alt="Example intention with budget, flight, and hotel-location constraints and their priorities." style="display: block; width: 100%; height: auto;"></a>
<figcaption>Illustrative initial travel intention: a budget of at most $1,500 and nonstop flights are must-haves; a downtown hotel is preferred. The later update can change both values and priorities. Click the image to view it at full size.</figcaption>
</figure>

### Quality control

An author who did not construct a trajectory cross-verifies its utterances, cumulative intentions, priorities, and reference actions. Ambiguous or unreasonable cases are discussed and revised until consensus is reached.

External annotators independently review a 20% sample, comprising 128 trajectories, for consistency and clarity across intentions, utterances, and executions. The paper reports **97% agreement** with the authors' annotations. This supports annotation consistency within the sampled trajectories; it does not by itself establish that the trajectories represent natural user behavior.

## 4. Modeling intention changes and trade-offs

### Agent and user processes

The paper formulates the agent process as a partially observable decision process with state, action, observation, and transition components. The user process is modeled as a Markov decision process whose state at turn *t* contains the current intention *Iₜ* and interaction context *Cₜ*. The user's action is an utterance *uₜ*.

This formulation makes the user's changing requirements part of the task rather than treating the initial prompt as a permanently fixed goal.

### Why intentions change

The paper considers two common conditions:

- **Feasibility becomes clearer.** Available results reveal that the original requirements cannot all be satisfied together, prompting a compromise.
- **Preferences change after comparison.** Seeing concrete alternatives helps a user reconsider what matters most, such as choosing portability over maximum performance.

### Three priority levels

- **Must-have:** requirements to preserve whenever feasible.
- **Preferred:** desirable requirements that may be sacrificed when necessary.
- **Optional:** lower-priority preferences.

These labels let the benchmark evaluate whether an agent understands the relative importance of constraints as well as their content.

## 5. Evaluation protocol

The paper evaluates eleven agents using a common **ReAct** framework, which interleaves reasoning, actions, and environment observations. Agents reuse the search tools and data resources supplied by WebShop and TravelPlanner.

The evaluated models are GPT-5.6 Sol and Luna; Claude Opus 4.8 and Sonnet 5; DeepSeek R1; Grok 4.6; Kimi K2.5; MiniMax M2.5; Nova Pro; and Qwen3-235B and Qwen3-32B.

### Fixed utterance replay

During construction, intention updates are grounded in human exploration of the environment. During evaluation, every agent receives the **same annotated sequence of user utterances**, while independently interacting with the environment.

Subsequent user utterances do not depend on the tested agent's actual actions. This provides a controlled comparison under identical changing requirements.

**Interpretation:** This protocol evaluates an agent's ability to follow a predefined intention trajectory. It provides less direct evidence about how an agent's own questions, recommendations, or failures influence a user's subsequent decisions.



<figure style="margin: 1.5rem 0;">
<a href="/Eval-Research/static/files/intentdelta-evaluation-pipeline.png" target="_blank" rel="noopener"><img src="/Eval-Research/static/files/intentdelta-evaluation-pipeline.png" alt="IntentDelta evaluation pipeline from human annotation through agent execution, LLM judging, deterministic scoring, and human validation." style="display: block; width: 100%; height: auto;"></a>
<figcaption>Evaluation overview. Human references guide LLM judgments and deterministic scoring. The 95% human–LLM agreement shown here concerns judgment validation on 100 sampled agent outputs, separate from the 97% annotation agreement discussed above. Click the image to view it at full size.</figcaption>
</figure>

## 6. Metrics: understanding and execution

### Intention-level evaluation

The benchmark evaluates constraint detection, content, and priority separately:

- **Detection** = detected gold constraints / gold constraints. Did the agent identify the requirements?
- **Content Accuracy** = constraints with correct content / detected constraints. Are their values and scopes correct?
- **Priority Accuracy** = constraints with correct priorities / detected constraints. Did the agent assign the appropriate priority tier?
- **Intention Recovery** = fully recovered constraints / gold constraints. A fully recovered constraint has both correct content and correct priority.

Detection and Intention Recovery use all gold constraints as their denominator, while Content Accuracy and Priority Accuracy use detected constraints. Reading them together helps distinguish missing requirements from incorrect interpretations of requirements that were detected.

### Action-level evaluation

**Hard Success** evaluates must-have satisfaction. Let *Mₐ* and *M<sub>g</sub>* denote the numbers of must-have constraints satisfied by the agent and human reference, and *nₘ* the total number of must-have constraints.

- For a feasible task, *Gₜ = 1* if *Mₐ = nₘ*, and *0* otherwise.
- For an infeasible task, *Gₜ = 1* if *Mₐ ≥ M<sub>g</sub>*, and *0* otherwise.

When all must-have constraints can be satisfied, the agent must satisfy all of them. When they cannot, the human reference supplies the comparison threshold.

**Action Score** adds lower-priority preferences, conditioned on Hard Success. Preferred constraints receive weight 2 and optional constraints receive weight 1:

- *Sₐ = 2Pₐ + Oₐ*
- *S<sub>g</sub> = 2P<sub>g</sub> + O<sub>g</sub>*
- *ActionScoreₜ = Gₜ × min(1, Sₐ / S<sub>g</sub>)*

Here, *P* and *O* count satisfied preferred and optional constraints. The gate *Gₜ* means that failing Hard Success makes Action Score zero. The cap prevents an agent from scoring above one when it exceeds the reference's weighted preference score.

The ratio above requires a nonzero reference preference score; the formula alone does not specify how a zero denominator is handled.

## 7. Key findings

The paper reports the following averages across evaluated agents:

- **TravelPlanner:** Intention Recovery of **33.1%**, and Action Score of **31.6%**.
- **WebShop:** Intention Recovery of **44.7%**, and Action Score of **41.0%**.

The reported results point to substantial difficulty in maintaining evolving requirements and carrying them out. Agents struggle to preserve earlier constraints and distinguish soft preferences from must-have requirements.

Correct intention recovery also does not guarantee successful execution. Understanding the current requirements and finding an action that satisfies them are distinct capabilities.

Taken together, the benchmark exposes challenges in updating intentions without losing relevant history, understanding trade-offs, and executing the resulting constraints.



<figure style="margin: 1.5rem 0;">
<a href="/Eval-Research/static/files/intentdelta-main-results.png" target="_blank" rel="noopener"><img src="/Eval-Research/static/files/intentdelta-main-results.png" alt="Main results for eleven agents on TravelPlanner and WebShop, including Detection, Intention Recovery, Hard Success, and Action Score." style="display: block; width: 100%; height: auto;"></a>
<figcaption>Main results from the paper (Table 3). Det. means Detection and Rec. means Intention Recovery. All values use a 0–100 scale; higher is better. Click the image to view it at full size.</figcaption>
</figure>

## 8. Limitations

### Human-authored trajectories in two environments

Author-constructed trajectories provide explicit, reviewable annotations, but may not fully represent natural user interactions. Coverage is also limited to shopping and travel planning, leaving generalization to other domains uncertain.

### Reference-dependent evaluation of infeasible tasks

For infeasible tasks, Hard Success compares the number of must-have constraints satisfied by the agent with the number satisfied by the human reference. The reference represents one plausible compromise.

Other reasonable solutions may satisfy different subsets of constraints. Comparing counts does not fully capture the quality of those alternative trade-offs, including which particular requirements were sacrificed.

### Discrete priorities simplify preferences

Must-have, preferred, and optional provide an interpretable representation, but real preferences may be continuous or context dependent. A requirement's importance can also depend on the cost of satisfying it or on its relationship with other requirements.

## 9. My reading: controlled intent tracking versus interactive collaboration

The benchmark's useful contribution is to make **current intention explicit and evaluable at every turn**, with a corresponding human execution. This helps separate misunderstanding from execution failure.

My main question concerns the fixed replay protocol. In a live interaction, an agent can change the conversation itself. A clarification question might help a user articulate a preference earlier. A recommendation might reveal a new trade-off. A failed action might cause a different revision of the goal.

Because every tested agent receives the same subsequent utterances, IntentDelta cannot directly establish how well agents support this feedback loop. An agent can be good at tracking a supplied trajectory while still being less effective at helping a user discover or refine their goal.

This suggests a complementary evaluation direction: allow user responses to depend on agent behavior, while carefully controlling the reliability and comparability of those responses. Such an evaluation could examine whether clarification improves shared understanding, whether proposed compromises are acceptable, and whether the final outcome reflects the user's preferences.

For my own evaluation framework, I would distinguish three questions:

1. **Intent tracking:** Does the agent understand the user's current requirements?
2. **Task execution:** Can it act successfully on that understanding?
3. **Interactive collaboration:** Does its behavior help the user clarify and achieve a satisfactory goal?

IntentDelta directly evaluates the first two under a controlled sequence of changing requirements. The third remains an important complementary research question.

## Source

[IntentDelta, arXiv:2610.33806](https://arxiv.org/abs/2610.33806). These are independent reading notes; the discussion labeled as my reading is interpretation rather than a reported experimental result.


## My Research Reflections & Open Questions

*The following reflections are my own hypotheses and proposed evaluation directions, inspired by reading IntentDelta. They are not findings reported or validated by the paper's authors.*

### 1. Agent-dependent user responses: realism with experimental control

Different agents can lead the same user down different conversational paths. An agent that asks a useful clarification question may help the user articulate a preference earlier; an agent that exposes a feasibility conflict may prompt a different revision of the request. Fixed replay makes comparisons controlled and reproducible, but it cannot directly measure these effects because later user utterances remain unchanged regardless of the agent's behavior.

**My hypothesis:** allowing user responses to depend on the agent could reveal important differences in collaborative ability that fixed replay misses. The challenge is to make this interaction responsive without making the evaluation arbitrary. How can we distinguish an agent helping a user clarify an existing preference from steering the user toward an outcome that is merely easier for the agent?

A possible design would pair fixed replay with a separate interactive track. In the interactive track, agents would start from the same underlying user profile, initial information, task environment, and rules for permissible preference updates, while subsequent utterances could differ. A simulator would need explicit rules for what the user knows, when information can be revealed, and which changes require evidence or user choice. Human checks would be needed to assess whether its responses remain plausible and consistent with the profile.

For fairness and reproducibility, I would compare agents across matched profiles and repeated trials, record complete interaction traces and simulator versions, and report uncertainty and sensitivity to different user policies. Equal starting conditions and response rules may be a more appropriate control than identical utterances in this setting. The open question is whether the resulting ranking reflects agent quality or artifacts of the user model.

### 2. Constraint trade-offs: evaluate the compromise, not only the count

The paper already distinguishes priority tiers and weights preferred and optional constraints in Action Score. My concern is more specific: when must-have constraints cannot all be satisfied, matching the human reference's count does not necessarily imply an equally good compromise. Two solutions can satisfy the same number of requirements while sacrificing very different things. For example, exceeding a travel budget slightly and violating a critical arrival deadline may each count as one violation, yet have very different consequences for the user.

**My hypothesis:** evaluating trade-off quality requires attention to which constraints are relaxed, the magnitude and consequences of each violation, and whether the user accepts the compromise. Even constraints in the same priority tier may differ in practical importance. An agent should also explain the conflict and seek agreement before relaxing a requirement that the user has treated as essential.

A complementary evaluation could use user-grounded pairwise comparisons of feasible alternatives, severity-aware violation scores, and checks for whether a proposed solution is dominated by an available alternative. Explicitly non-negotiable constraints would remain separate from preferences that can be traded off. Such measures would need independently elicited preferences or human judgments; assigning arbitrary weights would simply replace one oversimplification with another.

The open question is how to recognize multiple acceptable compromises without treating a single reference execution as the only valid answer, while keeping judgments consistent and affordable.

### 3. Proactive goal progress: measure benefit after interaction costs

Following each updated request is only one part of helping a user achieve a goal. A stronger agent might detect a conflict early, explain why the current request is infeasible, and present useful alternatives before the user has to discover the problem and adjust the request. Another agent might eventually reach the same outcome only after repeated corrections from the user.

**My hypothesis:** proactive assistance should receive credit when it improves the outcome or reduces the user's effort, but asking more questions or suggesting more alternatives is not inherently better. Premature clarification can interrupt progress, and an unsupported warning can create unnecessary work. Fewer turns alone are also insufficient evidence of success: an agent could finish quickly by overlooking a requirement.

I would compare proactive behavior with a reactive baseline on matched tasks and user profiles, measuring final user-valued outcome quality alongside time to a satisfactory solution, avoidable failed actions, correction burden, and user effort. Early conflict detection should be checked for correctness, and alternatives should be judged for feasibility, relevance, and acceptance by the user. A useful summary would be the gain in outcome quality and effort saved after accounting for additional questions, delay, and cognitive load, with those components also reported separately.

The open question is when an intervention produces enough benefit to justify its interaction cost. This would help distinguish an agent that merely tracks evolving intentions from one that helps the user make informed decisions and reach a satisfactory goal sooner.
