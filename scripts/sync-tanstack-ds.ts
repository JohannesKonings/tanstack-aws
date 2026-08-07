import fs from 'node:fs/promises';
import path from 'node:path';

export type SyncTanstackDsLock = {
  repo: string;
  sha: string;
  syncedAt: string;
};

export type SyncTanstackDsOptions = {
  repoRoot: string;
  sha?: string;
  ref?: string;
  withOptional?: boolean;
};

export type SyncTanstackDsResult = {
  sha: string;
  lock: SyncTanstackDsLock;
};

export type SyncTanstackDsDeps = {
  fetchUpstream: (sha: string, ref?: string) => Promise<string>;
  downloadSelfHostedFonts: (fontsDir: string) => Promise<void>;
  now: () => Date;
};

const UPSTREAM_REPO = 'TanStack/tanstack.com';
const LOCK_REL = path.join('scripts', 'sync-tanstack-ds.lock.json');

/** Always-pull source → dest (relative to repo / upstream roots). */
const ALWAYS_FILE_MAP: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'src/styles/app.css', to: 'src/webapp/ds/styles/app.css' },
  { from: 'src/libraries/icons.ts', to: 'src/webapp/ds/libraries/icons.ts' },
  {
    from: 'src/libraries/categories.ts',
    to: 'src/webapp/ds/libraries/categories.ts',
  },
  { from: 'src/components/Logo.tsx', to: 'src/webapp/ds/Logo.tsx' },
  {
    from: 'src/components/ds/pixel-spinner-frames.ts',
    to: 'src/webapp/ds/pixel-spinner-frames.ts',
  },
  { from: 'public/favicon-light.svg', to: 'public/favicon-light.svg' },
  { from: 'public/favicon-dark.svg', to: 'public/favicon-dark.svg' },
];

const ALWAYS_DIR_MAP: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'src/components/ds/ui', to: 'src/webapp/ds/ui' },
  { from: 'public/fonts', to: 'public/fonts' },
  { from: 'public/images/brand', to: 'public/images/brand' },
];

const OPTIONAL_FILE_MAP: ReadonlyArray<{ from: string; to: string }> = [
  {
    from: 'src/components/ButtonGroup.tsx',
    to: 'src/webapp/ds/optional/ButtonGroup.tsx',
  },
  {
    from: 'src/components/Collapsible.tsx',
    to: 'src/webapp/ds/optional/Collapsible.tsx',
  },
  {
    from: 'src/components/LibraryWordmark.tsx',
    to: 'src/webapp/ds/optional/LibraryWordmark.tsx',
  },
];

const WIPE_DIRS = [
  'src/webapp/ds/styles',
  'src/webapp/ds/ui',
  'src/webapp/ds/libraries',
  'src/webapp/ds/optional',
  'public/fonts',
  'public/images/brand',
] as const;

const WIPE_FILES = [
  'src/webapp/ds/Logo.tsx',
  'src/webapp/ds/pixel-spinner-frames.ts',
  'public/favicon-light.svg',
  'public/favicon-dark.svg',
] as const;

export async function readLock(repoRoot: string): Promise<SyncTanstackDsLock> {
  const raw = await fs.readFile(path.join(repoRoot, LOCK_REL), 'utf8');
  return JSON.parse(raw) as SyncTanstackDsLock;
}

export async function writeLock(repoRoot: string, lock: SyncTanstackDsLock): Promise<void> {
  const abs = path.join(repoRoot, LOCK_REL);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

async function rmrf(abs: string): Promise<void> {
  await fs.rm(abs, { recursive: true, force: true });
}

async function copyFile(fromAbs: string, toAbs: string): Promise<void> {
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  await fs.copyFile(fromAbs, toAbs);
}

async function copyDir(fromAbs: string, toAbs: string): Promise<void> {
  await fs.mkdir(toAbs, { recursive: true });
  const entries = await fs.readdir(fromAbs, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fromChild = path.join(fromAbs, entry.name);
      const toChild = path.join(toAbs, entry.name);
      if (entry.isDirectory()) {
        await copyDir(fromChild, toChild);
      } else if (entry.isFile()) {
        await copyFile(fromChild, toChild);
      }
    }),
  );
}

async function wipeMappedDests(repoRoot: string): Promise<void> {
  await Promise.all([
    ...WIPE_DIRS.map((rel) => rmrf(path.join(repoRoot, rel))),
    ...WIPE_FILES.map((rel) => rmrf(path.join(repoRoot, rel))),
  ]);
}

export async function syncTanstackDs(
  options: SyncTanstackDsOptions,
  deps: SyncTanstackDsDeps,
): Promise<SyncTanstackDsResult> {
  const lock = await readLock(options.repoRoot);
  const resolvedSha = options.sha ?? lock.sha;
  const upstreamRoot = await deps.fetchUpstream(resolvedSha, options.ref);

  await wipeMappedDests(options.repoRoot);

  await Promise.all(
    ALWAYS_FILE_MAP.map((mapping) =>
      copyFile(path.join(upstreamRoot, mapping.from), path.join(options.repoRoot, mapping.to)),
    ),
  );

  await Promise.all(
    ALWAYS_DIR_MAP.map((mapping) =>
      copyDir(path.join(upstreamRoot, mapping.from), path.join(options.repoRoot, mapping.to)),
    ),
  );

  if (options.withOptional) {
    await Promise.all(
      OPTIONAL_FILE_MAP.map((mapping) =>
        copyFile(path.join(upstreamRoot, mapping.from), path.join(options.repoRoot, mapping.to)),
      ),
    );
  }

  await deps.downloadSelfHostedFonts(path.join(options.repoRoot, 'public', 'fonts'));

  const nextLock: SyncTanstackDsLock = {
    repo: UPSTREAM_REPO,
    sha: resolvedSha,
    syncedAt: deps.now().toISOString(),
  };
  await writeLock(options.repoRoot, nextLock);

  return { sha: resolvedSha, lock: nextLock };
}
