import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { WORKLOAD_REGION } from '../../lib/workload-region.ts';
import { parseLegacyTodoItem } from './blocks-todo-encoding.ts';
import { migrateTodos } from './migrate-todos.ts';
import { resolveBlocksTodosTableName, resolveLegacyTodosTableName } from './resolve-table-names.ts';
import type { BlocksTodoItem } from './types.ts';
import { TODOS_PK } from './types.ts';

const MAX_LIST_TABLES = 100;

const isConditionalCheckFailed = (error: unknown): boolean =>
  error instanceof Error && error.name === 'ConditionalCheckFailedException';

const createDdbDocClient = (): DynamoDBDocumentClient =>
  DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION ?? process.env.WORKLOAD_REGION ?? WORKLOAD_REGION,
    }),
    {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    },
  );

const listTableNames = async (): Promise<string[]> => {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? process.env.WORKLOAD_REGION ?? WORKLOAD_REGION,
  });
  const tableNames: string[] = [];
  let exclusiveStartTableName: string | undefined;

  do {
    const response = await client.send(
      new ListTablesCommand({
        ExclusiveStartTableName: exclusiveStartTableName,
        Limit: MAX_LIST_TABLES,
      }),
    );
    tableNames.push(...(response.TableNames ?? []));
    exclusiveStartTableName = response.LastEvaluatedTableName;
  } while (exclusiveStartTableName);

  return tableNames;
};

const queryLegacyTodos = (ddbDoc: DynamoDBDocumentClient, tableName: string) => {
  return async function* queryTodos(): AsyncIterable<Record<string, unknown>> {
    let exclusiveStartKey: QueryCommandInput['ExclusiveStartKey'];

    do {
      const response = await ddbDoc.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          ExpressionAttributeValues: {
            ':pk': TODOS_PK,
          },
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );

      for (const item of response.Items ?? []) {
        yield item;
      }

      exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);
  };
};

const writeBlocksTodo =
  (ddbDoc: DynamoDBDocumentClient, tableName: string) => async (item: BlocksTodoItem) => {
    try {
      await ddbDoc.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
            '#sk': 'sk',
          },
        }),
      );
      return 'written' as const;
    } catch (error: unknown) {
      if (isConditionalCheckFailed(error)) {
        return 'skipped' as const;
      }

      throw error;
    }
  };

export const runTodosMigration = async (stage: string) => {
  const tableNames = await listTableNames();
  const legacyTableName = resolveLegacyTodosTableName(stage, tableNames);
  if (!legacyTableName) {
    throw new Error(
      `Legacy todos table not found for stage "${stage}". Set LEGACY_DDB_TODOS_TABLE_NAME or deploy the legacy table first.`,
    );
  }

  const blocksTableName = resolveBlocksTodosTableName(stage);
  if (!tableNames.includes(blocksTableName)) {
    throw new Error(
      `Blocks todos table "${blocksTableName}" not found. Deploy BlocksBackend for stage "${stage}" or set BLOCKS_DDB_TODOS_TABLE_NAME.`,
    );
  }

  const ddbDoc = createDdbDocClient();

  return migrateTodos({
    legacyTableName,
    blocksTableName,
    queryLegacyTodos: queryLegacyTodos(ddbDoc, legacyTableName),
    parseLegacyTodoItem,
    writeBlocksTodo: writeBlocksTodo(ddbDoc, blocksTableName),
  });
};
