import {
  addressPageSchema,
  bankAccountPageSchema,
  contactPageSchema,
  employmentPageSchema,
  personDetailSchema,
  personListSchema,
} from '@tanstack-aws/aurora';
import type { z } from 'zod';

/** The database speaks `null`, the screen speaks `undefined`. Every nullable column goes through here. */
const absent = <T>(value: T | null) => value ?? undefined;

/** A view maps every picked column, and only those. A column the screen does not need comes off the pick. */
type ViewOf<Page extends z.ZodType> = Record<keyof z.output<Page>, unknown>;

export const auroraPersonListView = personListSchema.transform(
  (person) =>
    ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: absent(person.gender),
    }) satisfies ViewOf<typeof personListSchema>,
);

export const auroraPersonDetailView = personDetailSchema.transform(
  (person) =>
    ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: absent(person.gender),
      dateOfBirth: absent(person.dateOfBirth),
    }) satisfies ViewOf<typeof personDetailSchema>,
);

export const auroraAddressView = addressPageSchema.transform(
  (address) =>
    ({
      id: address.id,
      personId: address.personId,
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isPrimary: address.isPrimary,
    }) satisfies ViewOf<typeof addressPageSchema>,
);

export const auroraBankAccountView = bankAccountPageSchema.transform(
  (bankAccount) =>
    ({
      id: bankAccount.id,
      personId: bankAccount.personId,
      bankName: bankAccount.bankName,
      accountType: bankAccount.accountType,
      accountNumberLast4: bankAccount.accountNumberLast4,
      iban: absent(bankAccount.iban),
      bic: absent(bankAccount.bic),
      isPrimary: bankAccount.isPrimary,
    }) satisfies ViewOf<typeof bankAccountPageSchema>,
);

export const auroraContactView = contactPageSchema.transform(
  (contact) =>
    ({
      id: contact.id,
      personId: contact.personId,
      type: contact.type,
      value: contact.value,
      isPrimary: contact.isPrimary,
      isVerified: contact.isVerified,
    }) satisfies ViewOf<typeof contactPageSchema>,
);

export const auroraEmploymentView = employmentPageSchema.transform(
  (employment) =>
    ({
      id: employment.id,
      personId: employment.personId,
      companyName: employment.companyName,
      position: employment.position,
      department: absent(employment.department),
      startDate: employment.startDate,
      endDate: absent(employment.endDate),
      isCurrent: employment.isCurrent,
      salary: absent(employment.salary),
      currency: employment.currency,
    }) satisfies ViewOf<typeof employmentPageSchema>,
);

export type AuroraPersonListRow = z.output<typeof auroraPersonListView>;
export type AuroraPersonDetail = z.output<typeof auroraPersonDetailView>;
export type AuroraAddressRow = z.output<typeof auroraAddressView>;
export type AuroraBankAccountRow = z.output<typeof auroraBankAccountView>;
export type AuroraContactRow = z.output<typeof auroraContactView>;
export type AuroraEmploymentRow = z.output<typeof auroraEmploymentView>;
