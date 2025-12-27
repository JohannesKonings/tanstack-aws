import type { Address } from '#src/webapp/types/person';
import { X } from 'lucide-react';
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
        <AddressForm address={address} onSave={handleSave} onCancel={onCancel} />
      </div>
    </div>
  );
};
