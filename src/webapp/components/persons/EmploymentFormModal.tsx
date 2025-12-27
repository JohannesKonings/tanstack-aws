import type { Employment } from '#src/webapp/types/person';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <EmploymentForm employment={employment} onSave={handleSave} onCancel={onCancel} />
      </div>
    </div>
  );
};
