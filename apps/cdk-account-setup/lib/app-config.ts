import { z } from 'zod';

const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/;
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d$/;
const IAM_ROLE_ARN_PATTERN = /^arn:aws[a-zA-Z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$/;
const SSO_ROLE_NAME_PATTERN = /^AWSReservedSSO_[\w+=,.@-]{1,64}$/;

function optionalEnvString(value: unknown): unknown {
  return value === undefined || value === null || value === '' ? undefined : value;
}

const DB_CLUSTER_SNAPSHOT_ARN_PATTERN =
  /^arn:aws[a-zA-Z-]*:rds:[a-z0-9-]+:\d{12}:cluster-snapshot:\S+$/;

function requiredEnv(
  name: 'AWS_ACCOUNT_ID' | 'CLOUDWATCH_OMNI_ADMIN_ROLE' | 'DB_FROM_SNAPSHOT_ARN',
) {
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
    DB_FROM_SNAPSHOT_ARN: requiredEnv('DB_FROM_SNAPSHOT_ARN').pipe(
      z
        .string()
        .regex(
          DB_CLUSTER_SNAPSHOT_ARN_PATTERN,
          'DB_FROM_SNAPSHOT_ARN must be an RDS cluster snapshot ARN',
        )
        .describe('Aurora cluster snapshot ARN encrypted with the account key.'),
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
      DB_FROM_SNAPSHOT_ARN: env.DB_FROM_SNAPSHOT_ARN,
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
    DB_FROM_SNAPSHOT_ARN: env.DB_FROM_SNAPSHOT_ARN,
  };

  const parsedEnv = accountSetupEnvSchema.safeParse(envWithFallbacks);

  if (!parsedEnv.success) {
    throw new Error(parsedEnv.error.issues[0]?.message ?? 'Invalid environment');
  }

  return parsedEnv.data;
}
