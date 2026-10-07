import { BankIcon, CreditCardIcon, PencilIcon, StarIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import type { BankAccount } from '#apps/webapp/types/person';
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
    <Card className="group p-4 transition-colors hover:bg-surface-state-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <BankIcon className="mt-1 h-5 w-5 shrink-0 text-icon-muted" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary">{bankAccount.bankName}</p>
              {bankAccount.isPrimary && (
                <Badge variant="warning" className="gap-1">
                  <StarIcon className="h-3 w-3 fill-current" weight="fill" />
                  Primary
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CreditCardIcon className="h-3.5 w-3.5" />
              <span className="capitalize">{bankAccount.accountType}</span>
              <span>•</span>
              <span>****{bankAccount.accountNumberLast4}</span>
            </div>
            {bankAccount.iban && (
              <p className="text-xs text-text-secondary">IBAN: {bankAccount.iban}</p>
            )}
            {bankAccount.bic && (
              <p className="text-xs text-text-secondary">BIC: {bankAccount.bic}</p>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {!bankAccount.isPrimary && (
            <Button
              variant="icon"
              color="gray"
              size="icon-sm"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8 cursor-pointer"
              title="Set as primary"
            >
              <StarIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="icon"
            color="gray"
            size="icon-sm"
            onClick={() => onEdit?.(bankAccount)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="icon"
            color="red"
            size="icon-sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <TrashIcon className="h-4 w-4" />
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
    </Card>
  );
};
