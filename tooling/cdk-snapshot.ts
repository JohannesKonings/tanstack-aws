const REDACTED_BY_KEY = new Set([
  'Account',
  'AccountId',
  'Arn',
  'RoleArn',
  'BucketName',
  'RepositoryName',
  'DomainName',
  'HostedZoneId',
]);

const PLACEHOLDERS = {
  accountId: '<account-id>',
  arn: '<arn>',
  hash: '<hash>',
  nonce: '<nonce>',
  cdkBootstrapRole: '<cdk-bootstrap-role>',
  redactedName: '<redacted-name>',
} as const;

const HASH_PATTERN = /\b[a-f0-9]{32,64}\b/gi;
const ACCOUNT_ID_PATTERN = /\b\d{12}\b/g;
const NONCE_NUMBER_PATTERN = /\b\d{10,17}\b/g;
const ARN_PATTERN = /\barn:aws:[a-z0-9-]+:[a-z0-9-]*:\d{12}:[^\s"']+/gi;
const CDK_BOOTSTRAP_ROLE_PATTERN = /\bcdk-hnb659fds-[a-z-]+-\d{12}-[a-z0-9-]+\b/gi;
const CDK_BOOTSTRAP_NAME_PATTERN = /\bcdk-hnb659fds-[a-z-]+\b/gi;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function redactString(value: string): string {
  return value
    .replace(CDK_BOOTSTRAP_ROLE_PATTERN, PLACEHOLDERS.cdkBootstrapRole)
    .replace(CDK_BOOTSTRAP_NAME_PATTERN, PLACEHOLDERS.cdkBootstrapRole)
    .replace(ARN_PATTERN, PLACEHOLDERS.arn)
    .replace(ACCOUNT_ID_PATTERN, PLACEHOLDERS.accountId)
    .replace(NONCE_NUMBER_PATTERN, PLACEHOLDERS.nonce)
    .replace(HASH_PATTERN, PLACEHOLDERS.hash);
}

function redactByKey(key: string, value: unknown): unknown {
  if (!REDACTED_BY_KEY.has(key)) {
    return value;
  }

  if (typeof value === 'string' && key.endsWith('Arn')) {
    return PLACEHOLDERS.arn;
  }

  return PLACEHOLDERS.redactedName;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const sortedEntries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  const normalizedObject: Record<string, unknown> = {};

  for (const [key, nestedValue] of sortedEntries) {
    const redactedValue = redactByKey(key, nestedValue);
    normalizedObject[key] = normalizeValue(redactedValue);
  }

  return normalizedObject;
}

export function snapshotSafeTemplate(template: unknown): unknown {
  return normalizeValue(template);
}
