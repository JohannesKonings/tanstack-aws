# Plan: DB Persons Feature with Multi-Entity Architecture

## Overview

This document outlines the implementation plan for a "DB Persons" feature similar to the existing "DB Todo" but with a more complex multi-entity data model. The feature will manage persons with related entities like addresses and banking data using DynamoDB single-table design **powered by ElectroDB**.

This is a **simple multi-entity example** focused on basic CRUD operations with TanStack DB and ElectroDB. Search functionality is postponed to a future branch.

**Key Design Decision:** ElectroDB schemas are **derived from Zod schemas** to ensure a single source of truth. When Zod schemas are updated, ElectroDB entities automatically reflect those changes.

---

## Status Update

### Completed

- ✅ Collections + server functions for persons and related entities
- ✅ React hooks `useDbPersons.ts` with CRUD mutations and live queries
- ✅ UI CRUD for persons, addresses, contacts, bank accounts, employment via modals
- ✅ Person detail panel, edit modal, and create person modal
- ✅ Adjusted code to comply with strict oxlint rules

### Latest Updates (TanStack DB 0.5 Optimization)

**Implemented TanStack DB 0.5 patterns for improved performance:**

1. **Global Collections Architecture**
   - Converted factory-based per-person collections to global collections
   - All entities (addresses, bank accounts, contacts, employments) now use single global collections
   - Enables instant sub-millisecond navigation between person details (no network requests)
   - Leverages TanStack DB's differential dataflow for efficient updates

2. **GSI1 Multi-Entity Pattern**
   - Single GSI1 serves ALL entity types with different partition key templates
   - Eliminates need for GSI2 - simpler infrastructure, lower costs
   - Each entity type has its own `gsi1pk` template value for clean separation

3. **Query-Driven Data Loading**
   - Uses `useLiveQuery` with `eq()` predicates for client-side filtering
   - Data loaded once at app startup, queries run in <1ms client-side
   - Benefits from TanStack DB's normalized collection store

### Remaining Tasks

- Refine statement counts in route components if flagged by linter
- Document search/indexing phase (postponed)

## 1. Data Model Design

### 1.1 Entity Types

| Entity          | Description                           | Relationship    |
| --------------- | ------------------------------------- | --------------- |
| **Person**      | Core entity with personal information | Root entity     |
| **Address**     | Physical/mailing addresses            | 1:N with Person |
| **BankAccount** | Banking information                   | 1:N with Person |
| **ContactInfo** | Email, phone, social media            | 1:N with Person |
| **Employment**  | Job history and current employment    | 1:N with Person |

### 1.2 Entity Schemas (TypeScript/Zod)

```typescript
// Person
{
  id: string; // UUID
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  createdAt: string;
  updatedAt: string;
}

// Address
{
  id: string; // UUID
  personId: string; // FK to Person
  type: 'home' | 'work' | 'billing' | 'shipping';
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

// BankAccount
{
  id: string; // UUID
  personId: string; // FK to Person
  bankName: string;
  accountType: 'checking' | 'savings' | 'investment';
  accountNumberLast4: string; // Only store last 4 digits
  iban: string; // International Bank Account Number
  bic: string; // Bank Identifier Code
  isPrimary: boolean;
}

// ContactInfo
{
  id: string; // UUID
  personId: string; // FK to Person
  type: 'email' | 'phone' | 'mobile' | 'linkedin' | 'twitter';
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
}

// Employment
{
  id: string; // UUID
  personId: string; // FK to Person
  companyName: string;
  position: string;
  department: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  salary: number;
  currency: string;
}
```

---

## 2. DynamoDB Single-Table Design

### 2.1 Key Structure

| Entity      | PK                  | SK                          | Purpose                     |
| ----------- | ------------------- | --------------------------- | --------------------------- |
| Person      | `PERSON#<personId>` | `PROFILE`                   | Person profile data         |
| Address     | `PERSON#<personId>` | `ADDRESS#<addressId>`       | Person's addresses          |
| BankAccount | `PERSON#<personId>` | `BANK#<bankId>`             | Person's bank accounts      |
| ContactInfo | `PERSON#<personId>` | `CONTACT#<contactId>`       | Person's contact info       |
| Employment  | `PERSON#<personId>` | `EMPLOYMENT#<employmentId>` | Person's employment history |

### 2.2 Access Patterns

| Access Pattern             | Key Condition                               | Description                                          |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Get all persons            | GSI1: `gsi1pk = PERSONS`                    | List all persons (sorted by name)                    |
| Get all addresses          | GSI1: `gsi1pk = ADDRESSES`                  | List all addresses (for global collection)           |
| Get all bank accounts      | GSI1: `gsi1pk = BANKACCOUNTS`               | List all bank accounts (for global collection)       |
| Get all contacts           | GSI1: `gsi1pk = CONTACTS`                   | List all contacts (for global collection)            |
| Get all employments        | GSI1: `gsi1pk = EMPLOYMENTS`                | List all employments (for global collection)         |
| Get person by ID           | `pk = PERSON#<id>, sk = PROFILE`            | Single person lookup                                 |
| Get person with all data   | `pk = PERSON#<id>`                          | Get person + all related entities (collection query) |
| Get person's addresses     | `pk = PERSON#<id>, sk begins_with ADDRESS#` | All addresses for a person                           |
| Get person's bank accounts | `pk = PERSON#<id>, sk begins_with BANK#`    | All bank accounts for a person                       |

### 2.3 Global Secondary Indexes

**GSI1: Multi-Entity Type Index**

GSI1 is shared by ALL entity types using different partition key templates. This single GSI handles all "get all entities of type X" queries efficiently without table scans.

| Entity      | gsi1pk Template | gsi1sk                  | Query Method                                  |
| ----------- | --------------- | ----------------------- | --------------------------------------------- |
| Person      | `PERSONS`       | `lastName#firstName#id` | `PersonEntity.query.allPersons({})`           |
| Address     | `ADDRESSES`     | `personId#id`           | `AddressEntity.query.allAddresses({})`        |
| BankAccount | `BANKACCOUNTS`  | `personId#id`           | `BankAccountEntity.query.allBankAccounts({})` |
| ContactInfo | `CONTACTS`      | `personId#id`           | `ContactInfoEntity.query.allContacts({})`     |
| Employment  | `EMPLOYMENTS`   | `personId#id`           | `EmploymentEntity.query.allEmployments({})`   |

**Benefits of Single GSI1 for All Entities:**

- ✅ **No scans** - Each entity type query uses an efficient Query operation
- ✅ **Single GSI** - Reduces infrastructure complexity and costs (no GSI2 needed)
- ✅ **Template-based partitioning** - Clean separation by entity type
- ✅ **ElectroDB auto-populates** - gsi1pk/gsi1sk populated automatically on write

**CDK Configuration:**

```typescript
this.dbPersons.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'gsi1pk', type: AttributeType.STRING },
  sortKey: { name: 'gsi1sk', type: AttributeType.STRING },
  projectionType: ProjectionType.ALL,
});
```

**Note:** GSI2 was previously planned for search functionality but is no longer needed. The GSI1 multi-entity pattern handles all current access patterns efficiently.

---

## 2.4 TanStack DB Global Collections Architecture

Based on [TanStack DB 0.5 Query-Driven Sync](https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync) patterns.

### Why Global Collections vs Per-Entity Factory Collections?

**Previous Approach (Factory Collections):**

```typescript
// Created new collection for each personId - problematic
const createAddressesCollection = (personId: string) =>
  createCollection({
    queryKey: ['persons', personId, 'addresses'],
    queryFn: () => fetchAddresses(personId),
  });
```

**Current Approach (Global Collections):**

```typescript
// Single global collection - efficient
export const addressesCollection = createCollection({
  queryKey: ['addresses'],
  queryFn: () => fetchAllAddresses(), // Uses GSI1: gsi1pk = 'ADDRESSES'
});
```

### Performance Comparison

| Metric                          | Factory Collections       | Global Collections        |
| ------------------------------- | ------------------------- | ------------------------- |
| Network requests per navigation | 4-5 (one per entity type) | 0 (data already loaded)   |
| Time to show person details     | 100-500ms                 | <1ms                      |
| Memory efficiency               | Duplicate data per person | Normalized, shared data   |
| Cache reuse                     | None                      | Full TanStack Query cache |

### Hook Implementation Pattern

```typescript
export function usePersonDetail(personId: string) {
  // All queries run against pre-loaded global collections
  // TanStack DB's differential dataflow handles filtering in <1ms

  const personQuery = useLiveQuery(
    (q) => q.from({ persons: personsCollection }).where(({ persons }) => eq(persons.id, personId)),
    [personId],
  );

  const addressesQuery = useLiveQuery(
    (q) =>
      q
        .from({ addresses: addressesCollection })
        .where(({ addresses }) => eq(addresses.personId, personId)),
    [personId],
  );

  // Mutations still work - they update the global collection
  // and TanStack DB automatically updates all affected queries
  const addAddress = (address) => {
    addressesCollection.insert({ ...address, personId });
  };
}
```

### When to Use Global vs On-Demand Collections

| Data Size    | Recommended Mode | Reason                                        |
| ------------ | ---------------- | --------------------------------------------- |
| < 10k rows   | Eager (global)   | Load everything upfront, instant queries      |
| 10k-50k rows | Progressive      | Fast first paint, background sync             |
| > 50k rows   | On-demand        | Query-driven loading with predicate push-down |

Our persons example uses **Eager mode** since typical datasets are well under 10k entities.

---

## 3. Implementation Tasks

### Phase 1: Types & Fake Data Generation

#### 3.1 Create Type Definitions

- [ ] Create `/src/webapp/types/person.ts` with all entity schemas (Zod)
  - PersonSchema
  - AddressSchema
  - BankAccountSchema
  - ContactInfoSchema
  - EmploymentSchema
  - Combined request/response schemas

#### 3.2 Create Fake Data Generator

- [ ] Create `/src/webapp/data/fake-persons.ts`
  - Use `@faker-js/faker` with seeded random for reproducible data
  - Generate **10,000 fake persons** with related data
  - Each person should have:
    - 1-3 addresses
    - 1-2 bank accounts
    - 2-4 contact infos
    - 1-3 employment records
  - Export both individual entity arrays and combined data structure
  - Use batching for efficient generation

### Phase 2: CDK Infrastructure Updates

#### 3.3 Update Database Construct

- [x] Modify `/lib/constructs/DatabasePersons.ts`
  - Add GSI1 for listing all persons (`gsi1pk`, `gsi1sk`)
  - GSI2 for listing all entities is **postponed** until search implementation
  - Keep existing pk/sk structure

#### 3.4 Update Webapp Construct

- [ ] Modify `/lib/constructs/Webapp.ts`
  - Add `grantReadWriteData` for databasePersons

### Phase 3: ElectroDB Entities (Derived from Zod)

#### 3.5 Create Zod-to-ElectroDB Schema Converter

- [ ] Create `/src/webapp/integrations/electrodb/zod-to-electrodb.ts`
  - Utility to convert Zod schemas to ElectroDB attribute definitions
  - Maps Zod types to ElectroDB types:
    - `z.string()` → `{ type: 'string' }`
    - `z.number()` → `{ type: 'number' }`
    - `z.boolean()` → `{ type: 'boolean' }`
    - `z.enum([...])` → `{ type: [...] as const }`
    - `z.optional()` → no `required: true`
  - Ensures single source of truth: Zod changes → ElectroDB changes

#### 3.6 Create ElectroDB Entities

- [ ] Create `/src/webapp/integrations/electrodb/entities.ts`
  - `PersonEntity` - Person profile entity
  - `AddressEntity` - Address entity with personId composite key
  - `BankAccountEntity` - Bank account entity
  - `ContactInfoEntity` - Contact info entity
  - `EmploymentEntity` - Employment entity
  - All entities share the same table (single-table design)

#### 3.7 Create ElectroDB Service

- [ ] Create `/src/webapp/integrations/electrodb/personsService.ts`
  - Combine all entities into a Service for collection queries
  - Collection: `personData` - Query person with all related entities
  - CRUD operations use ElectroDB's fluent API:
    - `PersonEntity.query.byPerson({ personId }).go()` - Get person
    - `PersonEntity.put(person).go()` - Create/update person
    - `PersonEntity.delete({ personId }).go()` - Delete person
    - `PersonsService.collections.personData({ personId }).go()` - Get all data

### Phase 4: Orama Search + TanStack Pacer

#### 3.6 Create Search Index

### Phase 4: TanStack DB Collections with Server Functions

#### 4.1 Create Server Functions & Collections

- [x] Create `/src/webapp/db-collections/persons.ts`
- Define server functions for DynamoDB operations (co-located with collections)
- personsCollection - Base collection using server functions
- addressesCollection - Addresses collection
- bankAccountsCollection - Bank accounts collection
- contactInfosCollection - Contact info collection
- employmentsCollection - Employment history collection

#### 4.2 Create Live Query Collections for Related Data

- [ ] Create derived collections using `createLiveQueryCollection` for:
  - Filtering addresses by personId
  - Filtering bank accounts by personId
  - Combining person with related entities via joins

#### 4.3 Query Operators Reference

Available operators for filtering (from TanStack DB docs):

```typescript
import { eq, gt, gte, lt, lte, like, ilike, inArray, and, or, not } from '@tanstack/db';

// Examples
eq(user.id, '123'); // Equality
gt(user.age, 18); // Greater than
gte(user.age, 18); // Greater than or equal
lt(user.age, 65); // Less than
lte(user.age, 65); // Less than or equal
like(user.name, 'John%'); // Case-sensitive pattern matching
ilike(user.name, 'john%'); // Case-insensitive pattern matching
inArray(user.id, ['1', '2']); // Array membership

// Logical operators
and(condition1, condition2);
or(condition1, condition2);
not(condition);
```

**Why GSI2 instead of multiple scans?**

- ✅ **1 query** vs 5 separate scans
- ✅ **Sorted by personId** for easy grouping
- ✅ **Efficient pagination** with ElectroDB's `pages: 'all'`
- ✅ **Lower cost** - fewer read operations

#### 3.8 Payload Size Limits & Data Loading Strategy

**⚠️ Critical Issue:** Lambda/API Gateway have payload limits that affect 50k items (~25 MB):

| Service                | Limit     | Our Data (~50k items) |
| ---------------------- | --------- | --------------------- |
| Lambda (sync response) | 6 MB      | ❌ ~25 MB exceeds     |
| Lambda Function URL    | 6 MB      | ❌ ~25 MB exceeds     |
| API Gateway REST/HTTP  | 10 MB     | ❌ ~25 MB exceeds     |
| Lambda Streaming       | Unlimited | ✅ Works              |

**✅ DECIDED: Pagination + Compression (Recommended)**

Fetch data in paginated chunks with gzip compression:

```typescript
// Server function: Fetch paginated + compressed data
const fetchAllDataPaginated = createServerFn({ method: 'GET' })
  .validator(z.object({ cursor: z.string().optional() }))
  .handler(async ({ data }) => {
    const PAGE_SIZE = 1000; // ~500 KB uncompressed per page

    const result = await PersonsService.collections.allData({}).go({
      cursor: data.cursor,
      limit: PAGE_SIZE,
    });

    return {
      data: result.data,
      cursor: result.cursor, // null when done
      hasMore: !!result.cursor,
    };
  });

// Client: Progressive loading with progress indicator
async function loadAllDataForOrama(onProgress: (percent: number) => void) {
  const allData = { person: [], address: [], contactInfo: [], employment: [], bankAccount: [] };
  let cursor: string | undefined;
  let loaded = 0;
  const estimated = 50000; // Estimated total items

  do {
    const {
      data,
      cursor: nextCursor,
      hasMore,
    } = await fetchAllDataPaginated({
      data: { cursor },
    });

    // Merge results
    Object.keys(data).forEach((key) => {
      allData[key].push(...(data[key] || []));
      loaded += data[key]?.length || 0;
    });

    onProgress(Math.min(95, (loaded / estimated) * 100));
    cursor = nextCursor;
  } while (cursor);

  onProgress(100);
  return allData;
}
```

**UI Progress Indicator:**

```tsx
function SearchIndexLoader() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllDataForOrama(setProgress)
      .then(buildOramaIndex)
      .finally(() => setIsLoading(false));
  }, []);

  if (!isLoading) return null;

  return (
    <div className="flex items-center gap-2">
      <Progress value={progress} className="w-48" />
      <span className="text-sm text-muted-foreground">
        Building search index... {Math.round(progress)}%
      </span>
    </div>
  );
}
```

**Benefits of Pagination + Compression:**

- ✅ Each request stays under 6 MB limit (with gzip: ~100 KB per 1000 items)
- ✅ Progressive loading with user-visible progress
- ✅ Works with existing Lambda + TanStack Start setup
- ✅ Resilient to network issues (can resume from cursor)

---

### Future Options (For Production Consideration)

#### Option A: Lambda Response Streaming

For true streaming without pagination overhead:

```typescript
// Requires Lambda function URL with streaming enabled
const fetchAllDataStreaming = createServerFn({ method: 'GET' }).handler(async () => {
  const stream = new ReadableStream({
    async start(controller) {
      let cursor: string | undefined;

      do {
        const { data, cursor: nextCursor } = await PersonsService.collections
          .allData({})
          .go({ cursor, limit: 500 });

        controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
        cursor = nextCursor;
      } while (cursor);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
});
```

**Pros:** No payload limit, single request, real streaming
**Cons:** Requires Lambda streaming setup, more complex client parsing

#### Option B: Server-Side Orama Index

Move search entirely to server:

```typescript
// Cache Orama index in Lambda memory (reused across warm invocations)
let cachedIndex: Orama | null = null;
let lastBuildTime = 0;

const searchPersonsServer = createServerFn({ method: 'POST' })
  .validator(z.object({ term: z.string(), limit: z.number().default(50) }))
  .handler(async ({ data }) => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Rebuild if cache expired or missing
    if (!cachedIndex || Date.now() - lastBuildTime > CACHE_TTL) {
      const allData = await fetchAllEntitiesFromDDB();
      cachedIndex = await buildOramaIndex(allData);
      lastBuildTime = Date.now();
    }

    const results = await search(cachedIndex, {
      term: data.term,
      limit: data.limit,
      tolerance: 1,
    });

    // Return only IDs, client fetches full data on click
    return results.hits.map((h) => ({ id: h.document.id, score: h.score }));
  });
```

**Pros:** Fast initial page load, no client-side index building
**Cons:** Search latency (~100-200ms vs <10ms), Lambda memory usage, cache invalidation complexity

#### Option C: Pre-built Search Index in S3

Build index offline and serve from S3/CloudFront:

```typescript
// Scheduled Lambda: Build and upload index to S3
async function rebuildSearchIndex() {
  const allData = await fetchAllEntitiesFromDDB();
  const index = await buildOramaIndex(allData);
  const serialized = await persist(index);

  await s3.putObject({
    Bucket: 'my-bucket',
    Key: 'search-index.json',
    Body: JSON.stringify(serialized),
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
  });
}

// Client: Download pre-built index
async function loadPrebuiltIndex() {
  const response = await fetch('https://cdn.example.com/search-index.json');
  const serialized = await response.json();
  return restore(serialized); // Orama's restore function
}
```

**Pros:** Fastest client load, CDN cached, consistent across users
**Cons:** Stale data (rebuild frequency), additional infrastructure

---

#### 3.9 Search Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Search Input    │───>│  Orama In-Memory Index           │  │
│  │  (debounced)     │    │  - 10k persons indexed            │  │
│  └──────────────────┘    │  - Fuzzy search, typo tolerance   │  │
│                          │  - < 10ms response time           │  │
│                          └──────────────────────────────────┘  │
│                                         │                        │
│                                         ▼                        │
│                          ┌──────────────────────────────────┐  │
│                          │  TanStack DB Collections          │  │
│                          │  - Full person data on demand     │  │
│                          │  - Paginated loading              │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Lambda)                           │
├─────────────────────────────────────────────────────────────────┤
│  Server Functions ←→ DynamoDB (Single-Table)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Search Flow:**

1. On page load: Fetch all persons (paginated) → Build Orama index (~2-3s)
2. User types in search → Orama fuzzy search (< 10ms)
3. Results shown instantly with person IDs
4. Click result → Load full person data from TanStack DB collection

### Phase 5: TanStack DB Collections with Server Functions

#### 3.8 Create Server Functions & Collections

- [ ] Create `/src/webapp/db-collections/persons.ts`
  - Define server functions for DynamoDB operations (co-located with collections)
  - personsCollection - Base collection using server functions
  - addressesCollection - Addresses collection
  - bankAccountsCollection - Bank accounts collection
  - contactInfosCollection - Contact info collection
  - employmentsCollection - Employment history collection

**Server Functions Pattern (replaces API routes):**

```typescript
import { createServerFn } from '@tanstack/react-start';
import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { createPersonsDdbClient } from '@/webapp/integrations/ddb-client/personsClient';

// Server functions - no HTTP routes needed!
const fetchPersons = createServerFn({ method: 'GET' }).handler(async () => {
  const client = createPersonsDdbClient();
  return client.getPersons();
});

const createPerson = createServerFn({ method: 'POST' })
  .validator((data: Person) => personSchema.parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient();
    return client.putPerson(data);
  });

const updatePersons = createServerFn({ method: 'POST' })
  .validator((data: PersonUpdate[]) => personUpdateSchema.array().parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient();
    return client.updatePersons(data);
  });

const deletePersons = createServerFn({ method: 'POST' })
  .validator((data: string[]) => z.array(z.string()).parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient();
    return client.deletePersons(data);
  });

// Collection uses server functions directly
export const personsCollection = createCollection(
  queryCollectionOptions<Person>({
    id: 'persons',
    queryKey: ['persons'],
    queryFn: () => fetchPersons(),
    queryClient: getContext().queryClient,
    getKey: (item) => item.id,

    onInsert: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => createPerson({ data: m.modified })));
    },

    onUpdate: async ({ transaction }) => {
      const updates = transaction.mutations.map((m) => ({
        id: m.key,
        changes: m.changes,
      }));
      await updatePersons({ data: updates });
    },

    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((m) => m.key);
      await deletePersons({ data: ids });
    },
  }),
);

// Similar pattern for addresses, bankAccounts, contacts, employments...
```

**Benefits of Server Functions over API Routes:**

- ✅ No HTTP route files needed
- ✅ Type-safe end-to-end (input validation with Zod)
- ✅ Co-located with collections (better DX)
- ✅ Automatic serialization/deserialization
- ✅ Works with TanStack Start's SSR

#### 3.7 Create Live Query Collections for Related Data

- [ ] Create derived collections using `createLiveQueryCollection` for:
  - Filtering addresses by personId
  - Filtering bank accounts by personId
  - Combining person with related entities via joins

**Live Query Collection Pattern (from docs):**

```typescript
import { createLiveQueryCollection, eq } from '@tanstack/db';

// Filter addresses for a specific person
const createPersonAddresses = (personId: string) =>
  createLiveQueryCollection((q) =>
    q
      .from({ address: addressesCollection })
      .where(({ address }) => eq(address.personId, personId))
      .select(({ address }) => address),
  );

// Join person with addresses (left join)
const personWithAddresses = createLiveQueryCollection((q) =>
  q
    .from({ person: personsCollection })
    .join({ address: addressesCollection }, ({ person, address }) =>
      eq(person.id, address.personId),
    )
    .select(({ person, address }) => ({
      ...person,
      address, // Optional because it's a left join
    })),
);
```

#### 3.10 Query Operators Reference

Available operators for filtering (from TanStack DB docs):

```typescript
import { eq, gt, gte, lt, lte, like, ilike, inArray, and, or, not } from '@tanstack/db';

// Examples
eq(user.id, '123'); // Equality
gt(user.age, 18); // Greater than
gte(user.age, 18); // Greater than or equal
lt(user.age, 65); // Less than
lte(user.age, 65); // Less than or equal
like(user.name, 'John%'); // Case-sensitive pattern matching
ilike(user.name, 'john%'); // Case-insensitive pattern matching
inArray(user.id, ['1', '2']); // Array membership

// Logical operators
and(condition1, condition2);
or(condition1, condition2);
not(condition);
```

### Phase 6: Hooks

#### 3.11 Create React Hooks

- [x] Create `/src/webapp/hooks/useDbPersons.ts`
- `usePersons()` - List all persons using `useLiveQuery`
- `usePerson(personId)` - Single person with all related data
- `usePersonMutations()` - CRUD operations using collection methods
- `usePersonAddresses(personId)` - Addresses for a specific person
- `usePersonBankAccounts(personId)` - Bank accounts for a specific person
- Similar hooks for ContactInfo and Employment

**useLiveQuery Pattern (from docs):**

```typescript
import { useLiveQuery } from '@tanstack/react-db';
import { eq } from '@tanstack/db';

// List all persons
export function usePersons() {
  const { data: persons } = useLiveQuery((q) =>
    q.from({ person: personsCollection }).select(({ person }) => person),
  );
  return persons;
}

// Get person with addresses via join
export function usePersonWithAddresses(personId: string) {
  const { data } = useLiveQuery((q) =>
    q
      .from({ person: personsCollection })
      .join(
        { address: addressesCollection },
        ({ person, address }) => eq(person.id, address.personId),
        'left',
      )
      .where(({ person }) => eq(person.id, personId))
      .select(({ person, address }) => ({
        ...person,
        address,
      })),
  );
  return data;
}

// Mutations use collection methods directly (optimistic by default)
export function usePersonMutations() {
  const addPerson = (person: Omit<Person, 'id'>) => {
    personsCollection.insert({
      id: crypto.randomUUID(),
      ...person,
    });
  };

  const updatePerson = (id: string, changes: Partial<Person>) => {
    personsCollection.update(id, (draft) => {
      Object.assign(draft, changes);
    });
  };

  const deletePerson = (id: string) => {
    personsCollection.delete(id);
  };

  return { addPerson, updatePerson, deletePerson };
}
```

**Non-Optimistic Mutations (when needed):**

```typescript
// For operations requiring server confirmation
const handleDeleteAccount = () => {
  personCollection.delete(personId, { optimistic: false });
};

// Server-generated data (IDs, timestamps, etc.)
const handleCreateWithServerData = () => {
  personCollection.insert(personData, { optimistic: false });
};
```

### Phase 7: UI Components (shadcn/ui)

#### 3.12 Create UI Components (shadcn/ui)

- [ ] Create `/src/webapp/components/persons/PersonCard.tsx`
  - Display person summary with inline edit capability
- [ ] Create `/src/webapp/components/persons/PersonForm.tsx`
  - Form for creating/editing person profile
- [ ] Create `/src/webapp/components/persons/PersonSearchInput.tsx`
  - Search input with debouncing for Orama search
- [ ] Create `/src/webapp/components/persons/AddressCard.tsx`
  - Display address with inline editing
- [ ] Create `/src/webapp/components/persons/AddressForm.tsx`
  - Form for adding/editing addresses
- [ ] Create `/src/webapp/components/persons/BankAccountCard.tsx`
  - Display bank account (masked data) with inline editing
- [ ] Create `/src/webapp/components/persons/ContactInfoCard.tsx`
  - Display contact info with inline editing
- [ ] Create `/src/webapp/components/persons/EmploymentCard.tsx`
  - Display employment history with inline editing

**Search Component Pattern (using TanStack Pacer):**

```tsx
import { useState } from 'react';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { searchPersons, usePersonSearch } from '@/webapp/integrations/orama/personSearch';

// PersonSearchInput with TanStack Pacer debouncing
function PersonSearchInput({ onResults }: { onResults: (results: SearchResult[]) => void }) {
  const [term, setTerm] = useState('');
  const { searchIndex, isLoading } = usePersonSearch();

  // TanStack Pacer - debounce the search term
  const [debouncedTerm, debouncer] = useDebouncedValue(
    term,
    {
      wait: 200, // 200ms debounce
    },
    (state) => ({ isPending: state.isPending }),
  );

  // Effect runs when debounced term changes
  useEffect(() => {
    async function performSearch() {
      if (debouncedTerm.length >= 2 && searchIndex) {
        const results = await searchPersons(searchIndex, debouncedTerm, {
          limit: 20,
          tolerance: 1, // Allow 1 typo
        });
        onResults(results.hits);
      } else {
        onResults([]);
      }
    }
    performSearch();
  }, [debouncedTerm, searchIndex]);

  return (
    <div className="relative">
      <Input
        placeholder="Search persons... (fuzzy matching)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {debouncer.state.isPending && (
        <span className="absolute right-3 top-3 text-muted-foreground">Searching...</span>
      )}
    </div>
  );
}
```

**Component Integration Pattern:**

```tsx
// PersonCard with optimistic updates
function PersonCard({ person }: { person: Person }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (changes: Partial<Person>) => {
    // Optimistic update - UI updates immediately
    personsCollection.update(person.id, (draft) => {
      Object.assign(draft, changes);
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    personsCollection.delete(person.id);
  };

  return (
    <Card>
      {isEditing ? (
        <PersonForm person={person} onSave={handleSave} />
      ) : (
        <PersonDisplay person={person} onEdit={() => setIsEditing(true)} />
      )}
    </Card>
  );
}
```

### Phase 8: Pages/Routes

#### 3.13 Create Pages

- [ ] Create `/src/webapp/routes/demo/db-persons.tsx`
  - **Search-first UI** with Orama fuzzy search
  - Paginated list view (10k persons - must paginate!)
  - Create new person button

- [ ] Create `/src/webapp/routes/demo/db-persons.$personId.tsx`
  - Detail view using shadcn/ui Tabs component
  - Tabs: Profile | Addresses | Banking | Contacts | Employment
  - Each tab uses `useLiveQuery` with joins for related data
  - Inline edit/delete functionality for all entities

**List Page with Orama Search Pattern:**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { searchPersons, usePersonSearch } from '@/webapp/integrations/orama/personSearch';

function PersonsListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const { searchIndex, isLoading } = usePersonSearch();

  // Debounced Orama search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2 && searchIndex) {
        const results = await searchPersons(searchIndex, searchTerm, {
          limit: 50,
          tolerance: 1, // Typo tolerance
        });
        setSearchResults(results.hits);
      } else {
        setSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, searchIndex]);

  return (
    <div>
      <Input
        placeholder="Search 10,000 persons... (fuzzy matching)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading && <p>Building search index...</p>}

      {searchResults.map((hit) => (
        <PersonCard
          key={hit.document.id}
          person={hit.document}
          score={hit.score}
          onClick={() => navigate({ to: `/demo/db-persons/${hit.document.id}` })}
        />
      ))}
    </div>
  );
}
```

**Detail Page with Live Query & Tabs Pattern:**

```tsx
import { useLiveQuery } from '@tanstack/react-db';
import { eq } from '@tanstack/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function PersonDetailPage({ personId }: { personId: string }) {
  // Live query with joins - automatically updates when data changes
  const { data: personData } = useLiveQuery((q) =>
    q
      .from({ person: personsCollection })
      .where(({ person }) => eq(person.id, personId))
      .select(({ person }) => person),
  );

  const { data: addresses } = useLiveQuery((q) =>
    q
      .from({ address: addressesCollection })
      .where(({ address }) => eq(address.personId, personId))
      .select(({ address }) => address),
  );

  const person = personData?.[0];
  if (!person) return <NotFound />;

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="addresses">Addresses ({addresses?.length})</TabsTrigger>
        <TabsTrigger value="banking">Banking</TabsTrigger>
        <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <PersonForm person={person} />
      </TabsContent>

      <TabsContent value="addresses">
        {addresses?.map((addr) => (
          <AddressCard key={addr.id} address={addr} />
        ))}
        <AddAddressButton personId={personId} />
      </TabsContent>

      {/* ... other tabs */}
    </Tabs>
  );
}
```

### Phase 9: Data Seeding

#### 3.14 Create Seed Script

- [ ] Create `/scripts/seed-persons.ts`
  - Generate 10,000 persons with `@faker-js/faker`
  - Batch write to DynamoDB (25 items per batch, handles retries)
  - Progress reporting
  - Idempotent (clear existing data option)

- [ ] Add npm script in `package.json`
  - `"seed:persons": "tsx scripts/seed-persons.ts"`
  - `"seed:persons:clear": "tsx scripts/seed-persons.ts --clear"`

**Seeding Script Pattern:**

```typescript
// scripts/seed-persons.ts
import { faker } from '@faker-js/faker';
import { createPersonsDdbClient } from '../src/webapp/integrations/ddb-client/personsClient';

const TOTAL_PERSONS = 10_000;
const BATCH_SIZE = 25; // DynamoDB limit

async function seedPersons() {
  const client = createPersonsDdbClient();

  console.log(`Seeding ${TOTAL_PERSONS} persons...`);

  for (let i = 0; i < TOTAL_PERSONS; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, TOTAL_PERSONS - i) }, () =>
      generateFakePerson(),
    );

    await client.batchWritePersons(batch);

    if ((i + BATCH_SIZE) % 1000 === 0) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, TOTAL_PERSONS)}/${TOTAL_PERSONS}`);
    }
  }

  console.log('Done!');
}

seedPersons();
```

---

## 4. File Structure (New Files)

```
src/webapp/
├── types/
│   └── person.ts                          # All entity type definitions (Zod - SOURCE OF TRUTH)
├── data/
│   └── fake-persons.ts                    # Fake data generator (@faker-js/faker)
├── db-collections/
│   └── persons.ts                         # Server functions + TanStack DB collections
├── integrations/
│   └── electrodb/
│       ├── zod-to-electrodb.ts            # Zod → ElectroDB schema converter
│       ├── entities.ts                    # ElectroDB entities (derived from Zod)
│       └── personsService.ts              # ElectroDB Service for collection queries
├── hooks/
│   └── useDbPersons.ts                    # React hooks for CRUD
├── components/
│   └── persons/
│       ├── PersonCard.tsx
│       ├── PersonForm.tsx
│       ├── AddressCard.tsx
│       ├── AddressForm.tsx
│       ├── BankAccountCard.tsx
│       ├── ContactInfoCard.tsx
│       └── EmploymentCard.tsx
└── routes/
    └── demo/
        ├── db-persons.tsx                 # Persons list page
        └── db-persons.$personId.tsx       # Person detail page

scripts/
└── seed-persons.ts                        # Data seeding script

lib/constructs/
└── DatabasePersons.ts                     # (Modified) Infrastructure updates
```

**Note:** No API route files needed - Server functions are co-located in `db-collections/persons.ts`

---

## 5. Modified Files

| File                                 | Changes                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `/lib/constructs/DatabasePersons.ts` | Infrastructure setup (no GSI required for basic example)            |
| `/lib/constructs/Webapp.ts`          | Add `grantReadWriteData` for persons table                          |
| `/package.json`                      | Add seed script, add `@faker-js/faker` and `electrodb` dependencies |

---

## 6. Implementation Order (Recommended)

1. **Types & Schemas (Zod)** - Single source of truth for all types
2. **Fake Data Generator** - Needed for local dev and seeding
3. **CDK Updates** - Infrastructure changes (deploy after)
4. **Zod-to-ElectroDB Converter** - Utility to derive ElectroDB schemas from Zod
5. **ElectroDB Entities & Service** - Type-safe DynamoDB operations
6. **Collections + Server Functions** - TanStack DB integration (using ElectroDB)
7. **Hooks** - React integration
8. **UI Components** - Reusable components
9. **Pages** - Final UI assembly (simple list + detail views)
10. **Seed Script** - Populate DynamoDB with 10k persons (using ElectroDB batch)

---

## 7. Questions / Decisions Needed

All decisions have been made:

1. **Fake Data Library**: ✅ **DECIDED** - Use `@faker-js/faker` library

2. **UI Framework**: ✅ **DECIDED** - Use shadcn/ui components

3. **Person Detail Layout**: ✅ **DECIDED** - Use tabs (Profile | Addresses | Banking | Contacts | Employment)

4. **Inline Editing**: ✅ **DECIDED** - Enable inline editing for all entities

5. **Optimistic Updates**: ✅ **DECIDED** - Yes, TanStack DB is optimistic by default

6. **Person Profile Photo**: ✅ **DECIDED** - No profile photos needed

7. **Data Volume**: ✅ **DECIDED** - 10,000 persons with batch seeding

8. **Search**: ✅ **DECIDED** - Search functionality postponed to future branch

---

## 8. Tech Stack Summary

| Layer               | Technology                                                     |
| ------------------- | -------------------------------------------------------------- |
| Database            | AWS DynamoDB (Single-Table Design)                             |
| **DynamoDB Client** | **ElectroDB (schemas derived from Zod)**                       |
| Backend             | TanStack Start Server Functions                                |
| Data Fetching       | TanStack Query + queryCollectionOptions                        |
| Local State         | TanStack DB Collections with Live Queries                      |
| Optimistic Updates  | TanStack DB (built-in via onInsert/onUpdate/onDelete handlers) |
| UI Framework        | React + TailwindCSS + shadcn/ui                                |
| Type Safety         | Zod + TypeScript                                               |
| Infrastructure      | AWS CDK                                                        |
| Fake Data           | @faker-js/faker                                                |

---

## 9. Multi-User Data Synchronization

### Sync Strategy: Polling + Refetch on Focus

For the basic multi-entity example, use polling for simplicity:

```typescript
// In persons collection definition
export const personsCollection = createCollection({
  ...queryCollectionOptions({
    queryKey: ['persons'],
    queryFn: getAllPersons,
    getId: (person) => person.id,
    // TanStack Query options for sync
    staleTime: 30_000, // Consider data fresh for 30s
    refetchInterval: 60_000, // Poll every 60s for updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  }),
  onInsert: async (person) => {
    /* ... */
  },
  onUpdate: async (person) => {
    /* ... */
  },
  onDelete: async (id) => {
    /* ... */
  },
});
```

**Benefits:**

- Simple to implement
- No additional AWS infrastructure needed
- Acceptable latency for person directory use case

---

## 10. Future Enhancements (Search & Real-Time)

### Search Implementation (Postponed)

Full-text search across multi-entity data is planned for a future branch:

- **Orama Search**: Client-side fuzzy search with typo tolerance
- **Cross-Entity Search**: Search across Person, Address, Contact, Employment, and BankAccount fields
- **Search Index Building**: Efficient data fetching via collection queries
- **TanStack Pacer**: Debouncing search input for optimized performance

See future search branch for implementation details.

### Real-Time Synchronization (Future)

Alternative sync strategies for higher update frequency:

- **WebSocket (API Gateway)**: For real-time updates via WebSocket
- **AppSync Subscriptions**: GraphQL subscriptions for real-time data
- **DynamoDB Streams**: Process changes via Lambda + DynamoDB Streams

These are deferred to a specialized real-time branch.

---

## 11. Estimated Timeline

| Phase                          | Estimated Time  |
| ------------------------------ | --------------- |
| Types & Fake Data              | 2-3 hours       |
| CDK Updates                    | 1 hour          |
| ElectroDB Integration          | 3-4 hours       |
| Collections + Server Functions | 2-3 hours       |
| Hooks                          | 1-2 hours       |
| UI Components                  | 4-6 hours       |
| Pages                          | 2-3 hours       |
| Seed Script (10k)              | 1-2 hours       |
| Testing & Polish               | 2-3 hours       |
| **Total**                      | **18-26 hours** |

### Why ElectroDB?

- **Type-safe DynamoDB operations** with fluent API
- **Single-table design** made easy with entities and services
- **Collection queries** to fetch related entities in one call
- **Automatic key generation** based on composite attributes
- **Built-in validation** that complements Zod

### Zod-to-ElectroDB Schema Derivation

The key insight: **Zod is the single source of truth**. ElectroDB schemas are derived from Zod schemas programmatically.

```typescript
// /src/webapp/integrations/electrodb/zod-to-electrodb.ts
import { z } from 'zod';
import type { Attribute } from 'electrodb';

type ElectroDBAttribute = {
  type: 'string' | 'number' | 'boolean' | 'list' | 'map' | 'set' | readonly string[];
  required?: boolean;
  default?: unknown;
};

/**
 * Convert a Zod schema to ElectroDB attributes
 * This ensures Zod is the single source of truth
 */
export function zodToElectroDBAttributes<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): Record<keyof T, ElectroDBAttribute> {
  const shape = schema.shape;
  const attributes: Record<string, ElectroDBAttribute> = {};

  for (const [key, zodType] of Object.entries(shape)) {
    attributes[key] = convertZodType(zodType as z.ZodTypeAny);
  }

  return attributes as Record<keyof T, ElectroDBAttribute>;
}

function convertZodType(zodType: z.ZodTypeAny): ElectroDBAttribute {
  // Handle optional wrapper
  if (zodType instanceof z.ZodOptional) {
    const inner = convertZodType(zodType.unwrap());
    return { ...inner, required: false };
  }

  // Handle nullable
  if (zodType instanceof z.ZodNullable) {
    const inner = convertZodType(zodType.unwrap());
    return { ...inner, required: false };
  }

  // Handle default
  if (zodType instanceof z.ZodDefault) {
    const inner = convertZodType(zodType.removeDefault());
    return { ...inner, default: zodType._def.defaultValue() };
  }

  // Handle primitives
  if (zodType instanceof z.ZodString) {
    return { type: 'string', required: true };
  }
  if (zodType instanceof z.ZodNumber) {
    return { type: 'number', required: true };
  }
  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean', required: true };
  }

  // Handle enums
  if (zodType instanceof z.ZodEnum) {
    return { type: zodType.options as readonly string[], required: true };
  }

  // Handle arrays
  if (zodType instanceof z.ZodArray) {
    return { type: 'list', required: true };
  }

  // Handle objects (nested)
  if (zodType instanceof z.ZodObject) {
    return { type: 'map', required: true };
  }

  // Default to string
  return { type: 'string', required: true };
}
```

### Using Derived Schemas in Entities

```typescript
// /src/webapp/integrations/electrodb/entities.ts
import { Entity } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { zodToElectroDBAttributes } from './zod-to-electrodb';
import {
  PersonSchema,
  AddressSchema,
  // ... other schemas
} from '@/webapp/types/person';

const client = new DynamoDBClient({});
const table = process.env.DDB_PERSONS_TABLE_NAME!;

// Derive ElectroDB attributes from Zod schemas
const personAttributes = zodToElectroDBAttributes(PersonSchema.omit({ id: true }));
const addressAttributes = zodToElectroDBAttributes(
  AddressSchema.omit({ id: true, personId: true }),
);

// Person Entity
export const PersonEntity = new Entity(
  {
    model: {
      entity: 'person',
      version: '1',
      service: 'persons',
    },
    attributes: {
      personId: { type: 'string' },
      ...personAttributes,
    },
    indexes: {
      // Primary index - get person by ID
      byPerson: {
        pk: { field: 'pk', composite: ['personId'], template: 'PERSON#${personId}' },
        sk: { field: 'sk', composite: [], template: 'PROFILE' },
      },
      // GSI1 - list all persons
      allPersons: {
        index: 'GSI1',
        pk: { field: 'gsi1pk', composite: [], template: 'PERSONS' },
        sk: { field: 'gsi1sk', composite: ['personId'], template: 'PERSON#${personId}' },
      },
      // GSI2 - list ALL entities for Orama search index (collection query)
      allData: {
        collection: 'allData', // Shared collection across all entities
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId'], template: 'PERSON#${personId}#PROFILE' },
      },
    },
  },
  { client, table },
);

// Address Entity
export const AddressEntity = new Entity(
  {
    model: {
      entity: 'address',
      version: '1',
      service: 'persons',
    },
    attributes: {
      personId: { type: 'string' },
      addressId: { type: 'string' },
      ...addressAttributes,
    },
    indexes: {
      // Primary index - get addresses by person
      byPerson: {
        collection: 'personData', // Collection for querying single person's data
        pk: { field: 'pk', composite: ['personId'], template: 'PERSON#${personId}' },
        sk: { field: 'sk', composite: ['addressId'], template: 'ADDRESS#${addressId}' },
      },
      // GSI2 - list ALL entities for Orama
      allData: {
        collection: 'allData',
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: {
          field: 'gsi2sk',
          composite: ['personId', 'addressId'],
          template: 'PERSON#${personId}#ADDRESS#${addressId}',
        },
      },
    },
  },
  { client, table },
);

// BankAccountEntity, ContactInfoEntity, EmploymentEntity follow the same pattern:
// - Primary index with 'personData' collection for single person queries
// - GSI2 index with 'allData' collection for Orama bulk fetch
```

### ElectroDB Service for Collection Queries

```typescript
// /src/webapp/integrations/electrodb/personsService.ts
import { Service } from 'electrodb'
import { PersonEntity, AddressEntity, BankAccountEntity, ContactInfoEntity, EmploymentEntity } from './entities'

export const PersonsService = new Service({
  person: PersonEntity,
  address: AddressEntity,
  bankAccount: BankAccountEntity,
  contactInfo: ContactInfoEntity,
  employment: EmploymentEntity,
})

// Usage examples:

// Get all persons (using GSI1)
const allPersons = await PersonEntity.query.allPersons({}).go()

// Get person with all related data (collection query via primary index)
const personData = await PersonsService.collections.personData({ personId }).go()
// Returns: { person: [...], address: [...], bankAccount: [...], contactInfo: [...], employment: [...] }

// 🔥 Get ALL entities for Orama search index (collection query via GSI2)
const allData = await PersonsService.collections.allData({}).go({ pages: 'all' })
// Returns ALL entities across ALL persons in one query!
// { person: [10k items], address: [~20k items], contactInfo: [~30k items], ... }

// Create a person
await PersonEntity.put({ personId, firstName, lastName, ... }).go()

// Update a person
await PersonEntity.patch({ personId }).set({ firstName: 'New Name' }).go()

// Delete a person and all related entities
await PersonEntity.delete({ personId }).go()
// Note: Related entities need separate deletion or use transactions

// Batch operations
await PersonEntity.put([person1, person2, person3]).go()
```

### Benefits of Zod → ElectroDB Derivation

1. **Single Source of Truth**: Update Zod schema once, ElectroDB follows
2. **Consistent Validation**: Zod validates at runtime, ElectroDB at persistence
3. **Type Safety**: TypeScript types flow from Zod to ElectroDB to client
4. **Less Boilerplate**: No need to maintain two separate schema definitions
5. **Reduced Errors**: Schema drift between Zod and DB is impossible

---

## 11. TanStack DB Key Concepts

### Collections

- **queryCollectionOptions**: For data synced with a backend API
- **localOnlyCollectionOptions**: For client-only data
- **liveQueryCollectionOptions**: For derived/filtered views of other collections

### Mutations

- All mutations are **optimistic by default** - UI updates immediately
- Use `{ optimistic: false }` for server-confirmed operations
- Mutation handlers (`onInsert`, `onUpdate`, `onDelete`) sync to backend
- Failed mutations **automatically rollback**

### Live Queries

- Use `useLiveQuery` hook in React components
- Queries are **reactive** - automatically update when underlying data changes
- Support **joins** for combining related collections
- Support **filtering** with operators (`eq`, `gt`, `lt`, `and`, `or`, etc.)

### Best Practices

1. Create base collections with `queryCollectionOptions` for each entity type
2. Use `createLiveQueryCollection` for filtered/joined views
3. Keep mutation logic in collection handlers, not components
4. Use `useLiveQuery` for all data access in components

---

## 11. Multi-User Data Synchronization

### The Problem

When User B modifies data on the server (via their own browser), User A's:

1. **TanStack DB collection** still has stale data
2. **Orama search index** is out of sync

### Sync Strategy Options

| Strategy                  | Latency        | Complexity | AWS Cost |
| ------------------------- | -------------- | ---------- | -------- |
| **Polling** (recommended) | 5-30s          | Low        | Low      |
| Refetch on Focus          | User-dependent | Very Low   | Very Low |
| WebSocket (API Gateway)   | Real-time      | High       | Medium   |
| AppSync Subscriptions     | Real-time      | Medium     | Medium   |
| DynamoDB Streams + SSE    | Near real-time | High       | Medium   |

### Recommended: Polling + Refetch on Focus

For 10k persons with moderate update frequency, polling is the pragmatic choice:

```typescript
// In persons collection definition
export const personsCollection = createCollection({
  ...queryCollectionOptions({
    queryKey: ['persons'],
    queryFn: getAllPersons,
    getId: (person) => person.id,
    // TanStack Query options for sync
    staleTime: 30_000, // Consider data fresh for 30s
    refetchInterval: 60_000, // Poll every 60s for updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  }),
  onInsert: async (person) => {
    /* ... */
  },
  onUpdate: async (person) => {
    /* ... */
  },
  onDelete: async (id) => {
    /* ... */
  },
});
```

### Syncing Orama Search Index with Collection

The search index must stay in sync with the TanStack DB collection:

```typescript
// usePersonSearch.ts - Sync Orama with collection state
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/db';
import { create, insertMultiple, removeMultiple } from '@orama/orama';
import { personsCollection } from '@/webapp/db-collections/persons';

export function usePersonSearch() {
  const [searchIndex, setSearchIndex] = useState<Orama | null>(null);
  const [isBuilding, setIsBuilding] = useState(true);
  const lastSyncRef = useRef<string>('');

  // Live query to watch collection changes
  const persons = useLiveQuery(personsCollection, {
    query: {
      $select: ['id', 'firstName', 'lastName', 'email'],
    },
  });

  // Rebuild index when persons change
  useEffect(() => {
    async function syncIndex() {
      if (!persons.data) return;

      // Create hash of current data to detect changes
      const dataHash = JSON.stringify(persons.data.map((p) => p.id).sort());
      if (dataHash === lastSyncRef.current) return; // No change

      setIsBuilding(true);

      // Full rebuild (simple, reliable for moderate update frequency)
      const index = await create({
        schema: {
          id: 'string',
          firstName: 'string',
          lastName: 'string',
          fullName: 'string',
          email: 'string',
        },
      });

      const docs = persons.data.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        email: p.email ?? '',
      }));

      await insertMultiple(index, docs);

      setSearchIndex(index);
      lastSyncRef.current = dataHash;
      setIsBuilding(false);
    }

    syncIndex();
  }, [persons.data]);

  return {
    searchIndex,
    isBuilding,
    isLoading: persons.isLoading,
    lastUpdated: persons.dataUpdatedAt,
  };
}
```

### Alternative: Incremental Index Updates

For higher update frequency, use Orama's incremental operations:

```typescript
// Track and apply incremental changes
useEffect(() => {
  if (!searchIndex || !persons.data) return;

  const currentIds = new Set(persons.data.map((p) => p.id));
  const indexedIds = new Set(/* track indexed IDs */);

  // Find additions and removals
  const added = persons.data.filter((p) => !indexedIds.has(p.id));
  const removed = [...indexedIds].filter((id) => !currentIds.has(id));

  if (added.length > 0) {
    insertMultiple(searchIndex, added.map(toSearchDoc));
  }
  if (removed.length > 0) {
    removeMultiple(searchIndex, removed);
  }
}, [persons.data, searchIndex]);
```

---

## 13. Real-Time Synchronization: Server-to-Client Push

### Overview

This section outlines the plan to implement real-time synchronization from the server to all connected clients. When data changes in DynamoDB (from another session, user, or process), connected clients receive only the changed data via WebSocket, without fetching all data.

### Goals

1. **Incremental updates**: Push only changed records, not full dataset
2. **Multi-client sync**: All connected clients receive updates in real-time
3. **Efficient bandwidth**: Minimize data transfer by sending deltas
4. **ElectroDB integration**: Leverage existing ElectroDB entities for consistent data handling
5. **TanStack DB integration**: Update collections without full refetch

---

## 14. Architecture Options Analysis

### Option A: API Gateway WebSocket + DynamoDB Streams + Lambda (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌─────────────────┐      ┌──────────────────────┐   │
│  │  DynamoDB    │─────>│ DynamoDB Stream │─────>│ Stream Processor     │   │
│  │  (Persons)   │      │  (NEW_AND_OLD)  │      │ Lambda               │   │
│  └──────────────┘      └─────────────────┘      │ - Parse stream event │   │
│                                                  │ - Get connection IDs │   │
│                                                  │ - Broadcast to WS    │   │
│                                                  └──────────┬───────────┘   │
│                                                              │               │
│  ┌──────────────────────────────────────────────────────────┼──────────────┐│
│  │                    API Gateway WebSocket                  │              ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │              ││
│  │  │ $connect    │  │ $disconnect  │  │ $default      │   │              ││
│  │  │ Lambda      │  │ Lambda       │  │ (optional)    │   │              ││
│  │  │ - Store     │  │ - Remove     │  │ - Client msgs │   │              ││
│  │  │   connId    │  │   connId     │  └───────────────┘   │              ││
│  │  └─────────────┘  └──────────────┘                       ▼              ││
│  │                                                  ┌───────────────┐      ││
│  │                                                  │ postToConn    │      ││
│  │                                                  │ API Gateway   │      ││
│  │                                                  │ Management API│      ││
│  │                                                  └───────────────┘      ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │ Connections Table│  (DynamoDB - stores active WebSocket connection IDs)   │
│  └──────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  WebSocket Client                                                     │   │
│  │  - Connect on app load                                               │   │
│  │  - Reconnect on disconnect                                           │   │
│  │  - Parse incoming messages                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  TanStack DB Collections                                              │   │
│  │  - personsCollection.insert() / .update() / .delete()                │   │
│  │  - addressesCollection.insert() / .update() / .delete()              │   │
│  │  - Other entity collections...                                        │   │
│  │  - { optimistic: false } to avoid sync conflicts                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- ✅ Native AWS integration, no third-party dependencies
- ✅ Pay-per-use (WebSocket connections + message transfer)
- ✅ DynamoDB Streams guarantee ordered, exactly-once delivery
- ✅ Works with existing ElectroDB entities (parse stream records)
- ✅ Scales automatically with connections

**Cons:**

- ⚠️ Requires connection management (store/cleanup connection IDs)
- ⚠️ API Gateway WebSocket has 32KB message limit (ok for single records)
- ⚠️ Cold start latency on stream processor Lambda

**Estimated Cost (10k connections, 100k msgs/day):**

- WebSocket connection minutes: ~$3/month
- Messages: ~$1/month
- Lambda invocations: ~$0.50/month
- **Total: ~$5/month**

---

### Option B: AWS AppSync + GraphQL Subscriptions

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  DynamoDB       │─────>│ DynamoDB Stream │─────>│ Lambda           │
│  (Persons)      │      │                 │      │ (Mutation call)  │
└─────────────────┘      └─────────────────┘      └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  AWS AppSync     │
                                                  │  GraphQL API     │
                                                  │  - Subscriptions │
                                                  │  - Auto-scaling  │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Clients         │
                                                  │  (GraphQL sub)   │
                                                  └──────────────────┘
```

**Pros:**

- ✅ Managed WebSocket infrastructure (no connection table needed)
- ✅ Built-in authorization (Cognito, IAM, API Key)
- ✅ Automatic reconnection handling
- ✅ GraphQL type safety

**Cons:**

- ❌ Requires GraphQL schema + resolvers (more complexity)
- ❌ AppSync pricing can be higher at scale
- ❌ Overkill if we don't need full GraphQL API
- ❌ Less control over message format

**Estimated Cost:** ~$10-20/month (higher than WebSocket API)

---

### Option C: AWS IoT Core WebSocket

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  DynamoDB       │─────>│ DynamoDB Stream │─────>│ Lambda           │
│  (Persons)      │      │                 │      │ (IoT publish)    │
└─────────────────┘      └─────────────────┘      └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  AWS IoT Core    │
                                                  │  - MQTT/WSS      │
                                                  │  - Topics        │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Clients (MQTT)  │
                                                  └──────────────────┘
```

**Pros:**

- ✅ Massive scale (millions of connections)
- ✅ Built-in topic-based filtering
- ✅ No connection management needed

**Cons:**

- ❌ IoT-oriented, overkill for web apps
- ❌ MQTT learning curve
- ❌ More complex client setup

---

### Option D: Third-Party Services (Pusher, Ably, Socket.io Cloud)

**Pros:**

- ✅ Very easy to implement
- ✅ SDKs handle reconnection, presence, etc.

**Cons:**

- ❌ Third-party dependency
- ❌ Higher cost at scale
- ❌ Data leaves AWS (compliance concerns)

---

### Option E: SSE with API Gateway Response Streaming (NEW - Nov 2025) ⭐

> **Breaking Change:** API Gateway now supports response streaming for REST APIs!
> https://aws.amazon.com/about-aws/whats-new/2025/11/api-gateway-response-streaming-rest-apis/

#### ⚠️ Critical: SQS Fan-out Problem

**The naive SQS approach has a fatal flaw:**

When multiple clients connect, each has their own SSE Lambda. If Lambda A reads and deletes a message from SQS, Lambda B (another client) never sees it.

| Clients   | Problem                                  |
| --------- | ---------------------------------------- |
| 1 client  | ✅ Works fine                            |
| 5 clients | ❌ Each client gets ~1/5 of the messages |
| N clients | ❌ Messages distributed, not broadcast   |

**Additional concerns:**

- **Ordering**: SQS Standard doesn't guarantee order; FIFO has 300 msg/sec limit
- **Missed events**: Disconnected client misses all events consumed during downtime
- **Sync recovery**: No way to "replay" missed events after reconnect

#### ✅ Solution: Event Store Pattern

Instead of SQS, use a **DynamoDB Events Table** as a durable event log:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌─────────────────┐      ┌──────────────────────┐   │
│  │  DynamoDB    │─────>│ DynamoDB Stream │─────>│ Stream Processor     │   │
│  │  (Persons)   │      │  (NEW_AND_OLD)  │      │ Lambda               │   │
│  └──────────────┘      └─────────────────┘      │ - Parse stream event │   │
│                                                  │ - Generate sequence# │   │
│                                                  │ - Write to Events DB │   │
│                                                  └──────────┬───────────┘   │
│                                                              │               │
│                                                              ▼               │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  DynamoDB Events Table (Event Store)                                     ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐ ││
│  │  │ pk: "EVENTS"                                                        │ ││
│  │  │ sk: "2026-01-03T10:30:00.000Z#01HJQK..." (timestamp + ULID)        │ ││
│  │  │ eventType: "MODIFY"                                                 │ ││
│  │  │ entityType: "person"                                                │ ││
│  │  │ entity: { id: "...", firstName: "...", ... }                       │ ││
│  │  │ ttl: 1704369600 (auto-delete after 1 hour)                         │ ││
│  │  └─────────────────────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                              │               │
│  ┌───────────────────────────────────────────────────────────┼──────────────┐│
│  │              API Gateway REST API (Response Streaming)    │              ││
│  │                                                           │              ││
│  │  GET /events/stream?lastEventId=xxx                       │              ││
│  │  ┌─────────────────────────────────────────────────────┐  │              ││
│  │  │ Lambda (Streaming)                                  │<─┘              ││
│  │  │ 1. Query events WHERE sk > lastEventId              │                 ││
│  │  │ 2. Stream those events to client                    │                 ││
│  │  │ 3. Poll for new events (query every 500ms)          │                 ││
│  │  │ 4. Stream new events as they arrive                 │                 ││
│  │  │ 5. Send heartbeat every 30s                         │                 ││
│  │  └─────────────────────────────────────────────────────┘                 ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ✅ Each client queries independently - no competition for messages         │
│  ✅ Events persist for 1 hour - clients can catch up after disconnect       │
│  ✅ Ordering guaranteed by sorted sk (timestamp + ULID)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ SSE (text/event-stream)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  EventSource API (native browser)                                     │   │
│  │  - Tracks lastEventId (SSE spec feature!)                            │   │
│  │  - Auto-reconnect sends Last-Event-ID header                         │   │
│  │  - Server resumes from that point                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  TanStack DB Collections                                              │   │
│  │  - Apply changes with { optimistic: false }                          │   │
│  │  - Changes applied in order (sorted by eventId)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### How This Solves the Problems

| Problem                  | Solution                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| **Fan-out to N clients** | Each client queries Events table independently - no message consumption |
| **Ordering**             | Events sorted by `sk` (timestamp + ULID) - guaranteed order             |
| **Missed events**        | Client sends `lastEventId` on reconnect, server sends all events since  |
| **Durability**           | Events persist for 1 hour (TTL) - plenty of time to catch up            |

---

#### 🤔 Why Not Use a Simpler SSE Pattern (Without Event Store)?

A common SSE pattern (e.g., [Medium article on Lambda SSE](https://medium.com/@johannesfloriangeiger/server-sent-events-with-aws-lambda-response-streaming-c460b0944c89)) uses short-lived connections:

```typescript
// Simple pattern: Lambda generates data itself
export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const asyncGenerator = async function* () {
    for (let i = 0; i < 10; i++) {
      yield `data: Hello World!\n\n`;
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  // Stream for ~10 seconds, then close. EventSource auto-reconnects.
});
```

**This pattern works when Lambda IS the data source** (e.g., AI streaming, progress updates).

**But it DOESN'T work for DynamoDB sync because:**

| Question                                            | Answer                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **How does Lambda know about DynamoDB changes?**    | It doesn't. Lambda can't "subscribe" to DynamoDB Streams mid-execution.                             |
| **Could Lambda poll the Persons table directly?**   | Yes, but: (1) deletes invisible, (2) needs GSI on `updatedAt`, (3) no event type (INSERT vs MODIFY) |
| **Could Lambda consume DynamoDB Streams directly?** | No. Stream consumers are triggered by AWS, can't be long-polled by Lambda.                          |
| **Could Lambda poll SQS?**                          | Yes, but fan-out broken - message consumed = message gone for other clients.                        |

**The fundamental problem:**

```
                           ???
DynamoDB change ────────────────────> SSE Lambda ────> Client
               ↑
               How does Lambda learn about changes?
```

**Why Event Store is the answer:**

```
DynamoDB change ──> Stream ──> Lambda ──> Events Table ──> SSE Lambda ──> Client
                                              ↑
                             Each client queries independently!
```

#### Alternative: Poll Persons Table Directly (Simpler, But Limited)

If you accept limitations, you could skip the Events table and poll the Persons table directly:

```typescript
// SSE Lambda polls Persons table with GSI on updatedAt
const sseHandler = awslambda.streamifyResponse(async (event, responseStream) => {
  let lastTimestamp = event.queryStringParameters?.since || new Date(0).toISOString();
  const startTime = Date.now();
  const maxDuration = 14 * 60 * 1000; // 14 minutes (leave buffer)

  while (Date.now() - startTime < maxDuration) {
    // Query GSI: pk = "PERSON", sk > lastTimestamp
    const changes = await queryPersonsUpdatedSince(lastTimestamp);

    for (const person of changes) {
      yield formatSSE({ type: 'MODIFY', data: person }, person.updatedAt);
      lastTimestamp = person.updatedAt;
    }

    await sleep(500); // Poll every 500ms
  }
});
```

**Trade-offs of Direct Polling:**

| Aspect                 | Event Store                     | Direct Polling                     |
| ---------------------- | ------------------------------- | ---------------------------------- |
| **Deletes**            | ✅ Captured as REMOVE events    | ❌ Invisible (deleted = gone)      |
| **Event type**         | ✅ INSERT, MODIFY, REMOVE       | ⚠️ Only MODIFY detectable          |
| **Infrastructure**     | Events table + Stream processor | GSI on `updatedAt` only            |
| **Query efficiency**   | Query by eventId range          | Query by timestamp range           |
| **Hot partition risk** | Low (events distributed)        | High (all queries hit recent data) |
| **Ordering guarantee** | ✅ ULID ensures total order     | ⚠️ Timestamp ties possible         |

**Recommendation:**

- Use **Direct Polling** if: Deletes are rare, and you only need MODIFY notifications
- Use **Event Store** if: You need reliable sync including deletes, or high write volume

For a complete, production-ready sync solution, the Event Store pattern is worth the small additional complexity.

---

#### 🤔 Could Step Functions with Callback Pattern Replace Event Store?

**Idea:** Each client triggers a Step Functions execution that waits with `WAIT_FOR_TASK_TOKEN`. DynamoDB Stream triggers Lambda that calls `SendTaskSuccess(token, data)` to resume and push data.

```
Client connects → Start Step Function → Lambda waits (WAIT_FOR_TASK_TOKEN)
                                              ↑
DynamoDB change → Stream → Lambda → SendTaskSuccess(token, data)
                                              ↓
                             Execution resumes → ??? Send to client ??? → Wait again
```

**The Critical Gap:** Step Functions can orchestrate workflows, but they **can't maintain an HTTP connection to the browser**:

```
Step Function resumes with data
         ↓
    ??? How does data reach the browser ???
         ↓
    Still need: WebSocket / SSE / Polling
```

**Comparison:**

| Aspect                                  | Event Store + SSE                 | Step Functions Callback         |
| --------------------------------------- | --------------------------------- | ------------------------------- |
| **Event buffering**                     | Events table with TTL             | Step Function state             |
| **Fan-out**                             | Each client queries independently | Each client has own execution   |
| **Client delivery**                     | ✅ SSE streams directly           | ❌ Still need SSE/WebSocket     |
| **Token/Connection storage**            | Not needed                        | Need token table per client     |
| **Reconnection**                        | Query from lastEventId            | ❌ Lost - execution continued   |
| **Cost (1000 clients, 100 events/day)** | ~$1/month                         | ~$75/month\*                    |
| **Complexity**                          | 2 Lambdas + Events table          | Step Function + 2 Lambdas + SSE |

\*Step Functions pricing: $25 per million state transitions

**Verdict:** ❌ **Not recommended.** Step Functions adds cost and complexity but doesn't solve the client delivery problem - you'd still need SSE or WebSocket on top. The callback pattern is designed for workflow orchestration (human approval, external API calls), not real-time streaming to browsers.

---

#### Event ID Design: ULID (Universally Unique Lexicographically Sortable Identifier)

```
sk: "2026-01-03T10:30:00.123Z#01HJQK5X7HZRD8QVFN9MWJG4E6"
     └─────────────────────┘ └──────────────────────────┘
          ISO timestamp              ULID suffix
```

**Why ULID?**

- ✅ **Time-ordered**: Lexicographic sort = chronological order
- ✅ **Unique**: No collisions even at high throughput
- ✅ **Compact**: 26 characters, URL-safe
- ✅ **No coordination**: Generate independently (no sequence counter bottleneck)

**API Gateway Response Streaming Features (Nov 2025):**

- ✅ **15-minute timeout** (up from 29 seconds!)
- ✅ **Payloads > 10 MB** supported
- ✅ **Native SSE support** with `text/event-stream`
- ✅ **Lambda streaming** via `InvokeWithResponseStreaming`
- ✅ **5-minute idle timeout** (Regional/Private endpoints)
- ✅ Works with existing REST API security (authorizers, WAF, mTLS)

**Pros:**

- ✅ **Simpler than WebSocket** - unidirectional, no connection table needed
- ✅ **Browser native** - `EventSource` API with auto-reconnect
- ✅ **No connection management** - each client is independent
- ✅ **Uses existing REST API** - no separate WebSocket API
- ✅ **Easier debugging** - standard HTTP, curl-able
- ✅ **Lower infrastructure** - no connections table, fewer Lambdas

**Cons:**

- ⚠️ **Unidirectional** - server-to-client only (fine for our use case)
- ⚠️ **5-min idle timeout** - need heartbeat to keep connection alive
- ⚠️ **One connection per client** - each tab opens new stream
- ⚠️ **SQS fan-out needed** - can't push directly to specific clients

**Estimated Cost (similar to WebSocket):** ~$5/month

---

### Option F: Lambda Durable Functions with Callbacks (NEW - 2025)

> **New AWS Feature:** Lambda Durable Functions enable long-running, stateful executions with checkpoint/replay.
> https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html

**Concept:** Each client triggers a durable execution that waits for callbacks. DynamoDB Stream triggers Lambda that resumes executions via `SendDurableExecutionCallbackSuccess`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DURABLE FUNCTIONS ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────────────┐                             │
│  │   Client 1   │─────>│  API Gateway         │                             │
│  │   Browser    │<─────│  (Response Stream)   │                             │
│  └──────────────┘      └──────────┬───────────┘                             │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Durable Lambda (per client)                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐│    │
│  │  │ 1. Stream initial data                                          ││    │
│  │  │ 2. Store callbackId in table                                    ││    │
│  │  │ 3. Signal client: "reconnect in 1s"                             ││    │
│  │  │ 4. End HTTP response (connection closes)                        ││    │
│  │  │ 5. waitForCallback() ← FUNCTION TERMINATES, NO CHARGES          ││    │
│  │  │ 6. ... callback received ...                                    ││    │
│  │  │ 7. Function re-invoked, replays to step 5                       ││    │
│  │  │ 8. Client has reconnected, stream new data                      ││    │
│  │  │ 9. Go to step 3 (loop)                                          ││    │
│  │  └─────────────────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                              ▲                     │
│         │ Store callbackId                             │ SendDurableExecution│
│         ▼                                              │ CallbackSuccess()   │
│  ┌─────────────────┐      ┌─────────────────┐         │                     │
│  │  Callback Table │      │  Stream Lambda  │─────────┘                     │
│  │  pk: callbackId │<─────│  (triggered by  │                               │
│  │  executionArn   │      │   DDB Stream)   │                               │
│  └─────────────────┘      └────────┬────────┘                               │
│                                    │                                         │
│                                    │ DynamoDB Stream                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  DynamoDB (Persons)                                                  │    │
│  │  - StreamViewType: NEW_AND_OLD_IMAGES                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Critical Limitation: Connection Model

When a durable function calls `waitForCallback()`:

1. **Function terminates** (not pauses in-memory)
2. **HTTP connection closes** - client disconnected!
3. **Callback received** → function re-invoked from scratch
4. **Replay** skips completed steps, resumes at callback point
5. **But client needs to reconnect** to receive new data

```typescript
// Durable Lambda pattern
export const handler = durableHandler(async (event, ctx: DurableContext) => {
  const stream = createResponseStream();

  // Stream current data
  const persons = await ctx.step('getPersons', getAllPersons);
  for (const p of persons) stream.write(formatSSE(p));

  // Create callback for next update
  const callback = await ctx.createCallback();
  await storeCallbackId(callback.id, ctx.executionId);

  // Tell client to reconnect
  stream.write(formatSSE({ type: 'pause', executionId: ctx.executionId }));
  stream.end(); // HTTP CONNECTION CLOSES HERE

  // Wait (no compute charges!)
  const data = await ctx.waitForCallback(callback);

  // Function re-invoked here - client must have reconnected!
  // ... stream new data ...
});
```

**Client must handle reconnection:**

```typescript
function useDurableSync(executionId: string) {
  useEffect(() => {
    const es = new EventSource(`/api/sync?executionId=${executionId}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'pause') {
        // Server is pausing - reconnect after delay
        es.close();
        setTimeout(() => reconnect(data.executionId), 1000);
      } else {
        applyChange(data);
      }
    };
  }, [executionId]);
}
```

**Pros:**

- ✅ **Zero cost during wait** - no compute charges while waiting for callback
- ✅ **Up to 1 year execution** - long-running workflows supported
- ✅ **Built-in checkpointing** - automatic retry and recovery
- ✅ **No polling** - callbacks trigger immediate resumption
- ✅ **No Event Store needed** - state managed by durable execution

**Cons:**

- ❌ **Connection breaks on wait** - client must reconnect after each callback
- ❌ **Higher latency** - reconnect overhead on each update
- ❌ **Complex client code** - must track executionId, handle reconnects
- ❌ **Callback table required** - still need table to map callbacks to executions
- ❌ **New feature** - less production experience, smaller community
- ❌ **Checkpoint costs** - charges for checkpoint storage and operations

**Estimated Cost:** Varies significantly based on callback frequency - see cost comparison below.

---

### 14.0 Cost Comparison Across All Options

#### Pricing Components by Option

| Component         | WebSocket (A)     | AppSync (B)   | IoT Core (C)  | Third-Party (D) | SSE+EventStore (E)   | Durable Functions (F)   |
| ----------------- | ----------------- | ------------- | ------------- | --------------- | -------------------- | ----------------------- |
| **Connection**    | $0.25/M msgs      | $2/M ops      | $0.08/M msgs  | $0.01-0.05/msg  | API GW data transfer | Checkpoint ops          |
| **Compute**       | Lambda always     | Lambda always | Lambda always | N/A             | Lambda always        | Lambda only during work |
| **Storage**       | Connections table | N/A           | N/A           | N/A             | Events table         | Checkpoint storage      |
| **Data transfer** | WebSocket data    | GraphQL data  | MQTT data     | Included        | SSE data             | SSE data                |

#### Scenario 1: Small App (10 concurrent users, 8-hour sessions, 50 events/day)

| Option                    | Monthly Cost | Notes                                          |
| ------------------------- | ------------ | ---------------------------------------------- |
| **WebSocket (A)**         | ~$5          | Low message volume, minimal Lambda             |
| **AppSync (B)**           | ~$15         | GraphQL operation overhead                     |
| **IoT Core (C)**          | ~$3          | Most cost-effective at low scale               |
| **Third-Party (D)**       | ~$0-10       | Often free tier covers this                    |
| **SSE+EventStore (E)**    | ~$5          | Events table + streaming Lambda                |
| **Durable Functions (F)** | ~$8          | 10 users × 50 events × 30 days = 15K callbacks |

#### Scenario 2: Medium App (100 concurrent users, 8-hour sessions, 200 events/day)

| Option                    | Monthly Cost | Notes                                             |
| ------------------------- | ------------ | ------------------------------------------------- |
| **WebSocket (A)**         | ~$15         | 100 connections × 8h × 30 days                    |
| **AppSync (B)**           | ~$40         | Higher per-operation cost                         |
| **IoT Core (C)**          | ~$10         | Scales well                                       |
| **Third-Party (D)**       | ~$50-100     | Per-message pricing adds up                       |
| **SSE+EventStore (E)**    | ~$12         | Lambda compute + Events table                     |
| **Durable Functions (F)** | ~$35         | 100 users × 200 events × 30 days = 600K callbacks |

#### Scenario 3: Large App (1000 concurrent users, 8-hour sessions, 500 events/day)

| Option                    | Monthly Cost | Notes                                             |
| ------------------------- | ------------ | ------------------------------------------------- |
| **WebSocket (A)**         | ~$80         | Connection management overhead                    |
| **AppSync (B)**           | ~$200        | GraphQL ops expensive at scale                    |
| **IoT Core (C)**          | ~$50         | Built for massive scale                           |
| **Third-Party (D)**       | ~$500-2000   | Per-message pricing explodes                      |
| **SSE+EventStore (E)**    | ~$60         | Events table queries + Lambda                     |
| **Durable Functions (F)** | ~$250        | 1000 users × 500 events × 30 days = 15M callbacks |

#### Scenario 4: High-Frequency Updates (100 users, 8-hour sessions, 2000 events/day)

| Option                    | Monthly Cost | Notes                             |
| ------------------------- | ------------ | --------------------------------- |
| **WebSocket (A)**         | ~$40         | Handles high frequency well       |
| **AppSync (B)**           | ~$120        | Per-operation adds up             |
| **IoT Core (C)**          | ~$25         | MQTT efficient for high frequency |
| **Third-Party (D)**       | ~$300+       | Per-message kills budget          |
| **SSE+EventStore (E)**    | ~$35         | Batch queries efficient           |
| **Durable Functions (F)** | ~$150        | Callback overhead significant     |

#### Cost Breakdown: Durable Functions (F) Detail

**Durable Functions Pricing (as of Jan 2026):**

- **Checkpoint operations**: $0.025 per 1000 checkpoint writes
- **Checkpoint storage**: $0.03 per GB-month
- **Callback operations**: $0.25 per 1M callback submissions
- **Lambda compute**: Standard Lambda pricing (only during active execution)

**Example: 100 users × 200 events/day × 30 days = 600,000 callbacks/month**

| Component            | Calculation                        | Cost           |
| -------------------- | ---------------------------------- | -------------- |
| Callback submissions | 600K × $0.25/M                     | $0.15          |
| Checkpoint writes    | 600K × 2 per callback × $0.025/K   | $30.00         |
| Checkpoint storage   | ~10KB × 600K × $0.03/GB            | $0.18          |
| Lambda compute       | ~100ms × 600K × $0.0000166667/GB-s | $1.00          |
| **Total**            |                                    | **~$31/month** |

**Key insight:** Checkpoint write costs dominate at high callback frequency!

#### Cost Breakdown: SSE + Event Store (E) Detail

**Example: 100 users × 200 events/day × 30 days**

| Component                 | Calculation                                       | Cost          |
| ------------------------- | ------------------------------------------------- | ------------- |
| Events table writes       | 6K events × $1.25/M WCU                           | $0.01         |
| Events table reads        | 100 users × 24 queries/h × 8h × 30d × $0.25/M RCU | $1.44         |
| Events table storage      | ~1KB × 6K events × 30 days × $0.25/GB             | $0.05         |
| Lambda (stream processor) | 6K invocations × 100ms × $0.0000166667            | $0.01         |
| Lambda (SSE streaming)    | 100 users × 8h × 30d × $0.0000166667/GB-s         | $4.00         |
| API Gateway data transfer | ~1MB/user/day × 100 × 30 × $0.09/GB               | $0.27         |
| **Total**                 |                                                   | **~$6/month** |

---

#### Cost Comparison: Real-Time SSE vs Polling (Refetch All Data)

Sometimes the simplest solution is best. Let's compare real-time sync vs periodic full refetch.

**Base Assumptions:**

- **Users**: 100 concurrent users, 8-hour sessions
- **Changes**: 200 events/day (relatively low change rate)
- **Record size**: ~2KB average per person record

##### Data Size Impact on Polling Costs

**Polling fetches ALL data on every request.** Larger datasets = more bandwidth = higher costs.

| Records    | Data Size | Poll 60s/month | Poll 30s/month | Poll 10s/month | Poll 5s/month |
| ---------- | --------- | -------------- | -------------- | -------------- | ------------- |
| **100**    | 200KB     | ~$3            | ~$6            | ~$18           | ~$36          |
| **1,000**  | 2MB       | ~$9            | ~$18           | ~$55           | ~$111         |
| **5,000**  | 10MB      | ~$35           | ~$70           | ~$210          | ~$420         |
| **10,000** | 20MB      | ~$68           | ~$136          | ~$408          | ~$816         |

_100 users × 8h sessions × 30 days. Costs include Lambda compute, API Gateway, DynamoDB reads, and data transfer._

##### SSE Costs (Independent of Dataset Size!)

**SSE only sends changes, not full dataset.** Cost is based on event count, not data size.

| Records    | Data Size | SSE Cost/month | Notes                          |
| ---------- | --------- | -------------- | ------------------------------ |
| **100**    | 200KB     | ~$6            | Same! Only 200 events/day sent |
| **1,000**  | 2MB       | ~$6            | Same! Only 200 events/day sent |
| **5,000**  | 10MB      | ~$6            | Same! Only 200 events/day sent |
| **10,000** | 20MB      | ~$6            | Same! Only 200 events/day sent |

_Initial sync on connect adds ~$0.50/month for larger datasets, but ongoing cost is event-based._

##### Cost Comparison by Dataset Size (100 users, Poll 60s vs SSE)

| Records    | Poll 60s | SSE Real-Time | SSE Savings    | Winner       |
| ---------- | -------- | ------------- | -------------- | ------------ |
| **100**    | $3       | $6            | -$3 (50% more) | **Poll 60s** |
| **1,000**  | $9       | $6            | $3 (33% less)  | **SSE**      |
| **5,000**  | $35      | $6            | $29 (83% less) | **SSE**      |
| **10,000** | $68      | $6            | $62 (91% less) | **SSE**      |

**Key Insight:** SSE advantage grows dramatically with dataset size!

##### Detailed Breakdown: 5,000 Records Example

**Polling 60s (5,000 records = 10MB dataset):**

| Component            | Calculation                           | Cost           |
| -------------------- | ------------------------------------- | -------------- |
| Lambda invocations   | 1.44M × $0.20/M                       | $0.29          |
| Lambda compute       | 1.44M × 200ms × 128MB × $0.0000166667 | $0.61          |
| API Gateway requests | 1.44M × $3.50/M                       | $5.04          |
| API Gateway data out | 10MB × 480 × 100 × 30 × $0.09/GB      | $12.96         |
| DynamoDB reads       | 5K items × 1.44M scans × $0.25/M RCU  | $14.40         |
| **Total**            |                                       | **~$35/month** |

**SSE Real-Time (5,000 records, 200 events/day):**

| Component              | Calculation                                           | Cost          |
| ---------------------- | ----------------------------------------------------- | ------------- |
| Events table writes    | 6K events × $1.25/M WCU                               | $0.01         |
| Events table reads     | 100 users × 24 queries/h × 8h × 30d × $0.25/M RCU     | $1.44         |
| Lambda (SSE streaming) | 100 users × 8h × 30d × $0.0000166667/GB-s             | $4.00         |
| API Gateway data out   | 2KB × 200 events × 30 days × $0.09/GB                 | $0.01         |
| Initial sync (connect) | 10MB × 100 users × 0.5 reconnects/day × 30 × $0.09/GB | $0.14         |
| **Total**              |                                                       | **~$6/month** |

##### Bandwidth Comparison by Dataset Size

| Records    | Data Size | Poll 60s/user/day | Poll 5s/user/day | SSE/user/day |
| ---------- | --------- | ----------------- | ---------------- | ------------ |
| **100**    | 200KB     | 96MB              | 1.2GB            | ~0.4MB       |
| **1,000**  | 2MB       | 960MB             | 11.5GB           | ~0.4MB       |
| **5,000**  | 10MB      | 4.8GB             | 57.6GB           | ~0.4MB       |
| **10,000** | 20MB      | 9.6GB             | 115.2GB          | ~0.4MB       |

**For mobile users or metered connections, SSE bandwidth savings are significant!**

##### Break-Even Analysis by Dataset Size

**At what user count does SSE become cheaper than Poll 60s?**

| Records    | Data Size | Break-Even Users | Recommendation             |
| ---------- | --------- | ---------------- | -------------------------- |
| **100**    | 200KB     | ~200 users       | Poll 60s unless many users |
| **1,000**  | 2MB       | ~40 users        | SSE for 40+ users          |
| **5,000**  | 10MB      | ~10 users        | SSE almost always better   |
| **10,000** | 20MB      | ~5 users         | SSE almost always better   |

**Key Insight:** Larger datasets = SSE becomes cost-effective at lower user counts!

---

##### Option: Polling Detail (1,000 records baseline)

| Poll Interval  | Requests/User/Day | Total Requests/Month | Lambda Cost | API GW Cost | DynamoDB Cost | Total           |
| -------------- | ----------------- | -------------------- | ----------- | ----------- | ------------- | --------------- |
| **60 seconds** | 480               | 1.44M                | $2.40       | $5.04       | $1.80         | **~$9/month**   |
| **30 seconds** | 960               | 2.88M                | $4.80       | $10.08      | $3.60         | **~$18/month**  |
| **10 seconds** | 2880              | 8.64M                | $14.40      | $30.24      | $10.80        | **~$55/month**  |
| **5 seconds**  | 5760              | 17.28M               | $28.80      | $60.48      | $21.60        | **~$111/month** |

_Calculation basis: Lambda $0.20/M invocations + $0.0000166667/GB-s, API GW $3.50/M requests, DynamoDB $1.25/M RCU_

##### Option: SSE + Event Store (Real-Time)

| Component                     | Cost          |
| ----------------------------- | ------------- |
| Events table (writes + reads) | $1.50         |
| Lambda (stream processor)     | $0.01         |
| Lambda (SSE streaming 8h/day) | $4.00         |
| API Gateway data transfer     | $0.27         |
| **Total**                     | **~$6/month** |

---

##### Option: Delta Polling (Poll for Changes Only) ⭐ NEW

**Concept:** Client polls every 1-5 seconds, but server only returns **changed data since last sync**, not the full dataset. This avoids:

- Full dataset transfer on every poll (bandwidth savings)
- Long-running Lambda per user (cost savings vs SSE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DELTA POLLING ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client: GET /api/sync?since=2026-01-03T10:30:00.000Z                       │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Lambda (short-lived, ~50-100ms)                                     │    │
│  │  1. Query Events table WHERE sk > since                              │    │
│  │  2. Return changed records (or empty array)                          │    │
│  │  3. Exit immediately                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  Response: { changes: [...], lastEventId: "2026-01-03T10:30:05.123Z" }      │
│                                                                              │
│  Client waits 1 second, then polls again with new lastEventId               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Server: Delta sync endpoint
const getDeltaChanges = createServerFn({ method: 'GET' })
  .validator(z.object({ since: z.string().optional() }))
  .handler(async ({ data }) => {
    const since = data.since || new Date(0).toISOString();

    // Query Events table for changes since last sync
    const events = await eventsTable
      .query({
        pk: 'PERSON_EVENTS',
        sk: { $gt: since },
      })
      .go();

    return {
      changes: events.data,
      lastEventId: events.data.at(-1)?.sk || since,
      hasMore: events.data.length === 100, // pagination
    };
  });

// Client: Delta polling hook
function useDeltaSync(collectionName: string) {
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  useEffect(() => {
    const poll = async () => {
      const { changes, lastEventId: newId } = await getDeltaChanges({
        since: lastEventId,
      });

      if (changes.length > 0) {
        for (const change of changes) {
          applyChangeToCollection(collectionName, change);
        }
        setLastEventId(newId);
      }
    };

    // Poll every 1 second
    const interval = setInterval(poll, 1000);
    poll(); // Initial poll

    return () => clearInterval(interval);
  }, [lastEventId, collectionName]);
}
```

**Cost Breakdown: Delta Polling (100 users, 1-second interval)**

| Component           | Calculation                                       | Cost               |
| ------------------- | ------------------------------------------------- | ------------------ |
| Events table writes | 6K events × $1.25/M WCU                           | $0.01              |
| Events table reads  | 100 users × 3600 polls/h × 8h × 30d × $0.25/M RCU | $21.60             |
| Lambda invocations  | 86.4M × $0.20/M                                   | $17.28             |
| Lambda compute      | 86.4M × 50ms × 128MB × $0.0000166667              | $1.15              |
| API Gateway         | 86.4M × $3.50/M                                   | $302.40            |
| Data transfer       | ~2KB avg × 86.4M × $0.09/GB                       | $15.55             |
| **Total**           |                                                   | **~$358/month** 😱 |

**Ouch!** 1-second polling is expensive due to API Gateway costs.

**Let's try 5-second interval:**

| Component          | Calculation                                | Cost           |
| ------------------ | ------------------------------------------ | -------------- |
| Events table reads | 100 × 720 polls/h × 8h × 30d × $0.25/M RCU | $4.32          |
| Lambda invocations | 17.28M × $0.20/M                           | $3.46          |
| Lambda compute     | 17.28M × 50ms × 128MB × $0.0000166667      | $0.23          |
| API Gateway        | 17.28M × $3.50/M                           | $60.48         |
| Data transfer      | ~2KB avg × 17.28M × $0.09/GB               | $3.11          |
| **Total**          |                                            | **~$72/month** |

**And 10-second interval:**

| Component         | Calculation     | Cost           |
| ----------------- | --------------- | -------------- |
| API Gateway       | 8.64M × $3.50/M | $30.24         |
| Lambda + DynamoDB |                 | $4.00          |
| **Total**         |                 | **~$35/month** |

##### Delta Polling Cost Comparison

| Poll Interval     | Latency (avg) | Monthly Cost | vs Full Poll        | vs SSE      |
| ----------------- | ------------- | ------------ | ------------------- | ----------- |
| **1 second**      | 0.5s          | ~$358        | Cheaper (bandwidth) | ❌ 60x more |
| **5 seconds**     | 2.5s          | ~$72         | Cheaper (bandwidth) | ❌ 12x more |
| **10 seconds**    | 5s            | ~$35         | Similar             | ❌ 6x more  |
| **30 seconds**    | 15s           | ~$12         | Similar             | ❌ 2x more  |
| **SSE Real-Time** | <1s           | ~$6          | -                   | ✅ Baseline |

**Key Insight:** API Gateway per-request pricing ($3.50/M) dominates at high poll frequencies!

##### When Delta Polling Makes Sense

| Scenario                                | Best Approach                            |
| --------------------------------------- | ---------------------------------------- |
| **Need < 5s latency, many users**       | SSE (Lambda cost < API GW cost)          |
| **Need 10-30s latency**                 | Delta Polling 10-30s (simpler than SSE)  |
| **Very few users (< 10)**               | Delta Polling 5s (fixed cost manageable) |
| **API Gateway HTTP API**                | Delta Polling cheaper ($1/M vs $3.50/M)  |
| **Serverless purist (no long Lambdas)** | Delta Polling with HTTP API              |

##### Optimization: Use HTTP API Instead of REST API

API Gateway **HTTP API** is much cheaper: $1.00/M vs $3.50/M

| Poll Interval  | REST API Cost | HTTP API Cost | Savings |
| -------------- | ------------- | ------------- | ------- |
| **1 second**   | ~$358         | ~$105         | 71%     |
| **5 seconds**  | ~$72          | ~$22          | 69%     |
| **10 seconds** | ~$35          | ~$12          | 66%     |

**With HTTP API, Delta Polling 10s costs ~$12/month** - comparable to SSE!

##### Delta Polling vs SSE: Feature Comparison

| Feature                 | Delta Polling                 | SSE Real-Time          |
| ----------------------- | ----------------------------- | ---------------------- |
| **Latency**             | Poll interval (1-30s)         | < 1 second             |
| **Lambda duration**     | ~50ms per request             | 15 min continuous      |
| **Concurrent Lambdas**  | Shared (scales with requests) | 1 per user             |
| **Cold starts**         | Frequent (but fast)           | Rare (long-running)    |
| **Connection handling** | None (HTTP request/response)  | EventSource management |
| **Reconnection**        | Automatic (new request)       | Built-in (lastEventId) |
| **Infrastructure**      | Events table (same as SSE)    | Events table           |
| **Complexity**          | Low                           | Medium                 |
| **Best for**            | 10-30s latency OK             | Real-time needed       |

##### Recommendation: Delta Polling vs SSE

```
                    ┌────────────────────────────────────┐
                    │  What latency is acceptable?       │
                    └───────────────────┬────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
       < 5 seconds               5-30 seconds                 > 30 seconds
            │                           │                           │
            ▼                           ▼                           ▼
    ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
    │ SSE Real-Time │           │ Delta Polling │           │ Full Polling  │
    │ (~$6/month)   │           │ (~$12-35/mo)  │           │ (~$9/month)   │
    └───────────────┘           └───────────────┘           └───────────────┘
```

**For this project:** If 5-10 second latency is acceptable and you want simpler infrastructure (no long-running Lambdas), Delta Polling with HTTP API at 10-second intervals is a solid choice at ~$12/month.

---

##### Comparison Table: Polling vs Real-Time (1,000 records)

| Metric                    | Poll 60s                | Poll 30s  | Poll 10s  | Poll 5s   | SSE Real-Time  |
| ------------------------- | ----------------------- | --------- | --------- | --------- | -------------- |
| **Monthly Cost**          | ~$9                     | ~$18      | ~$55      | ~$111     | **~$6**        |
| **Latency (avg)**         | 30s                     | 15s       | 5s        | 2.5s      | **<1s**        |
| **Latency (max)**         | 60s                     | 30s       | 10s       | 5s        | **<1s**        |
| **Wasted requests**       | 99.6%\*                 | 99.6%\*   | 99.6%\*   | 99.6%\*   | **0%**         |
| **Bandwidth/user/day**    | 960MB                   | 1.9GB     | 5.8GB     | 11.5GB    | **~0.4MB**     |
| **Complexity**            | Very Low                | Very Low  | Very Low  | Very Low  | Medium         |
| **Infrastructure**        | None                    | None      | None      | None      | Events table   |
| **Scales with data size** | ❌ Linear cost increase | ❌ Linear | ❌ Linear | ❌ Linear | ✅ Independent |

_\*With 200 events/day and 480-5760 requests/day, only 0.4% of requests return new data_

##### When Polling Makes Sense

| Scenario                                 | Recommendation                                    |
| ---------------------------------------- | ------------------------------------------------- |
| **< 10 users AND < 500 records**         | Full Poll 60s - simpler, cost similar             |
| **Data changes rarely (< 10/day)**       | Full Poll 60s - real-time unnecessary             |
| **Latency 5-30s OK, avoid long Lambdas** | Delta Polling 10s - best of both worlds           |
| **Latency not critical (> 30s OK)**      | Full Poll 60s - much simpler                      |
| **Prototype/MVP**                        | Full Poll 30s - fastest to implement              |
| **> 1000 records, 5-30s latency OK**     | Delta Polling 10s - bandwidth efficient           |
| **> 1000 records, < 5s latency needed**  | SSE Real-Time - only option                       |
| **> 50 users, < 5s latency**             | SSE Real-Time - most cost-effective               |
| **High change frequency (> 100/day)**    | Delta Polling or SSE - avoid full refetch         |
| **Mobile users**                         | Delta Polling or SSE - bandwidth savings critical |

##### Break-Even Analysis (Full Polling vs SSE vs Delta Polling)

**At what point does each approach become optimal?**

| Users | Full Poll 60s | Delta Poll 10s (HTTP API) | SSE Real-Time | Best Choice   |
| ----- | ------------- | ------------------------- | ------------- | ------------- |
| 10    | $0.90         | $1.20                     | $1.50         | Full Poll 60s |
| 25    | $2.25         | $3.00                     | $2.50         | Full Poll 60s |
| 50    | $4.50         | $6.00                     | $4.00         | **SSE**       |
| 100   | $9.00         | $12.00                    | $6.00         | **SSE**       |
| 500   | $45.00        | $60.00                    | $25.00        | **SSE**       |

**But for latency considerations:**

| Latency Need     | < 25 users          | 25-50 users        | > 50 users         |
| ---------------- | ------------------- | ------------------ | ------------------ |
| **< 5 seconds**  | SSE (~$2.50)        | SSE (~$4)          | SSE (~$6+)         |
| **5-30 seconds** | Delta Poll (~$1.50) | Delta Poll (~$4)   | Delta Poll (~$8)   |
| **> 30 seconds** | Full Poll (~$0.90)  | Full Poll (~$2.25) | Full Poll (~$4.50) |

**Key Insight:**

- **SSE wins** for real-time (< 5s) at any scale above ~25 users
- **Delta Polling wins** for 5-30s latency at smaller scale (avoids long-running Lambdas)
- **Full Polling wins** for > 30s latency (simplest)

##### Hybrid Approach: Polling with Invalidation Hints

A middle ground: poll infrequently, but use SSE just to send "data changed" hints:

```typescript
// Lightweight SSE - only sends invalidation signals
const es = new EventSource('/api/invalidate');
es.onmessage = () => {
  // Something changed - refetch full data
  queryClient.invalidateQueries(['persons']);
};

// TanStack Query handles the refetch
const { data } = useQuery({
  queryKey: ['persons'],
  queryFn: fetchAllPersons,
  staleTime: 60_000, // Also poll every 60s as fallback
});
```

| Component                         | Cost             |
| --------------------------------- | ---------------- |
| SSE Lambda (minimal - just pings) | $0.50            |
| Full refetch on change (200/day)  | $0.02            |
| Fallback poll every 60s           | $9.00            |
| **Total**                         | **~$9.50/month** |

This hybrid is slightly more expensive than pure SSE but much simpler - no Event Store, no incremental updates, just "refetch when notified".

---

#### Summary: When to Use Each Option

| Scenario                                | Best Option                               | Why                                  |
| --------------------------------------- | ----------------------------------------- | ------------------------------------ |
| **< 40 users, > 30s latency OK**        | Full Polling 60s                          | Simplest, cheapest                   |
| **< 40 users, 5-30s latency OK**        | Delta Polling 10s                         | Bandwidth efficient, no long Lambdas |
| **< 40 users, < 5s latency needed**     | SSE+EventStore (E)                        | Real-time                            |
| **40+ users, real-time needed**         | SSE+EventStore (E)                        | Most cost-effective                  |
| **Avoid long-running Lambdas**          | Delta Polling 10s                         | Short request/response only          |
| **Need bidirectional**                  | WebSocket (A)                             | Only option for client→server push   |
| **Existing GraphQL API**                | AppSync (B)                               | Reuse existing infrastructure        |
| **Massive scale (10K+ users)**          | IoT Core (C)                              | Built for millions of connections    |
| **Quick prototype**                     | Full Polling 60s or Third-Party (D)       | Fastest to implement                 |
| **Very infrequent updates (< 10/day)**  | Full Polling 60s or Durable Functions (F) | Real-time unnecessary                |
| **High-frequency updates (>100/day)**   | Delta Polling or SSE                      | Full polling wastes bandwidth        |
| **Long-running workflows (hours/days)** | Durable Functions (F)                     | Designed for this                    |
| **Real-time collaboration**             | WebSocket (A) or SSE (E)                  | Lowest latency                       |

---

### 14.1 Recommendation Comparison

| Criteria                  | Full Poll 60s     | Delta Poll 10s   | SSE Real-Time     | WebSocket         | Durable Funcs        |
| ------------------------- | ----------------- | ---------------- | ----------------- | ----------------- | -------------------- |
| **Complexity**            | Very Low          | Low              | Medium            | Medium            | Medium               |
| **Connection Model**      | Request/response  | Request/response | Persistent SSE    | Persistent WS     | Disconnect/reconnect |
| **Lambda Duration**       | ~100ms            | ~50ms            | 15 min continuous | 15 min continuous | ~100ms bursts        |
| **Concurrent Lambdas**    | Shared pool       | Shared pool      | 1 per user        | 1 per user        | Shared pool          |
| **Client Code**           | Simple `useQuery` | Custom poll hook | `EventSource` API | Custom WS         | Complex              |
| **Debugging**             | Very easy         | Easy             | Standard HTTP     | WS inspector      | Execution console    |
| **Bidirectional**         | ❌ No             | ❌ No            | ❌ No             | ✅ Yes            | ❌ No                |
| **Latency (avg)**         | 30s               | 5s               | <1s               | ~50ms             | ~1-2s                |
| **Cost during idle**      | ✅ Zero           | ✅ Zero          | Lambda running    | Lambda running    | ✅ Zero              |
| **Bandwidth efficiency**  | ❌ Full refetch   | ✅ Changes only  | ✅ Changes only   | ✅ Changes only   | ✅ Changes only      |
| **Scales with data size** | ❌ Linear         | ✅ Independent   | ✅ Independent    | ✅ Independent    | ✅ Independent       |
| **Infrastructure**        | None              | Events table     | Events table      | Connection table  | Callback table       |
| **Best For**              | Simple, > 30s OK  | 5-30s, no long λ | Real-time         | Bidirectional     | Workflows            |
| **Cost (100 users)**      | ~$9/mo            | ~$12/mo          | ~$6/mo            | ~$15/mo           | ~$35/mo              |

### 14.2 Updated Recommendation

**Decision Tree:**

```
                            ┌─────────────────────────────┐
                            │  How many concurrent users? │
                            └──────────────┬──────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
              < 40 users            40-1000 users            > 1000 users
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
        │ Is latency < 30s  │   │ Need bidirectional│   │ Use IoT Core (C)  │
        │ important?        │   │ (client→server)?  │   │ or third-party    │
        └─────────┬─────────┘   └─────────┬─────────┘   └───────────────────┘
                  │                       │
          ┌───────┴───────┐       ┌───────┴───────┐
          ▼               ▼       ▼               ▼
         No              Yes     No              Yes
          │               │       │               │
          ▼               ▼       ▼               ▼
   ┌────────────┐  ┌────────────┐ │        ┌────────────┐
   │ Polling    │  │ Hybrid or  │ │        │ WebSocket  │
   │ 60 seconds │  │ SSE Real-  │ │        │ (Option A) │
   │ (simplest) │  │ Time       │ │        └────────────┘
   └────────────┘  └────────────┘ │
                                  ▼
                         ┌───────────────────┐
                         │ SSE + Event Store │
                         │ (Option E) ⭐      │
                         └───────────────────┘
```

**For this project (Persons DB sync):**

| Factor              | Our Situation         | Implication                     |
| ------------------- | --------------------- | ------------------------------- |
| Expected users      | 10-100 concurrent     | Polling or SSE both viable      |
| Update frequency    | ~50-200 events/day    | Not high enough for SSE savings |
| Latency requirement | < 5 seconds preferred | Polling 60s too slow            |
| Bidirectional       | Not needed            | SSE sufficient                  |
| Complexity budget   | Medium                | Can handle Event Store          |

**Selected: SSE + API Gateway Response Streaming + Event Store (Option E)** ⭐

Rationale:

1. **Future-proof**: Scales cost-effectively as users grow
2. **Sub-second latency**: Much better UX than polling
3. **Native browser support**: `EventSource` API handles reconnection automatically
4. **Lower bandwidth**: Only sends changes, not full dataset
5. **Easier debugging**: Standard HTTP requests, works with curl
6. **AWS-native**: Integrates well with existing CDK infrastructure
7. **ElectroDB compatible**: Parse stream records with existing entity schemas

**Alternative for MVP/Prototype:**
If time is limited, start with **Polling 60s** or **Hybrid approach** - can always upgrade to full SSE later.

**When to consider Durable Functions (F) instead:**

- Updates are very infrequent (< 10/day per user)
- Need workflows that span hours/days (e.g., approval processes)
- Minimizing compute cost during idle is critical
- Reconnection latency of 1-2 seconds is acceptable

---

## 15. Implementation Plan: Real-Time Sync

### Phase RT-1: CDK Infrastructure

#### 15.1.1 Enable DynamoDB Streams

```typescript
// lib/constructs/DatabasePersons.ts
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

export class DatabasePersons extends Construct {
  public readonly dbPersons: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dbPersons = new Table(this, 'Persons', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      // Enable streams for real-time sync
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // ... existing GSI1 ...
  }
}
```

#### 15.1.2 Create WebSocket Connections Table

```typescript
// lib/constructs/WebSocketConnections.ts
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class WebSocketConnections extends Construct {
  public readonly connectionsTable: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.connectionsTable = new Table(this, 'Connections', {
      partitionKey: { name: 'connectionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-cleanup stale connections
    });
  }
}
```

#### 15.1.3 Create WebSocket API Construct

```typescript
// lib/constructs/WebSocketApi.ts
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface WebSocketApiProps {
  connectionsTable: Table;
}

export class PersonsWebSocketApi extends Construct {
  public readonly wsApi: WebSocketApi;
  public readonly wsStage: WebSocketStage;
  public readonly wsEndpoint: string;

  constructor(scope: Construct, id: string, props: WebSocketApiProps) {
    super(scope, id);

    // $connect handler - stores connection ID
    const connectHandler = new NodejsFunction(this, 'ConnectHandler', {
      entry: 'src/lambda/ws-connect.ts',
      environment: {
        CONNECTIONS_TABLE: props.connectionsTable.tableName,
      },
    });
    props.connectionsTable.grantWriteData(connectHandler);

    // $disconnect handler - removes connection ID
    const disconnectHandler = new NodejsFunction(this, 'DisconnectHandler', {
      entry: 'src/lambda/ws-disconnect.ts',
      environment: {
        CONNECTIONS_TABLE: props.connectionsTable.tableName,
      },
    });
    props.connectionsTable.grantWriteData(disconnectHandler);

    // WebSocket API
    this.wsApi = new WebSocketApi(this, 'PersonsWsApi', {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration('ConnectIntegration', connectHandler),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', disconnectHandler),
      },
    });

    this.wsStage = new WebSocketStage(this, 'ProdStage', {
      webSocketApi: this.wsApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    this.wsEndpoint = this.wsStage.url;
  }
}
```

#### 15.1.4 Create Stream Processor Lambda

```typescript
// lib/constructs/StreamProcessor.ts
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface StreamProcessorProps {
  personsTable: Table;
  connectionsTable: Table;
  wsApi: WebSocketApi;
  wsStage: WebSocketStage;
}

export class StreamProcessor extends Construct {
  constructor(scope: Construct, id: string, props: StreamProcessorProps) {
    super(scope, id);

    const processor = new NodejsFunction(this, 'Processor', {
      entry: 'src/lambda/stream-processor.ts',
      environment: {
        CONNECTIONS_TABLE: props.connectionsTable.tableName,
        WS_ENDPOINT: props.wsStage.callbackUrl,
      },
      timeout: Duration.seconds(30),
    });

    // Read connections table
    props.connectionsTable.grantReadData(processor);

    // Permission to post to WebSocket connections
    processor.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${props.wsApi.apiId}/${props.wsStage.stageName}/POST/@connections/*`,
        ],
      }),
    );

    // Trigger from DynamoDB Stream
    processor.addEventSource(
      new DynamoEventSource(props.personsTable, {
        startingPosition: StartingPosition.TRIM_HORIZON,
        batchSize: 100,
        maxBatchingWindow: Duration.seconds(1), // Batch for 1 second max
        retryAttempts: 3,
      }),
    );
  }
}
```

---

### Phase RT-2: Lambda Handlers

#### 15.2.1 WebSocket Connect Handler

```typescript
// src/lambda/ws-connect.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h TTL

  await ddbClient.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        connectedAt: new Date().toISOString(),
        ttl,
      },
    }),
  );

  return { statusCode: 200, body: 'Connected' };
};
```

#### 15.2.2 WebSocket Disconnect Handler

```typescript
// src/lambda/ws-disconnect.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  await ddbClient.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    }),
  );

  return { statusCode: 200, body: 'Disconnected' };
};
```

#### 15.2.3 Stream Processor with ElectroDB Parsing

```typescript
// src/lambda/stream-processor.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const WS_ENDPOINT = process.env.WS_ENDPOINT!;

const wsClient = new ApiGatewayManagementApiClient({
  endpoint: WS_ENDPOINT,
});

// Entity type detection based on SK pattern
function detectEntityType(sk: string): string {
  if (sk === 'PROFILE') return 'person';
  if (sk.startsWith('ADDRESS#')) return 'address';
  if (sk.startsWith('BANK#')) return 'bankAccount';
  if (sk.startsWith('CONTACT#')) return 'contactInfo';
  if (sk.startsWith('EMPLOYMENT#')) return 'employment';
  return 'unknown';
}

// Parse DynamoDB Stream record to domain entity
function parseStreamRecord(record: DynamoDBRecord): {
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  entityType: string;
  entity: Record<string, unknown> | null;
  oldEntity: Record<string, unknown> | null;
  keys: { pk: string; sk: string };
} {
  const eventType = record.eventName as 'INSERT' | 'MODIFY' | 'REMOVE';
  const newImage = record.dynamodb?.NewImage
    ? unmarshall(record.dynamodb.NewImage as Record<string, any>)
    : null;
  const oldImage = record.dynamodb?.OldImage
    ? unmarshall(record.dynamodb.OldImage as Record<string, any>)
    : null;

  const keys = record.dynamodb?.Keys
    ? unmarshall(record.dynamodb.Keys as Record<string, any>)
    : { pk: '', sk: '' };

  const entityType = detectEntityType(keys.sk);

  // Remove DynamoDB-specific fields, keep domain fields
  const cleanEntity = (item: Record<string, unknown> | null) => {
    if (!item) return null;
    const { pk, sk, gsi1pk, gsi1sk, __edb_e__, __edb_v__, ...domainFields } = item;
    return domainFields;
  };

  return {
    eventType,
    entityType,
    entity: cleanEntity(newImage),
    oldEntity: cleanEntity(oldImage),
    keys: keys as { pk: string; sk: string },
  };
}

export const handler: DynamoDBStreamHandler = async (event) => {
  // Get all active connections
  const connectionsResult = await ddbClient.send(
    new ScanCommand({
      TableName: CONNECTIONS_TABLE,
      ProjectionExpression: 'connectionId',
    }),
  );

  const connections = connectionsResult.Items ?? [];
  if (connections.length === 0) return;

  // Process stream records
  const messages = event.Records.map(parseStreamRecord).filter((r) => r.entityType !== 'unknown');

  if (messages.length === 0) return;

  // Batch message for all changes in this stream batch
  const payload = JSON.stringify({
    type: 'SYNC',
    timestamp: new Date().toISOString(),
    changes: messages.map((m) => ({
      eventType: m.eventType,
      entityType: m.entityType,
      entity: m.entity,
      oldEntity:
        m.entityType === 'person' && m.eventType === 'REMOVE'
          ? m.oldEntity // Include old data for person deletes (to get ID)
          : undefined,
    })),
  });

  // Broadcast to all connections
  const postPromises = connections.map(async ({ connectionId }) => {
    try {
      await wsClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: payload,
        }),
      );
    } catch (error: any) {
      // Connection gone - will be cleaned up by TTL or disconnect
      if (error.statusCode === 410) {
        console.log(`Stale connection: ${connectionId}`);
      } else {
        console.error(`Error posting to ${connectionId}:`, error);
      }
    }
  });

  await Promise.all(postPromises);
};
```

---

### Phase RT-3: Client-Side Integration

#### 15.3.1 WebSocket Hook

```typescript
// src/webapp/hooks/useWebSocketSync.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  personsCollection,
  addressesCollection,
  bankAccountsCollection,
  contactsCollection,
  employmentsCollection,
} from '#src/webapp/db-collections/persons';

interface SyncMessage {
  type: 'SYNC';
  timestamp: string;
  changes: Array<{
    eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
    entityType: 'person' | 'address' | 'bankAccount' | 'contactInfo' | 'employment';
    entity: Record<string, unknown> | null;
    oldEntity?: Record<string, unknown>;
  }>;
}

const WS_URL = import.meta.env.VITE_WS_URL; // Set via environment

export function useWebSocketSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const getCollectionForEntity = (entityType: string) => {
    switch (entityType) {
      case 'person':
        return personsCollection;
      case 'address':
        return addressesCollection;
      case 'bankAccount':
        return bankAccountsCollection;
      case 'contactInfo':
        return contactsCollection;
      case 'employment':
        return employmentsCollection;
      default:
        return null;
    }
  };

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SyncMessage = JSON.parse(event.data);

      if (message.type !== 'SYNC') return;

      for (const change of message.changes) {
        const collection = getCollectionForEntity(change.entityType);
        if (!collection || !change.entity) continue;

        const entity = change.entity as { id: string };

        switch (change.eventType) {
          case 'INSERT':
            // Insert without triggering server sync (data already on server)
            collection.insert(entity, { optimistic: false });
            break;
          case 'MODIFY':
            // Update with full entity data
            collection.update(entity.id, () => entity, { optimistic: false });
            break;
          case 'REMOVE':
            // For removes, get ID from oldEntity if entity is null
            const removeId = entity?.id ?? (change.oldEntity as any)?.id;
            if (removeId) {
              collection.delete(removeId, { optimistic: false });
            }
            break;
        }
      }

      setLastSyncTime(new Date(message.timestamp));
    } catch (error) {
      console.error('Error processing sync message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!WS_URL) {
      console.warn('WebSocket URL not configured');
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code);
      setIsConnected(false);
      wsRef.current = null;

      // Reconnect after 3 seconds (exponential backoff could be added)
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log('Attempting WebSocket reconnect...');
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastSyncTime,
    reconnect: connect,
  };
}
```

#### 15.3.2 Sync Status Component

```tsx
// src/webapp/components/SyncStatus.tsx
import { useWebSocketSync } from '#src/webapp/hooks/useWebSocketSync';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatus() {
  const { isConnected, lastSyncTime, reconnect } = useWebSocketSync();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />
      <span>
        {isConnected ? 'Live' : 'Offline'}
        {lastSyncTime && ` • Last sync ${formatDistanceToNow(lastSyncTime)} ago`}
      </span>
      {!isConnected && (
        <button onClick={reconnect} className="text-xs underline hover:no-underline">
          Reconnect
        </button>
      )}
    </div>
  );
}
```

#### 15.3.3 Integration in Root Layout

```tsx
// src/webapp/routes/__root.tsx
import { SyncStatus } from '#src/webapp/components/SyncStatus';

export default function RootLayout() {
  return (
    <div>
      <header className="flex items-center justify-between p-4 border-b">
        <h1>Persons Database</h1>
        <SyncStatus />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 15B. Implementation Plan: SSE with API Gateway Streaming (Recommended) ⭐

This is the **recommended approach** as of November 2025, leveraging the new API Gateway response streaming capability.

### Phase SSE-1: CDK Infrastructure

#### 15B.1.1 Enable DynamoDB Streams (same as WebSocket)

```typescript
// lib/constructs/DatabasePersons.ts
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

this.dbPersons = new Table(this, 'Persons', {
  // ... existing config ...
  stream: StreamViewType.NEW_AND_OLD_IMAGES,
});
```

#### 15B.1.2 Create Events Table (Event Store)

```typescript
// lib/constructs/EventsTable.ts
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class EventsTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new Table(this, 'Events', {
      partitionKey: { name: 'pk', type: AttributeType.STRING }, // "EVENTS"
      sortKey: { name: 'sk', type: AttributeType.STRING }, // timestamp#ULID
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-delete old events
    });
  }
}
```

#### 15B.1.3 Create Stream Processor Lambda (DynamoDB → Events Table)

```typescript
// lib/constructs/StreamToEventsProcessor.ts
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StreamToEventsProcessorProps {
  personsTable: Table;
  eventsTable: Table;
}

export class StreamToEventsProcessor extends Construct {
  constructor(scope: Construct, id: string, props: StreamToEventsProcessorProps) {
    super(scope, id);

    const processor = new NodejsFunction(this, 'Processor', {
      entry: 'src/lambda/stream-to-events.ts',
      environment: {
        EVENTS_TABLE: props.eventsTable.tableName,
      },
      timeout: Duration.seconds(30),
    });

    props.eventsTable.grantWriteData(processor);

    processor.addEventSource(
      new DynamoEventSource(props.personsTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 100,
        maxBatchingWindow: Duration.seconds(1),
        retryAttempts: 3,
      }),
    );
  }
}
```

#### 15B.1.4 Create SSE Streaming Lambda + API Gateway

```typescript
// lib/constructs/SseStreamingApi.ts
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface SseStreamingApiProps {
  eventsTable: Table;
}

export class SseStreamingApi extends Construct {
  public readonly api: RestApi;
  public readonly sseEndpoint: string;

  constructor(scope: Construct, id: string, props: SseStreamingApiProps) {
    super(scope, id);

    // SSE Streaming Lambda (uses response streaming)
    const sseHandler = new NodejsFunction(this, 'SseHandler', {
      entry: 'src/lambda/sse-stream.ts',
      environment: {
        EVENTS_TABLE: props.eventsTable.tableName,
      },
      timeout: Duration.minutes(15), // Max streaming timeout
      memorySize: 256,
    });

    props.eventsTable.grantReadData(sseHandler);

    // REST API with response streaming
    this.api = new RestApi(this, 'PersonsSseApi', {
      restApiName: 'Persons SSE API',
      description: 'Real-time sync via Server-Sent Events',
    });

    const eventsResource = this.api.root.addResource('events');
    const streamResource = eventsResource.addResource('stream');
    // Configure streaming integration
    // Note: CDK L2 construct may need escape hatch for responseTransferMode
    const integration = new LambdaIntegration(sseHandler, {
      proxy: true,
      // Use CFN escape hatch for streaming config
    });

    streamResource.addMethod('GET', integration);

    // Apply streaming configuration via escape hatch
    const cfnMethod = streamResource.node.findChild('GET').node.defaultChild as any;
    cfnMethod.addPropertyOverride('Integration.ResponseTransferMode', 'STREAM');
    // Use streaming invocation URI
    cfnMethod.addPropertyOverride(
      'Integration.Uri',
      `arn:aws:apigateway:${Stack.of(this).region}:lambda:path/2021-11-15/functions/${sseHandler.functionArn}/response-streaming-invocations`,
    );

    this.sseEndpoint = `${this.api.url}events/stream`;
  }
}
```

---

### Phase SSE-2: Lambda Handlers

#### 15B.2.1 Stream Processor (DynamoDB → Events Table)

```typescript
// src/lambda/stream-to-events.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBStreamHandler, DynamoDBRecord } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { ulid } from 'ulid'; // npm install ulid

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const EVENT_TTL_HOURS = 1;

function detectEntityType(sk: string): string {
  if (sk === 'PROFILE') return 'person';
  if (sk.startsWith('ADDRESS#')) return 'address';
  if (sk.startsWith('BANK#')) return 'bankAccount';
  if (sk.startsWith('CONTACT#')) return 'contactInfo';
  if (sk.startsWith('EMPLOYMENT#')) return 'employment';
  return 'unknown';
}

function parseStreamRecord(record: DynamoDBRecord) {
  const eventType = record.eventName as 'INSERT' | 'MODIFY' | 'REMOVE';
  const newImage = record.dynamodb?.NewImage ? unmarshall(record.dynamodb.NewImage as any) : null;
  const oldImage = record.dynamodb?.OldImage ? unmarshall(record.dynamodb.OldImage as any) : null;
  const keys = record.dynamodb?.Keys ? unmarshall(record.dynamodb.Keys as any) : { pk: '', sk: '' };

  const entityType = detectEntityType(keys.sk);

  // Remove DynamoDB-specific fields
  const cleanEntity = (item: Record<string, unknown> | null) => {
    if (!item) return null;
    const { pk, sk, gsi1pk, gsi1sk, __edb_e__, __edb_v__, ...domain } = item;
    return domain;
  };

  return {
    eventType,
    entityType,
    entity: cleanEntity(newImage),
    oldEntity: cleanEntity(oldImage),
  };
}

export const handler: DynamoDBStreamHandler = async (event) => {
  const parsedRecords = event.Records.map(parseStreamRecord).filter(
    (r) => r.entityType !== 'unknown',
  );

  if (parsedRecords.length === 0) return;

  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + EVENT_TTL_HOURS * 60 * 60;

  // Create event items with ULID for ordering
  const eventItems = parsedRecords.map((record) => {
    const eventId = ulid(); // Time-ordered unique ID
    return {
      PutRequest: {
        Item: {
          pk: 'EVENTS',
          sk: `${now.toISOString()}#${eventId}`, // Sortable: timestamp + ULID
          eventId,
          eventType: record.eventType,
          entityType: record.entityType,
          entity: record.entity,
          oldEntity: record.oldEntity,
          createdAt: now.toISOString(),
          ttl,
        },
      },
    };
  });

  // Write to Events table in batches of 25
  const batches = [];
  for (let i = 0; i < eventItems.length; i += 25) {
    batches.push(eventItems.slice(i, i + 25));
  }

  for (const batch of batches) {
    await ddbClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [EVENTS_TABLE]: batch,
        },
      }),
    );
  }
};
```

#### 15B.2.2 SSE Streaming Lambda (Event Store Pattern)

```typescript
// src/lambda/sse-stream.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

// Lambda response streaming handler
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  // Get lastEventId from query params or Last-Event-ID header (SSE reconnect)
  const lastEventId =
    event.queryStringParameters?.lastEventId || event.headers?.['last-event-id'] || null;

  // Set SSE headers
  const httpResponseMetadata = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);

  // Send initial connection event
  responseStream.write('event: connected\ndata: {"status":"connected"}\n\n');

  const startTime = Date.now();
  const maxDuration = 14 * 60 * 1000; // 14 minutes (leave 1 min buffer)
  const heartbeatInterval = 30 * 1000; // 30 seconds
  const pollInterval = 500; // Poll every 500ms for new events
  let lastHeartbeat = Date.now();
  let cursor = lastEventId; // Track last processed event

  // If reconnecting, first send any missed events
  if (lastEventId) {
    const missedEvents = await queryEventsSince(cursor);
    for (const evt of missedEvents) {
      responseStream.write(formatSseEvent(evt));
      cursor = evt.sk;
    }
  }

  // Long-poll for new events
  while (Date.now() - startTime < maxDuration) {
    try {
      // Check if we need to send heartbeat (keep connection alive)
      if (Date.now() - lastHeartbeat > heartbeatInterval) {
        responseStream.write(': heartbeat\n\n'); // SSE comment as heartbeat
        lastHeartbeat = Date.now();
      }

      // Query for new events since cursor
      const newEvents = await queryEventsSince(cursor);

      for (const evt of newEvents) {
        responseStream.write(formatSseEvent(evt));
        cursor = evt.sk; // Update cursor to latest event
      }

      // Small delay before next poll
      await sleep(pollInterval);
    } catch (error) {
      console.error('Error polling events:', error);
      responseStream.write('event: error\ndata: {"error":"Internal error"}\n\n');
    }
  }

  // Send reconnect hint before closing
  responseStream.write('event: reconnect\ndata: {"reason":"timeout"}\n\n');
  responseStream.end();
});

async function queryEventsSince(cursor: string | null): Promise<any[]> {
  const params: any = {
    TableName: EVENTS_TABLE,
    KeyConditionExpression: cursor ? 'pk = :pk AND sk > :cursor' : 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': 'EVENTS',
      ...(cursor && { ':cursor': cursor }),
    },
    Limit: 100, // Max events per query
  };

  const result = await ddbClient.send(new QueryCommand(params));
  return result.Items ?? [];
}

function formatSseEvent(event: any): string {
  // SSE format with id field for reconnection support
  return `id: ${event.sk}\nevent: change\ndata: ${JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    entityType: event.entityType,
    entity: event.entity,
    oldEntity: event.oldEntity,
    timestamp: event.createdAt,
  })}\n\n`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

#### 15B.2.3 How the Event Store Solves Fan-out and Ordering

```
Timeline: T1 ──────────────────────────────────────────────────────────> T4

Events Table (pk="EVENTS"):
┌───────────────────────────────────────────────────────────────────────────┐
│ sk                                        │ eventType │ entityType       │
├───────────────────────────────────────────┼───────────┼──────────────────┤
│ 2026-01-03T10:00:00.000Z#01HJQK5X7HZRD... │ INSERT    │ person           │
│ 2026-01-03T10:00:00.100Z#01HJQK5X8ABCD... │ MODIFY    │ person           │
│ 2026-01-03T10:00:00.200Z#01HJQK5X9EFGH... │ INSERT    │ address          │
│ 2026-01-03T10:00:01.000Z#01HJQK5XAIJKL... │ MODIFY    │ person           │
└───────────────────────────────────────────┴───────────┴──────────────────┘

Client A (connected at T1):        Client B (connected at T2):
  lastEventId: null                  lastEventId: null
  ↓                                  ↓
  Query: sk > null → ALL events      Query: sk > null → ALL events
  ↓                                  ↓
  Receives: E1, E2, E3, E4           Receives: E1, E2, E3, E4
  ✅ Both get ALL events!            ✅ No competition!

Client C (reconnects at T4, was disconnected since T2):
  lastEventId: "2026-01-03T10:00:00.100Z#01HJQK5X8ABCD..."
  ↓
  Query: sk > lastEventId → E3, E4 (missed events)
  ↓
  Receives: E3, E4  ✅ Catches up without missing anything!
```

**Key guarantees:**

1. **All clients get all events** - Each queries independently, no consumption
2. **Ordering preserved** - `sk` is sortable (timestamp + ULID)
3. **Reconnection works** - Client sends `lastEventId`, server resumes from there
4. **Automatic cleanup** - TTL removes old events after 1 hour

---

### Phase SSE-3: Client-Side Integration

#### 15B.3.1 SSE Hook (Simpler than WebSocket!)

```typescript
// src/webapp/hooks/useSseSync.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  personsCollection,
  addressesCollection,
  bankAccountsCollection,
  contactsCollection,
  employmentsCollection,
} from '#src/webapp/db-collections/persons';

interface ChangeEvent {
  timestamp: string;
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  entityType: 'person' | 'address' | 'bankAccount' | 'contactInfo' | 'employment';
  entity: Record<string, unknown> | null;
  oldEntity?: Record<string, unknown>;
}

const SSE_URL = import.meta.env.VITE_SSE_URL;

export function useSseSync() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const getCollectionForEntity = (entityType: string) => {
    switch (entityType) {
      case 'person':
        return personsCollection;
      case 'address':
        return addressesCollection;
      case 'bankAccount':
        return bankAccountsCollection;
      case 'contactInfo':
        return contactsCollection;
      case 'employment':
        return employmentsCollection;
      default:
        return null;
    }
  };

  const handleChange = useCallback((event: MessageEvent) => {
    try {
      const change: ChangeEvent = JSON.parse(event.data);
      const collection = getCollectionForEntity(change.entityType);

      if (!collection) return;

      const entity = change.entity as { id: string } | null;

      switch (change.eventType) {
        case 'INSERT':
          if (entity) {
            collection.insert(entity, { optimistic: false });
          }
          break;
        case 'MODIFY':
          if (entity) {
            collection.update(entity.id, () => entity, { optimistic: false });
          }
          break;
        case 'REMOVE':
          const removeId = entity?.id ?? (change.oldEntity as any)?.id;
          if (removeId) {
            collection.delete(removeId, { optimistic: false });
          }
          break;
      }

      setLastSyncTime(new Date(change.timestamp));
    } catch (error) {
      console.error('Error processing change event:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (!SSE_URL) {
      console.warn('SSE URL not configured');
      return;
    }

    // EventSource handles reconnection automatically!
    const eventSource = new EventSource(SSE_URL);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('SSE connected');
      setIsConnected(true);
    });

    eventSource.addEventListener('change', handleChange);

    eventSource.addEventListener('reconnect', () => {
      console.log('SSE reconnect requested');
      // EventSource will auto-reconnect
    });

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      // EventSource automatically attempts to reconnect
    };

    eventSource.onopen = () => {
      setIsConnected(true);
    };
  }, [handleChange]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastSyncTime,
    reconnect: () => {
      disconnect();
      connect();
    },
  };
}
```

#### 15B.3.2 Sync Status Component (Same as WebSocket version)

```tsx
// src/webapp/components/SyncStatusSse.tsx
import { useSseSync } from '#src/webapp/hooks/useSseSync';
import { formatDistanceToNow } from 'date-fns';

export function SyncStatus() {
  const { isConnected, lastSyncTime, reconnect } = useSseSync();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />
      <span>
        {isConnected ? 'Live' : 'Offline'}
        {lastSyncTime && ` • Last sync ${formatDistanceToNow(lastSyncTime)} ago`}
      </span>
      {!isConnected && (
        <button onClick={reconnect} className="text-xs underline hover:no-underline">
          Reconnect
        </button>
      )}
    </div>
  );
}
```

---

### SSE vs WebSocket: Key Differences in Client Code

| Aspect             | WebSocket                | SSE (EventSource)                       |
| ------------------ | ------------------------ | --------------------------------------- |
| **Connection**     | `new WebSocket(url)`     | `new EventSource(url)`                  |
| **Auto-reconnect** | ❌ Manual implementation | ✅ Built-in                             |
| **Event handling** | `ws.onmessage`           | `es.addEventListener('eventName', ...)` |
| **Custom events**  | Parse JSON manually      | Native SSE event types                  |
| **Keep-alive**     | Manual ping/pong         | Automatic (with heartbeat)              |
| **Close handling** | Manual cleanup           | Automatic                               |

---

## 16. Alternative Approaches Considered

### 16.1 Polling with ETag/Last-Modified

**Approach:** Client polls `/api/changes?since=<timestamp>` every N seconds.

```typescript
// Server returns only changes since timestamp
const getChangesSince = createServerFn({ method: 'GET' })
  .validator(z.object({ since: z.string().datetime() }))
  .handler(async ({ data }) => {
    // Query items where updatedAt > since
    // This requires a GSI on updatedAt!
  });
```

**Pros:**

- ✅ Simpler infrastructure (no WebSocket)
- ✅ Works through firewalls/proxies

**Cons:**

- ❌ Latency (polling interval)
- ❌ Wasted requests when no changes
- ❌ Requires GSI on `updatedAt` for efficient queries
- ❌ Harder to track deletes

**Verdict:** Not recommended for real-time requirements.

---

### 16.2 Server-Sent Events (SSE) with API Gateway Response Streaming

> **UPDATE (Nov 2025):** API Gateway now supports response streaming for REST APIs!
> See: https://aws.amazon.com/about-aws/whats-new/2025/11/api-gateway-response-streaming-rest-apis/

**This changes everything.** SSE is now a viable and potentially simpler option.

**New Capabilities:**

- ✅ Response streaming up to **15 minutes** timeout
- ✅ Payloads larger than 10 MB
- ✅ Works with Lambda streaming (`InvokeWithResponseStreaming`)
- ✅ Native SSE support with `text/event-stream` content type
- ✅ 5-minute idle timeout (Regional/Private), 30-second (Edge-optimized)

**Verdict:** **NOW VIABLE** - Reconsider as primary option. See Option E below.

---

### 16.3 AWS AppSync with Direct Lambda Resolver

**Approach:** Use AppSync subscriptions with Lambda resolvers.

**Pros:**

- ✅ Managed connection handling
- ✅ Built-in auth integration

**Cons:**

- ❌ Requires GraphQL schema definition
- ❌ Higher complexity for simple use case
- ❌ AppSync pricing

**Verdict:** Consider if already using GraphQL or need advanced auth.

---

## 17. Security Considerations

### 17.1 SSE Authentication (Recommended Approach)

```typescript
// SSE with Authorization header via fetch + ReadableStream
// (EventSource doesn't support custom headers)
async function connectWithAuth(authToken: string) {
  const response = await fetch(SSE_URL, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const text = decoder.decode(value);
    // Parse SSE events from text
    parseAndHandleEvents(text);
  }
}

// Alternative: Use query parameter (simpler, works with EventSource)
const eventSource = new EventSource(`${SSE_URL}?token=${authToken}`);
```

### 17.2 WebSocket Authentication (Alternative)

```typescript
// Option A: Query parameter token (simplest)
const ws = new WebSocket(`${WS_URL}?token=${authToken}`);

// $connect Lambda validates token
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const token = event.queryStringParameters?.token;

  if (!validateToken(token)) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // Store connection with user context
  await storeConnection(event.requestContext.connectionId, {
    userId: decodeToken(token).sub,
  });

  return { statusCode: 200, body: 'Connected' };
};
```

### 17.3 Multi-Tenant Filtering

For multi-tenant scenarios, filter broadcasts by user/tenant:

```typescript
// SSE Approach: Each client reads only their tenant's messages from SQS
// Option 1: Separate SQS queues per tenant
// Option 2: Message attributes + SQS filtering

// WebSocket Approach: Store connection with tenant context
{
  connectionId: 'abc123',
  tenantId: 'tenant-xyz',
  userId: 'user-123',
}

// Stream processor filters recipients
const relevantConnections = connections.filter(
  c => c.tenantId === changeEvent.tenantId
);

// SSE Approach: Filter in Events table or at query time
// Option 1: Separate Events tables per tenant
// Option 2: Add tenantId to pk: "EVENTS#tenant-xyz"
// Option 3: Filter at query time (less efficient for large datasets)
```

---

## 18. Estimated Timeline for Real-Time Sync

### 18.1 SSE + Event Store Approach (Recommended) ⭐

| Phase     | Task                                 | Estimated Time  |
| --------- | ------------------------------------ | --------------- |
| SSE-1.1   | Enable DynamoDB Streams              | 0.5 hours       |
| SSE-1.2   | Create Events Table (Event Store)    | 0.5 hours       |
| SSE-1.3   | Create Stream→Events Processor       | 1.5 hours       |
| SSE-1.4   | Create SSE API + Streaming Lambda    | 2.5 hours       |
| SSE-2.1   | Stream-to-Events Handler (with ULID) | 1.5 hours       |
| SSE-2.2   | SSE Streaming Handler (query-based)  | 2.5 hours       |
| SSE-3.1   | SSE Hook with lastEventId            | 1.5 hours       |
| SSE-3.2   | Sync Status Component                | 0.5 hours       |
| SSE-3.3   | Integration & Testing                | 2 hours         |
| **Total** |                                      | **12-13 hours** |

### 18.2 WebSocket Approach (Alternative)

| Phase     | Task                              | Estimated Time  |
| --------- | --------------------------------- | --------------- |
| RT-1.1    | Enable DynamoDB Streams           | 0.5 hours       |
| RT-1.2    | Create Connections Table          | 0.5 hours       |
| RT-1.3    | Create WebSocket API Construct    | 2 hours         |
| RT-1.4    | Create Stream Processor Construct | 1 hour          |
| RT-2.1    | Connect/Disconnect Handlers       | 1 hour          |
| RT-2.2    | Stream Processor Lambda           | 3 hours         |
| RT-3.1    | WebSocket Hook                    | 2 hours         |
| RT-3.2    | Sync Status Component             | 1 hour          |
| RT-3.3    | Integration & Testing             | 2-3 hours       |
| **Total** |                                   | **13-15 hours** |

**SSE saves ~1-2 hours** due to simpler client code (EventSource vs custom WebSocket handling).

---

## 19. Summary: Real-Time Sync Decision

### ⭐ UPDATED Recommendation (January 2026): SSE with Event Store Pattern

**Selected Architecture:** SSE + API Gateway Response Streaming + DynamoDB Streams + Events Table

> **Why the change?** API Gateway now supports response streaming (Nov 2025), making SSE a viable and simpler option.

> **Critical fix:** Uses Event Store pattern instead of SQS to support multiple concurrent clients.

**Key Benefits:**

1. **Fan-out to all clients**: Each client queries Events table independently - no message consumption
2. **Ordering guaranteed**: Events sorted by `sk` (timestamp + ULID)
3. **Reconnection works**: Client sends `lastEventId` (SSE spec!), server resumes from there
4. **Native browser support**: `EventSource` API handles reconnection automatically
5. **Simpler than WebSocket**: No connection management table needed
6. **Easier debugging**: Standard HTTP, works with curl
7. **ElectroDB compatible**: Reuses existing entity schemas

**Trade-offs Accepted:**

- Unidirectional only (server→client) - sufficient for our use case
- 5-minute idle timeout requires heartbeat - handled automatically
- Poll-based (500ms) rather than push - acceptable latency for data sync
- Events table adds storage cost - minimal with 1-hour TTL

### How It Solves the Problems

| Problem                 | SQS (Broken)               | Event Store (Fixed)            |
| ----------------------- | -------------------------- | ------------------------------ |
| **5 clients connected** | Each gets 1/5 of messages  | All get ALL messages           |
| **Ordering**            | Not guaranteed             | Sorted by timestamp + ULID     |
| **Client reconnects**   | Missed events gone forever | Query events since lastEventId |
| **Message retention**   | Consumed = deleted         | TTL-based cleanup (1 hour)     |

### Alternative: WebSocket (Still Valid)

Use WebSocket if you need:

- Bidirectional communication (client→server messages)
- Push to specific clients (not broadcast)
- True push (vs 500ms poll) for ultra-low latency

---

## 20. Architecture Comparison Summary

| Aspect                  | SSE + Event Store (Recommended) | WebSocket                         | Polling                   |
| ----------------------- | ------------------------------- | --------------------------------- | ------------------------- |
| **Infrastructure**      | REST API + Events Table         | WebSocket API + Connections Table | REST API only             |
| **Lambdas**             | 2 (stream→events, SSE)          | 3 (connect, disconnect, stream)   | 1 (poll endpoint)         |
| **Fan-out**             | ✅ All clients query same table | ✅ Push to all connections        | ✅ Each client polls      |
| **Ordering**            | ✅ ULID-based sorting           | ⚠️ Per-shard in DDB Stream        | ⚠️ Depends on query       |
| **Reconnection**        | ✅ lastEventId (SSE spec)       | ❌ Manual implementation          | N/A                       |
| **Client Code**         | `EventSource` (native)          | Custom WebSocket                  | `setInterval` + fetch     |
| **Auto-reconnect**      | ✅ Built-in                     | ❌ Manual                         | N/A                       |
| **Latency**             | ~500ms (poll interval)          | <100ms (push)                     | Poll interval             |
| **Bidirectional**       | ❌                              | ✅                                | ❌                        |
| **Debugging**           | Easy (HTTP/curl)                | Medium                            | Easy                      |
| **Implementation Time** | ~12 hours                       | ~14 hours                         | ~4 hours                  |
| **Best For**            | Real-time broadcast             | Bidirectional + targeted push     | Simple/infrequent updates |

---

_Section added: January 3, 2026_
_Updated: January 3, 2026 - Revised to recommend SSE after API Gateway streaming announcement_

---

### Legacy Reference: AppSync Subscriptions

For comparison, here's the AppSync approach (not recommended due to added complexity):

```typescript
// Reference only - SSE selected instead
import { useSubscription } from '@/webapp/integrations/appsync';

function useRealtimePersonSync() {
  useSubscription({
    query: onPersonChanged,
    onData: (event) => {
      switch (event.type) {
        case 'INSERT':
          personsCollection.insert(event.person, { optimistic: false });
          break;
        case 'UPDATE':
          personsCollection.update(event.person.id, () => event.person, { optimistic: false });
          break;
        case 'DELETE':
          personsCollection.delete(event.person.id, { optimistic: false });
          break;
      }
    },
  });
}
```

### UI: Show Sync Status

```tsx
function PersonsPage() {
  const { lastUpdated, isLoading } = usePersonSearch();

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Last synced: {formatRelative(lastUpdated)}</span>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {/* ... */}
    </div>
  );
}
```

### Decision: Sync Strategy

**✅ DECIDED: Polling + Refetch on Focus**

- `refetchInterval: 60_000` (poll every 60 seconds)
- `refetchOnWindowFocus: true` (immediate sync when user returns)
- Manual refresh button for user-triggered sync
- Orama index rebuilds when collection data changes (via `useLiveQuery`)

**Rationale:**

- Simple to implement
- No additional AWS infrastructure needed
- Acceptable latency for person directory use case
- Full index rebuild is fast enough for 10k records (~2-3s)

---

## 12. Estimated Timeline

| Phase                          | Estimated Time  |
| ------------------------------ | --------------- |
| Types & Fake Data              | 2-3 hours       |
| CDK Updates                    | 1 hour          |
| DDB Client                     | 3-4 hours       |
| Orama Search Integration       | 1-2 hours       |
| Collections + Server Functions | 2-3 hours       |
| Hooks (incl. search)           | 1-2 hours       |
| UI Components                  | 4-6 hours       |
| Pages                          | 2-3 hours       |
| Seed Script (10k)              | 1-2 hours       |
| Testing & Polish               | 2-3 hours       |
| **Total**                      | **19-28 hours** |

---

_Document created: December 23, 2025_
_Updated with TanStack DB documentation patterns_
_Updated with Orama search and 10,000 persons seeding_
