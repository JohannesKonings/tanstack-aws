import { Button } from '#src/webapp/components/ui/button';
import { type Address, AddressTypeEnum } from '#src/webapp/types/person';
import { useForm } from '@tanstack/react-form';
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { z } from 'zod';

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
            <label className="block text-sm font-medium mb-1">Address Type</label>
            <select
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="billing">Billing</option>
              <option value="shipping">Shipping</option>
            </select>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="street">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Street Address</label>
            <input
              placeholder="123 Main St"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="city">
          {(field: any) => (
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                placeholder="New York"
                className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
              {(() => {
                const [firstError] = field.state.meta.errors;
                return firstError ? (
                  <p className="text-xs text-red-400 mt-1">{firstError}</p>
                ) : null;
              })()}
            </div>
          )}
        </FormField>

        <FormField name="state">
          {(field: any) => (
            <div>
              <label className="block text-sm font-medium mb-1">State/Province</label>
              <input
                placeholder="NY"
                className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
              {(() => {
                const [firstError] = field.state.meta.errors;
                return firstError ? (
                  <p className="text-xs text-red-400 mt-1">{firstError}</p>
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
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <input
                placeholder="10001"
                className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
              {(() => {
                const [firstError] = field.state.meta.errors;
                return firstError ? (
                  <p className="text-xs text-red-400 mt-1">{firstError}</p>
                ) : null;
              })()}
            </div>
          )}
        </FormField>

        <FormField name="country">
          {(field: any) => (
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                placeholder="USA"
                className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
              />
              {(() => {
                const [firstError] = field.state.meta.errors;
                return firstError ? (
                  <p className="text-xs text-red-400 mt-1">{firstError}</p>
                ) : null;
              })()}
            </div>
          )}
        </FormField>
      </div>

      <FormField name="isPrimary">
        {(field: any) => (
          <div className="flex flex-row items-center gap-2 rounded-md border p-4">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              onBlur={field.handleBlur}
            />
            <div className="space-y-1 leading-none">
              <span className="text-sm font-medium">Primary Address</span>
              <span className="block text-xs text-white/60">This is your main address.</span>
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
          <Button
            type="button"
            onClick={onCancel}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/40 cursor-pointer"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
