// oxlint-disable func-style
import { faker } from '@faker-js/faker';
import type {
  AccountType,
  Address,
  AddressType,
  BankAccount,
  ContactInfo,
  ContactType,
  Employment,
  Gender,
  Person,
  PersonWithRelations,
} from '#src/webapp/types/person.ts';

// =============================================================================
// Seed for reproducible data
// =============================================================================

const SEED = 12345;

/**
 * Initialize faker with a seed for reproducible data
 */
export function initFaker(seed: number = SEED) {
  faker.seed(seed);
}

// =============================================================================
// Individual Entity Generators
// =============================================================================

/**
 * Generate a fake person
 */
function generatePerson(overrides?: Partial<Person>): Person {
  const now = new Date().toISOString();
  const gender = faker.helpers.arrayElement<Gender>([
    'male',
    'female',
    'other',
    'prefer_not_to_say',
  ]);

  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(
      // oxlint-disable-next-line no-nested-ternary
      gender === 'male' ? 'male' : gender === 'female' ? 'female' : undefined,
    ),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString(),
    gender,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generate a fake address for a person
 */
function generateAddress(personId: string, overrides?: Partial<Address>): Address {
  const addressTypes: AddressType[] = ['home', 'work', 'billing', 'shipping'];

  return {
    id: faker.string.uuid(),
    personId,
    type: faker.helpers.arrayElement(addressTypes),
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    postalCode: faker.location.zipCode(),
    country: faker.location.country(),
    isPrimary: false,
    ...overrides,
  };
}

/**
 * Generate a fake bank account for a person
 */
function generateBankAccount(
  personId: string,
  overrides?: Partial<BankAccount>,
): BankAccount {
  const accountTypes: AccountType[] = ['checking', 'savings', 'investment'];

  return {
    id: faker.string.uuid(),
    personId,
    bankName: faker.company.name() + ' Bank',
    accountType: faker.helpers.arrayElement(accountTypes),
    accountNumberLast4: faker.finance.accountNumber(4),
    iban: faker.finance.iban(),
    bic: faker.finance.bic(),
    isPrimary: false,
    ...overrides,
  };
}

/**
 * Generate a fake contact info for a person
 */
function generateContactInfo(
  personId: string,
  type?: ContactType,
  overrides?: Partial<ContactInfo>,
): ContactInfo {
  const contactTypes: ContactType[] = ['email', 'phone', 'mobile', 'linkedin', 'twitter'];
  const selectedType = type ?? faker.helpers.arrayElement(contactTypes);

  let value: string;
  switch (selectedType) {
    case 'email':
      value = faker.internet.email();
      break;
    case 'phone':
    case 'mobile':
      value = faker.phone.number();
      break;
    case 'linkedin':
      value = `linkedin.com/in/${faker.internet.username()}`;
      break;
    case 'twitter':
      value = `@${faker.internet.username()}`;
      break;
    default:
      value = faker.internet.email();
  }

  return {
    id: faker.string.uuid(),
    personId,
    type: selectedType,
    value,
    isPrimary: false,
    isVerified: faker.datatype.boolean({ probability: 0.7 }),
    ...overrides,
  };
}

/**
 * Generate a fake employment record for a person
 */
function generateEmployment(
  personId: string,
  isCurrent: boolean = false,
  overrides?: Partial<Employment>,
): Employment {
  const startDate = faker.date.past({ years: isCurrent ? 5 : 15 });
  const endDate = isCurrent ? null : faker.date.between({ from: startDate, to: new Date() });

  return {
    id: faker.string.uuid(),
    personId,
    companyName: faker.company.name(),
    position: faker.person.jobTitle(),
    department: faker.commerce.department(),
    startDate: startDate.toISOString(),
    endDate: endDate?.toISOString() ?? null,
    isCurrent,
    salary: faker.number.int({ min: 30000, max: 250000 }),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
    ...overrides,
  };
}

// =============================================================================
// Person with Relations Generator
// =============================================================================

interface GeneratePersonOptions {
  addressCount?: { min: number; max: number };
  bankAccountCount?: { min: number; max: number };
  contactCount?: { min: number; max: number };
  employmentCount?: { min: number; max: number };
}

const defaultOptions: Required<GeneratePersonOptions> = {
  addressCount: { min: 1, max: 3 },
  bankAccountCount: { min: 1, max: 2 },
  contactCount: { min: 2, max: 5 },
  employmentCount: { min: 1, max: 4 },
};

/**
 * Generate a person with all related entities
 */
function generatePersonWithRelations(options?: GeneratePersonOptions): PersonWithRelations {
  const opts = { ...defaultOptions, ...options };
  const person = generatePerson();

  // Generate addresses
  const addressCount = faker.number.int(opts.addressCount);
  const addresses: Address[] = [];
  for (let i = 0; i < addressCount; i++) {
    addresses.push(generateAddress(person.id, { isPrimary: i === 0 }));
  }

  // Generate bank accounts
  const bankAccountCount = faker.number.int(opts.bankAccountCount);
  const bankAccounts: BankAccount[] = [];
  for (let i = 0; i < bankAccountCount; i++) {
    bankAccounts.push(generateBankAccount(person.id, { isPrimary: i === 0 }));
  }

  // Generate contacts - always include at least one email
  const contactCount = faker.number.int(opts.contactCount);
  const contacts: ContactInfo[] = [generateContactInfo(person.id, 'email', { isPrimary: true })];
  for (let i = 1; i < contactCount; i++) {
    contacts.push(generateContactInfo(person.id));
  }

  // Generate employments - at least one current
  const employmentCount = faker.number.int(opts.employmentCount);
  const employments: Employment[] = [
    generateEmployment(person.id, true), // Current job
  ];
  for (let i = 1; i < employmentCount; i++) {
    employments.push(generateEmployment(person.id, false)); // Past jobs
  }

  return {
    ...person,
    addresses,
    bankAccounts,
    contacts,
    employments,
  };
}

// =============================================================================
// Batch Generation
// =============================================================================

/**
 * Generate multiple persons with relations
 */
export function generatePersons(
  count: number,
  options?: GeneratePersonOptions,
): PersonWithRelations[] {
  initFaker(); // Reset seed for reproducibility
  const persons: PersonWithRelations[] = [];

  for (let i = 0; i < count; i++) {
    persons.push(generatePersonWithRelations(options));
  }

  return persons;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get primary email from contacts
 */
function getPrimaryEmail(contacts: ContactInfo[]): string | undefined {
  const primary = contacts.find((c) => c.type === 'email' && c.isPrimary);
  return primary?.value ?? contacts.find((c) => c.type === 'email')?.value;
}

/**
 * Get primary address city
 */
function getPrimaryCity(addresses: Address[]): string | undefined {
  const primary = addresses.find((a) => a.isPrimary);
  return primary?.city ?? addresses[0]?.city;
}

/**
 * Get current employer
 */
function getCurrentEmployer(employments: Employment[]): string | undefined {
  const current = employments.find((e) => e.isCurrent);
  return current?.companyName;
}

/**
 * Get full name
 */
function getFullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`;
}
