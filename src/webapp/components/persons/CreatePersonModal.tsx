import { Dialog, DialogBody, DialogContent, DialogHeader } from '#src/webapp/components/ui/dialog';
import type { Person } from '#src/webapp/types/person';
import { PersonForm } from './PersonForm';

interface CreatePersonModalProps {
  onSave: (person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const CreatePersonModal = ({ onSave, onCancel }: CreatePersonModalProps) => (
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open) {
        onCancel();
      }
    }}
  >
    <DialogContent size="sm">
      <DialogHeader title="Create Person" />
      <DialogBody>
        <PersonForm onSave={onSave} onCancel={onCancel} isLoading={false} />
      </DialogBody>
    </DialogContent>
  </Dialog>
);
