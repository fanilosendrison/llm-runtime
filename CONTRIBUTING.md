# Contributing to @fanilosendrison/llm-runtime

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone git@github.com:fanilosendrison/llm-runtime.git
cd llm-runtime
pnpm install
pnpm check  # should pass: typecheck + lint + test
```

### Prerequisites

- **Node >= 20** (22 LTS recommended) — see `.nvmrc`
- **pnpm >= 10** — see `packageManager` in `package.json`

## Workflow

1. **Fork & branch** from `main`
2. **Make changes** — follow the existing code style (enforced by Biome)
3. **Run checks**: `pnpm check` (typecheck + lint + test)
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(bindings): add Mistral-specific header parsing`
   - `fix(engine): correct retry backoff calculation`
   - `test(factories): add edge case for empty apiKey`
   - `docs(readme): update embedding example`
5. **Open a PR** against `main`

## Code Style

- **Linter/Formatter**: [Biome](https://biomejs.dev/) — config in `biome.json`
- **TypeScript**: Strict mode with all strict flags enabled
- **Imports**: Use `node:` protocol for Node.js builtins, `.js` extension for local imports
- **No `any`**: `noExplicitAny` is enforced
- **No `console`**: Use `LLMLogger` for observability

Run `pnpm lint:fix` and `pnpm format` before committing.

## Testing

Tests use [Vitest](https://vitest.dev/) and are located in `tests/`. All tests are unit tests using mock fetch — no real API calls.

```bash
pnpm test             # run once
pnpm test:watch       # watch mode
```

## Architecture

The project follows a spec-driven approach. Each module has a corresponding spec in `specs/`.

```
src/
├── bindings/     # Provider HTTP request/response mapping
├── engine/       # Core execution loop (retry, throttle, fetch)
├── errors/       # Error taxonomy (11 typed classes)
├── factories/    # Public adapter constructors
├── infra/        # Clock, ULID, logger, stats
├── services/     # Error classification, retry, sanitization
├── types.ts      # Public types
└── index.ts      # Public API surface
```

## Commit Messages

We use the `.gitmessage` template. See the file for format guidelines.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
