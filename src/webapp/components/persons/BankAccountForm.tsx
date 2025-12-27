import type { BankAccount } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

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
            <label className="block text-sm font-medium mb-1">Bank Name</label>
            <input
              placeholder="Bank name"
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="accountType">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Account Type</label>
            <select
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
            </select>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="accountNumberLast4">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Last 4 digits</label>
            <input
              placeholder="1234"
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="iban">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">IBAN</label>
            <input
              placeholder="Optional"
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="bic">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">BIC</label>
            <input
              placeholder="Optional"
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
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
            <span className="text-sm">Primary</span>
          </div>
        )}
      </FormField>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/40 cursor-pointer"
          >
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
