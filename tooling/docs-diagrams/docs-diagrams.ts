import { createHash } from 'node:crypto';

export type MermaidBlock = {
  doc: string;
  line: number;
  hash: string;
  skipReason?: string;
};

export type DiagramPage = {
  file: string;
  title?: string;
  source?: string;
  mermaid?: string;
  kind?: string;
};

export type Finding = {
  kind: 'missing' | 'stale' | 'duplicate' | 'invalid' | 'index';
  message: string;
};

const fenceOpen = /^```mermaid\s*$/;
const fenceClose = /^```\s*$/;
const skipMarker = /^<!--\s*docs-diagram:\s*skip\s+(.+?)\s*-->$/;

export const hashMermaid = (source: string): string =>
  `sha256:${createHash('sha256').update(source.trim()).digest('hex').slice(0, 16)}`;

export const findMermaidBlocks = (doc: string, markdown: string): MermaidBlock[] => {
  const lines = markdown.split('\n');
  const blocks: MermaidBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!fenceOpen.test(lines[index])) {
      continue;
    }

    const start = index;
    const body: string[] = [];
    for (index += 1; index < lines.length && !fenceClose.test(lines[index]); index += 1) {
      body.push(lines[index]);
    }

    let previous = start - 1;
    while (previous >= 0 && lines[previous].trim() === '') {
      previous -= 1;
    }
    const skipReason = previous >= 0 ? skipMarker.exec(lines[previous].trim())?.[1] : undefined;

    blocks.push({ doc, line: start + 1, hash: hashMermaid(body.join('\n')), skipReason });
  }

  return blocks;
};

const metaContent = (html: string, name: string): string | undefined =>
  new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`).exec(html)?.[1];

export const readDiagramPage = (file: string, html: string): DiagramPage => {
  const kind = metaContent(html, 'docs-diagram:kind');

  return {
    file,
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim(),
    source: metaContent(html, 'docs-diagram:source'),
    mermaid: metaContent(html, 'docs-diagram:mermaid'),
    ...(kind ? { kind } : {}),
  };
};

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const renderIndex = (pages: DiagramPage[], repoBlobUrl: string): string => {
  const bySource = Map.groupBy(
    pages.toSorted((a, b) => a.file.localeCompare(b.file)),
    (page) => page.source ?? '',
  );
  const sections = [...bySource.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([source, sourcePages]) => {
      const items = sourcePages
        .toSorted((a, b) => {
          const rank = (page: DiagramPage) => (page.kind === 'storyline' ? 0 : 1);
          return rank(a) - rank(b) || a.file.localeCompare(b.file);
        })
        .map(
          (page) =>
            `      <li><a href="./${page.file}">${escapeHtml(page.title ?? page.file)}</a></li>`,
        )
        .join('\n');
      return [
        '    <section>',
        `      <h2><a href="${repoBlobUrl}/${source}">${escapeHtml(source)}</a></h2>`,
        '      <ul>',
        items,
        '      </ul>',
        '    </section>',
      ].join('\n');
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TanStack AWS docs diagrams</title>
    <style>
      body { margin: 0; padding: 48px 24px; background: #f5f5f5; color: #2d3142; font: 16px/1.5 system-ui, sans-serif; }
      main { max-width: 720px; margin: 0 auto; }
      h1 { font: 400 40px/1.1 'Instrument Serif', Georgia, serif; margin: 0 0 8px; }
      h2 { font: 600 13px/1.4 ui-monospace, monospace; margin: 32px 0 8px; }
      a { color: #bf4520; }
      ul { margin: 0; padding-left: 20px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Docs diagrams</h1>
      <p>Each diagram redraws one Mermaid block. A storyline sequences those redraws. The Markdown doc stays the source of truth.</p>
${sections}
    </main>
  </body>
</html>
`;
};

export const checkDocsDiagrams = ({
  blocks,
  pages,
  index,
  expectedIndex,
}: {
  blocks: MermaidBlock[];
  pages: DiagramPage[];
  index: string | undefined;
  expectedIndex: string;
}): Finding[] => {
  const findings: Finding[] = [];

  for (const page of pages) {
    if (page.kind === 'storyline') {
      if (!page.source) {
        findings.push({
          kind: 'invalid',
          message: `${page.file}: a storyline needs <meta name="docs-diagram:source">.`,
        });
      }
      continue;
    }

    if (page.kind) {
      findings.push({
        kind: 'invalid',
        message: `${page.file}: docs-diagram:kind must be "storyline".`,
      });
      continue;
    }

    if (!page.source || !page.mermaid) {
      findings.push({
        kind: 'invalid',
        message: `${page.file}: needs <meta name="docs-diagram:source"> and <meta name="docs-diagram:mermaid">.`,
      });
      continue;
    }
    if (!blocks.some((block) => block.doc === page.source && block.hash === page.mermaid)) {
      findings.push({
        kind: 'stale',
        message: `${page.file}: no Mermaid block in ${page.source} has ${page.mermaid}. Redraw it from the current block or delete it.`,
      });
    }
  }

  for (const block of blocks) {
    if (block.skipReason) {
      continue;
    }
    const drawn = pages.filter(
      (page) =>
        page.kind !== 'storyline' && page.source === block.doc && page.mermaid === block.hash,
    );
    if (drawn.length === 0) {
      findings.push({
        kind: 'missing',
        message: `${block.doc}:${block.line}: no diagram for ${block.hash}. Draw one or add <!-- docs-diagram: skip <reason> --> above the fence.`,
      });
    }
    if (drawn.length > 1) {
      findings.push({
        kind: 'duplicate',
        message: `${block.doc}:${block.line}: drawn by ${drawn.map((page) => page.file).join(', ')}.`,
      });
    }
  }

  if (index !== expectedIndex) {
    findings.push({
      kind: 'index',
      message: 'docs/diagrams/index.html is out of date. Run `vp run docs-diagrams:index`.',
    });
  }

  return findings;
};
