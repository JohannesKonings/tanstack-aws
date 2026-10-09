import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';
import type { ContactInfo } from '#apps/webapp/types/person';
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
          <ContactForm contact={contact} onSave={handleSave} onCancel={onCancel} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
