import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import path from 'path';

import { fetchGoogleUsage } from './providers/google/fetch.ts';
import { fetchOpenaiUsage } from './providers/openai/fetch.ts';
import { fetchZaiUsage } from './providers/zai-coding-plan/fetch.ts';
import { parseProvider } from './providers/common/registry.ts';
import { PROVIDERS, type ProviderId, type ProviderResult } from './types.ts';

interface CommandFrontmatter {
  description?: string;
}

interface ParsedCommand {
  name: string;
  frontmatter: CommandFrontmatter;
  template: string;
}

interface UsageArgs {
  provider?: string;
}

const parseFrontmatter = (content: string): { frontmatter: CommandFrontmatter; body: string } => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content.trim() };
  }

  const [, yamlContent, body] = match;
  const frontmatter: CommandFrontmatter = {};

  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key === 'description') {
      frontmatter.description = value;
    }
  }

  return { frontmatter, body: body.trim() };
};

const loadCommands = async (): Promise<ParsedCommand[]> => {
  const commands: ParsedCommand[] = [];
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const commandDir = path.join(__dirname, 'command');

  const walkDir = async (dir: string, baseDir: string = dir): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walkDir(fullPath, baseDir);
      } else if (entry.name.endsWith('.md')) {
        const content = await readFile(fullPath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        const relativePath = path.relative(baseDir, fullPath);
        const name = relativePath.replace(/\.md$/, '').replace(/\//g, '-');
        commands.push({ name, frontmatter, template: body });
      }
    }
  };

  await walkDir(commandDir);
  return commands;
};

const fetchUsage = async (provider: ProviderId): Promise<ProviderResult> => {
  switch (provider) {
    case 'openai':
      return fetchOpenaiUsage();
    case 'google':
      return fetchGoogleUsage();
    case 'zai-coding-plan':
      return fetchZaiUsage();
  }
};

export const UsagePlugin: Plugin = async () => {
  const commands = await loadCommands();

  const usageTool = tool({
    description: 'Fetch subscription usage for OpenAI, Google, and z.ai providers.',
    args: {
      provider: tool.schema
        .string()
        .optional()
        .describe(
          'Provider to check: openai, google, or zai-coding-plan. Aliases: codex, antigravity, zai.'
        ),
    },
    async execute(args: UsageArgs) {
      const targetProvider = parseProvider(args.provider);
      const providers: ProviderId[] = targetProvider ? [targetProvider] : PROVIDERS;
      const results = await Promise.all(providers.map(fetchUsage));

      return JSON.stringify(results, null, 2);
    },
  });

  return {
    tool: {
      usage: usageTool,
    },
    async config(config) {
      config.command = config.command ?? {};

      for (const cmd of commands) {
        config.command[cmd.name] = {
          template: cmd.template,
          description: cmd.frontmatter.description,
        };
      }
    },
  };
};

export default UsagePlugin;
