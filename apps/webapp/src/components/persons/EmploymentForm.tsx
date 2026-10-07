// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Button } from '#apps/webapp/components/ui/button';
import { Input } from '#apps/webapp/components/ui/input';
import type { Employment } from '#apps/webapp/types/person';

const EmploymentFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100),
  position: z.string().min(1, 'Position is required').max(100),
  department: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  salary: z.number().positive().optional(),
  currency: z.string().length(3, 'Use a 3-letter currency code').default('USD'),
});

type EmploymentFormValues = z.infer<typeof EmploymentFormSchema>;

interface EmploymentFormProps {
  employment?: Employment;
  onSave: (values: EmploymentFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const EmploymentForm = ({
  employment,
  onSave,
  onCancel,
  isLoading,
}: EmploymentFormProps) => {
  const formApi = useForm({
    defaultValues: {
      companyName: employment?.companyName ?? '',
      position: employment?.position ?? '',
      department: employment?.department ?? '',
      startDate: employment?.startDate ? employment.startDate.split('T')[0] : '',
      endDate: employment?.endDate ? employment.endDate.split('T')[0] : '',
      isCurrent: employment?.isCurrent ?? false,
      salary: employment?.salary ?? undefined,
      currency: employment?.currency ?? 'USD',
    } satisfies EmploymentFormValues,
    validators: {
      onChange: (({ value }: { value: EmploymentFormValues }) => {
        const result = EmploymentFormSchema.safeParse(value);
        if (!result.success) {
          return result.error;
        }
        return undefined;
      }) as any,
    },
    onSubmit: ({ value }: { value: EmploymentFormValues }) => {
      const normalizedSalary = value.salary ?? undefined;
      const normalizedEndDate =
        value.isCurrent || !value.endDate ? null : new Date(value.endDate).toISOString();

      onSave({
        ...value,
        startDate: new Date(value.startDate).toISOString(),
        endDate: normalizedEndDate,
        salary: normalizedSalary,
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
      className="space-y-4"
    >
      <FormField name="companyName">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Company Name</label>
            <Input
              placeholder="Company"
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

      <FormField name="position">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Position</label>
            <Input
              placeholder="Position"
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

      <FormField name="department">
        {(field: any) => (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Department</label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="startDate">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Start Date</label>
              <Input
                type="date"
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

        <FormField name="endDate">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">End Date</label>
              <Input
                type="date"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                disabled={formApi.state.values.isCurrent}
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

      <FormField name="isCurrent">
        {(field: any) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(event) => field.handleChange(event.target.checked)}
              onBlur={field.handleBlur}
            />
            <span className="text-sm text-text-primary">Current Role</span>
          </div>
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="salary">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Salary</label>
              <Input
                type="number"
                placeholder="Optional"
                value={field.state.value ?? ''}
                onChange={(event) => {
                  const valueStr = event.target.value;
                  field.handleChange(valueStr ? Number(valueStr) : undefined);
                }}
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

        <FormField name="currency">
          {(field: any) => (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Currency</label>
              <Input
                placeholder="USD"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
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
