// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '#apps/webapp/components/ui/button';
import { SelectDropdown } from '#apps/webapp/components/ui/dropdown';
import { Input } from '#apps/webapp/components/ui/input';
import type { BankAccount } from '#apps/webapp/types/person';

const AccountTypeEnum = z.enum(['checking', 'savings', 'investment']);

const BankAccountFormSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required').max(100),
  accountType: AccountTypeEnum,
  accountNumberLast4: z.string().min(4, 'Last 4 digits').max(4),
  iban: z.string().optional(),
  bic: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type BankAccountFormValues = z.infer<typeof BankAccountFormSchema>;

const accountTypeOptions = [
  { value: 'checking' as const, label: 'Checking' },
  { value: 'savings' as const, label: 'Savings' },
  { value: 'investment' as const, label: 'Investment' },
];

interface BankAccountFormProps {
  account?: BankAccount;
  onSave: (values: BankAccountFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const BankAccountForm = ({ account, onSave, onCancel, isLoading }: BankAccountFormProps) => {
  const formApi = useForm({
    defaultValues: {
      bankName: account?.bankName ?? '',
      accountType: account?.accountType ?? 'checking',
      accountNumberLast4: account?.accountNumberLast4 ?? '',
      iban: account?.iban ?? '',
      bic: account?.bic ?? '',
      isPrimary: account?.isPrimary ?? false,
    },
    validators: {
      onChange: (({ value }: { value: BankAccountFormValues }) => {
        const result = BankAccountFormSchema.safeParse(value);
        if (!result.success) {
          return result.error;
        }
        return undefined;
      }) as any,
    },
    onSubmit: ({ value }: { value: BankAccountFormValues }) => {
      onSave(value);
    },
  });
  const FormField = formApi.Field;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        formApi.handleSubmit();
      }}
      className="space-y-4"
    >
      <FormField name="bankName">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Bank Name</label>
            <Input
              placeholder="Bank name"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="accountType">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Account Type</label>
            <SelectDropdown
              value={field.state.value}
              onChange={(value) => {
                if (value) {
                  field.handleChange(value);
                }
              }}
              onBlur={field.handleBlur}
              placeholder="Select account type"
              options={accountTypeOptions}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="accountNumberLast4">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Last 4 digits
            </label>
            <Input
              placeholder="1234"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="iban">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">IBAN</label>
            <Input
              placeholder="Optional"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="bic">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">BIC</label>
            <Input
              placeholder="Optional"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="isPrimary">
        {(field: any) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              onBlur={field.handleBlur}
            />
            <span className="text-sm text-text-primary">Primary</span>
          </div>
        )}
      </FormField>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" onClick={onCancel} disabled={isLoading} variant="secondary">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          Save
        </Button>
      </div>
    </form>
  );
};
