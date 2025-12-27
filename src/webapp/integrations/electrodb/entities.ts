import { getDdbDocClient } from '#src/webapp/integrations/ddb-client/ddbClient.ts';
import { zodToElectroDBAttributes } from '#src/webapp/integrations/electrodb/zod-to-electrodb.ts';
import {
  AddressSchema,
  BankAccountSchema,
  ContactInfoSchema,
  EmploymentSchema,
  PersonSchema,
} from '#src/webapp/types/person.ts';
import { Entity, type EntityConfiguration, Service } from 'electrodb';

// =============================================================================
// Table Configuration
// =============================================================================

const TABLE_NAME = process.env.DDB_PERSONS_TABLE_NAME ?? 'TanstackAwsStack-db-persons';

const getEntityConfig = (): EntityConfiguration => ({
  client: getDdbDocClient(),
  table: TABLE_NAME,
});

// =============================================================================
// Derived ElectroDB Attributes from Zod Schemas (Single Source of Truth)
// =============================================================================

const personAttributes = zodToElectroDBAttributes(PersonSchema);
const addressAttributes = zodToElectroDBAttributes(AddressSchema);
const bankAccountAttributes = zodToElectroDBAttributes(BankAccountSchema);
const contactInfoAttributes = zodToElectroDBAttributes(ContactInfoSchema);
const employmentAttributes = zodToElectroDBAttributes(EmploymentSchema);

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
    attributes: personAttributes,
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
    attributes: addressAttributes,
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
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
    attributes: bankAccountAttributes,
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
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
    attributes: contactInfoAttributes,
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
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
    attributes: employmentAttributes,
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['personId'] },
        sk: { field: 'sk', composite: ['id'] },
      },
    },
  },
  getEntityConfig(),
);

// =============================================================================
// Persons Service - Collection Queries
// =============================================================================

new Service(
  {
    person: PersonEntity,
    address: AddressEntity,
    bankAccount: BankAccountEntity,
    contactInfo: ContactInfoEntity,
    employment: EmploymentEntity,
  },
  getEntityConfig(),
);
