#!/usr/bin/env node
/* oxlint-disable no-console, no-await-in-loop, no-magic-numbers */
/**
 * Seed Script for DB Persons
 *
 * Populates the DynamoDB Persons table with fake data.
 * Uses ElectroDB client and faker data generators.
 *
 * Usage:
 *   pnpm seed:persons
 *   pnpm seed:persons 100     # Seed 100 persons
 *   pnpm seed:persons --clear # Clear existing data first
 */

import type { ContactInfo, Employment, PersonWithRelations } from '#src/webapp/types/person.ts';
import { generatePersons, initFaker } from '#src/webapp/data/fake-persons.ts';
import {
  createAddress,
  createBankAccount,
  createContact,
  createEmployment,
  createPerson,
  deletePerson,
  getAllPersons,
} from '#src/webapp/integrations/electrodb/personsClient.ts';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_COUNT = 50;
const BATCH_SIZE = 10;
const LOG_INTERVAL = 10;

// =============================================================================
// Helpers
// =============================================================================

const normalizeContactInfo = (
  contact: ContactInfo,
): Omit<ContactInfo, 'isVerified'> & { isVerified: boolean } => ({
  ...contact,
  isVerified: contact.isVerified ?? false,
});

const normalizeEmployment = (
  employment: Employment,
): Omit<Employment, 'endDate'> & { endDate: string | undefined } => ({
  ...employment,
  endDate: employment.endDate ?? undefined,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =============================================================================
// Seed Functions
// =============================================================================

const seedOnePerson = async (personData: PersonWithRelations): Promise<void> => {
  // Create the person
  await createPerson({
    id: personData.id,
    firstName: personData.firstName,
    lastName: personData.lastName,
    dateOfBirth: personData.dateOfBirth,
    gender: personData.gender,
    createdAt: personData.createdAt,
    updatedAt: personData.updatedAt,
  });

  // Create related entities in parallel
  await Promise.all([
    ...personData.addresses.map((addr) => createAddress(addr)),
    ...personData.bankAccounts.map((bank) => createBankAccount(bank)),
    ...personData.contacts.map((contact) => createContact(normalizeContactInfo(contact))),
    ...personData.employments.map((emp) => createEmployment(normalizeEmployment(emp))),
  ]);
};

const seedPersonsBatch = async (persons: PersonWithRelations[]): Promise<number> => {
  let successCount = 0;

  for (const person of persons) {
    try {
      await seedOnePerson(person);
      successCount++;
    } catch (error) {
      console.error(`Failed to seed person ${person.id}:`, error);
    }
  }

  return successCount;
};

const clearAllPersons = async (): Promise<number> => {
  console.log('Clearing existing persons...');

  const existingPersons = await getAllPersons();
  let deletedCount = 0;

  for (const person of existingPersons) {
    try {
      await deletePerson(person.id);
      deletedCount++;
      if (deletedCount % LOG_INTERVAL === 0) {
        console.log(`  Deleted ${deletedCount}/${existingPersons.length} persons...`);
      }
    } catch (error) {
      console.error(`Failed to delete person ${person.id}:`, error);
    }
  }

  console.log(`Cleared ${deletedCount} persons`);
  return deletedCount;
};

// =============================================================================
// Main
// =============================================================================

const main = async () => {
  // Parse arguments
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const countArg = args.find((arg) => !arg.startsWith('--'));
  let count = DEFAULT_COUNT;
  if (countArg) {
    count = parseInt(countArg, 10);
  }

  console.log('='.repeat(60));
  console.log('DB Persons Seed Script');
  console.log('='.repeat(60));

  // Check for table name
  const tableName = process.env.DDB_PERSONS_TABLE_NAME;
  if (!tableName) {
    console.error('Error: DDB_PERSONS_TABLE_NAME environment variable not set');
    console.log('\nRun: export DDB_PERSONS_TABLE_NAME=<your-table-name>');
    process.exit(1);
  }
  console.log(`Table: ${tableName}`);

  // Clear if requested
  if (shouldClear) {
    await clearAllPersons();
    console.log('');
  }

  // Generate fake data
  console.log(`Generating ${count} persons...`);
  initFaker();
  const persons = generatePersons(count);
  console.log(`Generated ${persons.length} persons with relations`);

  // Seed in batches
  console.log(`\nSeeding in batches of ${BATCH_SIZE}...`);
  let totalSeeded = 0;

  for (let idx = 0; idx < persons.length; idx += BATCH_SIZE) {
    const batch = persons.slice(idx, idx + BATCH_SIZE);
    const seeded = await seedPersonsBatch(batch);
    totalSeeded += seeded;

    console.log(`  Seeded ${totalSeeded}/${persons.length} persons...`);

    // Small delay to avoid throttling
    await sleep(100);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Seed Complete: ${totalSeeded} persons created`);
  console.log('='.repeat(60));
};

main().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
