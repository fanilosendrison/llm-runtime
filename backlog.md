# Backlog

Items residuels apres `/backlog-deep-crush` du 2026-04-17 (session deepcrush-001, 53 items resolus sur 101). Le 2026-04-18, les 2 meta-items spec-drift ("19 derives" + "44 drifts types") ont ete remplaces par 16 items atomiques avec `drift_id` stable, en application de la nouvelle regle "1 finding = 1 ligne" (cf. `~/.claude/skills/fix-or-backlog/SKILL.md`).

Les items ci-dessous sont annotes `(blocked: YYYY-MM-DD, skipped Nx)` pour persistance cross-session : `/backlog-deep-crush` les skippe tant que le marqueur `(blocked:` n'est pas retire manuellement. Les items spec-drift atomiques n'ont PAS de marqueur `blocked` — ils sont frais et peuvent etre traites par `backlog-fix` des le prochain cycle.

Trois categories de blocage :
- **Spec decisions** : necessite amendement de NIB-S/NIB-M ou arbitrage humain (event naming, parseResponse signature, kind field vs getter, constructor init-bag).
- **Refactors dedies** : split execute-call.ts, alignement types spec-drift, factorisations non-evidentes.
- **Fix hors-scope loop-clean** : fragilite enrichError, scope throttle embedding, ULID ordering.

---

## Major (3)

### Types / spec-drift

Items atomiques derives de `spec-drift.json` (17 drifts detectes, 16 drift_id uniques). Chaque ligne = 1 drift atomique, dedupable par `drift_id`. Remplace les 2 ex-meta-items "19 derives" et "44 drifts types" (ex-MAJOR + ex-NOTABLE) en application de la regle "1 finding = 1 ligne" (cf. ~/.claude/skills/fix-or-backlog/SKILL.md).

- [ ] [notable] spec-drift[EmbeddingBinding] — src/bindings/types.ts <-> specs/NIB-M-BINDING-EMBEDDING.md:40 — Property 'provider' is missing in type 'EmbeddingBinding' (date: 2026-04-18, drift_id: 88ed555f52e1e1c4)
- [ ] [notable] spec-drift[ProviderBinding] — src/bindings/types.ts <-> specs/NIB-M-BINDINGS-COMPLETION.md:43 — Signature divergence: parseResponse (body: unknown) vs spec (httpBody: string); readRateLimitHeaders extra nowMono/nowWall args (date: 2026-04-18, drift_id: ec040b59dd7facad)
- [ ] [notable] spec-drift[BindingConfig] — src/bindings/types.ts <-> specs/NIB-M-BINDINGS-COMPLETION.md:43 — providerOptions Record<string,unknown> vs spec unknown (date: 2026-04-18, drift_id: a3362656fe8f2b83)
- [ ] [notable] spec-drift[RetryDecision] — src/services/retry-resolver.ts <-> specs/NIB-M-RETRY-RESOLVER.md:50 — Code uses discriminated union { retry: true | false } vs spec flat { retry: boolean } (date: 2026-04-18, drift_id: c7643cc052128dbe)
- [ ] [notable] spec-drift[ThrottleDecision] — src/services/throttle-resolver.ts <-> specs/NIB-M-THROTTLE.md:49 — Code uses discriminated union { throttle: true | false } vs spec flat { throttle: boolean } (date: 2026-04-18, drift_id: c1fc0d7134eb6586)
- [ ] [notable] spec-drift[LLMMessage] — src/types.ts <-> specs/NIB-S-LLMRUNTIME.md:257 — LLMRequest/LLMMessage readonly arrays in code vs mutable in spec §5.1 (I-11 override: code intentionally stricter) (date: 2026-04-18, drift_id: f19c96e426719584)
- [ ] [notable] spec-drift[EmbeddingAdapter] — src/types.ts <-> specs/NIB-S-LLMRUNTIME.md:257 — embed(texts, signal?) vs spec embed(texts, options?: { signal? }) — options-bag signature (date: 2026-04-18, drift_id: b0b490e056f06b6c)
- [ ] [notable] spec-drift[AdapterConfig] — src/types.ts <-> specs/NIB-S-LLMRUNTIME.md:257 — retry/timeout/sanitization/integrity/logging optional in code vs required in spec; providerOptions Record<string,unknown> vs unknown (date: 2026-04-18, drift_id: ec3eedc925ad56a0)
- [ ] [notable] spec-drift[IntegrityPolicy] — src/types.ts <-> specs/NIB-S-LLMRUNTIME.md:388 — failOn* fields optional in code vs required in spec §5.2 (date: 2026-04-18, drift_id: 1c6072973c3de2a9)
- [ ] [notable] spec-drift[LoggingPolicy] — src/types.ts <-> specs/NIB-S-LLMRUNTIME.md:388 — enabled field optional in code vs required in spec §5.2 (date: 2026-04-18, drift_id: 54c17c108e2d9c2c)
- [ ] [notable] spec-drift[CanonicalHttpRequest] — src/bindings/types.ts <-> specs/NIB-S-LLMRUNTIME.md:454 — bodyKind 'json' in code vs 'json' | 'empty' in spec §6.1; bodyJson required vs optional (date: 2026-04-18, drift_id: 275d838a7c3d9d87)
- [ ] [notable] spec-drift[BindingConfig] — src/bindings/types.ts <-> specs/NIB-S-LLMRUNTIME.md:514 — providerOptions Record<string,unknown> vs spec §6.4 unknown (date: 2026-04-18, drift_id: c712d9d8b7bc6b07)
- [ ] [notable] spec-drift[ProviderBinding] — src/bindings/types.ts <-> specs/NIB-S-LLMRUNTIME.md:529 — parseResponse(body: unknown) vs spec §6.5 parseResponse(httpBody: string); readRateLimitHeaders extra args (date: 2026-04-18, drift_id: 8f20a0551878582d)
- [ ] [notable] spec-drift[EmbeddingBinding] — src/bindings/types.ts <-> specs/NIB-S-LLMRUNTIME.md:549 — Property 'provider' missing; buildRequest readonly string[] vs spec §6.6 mutable (date: 2026-04-18, drift_id: 4c8f0a7bd3f44089)
- [ ] [notable] spec-drift[RetryDecision] — src/services/retry-resolver.ts <-> specs/NIB-S-LLMRUNTIME.md:564 — Discriminated union vs spec §6.7 flat (date: 2026-04-18, drift_id: df5f65a323416b5b)
- [ ] [notable] spec-drift[ThrottleDecision] — src/services/throttle-resolver.ts <-> specs/NIB-S-LLMRUNTIME.md:564 — Discriminated union vs spec §6.7 flat (date: 2026-04-18, drift_id: f59f9759b6087605)

### Tests engine clock / timer tracking

- [ ] [MAJOR] tests/engine/*.test.ts — Aucun vi.doMock src/infra/clock.js; defaultClock hors mockClockRegistry. Fix : ajouter vi.doMock clock.js en tete de chaque fichier engine test (6 fichiers). (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)

### Dedup / oversized

- [ ] [MAJOR] src/engine/execute-call.ts (700 lignes) — OVERSIZED > 400. Fix : split en execute-call-main + validators + fetch + response-builders + helpers (~150 lignes each). (date: 2026-04-17, source: /dedup-codebase iter-1) (blocked: 2026-04-17, skipped 2x)

---

## Notable (25)

### Tests tautologiques ou fragiles

- [ ] [NOTABLE] tests/engine/execute-call-retry.test.ts T-EC-60 — Ne verifie pas snapshot updated vs invalidated. Fix : add follow-up call et assert llm_call_throttled present avec snapshotState known. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/contracts/observability.test.ts C-OB-27 — Ne verifie pas content.length===0 quand rawContentPreview present. Fix : capture response from adapter.call et assert res.content.length === 0 en parallele. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/global-contract.test.ts C-GL-25 — Pattern fragile push+reassign eventTypes. Fix : refactor en async helper runScenario retournant types+error. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)

### Fixtures orphelines

- [ ] [NOTABLE] tests/fixtures/events-schemas — 14 schemas JSON orphelins, aucun consumer. Fix : delete schemas OR add ajv-based validation test. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/fixtures/provider-responses — 18 error fixtures orphelins; tests use scenario helpers avec synthetic bodies. Fix : wire fixtures into per-binding parseResponse-error tests OR remove. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/fixtures/rate-limit-headers — 4/6 orphelins (groq, together, mistral-no-reset, retry-after-variants). Fix : drive parse-retry-after.test.ts from retry-after-variants.json via it.each(). (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)

### Spec-drift / types (senior-review iter-1)

- [ ] [NOTABLE] src/engine/execute-embedding.ts:180-321 — Event names divergent de NIB-M DoD #7 (llm_call_* au lieu de llm_embedding_*). Fix : aligner NIB-M a llm_call_ (match NIB-T) ou renommer emissions. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/engine/execute-embedding.ts — Throttle path entierement absent (spec 3.5.6/7 + DoD #4). Fix : wire throttle-snapshot via ExecuteEmbeddingContext ou amend spec si hors scope v1. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/bindings/types.ts — parseResponse param body:unknown au lieu de spec httpBody:string; engine pre-parse JSON. Fix : signature `(httpBody:string, headers) => ...` + JSON.parse inside bindings. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/bindings/anthropic.ts:141-167 — classifyError omet extraction error.message depuis body envelope. Fix : helper tryExtractAnthropicErrorMessage. Idem openai.ts / google.ts. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/bindings/google.ts:161-182 — classifyError omet extraction error.message depuis {error:{code,message,status}}. Fix : helper tryExtractGoogleErrorMessage. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/errors/index.ts:37-172 — kind est prototype getter au lieu de own readonly field; change Object.keys et JSON serialization. Fix : revert a `public override readonly kind = '...' as const`. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/errors/index.ts — Constructor utilise init-bag avec message? et default 'LLMRuntimeError' literal diverge de spec `constructor(message, options?)`. Fix : aligner ou remove fake default. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/factories/openai-embeddings.ts:25-28 — totalInputTokens jamais incremente contradict NIB-M-FACTORIES 3.5 symetrie. Fix : stats.totalInputTokens += delta.inputTokens. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/properties/properties.test.ts P-14 vs C-OB-18 — ULID ordering <= vs strict < inconsistant. Fix : aligner apres spec clarification sur ULID monotonic factory. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)

### Dedup residuel (dedup-codebase iter-1)

- [ ] [NOTABLE] src/engine/execute-call.ts:304-350 — retry sleep et throttle sleep dupliquent abortableSleep try-catch (seul message differe). Fix : handleAbortableSleep(delayMs, signal, messageContext). (date: 2026-04-17, source: /dedup-codebase iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/engine/execute-call.ts:378-447 vs execute-embedding.ts:232-276 — Fetch-error handling duplique. Fix : extract fetch-error-handler avec logger callback. (date: 2026-04-17, source: /dedup-codebase iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/bindings/{anthropic,google,openai,openai-embeddings}.ts — JSON.parse body validation duplique 4x (12 lignes identiques). Fix : extract ensureJsonObject(body, providerLabel). (date: 2026-04-17, source: /dedup-codebase iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/bindings/{anthropic,google}.ts — System/chat message extraction loop duplique. Fix : extract extractSystemAndChatMessages(messages). (date: 2026-04-17, source: /dedup-codebase iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] tests/bindings/openai-compatible.test.ts T-OC-12..15 — Provider quirks 4 tests byte-identical modulo provider literal. Fix : collapse en it.each + distinct-reference assertions. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 3x)

### Spec-drift / types (senior-review iter-1 bis)

- [ ] [NOTABLE] src/factories/openai-compatible.ts — providerOptions in AdapterConfig comme Record<string,unknown> au lieu de spec unknown. Fix : aligner avec spec ou documenter. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/engine/execute-embedding.ts:138-352 — totalBatches inconsistent sur success (batches.length) vs failure (batchIndex). Fix : batchIndex+1 ou split en failedBatchIndex. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)

### Post-GREEN review (loop-clean iter-2)

- [ ] [NOTABLE] src/bindings/{anthropic,openai,google}.ts — Usage object constructed as empty LLMUsage then mutated via unsafe cast `(usage as { inputTokens?: number }).inputTokens = input`, violating readonly interface. Fix : build usage object with all fields at construction time using spread. (date: 2026-04-17, source: /senior-review iter-2/loop-clean) (blocked: 2026-04-17, skipped 2x)
- [ ] [NOTABLE] src/engine/execute-call.ts:69-97 — enrichError uses `err.constructor as new (init)` cast to reconstruct errors; fragile if constructor signature changes. Fix : add abstract clone-with-context to LLMRuntimeError or document init-bag contract. (date: 2026-04-17, source: /senior-review iter-2/loop-clean) (blocked: 2026-04-17, skipped 2x)

---

## Minor (20)

### RED scaffold residuel

- [ ] [MINOR] src/types.ts — EmbeddingAdapterConfig ne extends pas AdapterConfig per NIB-S §5.1. Fix en GREEN : extends + narrowing commente. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/types.ts — AdapterConfig optional fields vs NIB-S required. Fix en GREEN : garder optional avec comment documenting factory default application. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/helpers/mock-fetch.ts — body ?? null serialization undocumented. Fix : add branch for undefined → empty string + JSDoc. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/helpers/mock-fetch.ts — MockFetch.calls mutable peut orpheliner closure. Fix : ReadonlyArray<MockFetchCall>. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/services/retry-resolver.test.ts P-RR-b — 525 iterations excede NIB-T §27.8 guideline 20-100. Fix : sample at 100 via seededRandom or rename to matrix test. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/services/sanitizer.test.ts T-SN-24 — Tautological typeof check. Fix en GREEN : assert concrete value per §7.3 calibration. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/engine/execute-call-happy-path.test.ts + 5 autres — Empty beforeEach blocks + beforeEach import unused. Fix : remove empty blocks and imports. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/engine/execute-call-happy-path.test.ts line 529 — Redundant vi.unstubAllGlobals dans runOnce. Fix : add comment explaining loop-isolated stubs. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/engine/execute-embedding.test.ts T-EE-22 — Mock-fetch ne honor pas AbortSignal during delayMs. Fix : extend mock-fetch.produce to abort on init.signal. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/fixtures/provider-responses/anthropic/error-529-headers.json — Non-uniform fixture shape {body, headers} vs siblings. Fix : rename to error-529-envelope.json. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] tests/properties/properties.test.ts sanity — Test sans P-XX ID keeping imports alive. Fix : remove OR add real P-31 determinism test. (date: 2026-04-17, source: /senior-review iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/bindings/{anthropic,openai,openai-compatible,google,openai-embeddings}.ts — notImplemented const duplicated 5x. Fix en GREEN : extract to src/bindings/_stub.ts. (date: 2026-04-17, source: /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] 9 test files > 400 lignes (observability 909, execute-call-abort-timeout 857, execute-call-retry 772, properties 705, execute-embedding 636, execute-call-happy-path 567, execute-call-integrity 533, global-contract 451, bindings/anthropic 414). Fix eventuel GREEN : split par subsection NIB-T (non-urgent, match spec section scope). (date: 2026-04-17, source: /dedup-codebase iter-0) (blocked: 2026-04-17, skipped 2x)

### GREEN phase review (senior-review iter-1)

- [ ] [MINOR] src/engine/execute-call.ts:196-209 — binding.buildRequest invoque 2x par call + IIFE swallow throws (spec §6.4 violation). Fix : compute canonical request once, reuse URL. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/engine/execute-call.ts:696-699 — retry.maxAttempts===0 throws TransientProviderError au lieu de InvalidRequestError. Fix : precondition top-of-function. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/engine/execute-embedding.ts:267-273 — provider_protocol re-wrap branch unreachable. Fix : remove lines 267-273. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/engine/execute-embedding.ts:118-136 — Endpoint resolution synthesize [''] input pour buildRequest. Fix : binding.resolveEndpoint(config) ou compute depuis config.endpoint. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/engine/execute-embedding.ts:232-276 — Fetch-error branch emits aucun observability event (spec 3.5.11). Fix : emit llm_embedding_fetch_error avant continue. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/services/error-classifier-base.ts:65-71 — 503 Retry-After non parse onto TransientProviderError.retryAfterMs. Fix : ajouter branche 500/502/503 avec retryAfterMs. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
- [ ] [MINOR] src/services/token-estimator.ts:10-24 — UTF8_ENCODER.encode alloue Uint8Array par message. Fix : Buffer.byteLength(str, 'utf8') allocation-free. (date: 2026-04-17, source: /senior-review iter-1) (blocked: 2026-04-17, skipped 2x)
