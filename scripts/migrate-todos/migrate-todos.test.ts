import { describe, expect, it } from 'vite-plus/test';
import { toBlocksTodoItem } from './blocks-todo-encoding.ts';
import { migrateTodos } from './migrate-todos.ts';

const legacyRows = [
  {
    pk: 'TODO',
    sk: 'TODO#1',
    id: 1,
    name: 'First',
    status: 'pending',
  },
  {
    pk: 'TODO',
    sk: 'TODO#2',
    id: 2,
    name: 'Second',
    status: 'completed',
  },
  {
    pk: 'TODO',
    sk: 'TODO#3',
    id: 'bad',
    name: 'Broken',
    status: 'pending',
  },
] as const;

async function* legacyQuery(): AsyncIterable<Record<string, unknown>> {
  for (const row of legacyRows) {
    yield row;
  }
}

describe('migrateTodos', () => {
  it('copies valid legacy rows and reports read/written/skipped counts', async () => {
    const writtenItems: string[] = [];
    const existingKeys = new Set(['TODO#2']);

    const result = await migrateTodos({
      legacyTableName: 'legacy-table',
      blocksTableName: 'blocks-table',
      queryLegacyTodos: legacyQuery,
      parseLegacyTodoItem: (item) => {
        if (typeof item.id !== 'number') {
          return null;
        }

        return toBlocksTodoItem({
          id: item.id,
          name: String(item.name),
          status: item.status === 'completed' ? 'completed' : 'pending',
        });
      },
      writeBlocksTodo: async (item) => {
        if (existingKeys.has(item.sk)) {
          return 'skipped';
        }

        writtenItems.push(item.sk);
        return 'written';
      },
    });

    expect(result.counts).toEqual({
      read: 3,
      written: 1,
      skipped: 2,
    });
    expect(writtenItems).toEqual(['TODO#1']);
    expect(result.legacyTableName).toBe('legacy-table');
    expect(result.blocksTableName).toBe('blocks-table');
  });
});
