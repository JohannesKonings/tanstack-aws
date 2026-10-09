import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';
import type { Address } from '#apps/webapp/types/person';
import { AddressForm } from './AddressForm';

interface AddressFormModalProps {
  personId: string;
  address?: Address;
  onSave: (address: Omit<Address, 'id'>) => void;
  onCancel: () => void;
}

export const AddressFormModal = ({
  personId: _personId,
  address,
  onSave,
  onCancel,
}: AddressFormModalProps) => {
  let title = 'Add Address';
  if (address) {
    title = 'Edit Address';
  }

  const handleSave = (values: {
    type: Address['type'];
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
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
          <AddressForm address={address} onSave={handleSave} onCancel={onCancel} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
