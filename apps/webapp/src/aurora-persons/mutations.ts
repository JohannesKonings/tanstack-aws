import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  auroraPersonDetailQueryKey,
  auroraPersonListQueryKey,
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

const useInvalidateAuroraPersonList = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: auroraPersonListQueryKey });
};

export const useCreateAuroraPerson = () => {
  const invalidate = useInvalidateAuroraPersonList();
  const createPerson = useServerFn(createAuroraPersonFn);
  return useMutation({
    mutationFn: (input: CreateAuroraPersonInput) => createPerson({ data: input }),
    onSuccess: invalidate,
  });
};

export const useAuroraPersonDetailMutations = (personId: string) => {
  const queryClient = useQueryClient();
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: auroraPersonListQueryKey });
  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: auroraPersonDetailQueryKey(personId) });
  const invalidatePerson = () => Promise.all([invalidateList(), invalidateDetail()]);
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
      onSuccess: invalidatePerson,
    }),
    deletePerson: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deletePerson({ data: input }),
      onSuccess: invalidatePerson,
    }),
    createAddress: useMutation({
      mutationFn: (input: CreateAuroraAddressInput) => createAddress({ data: input }),
      onSuccess: invalidateDetail,
    }),
    updateAddress: useMutation({
      mutationFn: (input: UpdateAuroraAddressInput) => updateAddress({ data: input }),
      onSuccess: invalidateDetail,
    }),
    deleteAddress: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteAddress({ data: input }),
      onSuccess: invalidateDetail,
    }),
    createContact: useMutation({
      mutationFn: (input: CreateAuroraContactInput) => createContact({ data: input }),
      onSuccess: invalidateDetail,
    }),
    updateContact: useMutation({
      mutationFn: (input: UpdateAuroraContactInput) => updateContact({ data: input }),
      onSuccess: invalidateDetail,
    }),
    deleteContact: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteContact({ data: input }),
      onSuccess: invalidateDetail,
    }),
    createBankAccount: useMutation({
      mutationFn: (input: CreateAuroraBankAccountInput) => createBankAccount({ data: input }),
      onSuccess: invalidateDetail,
    }),
    updateBankAccount: useMutation({
      mutationFn: (input: UpdateAuroraBankAccountInput) => updateBankAccount({ data: input }),
      onSuccess: invalidateDetail,
    }),
    deleteBankAccount: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteBankAccount({ data: input }),
      onSuccess: invalidateDetail,
    }),
    createEmployment: useMutation({
      mutationFn: (input: CreateAuroraEmploymentInput) => createEmployment({ data: input }),
      onSuccess: invalidateDetail,
    }),
    updateEmployment: useMutation({
      mutationFn: (input: UpdateAuroraEmploymentInput) => updateEmployment({ data: input }),
      onSuccess: invalidateDetail,
    }),
    deleteEmployment: useMutation({
      mutationFn: (input: DeleteAuroraRowInput) => deleteEmployment({ data: input }),
      onSuccess: invalidateDetail,
    }),
  };
};
