import { boolean, numeric, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-orm/zod';
import { STAGE_DATABASE_SCHEMA } from './stage-database-name.ts';

/** Person tables live here. Schema `public` stays empty. */
export const stageDatabaseSchema = pgSchema(STAGE_DATABASE_SCHEMA);

const timestampColumn = (name: string) => timestamp(name, { mode: 'string', withTimezone: true });

export const genderEnum = stageDatabaseSchema.enum('gender', [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

export const addressTypeEnum = stageDatabaseSchema.enum('address_type', [
  'home',
  'work',
  'billing',
  'shipping',
]);

export const accountTypeEnum = stageDatabaseSchema.enum('account_type', [
  'checking',
  'savings',
  'investment',
]);

export const contactTypeEnum = stageDatabaseSchema.enum('contact_type', [
  'email',
  'phone',
  'mobile',
  'linkedin',
  'twitter',
]);

export const persons = stageDatabaseSchema.table('persons', {
  id: uuid('id').primaryKey(),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  dateOfBirth: timestampColumn('dateOfBirth'),
  gender: genderEnum('gender'),
  createdAt: timestampColumn('createdAt').notNull(),
  updatedAt: timestampColumn('updatedAt').notNull(),
});

export const addresses = stageDatabaseSchema.table('addresses', {
  id: uuid('id').primaryKey(),
  personId: uuid('personId')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  type: addressTypeEnum('type').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postalCode').notNull(),
  country: text('country').notNull(),
  isPrimary: boolean('isPrimary').notNull(),
});

export const bankAccounts = stageDatabaseSchema.table('bank_accounts', {
  id: uuid('id').primaryKey(),
  personId: uuid('personId')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  bankName: text('bankName').notNull(),
  accountType: accountTypeEnum('accountType').notNull(),
  accountNumberLast4: text('accountNumberLast4').notNull(),
  iban: text('iban'),
  bic: text('bic'),
  isPrimary: boolean('isPrimary').notNull(),
});

export const contacts = stageDatabaseSchema.table('contacts', {
  id: uuid('id').primaryKey(),
  personId: uuid('personId')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  type: contactTypeEnum('type').notNull(),
  value: text('value').notNull(),
  isPrimary: boolean('isPrimary').notNull(),
  isVerified: boolean('isVerified').notNull(),
});

export const employments = stageDatabaseSchema.table('employments', {
  id: uuid('id').primaryKey(),
  personId: uuid('personId')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  companyName: text('companyName').notNull(),
  position: text('position').notNull(),
  department: text('department'),
  startDate: timestampColumn('startDate').notNull(),
  endDate: timestampColumn('endDate'),
  isCurrent: boolean('isCurrent').notNull(),
  salary: numeric('salary', { mode: 'number' }),
  currency: text('currency').notNull(),
});

/** Tables the stage-database lifecycle creates, in dependency order. */
export const stageDatabaseTables = [persons, addresses, bankAccounts, contacts, employments];

export const personSelectSchema = createSelectSchema(persons);
export const addressSelectSchema = createSelectSchema(addresses);
export const bankAccountSelectSchema = createSelectSchema(bankAccounts);
export const contactSelectSchema = createSelectSchema(contacts);
export const employmentSelectSchema = createSelectSchema(employments);

export const personPageSchema = personSelectSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
});

export const addressPageSchema = addressSelectSchema.pick({
  id: true,
  personId: true,
  type: true,
  isPrimary: true,
  street: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
});

export const bankAccountPageSchema = bankAccountSelectSchema.pick({
  id: true,
  personId: true,
  bankName: true,
  isPrimary: true,
  accountType: true,
  accountNumberLast4: true,
  iban: true,
  bic: true,
});

export const contactPageSchema = contactSelectSchema.pick({
  id: true,
  personId: true,
  type: true,
  isPrimary: true,
  isVerified: true,
  value: true,
});

export const employmentPageSchema = employmentSelectSchema.pick({
  id: true,
  personId: true,
  position: true,
  isCurrent: true,
  companyName: true,
  department: true,
  startDate: true,
  endDate: true,
  salary: true,
  currency: true,
});
