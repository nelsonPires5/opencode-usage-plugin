---
description: Show remaining usage for AI coding providers (OpenAI, Google, z.ai)
---

Call the `usage` tool.

If $ARGUMENTS is empty, fetch usage for all configured providers.
If $ARGUMENTS is provided, it should be one of: openai, google, zai-coding-plan (aliases: codex, antigravity, zai).

The tool returns a JSON string with a list of provider results:

- `provider`, `ok`, `configured`, `error`
- `usage.windows` for global windows
- `usage.models[model].windows` for per-model windows

Each window includes:

- `remainingPercent` - remaining usage percentage
- `resetAfterFormatted` - human-readable time remaining (e.g., "2w 3d 5h 10m 30s")
- `resetAtFormatted` - exact reset datetime (e.g., "Thursday, January 16, 2026, 2:30:45 PM EST")
- `windowSeconds` - size of the usage window

Parse the JSON, then return a short markdown summary per provider.
Include remaining percent, reset time remaining, reset datetime, window size, and any errors.
