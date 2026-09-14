---
okf_version: "1.0"
kind: "KnowledgeAsset"
asset_type: "agent-directives"
domain: "llm-runtime-repository-governance"
severity: "strict"
name: "llm-runtime Engineering GitHub Project profile"
---

# llm-runtime Engineering GitHub Project profile

Apply the shared GitHub Engineering Projects operational protocol before using
this profile. This file contains only llm-runtime-specific routing, authority,
classification, and workflow policy.

## Fixed routing

- GitHub owner: `fanilosendrison`
- Default repository: `fanilosendrison/llm-runtime`
- Repository visibility: public
- Project title: `llm-runtime Engineering`
- Project number: `6`
- Project URL: <https://github.com/users/fanilosendrison/projects/6>
- Project type: private user-owned GitHub Project V2
- Linked repository: `fanilosendrison/llm-runtime`

Resolve an unqualified `Issue #N` as `fanilosendrison/llm-runtime#N`. Follow an
explicit repository-qualified reference or Issue URL instead when the user
provides one.

## Authority boundary

Treat llm-runtime Engineering as the authority for durable work existence,
classification, priority, and workflow state. Never treat it as authority for
the public adapter contract, provider request semantics, or release content.

Apply these repository authority boundaries:

1. `specs/NIB-S-LLMRUNTIME.md` defines the system frame, the public surface, and
   the global invariants.
2. The `specs/NIB-M-*.md` module briefs define per-module normative behavior,
   and `specs/NIB-T-LLMRUNTIME.md` defines the observable test contract.
3. `CONTRIBUTING.md` defines contributor constraints and the required checks.
4. `src/` implements the runtime; executable behavior and tests outrank prose
   summaries when they disagree, and every disagreement must be reported.
5. `README.md` and `CHANGELOG.md` document usage and released content; they are
   not semantic authorities.
6. The npm registry is the distribution boundary for released versions; a
   version declared in `package.json` is not published until the registry
   serves it.

Report every inconsistency between these sources. An Issue or Project field
never ratifies adapter or provider semantics, and it never marks a version as
released.

## Workflow-status mapping

Map the shared protocol's workflow roles to these exact `Status` values:

- unready backlog: `Backlog`
- ready for independent pickup: `Ready`
- active execution: `In Progress`
- reviewable result: `Review`
- completed work: `Done`

`Ready` means the work can be picked up without reopening unresolved semantics,
external capabilities, or dependencies. Use the Project's `Agent Queue` view as
the normal autonomous pickup surface. A direct user request may select another
item, but it does not ratify proposed semantics or remove unresolved
prerequisites.

A breaking public-surface change that has not been accepted remains `Backlog`
even when its implementation would be small.

## Classification fields

### Area

Use `Area` for the surface that owns the immediate deliverable:

- `Bindings`
- `Engine`
- `Factories`
- `Public API`
- `Specs`
- `Release`
- `Tests`
- `Tooling`

Create linked follow-up Issues when a downstream area requires independent
acceptance, prerequisites, or scheduling.

### Kind

Use `Kind` for the item's relationship to the engineering plan:

- `Agent Task`: independently scoped work intended for direct execution.
- `Follow-up`: downstream work created by another task, finding, or accepted
  decision.
- `Finding`: a validated concern that still requires adjudication, design, or
  correction.

Do not retain an unvalidated observation as a `Finding` item.

### Priority

Use `Priority` according to this Project contract:

- `P0`: blocks current progress or protects a critical correctness, integrity,
  or contract invariant.
- `P1`: should be completed in the current phase.
- `P2`: important but non-blocking work.
- `P3`: useful retained work that can wait.

Priority controls scheduling only. It never overrides the published contract,
the module briefs, or the test contract.

An open public-contract decision defaults to `P0` while it remains unresolved,
because downstream consumers can otherwise adopt unratified semantics. A
`Follow-up` that operationalizes an already accepted decision does not inherit
that default. Record an explicit rationale on the Issue when deviating from
either default.

## Project views

The intended views are:

- `All Work`: table of every tracked item.
- `Agent Queue`: table filtered to `Status` in `Ready` or `In Progress`; the
  normal autonomous pickup surface.

Treat any difference between these declarations and live GitHub configuration as
an inconsistency to report before relying on the affected routing.

## Issue requirements

A normal llm-runtime Issue must state:

- the observed problem or required outcome;
- exact evidence: revisions, commands, observed output, and line or byte counts
  when relevant;
- the controlling NIB sections, invariants, and contributor constraints;
- the affected `Area` and every unresolved prerequisite;
- constraints and authority limits;
- mechanically checkable acceptance criteria;
- the required `pnpm check`, build, pack, or smoke validation.

Keep the Issue outcome-oriented. Do not duplicate the only authoritative module
contract or test vector in GitHub prose.

Populate `Status`, `Area`, `Kind`, and `Priority` for every Project Issue. Use
native GitHub parent, sub-issue, dependency, and Pull Request relationships when
available within this repository. Record a cross-repository dependency in both
Issue bodies, because native blocked-by relationships do not cross repositories.

## Findings and durable work

Create a `fanilosendrison/llm-runtime` Issue for every validated finding or other
work unit that must be deferred, handed off, scheduled, or tracked independently.
Add it to llm-runtime Engineering and populate all required fields.

Default retained findings to `Backlog`. Use `Ready` only when authority,
dependencies, capabilities, scope, acceptance criteria, and validation make the
work independently executable.

Do not create Issues for transient exploratory reasoning, duplicate backlog or
design-queue entries, or unvalidated observations.

## Repository validation

Use the current validation sequence in `CONTRIBUTING.md`: `pnpm run typecheck`,
`pnpm run lint`, `pnpm test`, `pnpm run build`, and `pnpm pack --dry-run` when
the published surface changes. Project completion or an Issue closure cannot
replace those checks or a required published-artifact verification.
