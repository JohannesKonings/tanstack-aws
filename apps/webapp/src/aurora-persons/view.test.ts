import { describe, expect, it } from 'vite-plus/test';
import { auroraBankAccountView, auroraPersonDetailView, auroraPersonListView } from './view.ts';

const personId = '11111111-1111-4111-8111-111111111111';
const bankAccountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Aurora person views', () => {
  it('derives the list birth year from the stored timestamp', () => {
    expect(
      auroraPersonListView.parse({
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '1815-12-10T00:00:00.000Z',
      }),
    ).toEqual({
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      birthdayYear: 1815,
    });
  });

  it('maps a missing list birth date to undefined', () => {
    expect(
      auroraPersonListView.parse({
        id: personId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: null,
      }),
    ).toEqual({
      id: personId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      birthdayYear: undefined,
    });
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
