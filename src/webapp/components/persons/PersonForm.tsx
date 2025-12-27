import { Button } from '#src/webapp/components/ui/button';
import { GenderEnum, type Person } from '#src/webapp/types/person';
// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

const PersonFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().optional(),
  gender: GenderEnum.optional(),
});

type PersonFormValues = z.infer<typeof PersonFormSchema>;

interface PersonFormProps {
  person?: Person;
  onSave: (values: PersonFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const PersonForm = ({ person, onSave, onCancel, isLoading }: PersonFormProps) => {
  const formApi = useForm({
    defaultValues: {
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? '',
      dateOfBirth: person?.dateOfBirth
        ? new Date(person.dateOfBirth).toISOString().split('T')[0]
        : '',
      gender: person?.gender,
    } satisfies PersonFormValues,
    validators: {
      onChange: (({ value }: { value: PersonFormValues }) => {
        const result = PersonFormSchema.safeParse(value);
        if (!result.success) {
          return result.error;
        }
        return undefined;
      }) as any,
    },
    onSubmit: ({ value }: { value: PersonFormValues }) => {
      onSave({
        ...value,
        dateOfBirth: value.dateOfBirth ? new Date(value.dateOfBirth).toISOString() : undefined,
      });
    },
  });
  const FormField = formApi.Field;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        formApi.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="firstName">
          {(field: any) => (
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                placeholder="John"
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

        <FormField name="lastName">
          {(field: any) => (
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                placeholder="Doe"
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

      <FormField name="dateOfBirth">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="date"
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            <p className="text-xs text-white/60 mt-1">Optional. Your date of birth.</p>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="gender">
        {(field: any) => (
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <style>{`
              select option {
                background-color: #1f2937;
                color: white;
              }
              select option:checked {
                background-color: #3b82f6;
                color: white;
              }
            `}</style>
            <select
              className="w-full rounded border border-white/20 bg-white/5 p-2 text-white"
              value={field.state.value ?? ''}
              onChange={(event) => field.handleChange(event.target.value || undefined)}
              onBlur={field.handleBlur}
              style={{
                colorScheme: 'dark',
              }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            <p className="text-xs text-white/60 mt-1">Optional. How you identify.</p>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? <p className="text-xs text-red-400 mt-1">{firstError}</p> : null;
            })()}
          </div>
        )}
      </FormField>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {(() => {
            if (isLoading) {
              return 'Saving...';
            }
            if (person) {
              return 'Update Person';
            }
            return 'Create Person';
          })()}
        </Button>
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
