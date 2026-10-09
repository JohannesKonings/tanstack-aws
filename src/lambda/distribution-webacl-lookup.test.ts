import { describe, expect, it } from 'vite-plus/test';
import { requireWebAclId, selectDistributionPhysicalId } from './distribution-webacl-lookup.ts';

describe('distribution WebACL lookup', () => {
  it('keeps the WebACL of a distribution that is already in the stack', () => {
    const physicalId = selectDistributionPhysicalId('WebappAdminDistribution', [
      { logicalId: 'WebappDistribution', physicalId: 'EWEBAPP' },
      { logicalId: 'WebappAdminDistribution', physicalId: 'EADMIN' },
    ]);

    expect(physicalId).toBe('EADMIN');
  });

  it('copies a WebACL from an existing distribution when this one is being created', () => {
    const physicalId = selectDistributionPhysicalId('WebappAdminDistribution', [
      { logicalId: 'WebappDistribution', physicalId: 'EWEBAPP' },
    ]);

    expect(physicalId).toBe('EWEBAPP');
  });

  it('fails when a protected stage has no distribution WebACL to preserve', () => {
    expect(() => selectDistributionPhysicalId('WebappAdminDistribution', [])).toThrow(
      /no existing distribution/,
    );
    expect(() => requireWebAclId('EWEBAPP', undefined)).toThrow(/no WebACL/);
  });
});
