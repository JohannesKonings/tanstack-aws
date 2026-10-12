import { AuroraConfigurationError, createStageDatabaseClient } from '@tanstack-aws/aurora';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readAuroraPersonDetail, readAuroraPersonList } from './aurora-persons.ts';
import {
  createAuroraAddress,
  createAuroraBankAccount,
  createAuroraContact,
  createAuroraEmployment,
  createAuroraPerson,
  deleteAuroraAddress,
  deleteAuroraBankAccount,
  deleteAuroraContact,
  deleteAuroraEmployment,
  deleteAuroraPerson,
  updateAuroraAddress,
  updateAuroraBankAccount,
  updateAuroraContact,
  updateAuroraEmployment,
  updateAuroraPerson,
} from './aurora-persons.ts';
import {
  auroraAddressView,
  auroraBankAccountView,
  auroraContactView,
  auroraEmploymentView,
  auroraPersonDetailView,
  auroraPersonListView,
} from './view.ts';

export const auroraPersonListQueryKey = ['aurora-persons'] as const;

export const auroraPersonDetailQueryKey = (personId: string) =>
  ['aurora-person', personId] as const;

export const auroraPersonQueryStaleTime = 30_000;

export const auroraPersonListQuery = <T>(queryFn: () => Promise<T>) => ({
  queryFn,
  queryKey: auroraPersonListQueryKey,
  staleTime: auroraPersonQueryStaleTime,
});

export const auroraPersonDetailQuery = <T>(personId: string, queryFn: () => Promise<T>) => ({
  queryFn,
  queryKey: auroraPersonDetailQueryKey(personId),
  staleTime: auroraPersonQueryStaleTime,
});

const personIdInput = z.object({
  personId: z.uuid(),
});

const configurationError = (error: unknown) => error instanceof AuroraConfigurationError;

export const getAuroraPersonList = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const rows = await readAuroraPersonList(createStageDatabaseClient(), process.env);
    return {
      persons: rows.map((row) => auroraPersonListView.parse(row)),
      status: 'ready' as const,
    };
  } catch (error) {
    if (configurationError(error)) {
      return { status: 'configuration-error' as const };
    }
    throw error;
  }
});

export const getAuroraPersonDetail = createServerFn({ method: 'GET' })
  .validator((input: { personId: string }) => personIdInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const detail = await readAuroraPersonDetail(
        createStageDatabaseClient(),
        process.env,
        data.personId,
      );
      if (!detail.person) {
        return { status: 'missing' as const };
      }
      return {
        addresses: detail.addresses.map((row) => auroraAddressView.parse(row)),
        bankAccounts: detail.bankAccounts.map((row) => auroraBankAccountView.parse(row)),
        contacts: detail.contacts.map((row) => auroraContactView.parse(row)),
        employments: detail.employments.map((row) => auroraEmploymentView.parse(row)),
        person: auroraPersonDetailView.parse(detail.person),
        status: 'ready' as const,
      };
    } catch (error) {
      if (configurationError(error)) {
        return { status: 'configuration-error' as const };
      }
      throw error;
    }
  });

const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
const addressTypeSchema = z.enum(['home', 'work', 'billing', 'shipping']);
const accountTypeSchema = z.enum(['checking', 'savings', 'investment']);
const contactTypeSchema = z.enum(['email', 'phone', 'mobile', 'linkedin', 'twitter']);

const personFields = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: genderSchema.optional(),
});

const personUpdateInput = personFields.extend({
  id: z.uuid(),
});

const addressFields = z.object({
  personId: z.uuid(),
  type: addressTypeSchema,
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  isPrimary: z.boolean(),
});

const addressUpdateInput = addressFields.extend({
  id: z.uuid(),
});

const contactFields = z.object({
  personId: z.uuid(),
  type: contactTypeSchema,
  value: z.string().min(1),
  isPrimary: z.boolean(),
  isVerified: z.boolean(),
});

const contactUpdateInput = contactFields.extend({
  id: z.uuid(),
});

const bankAccountFields = z.object({
  personId: z.uuid(),
  bankName: z.string().min(1),
  accountType: accountTypeSchema,
  accountNumberLast4: z.string().length(4),
  iban: z.string().optional(),
  bic: z.string().optional(),
  isPrimary: z.boolean(),
});

const bankAccountUpdateInput = bankAccountFields.extend({
  id: z.uuid(),
});

const employmentFields = z.object({
  personId: z.uuid(),
  companyName: z.string().min(1),
  position: z.string().min(1),
  department: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean(),
  salary: z.number().positive().optional(),
  currency: z.string().length(3),
});

const employmentUpdateInput = employmentFields.extend({
  id: z.uuid(),
});

const idInput = z.object({
  id: z.uuid(),
});

const stageClient = () => createStageDatabaseClient();

export type CreateAuroraPersonInput = z.infer<typeof personFields>;
export type UpdateAuroraPersonInput = z.infer<typeof personUpdateInput>;
export type CreateAuroraAddressInput = z.infer<typeof addressFields>;
export type UpdateAuroraAddressInput = z.infer<typeof addressUpdateInput>;
export type CreateAuroraContactInput = z.infer<typeof contactFields>;
export type UpdateAuroraContactInput = z.infer<typeof contactUpdateInput>;
export type CreateAuroraBankAccountInput = z.infer<typeof bankAccountFields>;
export type UpdateAuroraBankAccountInput = z.infer<typeof bankAccountUpdateInput>;
export type CreateAuroraEmploymentInput = z.infer<typeof employmentFields>;
export type UpdateAuroraEmploymentInput = z.infer<typeof employmentUpdateInput>;
export type DeleteAuroraRowInput = z.infer<typeof idInput>;

export const createAuroraPersonFn = createServerFn({ method: 'POST' })
  .validator((input: CreateAuroraPersonInput) => personFields.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    await createAuroraPerson(stageClient(), process.env, { id, ...data });
    return { id };
  });

export const updateAuroraPersonFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAuroraPersonInput) => personUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await updateAuroraPerson(stageClient(), process.env, data);
    return { id: data.id };
  });

export const deleteAuroraPersonFn = createServerFn({ method: 'POST' })
  .validator((input: DeleteAuroraRowInput) => idInput.parse(input))
  .handler(async ({ data }) => {
    await deleteAuroraPerson(stageClient(), process.env, data.id);
    return { id: data.id };
  });

export const createAuroraAddressFn = createServerFn({ method: 'POST' })
  .validator((input: CreateAuroraAddressInput) => addressFields.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    await createAuroraAddress(stageClient(), process.env, { id, ...data });
    return { id };
  });

export const updateAuroraAddressFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAuroraAddressInput) => addressUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await updateAuroraAddress(stageClient(), process.env, data);
    return { id: data.id };
  });

export const deleteAuroraAddressFn = createServerFn({ method: 'POST' })
  .validator((input: DeleteAuroraRowInput) => idInput.parse(input))
  .handler(async ({ data }) => {
    await deleteAuroraAddress(stageClient(), process.env, data.id);
    return { id: data.id };
  });

export const createAuroraContactFn = createServerFn({ method: 'POST' })
  .validator((input: CreateAuroraContactInput) => contactFields.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    await createAuroraContact(stageClient(), process.env, { id, ...data });
    return { id };
  });

export const updateAuroraContactFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAuroraContactInput) => contactUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await updateAuroraContact(stageClient(), process.env, data);
    return { id: data.id };
  });

export const deleteAuroraContactFn = createServerFn({ method: 'POST' })
  .validator((input: DeleteAuroraRowInput) => idInput.parse(input))
  .handler(async ({ data }) => {
    await deleteAuroraContact(stageClient(), process.env, data.id);
    return { id: data.id };
  });

export const createAuroraBankAccountFn = createServerFn({ method: 'POST' })
  .validator((input: CreateAuroraBankAccountInput) => bankAccountFields.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    await createAuroraBankAccount(stageClient(), process.env, { id, ...data });
    return { id };
  });

export const updateAuroraBankAccountFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAuroraBankAccountInput) => bankAccountUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await updateAuroraBankAccount(stageClient(), process.env, data);
    return { id: data.id };
  });

export const deleteAuroraBankAccountFn = createServerFn({ method: 'POST' })
  .validator((input: DeleteAuroraRowInput) => idInput.parse(input))
  .handler(async ({ data }) => {
    await deleteAuroraBankAccount(stageClient(), process.env, data.id);
    return { id: data.id };
  });

export const createAuroraEmploymentFn = createServerFn({ method: 'POST' })
  .validator((input: CreateAuroraEmploymentInput) => employmentFields.parse(input))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID();
    await createAuroraEmployment(stageClient(), process.env, { id, ...data });
    return { id };
  });

export const updateAuroraEmploymentFn = createServerFn({ method: 'POST' })
  .validator((input: UpdateAuroraEmploymentInput) => employmentUpdateInput.parse(input))
  .handler(async ({ data }) => {
    await updateAuroraEmployment(stageClient(), process.env, data);
    return { id: data.id };
  });

export const deleteAuroraEmploymentFn = createServerFn({ method: 'POST' })
  .validator((input: DeleteAuroraRowInput) => idInput.parse(input))
  .handler(async ({ data }) => {
    await deleteAuroraEmployment(stageClient(), process.env, data.id);
    return { id: data.id };
  });
