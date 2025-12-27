// oxlint-disable no-magic-numbers
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const GenderEnum = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof GenderEnum>;

export const AddressTypeEnum = z.enum(['home', 'work', 'billing', 'shipping']);
export type AddressType = z.infer<typeof AddressTypeEnum>;

const AccountTypeEnum = z.enum(['checking', 'savings', 'investment']);
export type AccountType = z.infer<typeof AccountTypeEnum>;

const ContactTypeEnum = z.enum(['email', 'phone', 'mobile', 'linkedin', 'twitter']);
export type ContactType = z.infer<typeof ContactTypeEnum>;

// =============================================================================
// Entity Schemas
// =============================================================================

/**
 * Person - Core entity with personal information
 */
export const PersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.iso.datetime().optional(),
  gender: GenderEnum.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Person = z.infer<typeof PersonSchema>;

/**
 * Address - Physical/mailing addresses (1:N with Person)
 */
export const AddressSchema = z.object({
  id: z.uuid(),
  personId: z.uuid(),
  type: AddressTypeEnum,
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  isPrimary: z.boolean().default(false),
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * BankAccount - Banking information (1:N with Person)
 */
export const BankAccountSchema = z.object({
  id: z.uuid(),
  personId: z.uuid(),
  bankName: z.string().min(1).max(100),
  accountType: AccountTypeEnum,
  accountNumberLast4: z.string().length(4),
  iban: z.string().min(15).max(34).optional(),
  bic: z.string().min(8).max(11).optional(),
  isPrimary: z.boolean().default(false),
});

export type BankAccount = z.infer<typeof BankAccountSchema>;

/**
 * ContactInfo - Email, phone, social media (1:N with Person)
 */
export const ContactInfoSchema = z.object({
  id: z.uuid(),
  personId: z.uuid(),
  type: ContactTypeEnum,
  value: z.string().min(1).max(200),
  isPrimary: z.boolean().default(false),
  isVerified: z.boolean().default(false),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

/**
 * Employment - Job history and current employment (1:N with Person)
 */
export const EmploymentSchema = z.object({
  id: z.uuid(),
  personId: z.uuid(),
  companyName: z.string().min(1).max(200),
  position: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable().optional(),
  isCurrent: z.boolean().default(false),
  salary: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
});

export type Employment = z.infer<typeof EmploymentSchema>;

// =============================================================================
// Composite Types
// =============================================================================

/**
 * Person with all related entities (addresses, bank accounts, contacts, employments)
 */
const PersonWithRelationsSchema = PersonSchema.extend({
  addresses: z.array(AddressSchema),
  bankAccounts: z.array(BankAccountSchema),
  contacts: z.array(ContactInfoSchema),
  employments: z.array(EmploymentSchema),
});

export type PersonWithRelations = z.infer<typeof PersonWithRelationsSchema>;
