import type { BankAccount } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';
import { CreditCard, Landmark, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';

interface BankAccountCardProps {
  bankAccount: BankAccount;
  onUpdate?: (accountId: string, updates: Partial<BankAccount>) => void;
  onDelete?: (accountId: string) => void;
  onEdit?: (bankAccount: BankAccount) => void;
  isLoading?: boolean;
}

export const BankAccountCard = ({
  bankAccount,
  onUpdate,
  onDelete,
  onEdit,
  isLoading,
}: BankAccountCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete?.(bankAccount.id);
    setShowDeleteConfirm(false);
  };

  const handleSetPrimary = () => {
    onUpdate?.(bankAccount.id, { isPrimary: true });
  };

  return (
    <div className="group rounded-lg border border-white/30 bg-white/15 p-4 transition-colors hover:bg-white/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="mt-1 h-5 w-5 shrink-0 text-white/70" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{bankAccount.bankName}</p>
              {bankAccount.isPrimary && (
                <div className="flex items-center gap-1 text-xs text-white/75">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Primary
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/75">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="capitalize">{bankAccount.accountType}</span>
              <span>•</span>
              <span>****{bankAccount.accountNumberLast4}</span>
            </div>
            {bankAccount.iban && <p className="text-xs text-white/75">IBAN: {bankAccount.iban}</p>}
            {bankAccount.bic && <p className="text-xs text-white/75">BIC: {bankAccount.bic}</p>}
          </div>
        </div>

        <div className="flex gap-1">
          {!bankAccount.isPrimary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8 cursor-pointer"
              title="Set as primary"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit?.(bankAccount)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmationModal
        title="Delete Bank Account"
        message="Are you sure you want to delete this bank account? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isOpen={showDeleteConfirm}
        isLoading={isLoading}
        isDangerous
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
