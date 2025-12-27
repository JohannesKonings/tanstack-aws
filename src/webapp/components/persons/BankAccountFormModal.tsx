import type { BankAccount } from '#src/webapp/types/person';
import { X } from 'lucide-react';
import { BankAccountForm } from './BankAccountForm.tsx';

interface BankAccountFormModalProps {
  personId: string;
  account?: BankAccount;
  onSave: (account: Omit<BankAccount, 'id'>) => void;
  onCancel: () => void;
}

export const BankAccountFormModal = ({
  personId: _personId,
  account,
  onSave,
  onCancel,
}: BankAccountFormModalProps) => {
  let title = 'Add Bank Account';
  if (account) {
    title = 'Edit Bank Account';
  }

  const handleSave = (values: {
    bankName: string;
    accountType: BankAccount['accountType'];
    accountNumberLast4: string;
    iban?: string;
    bic?: string;
    isPrimary: boolean;
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
        <BankAccountForm account={account} onSave={handleSave} onCancel={onCancel} />
      </div>
    </div>
  );
};
