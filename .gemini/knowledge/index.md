# ExplodeIt Open Knowledge Format (OKF) Master Catalog

Welcome to the **ExplodeIt Open Knowledge Format (OKF)** progressive disclosure knowledge catalog. This catalog captures the architectural principles, codebase topology, state machines, deployment pipelines, multi-model pricing economics, Cloudflare R2 community storage, media caching, and operational resilience patterns of the ExplodeIt application.

---

## 🧭 Scout: Codebase Discovery & Topology
*Structural mapping, application entry points, dependency ecosystems, keyless showcase exploration, and environment bindings.*

- [**Codebase Topology & Directory Structure**](./scout/codebase_topology.md)  
  *Comprehensive structural map of ExplodeIt components, services, configuration, serverless functions, and build artifacts.*  
  `Tags: topology, file-tree, structure, directories`

- [**Application Entry Points & Bootstrapping**](./scout/application_entry_points.md)  
  *Analysis of HTML entrypoint, React 19 root mounting, DOM bootstrapping, and App controller initialization.*  
  `Tags: entry-point, react19, bootstrap, index.html, index.tsx`

- [**Runtime & Build Technology Stack**](./scout/technology_stack.md)  
  *Comprehensive specification of React 19, Vite 6, Tailwind CSS v4, @google/genai SDK, Vitest, IndexedDB, Cloudflare R2, and supporting libraries.*  
  `Tags: tech-stack, react, vite, tailwindcss, genai-sdk, vitest, indexeddb`

- [**Public Showcase, Carousel & Keyless Exploration System**](./scout/showcase_keyless_exploration.md)  
  *Decoupled startup authentication enabling keyless exploration of pre-generated topics, responsive hero carousel, and one-click interactive loading.*  
  `Tags: showcase, keyless-exploration, carousel, community, ux-navigation`

- [**Environment Bindings & Runtime Injection**](./scout/environment_bindings.md)  
  *Vite build-time env variable injection, process.env emulation, and client-side credential bindings.*  
  `Tags: environment, vite-config, credentials, api-key`

---

## 📊 Analyst: Domain Modeling & Economics
*Type definitions, domain contracts, mathematical pricing models, model tiers, and reactive user state machines.*

- [**Core Data Contracts & TypeScript Domain Models**](./analyst/domain_types.md)  
  *Type definitions for ObjectPlan, ComponentPart, GenerationItem, TokenUsage, ModelTier, SanitizedGenerationBundle, and MediaCacheEntry.*  
  `Tags: types, typescript, data-contracts, domain-model`

- [**Model Tiers, Presets & Dynamic Pricing Engine**](./analyst/model_tiers_pricing_engine.md)  
  *Unified model registry, dual presets (Pro Studio vs Budget Saver), granular stage overrides, dynamic token pricing, and run cost estimation.*  
  `Tags: models, pricing-engine, cost-estimation, presets, gemini, veo`

- [**Multi-Model Token Cost & Pricing Estimation Engine**](./analyst/cost_pricing_models.md)  
  *Mathematical pricing formulas and per-token/per-media rates for Gemini 3 Pro, 2.5 Flash, Veo 3.1, and Flash TTS.*  
  `Tags: pricing, cost-model, tokenomics, gemini-models, veo`

- [**User Flows & Generation Pipeline State Machine**](./analyst/user_flows_state_machine.md)  
  *Detailed analysis of user interaction journeys and the asynchronous state machine orchestrating multi-model pipeline transitions.*  
  `Tags: state-machine, user-flow, lifecycle, progress-tracker`

---

## 🏛️ Architecture: System Design & Security
*Multi-model generative AI orchestration, kinematic prompt engineering, Cloudflare R2 community storage, BYOK security, and containerization.*

- [**Multi-Model Generative AI Pipeline Architecture**](./architecture/generation_pipeline.md)  
  *End-to-end orchestration flow combining text, image synthesis, search grounding, video rendering, and TTS audio.*  
  `Tags: architecture, pipeline, gemini-pro, veo, multi-modal`

- [**Community Contribution Storage & R2 Sanitization Architecture**](./architecture/community_storage_r2.md)  
  *Client-side bundle packaging, strict allowlist sanitization (assertZeroLeak), Cloudflare R2 binary storage, and Pages Functions API.*  
  `Tags: community, cloudflare-r2, sanitization, pages-function, allowlist, byok-privacy`

- [**Kinematic & Anatomical Prompt Engineering Architecture**](./architecture/kinematic_prompt_engineering.md)  
  *4-tier anatomical deconstruction and isometric leader line prompts for Gemini 3 Pro Image and Veo 3.1 video assembly.*  
  `Tags: prompt-engineering, kinematics, infographics, veo, gemini-image`

- [**Bring-Your-Own-Key (BYOK) Client-Side Security Model**](./architecture/byok_security_model.md)  
  *In-browser credential storage, isolation, runtime injection, and non-persistence security guarantees.*  
  `Tags: security, byok, local-storage, client-side, authentication`

- [**Production Containerization & Cloud Run Architecture**](./architecture/containerization.md)  
  *Multi-stage Alpine Docker build, Nginx SPA rewrite routing, static caching, and Google Cloud Run deployment.*  
  `Tags: containerization, docker, nginx, cloud-run, spa`

---

## 🛠️ Builder: Build Pipelines, CI/CD & Runbooks
*Vite 6 and Tailwind v4 compilation mechanics, automated Vitest testing harness, Cloud Build pipelines, and local developer runbooks.*

- [**Vite 6 & Tailwind CSS v4 Build System**](./builder/vite_tailwind_build_system.md)  
  *Configuration of @tailwindcss/vite plugin, asset bundler, post-processing, and relative path resolutions.*  
  `Tags: build-system, vite, tailwind-v4, bundler, postcss`

- [**Automated Testing Harness & Adversarial Hardening Suite**](./builder/automated_testing_harness.md)  
  *Vitest test runner configuration, DOM environment, 4-tier testing hierarchy, and Tier 5 adversarial stress suites.*  
  `Tags: testing, vitest, contract-testing, e2e-testing, adversarial-tests, quality-assurance`

- [**Continuous Integration & Deployment (Cloud Build & GitHub Pages)**](./builder/cloud_build_cicd.md)  
  *Automated pipelines via Cloud Build container pipelines and GitHub Actions static deployment workflows.*  
  `Tags: ci-cd, cloud-build, github-actions, gh-pages, deployment`

- [**Local Developer Environment & Operational Runbook**](./builder/local_development_guide.md)  
  *Step-by-step developer setup, dependency management, dev server execution, and static typechecking.*  
  `Tags: developer-guide, local-dev, npm-scripts, runbook, workflow`

---

## 🛡️ Sentry: Resilience, Recovery & Memory Safety
*Network fault tolerance, 3-tier IndexedDB media caching, exponential backoff retries, and client-side binary blob memory management.*

- [**Multi-Tier Media Cache & Egress Elimination Architecture**](./sentry/media_cache_indexeddb.md)  
  *IndexedDB binary Blob caching with LRU eviction, in-memory ObjectURL pooling, and Cloudflare edge caching.*  
  `Tags: caching, indexeddb, lru-eviction, blob-urls, egress-elimination, performance`

- [**Error Recovery & Exponential Backoff Architecture**](./sentry/error_recovery_backoff.md)  
  *Network fault resilience, retry loops with exponential delays, and API rate limit management.*  
  `Tags: error-handling, exponential-backoff, resilience, retry-logic`

- [**Client-Side Blob Lifecycle & Memory Management**](./sentry/memory_management_assets.md)  
  *Management and teardown of object URLs, binary media buffers, and audio/video garbage collection.*  
  `Tags: memory-leak, blob-urls, garbage-collection, cleanup, lifecycle`

---

## 📈 Catalog Audit Log
For a chronological changelog of knowledge additions and updates, refer to [Knowledge Catalog Update Log](./log.md).
