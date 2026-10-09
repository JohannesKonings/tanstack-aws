import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  auroraPersonsQueryKey,
  createAuroraAddressFn,
  type CreateAuroraAddressInput,
  createAuroraBankAccountFn,
  type CreateAuroraBankAccountInput,
  createAuroraContactFn,
  type CreateAuroraContactInput,
  createAuroraEmploymentFn,
  type CreateAuroraEmploymentInput,
  createAuroraPersonFn,
  type CreateAuroraPersonInput,
  deleteAuroraAddressFn,
  deleteAuroraBankAccountFn,
  deleteAuroraContactFn,
  deleteAuroraEmploymentFn,
  deleteAuroraPersonFn,
  type DeleteAuroraRowInput,
  updateAuroraAddressFn,
  type UpdateAuroraAddressInput,
  updateAuroraBankAccountFn,
  type UpdateAuroraBankAccountInput,
  updateAuroraContactFn,
  type UpdateAuroraContactInput,
  updateAuroraEmploymentFn,
  type UpdateAuroraEmploymentInput,
  updateAuroraPersonFn,
  type UpdateAuroraPersonInput,
} from './server.ts';

const useInvalidateAuroraPersons = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: auroraPersonsQueryKey });
};

export const useCreateAuroraPerson = () => {
  const invalidate = useInvalidateAuroraPersons();
  const createPerson = useServerFn(createAuroraPersonFn);
  return useMutation({
    mutationFn: (input: CreateAuroraPersonInput) => createPerson({ data: input }),
    onSuccess: invalidate,
  });
};

export const useAuroraPersonDetailMutations = () => {
  const invalidate = useInvalidateAuroraPersons();
  const updatePerson = useServerFn(updateAuroraPersonFn);
  const deletePerson = useServerFn(deleteAuroraPersonFn);
  const createAddress = useServerFn(createAuroraAddressFn);
  const updateAddress = useServerFn(updateAuroraAddressFn);
  const deleteAddress = useServerFn(deleteAuroraAddressFn);
  const createContact = useServerFn(createAuroraContactFn);
  const updateContact = useServerFn(updateAuroraContactFn);
  const deleteContact = useServerFn(deleteAuroraContactFn);
  const createBankAccount = useServerFn(createAuroraBankAccountFn);
  const updateBankAccount = useServerFn(updateAuroraBankAccountFn);
  const deleteBankAccount = useServerFn(deleteAuroraBankAccountFn);
  const createEmployment = useServerFn(createAuroraEmploymentFn);
  const updateEmployment = useServerFn(updateAuroraEmploymentFn);
  const deleteEmployment = useServerFn(deleteAuroraEmploymentFn);

  return {
    updatePerson: useMutation({
      mutationFn: (input: UpdateAuroraPersonInput) => updatePerson({ data: input }),
      onSuccess: invalidate,
    }),
    deletePerson: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deletePerson({ data: input }),
      onSuccess: invalidate,
    }),
    createAddress: useMutation({
      mutationFn: (input: CreateAuroraAddressInput) => createAddress({ data: input }),
      onSuccess: invalidate,
    }),
    updateAddress: useMutation({
      mutationFn: (input: UpdateAuroraAddressInput) => updateAddress({ data: input }),
      onSuccess: invalidate,
    }),
    deleteAddress: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteAddress({ data: input }),
      onSuccess: invalidate,
    }),
    createContact: useMutation({
      mutationFn: (input: CreateAuroraContactInput) => createContact({ data: input }),
      onSuccess: invalidate,
    }),
    updateContact: useMutation({
      mutationFn: (input: UpdateAuroraContactInput) => updateContact({ data: input }),
      onSuccess: invalidate,
    }),
    deleteContact: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteContact({ data: input }),
      onSuccess: invalidate,
    }),
    createBankAccount: useMutation({
      mutationFn: (input: CreateAuroraBankAccountInput) => createBankAccount({ data: input }),
      onSuccess: invalidate,
    }),
    updateBankAccount: useMutation({
      mutationFn: (input: UpdateAuroraBankAccountInput) => updateBankAccount({ data: input }),
      onSuccess: invalidate,
    }),
    deleteBankAccount: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteBankAccount({ data: input }),
      onSuccess: invalidate,
    }),
    createEmployment: useMutation({
      mutationFn: (input: CreateAuroraEmploymentInput) => createEmployment({ data: input }),
      onSuccess: invalidate,
    }),
    updateEmployment: useMutation({
      mutationFn: (input: UpdateAuroraEmploymentInput) => updateEmployment({ data: input }),
      onSuccess: invalidate,
    }),
    deleteEmployment: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteEmployment({ data: input }),
      onSuccess: invalidate,
    }),
  };
};
