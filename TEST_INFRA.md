# TEST_INFRA — ExplodeIt Dual-Track E2E Testing Infrastructure

**Author:** E2E Test Writer  
**Target System:** ExplodeIt (Community Contribution Storage & Public Showcase)  
**Specification Sources:** `ORIGINAL_REQUEST.md`, `PROJECT.md`  
**Test Topology:** Vitest + Node.js (E2E & Modular Contract Testing)

---

## 1. Testing Philosophy & Core Principles

### 1.1 Opaque-Box & Requirement-Driven
The testing strategy treats the ExplodeIt application as an opaque system whose behavior is governed strictly by the authoritative requirements in `ORIGINAL_REQUEST.md` and the architecture contracts in `PROJECT.md`. Tests do not assert on internal private variables or transient component states; instead, they assert on:
- Public interface contracts (`calculateModelCost`, `estimateRunCost`, `bundleGenerationItem`, `uploadCommunityBundle`, `MediaCacheService`).
- Observable state transformations (localStorage/sessionStorage writes, IndexedDB blob allocations, ObjectURL creations).
- Syntactic and semantic prompt invariants (kinematic directives, leader lines, frame orientations).
- Zero-leak security allowlists (guaranteeing 0 API keys or bearer tokens escape to storage).
- DOM accessibility and user-flow transitions (keyless exploration, search filtering, one-click deconstruction loading).

### 1.2 The 4-Tier Testing Methodology
The suite is structured into four complementary verification tiers:
- **Tier 1: Feature Coverage (>=5 test cases per feature)**: Validates positive/happy-path functional contracts and behavioral expectations for each of the 14 project features.
- **Tier 2: Boundary & Corner Cases (>=5 test cases per feature)**: Adversarially probes edge conditions, null/empty states, extreme token/character sizes, network timeouts, format corruptions, and permission failures.
- **Tier 3: Cross-Feature Combinations (Pairwise Matrix)**: Tests interaction boundaries where features intersect (e.g. Budget Saver mode with video disabled interacting with bundle packaging and media caching).
- **Tier 4: Real-World Application Scenarios (>=5 multi-step E2E workflows)**: End-to-end user journeys simulating real browser sessions from initial unauthenticated entry to generation, caching, and community contribution.

---

## 2. Complete 14-Feature Inventory

| # | Feature Code | Feature Name | Core Specification | Authoritative Source |
|---|--------------|--------------|-------------------|----------------------|
| 1 | `FEAT-01` | Baseline Worktree & Type Safety | Isolated feature branch `feature/community-store-and-models`, zero tsc errors, Vitest harness | ORIGINAL_REQUEST §R6 |
| 2 | `FEAT-02` | Model Registry & Pricing Engine | Unified `MODEL_REGISTRY`, dynamic cost calculation per model type, multi-stage run cost estimation | ORIGINAL_REQUEST §R2 |
| 3 | `FEAT-03` | Model Tier UI & Persistence | Segmented switcher [Pro Studio \| Budget Saver], advanced stage overrides, localStorage persistence | ORIGINAL_REQUEST §R2 |
| 4 | `FEAT-04` | Infographic Prompt Upgrade | 4-tier component separation, internal cutaways, isometric leader lines, 5600K studio illumination | ORIGINAL_REQUEST §R3 |
| 5 | `FEAT-05` | Veo Assembly Kinematics | Spatial motion directives, interlocking sub-assemblies, start=infographic / end=assembled frame alignment | ORIGINAL_REQUEST §R3 |
| 6 | `FEAT-06` | Bundle Packaging & Sanitization | Binary Blob conversion, strict allowlist serialization, zero API key or private session data leakage | ORIGINAL_REQUEST §R1 |
| 7 | `FEAT-07` | Cloudflare R2 Endpoint & Mock | Cloudflare Pages Function `/api/contribute`, R2 bucket integration, catalog manifest index, offline mock driver | ORIGINAL_REQUEST §R1 |
| 8 | `FEAT-08` | Post-Gen Opt-In Contribution Flow | Non-intrusive dialog post-generation with zero-cost and privacy reassurance badges | ORIGINAL_REQUEST §R1 |
| 9 | `FEAT-09` | Multi-Tier Media Cache | IndexedDB Blob cache (`explodeit_media_cache_v1`), in-memory ObjectURL pool, LRU eviction, immutable headers | ORIGINAL_REQUEST §R5 |
| 10 | `FEAT-10` | Keyless Home Exploration | Decoupled startup authentication enabling instant exploration of pre-generated topics without API key | ORIGINAL_REQUEST §R4 |
| 11 | `FEAT-11` | Showcase Carousel & Topic Grid | Responsive hero carousel, topic card gallery, category/keyword search filtering | ORIGINAL_REQUEST §R4 |
| 12 | `FEAT-12` | One-Click Showcase Loading | Instant load of full interactive deconstruction into DisplayArea without key; seamless workspace transition | ORIGINAL_REQUEST §R4 |
| 13 | `FEAT-13` | Final Integration & E2E Suite Pass | 100% test pass across Tiers 1-4, adversarial stress testing | ORIGINAL_REQUEST Acceptance |
| 14 | `FEAT-14` | Safe Git Merge to Main | Clean, conflict-free merge of feature branch into main with passing verification gates | ORIGINAL_REQUEST §R6 |

---

## 3. Systematic 4-Tier Test Specifications

### Tier 1: Feature Coverage (>=5 Tests per Feature = 70 Tests)

#### FEAT-01: Baseline Worktree & Type Safety
1. `test_feat01_worktree_branch_identity`: Validates active git branch name matches `feature/community-store-and-models`.
2. `test_feat01_typescript_compilation_clean`: Executes `tsc --noEmit` and asserts 0 type errors across whole project.
3. `test_feat01_vitest_runner_invocation`: Asserts Vitest test runner starts and completes with exit code 0.
4. `test_feat01_node_version_compatibility`: Asserts Node environment satisfies engines `>=20.0.0`.
5. `test_feat01_package_dependencies_soundness`: Asserts `@google/genai`, `react`, `react-dom`, and `tailwindcss` resolve cleanly.

#### FEAT-02: Model Registry & Pricing Engine
1. `test_feat02_registry_contains_all_models`: Asserts `MODEL_REGISTRY` contains entries for Gemini 3 Pro, 2.5 Flash, Flash Lite, Pro Image, Imagen 3, Veo 3.1, Veo 2, and TTS.
2. `test_feat02_calculate_token_cost_pro`: Calculates cost for Gemini 3 Pro with 1,000 input and 2,000 output tokens ($0.00125 + $0.010 = $0.01125).
3. `test_feat02_calculate_media_cost_flat`: Calculates image and video flat per-generation fees correctly ($0.04/image, $0.10/video).
4. `test_feat02_calculate_tts_char_cost`: Calculates TTS cost based on character count ($0.002 per 1k characters).
5. `test_feat02_estimate_run_cost_pro_vs_budget`: Asserts `estimateRunCost(proConfig) > estimateRunCost(budgetConfig)` with accurate sum.

#### FEAT-03: Model Tier UI & Persistence
1. `test_feat03_preset_toggle_pro_sets_default_models`: Selecting 'pro' activates Gemini 3 Pro planning, Pro Image, and Veo 3.1.
2. `test_feat03_preset_toggle_budget_sets_budget_models`: Selecting 'budget' activates Flash planning, Imagen 3, and disables/downgrades video.
3. `test_feat03_localstorage_persistence_write_and_read`: Setting model tier serializes to `localStorage.getItem('explodeit_model_tier')`.
4. `test_feat03_advanced_accordion_override_single_stage`: Modifying only `narration` to custom model preserves other stages.
5. `test_feat03_budget_disable_video_flag`: Toggling `enableVideo: false` sets video cost to $0.00 in run estimator.

#### FEAT-04: Infographic Prompt Upgrade
1. `test_feat04_prompt_contains_4tier_separation`: Asserts infographic prompt template contains structural directives for 4-tier layer separation.
2. `test_feat04_prompt_contains_isometric_leader_lines`: Asserts prompt explicitly includes "leader callout lines" and "isometric" specifications.
3. `test_feat04_prompt_contains_internal_cutaways`: Asserts prompt requires internal cross-sections and exposed component cutaways.
4. `test_feat04_prompt_contains_5600k_studio_lighting`: Asserts prompt specifies 5600K balanced studio illumination and floating modularity.
5. `test_feat04_prompt_adapts_to_domain_type`: Asserts prompts vary correctly between `PHYSICAL`, `SOFTWARE`, `BIOLOGICAL`, and `CONCEPTUAL`.

#### FEAT-05: Veo Assembly Kinematic Prompt Upgrade
1. `test_feat05_assembly_kinematics_glide_and_align`: Asserts Veo video prompt specifies glide, trajectory, and multi-axis spatial motion.
2. `test_feat05_interlocking_mechanical_transitions`: Asserts prompt details sub-assembly interlocking and locking-in transitions.
3. `test_feat05_start_frame_matches_infographic`: Asserts prompt designates initial frame as exploded/disassembled floating state.
4. `test_feat05_end_frame_matches_assembled_product`: Asserts prompt designates final frame as unified, assembled, sealed state.
5. `test_feat05_no_unwanted_text_overlays`: Asserts prompt instructs model to omit 2D synthetic textual overlays or HUD watermarks.

#### FEAT-06: Bundle Packaging & Allowlist Sanitization
1. `test_feat06_package_bundle_creates_valid_blobs`: Converting a `GenerationItem` generates valid binary Blobs for infographic, assembled, and audio.
2. `test_feat06_manifest_metadata_structure`: Verifies `SanitizedGenerationBundle.manifest` contains id, topic, timestamp, domain, and model tier.
3. `test_feat06_zero_api_key_leakage_assertion`: Scans serialized bundle payload and strictly asserts absence of `apiKey`, `key`, `gemini_api_key`, or bearer patterns.
4. `test_feat06_strip_session_state`: Asserts internal UI session state (current tab, ephemeral retry counts) is stripped from bundle.
5. `test_feat06_bundle_checksum_and_size_integrity`: Verifies bundle manifest includes asset byte lengths matching generated Blobs.

#### FEAT-07: Cloudflare R2 Upload & Worker Endpoint
1. `test_feat07_worker_endpoint_receives_multipart`: Validates mock/worker endpoint accepts multipart payload with manifest and binary media.
2. `test_feat07_catalog_manifest_updated_post_upload`: Asserts `catalog.json` receives new record with topic, timestamp, and asset URIs.
3. `test_feat07_mock_driver_offline_roundtrip`: Asserts local mock driver can store and retrieve bundle without network connection.
4. `test_feat07_r2_bucket_unique_key_namespacing`: Asserts R2 object keys follow `<topic-slug>-<timestamp>/<asset-name>` format.
5. `test_feat07_worker_error_handling_malformed_payload`: Asserts 400 Bad Request returned when manifest JSON is missing or corrupted.

#### FEAT-08: Post-Generation Opt-In Contribution Flow
1. `test_feat08_contribution_modal_triggers_on_completion`: Completing generation state machine triggers opt-in prompt dialog.
2. `test_feat08_zero_cost_and_privacy_badges_rendered`: Asserts dialog displays "100% Free Hosting" and "Zero API Key Transmission" assurance badges.
3. `test_feat08_dismiss_dialog_does_not_upload`: Clicking "Keep Private" closes modal without triggering any network POST.
4. `test_feat08_confirm_upload_progress_indicator`: Clicking "Contribute to Encyclopedia" displays upload progress state.
5. `test_feat08_success_toast_with_public_slug`: Upon upload completion, displays success notification with topic URL slug.

#### FEAT-09: Multi-Tier Media Cache & Egress Elimination
1. `test_feat09_cache_blob_storage_indexeddb`: Verifies `setMediaBlob` stores Blob in `explodeit_media_cache_v1` IndexedDB store.
2. `test_feat09_cache_hit_returns_matching_blob`: Calling `getMediaBlob` on previously cached key returns byte-identical Blob.
3. `test_feat09_object_url_pool_reuse`: Asserts calling `getCachedObjectURL` multiple times for same key reuses existing ObjectURL without leak.
4. `test_feat09_lru_eviction_under_storage_pressure`: Asserts oldest accessed media entries are purged when cache size threshold is exceeded.
5. `test_feat09_http_immutable_header_contract`: Asserts edge worker serves media with `Cache-Control: public, max-age=31536000, immutable`.

#### FEAT-10: Keyless Home Exploration & Startup Decoupling
1. `test_feat10_startup_without_api_key_shows_showcase`: Launching app with empty sessionStorage renders showcase rather than blocking modal.
2. `test_feat10_api_key_modal_deferred_to_custom_action`: API key dialog is only triggered when user submits a custom generation prompt.
3. `test_feat10_keyless_state_banner`: UI indicates showcase browsing mode is active without prompting for credentials.
4. `test_feat10_session_only_storage_contract`: Providing an API key persists strictly to `sessionStorage`, never `localStorage`.
5. `test_feat10_clear_session_erases_key`: Closing tab or clicking "Clear Key" immediately purges key from runtime and sessionStorage.

#### FEAT-11: Showcase Carousel & Topic Card Grid
1. `test_feat11_carousel_renders_featured_topics`: Renders hero carousel with at least 3 curated showcase items.
2. `test_feat11_topic_card_displays_preview_and_metadata`: Each card displays title, category badge, visual thumbnail, and domain icon.
3. `test_feat11_search_filtering_by_topic_name`: Entering "Camera" filters list to matching topics instantly without network fetch.
4. `test_feat11_filter_by_domain_category`: Clicking "Mechanical" or "Software" category chips filters cards accordingly.
5. `test_feat11_empty_search_state_handling`: Searching for non-existent keyword displays helpful "No topics found" empty state.

#### FEAT-12: One-Click Interactive Showcase Loading
1. `test_feat12_click_topic_loads_full_deconstruction`: Clicking showcase item loads plan, 6-8 components, and article into DisplayArea.
2. `test_feat12_visual_media_loads_from_cache`: Infographic, assembled shot, and audio load directly from media cache without API key.
3. `test_feat12_tab_switching_in_showcase_item`: User can toggle between Infographic, Assembled, Deep Dive, and Audio views.
4. `test_feat12_custom_query_switches_to_workspace`: Typing a new topic in header search navigates smoothly into generation state machine.
5. `test_feat12_zero_key_prompt_during_showcase_playback`: Audio and video playback during showcase exploration never prompts for Gemini key.

#### FEAT-13: Final Integration & E2E Test Suite Pass
1. `test_feat13_all_unit_and_contract_tests_pass`: Asserts full test suite execution returns 0 failures across all modules.
2. `test_feat13_no_console_error_during_e2e_run`: Asserts E2E test runs produce 0 unhandled console errors or exceptions.
3. `test_feat13_asset_revocation_lifecycle_clean`: Asserts `revokeGenerationAssets` frees all active ObjectURLs on unmount.
4. `test_feat13_production_build_clean`: Asserts `vite build` produces production bundle in `dist/` with exit code 0.
5. `test_feat13_bundle_size_within_budgets`: Asserts main vendor JS bundle remains under 600KB uncompressed.

#### FEAT-14: Safe Git Merge to Main
1. `test_feat14_branch_clean_working_directory`: Asserts no uncommitted changes remain prior to merge.
2. `test_feat14_fast_forward_or_clean_merge`: Merges `feature/community-store-and-models` into `main` without conflict markers.
3. `test_feat14_post_merge_test_pass`: Re-executes Vitest suite on `main` post-merge to verify zero regressions.
4. `test_feat14_post_merge_build_pass`: Re-executes `npm run build` on `main` to verify deployment bundle.
5. `test_feat14_commit_history_author_integrity`: Asserts all commits reflect sanitized author identity `ksprashanth82@gmail.com`.

---

### Tier 2: Boundary, Edge & Adversarial Cases (>=5 Tests per Feature = 70 Tests)

#### FEAT-01: Baseline Worktree & Type Safety
1. `test_feat01_boundary_git_detached_head_detection`: Asserts test runner handles or flags detached HEAD state gracefully.
2. `test_feat01_boundary_typescript_strict_null_checks`: Validates code passes under strict null checks without unsafe any casts.
3. `test_feat01_boundary_missing_node_modules_clean_error`: Asserts missing dependency yields actionable error message.
4. `test_feat01_boundary_case_sensitive_import_resolution`: Asserts Linux-style case sensitivity in all module import paths.
5. `test_feat01_boundary_circular_dependency_absence`: Validates module dependency graph has zero circular imports.

#### FEAT-02: Model Registry & Pricing Engine
1. `test_feat02_boundary_zero_tokens_zero_cost`: Input 0 tokens, output 0 tokens yields exactly $0.00000.
2. `test_feat02_boundary_extreme_token_counts`: Input 10,000,000 tokens calculates correct astronomical cost without floating-point overflow.
3. `test_feat02_boundary_unknown_model_fallback`: Querying unlisted model ID falls back gracefully to default rate without crashing.
4. `test_feat02_boundary_negative_token_clamping`: Passing negative token values clamps to 0 or throws validation error.
5. `test_feat02_boundary_fractional_cent_rounding`: Cost engine formats currency with deterministic 5-decimal precision.

#### FEAT-03: Model Tier UI & Persistence
1. `test_feat03_boundary_corrupted_localstorage_recovery`: Corrupted JSON in `localStorage` resets safely to default 'pro' preset.
2. `test_feat03_boundary_unsupported_tier_string`: Unknown tier value (e.g. `'ultra'`) falls back safely to `'pro'`.
3. `test_feat03_boundary_partial_stage_override`: Specifying partial overrides preserves remaining stage defaults without `undefined`.
4. `test_feat03_boundary_empty_model_id_rejection`: Rejecting empty string as a model identifier.
5. `test_feat03_boundary_rapid_preset_toggle`: Toggling between 'pro' and 'budget' 50 times in rapid succession produces stable state.

#### FEAT-04: Infographic Prompt Upgrade
1. `test_feat04_boundary_single_component_prompt`: Topic with only 1 component still produces balanced 4-tier separation instructions.
2. `test_feat04_boundary_extreme_component_count`: Topic with 30 components groups items cleanly into logical sub-assemblies.
3. `test_feat04_boundary_special_characters_in_topic`: Topic containing quotes, ampersands, and unicode generates sanitized prompt without injection.
4. `test_feat04_boundary_empty_metaphor_fallback`: Missing or empty metaphor falls back to default "Exploded View".
5. `test_feat04_boundary_very_long_topic_name`: 500-character topic string is truncated or safely wrapped without blowing prompt token limits.

#### FEAT-05: Veo Assembly Kinematic Prompt Upgrade
1. `test_feat05_boundary_single_frame_kinematics`: Handling objects with static or non-moving assemblies (e.g. monoliths).
2. `test_feat05_boundary_abstract_concept_kinematics`: Software/conceptual topics generate abstract convergence directives instead of physical bolts.
3. `test_feat05_boundary_directionality_inversion_prevention`: Ensures prompt explicitly forbids reverse disassembly when assembly is requested.
4. `test_feat05_boundary_multilingual_topic_kinematics`: Topics in Japanese, Arabic, or German retain English kinematic command tokens.
5. `test_feat05_boundary_excessive_motion_prompt_length`: Asserts generated prompt stays within Veo prompt length constraints (<=1000 chars).

#### FEAT-06: Bundle Packaging & Allowlist Sanitization
1. `test_feat06_boundary_payload_with_dummy_api_key`: Injects mock `apiKey: "AIzaSy..."` into item; asserts sanitizer completely removes it.
2. `test_feat06_boundary_null_media_blobs`: Generation with missing video or audio packs manifest with `null`/`undefined` optional keys.
3. `test_feat06_boundary_corrupted_base64_conversion`: Malformed image data URL handled gracefully without throwing unhandled exception.
4. `test_feat06_boundary_deeply_nested_prototype_pollution`: Sanitization prevents `__proto__` or `constructor` injection in plan metadata.
5. `test_feat06_boundary_giant_payload_memory_limit`: Handling 100MB video blob without out-of-memory browser crash.

#### FEAT-07: Cloudflare R2 Upload & Worker Endpoint
1. `test_feat07_boundary_network_drop_during_upload`: Simulates connection failure mid-upload; verifies rollback or retry.
2. `test_feat07_boundary_duplicate_topic_slug`: Uploading same topic name twice generates unique collision-resistant timestamp ID.
3. `test_feat07_boundary_rate_limiting_429`: Exceeding upload rate limit receives 429 status and presents user-friendly retry message.
4. `test_feat07_boundary_presigned_url_expiration`: Expired presigned URL aborts gracefully and requests fresh ticket.
5. `test_feat07_boundary_r2_storage_quota_exhausted`: Storage full 507 response handled cleanly without hanging UI.

#### FEAT-08: Post-Generation Opt-In Contribution Flow
1. `test_feat08_boundary_repeated_modal_dismissal`: Dismissing modal persists preference for current session without nagging.
2. `test_feat08_boundary_modal_rendering_on_failed_generation`: Failed generation (`FAILED` state) NEVER triggers contribution modal.
3. `test_feat08_boundary_keyboard_escape_dismissal`: Pressing Escape key dismisses modal safely.
4. `test_feat08_boundary_offline_connectivity_status`: Modal displays disabled state or warning if user is offline (`navigator.onLine === false`).
5. `test_feat08_boundary_concurrent_upload_clicks`: Double clicking "Contribute" executes only a single upload operation.

#### FEAT-09: Multi-Tier Media Cache & Egress Elimination
1. `test_feat09_boundary_indexeddb_quota_exceeded`: QuotaExceededError triggers graceful eviction of oldest cached items.
2. `test_feat09_boundary_corrupted_blob_in_storage`: Corrupted or truncated Blob in IndexedDB is detected and re-fetched.
3. `test_feat09_boundary_private_browsing_indexeddb_disabled`: Fallback to in-memory cache when IndexedDB is blocked in private browsing mode.
4. `test_feat09_boundary_stale_object_url_cleanup`: Verifies `URL.revokeObjectURL` called when entry is evicted to prevent memory leaks.
5. `test_feat09_boundary_concurrent_fetches_single_network_flight`: 5 simultaneous requests for same media key trigger only 1 network fetch.

#### FEAT-10: Keyless Home Exploration & Startup Decoupling
1. `test_feat10_boundary_corrupted_session_storage_key`: Corrupted or invalid string in `sessionStorage` prompts for re-entry on custom generation.
2. `test_feat10_boundary_direct_navigation_to_topic_url`: Loading deep link `/topic/vintage-camera` renders showcase item without auth gate.
3. `test_feat10_boundary_space_padded_api_key`: Whitespace in entered API key is automatically trimmed before storage.
4. `test_feat10_boundary_session_storage_cleared_externally`: Clearing session storage while running falls back to keyless exploration on next action.
5. `test_feat10_boundary_switching_between_demo_and_byok`: Seamlessly switching from keyless showcase item to custom prompt input.

#### FEAT-11: Showcase Carousel & Topic Card Grid
1. `test_feat11_boundary_empty_catalog_manifest`: Empty `catalog.json` renders clean empty state with "Be the first to contribute!".
2. `test_feat11_boundary_thousand_topics_virtualization`: Gallery performs smoothly without DOM lag when rendering 1,000 topic cards.
3. `test_feat11_boundary_broken_thumbnail_fallback`: Topic with missing or 404 image thumbnail displays standard placeholder graphic.
4. `test_feat11_boundary_regex_special_chars_in_search`: Entering `.*+?[]()^$` in search bar does not throw RegExp syntax error.
5. `test_feat11_boundary_rapid_carousel_swiping`: Rapid touch swipes or arrow clicks do not break carousel index boundaries.

#### FEAT-12: One-Click Interactive Showcase Loading
1. `test_feat12_boundary_missing_video_in_showcase_item`: Topic without video disables video tab cleanly without UI breakage.
2. `test_feat12_boundary_audio_autoplay_policy_blocked`: Audio playback blocked by browser autoplay policy displays click-to-play button.
3. `test_feat12_boundary_rapid_switching_between_topics`: Clicking 5 showcase topics in rapid sequence displays the final selected topic.
4. `test_feat12_boundary_very_large_component_article`: Article with 50,000 words renders without blocking UI rendering thread.
5. `test_feat12_boundary_source_link_sanitization`: External URLs in component sources are validated to prevent `javascript:` XSS links.

#### FEAT-13: Final Integration & E2E Test Suite Pass
1. `test_feat13_boundary_ci_environment_headless_execution`: All tests execute successfully in headless CI without window/display server.
2. `test_feat13_boundary_zero_network_leakage_in_tests`: Unit/contract tests run with mock network boundaries, asserting 0 real egress.
3. `test_feat13_boundary_flakiness_zero_tolerance`: 10 consecutive test runs pass with 100% deterministic success.
4. `test_feat13_boundary_memory_leak_detection`: Memory footprint remains stable after running full test suite 3 times.
5. `test_feat13_boundary_cross_browser_compatibility`: Polyfills and DOM mocks support Chromium, WebKit, and Gecko environments.

#### FEAT-14: Safe Git Merge to Main
1. `test_feat14_boundary_divergent_main_rebase`: Gracefully handles updates on `main` via rebase before fast-forward merge.
2. `test_feat14_boundary_untracked_file_preservation`: Merging branch preserves untracked local developer config files.
3. `test_feat14_boundary_git_tag_integrity`: Version tags remain intact post-merge.
4. `test_feat14_boundary_submodule_or_nested_repo_check`: Asserts no extraneous `.git` folders exist within working tree.
5. `test_feat14_boundary_git_log_email_leak_prevention`: Scans full git history to ensure 0 commits contain forbidden author emails.

---

### Tier 3: Cross-Feature Combinations (Pairwise Coverage Matrix)

| Combination ID | Intersecting Features | Interaction Scenario | Expected Invariant |
|---|---|---|---|
| `COMB-01` | FEAT-02 (Pricing) × FEAT-03 (Tier UI) × FEAT-05 (Veo) | User selects Budget Saver mode and disables video generation. | Estimated run cost updates to zero video cost; video generation step skipped; bundle packaging marks `videoBlob: null`. |
| `COMB-02` | FEAT-06 (Sanitization) × FEAT-07 (R2 Upload) × FEAT-10 (Session Auth) | Generation run initiated with session API key, followed by community upload. | Sanitization strictly purges API key; upload payload contains 0 credentials; R2 catalog reflects new public item. |
| `COMB-03` | FEAT-09 (Media Cache) × FEAT-11 (Showcase) × FEAT-12 (One-Click Load) | User searches showcase, selects "Mechanical Watch", then revisits later. | Initial load stores media Blobs in IndexedDB; second visit reloads entirely from cache with 0 HTTP egress. |
| `COMB-04` | FEAT-04 (Prompts) × FEAT-05 (Kinematics) × FEAT-06 (Packaging) | Multi-modal prompt generation produces complete deconstruction. | Both infographic and assembled frames conform to kinematic alignment contracts before bundle packaging. |
| `COMB-05` | FEAT-08 (Contribution) × FEAT-09 (Cache) × FEAT-12 (Showcase Load) | User contributes custom generation; item is immediately loaded into showcase. | Newly uploaded bundle is seeded into local media cache, enabling immediate keyless playback without refetch. |
| `COMB-06` | FEAT-02 (Pricing) × FEAT-10 (Keyless) × FEAT-12 (Showcase Load) | Unauthenticated user explores showcase, then enters custom topic. | Showcase browsing incurs $0.00 spend; submitting custom topic activates API key prompt and starts session pricing tracker. |

---

### Tier 4: Real-World Application Scenarios (>=5 Scenarios)

#### Scenario 1: The Curious Student (Keyless Exploration & Deep-Dive Discovery)
- **Actor:** High-school student exploring physical anatomy for a science project without an API key.
- **Workflow:**
  1. Opens application home screen.
  2. Notices featured showcase carousel displaying "Human Heart", "Turbofan Jet Engine", and "Mechanical Watch".
  3. Uses search input to filter for "Engine".
  4. Clicks "Turbofan Jet Engine" topic card.
  5. Application loads full 8-component anatomical breakdown into `DisplayArea` without displaying an API key modal.
  6. Student toggles to "Assembled View", then clicks "Narration Tour" to listen to the audio guide.
- **Verification Assertions:**
  - `sessionStorage.getItem('gemini_api_key')` is `null`.
  - Zero calls to `@google/genai` API endpoints.
  - Media assets fetched once, then resolved from `explodeit_media_cache_v1`.
  - DisplayArea renders all 8 components with detailed Markdown articles.

#### Scenario 2: The Pro Engineer (High-Fidelity Generation & Public Contribution)
- **Actor:** Mechanical engineer creating an exploded view of a "Bespoke Mechanical Chronograph".
- **Workflow:**
  1. Enters session API key via Settings modal (stored in `sessionStorage`).
  2. Selects "Pro Studio" model preset (Gemini 3 Pro + Pro Image + Veo 3.1).
  3. Confirms estimated run cost (~$0.16).
  4. Submits custom topic "Bespoke Mechanical Chronograph".
  5. Generation pipeline executes: Planning -> Infographic -> Assembled -> Deep Dive -> Video -> Narration.
  6. Upon completion, non-intrusive Contribution Modal appears: "Share with ExplodeIt Encyclopedia".
  7. Reassurance badges confirm 100% free hosting and 0 API key transmission.
  8. Engineer clicks "Contribute to Encyclopedia".
  9. System packages sanitized bundle, uploads to R2 mock/worker, and updates catalog manifest.
- **Verification Assertions:**
  - Token and media pricing accumulates accurately in session spend tracker.
  - Uploaded bundle payload contains 0 instances of the user's API key.
  - Catalog manifest registers new topic entry with unique slug and metadata.

#### Scenario 3: The Budget-Conscious Researcher (Credit Conservation Mode)
- **Actor:** Independent researcher generating multiple topics while minimizing GenAI API costs.
- **Workflow:**
  1. Switches model tier to "Budget Saver".
  2. Checks the "Skip Video Assembly" toggle to save credits.
  3. Cost estimator reflects substantial reduction (from ~$0.16 to ~$0.005).
  4. Enters topic "Transformer Architecture in Deep Learning".
  5. App orchestrates planning and infographic generation using budget-tier models.
  6. Video generation stage is bypassed, setting status directly to `ENRICHING`.
  7. Generation completes successfully with infographic, deep-dive article, and narration.
- **Verification Assertions:**
  - Total run cost does not exceed $0.015.
  - `videoUrl` is `null`; `hasVideo` is `false`.
  - DisplayArea video tab is disabled or hidden.

#### Scenario 4: The Offline Scholar (Cached Replay & Zero-Egress Revisit)
- **Actor:** User on intermittent mobile connection reviewing previously viewed showcase topics.
- **Workflow:**
  1. User visits 3 showcase topics while connected to Wi-Fi.
  2. Multi-tier media cache stores images, narration audio, and manifest JSON into IndexedDB.
  3. Browser switches to offline mode (`navigator.onLine = false`).
  4. User revisits the 3 topics.
  5. App resolves all visual infographics, assembled shots, audio guides, and articles directly from IndexedDB.
- **Verification Assertions:**
  - Zero network requests dispatched during offline replay (`fetch` count = 0).
  - All media URLs generated via `URL.createObjectURL` from cached Blobs.
  - UI displays cached offline indicator without crashing or showing broken image icons.

#### Scenario 5: The Security Auditor (Adversarial Zero-Leak & Sanitization Verification)
- **Actor:** Security team auditing ExplodeIt client-to-cloud data boundary.
- **Workflow:**
  1. Configures active session API key: `AIzaSyDUMMY_SECRET_KEY_1234567890`.
  2. Injects simulated private credentials into local session state and mock window context.
  3. Initiates contribution bundle generation for an exploded view.
  4. Intercepts serialized bundle payload before it reaches the Cloudflare R2 upload endpoint.
  5. Performs cryptographic and pattern-matching scan across manifest, plan JSON, and media Blobs.
  6. Confirms zero occurrences of the API key, bearer tokens, or user environment secrets.
- **Verification Assertions:**
  - Regex `/AIzaSy[A-Za-z0-9_-]{33}/` matches 0 times in the upload payload.
  - String search for `AIzaSyDUMMY_SECRET_KEY_1234567890` yields -1.
  - No `localStorage` writes of private keys.

---

## 4. Test Suite Implementation Directory Map

```text
tests/
├── contracts/
│   ├── pricing_engine.contract.test.ts        # FEAT-02, FEAT-03: Pricing formulas, presets, overrides
│   ├── prompts_invariants.contract.test.ts    # FEAT-04, FEAT-05: Infographic 4-tier & Veo kinematics
│   ├── bundle_sanitization.contract.test.ts   # FEAT-06, FEAT-07: Bundle packaging & zero-leak allowlist
│   └── media_cache.contract.test.ts           # FEAT-09: IndexedDB Blob caching, ObjectURL pool, LRU
├── e2e/
│   ├── showcase_keyless_flow.e2e.test.ts      # FEAT-10, FEAT-11, FEAT-12: Keyless showcase, search, load
│   └── end_to_end_scenarios.e2e.test.ts       # Tier 3 Combinations & Tier 4 Real-World Scenarios 1-5
└── mocks/
    ├── mockStorage.ts                         # In-memory IndexedDB & localStorage mocks
    └── mockGenerations.ts                     # Pre-packaged sample generation bundles & catalog
```

---

## 5. Verification & Execution Runbook

### 5.1 Test Execution Command
To run the complete automated test suite:
```bash
npm run test
# OR directly via Vitest:
npx vitest run
```

### 5.2 Contract Tests Only
```bash
npx vitest run tests/contracts/
```

### 5.3 E2E Scenarios Only
```bash
npx vitest run tests/e2e/
```

### 5.4 TypeScript & Typecheck Gate
```bash
npx tsc --noEmit
```

### 5.5 Production Build Gate
```bash
npm run build
```
