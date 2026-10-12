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

export const auroraPersonListView = personListSchema.transform((person) => ({
  id: person.id,
  firstName: person.firstName,
  lastName: person.lastName,
  gender: absent(person.gender),
}));

export const auroraPersonDetailView = personDetailSchema.transform((person) => ({
  id: person.id,
  firstName: person.firstName,
  lastName: person.lastName,
  gender: absent(person.gender),
  dateOfBirth: absent(person.dateOfBirth),
}));

export const auroraAddressView = addressPageSchema.transform((address) => ({
  id: address.id,
  personId: address.personId,
  type: address.type,
  street: address.street,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  isPrimary: address.isPrimary,
}));

export const auroraBankAccountView = bankAccountPageSchema.transform((bankAccount) => ({
  id: bankAccount.id,
  personId: bankAccount.personId,
  bankName: bankAccount.bankName,
  accountType: bankAccount.accountType,
  accountNumberLast4: bankAccount.accountNumberLast4,
  iban: absent(bankAccount.iban),
  bic: absent(bankAccount.bic),
  isPrimary: bankAccount.isPrimary,
}));

export const auroraContactView = contactPageSchema.transform((contact) => ({
  id: contact.id,
  personId: contact.personId,
  type: contact.type,
  value: contact.value,
  isPrimary: contact.isPrimary,
  isVerified: contact.isVerified,
}));

export const auroraEmploymentView = employmentPageSchema.transform((employment) => ({
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
}));

export type AuroraPersonListRow = z.output<typeof auroraPersonListView>;
export type AuroraPersonDetail = z.output<typeof auroraPersonDetailView>;
export type AuroraAddressRow = z.output<typeof auroraAddressView>;
export type AuroraBankAccountRow = z.output<typeof auroraBankAccountView>;
export type AuroraContactRow = z.output<typeof auroraContactView>;
export type AuroraEmploymentRow = z.output<typeof auroraEmploymentView>;
