import {
  createStore,
  Store,
  type ReadonlyStore as TanStackReadonlyStore,
  type Store as TanStackStoreType,
} from '@tanstack/store';

type PersonState = {
  firstName: string;
  lastName: string;
};

export const store = new Store({
  firstName: 'Jane',
  lastName: 'Smith',
}) as TanStackStoreType<PersonState>;

const fullNameStore = createStore(
  () => `${store.state.firstName} ${store.state.lastName}`,
) as TanStackReadonlyStore<string>;
export const fullName = fullNameStore;

if (typeof (fullName as { mount?: () => void }).mount === 'function') {
  (fullName as unknown as { mount: () => void }).mount();
}
