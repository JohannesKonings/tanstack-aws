import { createStore, Store } from '@tanstack/store';

export const store = new Store({
  firstName: 'Jane',
  lastName: 'Smith',
});

export const fullName = createStore(() => `${store.state.firstName} ${store.state.lastName}`);
