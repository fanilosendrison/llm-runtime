# Backlog

Items triés par /fix-or-backlog après /loop-clean iter-0 du commit f71536c (RED phase scaffold).

**Règle d'exécution** : ces items ne peuvent PAS être traités pendant l'Étape 1 RED car ils nécessitent la consommation de NIB-S / NIB-M (interdit en RED par le construction brief). Ils doivent être traités pendant l'Étape 2 GREEN ou en phase de consolidation post-GREEN.

---

## Critical (4)

- [ ] [CRITICAL] tests/properties/properties.test.ts P-22/23/24 — Tests tautologiques : synthétisent eux-mêmes le ProviderErrorSignal puis vérifient les inputs. classifyErrorBase jamais invoqué. Fix en GREEN : injecter classifier spy via hook ou exporter composeErrorSignal pour observer les invariants réels. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [CRITICAL] tests/contracts/temporal.test.ts C-TM-04/05/06 — Mock clock jamais wired via vi.doMock sur src/infra/clock.js. Les invariants temporels (clock jump, monotonie) ne sont pas testés. Fix en GREEN : ajouter vi.doMock(../../src/infra/clock.js) au haut du fichier temporal.test.ts pour rerouter defaultClock via mockClockRegistry.current. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [CRITICAL] tests/contracts/observability.test.ts + tests/properties/properties.test.ts + tests/contracts/stats.test.ts — Tests embedding (C-OB-12..14, C-OB-16, C-OB-21, C-OB-23, C-ST-11, P-12) ne peuvent injecter fetch car EmbeddingAdapterConfig n'a pas providerOptions (NIB-M-BINDING-EMBEDDING §94). Fix en GREEN : utiliser vi.stubGlobal('fetch', mockFetch) en beforeEach des describe embedding. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [CRITICAL] tests/helpers/mock-fetch.ts delayMs — Utilise real setTimeout violant NIB-T §27.1 (devrait utiliser mockClock). scenario.timeout(30_000) hangue le test suite au-delà du testTimeout 10s. Fix : intégrer avec mockClockRegistry ou documenter le pattern vi.useFakeTimers + advanceTimersByTimeAsync. (date: 2026-04-17, source: /senior-review iter-0)

## Major (11)

- [ ] [MAJOR] tests/helpers/mock-signal.ts abortAfter — Utilise real setTimeout violant NIB-T §27.4 + leak timer sans cleanup handle. Fix : wire vers mockClockRegistry + retourner un cancel handle. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MAJOR] tests/helpers/mock-clock.ts install — Silently no-ops si test oublie vi.doMock wiring. Fix : throw dans fallback path ou fournir helper qui valide le doMock actif. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MAJOR] tests/engine/execute-embedding.test.ts T-EE-26 — Assert llm_call_retry_scheduled mais NIB-M-EXECUTE-EMBEDDING §3 enumère llm_embedding_retry_scheduled. Fix en GREEN : aligner sur NIB-M (authoritative). (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MAJOR] tests/engine/execute-call-retry.test.ts T-EC-58 — Ne teste pas snapshot invalidation que son ID porte. Fix : merger dans T-EC-59 ou assert absence de llm_call_throttled sur follow-up call dans T-EC-58 lui-même. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MAJOR] tests/engine/execute-call-abort-timeout.test.ts T-EC-113 — Body ne vérifie pas classification TransientProviderError que le titre prétend. Fix : assert retry_scheduled.reason === transient_provider. (date: 2026-04-17, source: /senior-review iter-0)
- [ ] [MAJOR] src/types.ts + src/bindings/types.ts — 19 dérives spec-drift entre stubs src/ et NIB-S : ProviderBinding/EmbeddingBinding sans field `provider`, parseResponse `body: unknown` vs spec `httpBody: string`, readonly vs mutable arrays, RetryDecision/ThrottleDecision discriminants, LLMIntegrityInfo.truncationMode manque `silent_prompt_truncation`, EmbeddingAdapter.embed signature divergente, AdapterConfig retry optional vs required, providerOptions `Record<string,unknown>` vs `unknown`. Fix en GREEN après consommation NIB-S §5/§6. (date: 2026-04-17, source: /spec-drift iter-0)

## Notable (28)

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

## Minor (18)

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

### Dedup + oversized files (tolérés par design)
- [ ] [MINOR] src/bindings/{anthropic,openai,openai-compatible,google,openai-embeddings}.ts — notImplemented const duplicated 5x. Fix en GREEN : extract to src/bindings/_stub.ts. (date: 2026-04-17, source: /dedup-codebase iter-0)
- [ ] [MINOR] 9 test files > 400 lignes (observability 909, execute-call-abort-timeout 857, execute-call-retry 772, properties 705, execute-embedding 636, execute-call-happy-path 567, execute-call-integrity 533, global-contract 451, bindings/anthropic 414). Fix éventuel GREEN : split par subsection NIB-T (non-urgent, match spec section scope). (date: 2026-04-17, source: /dedup-codebase iter-0)
