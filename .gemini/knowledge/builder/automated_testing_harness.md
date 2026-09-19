---
type: "Builder / Quality Assurance & Testing"
title: "Automated Testing Harness & Adversarial Hardening Suite"
description: "Vitest test runner configuration, DOM environment, 4-tier testing hierarchy, and Tier 5 adversarial stress suites."
resource: "file:///vitest.config.ts"
tags: ["testing", "vitest", "contract-testing", "e2e-testing", "adversarial-tests", "quality-assurance"]
---

# Automated Testing Harness & Adversarial Hardening Suite

## Overview
ExplodeIt features a multi-tiered test suite powered by **Vitest** and **jsdom**, configured in `vitest.config.ts`. The test infrastructure validates interface contracts, prompt invariants, allowlist security boundaries, and end-to-end user journeys without making live network requests or burning paid AI tokens.

## Testing Architecture

```text
tests/
├── contracts/                             # Modular contract verification
│   ├── bundle_sanitization.contract.test.ts  # Zero-leak allowlist serialization
│   ├── media_cache.contract.test.ts          # IndexedDB LRU eviction & quota tests
│   ├── pricing_engine.contract.test.ts       # Cost algorithms & estimate accuracy
│   └── prompts_invariants.contract.test.ts   # System prompt lexical & kinematic invariants
├── e2e/                                   # Multi-step user workflow simulations
│   ├── end_to_end_scenarios.e2e.test.ts      # Complete generation & contribution flows
│   └── showcase_keyless_flow.e2e.test.ts     # Keyless browsing & prompt interception
├── mocks/                                 # Deterministic test fixtures & stubs
│   ├── mockGenerations.ts                    # Seeded exploded view payloads
│   └── mockStorage.ts                        # In-memory IndexedDB & R2 drivers
├── challenger_*.test.tsx                  # Adversarial boundary and stress tests
├── tier5_adversarial_coverage_*.test.tsx  # Extended edge cases & security fuzzing
├── core.test.ts                           # Constants and helper unit tests
└── setup.ts                               # Global polyfills (IndexedDB, URL, TextEncoder)
```

## The 4-Tier + Tier 5 Verification Hierarchy

### Tier 1: Feature Contract Coverage
Tests pure interface contracts for each of the core features:
- Model cost calculations across all 6 stages.
- Bundle sanitization (`assertZeroLeak`).
- IndexedDB CRUD and cache key generation.
- Prompt invariant assertions (leader lines, isometric angles, 5600K lighting).

### Tier 2: Boundary & Corner Probes
Adversarially tests extreme inputs:
- Zero, negative, and extreme token counts ($10^7$ tokens).
- Empty component arrays, malformed JSON code blocks, missing media Blobs.
- Storage quota exhaustion and LRU eviction under concurrent writes.

### Tier 3: Cross-Feature Combinations
Asserts correctness when features intersect:
- Budget Saver mode (video disabled) packaging into community bundle.
- Switching model tiers mid-session while retaining active media URLs.
- Clearing history while maintaining active showcase cache.

### Tier 4: Real-World E2E Scenarios
Simulates realistic browser user journeys:
- First-time user opens site, browses showcase, clicks topic, views exploded parts.
- User submits custom prompt, enters API key in intercepted modal, runs generation, opts in to contribute.

### Tier 5: Adversarial Hardening
Stress tests against data corruption, prototype pollution, memory leaks, and stale React closures.

## Execution Runbook
```bash
# Run complete test suite
npx vitest run

# Run specific contract suite
npx vitest run tests/contracts/bundle_sanitization.contract.test.ts

# Run in watch mode for development
npm test
```
