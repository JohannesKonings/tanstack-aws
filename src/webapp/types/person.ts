// oxlint-disable no-magic-numbers
import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const GenderEnum = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof GenderEnum>;

export const AddressTypeEnum = z.enum(['home', 'work', 'billing', 'shipping']);
export type AddressType = z.infer<typeof AddressTypeEnum>;

export const AccountTypeEnum = z.enum(['checking', 'savings', 'investment']);
export type AccountType = z.infer<typeof AccountTypeEnum>;

export const ContactTypeEnum = z.enum(['email', 'phone', 'mobile', 'linkedin', 'twitter']);
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
 * PersonWithRelations - Person with all related entities
 */
export const PersonWithRelationsSchema = PersonSchema.extend({
  addresses: z.array(AddressSchema).default([]),
  bankAccounts: z.array(BankAccountSchema).default([]),
  contacts: z.array(ContactInfoSchema).default([]),
  employments: z.array(EmploymentSchema).default([]),
});

export type PersonWithRelations = z.infer<typeof PersonWithRelationsSchema>;

// =============================================================================
// DynamoDB Item Types (for single-table design)
// =============================================================================

/**
 * Base DynamoDB item with pk/sk
 */
export const DynamoDBItemSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  gsi1pk: z.string().optional(),
  gsi1sk: z.string().optional(),
  entityType: z.enum(['PERSON', 'ADDRESS', 'BANK', 'CONTACT', 'EMPLOYMENT']),
});

export type DynamoDBItem = z.infer<typeof DynamoDBItemSchema>;

/**
 * Person DynamoDB item
 */
export const PersonDynamoDBItemSchema = DynamoDBItemSchema.extend({
  entityType: z.literal('PERSON'),
}).merge(PersonSchema.omit({ id: true }));

export type PersonDynamoDBItem = z.infer<typeof PersonDynamoDBItemSchema>;

/**
 * Address DynamoDB item
 */
export const AddressDynamoDBItemSchema = DynamoDBItemSchema.extend({
  entityType: z.literal('ADDRESS'),
}).merge(AddressSchema.omit({ id: true, personId: true }));

export type AddressDynamoDBItem = z.infer<typeof AddressDynamoDBItemSchema>;

/**
 * BankAccount DynamoDB item
 */
export const BankAccountDynamoDBItemSchema = DynamoDBItemSchema.extend({
  entityType: z.literal('BANK'),
}).merge(BankAccountSchema.omit({ id: true, personId: true }));

export type BankAccountDynamoDBItem = z.infer<typeof BankAccountDynamoDBItemSchema>;

/**
 * ContactInfo DynamoDB item
 */
export const ContactInfoDynamoDBItemSchema = DynamoDBItemSchema.extend({
  entityType: z.literal('CONTACT'),
}).merge(ContactInfoSchema.omit({ id: true, personId: true }));

export type ContactInfoDynamoDBItem = z.infer<typeof ContactInfoDynamoDBItemSchema>;

/**
 * Employment DynamoDB item
 */
export const EmploymentDynamoDBItemSchema = DynamoDBItemSchema.extend({
  entityType: z.literal('EMPLOYMENT'),
}).merge(EmploymentSchema.omit({ id: true, personId: true }));

export type EmploymentDynamoDBItem = z.infer<typeof EmploymentDynamoDBItemSchema>;

// =============================================================================
// Request/Response Schemas
// =============================================================================

/**
 * Create person request
 */
export const CreatePersonRequestSchema = PersonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePersonRequest = z.infer<typeof CreatePersonRequestSchema>;

/**
 * Update person request
 */
export const UpdatePersonRequestSchema = PersonSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdatePersonRequest = z.infer<typeof UpdatePersonRequestSchema>;

/**
 * Create address request
 */
export const CreateAddressRequestSchema = AddressSchema.omit({
  id: true,
});

export type CreateAddressRequest = z.infer<typeof CreateAddressRequestSchema>;

/**
 * Create bank account request
 */
export const CreateBankAccountRequestSchema = BankAccountSchema.omit({
  id: true,
});

export type CreateBankAccountRequest = z.infer<typeof CreateBankAccountRequestSchema>;

/**
 * Create contact info request
 */
export const CreateContactInfoRequestSchema = ContactInfoSchema.omit({
  id: true,
});

export type CreateContactInfoRequest = z.infer<typeof CreateContactInfoRequestSchema>;

/**
 * Create employment request
 */
export const CreateEmploymentRequestSchema = EmploymentSchema.omit({
  id: true,
});

export type CreateEmploymentRequest = z.infer<typeof CreateEmploymentRequestSchema>;

// =============================================================================
// Helper Types for Search
// =============================================================================

/**
 * Person summary for search results (lightweight)
 * Includes fields from all entity types for cross-entity search
 */
export const PersonSummarySchema = z.object({
  // Person fields
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  // Address fields
  city: z.string().optional(),
  country: z.string().optional(),
  // Contact fields
  email: z.string().optional(),
  phone: z.string().optional(),
  // Employment fields
  companyName: z.string().optional(),
  position: z.string().optional(),
  // Bank fields
  bankName: z.string().optional(),
});

export type PersonSummary = z.infer<typeof PersonSummarySchema>;

// =============================================================================
// Key Helpers
// =============================================================================

export const DynamoDBKeys = {
  person: {
    pk: (personId: string) => `PERSON#${personId}`,
    sk: () => 'PROFILE',
    gsi1pk: () => 'PERSONS',
    gsi1sk: (personId: string) => `PERSON#${personId}`,
  },
  address: {
    pk: (personId: string) => `PERSON#${personId}`,
    sk: (addressId: string) => `ADDRESS#${addressId}`,
  },
  bankAccount: {
    pk: (personId: string) => `PERSON#${personId}`,
    sk: (bankId: string) => `BANK#${bankId}`,
  },
  contactInfo: {
    pk: (personId: string) => `PERSON#${personId}`,
    sk: (contactId: string) => `CONTACT#${contactId}`,
  },
  employment: {
    pk: (personId: string) => `PERSON#${personId}`,
    sk: (employmentId: string) => `EMPLOYMENT#${employmentId}`,
  },
  // Extract IDs from keys
  extractPersonId: (pk: string) => pk.replace('PERSON#', ''),
  extractAddressId: (sk: string) => sk.replace('ADDRESS#', ''),
  extractBankId: (sk: string) => sk.replace('BANK#', ''),
  extractContactId: (sk: string) => sk.replace('CONTACT#', ''),
  extractEmploymentId: (sk: string) => sk.replace('EMPLOYMENT#', ''),
} as const;
