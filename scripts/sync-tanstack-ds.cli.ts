import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  readLock,
  syncTanstackDs,
  type SyncTanstackDsDeps,
  type SyncTanstackDsLock,
  writeLock,
} from './sync-tanstack-ds.ts';

const execFileAsync = promisify(execFile);

const UPSTREAM_REPO = 'TanStack/tanstack.com';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Pinned fontsource CDN builds committed into public/fonts/ by sync. */
const SELF_HOSTED_FONTS = [
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource-variable/bricolage-grotesque@5.2.8/files/bricolage-grotesque-latin-wght-normal.woff2',
    fileName: 'BricolageGrotesque-latin-wght-normal.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5.2.6/files/ibm-plex-mono-latin-300-normal.woff2',
    fileName: 'IBMPlexMono-latin-300-normal.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5.2.6/files/ibm-plex-mono-latin-400-normal.woff2',
    fileName: 'IBMPlexMono-latin-400-normal.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5.2.6/files/ibm-plex-mono-latin-500-normal.woff2',
    fileName: 'IBMPlexMono-latin-500-normal.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5.2.6/files/ibm-plex-mono-latin-600-normal.woff2',
    fileName: 'IBMPlexMono-latin-600-normal.woff2',
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5.2.6/files/ibm-plex-mono-latin-700-normal.woff2',
    fileName: 'IBMPlexMono-latin-700-normal.woff2',
  },
] as const;

type CliArgs = {
  sha?: string;
  ref?: string;
  withOptional: boolean;
  help: boolean;
};

function printHelp(): void {
  console.log(`Usage: vp run sync:tanstack-ds [--ref <branch|tag>] [--sha <sha>] [--with-optional]

Pin/vendors TanStack DS assets from ${UPSTREAM_REPO} into this repo.

  (default)           Sync using scripts/sync-tanstack-ds.lock.json SHA
  --ref <branch|tag>  Resolve ref, sync, rewrite lock
  --sha <sha>         Sync that commit SHA, rewrite lock
  --with-optional     Also pull ButtonGroup, Collapsible, LibraryWordmark
`);
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { withOptional: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--with-optional') {
      args.withOptional = true;
    } else if (arg === '--sha') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--sha requires a value');
      }
      args.sha = value;
      i += 1;
    } else if (arg === '--ref') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--ref requires a value');
      }
      args.ref = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.sha && args.ref) {
    throw new Error('Pass only one of --sha or --ref');
  }
  return args;
}

async function resolveRefToSha(ref: string): Promise<string> {
  const url = `https://api.github.com/repos/${UPSTREAM_REPO}/commits/${encodeURIComponent(ref)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tanstack-aws-sync-tanstack-ds',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve ref ${ref}: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as { sha?: string };
  if (!body.sha) {
    throw new Error(`GitHub response for ref ${ref} omitted sha`);
  }
  return body.sha;
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'tanstack-aws-sync-tanstack-ds' },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${url}: ${response.status}`);
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const nodeStream = Readable.fromWeb(response.body as NodeWebReadableStream);
  await pipeline(nodeStream, createWriteStream(dest));
}

export async function fetchUpstreamArchive(sha: string): Promise<string> {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tanstack-ds-'));
  const archivePath = path.join(tmpRoot, 'upstream.tar.gz');
  const url = `https://codeload.github.com/${UPSTREAM_REPO}/tar.gz/${sha}`;
  await downloadToFile(url, archivePath);
  await execFileAsync('tar', ['-xzf', archivePath, '-C', tmpRoot]);
  const entries = await fs.readdir(tmpRoot, { withFileTypes: true });
  const dir = entries.find(
    (entry) => entry.isDirectory() && entry.name.startsWith('tanstack.com-'),
  );
  if (!dir) {
    throw new Error(`Extracted archive for ${sha} had no tanstack.com-* directory`);
  }
  return path.join(tmpRoot, dir.name);
}

export async function downloadSelfHostedFonts(fontsDir: string): Promise<void> {
  await fs.mkdir(fontsDir, { recursive: true });
  await Promise.all(
    SELF_HOSTED_FONTS.map((font) => downloadToFile(font.url, path.join(fontsDir, font.fileName))),
  );
}

function defaultDeps(): SyncTanstackDsDeps {
  return {
    fetchUpstream: async (sha) => fetchUpstreamArchive(sha),
    downloadSelfHostedFonts,
    now: () => new Date(),
  };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  let sha = args.sha;
  if (args.ref) {
    console.log(`Resolving ${UPSTREAM_REPO}@${args.ref}…`);
    sha = await resolveRefToSha(args.ref);
    console.log(`Resolved to ${sha}`);
  }

  // Ensure a lock exists for first-time sync when upgrading via --ref/--sha.
  try {
    await readLock(REPO_ROOT);
  } catch {
    if (!sha) {
      throw new Error(
        'Missing scripts/sync-tanstack-ds.lock.json — run once with --ref main or --sha <sha>',
      );
    }
    const bootstrap: SyncTanstackDsLock = {
      repo: UPSTREAM_REPO,
      sha,
      syncedAt: new Date(0).toISOString(),
    };
    await writeLock(REPO_ROOT, bootstrap);
  }

  console.log(`Syncing TanStack DS from ${UPSTREAM_REPO}@${sha ?? 'lock'}…`);
  const result = await syncTanstackDs(
    {
      repoRoot: REPO_ROOT,
      sha,
      ref: args.ref,
      withOptional: args.withOptional,
    },
    defaultDeps(),
  );

  console.log(`Synced ${UPSTREAM_REPO}@${result.sha}`);
  console.log('Wrote:');
  console.log('  src/webapp/ds/**');
  console.log('  public/fonts/**');
  console.log('  public/images/brand/**');
  console.log('  public/favicon-light.svg, public/favicon-dark.svg');
  if (args.withOptional) {
    console.log('  src/webapp/ds/optional/{ButtonGroup,Collapsible,LibraryWordmark}.tsx');
  }
}

const isCliEntry =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
