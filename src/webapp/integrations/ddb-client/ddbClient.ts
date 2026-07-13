import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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
