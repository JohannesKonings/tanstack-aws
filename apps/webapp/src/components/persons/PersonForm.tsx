// oxlint-disable no-magic-numbers
// oxlint-disable no-ternary
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '#apps/webapp/components/ui/button';
import { SelectDropdown } from '#apps/webapp/components/ui/dropdown';
import { Input } from '#apps/webapp/components/ui/input';
import { GenderEnum, type Person } from '#apps/webapp/types/person';

export type PersonFormPerson = Pick<Person, 'firstName' | 'lastName' | 'dateOfBirth' | 'gender'>;

const PersonFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().optional(),
  gender: GenderEnum.optional(),
});

type PersonFormValues = z.infer<typeof PersonFormSchema>;

const genderOptions = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
  { value: 'other' as const, label: 'Other' },
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say' },
];

interface PersonFormProps {
  person?: PersonFormPerson;
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
              <label className="mb-1 block text-sm font-medium text-text-primary">First Name</label>
              <Input
                placeholder="John"
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

        <FormField name="lastName">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Last Name</label>
              <Input
                placeholder="Doe"
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

      <FormField name="dateOfBirth">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Date of Birth
            </label>
            <Input
              type="date"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
            />
            <p className="text-xs text-text-muted mt-1">Optional. Your date of birth.</p>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
            })()}
          </div>
        )}
      </FormField>

      <FormField name="gender">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Gender</label>
            <SelectDropdown
              value={field.state.value}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
              placeholder="Select gender"
              clearable
              options={genderOptions}
            />
            <p className="text-xs text-text-muted mt-1">Optional. How you identify.</p>
            {(() => {
              const [firstError] = field.state.meta.errors;
              return firstError ? (
                <p className="text-xs text-text-error mt-1">{firstError}</p>
              ) : null;
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
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
