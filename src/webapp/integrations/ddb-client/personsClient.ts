import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  type Person,
  type Address,
  type BankAccount,
  type ContactInfo,
  type Employment,
  type PersonWithRelations,
  DynamoDBKeys,
  PersonSchema,
  AddressSchema,
  BankAccountSchema,
  ContactInfoSchema,
  EmploymentSchema,
} from '#src/webapp/types/person';
import { getDdbDocClient, requireEnvVar } from './ddbClient';

// =============================================================================
// Constants
// =============================================================================

const PERSONS_TABLE_ENV = 'DDB_PERSONS_TABLE_NAME';
const MAX_BATCH_WRITE_ITEMS = 25;
const MAX_RETRY_ATTEMPTS = 3;
const GSI1_INDEX_NAME = 'GSI1';

export const getPersonsTableName = (): string => requireEnvVar(PERSONS_TABLE_ENV);

// =============================================================================
// Helper Functions
// =============================================================================

const chunkItems = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

// =============================================================================
// Person CRUD
// =============================================================================

/**
 * Get all persons (using GSI1)
 */
export async function getAllPersons(): Promise<Person[]> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();
  const persons: Person[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: GSI1_INDEX_NAME,
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'PERSONS',
        },
        ExclusiveStartKey: lastKey,
      }),
    );

    if (result.Items) {
      for (const item of result.Items) {
        const personId = DynamoDBKeys.extractPersonId(item.pk as string);
        const parsed = PersonSchema.safeParse({
          id: personId,
          firstName: item.firstName,
          lastName: item.lastName,
          dateOfBirth: item.dateOfBirth,
          gender: item.gender,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
        if (parsed.success) {
          persons.push(parsed.data);
        }
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return persons;
}

/**
 * Get a person by ID (profile only)
 */
export async function getPersonById(personId: string): Promise<Person | null> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.person.pk(personId),
        sk: DynamoDBKeys.person.sk(),
      },
    }),
  );

  if (!result.Item) return null;

  const parsed = PersonSchema.safeParse({
    id: personId,
    firstName: result.Item.firstName,
    lastName: result.Item.lastName,
    dateOfBirth: result.Item.dateOfBirth,
    gender: result.Item.gender,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Get a person with all related entities
 */
export async function getPersonWithRelations(
  personId: string,
): Promise<PersonWithRelations | null> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) return null;

  let person: Person | null = null;
  const addresses: Address[] = [];
  const bankAccounts: BankAccount[] = [];
  const contacts: ContactInfo[] = [];
  const employments: Employment[] = [];

  for (const item of result.Items) {
    const entityType = item.entityType as string;

    switch (entityType) {
      case 'PERSON': {
        const parsed = PersonSchema.safeParse({
          id: personId,
          firstName: item.firstName,
          lastName: item.lastName,
          dateOfBirth: item.dateOfBirth,
          gender: item.gender,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
        if (parsed.success) person = parsed.data;
        break;
      }
      case 'ADDRESS': {
        const addressId = DynamoDBKeys.extractAddressId(item.sk as string);
        const parsed = AddressSchema.safeParse({
          id: addressId,
          personId,
          type: item.type,
          street: item.street,
          city: item.city,
          state: item.state,
          postalCode: item.postalCode,
          country: item.country,
          isPrimary: item.isPrimary,
        });
        if (parsed.success) addresses.push(parsed.data);
        break;
      }
      case 'BANK': {
        const bankId = DynamoDBKeys.extractBankId(item.sk as string);
        const parsed = BankAccountSchema.safeParse({
          id: bankId,
          personId,
          bankName: item.bankName,
          accountType: item.accountType,
          accountNumberLast4: item.accountNumberLast4,
          iban: item.iban,
          bic: item.bic,
          isPrimary: item.isPrimary,
        });
        if (parsed.success) bankAccounts.push(parsed.data);
        break;
      }
      case 'CONTACT': {
        const contactId = DynamoDBKeys.extractContactId(item.sk as string);
        const parsed = ContactInfoSchema.safeParse({
          id: contactId,
          personId,
          type: item.type,
          value: item.value,
          isPrimary: item.isPrimary,
          isVerified: item.isVerified,
        });
        if (parsed.success) contacts.push(parsed.data);
        break;
      }
      case 'EMPLOYMENT': {
        const employmentId = DynamoDBKeys.extractEmploymentId(item.sk as string);
        const parsed = EmploymentSchema.safeParse({
          id: employmentId,
          personId,
          companyName: item.companyName,
          position: item.position,
          department: item.department,
          startDate: item.startDate,
          endDate: item.endDate,
          isCurrent: item.isCurrent,
          salary: item.salary,
          currency: item.currency,
        });
        if (parsed.success) employments.push(parsed.data);
        break;
      }
    }
  }

  if (!person) return null;

  return {
    ...person,
    addresses,
    bankAccounts,
    contacts,
    employments,
  };
}

/**
 * Create a new person
 */
export async function createPerson(person: Person): Promise<Person> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.person.pk(person.id),
        sk: DynamoDBKeys.person.sk(),
        gsi1pk: DynamoDBKeys.person.gsi1pk(),
        gsi1sk: DynamoDBKeys.person.gsi1sk(person.id),
        entityType: 'PERSON',
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: person.dateOfBirth,
        gender: person.gender,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      },
    }),
  );

  return person;
}

/**
 * Update a person
 */
export async function updatePerson(
  personId: string,
  updates: Partial<Person>,
): Promise<Person | null> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };

  if (updates.firstName !== undefined) {
    updateExpressions.push('#firstName = :firstName');
    expressionAttributeNames['#firstName'] = 'firstName';
    expressionAttributeValues[':firstName'] = updates.firstName;
  }
  if (updates.lastName !== undefined) {
    updateExpressions.push('#lastName = :lastName');
    expressionAttributeNames['#lastName'] = 'lastName';
    expressionAttributeValues[':lastName'] = updates.lastName;
  }
  if (updates.dateOfBirth !== undefined) {
    updateExpressions.push('#dateOfBirth = :dateOfBirth');
    expressionAttributeNames['#dateOfBirth'] = 'dateOfBirth';
    expressionAttributeValues[':dateOfBirth'] = updates.dateOfBirth;
  }
  if (updates.gender !== undefined) {
    updateExpressions.push('#gender = :gender');
    expressionAttributeNames['#gender'] = 'gender';
    expressionAttributeValues[':gender'] = updates.gender;
  }

  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.person.pk(personId),
        sk: DynamoDBKeys.person.sk(),
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (!result.Attributes) return null;

  const parsed = PersonSchema.safeParse({
    id: personId,
    firstName: result.Attributes.firstName,
    lastName: result.Attributes.lastName,
    dateOfBirth: result.Attributes.dateOfBirth,
    gender: result.Attributes.gender,
    createdAt: result.Attributes.createdAt,
    updatedAt: result.Attributes.updatedAt,
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Delete a person and all related entities
 */
export async function deletePerson(personId: string): Promise<boolean> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  // First, get all items for this person
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
      },
      ProjectionExpression: 'pk, sk',
    }),
  );

  if (!result.Items || result.Items.length === 0) return false;

  // Delete all items in batches
  const deleteRequests = result.Items.map((item) => ({
    DeleteRequest: {
      Key: {
        pk: item.pk,
        sk: item.sk,
      },
    },
  }));

  const chunks = chunkItems(deleteRequests, MAX_BATCH_WRITE_ITEMS);

  for (const chunk of chunks) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk,
        },
      }),
    );
  }

  return true;
}

// =============================================================================
// Address CRUD
// =============================================================================

export async function getAddressesByPersonId(personId: string): Promise<Address[]> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
        ':skPrefix': 'ADDRESS#',
      },
    }),
  );

  const addresses: Address[] = [];
  if (result.Items) {
    for (const item of result.Items) {
      const addressId = DynamoDBKeys.extractAddressId(item.sk as string);
      const parsed = AddressSchema.safeParse({
        id: addressId,
        personId,
        type: item.type,
        street: item.street,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        country: item.country,
        isPrimary: item.isPrimary,
      });
      if (parsed.success) addresses.push(parsed.data);
    }
  }

  return addresses;
}

export async function createAddress(address: Address): Promise<Address> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.address.pk(address.personId),
        sk: DynamoDBKeys.address.sk(address.id),
        entityType: 'ADDRESS',
        type: address.type,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isPrimary: address.isPrimary,
      },
    }),
  );

  return address;
}

export async function updateAddress(address: Address): Promise<Address> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.address.pk(address.personId),
        sk: DynamoDBKeys.address.sk(address.id),
        entityType: 'ADDRESS',
        type: address.type,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isPrimary: address.isPrimary,
      },
    }),
  );

  return address;
}

export async function deleteAddress(personId: string, addressId: string): Promise<boolean> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.address.pk(personId),
        sk: DynamoDBKeys.address.sk(addressId),
      },
    }),
  );

  return true;
}

// =============================================================================
// BankAccount CRUD
// =============================================================================

export async function getBankAccountsByPersonId(personId: string): Promise<BankAccount[]> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
        ':skPrefix': 'BANK#',
      },
    }),
  );

  const accounts: BankAccount[] = [];
  if (result.Items) {
    for (const item of result.Items) {
      const bankId = DynamoDBKeys.extractBankId(item.sk as string);
      const parsed = BankAccountSchema.safeParse({
        id: bankId,
        personId,
        bankName: item.bankName,
        accountType: item.accountType,
        accountNumberLast4: item.accountNumberLast4,
        iban: item.iban,
        bic: item.bic,
        isPrimary: item.isPrimary,
      });
      if (parsed.success) accounts.push(parsed.data);
    }
  }

  return accounts;
}

export async function createBankAccount(account: BankAccount): Promise<BankAccount> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.bankAccount.pk(account.personId),
        sk: DynamoDBKeys.bankAccount.sk(account.id),
        entityType: 'BANK',
        bankName: account.bankName,
        accountType: account.accountType,
        accountNumberLast4: account.accountNumberLast4,
        iban: account.iban,
        bic: account.bic,
        isPrimary: account.isPrimary,
      },
    }),
  );

  return account;
}

export async function updateBankAccount(account: BankAccount): Promise<BankAccount> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.bankAccount.pk(account.personId),
        sk: DynamoDBKeys.bankAccount.sk(account.id),
        entityType: 'BANK',
        bankName: account.bankName,
        accountType: account.accountType,
        accountNumberLast4: account.accountNumberLast4,
        iban: account.iban,
        bic: account.bic,
        isPrimary: account.isPrimary,
      },
    }),
  );

  return account;
}

export async function deleteBankAccount(personId: string, bankId: string): Promise<boolean> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.bankAccount.pk(personId),
        sk: DynamoDBKeys.bankAccount.sk(bankId),
      },
    }),
  );

  return true;
}

// =============================================================================
// ContactInfo CRUD
// =============================================================================

export async function getContactsByPersonId(personId: string): Promise<ContactInfo[]> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
        ':skPrefix': 'CONTACT#',
      },
    }),
  );

  const contacts: ContactInfo[] = [];
  if (result.Items) {
    for (const item of result.Items) {
      const contactId = DynamoDBKeys.extractContactId(item.sk as string);
      const parsed = ContactInfoSchema.safeParse({
        id: contactId,
        personId,
        type: item.type,
        value: item.value,
        isPrimary: item.isPrimary,
        isVerified: item.isVerified,
      });
      if (parsed.success) contacts.push(parsed.data);
    }
  }

  return contacts;
}

export async function createContactInfo(contact: ContactInfo): Promise<ContactInfo> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.contactInfo.pk(contact.personId),
        sk: DynamoDBKeys.contactInfo.sk(contact.id),
        entityType: 'CONTACT',
        type: contact.type,
        value: contact.value,
        isPrimary: contact.isPrimary,
        isVerified: contact.isVerified,
      },
    }),
  );

  return contact;
}

export async function updateContactInfo(contact: ContactInfo): Promise<ContactInfo> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.contactInfo.pk(contact.personId),
        sk: DynamoDBKeys.contactInfo.sk(contact.id),
        entityType: 'CONTACT',
        type: contact.type,
        value: contact.value,
        isPrimary: contact.isPrimary,
        isVerified: contact.isVerified,
      },
    }),
  );

  return contact;
}

export async function deleteContactInfo(personId: string, contactId: string): Promise<boolean> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.contactInfo.pk(personId),
        sk: DynamoDBKeys.contactInfo.sk(contactId),
      },
    }),
  );

  return true;
}

// =============================================================================
// Employment CRUD
// =============================================================================

export async function getEmploymentsByPersonId(personId: string): Promise<Employment[]> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': DynamoDBKeys.person.pk(personId),
        ':skPrefix': 'EMPLOYMENT#',
      },
    }),
  );

  const employments: Employment[] = [];
  if (result.Items) {
    for (const item of result.Items) {
      const employmentId = DynamoDBKeys.extractEmploymentId(item.sk as string);
      const parsed = EmploymentSchema.safeParse({
        id: employmentId,
        personId,
        companyName: item.companyName,
        position: item.position,
        department: item.department,
        startDate: item.startDate,
        endDate: item.endDate,
        isCurrent: item.isCurrent,
        salary: item.salary,
        currency: item.currency,
      });
      if (parsed.success) employments.push(parsed.data);
    }
  }

  return employments;
}

export async function createEmployment(employment: Employment): Promise<Employment> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.employment.pk(employment.personId),
        sk: DynamoDBKeys.employment.sk(employment.id),
        entityType: 'EMPLOYMENT',
        companyName: employment.companyName,
        position: employment.position,
        department: employment.department,
        startDate: employment.startDate,
        endDate: employment.endDate,
        isCurrent: employment.isCurrent,
        salary: employment.salary,
        currency: employment.currency,
      },
    }),
  );

  return employment;
}

export async function updateEmployment(employment: Employment): Promise<Employment> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: DynamoDBKeys.employment.pk(employment.personId),
        sk: DynamoDBKeys.employment.sk(employment.id),
        entityType: 'EMPLOYMENT',
        companyName: employment.companyName,
        position: employment.position,
        department: employment.department,
        startDate: employment.startDate,
        endDate: employment.endDate,
        isCurrent: employment.isCurrent,
        salary: employment.salary,
        currency: employment.currency,
      },
    }),
  );

  return employment;
}

export async function deleteEmployment(personId: string, employmentId: string): Promise<boolean> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: DynamoDBKeys.employment.pk(personId),
        sk: DynamoDBKeys.employment.sk(employmentId),
      },
    }),
  );

  return true;
}

// =============================================================================
// Batch Operations (for seeding)
// =============================================================================

/**
 * Batch write persons with all related entities
 */
export async function batchWritePersons(persons: PersonWithRelations[]): Promise<void> {
  const ddb = getDdbDocClient();
  const tableName = getPersonsTableName();

  // Flatten all items to write
  const allItems: Record<string, unknown>[] = [];

  for (const person of persons) {
    // Person item
    allItems.push({
      pk: DynamoDBKeys.person.pk(person.id),
      sk: DynamoDBKeys.person.sk(),
      gsi1pk: DynamoDBKeys.person.gsi1pk(),
      gsi1sk: DynamoDBKeys.person.gsi1sk(person.id),
      entityType: 'PERSON',
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: person.dateOfBirth,
      gender: person.gender,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });

    // Address items
    for (const address of person.addresses) {
      allItems.push({
        pk: DynamoDBKeys.address.pk(person.id),
        sk: DynamoDBKeys.address.sk(address.id),
        entityType: 'ADDRESS',
        type: address.type,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isPrimary: address.isPrimary,
      });
    }

    // Bank account items
    for (const account of person.bankAccounts) {
      allItems.push({
        pk: DynamoDBKeys.bankAccount.pk(person.id),
        sk: DynamoDBKeys.bankAccount.sk(account.id),
        entityType: 'BANK',
        bankName: account.bankName,
        accountType: account.accountType,
        accountNumberLast4: account.accountNumberLast4,
        iban: account.iban,
        bic: account.bic,
        isPrimary: account.isPrimary,
      });
    }

    // Contact items
    for (const contact of person.contacts) {
      allItems.push({
        pk: DynamoDBKeys.contactInfo.pk(person.id),
        sk: DynamoDBKeys.contactInfo.sk(contact.id),
        entityType: 'CONTACT',
        type: contact.type,
        value: contact.value,
        isPrimary: contact.isPrimary,
        isVerified: contact.isVerified,
      });
    }

    // Employment items
    for (const employment of person.employments) {
      allItems.push({
        pk: DynamoDBKeys.employment.pk(person.id),
        sk: DynamoDBKeys.employment.sk(employment.id),
        entityType: 'EMPLOYMENT',
        companyName: employment.companyName,
        position: employment.position,
        department: employment.department,
        startDate: employment.startDate,
        endDate: employment.endDate,
        isCurrent: employment.isCurrent,
        salary: employment.salary,
        currency: employment.currency,
      });
    }
  }

  // Write in batches
  const chunks = chunkItems(allItems, MAX_BATCH_WRITE_ITEMS);

  for (const chunk of chunks) {
    let attempt = 0;
    let unprocessedItems = chunk;

    while (unprocessedItems.length > 0 && attempt < MAX_RETRY_ATTEMPTS) {
      const result = await ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: unprocessedItems.map((item) => ({
              PutRequest: { Item: item },
            })),
          },
        }),
      );

      const unprocessed = result.UnprocessedItems?.[tableName];
      if (unprocessed && unprocessed.length > 0) {
        unprocessedItems = unprocessed.map(
          (req) => req.PutRequest?.Item as Record<string, unknown>,
        );
        attempt++;
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      } else {
        unprocessedItems = [];
      }
    }
  }
}
