import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { type Todo, todoSchema, type TodoUpdate } from '#src/webapp/types/todo.ts';

const TODOS_PK = 'TODO';
const TODOS_TABLE_ENV = 'DDB_TODOS_TABLE_NAME';
const EMPTY_LENGTH = 0;
const INITIAL_ATTEMPT = 0;
const NEXT_ATTEMPT_INCREMENT = 1;
const MAX_RETRY_ATTEMPTS = 3;
const MAX_BATCH_WRITE_ITEMS = 25;

let ddbDocSingleton: DynamoDBDocumentClient | null = null;

export const getDdbDocClient = (): DynamoDBDocumentClient => {
  if (!ddbDocSingleton) {
    ddbDocSingleton = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  return ddbDocSingleton;
};

export const requireEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }

  return value;
};

export const getTodosTableName = (): string => requireEnvVar(TODOS_TABLE_ENV);

const todoSortKey = (id: number): string => `TODO#${id}`;

const parseTodoItem = (item: Record<string, unknown>): Todo | null => {
  const parsed = todoSchema.safeParse({
    id: item.id,
    name: item.name,
    status: item.status,
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
};

const chunkItems = <Item>(items: Item[], chunkSize: number): Item[][] => {
  const out: Item[][] = [];
  for (let index = EMPTY_LENGTH; index < items.length; index += chunkSize) {
    out.push(items.slice(index, index + chunkSize));
  }
  return out;
};

export type TodosDdbClient = {
  getTodos: () => Promise<Todo[]>;
  putTodo: (todo: Todo) => Promise<Todo>;
  updateTodos: (updates: TodoUpdate[]) => Promise<void>;
  deleteTodos: (ids: number[]) => Promise<void>;
};

const retryBatchWrite = async (args: {
  ddbDoc: DynamoDBDocumentClient;
  requestItems: unknown;
  attempt: number;
}): Promise<void> => {
  const response = await args.ddbDoc.send(
    new BatchWriteCommand({
      RequestItems: args.requestItems as never,
    }),
  );

  const unprocessedItems = response.UnprocessedItems;
  if (!unprocessedItems || Object.keys(unprocessedItems).length === EMPTY_LENGTH) {
    return;
  }

  if (args.attempt + NEXT_ATTEMPT_INCREMENT >= MAX_RETRY_ATTEMPTS) {
    return;
  }

  await retryBatchWrite({
    ddbDoc: args.ddbDoc,
    requestItems: unprocessedItems,
    attempt: args.attempt + NEXT_ATTEMPT_INCREMENT,
  });
};

export const createTodosDdbClient = (): TodosDdbClient => {
  const ddbDoc = getDdbDocClient();

  return {
    getTodos: async () => {
      const tableName = getTodosTableName();
      const result = await ddbDoc.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          ExpressionAttributeValues: {
            ':pk': TODOS_PK,
          },
        }),
      );

      const items = (result.Items ?? [])
        .map((item) => parseTodoItem(item))
        .filter((todo): todo is Todo => todo !== null);
      return items;
    },

    putTodo: async (todo: Todo) => {
      const tableName = getTodosTableName();
      await ddbDoc.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: TODOS_PK,
            sk: todoSortKey(todo.id),
            id: todo.id,
            name: todo.name,
            status: todo.status,
          },
        }),
      );

      return todo;
    },

    updateTodos: async (updates: TodoUpdate[]) => {
      const tableName = getTodosTableName();

      await Promise.all(
        updates.map(async (update) => {
          const sets: string[] = [];
          const names: Record<string, string> = {
            '#pk': 'pk',
            '#sk': 'sk',
          };
          const values: Record<string, unknown> = {};

          if (update.changes.name !== undefined) {
            names['#name'] = 'name';
            values[':name'] = update.changes.name;
            sets.push('#name = :name');
          }

          if (update.changes.status !== undefined) {
            names['#status'] = 'status';
            values[':status'] = update.changes.status;
            sets.push('#status = :status');
          }

          if (sets.length === EMPTY_LENGTH) {
            return;
          }

          try {
            await ddbDoc.send(
              new UpdateCommand({
                TableName: tableName,
                Key: {
                  pk: TODOS_PK,
                  sk: todoSortKey(update.id),
                },
                UpdateExpression: `SET ${sets.join(', ')}`,
                ConditionExpression: 'attribute_exists(#pk) AND attribute_exists(#sk)',
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
              }),
            );
          } catch (error) {
            const errorName = (error as { name?: string } | undefined)?.name;
            if (errorName !== 'ConditionalCheckFailedException') {
              throw error;
            }
          }
        }),
      );
    },

    deleteTodos: async (ids: number[]) => {
      const tableName = getTodosTableName();
      const groups = chunkItems(ids, MAX_BATCH_WRITE_ITEMS);

      await Promise.all(
        groups.map(async (group) => {
          const requestItems = {
            [tableName]: group.map((id) => ({
              DeleteRequest: {
                Key: {
                  pk: TODOS_PK,
                  sk: todoSortKey(id),
                },
              },
            })),
          };

          await retryBatchWrite({
            ddbDoc,
            requestItems,
            attempt: INITIAL_ATTEMPT,
          });
        }),
      );
    },
  };
};
