import { describe, expect, it } from 'vite-plus/test';
import { applyStackEnvironment, readStackEnvironment } from './stack-environment.ts';

const outputMap = {
  API_URL: 'ApiUrl',
  TABLE_NAME: 'TableName',
};

describe('stack environment', () => {
  it('reads every mapped output', () => {
    expect(
      readStackEnvironment(outputMap, [
        { OutputKey: 'ApiUrl', OutputValue: 'https://example.test' },
        { OutputKey: 'TableName', OutputValue: 'items' },
        { OutputKey: 'Unrelated', OutputValue: 'ignored' },
      ]),
    ).toEqual({
      API_URL: 'https://example.test',
      TABLE_NAME: 'items',
    });
  });

  it('reads nothing when any mapped output is missing', () => {
    expect(
      readStackEnvironment(outputMap, [
        { OutputKey: 'ApiUrl', OutputValue: 'https://example.test' },
      ]),
    ).toBeUndefined();
  });

  it('writes the mapped variables onto the local environment', () => {
    const target: NodeJS.ProcessEnv = { AWS_REGION: 'us-east-2' };
    applyStackEnvironment(target, { API_URL: 'https://example.test', TABLE_NAME: 'items' });
    expect(target).toEqual({
      API_URL: 'https://example.test',
      AWS_REGION: 'us-east-2',
      TABLE_NAME: 'items',
    });
  });
});
