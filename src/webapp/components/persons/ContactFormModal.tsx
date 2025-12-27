import type { ContactInfo } from '#src/webapp/types/person';
import { X } from 'lucide-react';
import { ContactForm } from './ContactForm';

interface ContactFormModalProps {
  personId: string;
  contact?: ContactInfo;
  onSave: (contact: Omit<ContactInfo, 'id'>) => void;
  onCancel: () => void;
}

export const ContactFormModal = ({
  personId: _personId,
  contact,
  onSave,
  onCancel,
}: ContactFormModalProps) => {
  let title = 'Add Contact';
  if (contact) {
    title = 'Edit Contact';
  }

  const handleSave = (values: {
    type: ContactInfo['type'];
    value: string;
    isPrimary: boolean;
    isVerified: boolean;
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
        <ContactForm contact={contact} onSave={handleSave} onCancel={onCancel} />
      </div>
    </div>
  );
};
