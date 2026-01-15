# opencode-usage-plugin

OpenCode plugin that fetches subscription usage for OpenAI, Google, and z.ai.

## Features

- `/usage` command for all providers
- `/usage <provider>` for a single provider
- Returns normalized JSON for provider usage
- Reads tokens from OpenCode and auth plugins

## Installation in OpenCode

Create or edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-usage-plugin@0.0.1"]
}
```

For local development, use a relative path:

```json
{
  "plugin": ["./path/to/opencode-usage-plugin"]
}
```

## Provider Setup

### OpenAI

- Install the `opencode-openai-codex-auth` plugin, or ensure `openai` auth exists in
  `~/.local/share/opencode/auth.json` (aliases: `codex`, `chatgpt`).
- The plugin also checks `~/.opencode/auth/openai.json` as a fallback.

### Google

- Install an Antigravity auth plugin (for example, `opencode-antigravity-auth`) or ensure
  `google` auth exists in `~/.local/share/opencode/auth.json` (alias: `antigravity`).
- Ensure accounts are stored in `~/.config/opencode/antigravity-accounts.json`.
- The `activeIndex` account is used for usage checks (falls back to the first account).

### z.ai

- Add a `zai-coding-plan` entry in `~/.local/share/opencode/auth.json` with the API key
  (aliases: `zai`, `z.ai`), or set `ZAI_API_KEY`.

## Usage

```bash
/usage
/usage openai
/usage google
/usage zai-coding-plan
```

## Output

- `usage` tool returns a JSON array (string) of provider usage results
- `command/usage.md` formats a human-readable summary

## Development

```bash
bun install
mise run build
bun run test
mise run lint
```

### Testing

Tests use **vitest** with a provider-specific auth configuration system.

**Run all tests** (mocks only, default):

```bash
bun run test
```

**Run tests with real auth**:

```bash
# Edit .env.test and set desired provider(s) to 1
TEST_REAL_OPENAI_AUTH=1
TEST_REAL_GOOGLE_AUTH=1
TEST_REAL_ZAI_CODING_PLAN_AUTH=1
bun run test
```

**Run specific provider tests**:

```bash
bun test src/providers/openai/fetch.test.ts
bun test src/providers/google/fetch.test.ts
bun test src/providers/zai-coding-plan/fetch.test.ts
```

**Test structure**:

- `src/providers/common/test-helpers.ts` - Shared test utilities and fixtures
- `src/providers/*/*.test.ts` - Provider-specific tests with mocks and real auth
- `.env.test` - Auth configuration flags (committed to repo)
- `vitest.config.ts` - Test configuration

Tests are organized into two categories per provider:

- **Mock tests** - Run by default, test all edge cases and error handling
- **Real auth tests** - Skipped by default, enabled via `.env.test` flags

**Adding new providers**:

1. Implement provider function in `src/providers/`
2. Add `TEST_REAL_NEWPROVIDER_AUTH=0` to `.env.test`
3. Create `src/providers/newprovider.test.ts` following existing patterns
4. Add helpers to `src/test-helpers.ts` if needed

## Author

Nelson Pires <nelsonpires.sn@gmail.com>

## Repository

https://github.com/nelsonPires5/opencode-usage-plugin

## License

MIT License. See the [LICENSE](LICENSE) file for details.
