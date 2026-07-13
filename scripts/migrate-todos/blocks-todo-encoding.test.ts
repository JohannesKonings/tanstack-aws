import { describe, expect, it } from 'vite-plus/test';
import { parseLegacyTodoItem, toBlocksTodoItem, todoSortKey } from './blocks-todo-encoding.ts';

describe('todoSortKey', () => {
  it('formats legacy sort keys', () => {
    expect(todoSortKey(42)).toBe('TODO#42');
  });
});

describe('toBlocksTodoItem', () => {
  it('encodes todos for Blocks DistributedTable', () => {
    expect(
      toBlocksTodoItem({
        id: 1,
        name: 'Buy milk',
        status: 'pending',
      }),
    ).toEqual({
      pk: 'TODO',
      sk: 'TODO#1',
      id: 1,
      name: 'Buy milk',
      status: 'pending',
    });
  });
});

describe('parseLegacyTodoItem', () => {
  it('accepts valid legacy DynamoDB rows', () => {
    expect(
      parseLegacyTodoItem({
        pk: 'TODO',
        sk: 'TODO#7',
        id: 7,
        name: 'Ship migration',
        status: 'completed',
      }),
    ).toEqual({
      pk: 'TODO',
      sk: 'TODO#7',
      id: 7,
      name: 'Ship migration',
      status: 'completed',
    });
  });

  it('returns null when sort key does not match id', () => {
    expect(
      parseLegacyTodoItem({
        pk: 'TODO',
        sk: 'TODO#99',
        id: 7,
        name: 'Mismatched key',
        status: 'pending',
      }),
    ).toBeNull();
  });

  it('returns null for invalid legacy rows', () => {
    expect(
      parseLegacyTodoItem({
        pk: 'TODO',
        sk: 'TODO#7',
        id: 'seven',
        name: 'Broken',
        status: 'pending',
      }),
    ).toBeNull();
  });
});
