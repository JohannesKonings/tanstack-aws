import type { BlocksTodoItem, MigrationCounts, MigrationResult } from './types.ts';

export type WriteTodoResult = 'written' | 'skipped';

export type MigrateTodosDeps = {
  legacyTableName: string;
  blocksTableName: string;
  queryLegacyTodos: () => AsyncIterable<Record<string, unknown>>;
  writeBlocksTodo: (item: BlocksTodoItem) => Promise<WriteTodoResult>;
  parseLegacyTodoItem: (item: Record<string, unknown>) => BlocksTodoItem | null;
};

const emptyCounts = (): MigrationCounts => ({
  read: 0,
  written: 0,
  skipped: 0,
});

export const migrateTodos = async (deps: MigrateTodosDeps): Promise<MigrationResult> => {
  const counts = emptyCounts();

  for await (const legacyItem of deps.queryLegacyTodos()) {
    counts.read += 1;

    const blocksItem = deps.parseLegacyTodoItem(legacyItem);
    if (!blocksItem) {
      counts.skipped += 1;
      continue;
    }

    const writeResult = await deps.writeBlocksTodo(blocksItem);
    if (writeResult === 'written') {
      counts.written += 1;
    } else {
      counts.skipped += 1;
    }
  }

  return {
    counts,
    legacyTableName: deps.legacyTableName,
    blocksTableName: deps.blocksTableName,
  };
};
