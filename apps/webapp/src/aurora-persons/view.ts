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

/**
 * A picked column still in `rest` is selected but unused. The message names the key to take off the page schema.
 * The transform return value is a separate shape, so any view can reformat a column it has read.
 */
type UnreadColumn<Row extends object> = {
  [Key in keyof Row]: `take "${Key & string}" off the page schema`;
};

const everyColumnRead = <Row extends object>(
  rest: keyof Row extends never ? Row : UnreadColumn<Row>,
): void => {
  void rest;
};

/** The list shows the year. The stored timestamp stays on the page schema so the query can select it. */
const birthdayYear = (dateOfBirth: string | null) => {
  if (dateOfBirth === null) {
    return undefined;
  }
  const year = new Date(dateOfBirth).getUTCFullYear();
  return Number.isNaN(year) ? undefined : year;
};

export const auroraPersonListView = personListSchema.transform((person) => {
  const { id, firstName, lastName, dateOfBirth, ...rest } = person;
  everyColumnRead(rest);
  return {
    id,
    firstName,
    lastName,
    birthdayYear: birthdayYear(dateOfBirth),
  };
});

export const auroraPersonDetailView = personDetailSchema.transform((person) => {
  const { id, firstName, lastName, gender, dateOfBirth, ...rest } = person;
  everyColumnRead(rest);
  return {
    id,
    firstName,
    lastName,
    gender: absent(gender),
    dateOfBirth: absent(dateOfBirth),
  };
});

export const auroraAddressView = addressPageSchema.transform((address) => {
  const { id, personId, type, street, city, state, postalCode, country, isPrimary, ...rest } =
    address;
  everyColumnRead(rest);
  return {
    id,
    personId,
    type,
    street,
    city,
    state,
    postalCode,
    country,
    isPrimary,
  };
});

export const auroraBankAccountView = bankAccountPageSchema.transform((bankAccount) => {
  const { id, personId, bankName, accountType, accountNumberLast4, iban, bic, isPrimary, ...rest } =
    bankAccount;
  everyColumnRead(rest);
  return {
    id,
    personId,
    bankName,
    accountType,
    accountNumberLast4,
    iban: absent(iban),
    bic: absent(bic),
    isPrimary,
  };
});

export const auroraContactView = contactPageSchema.transform((contact) => {
  const { id, personId, type, value, isPrimary, isVerified, ...rest } = contact;
  everyColumnRead(rest);
  return {
    id,
    personId,
    type,
    value,
    isPrimary,
    isVerified,
  };
});

export const auroraEmploymentView = employmentPageSchema.transform((employment) => {
  const {
    id,
    personId,
    companyName,
    position,
    department,
    startDate,
    endDate,
    isCurrent,
    salary,
    currency,
    ...rest
  } = employment;
  everyColumnRead(rest);
  return {
    id,
    personId,
    companyName,
    position,
    department: absent(department),
    startDate,
    endDate: absent(endDate),
    isCurrent,
    salary: absent(salary),
    currency,
  };
});

export type AuroraPersonListRow = z.output<typeof auroraPersonListView>;
export type AuroraPersonDetail = z.output<typeof auroraPersonDetailView>;
export type AuroraAddressRow = z.output<typeof auroraAddressView>;
export type AuroraBankAccountRow = z.output<typeof auroraBankAccountView>;
export type AuroraContactRow = z.output<typeof auroraContactView>;
export type AuroraEmploymentRow = z.output<typeof auroraEmploymentView>;
