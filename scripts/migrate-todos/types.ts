export const TODOS_PK = 'TODO' as const;

export type TodoStatus = 'pending' | 'completed';

export type BlocksTodoItem = {
  pk: typeof TODOS_PK;
  sk: string;
  id: number;
  name: string;
  status: TodoStatus;
};

export type MigrationCounts = {
  read: number;
  written: number;
  skipped: number;
};

export type MigrationResult = {
  counts: MigrationCounts;
  legacyTableName: string;
  blocksTableName: string;
};
