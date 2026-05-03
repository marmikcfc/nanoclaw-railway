---
name: meta-experiment-adapters
description: Optional examples for translating common domains into the domain-agnostic experiment contract. Use only as guidance for writing task.md and evaluate.md; core experiment skills must not branch on these domains.
---

# Meta Experiment Adapters

Adapters are examples, not core logic. Use them to translate a domain into `program.md`, `task.md`, `evaluate.md`, and `guardrails.md`.

## Page Load

`task.md` usually uses `code_change`.

Allowed changes may include image optimization, lazy loading, caching, bundle reduction, or request reduction.

`evaluate.md` may run Lighthouse, WebPageTest, browser automation, or a custom performance script. It emits metrics such as LCP, TTFB, CLS, TBT, or page load time.

Guardrails may include visual diffs, signup conversion, analytics still present, and no console errors.

## Ads

`task.md` usually uses `external_action` or `content_change`.

Allowed changes may include copy, creative, targeting, landing page URL, budget, or campaign setup.

`evaluate.md` may query the ads platform, CRM, analytics, or warehouse. It emits CTR, CPA, ROAS, lead quality, or conversion rate.

Guardrails must include spend cap, disallowed claims, audience restrictions, and pause command.

## Onboarding

`task.md` usually uses `code_change`, `config_change`, or `content_change`.

Allowed changes may include flow order, copy, default settings, checklist, empty states, or feature flag variants.

`evaluate.md` may query activation events, funnel completion, support tickets, or manual session review.

Guardrails may include error rate, support contacts, time to complete, and retention proxy.

## Latency

`task.md` usually uses `code_change` or `config_change`.

Allowed changes may include algorithms, caching, database queries, concurrency, batching, or infrastructure settings.

`evaluate.md` may run benchmarks, API load tests, traces, logs, or production telemetry queries. It emits p50, p95, p99, throughput, and error rate.

Guardrails may include correctness tests, error rate, cost, memory, and data consistency.

## Debugging

`task.md` may use `analysis_only` first, then `code_change`.

Allowed changes should target one hypothesis at a time.

`evaluate.md` may run reproduction scripts, tests, log queries, event counts, or support-ticket checks.

Guardrails include no unrelated behavior changes, no new errors, and test coverage for the failure.

## Pricing, Content, Search, Retention, Ranking

Use the same mapping:

1. Objective goes in `program.md`.
2. Allowed work goes in `task.md`.
3. Measurement goes in `evaluate.md`.
4. Safety constraints go in `guardrails.md`.
5. Runtime surfaces and scheduler go in `state.md`.

Do not add a new core domain branch.
