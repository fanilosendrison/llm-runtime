# Backlog

Items triés par /fix-or-backlog après /loop-clean iter-0 du commit f71536c (RED phase scaffold).

**Règle d'exécution** : ces items ne peuvent PAS être traités pendant l'Étape 1 RED car ils nécessitent la consommation de NIB-S / NIB-M (interdit en RED par le construction brief). Ils doivent être traités pendant l'Étape 2 GREEN ou en phase de consolidation post-GREEN.

---

## Major (9)

### Types / spec-drift

- [ ] [MAJOR] src/types.ts + src/bindings/types.ts — 19 dérives spec-drift entre stubs src/ et NIB-S : ProviderBinding/EmbeddingBinding sans field `provider`, parseResponse `body: unknown` vs spec `httpBody: string`, readonly vs mutable arrays, RetryDecision/ThrottleDecision discriminants, LLMIntegrityInfo.truncationMode manque `silent_prompt_truncation`, EmbeddingAdapter.embed signature divergente, AdapterConfig retry optional vs required, providerOptions `Record<string,unknown>` vs `unknown`. Fix en GREEN après consommation NIB-S §5/§6. (date: 2026-04-17, source: /spec-drift iter-0)

### Factories / validation

- [ ] [MAJOR] src/factories/*.ts — Aucun appel validateAdapterConfig; factories acceptent silently configs malformés (I-4 fail-closed violation). Fix : implémenter src/factories/validate-config.ts + appel au top de chaque factory avec enrichissement InvalidRequestError. (date: 2026-04-17, source: /senior-review iter-1)

### Tests engine clock / timer tracking

- [ ] [MAJOR] tests/engine/execute-call-abort-timeout.test.ts T-EC-111/112 — vi.getTimerCount ne tracke pas timers engine clock abstraction; tautologique. Fix : process.getActiveResourcesInfo ou spy setTimeout. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MAJOR] tests/engine/*.test.ts — Aucun vi.doMock src/infra/clock.js; defaultClock hors mockClockRegistry. Fix : ajouter vi.doMock clock.js en tête de chaque fichier engine test (6 fichiers). (date: 2026-04-17, source: /senior-review iter-1)

### Dedup / oversized

- [ ] [MAJOR] src/engine/execute-call.ts (700 lignes) — OVERSIZED > 400. Fix : split en execute-call-main + validators + fetch + response-builders + helpers (~150 lignes each). (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [MAJOR] src/engine/execute-call.ts:84-112 vs execute-embedding.ts:51-70 — enrichError dupliqué avec divergence champs préservés. Fix : extract src/engine/_internal/enrich-error.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [MAJOR] src/bindings/openai.ts:188-196 — Re-exports 6 internal helpers à sibling bindings violant NIB-M binding privacy. Fix : move à src/bindings/_internal/openai-common.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [MAJOR] src/bindings/{anthropic,openai,google}.ts classifyError — Trois bindings réimplémentent HTTP status switch ignorant classifyErrorBase delegation. Fix : remplacer par classifyErrorBase(signal) + override provider-spécifique. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [MAJOR] src/factories/{anthropic,openai,google,openai-compatible}.ts — Scaffolding completion adapter dupliqué 90%+. Fix : extract createCompletionAdapter(config, binding, provider) dans src/factories/_internal/create-adapter.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)

---

## Notable (60)

### Bindings (asymétrie stubs / NIB-T)

- [ ] [NOTABLE] src/bindings/anthropic.ts — terminationMap vide contredit NIB-T §10.5 T-AN-27..30. Fix en GREEN : populer { end_turn, max_tokens, stop_sequence, tool_use } ou garder stubs purs. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] src/bindings/openai.ts — terminationMap vide contredit NIB-T §11.5 T-OA-21..24. Fix en GREEN. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] src/bindings/google.ts — terminationMap vide contredit NIB-T §13.3 T-GG-11..21. Fix en GREEN. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] src/bindings/openai-compatible.ts — quirks hardcodé hasRateLimitHeaders:false pour tous providers; NIB-T T-OC-12..15 requiert true pour deepseek/mistral/groq/together. Fix en GREEN : lookup per-provider ou throw in stub. (date: 2026-04-17, source: /senior-review iter-0)

### Tests tautologiques ou fragiles

- [ ] [NOTABLE] tests/services/signal-composer.test.ts T-SC-09 — External signal jamais aborted; precedence rule untested. Fix : schedule external abort après timeout fire et assert composed reason reste le timeout reason. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/services/signal-composer.test.ts T-SC-01 — Assertion toBeDefined trop faible. Fix : expect(String(reason)).toMatch(/timeout/i) ou DOMException name TimeoutError. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/bindings/openai-compatible.test.ts T-OC-10/16 — Tautologiques contre stub par défaut hardcodé. Fix en GREEN : add cross-provider distinctness test. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/engine/execute-call-retry.test.ts T-EC-60 — Ne vérifie pas snapshot updated vs invalidated. Fix : add follow-up call et assert llm_call_throttled present avec snapshotState known. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/engine/execute-call-abort-timeout.test.ts T-EC-96 — Race-dependent assertion sur llm_call_fetch_error. Fix : add OR assertion ou tighten spec. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/engine/execute-call-retry.test.ts T-EC-46..49 — Skip vi.useFakeTimers inconsistent avec rest of file. Fix : add uniformly pour isolation. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/engine/execute-call-integrity.test.ts T-EC-133 — Ne vérifie pas event ordering before throw. Fix : assert findIndex(unknown_termination) < findIndex(call_end). (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/engine/execute-call-happy-path.test.ts P-EC-a — Tautologique : constant fixture → constant output. Fix : randomize request content per seed. (date: 2026-04-17, source: /senior-review iter-0)

### Tests qui mutent singletons ou patterns fragiles

- [ ] [NOTABLE] tests/properties/properties.test.ts P-28 — Mute anthropicBinding singleton via cast; crashe si frozen en GREEN. Fix : vi.spyOn(anthropicBinding, 'parseResponse').mockImplementation pour auto-restore. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/contracts/errors.test.ts C-ER-14 — Timing-dependent 50ms setTimeout peut flake sur CI chargé. Fix : switch to fake timers. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/contracts/observability.test.ts C-OB-27 — Ne vérifie pas content.length===0 quand rawContentPreview present. Fix : capture response from adapter.call et assert res.content.length === 0 en parallèle. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/global-contract.test.ts C-GL-25 — Pattern fragile push+reassign eventTypes. Fix : refactor en async helper runScenario retournant types+error. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/global-contract.test.ts C-GL-01 — Pas d'assertion bijective accepte extras silencieusement. Fix : add extras = Object.keys(mod).filter(...).expect([]). (date: 2026-04-17, source: /senior-review iter-0)

### Helpers fragiles ou patterns douteux

- [ ] [NOTABLE] tests/helpers/fixture-loader.ts loadScenario — Référence tests/fixtures/scenarios/ absent. Fix : créer dir avec .gitkeep + sample ou retirer loadScenario. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/helpers/mock-clock.ts setWall — Accepte invalid ISO produisant NaN. Fix : validate avec Number.isNaN(t) → throw. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/helpers/fetch-scenario.ts networkError — Fake TypeError via Object.assign; err instanceof TypeError === false. Fix : Object.assign(new TypeError(...), { code }). (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/helpers/event-assertions.ts sequenceMatches — Comma-join brittle. Fix : expect(actual).toEqual(expected). (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/helpers/event-assertions.ts allSameCallId — Vacuously true on empty array. Fix : add expect(events.length).toBeGreaterThan(0) guard. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/helpers/deep-freeze.ts — Skip Symbol-keyed properties. Fix : use Reflect.ownKeys(value). (date: 2026-04-17, source: /senior-review iter-0)

### Fixtures orphelines

- [ ] [NOTABLE] tests/fixtures/events-schemas — 14 schemas JSON orphelins, aucun consumer. Fix : delete schemas OR add ajv-based validation test. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0)
- [ ] [NOTABLE] tests/fixtures/provider-responses — 18 error fixtures orphelins; tests use scenario helpers avec synthetic bodies. Fix : wire fixtures into per-binding parseResponse-error tests OR remove. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0)
- [ ] [NOTABLE] tests/fixtures/rate-limit-headers — 4/6 orphelins (groq, together, mistral-no-reset, retry-after-variants). Fix : drive parse-retry-after.test.ts from retry-after-variants.json via it.each(). (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0)

### Schemas / types

- [ ] [NOTABLE] tests/fixtures/events-schemas/llm-call-throttled.schema.json — snapshotState empty schema (no enum). Fix : { enum: [known, unknown, partial] }. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [NOTABLE] tests/fixtures/events-schemas/llm-call-fetch-error.schema.json — networkErrorKind required mais optional en TS type. Fix : align schema/type. (date: 2026-04-17, source: /senior-review iter-0)

### GREEN phase senior-review iter-1

- [ ] [NOTABLE] src/engine/execute-call.ts:211-215 — llm_call_start emits messagesCount avant validateRequest; TypeError leak sans llm_call_end sur non-array messages. Fix : run validateRequest avant logger.emit OU guard messagesCount via Array.isArray. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/engine/execute-embedding.ts:180-321 — Event names diverge de NIB-M DoD #7 (llm_call_* au lieu de llm_embedding_*). Fix : aligner NIB-M à llm_call_ (match NIB-T) ou renommer emissions. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/engine/execute-embedding.ts — Throttle path entièrement absent (spec 3.5.6/7 + DoD #4). Fix : wire throttle-snapshot via ExecuteEmbeddingContext ou amend spec si hors scope v1. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/types.ts — ProviderBinding interface omet readonly provider field requis par NIB-M-BINDINGS-COMPLETION §2. Fix : ajouter provider partout. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/types.ts — parseResponse param body:unknown au lieu de spec httpBody:string; engine pre-parse JSON. Fix : signature `(httpBody:string, headers) => ...` + JSON.parse inside bindings. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/anthropic.ts:141-167 — classifyError omet extraction error.message depuis body envelope. Fix : helper tryExtractAnthropicErrorMessage. Idem openai.ts / google.ts. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/*.ts — Bindings importent parseRetryAfter depuis services/retry-resolver hors close-list (spec §10.5). Fix : déléguer via classifyErrorBase ou re-export parseRetryAfter. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/openai-compatible.ts — DeepSeek quirks hasRateLimitHeaders:true mais readRateLimitHeaders return null (incoherent). Fix : aligner NIB-T T-OC-12 ou NIB-M 5.7. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/openai-embeddings.ts:51-56 — parseEmbeddings manque embedding.length===0 check et element-type check. Fix : add length + typeof 'number' guards. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/bindings/google.ts:161-182 — classifyError omet extraction error.message depuis {error:{code,message,status}}. Fix : helper tryExtractGoogleErrorMessage. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/errors/index.ts:37-172 — kind est prototype getter au lieu de own readonly field; change Object.keys et JSON serialization. Fix : revert à `public override readonly kind = '...' as const`. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/errors/index.ts — Constructor utilise init-bag avec message? et default 'LLMRuntimeError' literal diverge de spec `constructor(message, options?)`. Fix : aligner ou remove fake default. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/factories/openai-embeddings.ts:25-28 — totalInputTokens jamais incrémenté contradict NIB-M-FACTORIES 3.5 symétrie. Fix : stats.totalInputTokens += delta.inputTokens. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/engine/execute-call-integrity.test.ts — 7 tests utilisent .resolves.toBeDefined tautologique. Fix : asserter sur response.termination ou autre field concret. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/properties/properties.test.ts P-14 vs C-OB-18 — ULID ordering <= vs strict < inconsistant. Fix : aligner après spec clarification sur ULID monotonic factory. (date: 2026-04-17, source: /senior-review iter-1)

### GREEN phase dedup + tests iter-1

- [ ] [NOTABLE] src/engine/execute-call.ts:304-350 — retry sleep et throttle sleep dupliquent abortableSleep try-catch (seul message diffère). Fix : handleAbortableSleep(delayMs, signal, messageContext). (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/engine/execute-call.ts:452-456 vs execute-embedding.ts:279-283 — Header lowercasing dupliqué. Fix : extract normalizeHeaders(headers). (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/engine/execute-call.ts:378-447 vs execute-embedding.ts:232-276 — Fetch-error handling dupliqué. Fix : extract fetch-error-handler avec logger callback. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/bindings/openai.ts:154-169 vs openai-compatible.ts:30-45 readGroqLikeHeaders — Byte-identical rate-limit reader. Fix : consolider dans _internal/openai-common.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/bindings/{anthropic,google,openai,openai-embeddings}.ts — JSON.parse body validation dupliqué 4x (12 lignes identiques). Fix : extract ensureJsonObject(body, providerLabel). (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/bindings/{anthropic,google}.ts — System/chat message extraction loop dupliqué. Fix : extract extractSystemAndChatMessages(messages). (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/factories/*.ts — Stats accumulation dupliqué 5x. Fix : updateStats(stats, delta) dans src/infra/stats.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] src/errors/index.ts:82 vs src/services/error-classifier-base.ts:16 — NetworkErrorKind type alias défini identique 2x. Fix : définir dans errors/ re-export depuis classifier-base. (date: 2026-04-17, source: /dedup-codebase iter-1)
- [ ] [NOTABLE] tests/bindings/openai-compatible.test.ts T-OC-12..15 — Provider quirks 4 tests byte-identical modulo provider literal. Fix : collapse en it.each + distinct-reference assertions. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/services/retry-resolver.test.ts P-RR-a — makeErr() appelé 2x produisant errors distinctes masque non-mutation property. Fix : create err once, passer 2x. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/bindings/google.test.ts — Aucun classifyError test. Fix : add T-GG classifyError pour 400/401/429/500. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/helpers/mock-fetch.ts:47-57 — JSON.stringify applied to string bodies double-quotes raw text; break parse-error scenarios. Fix : passthrough strings verbatim. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] tests/contracts/errors.test.ts C-ER-07 — JSON.stringify does not throw tautologique. Fix : asserter parsed contient expected fields. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/factories/openai-compatible.ts — providerOptions in AdapterConfig comme Record<string,unknown> au lieu de spec unknown. Fix : aligner avec spec ou documenter. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] src/engine/execute-embedding.ts:138-352 — totalBatches inconsistent sur success (batches.length) vs failure (batchIndex). Fix : batchIndex+1 ou split en failedBatchIndex. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [NOTABLE] spec-drift (44 drifts types) — src/types.ts et src/bindings/types.ts divergent de specs: readonly[], discriminants, bodyKind "empty", providerOptions typing, missing provider field. Fix : aligner types au fur et à mesure ou amend NIB-S. (date: 2026-04-17, source: /spec-drift iter-1)

### loop-clean iter-0 (post-backlog-crush review)

- [ ] [NOTABLE] src/types.ts:302-307 — LLMErrorKind imported and re-exported at bottom of types.ts is redundant; index.ts already re-exports directly from services/error-kind.js. Fix: remove bottom import + re-export from types.ts after verifying no consumer depends on it. (date: 2026-04-17, source: /senior-review iter-0)

---

## Minor (29)

### RED scaffold

- [ ] [MINOR] src/types.ts — EmbeddingAdapterConfig ne extends pas AdapterConfig per NIB-S §5.1. Fix en GREEN : extends + narrowing commenté. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] src/types.ts — AdapterConfig optional fields vs NIB-S required. Fix en GREEN : garder optional avec comment documenting factory default application. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] src/bindings/openai-compatible.ts — _provider unused mais T-OC-01..16 require per-provider behavior. Fix en GREEN : remove underscore once quirks become provider-dependent OR throw in body. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/helpers/mock-fetch.ts — body ?? null serialization undocumented. Fix : add branch for undefined → empty string + JSDoc. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/helpers/seeded-random.ts — randomMessages unreachable ?? fallback. Fix : extract pickFrom helper or add unreachable comment. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/helpers/mock-fetch.ts — MockFetch.calls mutable peut orpheliner closure. Fix : ReadonlyArray<MockFetchCall>. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/services/retry-resolver.test.ts P-RR-b — 525 iterations excède NIB-T §27.8 guideline 20-100. Fix : sample at 100 via seededRandom or rename to matrix test. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/bindings/anthropic.test.ts P-AN-b — Shallow Object.freeze au lieu de deepFreeze helper. Fix : import deepFreeze from tests/helpers. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/services/sanitizer.test.ts T-SN-24 — Tautological typeof check. Fix en GREEN : assert concrete value per §7.3 calibration. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/services/sanitizer.test.ts T-SN-17 — Weak assertion `removed === true`. Fix : add expect(result.content).not.toContain(backtick). (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/services/parse-retry-after.test.ts P-PA-c — Manque assert result >= 0. Fix : add inside defined branch. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/engine/execute-call-happy-path.test.ts + 5 autres — Empty beforeEach blocks + beforeEach import unused. Fix : remove empty blocks and imports. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0)
- [ ] [MINOR] tests/engine/execute-call-happy-path.test.ts line 529 — Redundant vi.unstubAllGlobals dans runOnce. Fix : add comment explaining loop-isolated stubs. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/engine/execute-embedding.test.ts T-EE-22 — Mock-fetch ne honor pas AbortSignal during delayMs. Fix : extend mock-fetch.produce to abort on init.signal. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/fixtures/events-schemas/llm-call-end.schema.json — usage field sans properties. Fix : inline nested schema. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/fixtures/provider-responses/openai/error-401.json — Missing typical code invalid_api_key. Fix : add field. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/fixtures/provider-responses/anthropic/error-529-headers.json — Non-uniform fixture shape {body, headers} vs siblings. Fix : rename to error-529-envelope.json. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/properties/properties.test.ts sanity — Test sans P-XX ID keeping imports alive. Fix : remove OR add real P-31 determinism test. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MINOR] tests/contracts/errors.test.ts C-ER-19 lignes 345+354-355 — Dead logger créé jamais wired. Fix : remove. (date: 2026-04-17, source: /senior-review + /dedup-codebase iter-0)
- [ ] [MINOR] src/bindings/{anthropic,openai,openai-compatible,google,openai-embeddings}.ts — notImplemented const duplicated 5x. Fix en GREEN : extract to src/bindings/_stub.ts. (date: 2026-04-17, source: /dedup-codebase iter-0)
- [ ] [MINOR] 9 test files > 400 lignes (observability 909, execute-call-abort-timeout 857, execute-call-retry 772, properties 705, execute-embedding 636, execute-call-happy-path 567, execute-call-integrity 533, global-contract 451, bindings/anthropic 414). Fix éventuel GREEN : split par subsection NIB-T (non-urgent, match spec section scope). (date: 2026-04-17, source: /dedup-codebase iter-0)

### GREEN phase iter-1

- [ ] [MINOR] src/engine/execute-call.ts:196-209 — binding.buildRequest invoqué 2x par call + IIFE swallow throws (spec §6.4 violation). Fix : compute canonical request once, reuse URL. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/engine/execute-call.ts:696-699 — retry.maxAttempts===0 throws TransientProviderError au lieu de InvalidRequestError. Fix : précondition top-of-function. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/engine/execute-embedding.ts:267-273 — provider_protocol re-wrap branch unreachable. Fix : remove lines 267-273. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/engine/execute-embedding.ts:118-136 — Endpoint resolution synthesize [''] input pour buildRequest. Fix : binding.resolveEndpoint(config) ou compute depuis config.endpoint. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/engine/execute-embedding.ts:232-276 — Fetch-error branch emits aucun observability event (spec 3.5.11). Fix : emit llm_embedding_fetch_error avant continue. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/services/error-classifier-base.ts:65-71 — 503 Retry-After non parsé onto TransientProviderError.retryAfterMs. Fix : ajouter branche 500/502/503 avec retryAfterMs. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/services/token-estimator.ts:10-24 — UTF8_ENCODER.encode alloue Uint8Array par message. Fix : Buffer.byteLength(str, 'utf8') allocation-free. (date: 2026-04-17, source: /senior-review iter-1)
- [ ] [MINOR] src/bindings/openai.ts:148-152 vs anthropic.ts:175-179 — parseIntStr / parseIntHeader byte-identical. Fix : consolider dans _internal/header-parsers.ts. (date: 2026-04-17, source: /dedup-codebase iter-1)

---

## Nit (1)

- [ ] [NIT] src/engine/execute-call.ts:301,334 — sleepSignal alloue AbortController throwaway jamais aborted. Fix : extract NEVER_ABORTING_SIGNAL constante module. (date: 2026-04-17, source: /senior-review iter-1)
