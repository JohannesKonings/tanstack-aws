# Plan: DB Persons Feature with Multi-Entity Architecture

## Overview

This document outlines the implementation plan for a "DB Persons" feature similar to the existing "DB Todo" but with a more complex multi-entity data model. The feature will manage persons with related entities like addresses and banking data using DynamoDB single-table design **powered by ElectroDB**.

This is a **simple multi-entity example** focused on basic CRUD operations with TanStack DB and ElectroDB. Search functionality is postponed to a future branch.

**Key Design Decision:** ElectroDB schemas are **derived from Zod schemas** to ensure a single source of truth. When Zod schemas are updated, ElectroDB entities automatically reflect those changes.

---

## Status Update

- Completed: Collections + server functions for persons and related entities
- Completed: React hooks `useDbPersons.ts` with CRUD mutations and live queries
- Completed: UI CRUD for persons, addresses, contacts, bank accounts, employment via modals
- Added: Person detail panel, edit modal, and create person modal
- Notes: Adjusted code to comply with strict oxlint rules (no ternary, id-length, max-statements); replaced Tailwind shrink classes per linter

Remaining minor tasks:
- Refine statement counts in route components if flagged by linter
- Document search/indexing phase (postponed)

## 1. Data Model Design

### 1.1 Entity Types

| Entity | Description | Relationship |
|--------|-------------|--------------|
| **Person** | Core entity with personal information | Root entity |
| **Address** | Physical/mailing addresses | 1:N with Person |
| **BankAccount** | Banking information | 1:N with Person |
| **ContactInfo** | Email, phone, social media | 1:N with Person |
| **Employment** | Job history and current employment | 1:N with Person |

### 1.2 Entity Schemas (TypeScript/Zod)

```typescript
// Person
{
  id: string;           // UUID
  firstName: string;
  lastName: string;
  dateOfBirth: string;  // ISO date
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  createdAt: string;
  updatedAt: string;
}

// Address
{
  id: string;           // UUID
  personId: string;     // FK to Person
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
  id: string;           // UUID
  personId: string;     // FK to Person
  bankName: string;
  accountType: 'checking' | 'savings' | 'investment';
  accountNumberLast4: string;  // Only store last 4 digits
  iban: string;         // International Bank Account Number
  bic: string;          // Bank Identifier Code
  isPrimary: boolean;
}

// ContactInfo
{
  id: string;           // UUID
  personId: string;     // FK to Person
  type: 'email' | 'phone' | 'mobile' | 'linkedin' | 'twitter';
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
}

// Employment
{
  id: string;           // UUID
  personId: string;     // FK to Person
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

| Entity | PK | SK | Purpose |
|--------|----|----|---------|
| Person | `PERSON#<personId>` | `PROFILE` | Person profile data |
| Address | `PERSON#<personId>` | `ADDRESS#<addressId>` | Person's addresses |
| BankAccount | `PERSON#<personId>` | `BANK#<bankId>` | Person's bank accounts |
| ContactInfo | `PERSON#<personId>` | `CONTACT#<contactId>` | Person's contact info |
| Employment | `PERSON#<personId>` | `EMPLOYMENT#<employmentId>` | Person's employment history |

### 2.2 Access Patterns

| Access Pattern | Key Condition | Description |
|----------------|---------------|-------------|
| Get all persons | GSI1: `gsi1pk = PERSONS` | List all persons |
| Get person by ID | `pk = PERSON#<id>, sk = PROFILE` | Single person lookup |
| Get person with all data | `pk = PERSON#<id>` | Get person + all related entities (collection query) |
| Get person's addresses | `pk = PERSON#<id>, sk begins_with ADDRESS#` | All addresses for a person |
| Get person's bank accounts | `pk = PERSON#<id>, sk begins_with BANK#` | All bank accounts for a person |
| **Get ALL entities** | GSI2: `gsi2pk = ALL_DATA` | **List all entities for Orama search index** |

### 2.3 Global Secondary Indexes

No additional Global Secondary Indexes are required for this basic multi-entity example. The primary key structure is sufficient for all access patterns.

**GSI2: List All Entities (for Orama Search Index)**

For efficiently building the Orama search index, we need to fetch ALL entities (persons + addresses + contacts + employments + bank accounts) in a single query. This GSI allows fetching all data grouped by personId:

```
GSI2:
  - Partition Key: gsi2pk = "ALL_DATA" (constant for all entities)
  - Sort Key: gsi2sk = "PERSON#<personId>#<entityType>#<entityId>"
  
All entities are indexed:
  - Person:      gsi2sk = "PERSON#abc123#PROFILE"
  - Address:     gsi2sk = "PERSON#abc123#ADDRESS#addr1"
  - BankAccount: gsi2sk = "PERSON#abc123#BANK#bank1"
  - ContactInfo: gsi2sk = "PERSON#abc123#CONTACT#cont1"
  - Employment:  gsi2sk = "PERSON#abc123#EMPLOYMENT#emp1"
```

**Why GSI2 instead of Parallel Scans?**

With single-table design, entity scans read the **entire table** per entity type:

| Approach | Items Read | RCUs per Index Build | Daily Cost (10 builds) |
|----------|-----------|---------------------|------------------------|
| **GSI2 Query** | 50k | ~3,125 | ~31,250 RCUs |
| **5 Entity Scans** | 5×50k = 250k | ~15,625 | ~156,250 RCUs |

**Trade-off Analysis (for >100 writes/day):**
- GSI2 extra write cost: ~200 WCUs/day (2x per write)
- GSI2 read savings: ~125,000 RCUs/day (assuming 10 index builds)
- **Net benefit: Massive read savings outweigh write overhead**

**GSI2 Benefits:**
- ✅ Single query fetches ALL data (vs 5× table scans)
- ✅ Data sorted by personId for trivial client-side grouping
- ✅ 5x cheaper reads in single-table design
- ✅ Faster latency (~2-5s vs ~5-10s for parallel scans)
- ⚠️ Trade-off: 2x WCU per write + extra GSI storage

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
- [ ] Modify `/lib/constructs/DatabasePersons.ts`
  - Add GSI1 for listing all persons (`gsi1pk`, `gsi1sk`)
  - Add GSI2 for listing all entities for Orama (`gsi2pk`, `gsi2sk`)
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
import { eq, gt, gte, lt, lte, like, ilike, inArray, and, or, not } from '@tanstack/db'

// Examples
eq(user.id, '123')           // Equality
gt(user.age, 18)             // Greater than
gte(user.age, 18)            // Greater than or equal
lt(user.age, 65)             // Less than
lte(user.age, 65)            // Less than or equal
like(user.name, 'John%')     // Case-sensitive pattern matching
ilike(user.name, 'john%')    // Case-insensitive pattern matching
inArray(user.id, ['1', '2']) // Array membership

// Logical operators
and(condition1, condition2)
or(condition1, condition2)
not(condition)
```

**Why GSI2 instead of multiple scans?**
- ✅ **1 query** vs 5 separate scans
- ✅ **Sorted by personId** for easy grouping
- ✅ **Efficient pagination** with ElectroDB's `pages: 'all'`
- ✅ **Lower cost** - fewer read operations

#### 3.8 Payload Size Limits & Data Loading Strategy

**⚠️ Critical Issue:** Lambda/API Gateway have payload limits that affect 50k items (~25 MB):

| Service | Limit | Our Data (~50k items) |
|---------|-------|----------------------|
| Lambda (sync response) | 6 MB | ❌ ~25 MB exceeds |
| Lambda Function URL | 6 MB | ❌ ~25 MB exceeds |
| API Gateway REST/HTTP | 10 MB | ❌ ~25 MB exceeds |
| Lambda Streaming | Unlimited | ✅ Works |

**✅ DECIDED: Pagination + Compression (Recommended)**

Fetch data in paginated chunks with gzip compression:

```typescript
// Server function: Fetch paginated + compressed data
const fetchAllDataPaginated = createServerFn({ method: 'GET' })
  .validator(z.object({ cursor: z.string().optional() }))
  .handler(async ({ data }) => {
    const PAGE_SIZE = 1000  // ~500 KB uncompressed per page
    
    const result = await PersonsService.collections
      .allData({})
      .go({ 
        cursor: data.cursor,
        limit: PAGE_SIZE,
      })
    
    return {
      data: result.data,
      cursor: result.cursor,  // null when done
      hasMore: !!result.cursor,
    }
  })

// Client: Progressive loading with progress indicator
async function loadAllDataForOrama(onProgress: (percent: number) => void) {
  const allData = { person: [], address: [], contactInfo: [], employment: [], bankAccount: [] }
  let cursor: string | undefined
  let loaded = 0
  const estimated = 50000  // Estimated total items
  
  do {
    const { data, cursor: nextCursor, hasMore } = await fetchAllDataPaginated({ 
      data: { cursor } 
    })
    
    // Merge results
    Object.keys(data).forEach(key => {
      allData[key].push(...(data[key] || []))
      loaded += data[key]?.length || 0
    })
    
    onProgress(Math.min(95, (loaded / estimated) * 100))
    cursor = nextCursor
  } while (cursor)
  
  onProgress(100)
  return allData
}
```

**UI Progress Indicator:**
```tsx
function SearchIndexLoader() {
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadAllDataForOrama(setProgress)
      .then(buildOramaIndex)
      .finally(() => setIsLoading(false))
  }, [])
  
  if (!isLoading) return null
  
  return (
    <div className="flex items-center gap-2">
      <Progress value={progress} className="w-48" />
      <span className="text-sm text-muted-foreground">
        Building search index... {Math.round(progress)}%
      </span>
    </div>
  )
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
const fetchAllDataStreaming = createServerFn({ method: 'GET' })
  .handler(async () => {
    const stream = new ReadableStream({
      async start(controller) {
        let cursor: string | undefined
        
        do {
          const { data, cursor: nextCursor } = await PersonsService.collections
            .allData({})
            .go({ cursor, limit: 500 })
          
          controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'))
          cursor = nextCursor
        } while (cursor)
        
        controller.close()
      }
    })
    
    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' }
    })
  })
```

**Pros:** No payload limit, single request, real streaming
**Cons:** Requires Lambda streaming setup, more complex client parsing

#### Option B: Server-Side Orama Index

Move search entirely to server:

```typescript
// Cache Orama index in Lambda memory (reused across warm invocations)
let cachedIndex: Orama | null = null
let lastBuildTime = 0

const searchPersonsServer = createServerFn({ method: 'POST' })
  .validator(z.object({ term: z.string(), limit: z.number().default(50) }))
  .handler(async ({ data }) => {
    const CACHE_TTL = 5 * 60 * 1000  // 5 minutes
    
    // Rebuild if cache expired or missing
    if (!cachedIndex || Date.now() - lastBuildTime > CACHE_TTL) {
      const allData = await fetchAllEntitiesFromDDB()
      cachedIndex = await buildOramaIndex(allData)
      lastBuildTime = Date.now()
    }
    
    const results = await search(cachedIndex, {
      term: data.term,
      limit: data.limit,
      tolerance: 1,
    })
    
    // Return only IDs, client fetches full data on click
    return results.hits.map(h => ({ id: h.document.id, score: h.score }))
  })
```

**Pros:** Fast initial page load, no client-side index building
**Cons:** Search latency (~100-200ms vs <10ms), Lambda memory usage, cache invalidation complexity

#### Option C: Pre-built Search Index in S3

Build index offline and serve from S3/CloudFront:

```typescript
// Scheduled Lambda: Build and upload index to S3
async function rebuildSearchIndex() {
  const allData = await fetchAllEntitiesFromDDB()
  const index = await buildOramaIndex(allData)
  const serialized = await persist(index)
  
  await s3.putObject({
    Bucket: 'my-bucket',
    Key: 'search-index.json',
    Body: JSON.stringify(serialized),
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
  })
}

// Client: Download pre-built index
async function loadPrebuiltIndex() {
  const response = await fetch('https://cdn.example.com/search-index.json')
  const serialized = await response.json()
  return restore(serialized)  // Orama's restore function
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
import { createServerFn } from '@tanstack/react-start'
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { createPersonsDdbClient } from '@/webapp/integrations/ddb-client/personsClient'

// Server functions - no HTTP routes needed!
const fetchPersons = createServerFn({ method: 'GET' })
  .handler(async () => {
    const client = createPersonsDdbClient()
    return client.getPersons()
  })

const createPerson = createServerFn({ method: 'POST' })
  .validator((data: Person) => personSchema.parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient()
    return client.putPerson(data)
  })

const updatePersons = createServerFn({ method: 'POST' })
  .validator((data: PersonUpdate[]) => personUpdateSchema.array().parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient()
    return client.updatePersons(data)
  })

const deletePersons = createServerFn({ method: 'POST' })
  .validator((data: string[]) => z.array(z.string()).parse(data))
  .handler(async ({ data }) => {
    const client = createPersonsDdbClient()
    return client.deletePersons(data)
  })

// Collection uses server functions directly
export const personsCollection = createCollection(
  queryCollectionOptions<Person>({
    id: 'persons',
    queryKey: ['persons'],
    queryFn: () => fetchPersons(),
    queryClient: getContext().queryClient,
    getKey: (item) => item.id,

    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((m) => createPerson({ data: m.modified }))
      )
    },

    onUpdate: async ({ transaction }) => {
      const updates = transaction.mutations.map((m) => ({
        id: m.key,
        changes: m.changes,
      }))
      await updatePersons({ data: updates })
    },

    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((m) => m.key)
      await deletePersons({ data: ids })
    },
  })
)

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
import { createLiveQueryCollection, eq } from '@tanstack/db'

// Filter addresses for a specific person
const createPersonAddresses = (personId: string) =>
  createLiveQueryCollection((q) =>
    q
      .from({ address: addressesCollection })
      .where(({ address }) => eq(address.personId, personId))
      .select(({ address }) => address)
  )

// Join person with addresses (left join)
const personWithAddresses = createLiveQueryCollection((q) =>
  q
    .from({ person: personsCollection })
    .join({ address: addressesCollection }, ({ person, address }) =>
      eq(person.id, address.personId)
    )
    .select(({ person, address }) => ({
      ...person,
      address, // Optional because it's a left join
    }))
)
```

#### 3.10 Query Operators Reference
Available operators for filtering (from TanStack DB docs):

```typescript
import { eq, gt, gte, lt, lte, like, ilike, inArray, and, or, not } from '@tanstack/db'

// Examples
eq(user.id, '123')           // Equality
gt(user.age, 18)             // Greater than
gte(user.age, 18)            // Greater than or equal
lt(user.age, 65)             // Less than
lte(user.age, 65)            // Less than or equal
like(user.name, 'John%')     // Case-sensitive pattern matching
ilike(user.name, 'john%')    // Case-insensitive pattern matching
inArray(user.id, ['1', '2']) // Array membership

// Logical operators
and(condition1, condition2)
or(condition1, condition2)
not(condition)
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
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/db'

// List all persons
export function usePersons() {
  const { data: persons } = useLiveQuery((q) =>
    q
      .from({ person: personsCollection })
      .select(({ person }) => person)
  )
  return persons
}

// Get person with addresses via join
export function usePersonWithAddresses(personId: string) {
  const { data } = useLiveQuery((q) =>
    q
      .from({ person: personsCollection })
      .join(
        { address: addressesCollection },
        ({ person, address }) => eq(person.id, address.personId),
        'left'
      )
      .where(({ person }) => eq(person.id, personId))
      .select(({ person, address }) => ({
        ...person,
        address,
      }))
  )
  return data
}

// Mutations use collection methods directly (optimistic by default)
export function usePersonMutations() {
  const addPerson = (person: Omit<Person, 'id'>) => {
    personsCollection.insert({
      id: crypto.randomUUID(),
      ...person,
    })
  }

  const updatePerson = (id: string, changes: Partial<Person>) => {
    personsCollection.update(id, (draft) => {
      Object.assign(draft, changes)
    })
  }

  const deletePerson = (id: string) => {
    personsCollection.delete(id)
  }

  return { addPerson, updatePerson, deletePerson }
}
```

**Non-Optimistic Mutations (when needed):**

```typescript
// For operations requiring server confirmation
const handleDeleteAccount = () => {
  personCollection.delete(personId, { optimistic: false })
}

// Server-generated data (IDs, timestamps, etc.)
const handleCreateWithServerData = () => {
  personCollection.insert(personData, { optimistic: false })
}
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
import { useState } from 'react'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { searchPersons, usePersonSearch } from '@/webapp/integrations/orama/personSearch'

// PersonSearchInput with TanStack Pacer debouncing
function PersonSearchInput({ 
  onResults 
}: { 
  onResults: (results: SearchResult[]) => void 
}) {
  const [term, setTerm] = useState('')
  const { searchIndex, isLoading } = usePersonSearch()
  
  // TanStack Pacer - debounce the search term
  const [debouncedTerm, debouncer] = useDebouncedValue(term, {
    wait: 200, // 200ms debounce
  }, (state) => ({ isPending: state.isPending }))

  // Effect runs when debounced term changes
  useEffect(() => {
    async function performSearch() {
      if (debouncedTerm.length >= 2 && searchIndex) {
        const results = await searchPersons(searchIndex, debouncedTerm, {
          limit: 20,
          tolerance: 1, // Allow 1 typo
        })
        onResults(results.hits)
      } else {
        onResults([])
      }
    }
    performSearch()
  }, [debouncedTerm, searchIndex])

  return (
    <div className="relative">
      <Input
        placeholder="Search persons... (fuzzy matching)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {debouncer.state.isPending && (
        <span className="absolute right-3 top-3 text-muted-foreground">
          Searching...
        </span>
      )}
    </div>
  )
}
```

**Component Integration Pattern:**

```tsx
// PersonCard with optimistic updates
function PersonCard({ person }: { person: Person }) {
  const [isEditing, setIsEditing] = useState(false)
  
  const handleSave = (changes: Partial<Person>) => {
    // Optimistic update - UI updates immediately
    personsCollection.update(person.id, (draft) => {
      Object.assign(draft, changes)
    })
    setIsEditing(false)
  }

  const handleDelete = () => {
    personsCollection.delete(person.id)
  }

  return (
    <Card>
      {isEditing ? (
        <PersonForm person={person} onSave={handleSave} />
      ) : (
        <PersonDisplay person={person} onEdit={() => setIsEditing(true)} />
      )}
    </Card>
  )
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
import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { searchPersons, usePersonSearch } from '@/webapp/integrations/orama/personSearch'

function PersonsListPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchHit[]>([])
  const { searchIndex, isLoading } = usePersonSearch()

  // Debounced Orama search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length >= 2 && searchIndex) {
        const results = await searchPersons(searchIndex, searchTerm, {
          limit: 50,
          tolerance: 1, // Typo tolerance
        })
        setSearchResults(results.hits)
      } else {
        setSearchResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchTerm, searchIndex])

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
  )
}
```

**Detail Page with Live Query & Tabs Pattern:**

```tsx
import { useLiveQuery } from '@tanstack/react-db'
import { eq } from '@tanstack/db'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function PersonDetailPage({ personId }: { personId: string }) {
  // Live query with joins - automatically updates when data changes
  const { data: personData } = useLiveQuery((q) =>
    q
      .from({ person: personsCollection })
      .where(({ person }) => eq(person.id, personId))
      .select(({ person }) => person)
  )

  const { data: addresses } = useLiveQuery((q) =>
    q
      .from({ address: addressesCollection })
      .where(({ address }) => eq(address.personId, personId))
      .select(({ address }) => address)
  )

  const person = personData?.[0]
  if (!person) return <NotFound />

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
  )
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
import { faker } from '@faker-js/faker'
import { createPersonsDdbClient } from '../src/webapp/integrations/ddb-client/personsClient'

const TOTAL_PERSONS = 10_000
const BATCH_SIZE = 25  // DynamoDB limit

async function seedPersons() {
  const client = createPersonsDdbClient()
  
  console.log(`Seeding ${TOTAL_PERSONS} persons...`)
  
  for (let i = 0; i < TOTAL_PERSONS; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, TOTAL_PERSONS - i) }, () =>
      generateFakePerson()
    )
    
    await client.batchWritePersons(batch)
    
    if ((i + BATCH_SIZE) % 1000 === 0) {
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, TOTAL_PERSONS)}/${TOTAL_PERSONS}`)
    }
  }
  
  console.log('Done!')
}

seedPersons()
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

| File | Changes |
|------|---------|
| `/lib/constructs/DatabasePersons.ts` | Infrastructure setup (no GSI required for basic example) |
| `/lib/constructs/Webapp.ts` | Add `grantReadWriteData` for persons table |
| `/package.json` | Add seed script, add `@faker-js/faker` and `electrodb` dependencies |

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

| Layer | Technology |
|-------|------------|
| Database | AWS DynamoDB (Single-Table Design) |
| **DynamoDB Client** | **ElectroDB (schemas derived from Zod)** |
| Backend | TanStack Start Server Functions |
| Data Fetching | TanStack Query + queryCollectionOptions |
| Local State | TanStack DB Collections with Live Queries |
| Optimistic Updates | TanStack DB (built-in via onInsert/onUpdate/onDelete handlers) |
| UI Framework | React + TailwindCSS + shadcn/ui |
| Type Safety | Zod + TypeScript |
| Infrastructure | AWS CDK |
| Fake Data | @faker-js/faker |

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
    staleTime: 30_000,        // Consider data fresh for 30s
    refetchInterval: 60_000,  // Poll every 60s for updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  }),
  onInsert: async (person) => { /* ... */ },
  onUpdate: async (person) => { /* ... */ },
  onDelete: async (id) => { /* ... */ },
})
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

| Phase | Estimated Time |
|-------|---------------|
| Types & Fake Data | 2-3 hours |
| CDK Updates | 1 hour |
| ElectroDB Integration | 3-4 hours |
| Collections + Server Functions | 2-3 hours |
| Hooks | 1-2 hours |
| UI Components | 4-6 hours |
| Pages | 2-3 hours |
| Seed Script (10k) | 1-2 hours |
| Testing & Polish | 2-3 hours |
| **Total** | **18-26 hours** |

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
import { z } from 'zod'
import type { Attribute } from 'electrodb'

type ElectroDBAttribute = {
  type: 'string' | 'number' | 'boolean' | 'list' | 'map' | 'set' | readonly string[]
  required?: boolean
  default?: unknown
}

/**
 * Convert a Zod schema to ElectroDB attributes
 * This ensures Zod is the single source of truth
 */
export function zodToElectroDBAttributes<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): Record<keyof T, ElectroDBAttribute> {
  const shape = schema.shape
  const attributes: Record<string, ElectroDBAttribute> = {}

  for (const [key, zodType] of Object.entries(shape)) {
    attributes[key] = convertZodType(zodType as z.ZodTypeAny)
  }

  return attributes as Record<keyof T, ElectroDBAttribute>
}

function convertZodType(zodType: z.ZodTypeAny): ElectroDBAttribute {
  // Handle optional wrapper
  if (zodType instanceof z.ZodOptional) {
    const inner = convertZodType(zodType.unwrap())
    return { ...inner, required: false }
  }

  // Handle nullable
  if (zodType instanceof z.ZodNullable) {
    const inner = convertZodType(zodType.unwrap())
    return { ...inner, required: false }
  }

  // Handle default
  if (zodType instanceof z.ZodDefault) {
    const inner = convertZodType(zodType.removeDefault())
    return { ...inner, default: zodType._def.defaultValue() }
  }

  // Handle primitives
  if (zodType instanceof z.ZodString) {
    return { type: 'string', required: true }
  }
  if (zodType instanceof z.ZodNumber) {
    return { type: 'number', required: true }
  }
  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean', required: true }
  }

  // Handle enums
  if (zodType instanceof z.ZodEnum) {
    return { type: zodType.options as readonly string[], required: true }
  }

  // Handle arrays
  if (zodType instanceof z.ZodArray) {
    return { type: 'list', required: true }
  }

  // Handle objects (nested)
  if (zodType instanceof z.ZodObject) {
    return { type: 'map', required: true }
  }

  // Default to string
  return { type: 'string', required: true }
}
```

### Using Derived Schemas in Entities

```typescript
// /src/webapp/integrations/electrodb/entities.ts
import { Entity } from 'electrodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { zodToElectroDBAttributes } from './zod-to-electrodb'
import { 
  PersonSchema, 
  AddressSchema,
  // ... other schemas
} from '@/webapp/types/person'

const client = new DynamoDBClient({})
const table = process.env.DDB_PERSONS_TABLE_NAME!

// Derive ElectroDB attributes from Zod schemas
const personAttributes = zodToElectroDBAttributes(PersonSchema.omit({ id: true }))
const addressAttributes = zodToElectroDBAttributes(AddressSchema.omit({ id: true, personId: true }))

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
        collection: 'allData',  // Shared collection across all entities
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId'], template: 'PERSON#${personId}#PROFILE' },
      },
    },
  },
  { client, table }
)

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
        collection: 'personData',  // Collection for querying single person's data
        pk: { field: 'pk', composite: ['personId'], template: 'PERSON#${personId}' },
        sk: { field: 'sk', composite: ['addressId'], template: 'ADDRESS#${addressId}' },
      },
      // GSI2 - list ALL entities for Orama
      allData: {
        collection: 'allData',
        index: 'GSI2',
        pk: { field: 'gsi2pk', composite: [], template: 'ALL_DATA' },
        sk: { field: 'gsi2sk', composite: ['personId', 'addressId'], template: 'PERSON#${personId}#ADDRESS#${addressId}' },
      },
    },
  },
  { client, table }
)

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

| Strategy | Latency | Complexity | AWS Cost |
|----------|---------|------------|----------|
| **Polling** (recommended) | 5-30s | Low | Low |
| Refetch on Focus | User-dependent | Very Low | Very Low |
| WebSocket (API Gateway) | Real-time | High | Medium |
| AppSync Subscriptions | Real-time | Medium | Medium |
| DynamoDB Streams + SSE | Near real-time | High | Medium |

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
    staleTime: 30_000,        // Consider data fresh for 30s
    refetchInterval: 60_000,  // Poll every 60s for updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  }),
  onInsert: async (person) => { /* ... */ },
  onUpdate: async (person) => { /* ... */ },
  onDelete: async (id) => { /* ... */ },
})
```

### Syncing Orama Search Index with Collection

The search index must stay in sync with the TanStack DB collection:

```typescript
// usePersonSearch.ts - Sync Orama with collection state
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from '@tanstack/db'
import { create, insertMultiple, removeMultiple } from '@orama/orama'
import { personsCollection } from '@/webapp/db-collections/persons'

export function usePersonSearch() {
  const [searchIndex, setSearchIndex] = useState<Orama | null>(null)
  const [isBuilding, setIsBuilding] = useState(true)
  const lastSyncRef = useRef<string>('')
  
  // Live query to watch collection changes
  const persons = useLiveQuery(personsCollection, {
    query: {
      $select: ['id', 'firstName', 'lastName', 'email'],
    },
  })
  
  // Rebuild index when persons change
  useEffect(() => {
    async function syncIndex() {
      if (!persons.data) return
      
      // Create hash of current data to detect changes
      const dataHash = JSON.stringify(persons.data.map(p => p.id).sort())
      if (dataHash === lastSyncRef.current) return // No change
      
      setIsBuilding(true)
      
      // Full rebuild (simple, reliable for moderate update frequency)
      const index = await create({
        schema: {
          id: 'string',
          firstName: 'string',
          lastName: 'string',
          fullName: 'string',
          email: 'string',
        },
      })
      
      const docs = persons.data.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        email: p.email ?? '',
      }))
      
      await insertMultiple(index, docs)
      
      setSearchIndex(index)
      lastSyncRef.current = dataHash
      setIsBuilding(false)
    }
    
    syncIndex()
  }, [persons.data])
  
  return { 
    searchIndex, 
    isBuilding,
    isLoading: persons.isLoading,
    lastUpdated: persons.dataUpdatedAt,
  }
}
```

### Alternative: Incremental Index Updates

For higher update frequency, use Orama's incremental operations:

```typescript
// Track and apply incremental changes
useEffect(() => {
  if (!searchIndex || !persons.data) return
  
  const currentIds = new Set(persons.data.map(p => p.id))
  const indexedIds = new Set(/* track indexed IDs */)
  
  // Find additions and removals
  const added = persons.data.filter(p => !indexedIds.has(p.id))
  const removed = [...indexedIds].filter(id => !currentIds.has(id))
  
  if (added.length > 0) {
    insertMultiple(searchIndex, added.map(toSearchDoc))
  }
  if (removed.length > 0) {
    removeMultiple(searchIndex, removed)
  }
}, [persons.data, searchIndex])
```

### Real-Time Option: AppSync Subscriptions (Future Enhancement)

For true real-time sync, AWS AppSync with GraphQL subscriptions:

```typescript
// Future: Real-time subscription
import { useSubscription } from '@/webapp/integrations/appsync'

function useRealtimePersonSync() {
  useSubscription({
    query: onPersonChanged,
    onData: (event) => {
      switch (event.type) {
        case 'INSERT':
          personsCollection.insert(event.person, { optimistic: false })
          break
        case 'UPDATE':
          personsCollection.update(event.person.id, () => event.person, { optimistic: false })
          break
        case 'DELETE':
          personsCollection.delete(event.person.id, { optimistic: false })
          break
      }
    },
  })
}
```

### UI: Show Sync Status

```tsx
function PersonsPage() {
  const { lastUpdated, isLoading } = usePersonSearch()
  
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
  )
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

| Phase | Estimated Time |
|-------|---------------|
| Types & Fake Data | 2-3 hours |
| CDK Updates | 1 hour |
| DDB Client | 3-4 hours |
| Orama Search Integration | 1-2 hours |
| Collections + Server Functions | 2-3 hours |
| Hooks (incl. search) | 1-2 hours |
| UI Components | 4-6 hours |
| Pages | 2-3 hours |
| Seed Script (10k) | 1-2 hours |
| Testing & Polish | 2-3 hours |
| **Total** | **19-28 hours** |

---

*Document created: December 23, 2025*
*Updated with TanStack DB documentation patterns*
*Updated with Orama search and 10,000 persons seeding*
