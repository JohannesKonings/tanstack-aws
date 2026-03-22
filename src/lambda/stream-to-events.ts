// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
// oxlint-disable id-length
// oxlint-disable max-statements
// oxlint-disable no-console
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord, DynamoDBStreamHandler } from 'aws-lambda';
import { ulid } from 'ulid';

// =============================================================================
// Constants
// =============================================================================

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const EVENT_TTL_HOURS = 1;
const BATCH_SIZE = 25;
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;

// =============================================================================
// Entity Type Mapping
// =============================================================================

/**
 * ElectroDB generates SK patterns like:
 * - Person: "$person_1" (pk contains personId)
 * - Address: "$address_1#id_<uuid>" (pk contains personId)
 * - BankAccount: "$bankaccount_1#id_<uuid>"
 * - ContactInfo: "$contactinfo_1#id_<uuid>"
 * - Employment: "$employment_1#id_<uuid>"
 */

/** Entity type patterns for ElectroDB-generated sort keys */
const ELECTRODB_ENTITY_PATTERNS = [
  { pattern: /^\$person_/, type: 'person' },
  { pattern: /^\$address_/, type: 'address' },
  { pattern: /^\$bankaccount_/, type: 'bankAccount' },
  { pattern: /^\$contactinfo_/, type: 'contactInfo' },
  { pattern: /^\$employment_/, type: 'employment' },
];

/**
 * Detect entity type from ElectroDB sort key pattern
 */
const detectEntityType = (sk: string): string => {
  const match = ELECTRODB_ENTITY_PATTERNS.find((entry) => entry.pattern.test(sk));
  return match?.type ?? 'unknown';
};

/**
 * Remove DynamoDB-specific fields, keep domain fields
 */
const cleanEntity = (item: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!item) {
    return null;
  }
  // Remove ElectroDB and DynamoDB internal fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pk, sk, gsi1pk, gsi1sk, __edb_e__, __edb_v__, ...domain } = item;
  return domain;
};

/**
 * Unmarshall DynamoDB Keys if present
 */
const unmarshallKeys = (record: DynamoDBRecord): Record<string, unknown> | null => {
  if (!record.dynamodb?.Keys) {
    return null;
  }
  return unmarshall(record.dynamodb.Keys as Record<string, never>);
};

/**
 * Unmarshall DynamoDB NewImage if present
 */
const unmarshallNewImage = (record: DynamoDBRecord): Record<string, unknown> | null => {
  if (!record.dynamodb?.NewImage) {
    return null;
  }
  return unmarshall(record.dynamodb.NewImage as Record<string, never>);
};

/**
 * Unmarshall DynamoDB OldImage if present
 */
const unmarshallOldImage = (record: DynamoDBRecord): Record<string, unknown> | null => {
  if (!record.dynamodb?.OldImage) {
    return null;
  }
  return unmarshall(record.dynamodb.OldImage as Record<string, never>);
};

/** Parsed record type */
interface ParsedRecord {
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  entityType: string;
  entity: Record<string, unknown> | null;
  oldEntity: Record<string, unknown> | null;
}

/**
 * Parse DynamoDB Stream record into domain event
 */
const parseStreamRecord = (record: DynamoDBRecord): ParsedRecord | null => {
  const eventType = record.eventName as 'INSERT' | 'MODIFY' | 'REMOVE';
  const keys = unmarshallKeys(record);

  if (!keys) {
    return null;
  }

  const entityType = detectEntityType(keys.sk as string);
  if (entityType === 'unknown') {
    return null;
  }

  return {
    eventType,
    entityType,
    entity: cleanEntity(unmarshallNewImage(record)),
    oldEntity: cleanEntity(unmarshallOldImage(record)),
  };
};

/**
 * Create event items from parsed records
 */
const createEventItems = (
  parsedRecords: ParsedRecord[],
  now: Date,
  ttl: number,
): Array<{ PutRequest: { Item: Record<string, unknown> } }> =>
  parsedRecords.map((record) => {
    const eventId = ulid();
    return {
      PutRequest: {
        Item: {
          pk: 'EVENTS',
          sk: `${now.toISOString()}#${eventId}`,
          eventId,
          eventType: record.eventType,
          entityType: record.entityType,
          entity: record.entity,
          oldEntity: record.oldEntity,
          createdAt: now.toISOString(),
          ttl,
        },
      },
    };
  });

/**
 * Write event batches to DynamoDB
 */
const writeBatches = async (
  eventItems: Array<{ PutRequest: { Item: Record<string, unknown> } }>,
): Promise<void> => {
  const batches: Array<typeof eventItems> = [];
  for (let idx = 0; idx < eventItems.length; idx += BATCH_SIZE) {
    batches.push(eventItems.slice(idx, idx + BATCH_SIZE));
  }

  await Promise.all(
    batches.map((batch) =>
      ddbClient.send(
        new BatchWriteCommand({
          RequestItems: { [EVENTS_TABLE]: batch },
        }),
      ),
    ),
  );
};

// =============================================================================
// Handler
// =============================================================================

/**
 * Stream-to-Events Processor
 *
 * Triggered by DynamoDB Streams on the Persons table.
 * Writes change events to the Events table for SSE clients to query.
 */
export const handler: DynamoDBStreamHandler = async (event) => {
  console.log('stream-to-events: Received', event.Records.length, 'records');
  console.log('stream-to-events: EVENTS_TABLE:', EVENTS_TABLE);

  const parsedRecords = event.Records.map((record) => {
    const keys = unmarshallKeys(record);
    console.log('stream-to-events: Record keys:', JSON.stringify(keys));
    const parsed = parseStreamRecord(record);
    console.log('stream-to-events: Parsed record:', parsed?.entityType, parsed?.eventType);
    return parsed;
  }).filter((rec): rec is ParsedRecord => rec !== null);

  console.log('stream-to-events: Filtered to', parsedRecords.length, 'valid records');

  if (parsedRecords.length === 0) {
    console.log('stream-to-events: No valid records, exiting');
    return;
  }

  const now = new Date();
  const ttl = Math.floor(now.getTime() / MS_PER_SECOND) + EVENT_TTL_HOURS * SECONDS_PER_HOUR;
  const eventItems = createEventItems(parsedRecords, now, ttl);

  console.log('stream-to-events: Writing', eventItems.length, 'events to', EVENTS_TABLE);
  await writeBatches(eventItems);
  console.log('stream-to-events: Done');
};
