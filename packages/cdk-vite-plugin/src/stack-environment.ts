export type StackOutput = {
  OutputKey?: string;
  OutputValue?: string;
};

/**
 * Region for the dev server. An explicit `AWS_REGION` wins.
 * When it is missing, write `awsRegion` so SDK clients that read the
 * environment use the same region as stack lookup.
 */
export const applyDevServerRegion = (target: NodeJS.ProcessEnv, awsRegion: string): string => {
  const configured = target.AWS_REGION?.trim();
  if (configured) {
    return configured;
  }
  const region = awsRegion.trim();
  target.AWS_REGION = region;
  return region;
};

/** Env var name → CloudFormation output key. */
export type CdkDevServerOutputs = Readonly<Record<string, string>>;

/** Read every mapped output. Missing any variable yields nothing. */
export const readStackEnvironment = (
  outputMap: CdkDevServerOutputs,
  outputs: readonly StackOutput[],
): Record<string, string> | undefined => {
  const environment: Record<string, string> = {};
  for (const [envName, outputKey] of Object.entries(outputMap)) {
    const value = outputs.find((output) => output.OutputKey === outputKey)?.OutputValue;
    if (!value) {
      return undefined;
    }
    environment[envName] = value;
  }
  return environment;
};

export const applyStackEnvironment = (
  target: NodeJS.ProcessEnv,
  environment: Readonly<Record<string, string>>,
): void => {
  for (const [name, value] of Object.entries(environment)) {
    target[name] = value;
  }
};
