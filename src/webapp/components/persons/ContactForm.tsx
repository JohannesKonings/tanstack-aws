import type { ContactInfo } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

const ContactTypeEnum = z.enum(['email', 'phone', 'mobile', 'linkedin', 'twitter']);

const ContactFormSchema = z.object({
  type: ContactTypeEnum,
  value: z.string().min(1, 'Value is required').max(200),
  isPrimary: z.boolean().default(false),
  isVerified: z.boolean().default(false),
});

type ContactFormValues = z.infer<typeof ContactFormSchema>;

interface ContactFormProps {
  contact?: ContactInfo;
  onSave: (values: ContactFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ContactForm = ({ contact, onSave, onCancel, isLoading }: ContactFormProps) => {
  const formApi = useForm<ContactFormValues>({
    defaultValues: {
      type: contact?.type ?? 'email',
      value: contact?.value ?? '',
      isPrimary: contact?.isPrimary ?? false,
      isVerified: contact?.isVerified ?? false,
    },
    validators: { onChange: ContactFormSchema },
    onSubmit: ({ value }: { value: ContactFormValues }) => {
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
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="mobile">Mobile</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
            </select>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="value">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Value</label>
            <input
              placeholder="Enter value"
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

      <div className="grid grid-cols-2 gap-4">
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

        <FormField name="isVerified">
          {(field: any) => (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
                onBlur={field.handleBlur}
              />
              <span className="text-sm">Verified</span>
            </div>
          )}
        </FormField>
      </div>

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
