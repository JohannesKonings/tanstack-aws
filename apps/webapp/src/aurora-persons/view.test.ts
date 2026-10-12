import { describe, expect, it } from 'vite-plus/test';
import { auroraBankAccountView, auroraPersonDetailView, auroraPersonListView } from './view.ts';

const personId = '11111111-1111-4111-8111-111111111111';
const bankAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Aurora person views', () => {
  it('keeps the list row to id, name, and gender', () => {
    expect(
      auroraPersonListView.parse({
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        gender: 'female',
      }),
    ).toEqual({
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      gender: 'female',
    });
  });

  it('maps a missing list gender to undefined', () => {
    expect(
      auroraPersonListView.parse({
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        gender: null,
      }).gender,
    ).toBeUndefined();
  });

  it('maps a missing gender and birth date to undefined', () => {
    expect(
      auroraPersonDetailView.parse({
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        gender: null,
        dateOfBirth: null,
      }),
    ).toEqual({
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      gender: undefined,
      dateOfBirth: undefined,
    });
  });

  it('maps null bank identifiers to undefined', () => {
    expect(
      auroraBankAccountView.parse({
        id: bankAccountId,
        personId,
        bankName: 'Barings',
        accountType: 'checking',
        accountNumberLast4: '4242',
        iban: null,
        bic: null,
        isPrimary: true,
      }),
    ).toEqual({
      id: bankAccountId,
      personId,
      bankName: 'Barings',
      accountType: 'checking',
      accountNumberLast4: '4242',
      iban: undefined,
      bic: undefined,
      isPrimary: true,
    });
  });
});
