import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  syncTanstackDs,
  type SyncTanstackDsDeps,
  type SyncTanstackDsLock,
} from './sync-tanstack-ds.ts';

const LOCK_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const UPGRADE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

async function writeTree(root: string, files: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([rel, content]) => {
      const abs = path.join(root, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, 'utf8');
    }),
  );
}

async function readUtf8(root: string, rel: string): Promise<string> {
  return fs.readFile(path.join(root, rel), 'utf8');
}

async function exists(root: string, rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

describe('syncTanstackDs', () => {
  let repoRoot: string;
  let upstreamRoot: string;

  beforeEach(async () => {
    repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-ds-repo-'));
    upstreamRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-ds-up-'));

    await writeTree(upstreamRoot, {
      'src/styles/app.css': '/* tokens */',
      'src/components/ds/ui/index.tsx': 'export const Button = () => null\n',
      'src/components/ds/ui/PixelSpinner.tsx':
        "import { PIXEL_SPINNER_FRAMES } from '../pixel-spinner-frames'\n",
      'src/components/ds/pixel-spinner-frames.ts': 'export const PIXEL_SPINNER_FRAMES = []\n',
      'src/libraries/icons.ts': 'export const libraryIcons = {}\n',
      'src/libraries/categories.ts': 'export const libraryCategories = {}\n',
      'src/components/Logo.tsx': 'export function Logo() { return null }\n',
      'src/components/ButtonGroup.tsx': 'export const ButtonGroup = null\n',
      'src/components/Collapsible.tsx': 'export const Collapsible = null\n',
      'src/components/LibraryWordmark.tsx': 'export function LibraryWordmark() { return null }\n',
      'public/fonts/Inter-latin.woff2': 'inter-latin',
      'public/fonts/Inter-latin-ext.woff2': 'inter-latin-ext',
      'public/fonts/OFL-Bricolage-Grotesque.txt': 'OFL',
      'public/images/brand/tanstack-emblem-cream.svg': '<svg />',
      'public/favicon-light.svg': '<svg id="light" />',
      'public/favicon-dark.svg': '<svg id="dark" />',
    });

    await writeTree(repoRoot, {
      'scripts/sync-tanstack-ds.lock.json': JSON.stringify(
        {
          repo: 'TanStack/tanstack.com',
          sha: LOCK_SHA,
          syncedAt: '2026-01-01T00:00:00.000Z',
        } satisfies SyncTanstackDsLock,
        null,
        2,
      ),
    });
  });

  afterEach(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(upstreamRoot, { recursive: true, force: true });
  });

  function deps(overrides: Partial<SyncTanstackDsDeps> = {}): SyncTanstackDsDeps {
    return {
      fetchUpstream: async () => upstreamRoot,
      downloadSelfHostedFonts: async (fontsDir) => {
        await fs.mkdir(fontsDir, { recursive: true });
        await fs.writeFile(
          path.join(fontsDir, 'BricolageGrotesque-latin-wght-normal.woff2'),
          'bricolage',
        );
        await fs.writeFile(path.join(fontsDir, 'IBMPlexMono-latin-400-normal.woff2'), 'plex-400');
      },
      now: () => new Date('2026-08-07T12:00:00.000Z'),
      ...overrides,
    };
  }

  it('wipe-overwrites mapped dests from the locked SHA by default', async () => {
    await writeTree(repoRoot, {
      'src/webapp/ds/styles/app.css': 'stale',
      'src/webapp/ds/ui/stale.tsx': 'stale',
      'public/fonts/stale.woff2': 'stale',
      'public/images/brand/stale.svg': 'stale',
    });

    const result = await syncTanstackDs(
      { repoRoot },
      deps({
        fetchUpstream: async (sha) => {
          expect(sha).toBe(LOCK_SHA);
          return upstreamRoot;
        },
      }),
    );

    expect(result.sha).toBe(LOCK_SHA);
    expect(await readUtf8(repoRoot, 'src/webapp/ds/styles/app.css')).toBe('/* tokens */');
    expect(await readUtf8(repoRoot, 'src/webapp/ds/ui/index.tsx')).toContain('Button');
    expect(await readUtf8(repoRoot, 'src/webapp/ds/pixel-spinner-frames.ts')).toContain(
      'PIXEL_SPINNER_FRAMES',
    );
    expect(await readUtf8(repoRoot, 'src/webapp/ds/libraries/icons.ts')).toContain('libraryIcons');
    expect(await readUtf8(repoRoot, 'src/webapp/ds/libraries/categories.ts')).toContain(
      'libraryCategories',
    );
    expect(await readUtf8(repoRoot, 'src/webapp/ds/Logo.tsx')).toContain('Logo');
    expect(await readUtf8(repoRoot, 'public/fonts/Inter-latin.woff2')).toBe('inter-latin');
    expect(
      await readUtf8(repoRoot, 'public/fonts/BricolageGrotesque-latin-wght-normal.woff2'),
    ).toBe('bricolage');
    expect(await readUtf8(repoRoot, 'public/images/brand/tanstack-emblem-cream.svg')).toBe(
      '<svg />',
    );
    expect(await readUtf8(repoRoot, 'public/favicon-light.svg')).toContain('light');
    expect(await exists(repoRoot, 'src/webapp/ds/ui/stale.tsx')).toBe(false);
    expect(await exists(repoRoot, 'public/fonts/stale.woff2')).toBe(false);
    expect(await exists(repoRoot, 'src/webapp/ds/ui/ButtonGroup.tsx')).toBe(false);
  });

  it('copies optional helpers only when withOptional is set', async () => {
    await syncTanstackDs({ repoRoot, withOptional: true }, deps());

    expect(await readUtf8(repoRoot, 'src/webapp/ds/optional/ButtonGroup.tsx')).toContain(
      'ButtonGroup',
    );
    expect(await readUtf8(repoRoot, 'src/webapp/ds/optional/Collapsible.tsx')).toContain(
      'Collapsible',
    );
    expect(await readUtf8(repoRoot, 'src/webapp/ds/optional/LibraryWordmark.tsx')).toContain(
      'LibraryWordmark',
    );
  });

  it('rewrites the lock when syncing a new sha', async () => {
    const result = await syncTanstackDs(
      { repoRoot, sha: UPGRADE_SHA },
      deps({
        fetchUpstream: async (sha) => {
          expect(sha).toBe(UPGRADE_SHA);
          return upstreamRoot;
        },
      }),
    );

    expect(result.sha).toBe(UPGRADE_SHA);
    const lock = JSON.parse(
      await readUtf8(repoRoot, 'scripts/sync-tanstack-ds.lock.json'),
    ) as SyncTanstackDsLock;
    expect(lock).toEqual({
      repo: 'TanStack/tanstack.com',
      sha: UPGRADE_SHA,
      syncedAt: '2026-08-07T12:00:00.000Z',
    });
  });
});
