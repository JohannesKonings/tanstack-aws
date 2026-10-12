import path from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  checkDocsDiagrams,
  type DiagramPage,
  findMermaidBlocks,
  hashMermaid,
  type MermaidBlock,
  readDiagramPage,
  renderIndex,
} from './docs-diagrams.ts';
import { checkRepoDocsDiagrams } from './repo.ts';

const doc = [
  '# Doc',
  '',
  '```mermaid',
  'flowchart LR',
  '  a --> b',
  '```',
  '',
  '<!-- docs-diagram: skip three messages, Mermaid is enough -->',
  '',
  '```mermaid',
  'sequenceDiagram',
  '  A->>B: hi',
  '```',
].join('\n');

const flowHash = hashMermaid('flowchart LR\n  a --> b');

const page = (overrides: Partial<DiagramPage> = {}): DiagramPage => ({
  file: 'doc-flow.html',
  title: 'Flow',
  source: 'docs/doc.md',
  mermaid: flowHash,
  ...overrides,
});

const check = (blocks: MermaidBlock[], pages: DiagramPage[]) => {
  const expectedIndex = renderIndex(pages, 'https://example.test/blob/main');
  return checkDocsDiagrams({ blocks, pages, index: expectedIndex, expectedIndex });
};

describe('findMermaidBlocks', () => {
  it('hashes each fence body and reads the skip marker above it', () => {
    const blocks = findMermaidBlocks('docs/doc.md', doc);

    expect(blocks).toEqual([
      { doc: 'docs/doc.md', line: 3, hash: flowHash, skipReason: undefined },
      {
        doc: 'docs/doc.md',
        line: 10,
        hash: hashMermaid('sequenceDiagram\n  A->>B: hi'),
        skipReason: 'three messages, Mermaid is enough',
      },
    ]);
  });
});

describe('readDiagramPage', () => {
  it('reads the title and both docs-diagram meta tags', () => {
    const html = `<head><title>Flow</title>
<meta name="docs-diagram:source" content="docs/doc.md">
<meta name="docs-diagram:mermaid" content="${flowHash}"></head>`;

    expect(readDiagramPage('doc-flow.html', html)).toEqual(page());
  });
});

describe('checkDocsDiagrams', () => {
  const blocks = findMermaidBlocks('docs/doc.md', doc);

  it('passes when every unskipped block has exactly one diagram', () => {
    expect(check(blocks, [page()])).toEqual([]);
  });

  it('reports a block with no diagram as missing', () => {
    expect(check(blocks, []).map((finding) => finding.kind)).toEqual(['missing']);
  });

  it('reports a diagram whose block changed as stale and the new block as missing', () => {
    const changed = findMermaidBlocks('docs/doc.md', doc.replace('a --> b', 'a --> c'));

    expect(check(changed, [page()]).map((finding) => finding.kind)).toEqual(['stale', 'missing']);
  });

  it('reports two diagrams for one block as duplicate', () => {
    const pages = [page(), page({ file: 'doc-flow-2.html' })];

    expect(check(blocks, pages).map((finding) => finding.kind)).toEqual(['duplicate']);
  });

  it('reports a diagram without meta tags as invalid', () => {
    const pages = [page(), page({ file: 'loose.html', source: undefined, mermaid: undefined })];

    expect(check(blocks, pages).map((finding) => finding.kind)).toEqual(['invalid']);
  });

  it('accepts a storyline that sequences redraws without pinning a block', () => {
    const storyline = page({
      file: 'doc-storyline.html',
      title: 'Story',
      mermaid: undefined,
      kind: 'storyline',
    });

    expect(check(blocks, [page(), storyline])).toEqual([]);
  });

  it('does not count a storyline as a second drawing of a block', () => {
    const storyline = page({ file: 'doc-storyline.html', kind: 'storyline' });

    expect(check(blocks, [page(), storyline])).toEqual([]);
  });

  it('reports a storyline without a source doc as invalid', () => {
    const storyline = page({
      file: 'doc-storyline.html',
      source: undefined,
      mermaid: undefined,
      kind: 'storyline',
    });

    expect(check(blocks, [page(), storyline]).map((finding) => finding.kind)).toEqual(['invalid']);
  });

  it('reports an index that does not list the current diagrams', () => {
    const findings = checkDocsDiagrams({
      blocks,
      pages: [page()],
      index: renderIndex([], 'https://example.test/blob/main'),
      expectedIndex: renderIndex([page()], 'https://example.test/blob/main'),
    });

    expect(findings.map((finding) => finding.kind)).toEqual(['index']);
  });
});

describe('repo docs diagrams', () => {
  it('match the Mermaid blocks in docs/', () => {
    const root = path.resolve(import.meta.dirname, '../..');

    expect(checkRepoDocsDiagrams(root)).toEqual([]);
  });
});
