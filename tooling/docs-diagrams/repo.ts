import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  checkDocsDiagrams,
  type Finding,
  findMermaidBlocks,
  readDiagramPage,
  renderIndex,
} from './docs-diagrams.ts';

export const diagramsDir = 'docs/diagrams';
export const indexFile = `${diagramsDir}/index.html`;
const repoBlobUrl = 'https://github.com/JohannesKonings/tanstack-aws/blob/main';

const read = (root: string, file: string): string => readFileSync(path.join(root, file), 'utf8');

export const loadDocsDiagrams = (root: string) => {
  const docs = readdirSync(path.join(root, 'docs'), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.posix.join('docs', file.split(path.sep).join('/')))
    .toSorted();
  const blocks = docs.flatMap((doc) => findMermaidBlocks(doc, read(root, doc)));

  const pages = existsSync(path.join(root, diagramsDir))
    ? readdirSync(path.join(root, diagramsDir))
        .filter((file) => file.endsWith('.html') && file !== 'index.html')
        .toSorted()
        .map((file) => readDiagramPage(file, read(root, `${diagramsDir}/${file}`)))
    : [];

  const index = existsSync(path.join(root, indexFile)) ? read(root, indexFile) : undefined;

  return { blocks, pages, index, expectedIndex: renderIndex(pages, repoBlobUrl) };
};

export const checkRepoDocsDiagrams = (root: string): Finding[] =>
  checkDocsDiagrams(loadDocsDiagrams(root));
