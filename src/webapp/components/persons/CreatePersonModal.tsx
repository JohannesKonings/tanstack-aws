import type { Person } from '#src/webapp/types/person';
import { X } from 'lucide-react';
import { PersonForm } from './PersonForm';

interface CreatePersonModalProps {
  onSave: (person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const CreatePersonModal = ({ onSave, onCancel }: CreatePersonModalProps) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Create Person</h3>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <PersonForm onSave={onSave} onCancel={onCancel} isLoading={false} />
    </div>
  </div>
);
