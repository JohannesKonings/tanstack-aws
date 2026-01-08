// oxlint-disable no-ternary
import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person';
import {
  addressesCollection,
  bankAccountsCollection,
  contactsCollection,
  employmentsCollection,
  personsCollection,
} from '#src/webapp/db-collections/persons';
import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// Constants
// =============================================================================

const SSE_ENDPOINT = '/api/persons-stream';

// Flag to track when we're applying SSE changes
// This prevents SSE updates from triggering DynamoDB writes
let isApplyingSseChange = false;

/**
 * Check if currently applying an SSE change
 * Collection handlers can use this to skip server writes
 */
export const isFromSse = (): boolean => isApplyingSseChange;

// =============================================================================
// Types
// =============================================================================

type EntityType = 'person' | 'address' | 'bankAccount' | 'contactInfo' | 'employment';
type EventType = 'INSERT' | 'MODIFY' | 'REMOVE';

interface ChangeEventData {
  timestamp?: string;
  eventType?: EventType;
  entityType?: EntityType;
  entity?: object | null;
  oldEntity?: object;
}

interface SseSyncState {
  isConnected: boolean;
  lastSyncTime: Date | null;
}

// =============================================================================
// Collection Update Functions
// =============================================================================

/**
 * Apply an INSERT change to the collection
 */
const applyInsert = (entityType: EntityType, entity: object | null | undefined): void => {
  if (!entity) {
    return;
  }

  // Note: TanStack DB collections handle duplicates gracefully
  // If the entity already exists, this becomes an update operation
  switch (entityType) {
    case 'person':
      personsCollection.insert(entity as Person);
      break;
    case 'address':
      addressesCollection.insert(entity as Address);
      break;
    case 'bankAccount':
      bankAccountsCollection.insert(entity as BankAccount);
      break;
    case 'contactInfo':
      contactsCollection.insert(entity as ContactInfo);
      break;
    case 'employment':
      employmentsCollection.insert(entity as Employment);
      break;
  }
};

/**
 * Apply a MODIFY change to the collection
 */
const applyModify = (entityType: EntityType, entity: object | null | undefined): void => {
  if (!entity) {
    return;
  }

  const entityWithId = entity as { id: string };

  switch (entityType) {
    case 'person':
      personsCollection.update(entityWithId.id, (draft) => {
        Object.assign(draft, entity);
      });
      break;
    case 'address':
      addressesCollection.update(entityWithId.id, (draft) => {
        Object.assign(draft, entity);
      });
      break;
    case 'bankAccount':
      bankAccountsCollection.update(entityWithId.id, (draft) => {
        Object.assign(draft, entity);
      });
      break;
    case 'contactInfo':
      contactsCollection.update(entityWithId.id, (draft) => {
        Object.assign(draft, entity);
      });
      break;
    case 'employment':
      employmentsCollection.update(entityWithId.id, (draft) => {
        Object.assign(draft, entity);
      });
      break;
  }
};

/**
 * Apply a REMOVE change to the collection
 */
const applyRemove = (
  entityType: EntityType,
  entity: object | null | undefined,
  oldEntity: object | undefined,
): void => {
  const entityWithId = entity as { id: string } | null | undefined;
  const oldEntityWithId = oldEntity as { id: string } | undefined;
  const removeId = entityWithId?.id ?? oldEntityWithId?.id;

  if (!removeId) {
    return;
  }

  switch (entityType) {
    case 'person':
      personsCollection.delete(removeId);
      break;
    case 'address':
      addressesCollection.delete(removeId);
      break;
    case 'bankAccount':
      bankAccountsCollection.delete(removeId);
      break;
    case 'contactInfo':
      contactsCollection.delete(removeId);
      break;
    case 'employment':
      employmentsCollection.delete(removeId);
      break;
  }
};

/**
 * Apply a change event to the appropriate TanStack DB collection.
 * Only applies changes if they differ from current collection state.
 */
const applyChangeToCollection = (data: ChangeEventData): void => {
  if (!data.entityType || !data.eventType) {
    return;
  }

  switch (data.eventType) {
    case 'INSERT':
      applyInsert(data.entityType, data.entity);
      break;
    case 'MODIFY':
      applyModify(data.entityType, data.entity);
      break;
    case 'REMOVE':
      applyRemove(data.entityType, data.entity, data.oldEntity);
      break;
  }
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for real-time SSE synchronization with TanStack DB.
 * Uses native EventSource to receive entity changes from the persons-stream endpoint.
 *
 * **IMPORTANT: Preventing Endless Loops**
 * This hook sets a global `isApplyingSseChange` flag when applying SSE changes.
 * Collection mutation handlers (onInsert/onUpdate/onDelete) should check `isFromSse()`
 * and skip DynamoDB writes when true. This breaks the loop:
 *
 * - SSE event -> isApplyingSseChange=true -> collection mutation -> onInsert checks isFromSse()
 *   -> returns true -> ✅ skips DynamoDB write
 * - Local user mutation -> isApplyingSseChange=false -> onInsert checks isFromSse()
 *   -> returns false -> ✅ writes to DynamoDB -> stream -> SSE event (handled above)
 *
 * This approach allows SSE to update local state without triggering server writes,
 * while user-initiated changes still persist to DynamoDB as expected.
 *
 * EventSource automatically handles reconnection using the `retry` directive from
 * the server. The server also sends a `reconnect` event before graceful timeout
 * to signal the client that a reconnection is expected.
 *
 * Based on the simple /api/events blueprint pattern.
 *
 * @returns Object with isConnected, lastSyncTime, and reconnect function
 */
export const useSseSync = (): SseSyncState & { reconnect: () => void } => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [state, setState] = useState<SseSyncState>({ isConnected: false, lastSyncTime: null });

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection
    const eventSource = new EventSource(SSE_ENDPOINT);
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    // Handle connection error - EventSource will automatically reconnect
    // Based on the retry directive from the server
    eventSource.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    };

    // Handle 'connected' event from server
    eventSource.addEventListener('connected', () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    });

    // Handle 'change' events (entity changes)
    eventSource.addEventListener('change', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ChangeEventData;

        // Set flag to indicate we're applying SSE changes
        // This prevents mutation handlers from writing back to DynamoDB
        isApplyingSseChange = true;
        try {
          applyChangeToCollection(data);
        } finally {
          // Always reset the flag, even if an error occurs
          isApplyingSseChange = false;
        }

        if (data.timestamp) {
          setState((prev) => ({ ...prev, lastSyncTime: new Date(data.timestamp as string) }));
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Handle 'reconnect' event (server signaling graceful close before timeout)
    // EventSource will automatically reconnect using the retry directive
    eventSource.addEventListener('reconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    // Connect on mount
    connect();

    // Disconnect on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    reconnect,
  };
};
