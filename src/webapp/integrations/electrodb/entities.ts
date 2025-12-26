import { Entity, type EntityConfiguration, Service } from 'electrodb';
import { getDdbDocClient } from '#src/webapp/integrations/ddb-client/ddbClient.ts';

// =============================================================================
// Table Configuration
// =============================================================================

const TABLE_NAME = process.env.DDB_PERSONS_TABLE_NAME ?? 'TanstackAwsStack-db-persons';

const getEntityConfig = (): EntityConfiguration => ({
  client: getDdbDocClient(),
  table: TABLE_NAME,
});

// =============================================================================
// Person Entity
// =============================================================================

export const PersonEntity = new Entity(
  {
    model: {
      entity: 'Person',
      version: '1',
      service: 'persons',
    },
    attributes: {
      id: { type: 'string', required: true },
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
      dateOfBirth: { type: 'string' },
      gender: { type: ['male', 'female', 'other', 'prefer_not_to_say'] as const },
      createdAt: { type: 'string', required: true },
      updatedAt: { type: 'string', required: true },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['id'] },
        sk: { field: 'sk', composite: [] },
      },
      // GSI1: List all persons
      allPersons: {
        index: 'GSI1',
        pk: { field: 'gsi1pk', composite: [], template: 'PERSONS' },
        sk: { field: 'gsi1sk', composite: ['lastName', 'firstName', 'id'] },
      },
      // GSI2: Fetch all entities for Orama
      allData: {
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// Address Entity
// =============================================================================

export const AddressEntity = new Entity(
  {
    model: {
      entity: 'Address',
      version: '1',
      service: 'persons',
    },
    attributes: {
      id: { type: 'string', required: true },
      personId: { type: 'string', required: true },
      type: { type: ['home', 'work', 'billing', 'shipping'] as const, required: true },
      street: { type: 'string', required: true },
      city: { type: 'string', required: true },
      state: { type: 'string', required: true },
      postalCode: { type: 'string', required: true },
      country: { type: 'string', required: true },
      isPrimary: { type: 'boolean', default: false },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
      },
      // GSI2: Fetch all entities for Orama
      allData: {
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId', 'id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// BankAccount Entity
// =============================================================================

export const BankAccountEntity = new Entity(
  {
    model: {
      entity: 'BankAccount',
      version: '1',
      service: 'persons',
    },
    attributes: {
      id: { type: 'string', required: true },
      personId: { type: 'string', required: true },
      bankName: { type: 'string', required: true },
      accountType: { type: ['checking', 'savings', 'investment'] as const, required: true },
      accountNumberLast4: { type: 'string', required: true },
      iban: { type: 'string' },
      bic: { type: 'string' },
      isPrimary: { type: 'boolean', default: false },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
      },
      // GSI2: Fetch all entities for Orama
      allData: {
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId', 'id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// ContactInfo Entity
// =============================================================================

export const ContactInfoEntity = new Entity(
  {
    model: {
      entity: 'ContactInfo',
      version: '1',
      service: 'persons',
    },
    attributes: {
      id: { type: 'string', required: true },
      personId: { type: 'string', required: true },
      type: { type: ['email', 'phone', 'mobile', 'linkedin', 'twitter'] as const, required: true },
      value: { type: 'string', required: true },
      isPrimary: { type: 'boolean', default: false },
      isVerified: { type: 'boolean', default: false },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
      },
      // GSI2: Fetch all entities for Orama
      allData: {
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId', 'id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// Employment Entity
// =============================================================================

export const EmploymentEntity = new Entity(
  {
    model: {
      entity: 'Employment',
      version: '1',
      service: 'persons',
    },
    attributes: {
      id: { type: 'string', required: true },
      personId: { type: 'string', required: true },
      companyName: { type: 'string', required: true },
      position: { type: 'string', required: true },
      department: { type: 'string' },
      startDate: { type: 'string', required: true },
      endDate: { type: 'string' },
      isCurrent: { type: 'boolean', default: false },
      salary: { type: 'number' },
      currency: { type: 'string', default: 'USD' },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
      },
      // GSI2: Fetch all entities for Orama
      allData: {
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId', 'id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// Persons Service - Collection Queries
// =============================================================================

export const PersonsService = new Service(
  {
    person: PersonEntity,
    address: AddressEntity,
    bankAccount: BankAccountEntity,
    contactInfo: ContactInfoEntity,
    employment: EmploymentEntity,
  },
  getEntityConfig(),
);

// =============================================================================
// Type Exports
// =============================================================================

export type PersonEntityType = typeof PersonEntity;
export type AddressEntityType = typeof AddressEntity;
export type BankAccountEntityType = typeof BankAccountEntity;
export type ContactInfoEntityType = typeof ContactInfoEntity;
export type EmploymentEntityType = typeof EmploymentEntity;

// ElectroDB inferred types
export type PersonItem = ReturnType<typeof PersonEntity.parse>;
export type AddressItem = ReturnType<typeof AddressEntity.parse>;
export type BankAccountItem = ReturnType<typeof BankAccountEntity.parse>;
export type ContactInfoItem = ReturnType<typeof ContactInfoEntity.parse>;
export type EmploymentItem = ReturnType<typeof EmploymentEntity.parse>;
