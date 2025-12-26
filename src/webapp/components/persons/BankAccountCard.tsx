import { CreditCard, Landmark, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BankAccount } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';

interface BankAccountCardProps {
  bankAccount: BankAccount;
  onUpdate?: (accountId: string, updates: Partial<BankAccount>) => void;
  onDelete?: (accountId: string) => void;
  isLoading?: boolean;
}

export const BankAccountCard = ({
  bankAccount,
  onUpdate,
  onDelete,
  isLoading,
}: BankAccountCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      onDelete?.(bankAccount.id);
    }
  };

  const handleSetPrimary = () => {
    onUpdate?.(bankAccount.id, { isPrimary: true });
  };

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Landmark className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{bankAccount.bankName}</p>
              {bankAccount.isPrimary && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Primary
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="capitalize">{bankAccount.accountType}</span>
              <span>•</span>
              <span>****{bankAccount.accountNumberLast4}</span>
            </div>
            {bankAccount.iban && (
              <p className="text-xs text-muted-foreground">IBAN: {bankAccount.iban}</p>
            )}
            {bankAccount.bic && (
              <p className="text-xs text-muted-foreground">BIC: {bankAccount.bic}</p>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!bankAccount.isPrimary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8"
              title="Set as primary"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
