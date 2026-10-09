import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';
import type { BankAccount } from '#apps/webapp/types/person';
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
          <BankAccountForm account={account} onSave={handleSave} onCancel={onCancel} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
