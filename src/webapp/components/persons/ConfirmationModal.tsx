import { Button } from '#src/webapp/components/ui/button';
import { X } from 'lucide-react';

// oxlint-disable no-ternary

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmationModal = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmationModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-white/70 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            disabled={isLoading}
            className="cursor-pointer bg-white/20 hover:bg-white/30 text-white border border-white/40"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`cursor-pointer ${isDangerous ? 'bg-destructive hover:bg-destructive/90' : ''}`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
