## [unreleased]

### 🚀 Features

- Implement GREEN phase runtime with loop-clean iter-1 cleanups

### 🐛 Bug Fixes

- Resolve 11 backlog items via /backlog-crush and /loop-clean
- Resolve 53 backlog items via /loop-clean and /backlog-deep-crush
- *(nightly-clean)* Strip spurious backslash escapes in runner script
- *(nightly-clean)* Scope skip-check to branch-exclusive commits only
- *(spec-drift)* Resolve 6 notable spec-drift items — align code and specs
- *(spec-drift)* Resolve 6 notable spec-drift items — align specs to code patterns
- Emit llm_embedding_batch event after fetch with actual durationMs
- *(minor)* Resolve 6 minor hygiene items across engine and bindings
- *(nightly-clean)* Push per-iter commits when nothing staged
- *(nightly-clean)* Declare top-level write permissions for caller workflow

### 🚜 Refactor

- *(api)* [**breaking**] Align Adapter.call with embed options-bag signature
- *(nightly-clean)* Migrate from Claude Routines to GitHub Actions + cc-ci

### 📚 Documentation

- *(backlog)* Remove processed items and regroup by severity
- *(backlog)* Split spec-drift meta-items into 16 atomic entries
- *(backlog)* Migrate 46 legacy-blocked items to design-queue.md
- *(specs)* Promote I-14 and I-15 invariants in NIB-S
- *(specs)* Refresh NIB-M signal references to externalSignal
- *(backlog)* Add baseAdapterConfig dedup item from loop-clean

### 🧪 Testing

- Scaffold RED phase with stubs, helpers, fixtures, and 605 tests
- Tighten RED assertions and track GREEN-scope findings in backlog
- Harden assertions and resolve 24 backlog items via /backlog-crush

### ⚙️ Miscellaneous Tasks

- Initial commit
- Scaffold git hygiene (gitignore, gitattributes, README, cliff)
- *(setup)* Onboard project for Claude Code
- *(nightly-clean)* Enroll repo for nocturnal cleanup routine
- *(loop-clean)* Iter 0 — 0 applied, 0 escalated, 8 backlog
- Escalate stuck item to design-queue (EXIT_STABLE)
- *(engine)* Drop optional chaining on required sanitization field
- *(nightly-clean)* Change cron to 00:00 UTC

### ◀️ Revert

- *(specs)* Undo 2 of 13 nightly spec-drift alignments
