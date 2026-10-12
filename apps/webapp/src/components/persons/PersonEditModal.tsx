import { Dialog, DialogBody, DialogContent, DialogHeader } from '#apps/webapp/components/ui/dialog';
import type { Person } from '#apps/webapp/types/person';
import { PersonForm, type PersonFormPerson } from './PersonForm';

interface PersonEditModalProps {
  person: PersonFormPerson;
  onSave: (updates: Partial<Person>) => void;
  onCancel: () => void;
}

export const PersonEditModal = ({ person, onSave, onCancel }: PersonEditModalProps) => (
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open) {
        onCancel();
      }
    }}
  >
    <DialogContent size="sm">
      <DialogHeader title="Edit Person" />
      <DialogBody>
        <PersonForm person={person} onSave={onSave} onCancel={onCancel} isLoading={false} />
      </DialogBody>
    </DialogContent>
  </Dialog>
);
