import { MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Address } from '#src/webapp/types/person';
// import { Button } from '#src/webapp/components/ui/button';
import { Button } from '#src/webapp/components/ui/button';
// import { cn } from '#src/webapp/lib/utils';
import { AddressForm } from './AddressForm';

interface AddressCardProps {
  address: Address;
  onUpdate?: (addressId: string, updates: Partial<Address>) => void;
  onDelete?: (addressId: string) => void;
  isLoading?: boolean;
}

export const AddressCard = ({ address, onUpdate, onDelete, isLoading }: AddressCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (updates: Partial<Address>) => {
    onUpdate?.(address.id, updates);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      onDelete?.(address.id);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border p-4">
        <AddressForm
          address={address}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                {address.type}
              </span>
              {address.isPrimary && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Primary
                </div>
              )}
            </div>
            <p className="font-medium">{address.street}</p>
            <p className="text-sm text-muted-foreground">
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p className="text-sm text-muted-foreground">{address.country}</p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
