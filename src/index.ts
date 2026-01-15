import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import path from 'path';

import { fetchGoogleQuota } from './providers/google/fetch.ts';
import { fetchOpenaiQuota } from './providers/openai/fetch.ts';
import { fetchZaiQuota } from './providers/zai-coding-plan/fetch.ts';
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

interface QuotasArgs {
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
  const commandDir = path.join(import.meta.dir, 'command');
  const glob = new Bun.Glob('**/*.md');

  for await (const file of glob.scan({ cwd: commandDir, absolute: true })) {
    const content = await Bun.file(file).text();
    const { frontmatter, body } = parseFrontmatter(content);
    const relativePath = path.relative(commandDir, file);
    const name = relativePath.replace(/\.md$/, '').replace(/\//g, '-');
    commands.push({ name, frontmatter, template: body });
  }

  return commands;
};

const fetchQuota = async (provider: ProviderId): Promise<ProviderResult> => {
  switch (provider) {
    case 'openai':
      return fetchOpenaiQuota();
    case 'google':
      return fetchGoogleQuota();
    case 'zai-coding-plan':
      return fetchZaiQuota();
  }
};

export const QuotasPlugin: Plugin = async () => {
  const commands = await loadCommands();

  const quotasTool = tool({
    description: 'Fetch subscription quotas for OpenAI, Google, and z.ai providers.',
    args: {
      provider: tool.schema
        .string()
        .optional()
        .describe(
          'Provider to check: openai, google, or zai-coding-plan. Aliases: codex, antigravity, zai.'
        ),
    },
    async execute(args: QuotasArgs) {
      const targetProvider = parseProvider(args.provider);
      const providers: ProviderId[] = targetProvider ? [targetProvider] : PROVIDERS;
      const results = await Promise.all(providers.map(fetchQuota));

      return JSON.stringify(results, null, 2);
    },
  });

  return {
    tool: {
      quotas: quotasTool,
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

export default QuotasPlugin;
