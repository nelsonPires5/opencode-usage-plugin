# AGENTS.md

## Overview

This repo is an OpenCode plugin that fetches usage from multiple providers and returns
normalized window data. Provider IDs follow models.dev naming and aliases are supported for
legacy inputs.

## Architecture Decisions

- **Provider IDs**: Use models.dev IDs only in code (`openai`, `google`, `zai-coding-plan`).
  - Aliases are accepted via `src/providers/common/registry.ts`.
- **Output**: The `usage` tool returns a JSON string containing an array of provider results.
  Formatting is handled by `src/command/usage.md`.
- **Normalized Usage**: Providers emit `ProviderResult` with `usage.windows` (global windows) and
  optional `usage.models[model].windows` for per-model usage.
- **Window Fields**: `UsageWindow` includes `usedPercent`, `remainingPercent`, `windowSeconds`,
  `resetAt`, `resetAfterSeconds`.
- **Auth**: Provider-specific auth lives with the provider in `src/providers/<provider>/auth.ts`.
  Shared auth utilities and paths live in `src/providers/common/files.ts`.

## Directory Layout

- `src/index.ts`: Plugin entrypoint and tool wiring
- `src/types.ts`: Shared types and normalized schema
- `src/providers/common/`: Shared helpers (auth file IO, provider registry, time helpers)
- `src/providers/<provider>/`: Provider-specific auth, fetcher, and tests
- `src/command/usage.md`: Command template for formatting output

## Provider Auth Sources

- **OpenAI**: `~/.local/share/opencode/auth.json` (`openai`, aliases `codex`, `chatgpt`) or
  `~/.opencode/auth/openai.json`
- **Google**: `~/.local/share/opencode/auth.json` (`google`, alias `antigravity`) or
  `~/.config/opencode/antigravity-accounts.json` (`activeIndex` preferred)
- **z.ai**: `~/.local/share/opencode/auth.json` (`zai-coding-plan`, aliases `zai`, `z.ai`) or
  `ZAI_API_KEY`

## Release Lifecycle

Agents should follow this lifecycle for releasing new versions:

1.  **Start Dev Cycle**: `mise run bump patch --dev` (0.0.1 -> 0.0.2-dev)
2.  **Iterate**: `mise run bump prerelease` (0.0.2-dev -> 0.0.2-dev1)
3.  **Finalize**: `mise run bump release` (0.0.2-dev1 -> 0.0.2)

Refer to `RELEASE.md` for more details.

## Code Style Guidelines

### Imports & Module System

- Use ES6 `import`/`export` syntax (module: "ESNext", type: "module")
- Group imports: external libraries first, then internal modules
- Use explicit file extensions (`.ts`) for internal imports

### Formatting (Prettier)

- **Single quotes** (`singleQuote: true`)
- **Line width**: 100 characters
- **Tab width**: 2 spaces
- **Trailing commas**: ES5 (no trailing commas in function parameters)
- **Semicolons**: enabled

### TypeScript & Naming

- **NeverNesters**: avoid deeply nested structures. Always exit early.
- **Strict mode**: enforced (`"strict": true`)
- **Classes**: PascalCase
- **Methods/properties**: camelCase
- **Status strings**: use union types
- **Explicit types**: prefer explicit type annotations over inference
- **Return types**: optional (recommended for public methods)

### Error Handling

- Check error type before accessing error properties:
  `error instanceof Error ? error.toString() : String(error)`
- Log errors with `[ERROR]` prefix for consistency
- Always provide error context when recording output

### Linting Rules

- `@typescript-eslint/no-explicit-any`: warn (avoid `any` type)
- `no-console`: error (minimize console logs)
- `prettier/prettier`: error (formatting violations are errors)

## Build & Test Commands

- **Build**: `npm run build` or `mise run build`
- **Test**: `npm test` (runs all tests, mocks only by default)
- **Single Test**: `npm test -- src/providers/<provider>/fetch.test.ts`
- **Watch Mode**: `npm run test:watch`
- **Lint**: `npx eslint src/` or `mise run lint` (eslint)
- **Fix Lint**: `mise run lint:fix` (eslint --fix)
- **Format**: `mise run format` (prettier)

## Testing

- Framework: **vitest** with `describe` & `it` blocks
- Style: Descriptive nested test cases with clear expectations
- Assertion library: `expect()` (vitest)
- Configuration: `vitest.config.ts` loads `.env.test` automatically

### Test Structure

**Test files**:

- `src/providers/common/test-helpers.ts` - Shared utilities (mock data, assertions, auth checks)
- `src/providers/<provider>/fetch.test.ts` - Provider-specific tests
- `src/index.test.ts` - Provider registry parsing tests

**Test organization per provider**:

```typescript
describe('Provider Name', () => {
  describe('with mocks', () => {
    it('handles missing auth');
    it('handles API errors');
    it('parses response correctly');
  });

  describe.skipIf(!isRealAuthEnabled('provider'))('with real auth', () => {
    it('fetches usage successfully');
    it('returns valid usage data');
  });
});
```

### Environment Configuration

**`.env.test`** (committed to repo):

```bash
TEST_REAL_OPENAI_AUTH=0
TEST_REAL_GOOGLE_AUTH=0
TEST_REAL_ZAI_CODING_PLAN_AUTH=0
```

### Mocking Pattern

```typescript
import { beforeEach, describe, it, vi } from 'vitest';
import { fetchProviderUsage } from './fetch.ts';
import * as auth from './auth.ts';

vi.mock('./auth.ts', () => ({
  getProviderAuth: vi.fn(),
}));

const mockGetAuth = auth.getProviderAuth as ReturnType<typeof vi.fn>;
const mockFetch = vi.fn();

global.fetch = mockFetch;
```

## Adding a New Provider

1. Create `src/providers/<provider>/auth.ts` and `fetch.ts`.
2. Register provider ID + aliases in `src/providers/common/registry.ts`.
3. Add provider ID to `PROVIDERS` in `src/types.ts`.
4. Add provider tests in `src/providers/<provider>/fetch.test.ts`.
5. Add `TEST_REAL_<PROVIDER>_AUTH=0` to `.env.test`.
6. Use `ProviderResult` and `UsageWindow` to normalize output.

## Memory

- Store temporary data in `.memory/` directory (gitignored)

## Project Context

- **Type**: ES Module package for OpenCode plugin system
- **Target**: Node.js runtime, ES2021+
- **Purpose**: Fetch and normalize subscription usage windows across providers
