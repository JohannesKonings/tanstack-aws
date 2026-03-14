import { z } from 'zod';

const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/;
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d$/;

function requiredEnv(name: 'AWS_ACCOUNT_ID' | 'AWS_REGION') {
  return z.preprocess(
    (value) => value ?? '',
    z
      .string()
      .trim()
      .min(1, `Missing required environment variable: ${name}`),
  );
}

export const accountSetupEnvSchema = z.object({
  AWS_ACCOUNT_ID: requiredEnv('AWS_ACCOUNT_ID').pipe(
    z
      .string()
      .regex(
        AWS_ACCOUNT_ID_PATTERN,
        'AWS_ACCOUNT_ID must be a 12-digit AWS account ID',
      )
      .describe('12-digit AWS account ID, for example 123456789012'),
  ),
  AWS_REGION: requiredEnv('AWS_REGION').pipe(
    z
      .string()
      .regex(
        AWS_REGION_PATTERN,
        'AWS_REGION must look like an AWS region, for example us-east-2',
      )
      .describe(
        'AWS region identifier, for example us-east-2 or eu-central-1',
      ),
  ),
});

export type AccountSetupEnv = z.infer<typeof accountSetupEnvSchema>;
export const githubActionsOidcConfig = {
  oidcUrl: 'https://token.actions.githubusercontent.com',
  oidcAudience: 'sts.amazonaws.com',
  allowedRepository: 'JohannesKonings/tanstack-aws',
  allowedRepositorySub: 'repo:JohannesKonings/tanstack-aws:*',
} as const;
export type GitHubActionsOidcConfig = typeof githubActionsOidcConfig;
type AccountSetupEnvSource = Partial<Record<keyof AccountSetupEnv, string | undefined>>;

export function resolveAccountSetupEnv(
  env: AccountSetupEnvSource = process.env as AccountSetupEnvSource,
): AccountSetupEnv {
  const parsedEnv = accountSetupEnvSchema.safeParse(env);

  if (!parsedEnv.success) {
    throw new Error(parsedEnv.error.issues[0]?.message ?? 'Invalid environment');
  }

  return parsedEnv.data;
}
