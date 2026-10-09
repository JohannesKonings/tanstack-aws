import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';
import type { Employment } from '#apps/webapp/types/person';
import { EmploymentForm } from './EmploymentForm.tsx';

interface EmploymentFormModalProps {
  personId: string;
  employment?: Employment;
  onSave: (employment: Omit<Employment, 'id'>) => void;
  onCancel: () => void;
}

export const EmploymentFormModal = ({
  personId: _personId,
  employment,
  onSave,
  onCancel,
}: EmploymentFormModalProps) => {
  let title = 'Add Employment';
  if (employment) {
    title = 'Edit Employment';
  }

  const handleSave = (values: {
    companyName: string;
    position: string;
    department?: string;
    startDate: string;
    endDate?: string | null;
    isCurrent: boolean;
    salary?: number;
    currency: string;
  }) => {
    onSave({ ...values, personId: _personId });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader title={title} />
        <DialogBody>
          <EmploymentForm employment={employment} onSave={handleSave} onCancel={onCancel} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
