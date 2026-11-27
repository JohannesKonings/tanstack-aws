import { z } from 'zod';

const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/;
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d$/;
const IAM_ROLE_ARN_PATTERN = /^arn:aws[a-zA-Z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$/;
const SSO_ROLE_NAME_PATTERN = /^AWSReservedSSO_[\w+=,.@-]{1,64}$/;

function optionalEnvString(value: unknown): unknown {
  return value === undefined || value === null || value === '' ? undefined : value;
}

function requiredEnv(name: 'AWS_ACCOUNT_ID' | 'CLOUDWATCH_OMNI_ADMIN_ROLE') {
  return z.preprocess(
    (value) => value ?? '',
    z.string().trim().min(1, `Missing required environment variable: ${name}`),
  );
}

export const accountSetupEnvSchema = z
  .object({
    AWS_ACCOUNT_ID: requiredEnv('AWS_ACCOUNT_ID').pipe(
      z
        .string()
        .regex(AWS_ACCOUNT_ID_PATTERN, 'AWS_ACCOUNT_ID must be a 12-digit AWS account ID')
        .describe('12-digit AWS account ID, for example 123456789012'),
    ),
    AWS_REGION: z.preprocess(
      optionalEnvString,
      z
        .string()
        .regex(AWS_REGION_PATTERN, 'AWS_REGION must look like an AWS region, for example us-east-2')
        .describe('Optional AWS region identifier, for example us-east-2 or eu-central-1')
        .optional(),
    ),
    CLOUDWATCH_OMNI_ADMIN_ROLE: requiredEnv('CLOUDWATCH_OMNI_ADMIN_ROLE').pipe(
      z
        .string()
        .describe('CloudWatch Omni space admin. An IAM role ARN, or an AWSReservedSSO role name.'),
    ),
  })
  .transform((env, ctx) => {
    const adminRoleArn = cloudWatchOmniAdminRoleArn(
      env.CLOUDWATCH_OMNI_ADMIN_ROLE,
      env.AWS_ACCOUNT_ID,
    );
    if (!adminRoleArn) {
      ctx.addIssue({
        code: 'custom',
        message:
          'CLOUDWATCH_OMNI_ADMIN_ROLE must be an IAM role ARN or an AWSReservedSSO role name',
        path: ['CLOUDWATCH_OMNI_ADMIN_ROLE'],
      });
      return z.NEVER;
    }

    return {
      AWS_ACCOUNT_ID: env.AWS_ACCOUNT_ID,
      AWS_REGION: env.AWS_REGION,
      CLOUDWATCH_OMNI_ADMIN_ROLE_ARN: adminRoleArn,
    };
  });

export type AccountSetupEnv = z.output<typeof accountSetupEnvSchema>;

/** IAM role ARN for the Omni space admin named by CLOUDWATCH_OMNI_ADMIN_ROLE. */
export function cloudWatchOmniAdminRoleArn(
  role: string | undefined,
  accountId: string,
): string | undefined {
  const trimmed = role?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (IAM_ROLE_ARN_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (SSO_ROLE_NAME_PATTERN.test(trimmed)) {
    return `arn:aws:iam::${accountId}:role/aws-reserved/sso.amazonaws.com/${trimmed}`;
  }
  return undefined;
}
export const githubActionsOidcConfig = {
  oidcUrl: 'https://token.actions.githubusercontent.com',
  oidcAudience: 'sts.amazonaws.com',
  allowedRepository: 'JohannesKonings/tanstack-aws',
  allowedRepositorySub: 'repo:JohannesKonings/tanstack-aws:*',
} as const;
export type GitHubActionsOidcConfig = typeof githubActionsOidcConfig;

/**
 * Cursor OIDC issuer for Cloud Agent tokens.
 * Discovery: https://api.cursor.com/.well-known/openid-configuration
 * JWKS: https://api.cursor.com/keys
 */
export const cursorOidcConfig = {
  oidcUrl: 'https://api.cursor.com',
  oidcAudience: 'sts.amazonaws.com',
} as const;

export type CursorOidcConfig = {
  readonly oidcUrl: string;
  readonly oidcAudience: string;
  readonly allowedSubject: string;
};

/** Required CDK context key (`-c cursorOidcSubject=...`). There is no default. */
export const CURSOR_OIDC_SUBJECT_CONTEXT_KEY = 'cursorOidcSubject';

const MISSING_CURSOR_OIDC_SUBJECT_MESSAGE = `Missing CDK context ${CURSOR_OIDC_SUBJECT_CONTEXT_KEY}. Pass -c ${CURSOR_OIDC_SUBJECT_CONTEXT_KEY}=<exact OIDC sub>. The Account Setup workflow reads API_CURSOR_SUB from the envs secret in us-east-2.`;

const EXACT_OIDC_SUBJECT_PATTERN = /^[^\s*?]+$/;

export function resolveCursorOidcSubject(input: {
  readonly prop?: string;
  readonly context?: unknown;
}): string {
  if (input.prop !== undefined) {
    return exactCursorOidcSubject(input.prop, 'cursorOidcSubject');
  }
  if (input.context === undefined) {
    throw new Error(MISSING_CURSOR_OIDC_SUBJECT_MESSAGE);
  }
  if (typeof input.context !== 'string') {
    throw new Error(
      `CDK context ${CURSOR_OIDC_SUBJECT_CONTEXT_KEY} must be a string. Received ${typeof input.context}.`,
    );
  }
  return exactCursorOidcSubject(input.context, `CDK context ${CURSOR_OIDC_SUBJECT_CONTEXT_KEY}`);
}

function exactCursorOidcSubject(subject: string, source: string): string {
  if (!EXACT_OIDC_SUBJECT_PATTERN.test(subject)) {
    throw new Error(
      `${source} must be an exact OIDC sub with no whitespace or wildcards. Received ${JSON.stringify(subject)}.`,
    );
  }
  return subject;
}

/** Required CDK context key (`-c grokBotAlarmWebhookUrl=...`). There is no default. */
export const GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY = 'grokBotAlarmWebhookUrl';

const HTTPS_URL_PATTERN = /^https:\/\/\S+$/;
const MISSING_GROK_BOT_ALARM_WEBHOOK_URL_MESSAGE = `Missing CDK context ${GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY}. Pass -c ${GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY}=<https url>. The Account Setup workflow reads GROK_BOT_ALARM_WEBHOOK_URL from the envs secret in us-east-2.`;

export function resolveGrokBotAlarmWebhookUrl(input: {
  readonly prop?: string;
  readonly context?: unknown;
}): string {
  if (input.prop !== undefined) {
    return exactHttpsUrl(input.prop, GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY);
  }
  if (input.context === undefined) {
    throw new Error(MISSING_GROK_BOT_ALARM_WEBHOOK_URL_MESSAGE);
  }
  if (typeof input.context !== 'string') {
    throw new Error(
      `CDK context ${GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY} must be a string. Received ${typeof input.context}.`,
    );
  }
  return exactHttpsUrl(input.context, `CDK context ${GROK_BOT_ALARM_WEBHOOK_URL_CONTEXT_KEY}`);
}

function exactHttpsUrl(value: string, source: string): string {
  if (!HTTPS_URL_PATTERN.test(value)) {
    throw new Error(
      `${source} must be an https URL with no whitespace. Received ${JSON.stringify(value)}.`,
    );
  }
  return value;
}
type AccountSetupEnvFallbackSource =
  | 'CDK_DEFAULT_ACCOUNT'
  | 'CDK_DEFAULT_REGION'
  | 'AWS_DEFAULT_REGION';
type AccountSetupEnvSource = Partial<
  Record<
    keyof AccountSetupEnv | 'CLOUDWATCH_OMNI_ADMIN_ROLE' | AccountSetupEnvFallbackSource,
    string | undefined
  >
>;

export function resolveAccountSetupEnv(
  env: AccountSetupEnvSource = process.env as AccountSetupEnvSource,
): AccountSetupEnv {
  const envWithFallbacks = {
    AWS_ACCOUNT_ID: env.AWS_ACCOUNT_ID ?? env.CDK_DEFAULT_ACCOUNT,
    AWS_REGION: env.AWS_REGION ?? env.CDK_DEFAULT_REGION ?? env.AWS_DEFAULT_REGION ?? undefined,
    CLOUDWATCH_OMNI_ADMIN_ROLE: env.CLOUDWATCH_OMNI_ADMIN_ROLE,
  };

  const parsedEnv = accountSetupEnvSchema.safeParse(envWithFallbacks);

  if (!parsedEnv.success) {
    throw new Error(parsedEnv.error.issues[0]?.message ?? 'Invalid environment');
  }

  return parsedEnv.data;
}
