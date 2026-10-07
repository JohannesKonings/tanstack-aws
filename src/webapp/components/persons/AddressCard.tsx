import { MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';
import type { Address } from '#src/webapp/types/person';
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
    <div className="group rounded-lg border border-white/30 bg-white/15 p-4 transition-colors hover:bg-white/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-white/70" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="capitalize">
                {address.type}
              </Badge>
              {address.isPrimary && (
                <Badge variant="warning" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </Badge>
              )}
            </div>
            <p className="font-medium text-white">{address.street}</p>
            <p className="text-sm text-white/75">
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p className="text-sm text-white/75">{address.country}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit?.(address)}
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
    </div>
  );
};
