// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '#src/webapp/components/ui/button';
import type { ContactInfo } from '#src/webapp/types/person';

const ContactTypeEnum = z.enum(['email', 'phone', 'mobile', 'linkedin', 'twitter']);

function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  );
}

function toErrorMessage(err: unknown): string {
  return isErrorWithMessage(err) ? err.message : String(err);
}

// No .default() so input/output types match for TanStack Form validators (StandardSchema)
const ContactFormSchema = z.object({
  type: ContactTypeEnum,
  value: z.string().min(1, 'Value is required').max(200),
  isPrimary: z.boolean(),
  isVerified: z.boolean(),
});

type ContactFormValues = z.infer<typeof ContactFormSchema>;

interface ContactFormProps {
  contact?: ContactInfo;
  onSave: (values: ContactFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const ContactForm = ({ contact, onSave, onCancel, isLoading }: ContactFormProps) => {
  const formApi = useForm({
    defaultValues: {
      type: (() => {
        const result = ContactTypeEnum.safeParse(contact?.type);
        return result.success ? result.data : 'email';
      })(),
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
        {(field) => (
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => {
                const parsed = ContactTypeEnum.safeParse(event.target.value);
                if (parsed.success) {
                  field.handleChange(parsed.data);
                }
              }}
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
              const msg = firstError ? toErrorMessage(firstError) : null;
              return msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="value">
        {(field) => (
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
              const msg = firstError ? toErrorMessage(firstError) : null;
              return msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField name="isPrimary">
          {(field) => (
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
          {(field) => (
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
