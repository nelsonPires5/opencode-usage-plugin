# Changelog

All notable changes to this project will be documented here.

## Unreleased

- Refactor types into domain-based structure (provider, usage, google, toast)
- Add toast-based usage display via `/usage` command (no LLM involved)
- Add flagship model filtering for Google provider (Claude Opus 4.5, Gemini 3 Pro, Gemini 3 Flash)
- Remove old LLM-based `usage` tool in favor of direct toast display

## v0.0.1

- Add GitHub release creation on package publish
- Add structured logging for debugging usage fetch operations
- Add support for google (antigravity)
- Add support for zai-coding-plan
- Add support for openai-codex
