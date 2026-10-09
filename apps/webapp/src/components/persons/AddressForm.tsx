import { useForm } from '@tanstack/react-form';
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { z } from 'zod';
import { Button } from '#apps/webapp/components/ui/button';
import { SelectDropdown } from '#apps/webapp/components/ui/dropdown';
import { Input } from '#apps/webapp/components/ui/input';
import { type Address, AddressTypeEnum } from '#apps/webapp/types/person';

const AddressFormSchema = z.object({
  type: AddressTypeEnum,
  street: z.string().min(1, 'Street is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  isPrimary: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof AddressFormSchema>;

const addressTypeOptions = [
  { value: 'home' as const, label: 'Home' },
  { value: 'work' as const, label: 'Work' },
  { value: 'billing' as const, label: 'Billing' },
  { value: 'shipping' as const, label: 'Shipping' },
];

interface AddressFormProps {
  address?: Address;
  onSave: (values: AddressFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const AddressForm = ({ address, onSave, onCancel, isLoading }: AddressFormProps) => {
  const formApi = useForm({
    defaultValues: {
      type: address?.type ?? 'home',
      street: address?.street ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      postalCode: address?.postalCode ?? '',
      country: address?.country ?? 'USA',
      isPrimary: address?.isPrimary ?? false,
    },
    validators: {
      onChange: (({ value }: { value: AddressFormValues }) => {
        const result = AddressFormSchema.safeParse(value);
        if (!result.success) {
          return result.error;
        }
        return undefined;
      }) as any,
    },
    onSubmit: ({ value }: { value: AddressFormValues }) => {
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
      <FormField name="type">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Address Type</label>
            <SelectDropdown
              value={field.state.value}
              onChange={(value) => {
                if (value) {
                  field.handleChange(value);
                }
              }}
              onBlur={field.handleBlur}
              placeholder="Select address type"
              options={addressTypeOptions}
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

      <FormField name="street">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Street Address
            </label>
            <Input
              placeholder="123 Main St"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="city">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">City</label>
              <Input
                placeholder="New York"
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

        <FormField name="state">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                State/Province
              </label>
              <Input
                placeholder="NY"
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="postalCode">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Postal Code
              </label>
              <Input
                placeholder="10001"
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

        <FormField name="country">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Country</label>
              <Input
                placeholder="USA"
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
      </div>

      <FormField name="isPrimary">
        {(field: any) => (
          <div className="flex flex-row items-center gap-2 rounded-md border border-border-default p-4">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              onBlur={field.handleBlur}
            />
            <div className="space-y-1 leading-none">
              <span className="text-sm font-medium text-text-primary">Primary Address</span>
              <span className="block text-xs text-text-muted">This is your main address.</span>
            </div>
          </div>
        )}
      </FormField>

      <div className="flex gap-2">
        {(() => {
          let submitLabel = 'Add Address';
          if (address) {
            submitLabel = 'Update Address';
          }
          if (isLoading) {
            submitLabel = 'Saving...';
          }
          return (
            <Button type="submit" disabled={isLoading}>
              {submitLabel}
            </Button>
          );
        })()}
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
