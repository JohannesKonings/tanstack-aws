import { MapPinIcon, PencilIcon, StarIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import type { Address } from '#apps/webapp/types/person';
import { ConfirmationModal } from './ConfirmationModal';

interface AddressCardProps {
  address: Address;
  onUpdate?: (addressId: string, updates: Partial<Address>) => void;
  onDelete?: (addressId: string) => void;
  onEdit?: (address: Address) => void;
  isLoading?: boolean;
}

export const AddressCard = ({ address, onDelete, onEdit, isLoading }: AddressCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete?.(address.id);
    setShowDeleteConfirm(false);
  };

  return (
    <Card className="group p-4 transition-colors hover:bg-surface-state-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MapPinIcon className="mt-1 h-5 w-5 shrink-0 text-icon-muted" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="capitalize">
                {address.type}
              </Badge>
              {address.isPrimary && (
                <Badge variant="warning" className="gap-1">
                  <StarIcon className="h-3 w-3 fill-current" weight="fill" />
                  Primary
                </Badge>
              )}
            </div>
            <p className="font-medium text-text-primary">{address.street}</p>
            <p className="text-sm text-text-secondary">
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p className="text-sm text-text-secondary">{address.country}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="icon"
            color="gray"
            size="icon-sm"
            onClick={() => onEdit?.(address)}
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
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
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
